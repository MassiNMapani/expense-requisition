/* Basic logger utility so we can swap implementations later */
export const logger = {
  info: (message: string, ...optional: unknown[]) => console.log(`[INFO] ${message}`, ...optional),
  error: (message: string, ...optional: unknown[]) => console.error(`[ERROR] ${message}`, ...optional)
};
