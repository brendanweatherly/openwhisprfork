import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "../icons";
import { cn } from "../lib/utils";
import { Button } from "../ui/button";
import { blurBehindOverlays } from "../ui/overlayBlur";
import type {
  MeetingDiarizationProgress,
  MeetingDiarizationStage,
} from "../../utils/meetingDiarizationProgress";

interface Props {
  progress: MeetingDiarizationProgress | null;
  onDismiss: (sessionId: string) => void;
}

const STAGES: MeetingDiarizationStage[] = [
  "preparing", "clustering", "matching", "saving",
];

function formatElapsed(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Separate from note-action overlays: diarization runs after meeting stop,
 * follows its own session and has no safe native-process cancellation action.
 * Stage changes represent actual processing boundaries, never a fake percent.
 */
export default function MeetingDiarizationProgressOverlay({ progress, onDismiss }: Props) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const sessionId = progress?.sessionId;
  const status = progress?.status;

  useEffect(() => {
    if (!progress || status !== "running") return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionId, progress?.startedAt, status]);

  useEffect(() => {
    if (!sessionId || (status !== "success" && status !== "skipped")) return;
    const timer = setTimeout(() => onDismiss(sessionId), 2800);
    return () => clearTimeout(timer);
  }, [sessionId, status, onDismiss]);

  if (!progress) return null;

  const running = status === "running";
  const failed = status === "failed";
  const currentStage = STAGES.indexOf(progress.stage);
  const elapsedMs = (running ? now : progress.updatedAt) - progress.startedAt;
  const title = running
    ? t("notes.speaker.diarizationProgress.title")
    : status === "success"
      ? t("notes.speaker.diarizationProgress.complete")
      : status === "skipped"
        ? t("notes.speaker.diarizationProgress.skipped")
        : t("notes.speaker.diarizationProgress.failed");

  return (
    <div
      data-testid="meeting-diarization-progress-overlay"
      className={cn(
        "absolute inset-0 z-[9] flex items-center justify-center p-4",
        blurBehindOverlays
          ? "bg-background/70 backdrop-blur-md"
          : "bg-background/95"
      )}
    >
      <div className="w-full max-w-sm rounded-xl border border-border/70 bg-background p-5 shadow-elevated">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground" role="status" aria-live="polite">
          {running ? <Loader2 size={17} className="animate-spin shrink-0" /> : (
            status === "success" ? <Check size={17} className="shrink-0 text-success" /> : null
          )}
          {title}
        </div>

        {running && (
          <div className="mt-4 space-y-2" aria-label={t("notes.speaker.diarizationProgress.steps")}>
            {STAGES.map((stage, index) => (
              <div key={stage} className={cn(
                "flex items-center gap-2 text-xs",
                index > currentStage ? "text-muted-foreground/50" : "text-foreground"
              )}>
                <span className="flex size-4 items-center justify-center shrink-0">
                  {index < currentStage
                    ? <Check size={13} className="text-success" />
                    : index === currentStage
                      ? <Loader2 size={13} className="animate-spin" />
                      : <span className="size-1.5 rounded-full bg-muted-foreground/40" />}
                </span>
                <span>{t(`notes.speaker.diarizationProgress.${stage}`)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-[11px] text-muted-foreground">
          {t("notes.speaker.diarizationProgress.elapsed", { duration: formatElapsed(elapsedMs) })}
        </div>
        {failed && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("notes.speaker.diarizationProgress.failureDescription")}
          </p>
        )}
        {!running && (
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => onDismiss(progress.sessionId)}>
              {t("notes.speaker.diarizationProgress.dismiss")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
