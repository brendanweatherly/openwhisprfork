/**
 * Session-scoped, note-scoped post-meeting diarization progress.
 * All stage transitions come from actual main-process pipeline boundaries.
 * No guessed percentages and no personal/meeting data are stored here.
 */
export type MeetingDiarizationStage = "preparing" | "clustering" | "matching" | "saving";
export type MeetingDiarizationStatus = "running" | "success" | "skipped" | "failed";

export interface MeetingDiarizationProgress {
  sessionId: string;
  noteId: number;
  stage: MeetingDiarizationStage;
  status: MeetingDiarizationStatus;
  startedAt: number;
  updatedAt: number;
}

export type MeetingDiarizationProgressEvent = Partial<
  Pick<MeetingDiarizationProgress, "stage" | "status" | "startedAt" | "updatedAt">
> & { sessionId?: string; noteId?: number | null };

export type MeetingDiarizationProgressMap = Record<string, MeetingDiarizationProgress>;

const STAGES: MeetingDiarizationStage[] = ["preparing", "clustering", "matching", "saving"];
const TERMINAL = new Set<MeetingDiarizationStatus>(["success", "skipped", "failed"]);

/** Reject stale, cross-note and out-of-order updates instead of regressing a UI stage. */
export function updateMeetingDiarizationProgress(
  previous: MeetingDiarizationProgressMap,
  event: MeetingDiarizationProgressEvent
): MeetingDiarizationProgressMap {
  if (
    !event ||
    typeof event.sessionId !== "string" ||
    !event.sessionId ||
    !Number.isSafeInteger(event.noteId) ||
    Number(event.noteId) <= 0 ||
    (event.stage != null && !STAGES.includes(event.stage)) ||
    (event.status != null && !["running", "success", "skipped", "failed"].includes(event.status))
  ) return previous;

  const sessionId = event.sessionId;
  const noteId = Number(event.noteId);
  const current = previous[sessionId];
  if (current && (current.noteId !== noteId || TERMINAL.has(current.status))) return previous;

  const stage = event.stage ?? current?.stage ?? "preparing";
  if (current && STAGES.indexOf(stage) < STAGES.indexOf(current.stage)) return previous;

  const startedAt =
    current?.startedAt ??
    (typeof event.startedAt === "number" && Number.isFinite(event.startedAt)
      ? event.startedAt : Date.now());
  const updatedAt =
    typeof event.updatedAt === "number" && Number.isFinite(event.updatedAt)
      ? Math.max(startedAt, event.updatedAt) : Date.now();
  return {
    ...previous,
    [sessionId]: {
      sessionId, noteId, stage, startedAt, updatedAt,
      status: event.status ?? "running",
    },
  };
}

/** Only successful persistence may change 'saving' into 'success'. */
export function settleMeetingDiarizationProgress(
  previous: MeetingDiarizationProgressMap,
  sessionId: string | undefined,
  status: "success" | "skipped" | "failed"
): MeetingDiarizationProgressMap {
  if (!sessionId || !previous[sessionId]) return previous;
  const old = previous[sessionId];
  if (TERMINAL.has(old.status)) return previous;
  return {
    ...previous,
    [sessionId]: { ...old, status, updatedAt: Date.now() },
  };
}

export function dismissMeetingDiarizationProgress(
  previous: MeetingDiarizationProgressMap,
  sessionId: string
): MeetingDiarizationProgressMap {
  if (!previous[sessionId]) return previous;
  const next = { ...previous };
  delete next[sessionId];
  return next;
}

export function latestNoteDiarizationProgress(
  progress: MeetingDiarizationProgressMap,
  noteId: number
): MeetingDiarizationProgress | null {
  return Object.values(progress)
    .filter((item) => item.noteId === noteId)
    .sort((a, b) => b.startedAt - a.startedAt || b.updatedAt - a.updatedAt)[0] ?? null;
}
