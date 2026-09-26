/**
 * Agent run lifecycle for the chat API.
 *
 * One active run per conversation (a follow-up message supersedes and cancels
 * the previous run instead of letting two agents race on the same conversation
 * and wiki pages), a global concurrency cap, and a hard wall-clock limit per
 * run. The global slot is released when the run is finished — i.e. when the
 * response stream actually ends — NOT when the route handler returns a
 * streaming Response.
 */

const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_WORKFLOWS) || 20;

// Hard wall-clock limit per run. Long wiki-research turns are legitimate, but
// nothing should be able to stream for hours (an unguarded agent loop once ran
// 145 minutes).
const DEFAULT_RUN_TIMEOUT_MS =
  Number(process.env.CHAT_RUN_TIMEOUT_MS) || 15 * 60_000;

// After a cancellation, how long the agent may take to wind down before the
// global slot is force-released.
const CANCEL_FINISH_GRACE_MS = 30_000;

export type CancelReason = string;

let active = 0;
const activeRuns = new Map<string, WorkflowRun>();

export class WorkflowRun {
  readonly conversationId: string;
  readonly startedAt = Date.now();
  private cancelHandlers = new Set<(reason: CancelReason) => void>();
  private finishHandlers = new Set<() => void>();
  private cancelledReason: CancelReason | null = null;
  private finished = false;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    conversationId: string,
    timeoutMs: number = DEFAULT_RUN_TIMEOUT_MS,
  ) {
    this.conversationId = conversationId;
    if (timeoutMs > 0) {
      this.timeout = setTimeout(() => {
        this.cancel(`run time limit reached (${Math.round(timeoutMs / 1000)}s)`);
      }, timeoutMs);
      // Never keep the process alive just for the run timer.
      this.timeout.unref?.();
    }
  }

  get isCancelled(): boolean {
    return this.cancelledReason !== null;
  }

  get cancelReason(): CancelReason | null {
    return this.cancelledReason;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** Runs `fn` immediately (with the reason) if the run is already cancelled. */
  onCancel(fn: (reason: CancelReason) => void): void {
    if (this.cancelledReason !== null) {
      fn(this.cancelledReason);
      return;
    }
    this.cancelHandlers.add(fn);
  }

  onFinish(fn: () => void): void {
    if (this.finished) return;
    this.finishHandlers.add(fn);
  }

  /**
   * Cancel the run (client disconnect, superseded by a newer message, loop
   * guard, time limit). Idempotent — the first reason wins.
   */
  cancel(reason: CancelReason): void {
    if (this.cancelledReason !== null || this.finished) return;
    this.cancelledReason = reason;
    console.warn(
      `[workflow] cancelling run for conversation ${this.conversationId}: ${reason}`,
    );
    for (const fn of [...this.cancelHandlers]) {
      try {
        fn(reason);
      } catch (error) {
        console.error("[workflow] cancel handler failed:", error);
      }
    }
    // Safety net: the agent may be mid-tool-call and the response stream may
    // already be gone (so nothing will call finish()). Release the slot after
    // a grace period instead of leaking it.
    const grace = setTimeout(
      () => this.finish(),
      CANCEL_FINISH_GRACE_MS,
    );
    grace.unref?.();
  }

  /** Release the global slot and remove the run from the registry. Idempotent. */
  finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.cancelHandlers.clear();
    if (activeRuns.get(this.conversationId) === this) {
      activeRuns.delete(this.conversationId);
    }
    active = Math.max(0, active - 1);
    const handlers = [...this.finishHandlers];
    this.finishHandlers.clear();
    for (const fn of handlers) {
      try {
        fn();
      } catch (error) {
        console.error("[workflow] finish handler failed:", error);
      }
    }
  }
}

/**
 * Start a run for a conversation. Any run already active for the same
 * conversation is cancelled first (its agent keeps no zombie alive), and the
 * global concurrency cap is enforced. Returns null when the server is at
 * capacity.
 */
export function beginRun(
  conversationId: string,
  options: { timeoutMs?: number } = {},
): WorkflowRun | null {
  const previous = activeRuns.get(conversationId);
  if (previous && !previous.isFinished) {
    previous.cancel(
      "superseded by a newer message in the same conversation",
    );
  }
  if (active >= MAX_CONCURRENT) return null;
  const run = new WorkflowRun(
    conversationId,
    options.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS,
  );
  activeRuns.set(conversationId, run);
  active++;
  return run;
}

/** The run currently registered for a conversation, if any. */
export function getActiveRun(conversationId: string): WorkflowRun | undefined {
  return activeRuns.get(conversationId);
}
