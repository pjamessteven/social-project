import fs from "fs";
import path from "path";
import pino from "pino";

function getLogFileName(): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  return `requests-${today}.log`;
}

function ensureLogDirectory(): string {
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function createLogger() {
  const logDir = ensureLogDirectory();
  const logFile = path.join(logDir, getLogFileName());

  return pino(
    {
      level: "info",
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
    },
    pino.destination({
      dest: logFile,
      sync: false,
    }),
  );
}

export const logger = createLogger();

// Recreate logger daily to ensure new log files
let lastLogDate = new Date().toDateString();
export function getLogger() {
  const currentDate = new Date().toDateString();
  if (currentDate !== lastLogDate) {
    lastLogDate = currentDate;
    return createLogger();
  }
  return logger;
}
