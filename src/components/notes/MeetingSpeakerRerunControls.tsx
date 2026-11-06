import { useEffect, useState } from "react";
import type { NoteItem } from "../../types/electron";
import { DEFAULT_EXPECTED_SPEAKER_COUNT, MAX_SPEAKER_COUNT } from "../../constants/speakerDetection.json";
import { Button } from "../ui/button";

type Track = { source: "mic" | "system"; startedAt: number; durationSeconds: number };
type Session = { sessionId: string; createdAt: number; tracks: Track[] };
type Preview = {
  requestId: string;
  changedCount: number;
  matchedCount: number;
  lockedCount: number;
  detectedCount: number;
  appliedCap: number;
  method: string;
};

interface Props {
  noteId: number;
  initialCount?: number | null;
  onTranscriptSaved: (note: NoteItem) => void;
}

const stages: Record<string, string> = {
  preparing: "Preparing retained audio",
  clustering: "Finding distinct voices",
  matching: "Matching speakers to the saved transcript",
};

/**
 * Non-destructive local speaker rerun. A preview only stages label changes in
 * main; Apply checks the same transcript is still saved before altering it.
 * All actual source audio remains inside the main process.
 */
export default function MeetingSpeakerRerunControls({
  noteId, initialCount, onTranscriptSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [source, setSource] = useState<"mic" | "system">("system");
  const [count, setCount] = useState(
    Math.max(1, Math.min(MAX_SPEAKER_COUNT, initialCount || DEFAULT_EXPECTED_SPEAKER_COUNT))
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [undoReady, setUndoReady] = useState(false);

  useEffect(() => window.electronAPI?.onMeetingSpeakerRerunStage?.((data) => {
    if (data.noteId === noteId) setStage(stages[data.stage] || data.stage);
  }), [noteId]);

  const selectedSession = sessions.find((item) => item.sessionId === sessionId);
  const availableTracks = selectedSession?.tracks ?? [];

  const selectSession = (id: string) => {
    setSessionId(id);
    const session = sessions.find((item) => item.sessionId === id);
    setSource(session?.tracks.some((track) => track.source === "system") ? "system" : "mic");
    setPreview(null);
    setError("");
  };

  const openPanel = async () => {
    setOpen(true);
    setPreview(null);
    setError("");
    setStage("");
    setBusy(true);
    try {
      const response = await window.electronAPI?.meetingSpeakerRerunSessions?.(noteId);
      if (!response?.success) {
        setError(response?.error || "Unable to find the saved recording");
        setSessions([]);
        return;
      }
      const ordered = response.sessions ?? [];
      setSessions(ordered);
      const first = ordered[0];
      if (first) {
        setSessionId(first.sessionId);
        setSource(first.tracks.some((track) => track.source === "system") ? "system" : "mic");
      } else {
        setSessionId("");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const makePreview = async () => {
    if (!sessionId || busy) return;
    setPreview(null);
    setStage("Preparing retained audio");
    setError("");
    setBusy(true);
    try {
      const response = await window.electronAPI?.meetingSpeakerRerunPreview?.({
        noteId, sessionId, source, expectedCount: count,
      });
      if (!response?.success || !response.requestId) {
        setError(response?.error || "Speaker identification failed");
        return;
      }
      setPreview({
        requestId: response.requestId,
        changedCount: response.changedCount ?? 0,
        matchedCount: response.matchedCount ?? 0,
        lockedCount: response.lockedCount ?? 0,
        detectedCount: response.detectedCount ?? 0,
        appliedCap: response.appliedCap ?? count,
        method: response.method ?? "native",
      });
      setStage("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyPreview = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    setStage("Saving speaker labels");
    try {
      const result = await window.electronAPI?.meetingSpeakerRerunApply?.(noteId, preview.requestId);
      if (!result?.success || !result.note) {
        setError(result?.error || "Could not apply speaker labels");
        return;
      }
      onTranscriptSaved(result.note);
      setPreview(null);
      setUndoReady(true);
      setStage("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await window.electronAPI?.meetingSpeakerRerunUndo?.(noteId);
      if (!result?.success || !result.note) {
        setError(result?.error || "No undo is available");
        return;
      }
      onTranscriptSaved(result.note);
      setUndoReady(false);
      setPreview(null);
      setStage("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="px-5 pt-3">
        <button type="button" onClick={openPanel}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Re-run speaker identification
        </button>
      </div>
    );
  }

  return (
    <section className="mx-5 my-3 rounded-xl border border-border/70 bg-muted/30 p-4 text-sm"
      aria-label="Re-run speaker identification">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-semibold">Re-run speaker identification</span>
        <button type="button" onClick={() => setOpen(false)} disabled={busy}
          className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Uses saved local audio. Only speaker labels can change; transcript words and manual locks stay intact.
      </p>
      {sessions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            Recording
            <select className="rounded-md border border-border bg-background p-2" value={sessionId}
              disabled={busy} onChange={(event) => selectSession(event.target.value)}>
              {sessions.map((session, index) => (
                <option key={session.sessionId} value={session.sessionId}>
                  {new Date(session.createdAt).toLocaleString()} ({index + 1})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Audio source
            <select className="rounded-md border border-border bg-background p-2" value={source}
              disabled={busy} onChange={(event) => {
                setSource(event.target.value as "mic" | "system");
                setPreview(null);
              }}>
              {availableTracks.map((track) => (
                <option key={track.source} value={track.source}>
                  {track.source === "system" ? "Remote / system" : "Microphone"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Total speakers (including you)
            <input className="rounded-md border border-border bg-background p-2" type="number"
              min={source === "system" ? 2 : 1} max={MAX_SPEAKER_COUNT}
              value={count} disabled={busy}
              onChange={(event) => {
                setCount(Math.max(source === "system" ? 2 : 1,
                  Math.min(MAX_SPEAKER_COUNT, Number(event.target.value) ||
                    DEFAULT_EXPECTED_SPEAKER_COUNT)));
                setPreview(null);
              }} />
          </label>
        </div>
      )}
      {!busy && sessions.length === 0 && !error && (
        <p className="text-xs text-muted-foreground">
          No retained recording is available for this note.
        </p>
      )}
      {stage && <p className="mt-3 text-xs" role="status">{stage}...</p>}
      {error && <p className="mt-3 text-xs text-destructive" role="alert">{error}</p>}
      {preview && (
        <p className="mt-3 text-xs" role="status">
          Preview ready: {preview.changedCount} speaker labels to change across {preview.matchedCount}
          {" "}timed statements; {preview.lockedCount} manually locked statements preserved.
          {" "}Detected acoustic groups: {preview.detectedCount}.
          {preview.method === "confidence-or-unassigned" &&
            " Acoustic groups without a reliable voice match remain unassigned rather than inheriting another person's label."}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy || !sessionId} onClick={makePreview}>
          {busy ? "Processing..." : "Preview speaker labels"}
        </Button>
        {preview && (
          <Button size="sm" disabled={busy} onClick={applyPreview}>Apply labels</Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={undo}>
          {undoReady ? "Undo last re-run" : "Undo previous re-run"}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Undo is available locally for up to one hour, until the app restarts or the transcript changes.
        Older untagged recordings cannot be matched safely.
      </p>
    </section>
  );
}
