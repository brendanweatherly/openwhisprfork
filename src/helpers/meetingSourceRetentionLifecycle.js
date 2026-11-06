"use strict";

// The main process is the only caller. Renderer requests must never supply a
// note-authorization result or a path into this module.
const {
  mayRetainMeetingSource,
  archiveMeetingSource,
  deleteArchivedMeetingSession,
} = require("./meetingAudioArchive");

function isLiveOwnedNote({ noteId, databaseManager, signedIn }) {
  if (!Number.isSafeInteger(noteId) || noteId <= 0 || !databaseManager) return false;
  const activeAccountId = databaseManager.activeAccountId;
  // A signed-in user whose account scope is still unresolved cannot acquire
  // another account's locally retained audio through a legacy private note.
  if (signedIn && (!activeAccountId || typeof activeAccountId !== "string")) return false;
  const note = databaseManager.getNote(noteId);
  if (!note || note.id !== noteId || note.deleted_at) return false;
  const space = databaseManager.getSpace(note.space_id);
  if (!space || space.deleted_at) return false;
  if (note.account_id && note.account_id !== activeAccountId) return false;
  // A cloud note shared in a team space is not necessarily owned by the person
  // recording. Match the ownership check used for meeting-note resumption.
  if (note.cloud_id != null && note.owner_user_id !== activeAccountId) {
    if (!(note.owner_user_id == null && space.kind === "private")) return false;
  }
  return true;
}

function createMeetingSourceAuthorization({
  databaseManager, getRetentionSettings, getRetentionSettingsSynced, getSignedIn,
}) {
  if (!databaseManager || typeof getRetentionSettings !== "function" ||
      typeof getRetentionSettingsSynced !== "function" || typeof getSignedIn !== "function") {
    throw new Error("Missing meeting source authorization dependency");
  }
  return async ({ noteId }) => {
    const signedIn = getSignedIn() === true;
    return {
      retentionSettingsSynced: getRetentionSettingsSynced() === true,
      retentionSettings: getRetentionSettings(),
      hasActiveAccountScope: signedIn,
      noteAuthorized: isLiveOwnedNote({ noteId, databaseManager, signedIn }),
    };
  };
}

// Evaluated at start and again throughout the call, to decide whether mic PCM
// should continue after the existing diarization selection switches to system.
// The archive itself independently rechecks authorization under the note lock.
async function canRetainMeetingNote(authorize, noteId, sessionId) {
  try {
    const state = await authorize({ action: "preflight", noteId, sessionId, source: "mic" });
    return mayRetainMeetingSource(state);
  } catch {
    return false;
  }
}

/**
 * Persist ONLY already-closed, internally generated capture tracks. Never
 * delete/alter temp inputs here: the caller still needs the selected PCM for
 * diarization, even if retention is rejected or fails.
 */
async function retainClosedMeetingTracks({
  userDataDir, noteId, sessionId, tracks, authorize, canContinue = () => true,
}) {
  const saved = [];
  const errors = [];
  if (!Number.isSafeInteger(noteId) || noteId <= 0 || !sessionId) {
    return { saved, errors: [{ source: "meeting", code: "missing-note-or-session" }] };
  }
  if (!Array.isArray(tracks) || typeof canContinue !== "function") {
    throw new Error("Invalid meeting capture retention request");
  }
  let revoked = false;
  for (const track of tracks) {
    if (await canContinue() !== true) {
      revoked = true;
      errors.push({ source: "meeting", code: "recording-invalidated" });
      break;
    }
    if (!track || !track.path) continue;
    if (track.source !== "mic" && track.source !== "system") {
      errors.push({ source: "unknown", code: "invalid-track" });
      continue;
    }
    try {
      saved.push(await archiveMeetingSource({
        userDataDir, noteId, sessionId, source: track.source,
        inputPath: track.path, startedAt: track.startedAt, authorize,
      }));
      if (await canContinue() !== true) {
        revoked = true;
        errors.push({ source: "meeting", code: "recording-invalidated" });
        break;
      }
    } catch (error) {
      errors.push({ source: track.source,
        code: error.code === "SOURCE_AUDIO_NOT_AUTHORIZED" ? error.code : "archive-failed",
        message: error.message });
    }
  }
  // If authorization was revoked after one track published, do not leave a
  // partially retained session behind. Earlier sessions under this note remain.
  if (saved.length && (revoked || errors.some((row) => row.code === "SOURCE_AUDIO_NOT_AUTHORIZED"))) {
    await deleteArchivedMeetingSession({ userDataDir, noteId, sessionId });
    saved.length = 0;
  }
  return { saved, errors };
}

module.exports = {
  isLiveOwnedNote,
  createMeetingSourceAuthorization,
  canRetainMeetingNote,
  retainClosedMeetingTracks,
};
