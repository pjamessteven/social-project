#!/usr/bin/env tsx
import "dotenv/config";
import cron from "node-cron";
import { processMentionsCycle } from "../app/lib/twitter/bot";

let running = false;

async function runCycle() {
  if (running) {
    console.log("[TWITTER BOT] Previous cycle still running, skipping");
    return;
  }
  running = true;
  try {
    await processMentionsCycle();
  } catch (err) {
    console.error("[TWITTER BOT] Cycle failed:", err);
  } finally {
    running = false;
  }
}

console.log("[TWITTER BOT] Starting...");

// Run immediately on start
runCycle();

// Then every 15 minutes
cron.schedule("*/15 * * * *", () => {
  runCycle();
});

console.log("[TWITTER BOT] Scheduled. Polling every 5 minutes.");
