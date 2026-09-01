"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Clock3, Pause, Play, Square, TimerReset, X } from "lucide-react";
import { saveTimedPracticeAction } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimerSession = {
  itemId: string;
  itemSlug: string;
  itemName: string;
  startedAt: number | null;
  accumulatedSeconds: number;
};

type SongTimerTarget = Pick<TimerSession, "itemId" | "itemSlug" | "itemName">;

type TimerContextValue = {
  timer: TimerSession | null;
  elapsedSeconds: number;
  start: (target: SongTimerTarget) => void;
};

const timerStorageKey = "stride-practice-timer-v1";
const TimerContext = createContext<TimerContextValue | null>(null);

export function PracticeTimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<TimerSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [resumeAfterCancel, setResumeAfterCancel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let storedTimer: TimerSession | null = null;
    try {
      const stored = window.localStorage.getItem(timerStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as TimerSession;
        if (parsed.itemId && parsed.itemSlug && parsed.itemName) storedTimer = parsed;
      }
    } catch {
      window.localStorage.removeItem(timerStorageKey);
    }
    queueMicrotask(() => {
      setTimer(storedTimer);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (timer) window.localStorage.setItem(timerStorageKey, JSON.stringify(timer));
    else window.localStorage.removeItem(timerStorageKey);
  }, [hydrated, timer]);

  useEffect(() => {
    if (!timer?.startedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer?.startedAt]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const elapsedSeconds = timer
    ? timer.accumulatedSeconds +
      (timer.startedAt ? Math.max(0, Math.floor((now - timer.startedAt) / 1000)) : 0)
    : 0;

  function start(target: SongTimerTarget) {
    if (timer) return;
    const timestamp = Date.now();
    setNow(timestamp);
    setTimer({ ...target, startedAt: timestamp, accumulatedSeconds: 0 });
    setError("");
  }

  function pause() {
    if (!timer?.startedAt) return;
    const timestamp = Date.now();
    setTimer({
      ...timer,
      accumulatedSeconds:
        timer.accumulatedSeconds + Math.max(0, Math.floor((timestamp - timer.startedAt) / 1000)),
      startedAt: null,
    });
    setNow(timestamp);
  }

  function resume() {
    if (!timer || timer.startedAt) return;
    const timestamp = Date.now();
    setTimer({ ...timer, startedAt: timestamp });
    setNow(timestamp);
  }

  function requestFinish() {
    if (!timer) return;
    const wasRunning = Boolean(timer.startedAt);
    if (wasRunning) pause();
    setResumeAfterCancel(wasRunning);
    setError("");
    setFinishOpen(true);
  }

  function cancelFinish() {
    setFinishOpen(false);
    if (resumeAfterCancel) {
      const timestamp = Date.now();
      setNow(timestamp);
      setTimer((current) =>
        current && !current.startedAt ? { ...current, startedAt: timestamp } : current,
      );
    }
    setResumeAfterCancel(false);
  }

  async function saveSession() {
    if (!timer) return;
    setSaving(true);
    setError("");
    const durationSeconds = Math.max(1, timer.accumulatedSeconds);
    const result = await saveTimedPracticeAction({
      itemId: timer.itemId,
      itemSlug: timer.itemSlug,
      durationSeconds,
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "The timed session could not be saved.");
      return;
    }

    setFinishOpen(false);
    setResumeAfterCancel(false);
    setTimer(null);
    setNotice(`${formatStopwatch(durationSeconds)} saved to ${timer.itemName}.`);
  }

  function discard() {
    setDiscardOpen(false);
    setFinishOpen(false);
    setResumeAfterCancel(false);
    setTimer(null);
    setError("");
  }

  const contextValue = { timer, elapsedSeconds, start };

  return (
    <TimerContext.Provider value={contextValue}>
      <div className={cn("min-h-full transition-[padding]", timer && "pt-14")}>
        {children}
      </div>

      {timer ? (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-stone-700 bg-stone-950 text-white shadow-lg">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Clock3 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{timer.itemName}</p>
              <p className="text-[0.6875rem] text-stone-400">
                {timer.startedAt ? "Practice timer running" : "Practice timer paused"}
              </p>
            </div>
            <output
              aria-live="off"
              className="min-w-18 text-center font-mono text-base font-semibold tabular-nums sm:text-lg"
            >
              {formatStopwatch(elapsedSeconds)}
            </output>
            <button
              type="button"
              onClick={timer.startedAt ? pause : resume}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-white hover:bg-white/10 hover:text-white",
              )}
            >
              {timer.startedAt ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span className="hidden sm:inline">{timer.startedAt ? "Pause" : "Resume"}</span>
            </button>
            <button
              type="button"
              onClick={requestFinish}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-white/25 bg-white text-stone-950 hover:bg-stone-200",
              )}
            >
              <Square aria-hidden="true" />
              Finish
            </button>
            <button
              type="button"
              onClick={() => setDiscardOpen(true)}
              aria-label="Discard practice timer"
              title="Discard timer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "text-stone-400 hover:bg-white/10 hover:text-white",
              )}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div role="status" className="fixed right-4 bottom-4 z-40 rounded-lg bg-stone-950 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {notice}
        </div>
      ) : null}

      <DialogShell open={finishOpen} onOpenChange={(next) => next ? setFinishOpen(true) : cancelFinish()} title="Finish Practice?" size="md">
        <div className="grid gap-5">
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-center">
            <TimerReset className="mx-auto size-5 text-stone-500" aria-hidden="true" />
            <p className="mt-2 text-3xl font-semibold tabular-nums text-stone-950">
              {formatStopwatch(timer?.accumulatedSeconds ?? 0)}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              This will add a timed entry to {timer?.itemName}.
            </p>
          </div>
          {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <button type="button" onClick={cancelFinish} className={buttonVariants({ variant: "outline" })}>
              Keep Timing
            </button>
            <button type="button" onClick={saveSession} disabled={saving} className={buttonVariants()}>
              {saving ? "Saving…" : "Save Session"}
            </button>
          </div>
        </div>
      </DialogShell>

      <DialogShell open={discardOpen} onOpenChange={setDiscardOpen} title="Discard Timer?" size="md">
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-stone-600">
            The current time for {timer?.itemName} will not be added to your practice log.
          </p>
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <button type="button" onClick={() => setDiscardOpen(false)} className={buttonVariants({ variant: "outline" })}>
              Keep Timer
            </button>
            <button type="button" onClick={discard} className={buttonVariants({ variant: "destructive" })}>
              Discard
            </button>
          </div>
        </div>
      </DialogShell>
    </TimerContext.Provider>
  );
}

export function StartPracticeTimerButton({
  itemId,
  itemSlug,
  itemName,
  compact = false,
}: SongTimerTarget & { compact?: boolean }) {
  const context = usePracticeTimer();
  const sameSong = context.timer?.itemId === itemId;
  const anotherSong = Boolean(context.timer && !sameSong);

  return (
    <button
      type="button"
      onClick={() => context.start({ itemId, itemSlug, itemName })}
      disabled={Boolean(context.timer)}
      title={
        sameSong
          ? `Timer running for ${itemName}`
          : anotherSong
            ? `Finish ${context.timer?.itemName} first`
            : `Start a timer for ${itemName}`
      }
      className={buttonVariants({
        variant: "outline",
        size: compact ? "sm" : "default",
      })}
    >
      <Clock3 data-icon="inline-start" aria-hidden="true" />
      {sameSong ? "Running" : compact ? "Timer" : "Start Timer"}
    </button>
  );
}

function usePracticeTimer() {
  const context = useContext(TimerContext);
  if (!context) throw new Error("Practice timer controls require PracticeTimerProvider.");
  return context;
}

function formatStopwatch(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
