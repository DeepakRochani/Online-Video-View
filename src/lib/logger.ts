/**
 * Production Structured Logger
 * 
 * Provides:
 * - Leveled logging (DEBUG, INFO, WARN, ERROR, CRITICAL)
 * - Request ID & context correlation
 * - Automatic sensitive data redaction (tokens, passwords, API keys, webhook secrets)
 * - Clean structured JSON output in production / readable formatted output in dev
 */

const SENSITIVE_KEY_PATTERNS = [
  "password",
  "token",
  "secret",
  "cookie",
  "auth",
  "apikey",
  "keyid",
  "keysecret",
  "privatekey",
  "credential",
  "salt",
];

/**
 * Recursively redacts sensitive keys from objects and arrays before logging.
 */
export function redactSensitiveData(obj: any, depth = 0): any {
  if (depth > 6) return "[MAX_DEPTH]";
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Check if string looks like a JWT or long auth token
    if (/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(obj) && obj.length > 30) {
      return "[REDACTED_TOKEN]";
    }
    return obj;
  }

  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, "");
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => normalizedKey.includes(pattern));
    if (isSensitive) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = redactSensitiveData(value, depth + 1);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

export interface LogContext {
  requestId?: string;
  route?: string;
  method?: string;
  photographerId?: string;
  tenantId?: string;
  source?: string;
  durationMs?: number;
  [key: string]: any;
}

class Logger {
  private baseContext: LogContext;
  private env: string;

  constructor(context: LogContext = {}) {
    this.baseContext = context;
    this.env = process.env.NODE_ENV || "development";
  }

  public withContext(context: LogContext): Logger {
    return new Logger({ ...this.baseContext, ...context });
  }

  private log(level: LogLevel, event: string, data?: any) {
    // Suppress DEBUG logs in production unless DEBUG=true is set
    if (level === "DEBUG" && this.env === "production" && !process.env.DEBUG) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message: event,
      environment: this.env,
      ...this.baseContext,
      ...(data !== undefined ? { data: redactSensitiveData(data) } : {}),
    };

    const isTest = process.env.NODE_ENV === "test";

    // Format output
    if (this.env === "production") {
      const output = JSON.stringify(payload);
      if (level === "ERROR" || level === "CRITICAL") {
        console.error(output);
      } else if (level === "WARN") {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else if (!isTest || process.env.VERBOSE_TEST_LOGS) {
      const timeStr = payload.timestamp.split("T")[1]?.slice(0, 8) || "";
      const reqIdStr = payload.requestId ? `[${payload.requestId.slice(0, 8)}]` : "";
      const routeStr = payload.route ? `(${payload.method || "GET"} ${payload.route})` : "";
      const prefix = `[${level}] ${timeStr} ${reqIdStr} ${routeStr} ${event}:`.trim();

      if (level === "ERROR" || level === "CRITICAL") {
        console.error(prefix, payload.data || "");
      } else if (level === "WARN") {
        console.warn(prefix, payload.data || "");
      } else {
        console.log(prefix, payload.data || "");
      }
    }

    return payload;
  }

  public debug(event: string, data?: any) {
    return this.log("DEBUG", event, data);
  }

  public info(event: string, data?: any) {
    return this.log("INFO", event, data);
  }

  public warn(event: string, data?: any) {
    return this.log("WARN", event, data);
  }

  public error(event: string, data?: any) {
    return this.log("ERROR", event, data);
  }

  public critical(event: string, data?: any) {
    return this.log("CRITICAL", event, data);
  }
}

export const logger = new Logger();
