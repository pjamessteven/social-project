const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_WORKFLOWS) || 20;

let active = 0;

export function tryAcquireWorkflow(): boolean {
  if (active >= MAX_CONCURRENT) return false;
  active++;
  return true;
}

export function releaseWorkflow(): void {
  active = Math.max(0, active - 1);
}
