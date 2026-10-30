const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const handlersModulePath = require.resolve("../../src/helpers/ipcHandlers");
const identifierModulePath = require.resolve("../../src/helpers/liveSpeakerIdentifier");
const originalLoad = Module._load;

const electronStub = {
  app: {
    getPath: () => "/tmp",
    getName: () => "test",
    getVersion: () => "0.0.0",
    isPackaged: false,
    // Logger must also work when OPENWHISPR_LOG_LEVEL=debug is inherited from npm start.
    isReady: () => false,
    on: () => {},
    requestSingleInstanceLock: () => true,
  },
  ipcMain: { handle: () => {}, on: () => {}, removeHandler: () => {} },
  BrowserWindow: class BrowserWindow {
    static getAllWindows() {
      return [];
    }
  },
  shell: {},
  dialog: {},
  screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 0, height: 0 } }) },
  systemPreferences: { getMediaAccessStatus: () => "granted" },
  clipboard: {},
  nativeImage: {},
  globalShortcut: {},
  utilityProcess: {},
  MessageChannelMain: class {},
};

// ipcHandlers pulls in a large module graph; stub the process boundaries and
// capture broadcasts so the prototype methods can run against a fake `this`.
function loadHandlers() {
  delete require.cache[handlersModulePath];
  delete require.cache[identifierModulePath];
  const broadcasts = [];

  Module._load = function loadWithMocks(request, parent, isMain) {
    if (request === "electron") {
      return electronStub;
    }
    if (request === "./windowBroadcast" && parent?.filename === handlersModulePath) {
      return {
        broadcastToWindows: (channel, payload) => {
          broadcasts.push({ channel, payload });
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const IPCHandlers = require(handlersModulePath);
    const liveSpeakerIdentifier = require(identifierModulePath);
    return { IPCHandlers, liveSpeakerIdentifier, broadcasts };
  } finally {
    Module._load = originalLoad;
  }
}

function createMappingRecorder(existingMappings) {
  const calls = { set: [], remove: [] };
  const databaseManager = {
    getSpeakerMappings: () => existingMappings,
    setSpeakerMapping: (noteId, speakerId, profileId, displayName) => {
      calls.set.push({ noteId, speakerId, profileId, displayName });
    },
    removeSpeakerMapping: (noteId, speakerId) => {
      calls.remove.push({ noteId, speakerId });
    },
  };
  return { calls, databaseManager };
}

const NOTE_ID = 42;
const embedding = Array.from({ length: 8 }, (_, i) => (i === 0 ? 1 : 0));

function reconcile(IPCHandlers, databaseManager, liveSpeakerId) {
  const fakeThis = Object.assign(Object.create(IPCHandlers.prototype), { databaseManager });
  const liveState = {
    [liveSpeakerId]: {
      displayName: "Alice",
      profileId: 5,
      noteId: NOTE_ID,
      embedding,
    },
  };
  const segments = [];
  return IPCHandlers.prototype._reconcileLiveSpeakerState.call(
    fakeThis,
    liveState,
    { speaker_0: embedding },
    segments
  );
}

test("reconciliation keeps the mapping when live and offline ids already match", () => {
  const { IPCHandlers } = loadHandlers();
  const { calls, databaseManager } = createMappingRecorder([
    { speaker_id: "speaker_0", display_name: "Alice", profile_id: 5 },
  ]);

  reconcile(IPCHandlers, databaseManager, "speaker_0");

  assert.equal(calls.set.length, 1);
  assert.deepEqual(calls.set[0], {
    noteId: NOTE_ID,
    speakerId: "speaker_0",
    profileId: 5,
    displayName: "Alice",
  });
  assert.deepEqual(
    calls.remove,
    [],
    "removing the row that was just upserted deletes the user's identification"
  );
});

test("reconciliation migrates the mapping when the offline id differs", () => {
  const { IPCHandlers } = loadHandlers();
  const { calls, databaseManager } = createMappingRecorder([
    { speaker_id: "speaker_3", display_name: "Alice", profile_id: 5 },
  ]);

  reconcile(IPCHandlers, databaseManager, "speaker_3");

  assert.equal(calls.set.length, 1);
  assert.equal(calls.set[0].speakerId, "speaker_0");
  assert.deepEqual(calls.remove, [{ noteId: NOTE_ID, speakerId: "speaker_3" }]);
});

const THREE_ATTENDEES = [
  { email: "one@example.com" },
  { email: "two@example.com" },
  { email: "three@example.com" },
];

function refreshConfig(explicit, { expectedCount = 2, attendees = THREE_ATTENDEES } = {}) {
  const { IPCHandlers, liveSpeakerIdentifier, broadcasts } = loadHandlers();
  const fakeThis = Object.assign(Object.create(IPCHandlers.prototype), {
    activeMeetingSpeakerConfig: { enabled: true, expectedCount, explicit },
    _activeMeetingNoteId: NOTE_ID,
    databaseManager: { getGoogleAccounts: () => [] },
  });
  const note = { participants: JSON.stringify(attendees) };

  IPCHandlers.prototype._refreshMeetingSpeakerConfigFromNote.call(fakeThis, NOTE_ID, note);
  return { fakeThis, liveSpeakerIdentifier, broadcasts };
}

test("roster changes refresh an auto-derived speaker config", () => {
  const { fakeThis, liveSpeakerIdentifier, broadcasts } = refreshConfig(false);

  assert.equal(fakeThis.activeMeetingSpeakerConfig.expectedCount, 4);
  assert.equal(liveSpeakerIdentifier.maxSpeakers, 3);
  assert.equal(broadcasts.length, 1);
  assert.equal(broadcasts[0].channel, "meeting-session-speaker-config-updated");
  assert.deepEqual(broadcasts[0].payload, { enabled: true, expectedCount: 4 });
});

test("a room on the note doesn't raise the speaker config", () => {
  const { fakeThis } = refreshConfig(false, {
    attendees: [...THREE_ATTENDEES, { email: "room@example.com", resource: true }],
  });

  assert.equal(fakeThis.activeMeetingSpeakerConfig.expectedCount, 4);
});

test("an explicit stepper count is never overridden by roster changes", () => {
  const { fakeThis, broadcasts } = refreshConfig(true);

  assert.equal(fakeThis.activeMeetingSpeakerConfig.expectedCount, 2);
  assert.deepEqual(broadcasts, []);
});

// Lowering the cap below the clusters already discovered makes the identifier
// fold every later voice onto an existing speaker — the collapse this refresh
// exists to prevent. A shrinking or emptied roster must be ignored.
test("a shrinking roster leaves the speaker cap untouched", () => {
  const shrunk = refreshConfig(false, {
    expectedCount: 4,
    attendees: [{ email: "one@example.com" }],
  });

  assert.equal(shrunk.fakeThis.activeMeetingSpeakerConfig.expectedCount, 4);
  assert.deepEqual(shrunk.broadcasts, []);

  const emptied = refreshConfig(false, { expectedCount: 4, attendees: [] });

  assert.equal(emptied.fakeThis.activeMeetingSpeakerConfig.expectedCount, 4);
  assert.deepEqual(emptied.broadcasts, []);
});

function makeExpectationResolver() {
  const { IPCHandlers } = loadHandlers();
  return (args) =>
    IPCHandlers.prototype._resolveSpeakerExpectation.call(
      Object.assign(Object.create(IPCHandlers.prototype), {
        databaseManager: { getNote: () => args.note ?? null },
      }),
      {
        sessionConfig: args.sessionConfig ?? null,
        noteId: args.noteId ?? null,
        observedSpeakerIds: args.observedSpeakerIds ?? new Set(),
        diarizedSource: args.diarizedSource,
      }
    );
}

// User-entered counts are hard limits; inferred rosters/defaults/live clusters
// must not erase real final speakers before acoustic clustering can find them.
test("final speaker caps honor only a selected or persisted speaker count", () => {
  const resolve = makeExpectationResolver();
  assert.deepEqual(
    resolve({ sessionConfig: { expectedCount: 3, explicit: true } }),
    { cap: 2, countSource: "session" }
  );
  assert.deepEqual(
    resolve({ noteId: NOTE_ID, note: { expected_speaker_count: 4 } }),
    { cap: 3, countSource: "saved" }
  );
  assert.deepEqual(
    resolve({ noteId: NOTE_ID, note: { expected_speaker_count: 4 },
      sessionConfig: { expectedCount: 2, explicit: true } }),
    { cap: 1, countSource: "session" },
    "the active user-selected count wins over a saved count"
  );
  assert.deepEqual(
    resolve({ sessionConfig: { expectedCount: 2, explicit: false },
      observedSpeakerIds: new Set(["speaker_0"]) }),
    { cap: 7, countSource: "auto" },
    "default count and a single provisional voice do not cap a four-person call"
  );
  assert.deepEqual(resolve({}), { cap: 7, countSource: "auto" });
  assert.deepEqual(
    resolve({ noteId: NOTE_ID, note: { participants: JSON.stringify(THREE_ATTENDEES) } }),
    { cap: 7, countSource: "auto" },
    "the calendar roster is a hint, not a final cap"
  );
});

test("mic-mode cap includes the user and respects explicit limits", () => {
  const resolve = makeExpectationResolver();
  assert.deepEqual(
    resolve({ sessionConfig: { expectedCount: 3, explicit: true }, diarizedSource: "mic" }),
    { cap: 3, countSource: "session" }
  );
  assert.deepEqual(
    resolve({ diarizedSource: "mic" }),
    { cap: 8, countSource: "auto" }
  );
});

// A resumed note's mappings and embeddings can hold ids no transcript row
// carries any more; the session's base must clear them too, or a new voice
// would inherit that stored name.
test("a resumed meeting's speaker base clears the note's stored ids", () => {
  const { IPCHandlers } = loadHandlers();
  const resolveBase = IPCHandlers.prototype._resolveMeetingSpeakerIndexBase;
  const handlers = {
    _diarizationSpeakerReservations: new Map(),
    databaseManager: {
      getSpeakerMappings: () => [{ speaker_id: "speaker_0" }, { speaker_id: "speaker_3" }],
      getNoteSpeakerEmbeddings: () => [{ speaker_id: "speaker_1" }],
    },
  };

  assert.equal(resolveBase.call(handlers, NOTE_ID, 2), 4);
  assert.equal(resolveBase.call(handlers, NOTE_ID, 6), 6);
  assert.equal(resolveBase.call(handlers, null, 2), 2);

  const failing = {
    _diarizationSpeakerReservations: new Map(),
    databaseManager: {
      getSpeakerMappings: () => {
        throw new Error("db closed");
      },
    },
  };
  assert.equal(resolveBase.call(failing, NOTE_ID, 2), 2);
});

function loadDiarizationManager() {
  const diarizationPath = require.resolve("../../src/helpers/diarization");
  delete require.cache[diarizationPath];
  Module._load = function loadWithElectronStub(request, parent, isMain) {
    if (request === "electron") return electronStub;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(diarizationPath);
  } finally {
    Module._load = originalLoad;
  }
}

// "Record more" can start while the previous session's diarization still runs:
// its clusters are in neither the seeded transcript nor the stored embeddings
// yet, so the next session's base must clear every id the result can name.
test("a stopped session's diarization reserves its speaker ids until its result lands", async (t) => {
  const { IPCHandlers } = loadHandlers();
  const DiarizationManager = loadDiarizationManager();
  const speakerEmbeddings = require("../../src/helpers/speakerEmbeddings");
  t.mock.method(speakerEmbeddings, "isAvailable", () => true);
  t.mock.method(speakerEmbeddings, "extractEmbedding", async () => new Float32Array([1, 0]));
  t.mock.method(speakerEmbeddings, "computeCentroid", (embeddings) => embeddings[0]);

  let releaseDiarization;
  const diarizationGate = new Promise((resolve) => {
    releaseDiarization = resolve;
  });
  const diarizationManager = new DiarizationManager();
  Object.assign(diarizationManager, {
    isAvailable: () => true,
    convertRawPcmToWav: async () => "/nonexistent/ow-reserve-test.wav",
    diarize: async () => {
      await diarizationGate;
      return [
        { start: 0, end: 4, speaker: "speaker_00" },
        { start: 5, end: 9, speaker: "speaker_01" },
      ];
    },
  });

  const sent = [];
  const win = {
    isDestroyed: () => false,
    webContents: { send: (channel, payload) => sent.push({ channel, payload }) },
  };
  const handlers = Object.assign(Object.create(IPCHandlers.prototype), {
    _diarizationSpeakerReservations: new Map(),
    speakerDiarizationEnabled: true,
    diarizationManager,
    databaseManager: {
      // Four expected speakers: up to three remote clusters.
      getNote: () => ({ expected_speaker_count: 4 }),
      getSpeakerProfiles: () => [],
      getSpeakerMappings: () => [],
      getNoteSpeakerEmbeddings: () => [],
    },
  });

  handlers._startOrSkipDiarization(
    "diar-1",
    "/nonexistent/ow-reserve-test.pcm",
    0,
    [
      { id: "a", source: "system", timestamp: 1, text: "first", speaker: "speaker_2" },
      { id: "b", source: "system", timestamp: 6, text: "second", speaker: "speaker_2" },
    ],
    win,
    null,
    null,
    NOTE_ID,
    "system",
    2
  );

  // Pending: the base must clear speaker_2..speaker_4.
  assert.equal(handlers._resolveMeetingSpeakerIndexBase(NOTE_ID, 3), 5);
  assert.equal(handlers._resolveMeetingSpeakerIndexBase(NOTE_ID + 1, 0), 0);

  releaseDiarization();
  for (let i = 0; i < 50 && sent.length === 0; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  const { payload } = sent[0];
  assert.deepEqual(
    payload.segments.map((segment) => segment.speaker),
    ["speaker_2", "speaker_3"]
  );
  assert.deepEqual(Object.keys(payload.speakerEmbeddings).sort(), ["speaker_2", "speaker_3"]);
  // Landed: narrowed to the two ids the result actually names.
  assert.equal(handlers._resolveMeetingSpeakerIndexBase(NOTE_ID, 0), 4);
});


// Regression for the four-voice Teams collapse: an untouched two-person default
// and a single provisional live label are hints, not final acoustic constraints.
// Exercise post-stop diarize -> cap -> merge -> IPC instead of policy in isolation.
async function runNativeDiscoveryFixture(t, { countIsExplicit, savedCount }) {
  const { IPCHandlers } = loadHandlers();
  const DiarizationManager = loadDiarizationManager();
  const speakerEmbeddings = require("../../src/helpers/speakerEmbeddings");
  t.mock.method(speakerEmbeddings, "isAvailable", () => false);

  const calls = { diarize: [], caps: [] };
  const diarizationManager = new DiarizationManager();
  const actualCap = diarizationManager.capSpeakerClusters.bind(diarizationManager);
  const fourVoices = [0, 1, 2, 3].map((index) => ({
    start: index * 5,
    end: index * 5 + 4,
    speaker: "speaker_0" + index,
  }));
  Object.assign(diarizationManager, {
    isAvailable: () => true,
    convertRawPcmToWav: async () => "/nonexistent/ow-auto-speaker-test.wav",
    diarize: async (...args) => {
      calls.diarize.push(args);
      return fourVoices;
    },
    capSpeakerClusters: (segments, cap) => {
      calls.caps.push(cap);
      return actualCap(segments, cap);
    },
  });

  const sent = [];
  const win = {
    isDestroyed: () => false,
    webContents: { send: (channel, payload) => sent.push({ channel, payload }) },
  };
  const handlers = Object.assign(Object.create(IPCHandlers.prototype), {
    _diarizationSpeakerReservations: new Map(),
    speakerDiarizationEnabled: true,
    diarizationManager,
    databaseManager: {
      getNote: () => ({
        expected_speaker_count: savedCount ?? null,
        // An incomplete calendar roster cannot determine who actually speaks.
        participants: JSON.stringify([{ email: "one@example.com" }]),
      }),
      getSpeakerProfiles: () => [],
      getSpeakerMappings: () => [],
      getNoteSpeakerEmbeddings: () => [],
    },
  });
  const transcript = fourVoices.map((s, index) => ({
    id: "voice-" + index,
    source: "system",
    timestamp: s.start + 1,
    text: "utterance " + index,
    speaker: "speaker_0",
    speakerName: "Unverified live label",
  }));

  handlers._startOrSkipDiarization(
    "speaker-discovery-regression",
    "/nonexistent/ow-auto-speaker-test.pcm",
    0,
    transcript,
    win,
    { speaker_0: { displayName: "Unverified live label" } },
    { enabled: true, expectedCount: 2, explicit: countIsExplicit },
    NOTE_ID,
    "system",
    0
  );

  for (let i = 0; i < 50 && sent.length === 0; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(sent.length, 1, "final diarization must deliver its result");
  assert.equal(sent[0].channel, "meeting-diarization-complete");
  assert.equal(calls.diarize.length, 1);
  assert.equal(calls.diarize[0].length, 1,
    "native diarization must not receive a guessed or forced speaker count");
  assert.deepEqual(sent[0].payload.segments.map((seg) => seg.text),
    transcript.map((seg) => seg.text),
    "speaker discovery must preserve transcript content");
  assert.ok(sent[0].payload.segments.every((seg) => seg.speakerName !== "Unverified live label"),
    "a provisional live name must not be assigned to final acoustic clusters");
  return { calls, payload: sent[0].payload };
}

test("final discovery preserves four remote voices despite a default count of two", async (t) => {
  const { calls, payload } = await runNativeDiscoveryFixture(t, {
    countIsExplicit: false,
    savedCount: null,
  });
  assert.deepEqual(calls.caps, [7]);
  assert.deepEqual(payload.segments.map((seg) => seg.speaker),
    ["speaker_0", "speaker_1", "speaker_2", "speaker_3"]);
});

test("a saved user-selected count caps only after native discovery", async (t) => {
  const { calls, payload } = await runNativeDiscoveryFixture(t, {
    countIsExplicit: false,
    savedCount: 3,
  });
  assert.deepEqual(calls.caps, [2], "three total speakers allow two remote clusters");
  assert.equal(new Set(payload.segments.map((seg) => seg.speaker)).size, 2);
});

test("an explicit live stepper choice overrides a different saved count", async (t) => {
  const { calls, payload } = await runNativeDiscoveryFixture(t, {
    countIsExplicit: true,
    savedCount: 4,
  });
  assert.deepEqual(calls.caps, [1], "two total speakers allow one remote cluster");
  assert.equal(new Set(payload.segments.map((seg) => seg.speaker)).size, 1);
});


// Real meeting regression: nine acoustic groups were capped to seven, and the
// old meeting-only cap merged BOTH extras into the longest-duration speaker.
// The upload pipeline already uses voice centroids to choose the nearest kept
// cluster; the post-stop meeting pipeline must apply that same policy.
test("voice-aware meeting cap routes nine raw clusters to matching kept voices, not the dominant speaker", async (t) => {
  const { IPCHandlers } = loadHandlers();
  const DiarizationManager = loadDiarizationManager();
  const speakerEmbeddings = require("../../src/helpers/speakerEmbeddings");

  const vectors = [
    [1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0],
    [0, -1, 0], [0, 0, -1], [0.6, 0.8, 0],
    [0, 0.95, 0.05], [0.05, 0, -0.95],
  ];
  const raw = vectors.map((_, index) => ({
    start: index * 7, end: index * 7 + 5,
    speaker: "speaker_" + String(index).padStart(2, "0"),
  }));
  const centroids = new Map(raw.map((segment, index) => [segment.speaker, vectors[index]]));
  const calls = { extracts: 0, legacyCaps: 0 };
  t.mock.method(speakerEmbeddings, "isAvailable", () => true);
  t.mock.method(speakerEmbeddings, "extractClusterCentroids", async (path, segments) => {
    calls.extracts += 1;
    assert.equal(path, "/nonexistent/ow-voice-cap.wav");
    assert.equal(new Set(segments.map((segment) => segment.speaker)).size, 9);
    return centroids;
  });
  t.mock.method(speakerEmbeddings, "cosineSimilarity", (a, b) =>
    a.reduce((sum, value, index) => sum + value * b[index], 0)
  );
  // Later speaker-profile matching is a separate stage; no profile data in
  // this test, and the fake path contains no WAV file.
  t.mock.method(speakerEmbeddings, "extractEmbedding", async () => null);

  const diarizationManager = new DiarizationManager();
  const originalCap = diarizationManager.capSpeakerClusters.bind(diarizationManager);
  Object.assign(diarizationManager, {
    isAvailable: () => true,
    convertRawPcmToWav: async () => "/nonexistent/ow-voice-cap.wav",
    diarize: async () => raw,
    capSpeakerClusters: (...args) => {
      calls.legacyCaps += 1;
      return originalCap(...args);
    },
  });

  const sent = [];
  const win = {
    isDestroyed: () => false,
    webContents: { send: (channel, payload) => sent.push({ channel, payload }) },
  };
  const handlers = Object.assign(Object.create(IPCHandlers.prototype), {
    _diarizationSpeakerReservations: new Map(),
    speakerDiarizationEnabled: true,
    diarizationManager,
    databaseManager: {
      getNote: () => ({ expected_speaker_count: null }),
      getSpeakerProfiles: () => [],
      getSpeakerMappings: () => [],
      getNoteSpeakerEmbeddings: () => [],
    },
  });

  const transcript = raw.map((segment, index) => ({
    id: "row_" + index, source: "system",
    timestamp: segment.start + 1, text: "phrase " + index,
    speaker: "speaker_0", speakerName: "Unreviewed provisional label",
  }));
  handlers._startOrSkipDiarization(
    "voice-cap-session",
    "/nonexistent/ow-voice-cap.pcm",
    0,
    transcript,
    win,
    null,
    { enabled: true, expectedCount: 2, explicit: false },
    NOTE_ID,
    "system",
    0
  );

  for (let i = 0; i < 50 && sent.length === 0; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(sent.length, 1, "final diarization must complete");
  assert.equal(sent[0].channel, "meeting-diarization-complete");
  assert.equal(calls.extracts, 1, "cap uses original nine native voice groups");
  assert.equal(calls.legacyCaps, 0, "voice evidence must bypass the old duration-only cap");
  const result = sent[0].payload.segments;
  assert.deepEqual(result.map((segment) => segment.text), transcript.map((segment) => segment.text));
  assert.deepEqual(result.map((segment) => segment.speaker), [
    "speaker_0", "speaker_1", "speaker_2", "speaker_3",
    "speaker_4", "speaker_5", "speaker_6", "speaker_1", "speaker_5",
  ]);
  assert.ok(result.every((segment) => !segment.speakerName),
    "a provisional live name must not carry over to final acoustic groups");
});


test("automatic meeting without voice embeddings leaves overflow speech unassigned rather than falsely numbered", async (t) => {
  const { IPCHandlers } = loadHandlers();
  const DiarizationManager = loadDiarizationManager();
  const speakerEmbeddings = require("../../src/helpers/speakerEmbeddings");
  t.mock.method(speakerEmbeddings, "isAvailable", () => false);

  const native = Array.from({ length: 9 }, (_, index) => ({
    start: index * 5, end: index * 5 + 4,
    speaker: "speaker_" + String(index).padStart(2, "0"),
  }));
  const manager = new DiarizationManager();
  Object.assign(manager, {
    isAvailable: () => true,
    convertRawPcmToWav: async () => "/nonexistent/ow-unknown-overflow.wav",
    diarize: async () => native,
    capSpeakerClusters: () => {
      throw new Error("auto speaker overflow must not force duration-only identities");
    },
  });
  const sent = [];
  const handlers = Object.assign(Object.create(IPCHandlers.prototype), {
    _diarizationSpeakerReservations: new Map(),
    speakerDiarizationEnabled: true,
    diarizationManager: manager,
    databaseManager: {
      getNote: () => ({ expected_speaker_count: null }),
      getSpeakerProfiles: () => [],
      getSpeakerMappings: () => [],
      getNoteSpeakerEmbeddings: () => [],
    },
  });
  const transcript = native.map((segment, index) => ({
    id: "unknown-test-" + index,
    source: "system",
    text: "synthetic phrase " + index,
    timestamp: segment.start + 0.5,
    speaker: "speaker_1",
    speakerName: "Unverified live label",
    speakerStatus: "provisional",
  }));
  const win = {
    isDestroyed: () => false,
    webContents: { send: (channel, payload) => sent.push({ channel, payload }) },
  };
  handlers._startOrSkipDiarization(
    "unknown-overflow-session",
    "/nonexistent/ow-unknown-overflow.pcm",
    0,
    transcript,
    win,
    null,
    { enabled: true, expectedCount: 2, explicit: false },
    NOTE_ID,
    "system",
    0
  );

  for (let i = 0; i < 50 && sent.length === 0; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(sent.length, 1, "final diarization must complete");
  assert.equal(sent[0].channel, "meeting-diarization-complete");
  const result = sent[0].payload.segments;
  assert.deepEqual(result.map((segment) => segment.text), transcript.map((segment) => segment.text));
  assert.deepEqual(result.slice(0, 7).map((segment) => segment.speaker),
    Array.from({ length: 7 }, (_, i) => "speaker_" + i));
  for (const segment of result.slice(7)) {
    assert.equal(segment.speaker, undefined, "no fake eighth or ninth identity");
    assert.equal(segment.speakerName, undefined, "stale live identity must be cleared");
    assert.equal(segment.speakerStatus, "unassigned");
    assert.equal(segment.speakerIsPlaceholder, true);
  }
});
