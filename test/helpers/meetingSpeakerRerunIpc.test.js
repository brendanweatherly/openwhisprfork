"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { registerMeetingSpeakerRerunIpc } = require("../../src/helpers/meetingSpeakerRerunIpc");
const { archiveMeetingSource } = require("../../src/helpers/meetingAudioArchive");
const consent = {
  retentionSettingsSynced: true,
  retentionSettings: {
    audioRetentionDays: 30, dataRetentionEnabled: true,
    localHistoryPolicyResolved: false,
  },
  hasActiveAccountScope: false, noteAuthorized: true,
};
async function fixture(t) {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ow-rerun-ipc-"));
  t.after(() => fs.rm(userDataDir, { recursive: true, force: true }));
  const inputPath = path.join(userDataDir, "fixture.pcm");
  await fs.writeFile(inputPath, Buffer.alloc(48000));
  let permission = true;
  const authorize = async () => ({ ...consent, noteAuthorized: permission });
  await archiveMeetingSource({
    userDataDir, noteId: 2, sessionId: "record-1", source: "system",
    inputPath, startedAt: 1793371000000, authorize,
  });
  let note = { id: 2, space_id: 1, deleted_at: null, account_id: null,
    cloud_id: null, content: "summary stays", transcript: JSON.stringify([
      {text:"Do not change these words",source:"system",timestamp:0.15,
        speaker:"speaker_0",recordingSessionId:"record-1"},
      {text:"Earlier recording",source:"system",timestamp:0.1,
        speaker:"speaker_5",recordingSessionId:"prior"},
      {text:"Manually assigned",source:"system",timestamp:0.5,
        speaker:"speaker_1",speakerName:"Ada",speakerLocked:true,
        speakerStatus:"locked",speakerLockSource:"user",
        recordingSessionId:"record-1"},
    ]) };
  const api = new Map();
  const messages = [];
  const owner = { id: 42, isDestroyed: () => false,
    send: (channel, data) => messages.push({channel,data}) };
  let writes=0, mirrors=0;
  const context = {
    _activeMeetingNoteId: null, _meetingSourcePurgeGeneration: 0,
    _authorizeMeetingSource: authorize,
    databaseManager: {
      activeAccountId: null,
      getNote: (id) => id === 2 ? note : null,
      getSpace: (id) => id === 1 ? {kind:"private",id,deleted_at:null} : null,
      updateNote: (id, changes) => {
        writes++;
        note = { ...note, ...changes };
        return {success:true, note};
      },
    },
    diarizationManager: {
      isAvailable: () => true,
      convertRawPcmToWav: async () => {
        const wav = path.join(userDataDir, "fixture-tmp.wav");
        await fs.writeFile(wav, Buffer.from([82,73,70,70]));
        return wav;
      },
      diarize: async () => [{speaker:"speaker_0",start:0,end:1}],
      capSpeakerClusters: (x) => x,
      mergeWithTranscript: (rows, _diar, {speakerIndexBase}) => rows.map((row) => ({
        ...row, speaker: "speaker_" + speakerIndexBase,
        speakerName: undefined, speakerStatus: "confirmed",
        speakerIsPlaceholder:false, suggestedName:undefined,
      })),
    },
    notifyVectorChanges: () => {},
    _asyncMirrorWrite: () => { mirrors++; },
  };
  registerMeetingSpeakerRerunIpc({
    ipcMain: { handle: (name, fn) => api.set(name, fn) },
    app: {getPath: () => userDataDir},
    context, maxSpeakerCount:12,
    getAuthContext: () => ({signedIn:false,generation:0}),
    broadcastToWindows:() => {},
    speakerEmbeddings: {isAvailable:()=>false},
  });
  return { api, context, owner, messages, getNote:()=>note,
    setTranscript: (transcript) => { note = {...note,transcript}; },
    setPermission: (value) => { permission=value; },
    getWrites:()=>writes, getMirrors:()=>mirrors };
}
test("rerun previews without editing and applies/undoes only selected speaker labels", async(t)=>{
  const f = await fixture(t);
  const original = f.getNote().transcript;
  const list = await f.api.get("meeting-speaker-rerun-sessions")({sender:f.owner},2);
  assert.equal(list.success,true);
  assert.equal(list.sessions.length,1);
  const preview = await f.api.get("meeting-speaker-rerun-preview")({sender:f.owner},{
    noteId:2,sessionId:"record-1",source:"system",expectedCount:3
  });
  assert.equal(preview.success,true,preview.error);
  assert.equal(f.getWrites(),0,"preview must never save words/labels");
  assert.equal(f.getNote().transcript,original);
  assert.equal(preview.changedCount,1);
  assert.ok(f.messages.some((e)=>e.data.stage==="clustering"));
  const apply=await f.api.get("meeting-speaker-rerun-apply")({sender:f.owner},2,preview.requestId);
  assert.equal(apply.success,true,apply.error);
  assert.equal(f.getWrites(),1);
  assert.equal(f.getNote().content,"summary stays");
  const saved=JSON.parse(f.getNote().transcript);
  const before=JSON.parse(original);
  assert.equal(saved[0].text,before[0].text);
  assert.notEqual(saved[0].speaker,before[0].speaker);
  assert.deepEqual(saved[1],before[1]);
  assert.deepEqual(saved[2],before[2]);
  const undo=await f.api.get("meeting-speaker-rerun-undo")({sender:f.owner},2);
  assert.equal(undo.success,true,undo.error);
  assert.equal(f.getNote().transcript,original);
  assert.equal(f.getWrites(),2);
});
test("changed transcript refuses stale preview and never overwrites later edits",async(t)=>{
  const f=await fixture(t);
  const preview=await f.api.get("meeting-speaker-rerun-preview")({sender:f.owner},{
    noteId:2,sessionId:"record-1",source:"system",expectedCount:3
  });
  assert.equal(preview.success,true,preview.error);
  const newer=f.getNote().transcript.replace("Do not change","New human edit");
  f.setTranscript(newer);
  const apply=await f.api.get("meeting-speaker-rerun-apply")({sender:f.owner},2,preview.requestId);
  assert.equal(apply.success,false);
  assert.equal(f.getNote().transcript,newer);
  assert.equal(f.getWrites(),0);
});
test("permission revocation and Delete All Audio generation invalidate previews",async(t)=>{
  const f=await fixture(t);
  const p=await f.api.get("meeting-speaker-rerun-preview")({sender:f.owner},{
    noteId:2,sessionId:"record-1",source:"system",expectedCount:3
  });
  assert.equal(p.success,true,p.error);
  f.setPermission(false);
  const denied=await f.api.get("meeting-speaker-rerun-apply")({sender:f.owner},2,p.requestId);
  assert.equal(denied.success,false);
  f.setPermission(true);
  f.context._meetingSourcePurgeGeneration++;
  const stale=await f.api.get("meeting-speaker-rerun-apply")({sender:f.owner},2,p.requestId);
  assert.equal(stale.success,false);
  assert.equal(f.getWrites(),0);
});
