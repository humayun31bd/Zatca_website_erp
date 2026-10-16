export interface LogMeta {
  [key: string]: unknown;
}

export const logger = {
  info: (metaOrMsg: LogMeta | string, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      console.log(`[INFO] ${metaOrMsg}`);
    } else {
      console.log(`[INFO] ${msg || ''}`, metaOrMsg);
    }
  },
  warn: (metaOrMsg: LogMeta | string, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      console.warn(`[WARN] ${metaOrMsg}`);
    } else {
      console.warn(`[WARN] ${msg || ''}`, metaOrMsg);
    }
  },
  error: (metaOrMsg: LogMeta | string, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      console.error(`[ERROR] ${metaOrMsg}`);
    } else {
      console.error(`[ERROR] ${msg || ''}`, metaOrMsg);
    }
  },
  debug: (metaOrMsg: LogMeta | string, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      console.debug(`[DEBUG] ${metaOrMsg}`);
    } else {
      console.debug(`[DEBUG] ${msg || ''}`, metaOrMsg);
    }
  },
};

export default logger;
