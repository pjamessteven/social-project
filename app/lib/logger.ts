interface Logger {
  info: (data: any, message?: string) => void;
  error: (data: any, message?: string) => void;
}

function createLogger(): Logger {
  return {
    info: (data: any, message?: string) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] INFO:`, message || "", data);
    },
    error: (data: any, message?: string) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ERROR:`, message || "", data);
    },
  };
}

export const logger = createLogger();

export function getLogger(): Logger {
  return logger;
}
