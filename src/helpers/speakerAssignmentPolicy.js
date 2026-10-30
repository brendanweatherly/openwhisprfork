const SPEAKER_STATUS = Object.freeze({
  PROVISIONAL: "provisional",
  CONFIRMED: "confirmed",
  SUGGESTED: "suggested",
  LOCKED: "locked",
  UNASSIGNED: "unassigned",
});

function canonicalizeSpeakerStatus(status, segment = null) {
  if (segment?.speakerLocked || segment?.speakerLockSource === "user") {
    return SPEAKER_STATUS.LOCKED;
  }

  switch (status) {
    case SPEAKER_STATUS.PROVISIONAL:
    case SPEAKER_STATUS.CONFIRMED:
    case SPEAKER_STATUS.SUGGESTED:
    case SPEAKER_STATUS.LOCKED:
    case SPEAKER_STATUS.UNASSIGNED:
      return status;
    case "user_locked":
      return SPEAKER_STATUS.LOCKED;
    case "suggested_profile":
      return SPEAKER_STATUS.SUGGESTED;
    case "uncertain_overlap":
      return SPEAKER_STATUS.PROVISIONAL;
    default:
      return undefined;
  }
}

function isSpeakerLocked(segment) {
  return canonicalizeSpeakerStatus(segment?.speakerStatus, segment) === SPEAKER_STATUS.LOCKED;
}

function canAutoRelabelSpeaker(segment) {
  return !isSpeakerLocked(segment);
}

function applySpeakerUpdate(segment, patch, status) {
  if (isSpeakerLocked(segment)) {
    segment.speakerStatus = SPEAKER_STATUS.LOCKED;
    segment.speakerLocked = true;
    segment.speakerLockSource = segment.speakerLockSource || "user";
    return segment;
  }

  Object.assign(segment, patch);

  segment.speakerStatus = status;
  return segment;
}

function applyProvisionalSpeaker(segment, patch = {}) {
  return applySpeakerUpdate(segment, patch, SPEAKER_STATUS.PROVISIONAL);
}

function applyConfirmedSpeaker(segment, patch = {}) {
  return applySpeakerUpdate(segment, patch, SPEAKER_STATUS.CONFIRMED);
}

// An acoustic group with no trustworthy identity must not inherit a live
// placeholder, a stale name, or another participant's speaker number. A
// manually locked row is left intact by applySpeakerUpdate.
function applyUnassignedSpeaker(segment) {
  return applySpeakerUpdate(segment, {
    speaker: undefined,
    speakerName: undefined,
    speakerIsPlaceholder: true,
    suggestedName: undefined,
    suggestedProfileId: undefined,
  }, SPEAKER_STATUS.UNASSIGNED);
}

function applySuggestedSpeaker(segment, patch = {}) {
  if (isSpeakerLocked(segment)) {
    return segment;
  }

  return applySpeakerUpdate(segment, patch, SPEAKER_STATUS.SUGGESTED);
}

module.exports = {
  SPEAKER_STATUS,
  canonicalizeSpeakerStatus,
  isSpeakerLocked,
  canAutoRelabelSpeaker,
  applyProvisionalSpeaker,
  applyConfirmedSpeaker,
  applyUnassignedSpeaker,
  applySuggestedSpeaker,
};
