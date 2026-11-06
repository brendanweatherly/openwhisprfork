"use strict";

const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const {
  getArchivedMeetingSource,
  listArchivedMeetingSessions,
} = require("./meetingAudioArchive");
const { isLiveOwnedNote } = require("./meetingSourceRetentionLifecycle");
const {
  validateRerunRequest,
  parseRerunTranscript,
  selectTimedSourceRows,
  capRerunSpeakerGroups,
  buildSpeakerRerunPreview,
} = require("./meetingSpeakerRerun");

// Registered in main after the normal note handlers. No transcript edits
// or archive paths are supplied by a renderer: they always come from the
// current SQLite note and the privately authorized source manifest.
function registerMeetingSpeakerRerunIpc({
  ipcMain, app, context, maxSpeakerCount, getAuthContext, broadcastToWindows,
  speakerEmbeddings = require("./speakerEmbeddings"),
}) {
  if (!ipcMain || !app || !context || !getAuthContext || !broadcastToWindows) {
    throw new Error("Missing speaker-rerun IPC dependencies");
  }
  context._meetingSpeakerRerunPreviews = new Map();
  context._meetingSpeakerRerunUndo = new Map();
  context._meetingSpeakerRerunBusy = false;

  const noteAllowed = (noteId) => isLiveOwnedNote({
    noteId, databaseManager: context.databaseManager,
    signedIn: Boolean(getAuthContext().signedIn),
  });
  const deny = (error) => ({
    success: false, error: error?.message || String(error),
    code: error?.code || "SPEAKER_RERUN_FAILED",
  });
  const notify = (note) => {
    setImmediate(() => broadcastToWindows("note-updated", note));
    context.notifyVectorChanges();
    context._asyncMirrorWrite(note);
  };
  const emitStage = (sender, noteId, requestId, stage) => {
    if (sender.isDestroyed?.()) return;
    try { sender.send("meeting-speaker-rerun-stage", { noteId, requestId, stage }); }
    catch { /* Closing an editor cannot terminate local processing. */ }
  };
  const source = (noteId, sessionId, source) => getArchivedMeetingSource({
    userDataDir: app.getPath("userData"), noteId, sessionId, source,
    authorize: context._authorizeMeetingSource,
  });
  const noteFree = (noteId) => noteAllowed(noteId) &&
    context._activeMeetingNoteId !== noteId;
  const clear = (noteId) => {
    context._meetingSpeakerRerunPreviews.delete(noteId);
    context._meetingSpeakerRerunUndo.delete(noteId);
  };

  ipcMain.handle("meeting-speaker-rerun-sessions", async (_event, noteId) => {
    try {
      if (!noteFree(noteId)) throw new Error("This note is unavailable or a recording is active");
      const sessions = await listArchivedMeetingSessions({
        userDataDir: app.getPath("userData"), noteId,
        authorize: context._authorizeMeetingSource,
      });
      return { success: true, sessions };
    } catch (error) { return deny(error); }
  });

  ipcMain.handle("meeting-speaker-rerun-preview", async (event, input) => {
    if (context._meetingSpeakerRerunBusy) {
      return { success: false, code: "SPEAKER_RERUN_BUSY",
        error: "Another speaker rerun is processing" };
    }
    let req;
    try { req = validateRerunRequest(input || {}, maxSpeakerCount); }
    catch (error) { return deny(error); }
    const { noteId, sessionId, source: trackSource, expectedCount } = req;
    if (!noteFree(noteId)) return deny(new Error("This note is unavailable or recording is active"));
    if (!context.diarizationManager?.isAvailable()) {
      return deny(new Error("Install the local speaker identification models first"));
    }
    context._meetingSpeakerRerunBusy = true;
    const requestId = crypto.randomUUID();
    const purgeGeneration = context._meetingSourcePurgeGeneration;
    const account = context.databaseManager.activeAccountId;
    const authGeneration = getAuthContext().generation;
    let wavPath = null;
    try {
      emitStage(event.sender, noteId, requestId, "preparing");
      const track = await source(noteId, sessionId, trackSource);
      if (!track) throw new Error("Archived audio is missing or expired");
      const note = context.databaseManager.getNote(noteId);
      if (!note || note.deleted_at || !noteFree(noteId)) throw new Error("Note is unavailable");
      const originalTranscript = note.transcript;
      selectTimedSourceRows(parseRerunTranscript(originalTranscript), {
        sessionId, source: trackSource, startedAt: track.startedAt, bytes: track.bytes,
      });
      wavPath = await context.diarizationManager.convertRawPcmToWav(track.path, 24000);
      emitStage(event.sender, noteId, requestId, "clustering");
      const nativeSegments = await context.diarizationManager.diarize(wavPath);
      if (!nativeSegments?.length) throw new Error("Local speaker model found no voices");
      const capped = await capRerunSpeakerGroups({
        segments: nativeSegments, expectedCount, source: trackSource,
        wavPath, diarizationManager: context.diarizationManager, embeddings: speakerEmbeddings,
      });
      emitStage(event.sender, noteId, requestId, "matching");
      const preview = buildSpeakerRerunPreview({
        originalTranscript, sessionId, source: trackSource,
        startedAt: track.startedAt, bytes: track.bytes,
        diarizationSegments: capped.segments,
        diarizationManager: context.diarizationManager,
      });
      // Native work may take minutes. Both audio permission and the original
      // transcript are rechecked; a stale run never publishes labels.
      const [currentTrack, currentNote] = await Promise.all([
        source(noteId, sessionId, trackSource),
        Promise.resolve(context.databaseManager.getNote(noteId)),
      ]);
      if (!currentTrack || !currentNote || currentNote.deleted_at ||
          currentNote.transcript !== originalTranscript || !noteFree(noteId) ||
          context._meetingSourcePurgeGeneration !== purgeGeneration ||
          context.databaseManager.activeAccountId !== account ||
          getAuthContext().generation !== authGeneration ||
          event.sender.isDestroyed?.()) {
        throw new Error("Recording, account or transcript changed; retry preview");
      }
      context._meetingSpeakerRerunPreviews.set(noteId, {
        requestId, senderId: event.sender.id, originalTranscript,
        proposedTranscript: preview.proposedTranscript, sessionId, trackSource,
        purgeGeneration, account, authGeneration,
        expiresAt: Date.now() + 20 * 60_000,
        changedCount: preview.changedCount,
      });
      return { success: true, requestId, changedCount: preview.changedCount,
        matchedCount: preview.matchedCount, lockedCount: preview.lockedCount,
        detectedCount: capped.detectedCount, appliedCap: capped.cap,
        method: capped.method };
    } catch (error) {
      return deny(error);
    } finally {
      if (wavPath) await fs.unlink(wavPath).catch(() => {});
      context._meetingSpeakerRerunBusy = false;
    }
  });

  ipcMain.handle("meeting-speaker-rerun-apply", async (event, noteId, requestId) => {
    try {
      const preview = context._meetingSpeakerRerunPreviews.get(noteId);
      if (!preview || preview.requestId !== requestId ||
          preview.senderId !== event.sender.id || preview.expiresAt <= Date.now() ||
          !noteFree(noteId) || preview.purgeGeneration !== context._meetingSourcePurgeGeneration ||
          preview.account !== context.databaseManager.activeAccountId ||
          preview.authGeneration !== getAuthContext().generation) {
        throw new Error("Preview expired, note changed, or account changed; preview again");
      }
      const track = await source(noteId, preview.sessionId, preview.trackSource);
      if (!track) throw new Error("Archived audio is no longer available");
      // There must be no await after this read; the same main process owns
      // both the synchronous SQLite compare and the update.
      const current = context.databaseManager.getNote(noteId);
      if (!current || current.deleted_at || current.transcript !== preview.originalTranscript ||
          !noteFree(noteId) || preview.purgeGeneration !== context._meetingSourcePurgeGeneration ||
          preview.account !== context.databaseManager.activeAccountId) {
        throw new Error("Transcript or audio permission changed; nothing was overwritten");
      }
      const result = context.databaseManager.updateNote(noteId, {
        transcript: preview.proposedTranscript,
      });
      if (!result?.success || !result.note) {
        throw new Error(result?.error || "Could not save speaker labels");
      }
      context._meetingSpeakerRerunPreviews.delete(noteId);
      context._meetingSpeakerRerunUndo.set(noteId, {
        account: preview.account, originalTranscript: preview.originalTranscript,
        appliedTranscript: preview.proposedTranscript,
        expiresAt: Date.now() + 60 * 60_000,
      });
      notify(result.note);
      return { success: true, note: result.note, changedCount: preview.changedCount };
    } catch (error) { return deny(error); }
  });

  ipcMain.handle("meeting-speaker-rerun-undo", (_event, noteId) => {
    try {
      const undo = context._meetingSpeakerRerunUndo.get(noteId);
      if (!undo || undo.expiresAt <= Date.now() ||
          undo.account !== context.databaseManager.activeAccountId || !noteFree(noteId)) {
        throw new Error("No undo is available for this note/account");
      }
      const current = context.databaseManager.getNote(noteId);
      if (!current || current.deleted_at || current.transcript !== undo.appliedTranscript) {
        throw new Error("Transcript changed since rerun; undo would overwrite newer edits");
      }
      const result = context.databaseManager.updateNote(noteId, {
        transcript: undo.originalTranscript,
      });
      if (!result?.success || !result.note) {
        throw new Error(result?.error || "Could not restore previous speaker labels");
      }
      clear(noteId);
      notify(result.note);
      return { success: true, note: result.note };
    } catch (error) { return deny(error); }
  });
}

module.exports = { registerMeetingSpeakerRerunIpc };
