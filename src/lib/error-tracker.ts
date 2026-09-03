import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  ApplicationError,
  ErrorSeverity,
  recordApplicationError,
  getErrors,
  getErrorById,
  resolveApplicationError,
} from "./db";
import { logger, redactSensitiveData } from "./logger";
import { triggerAlert } from "./alerts";

export interface TrackErrorParams {
  error: Error | string | unknown;
  severity?: ErrorSeverity;
  source: string; // e.g. "DRIVE_SCAN", "PAYMENT_WEBHOOK", "EMAIL_SEND", "AUTH", "API", "DATABASE", "MIDDLEWARE"
  route?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  photographerId?: string;
  metadata?: Record<string, any>;
  fingerprint?: string;
}

/**
 * Normalizes an unknown error into a safe string message and stack.
 */
function normalizeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: err.message || "Unknown error",
      stack: err.stack ? err.stack.split("\n").slice(0, 8).join("\n") : undefined,
    };
  }
  if (typeof err === "string") {
    return { message: err };
  }
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

/**
 * Centralized error tracker.
 * 
 * Captures, redacts sensitive parameters, groups identical errors by fingerprint,
 * records to persistent JSON store, and auto-triggers platform alerts for critical/error severities.
 */
export function trackError(
  errorOrParams: Error | string | unknown | TrackErrorParams,
  options?: Partial<TrackErrorParams>
): ApplicationError {
  let params: TrackErrorParams;
  if (
    errorOrParams &&
    typeof errorOrParams === "object" &&
    "source" in errorOrParams &&
    "error" in errorOrParams
  ) {
    params = errorOrParams as TrackErrorParams;
  } else {
    params = {
      error: errorOrParams,
      source: options?.source || "APPLICATION",
      ...options,
    };
  }

  const { message, stack } = normalizeError(params.error);
  const severity = params.severity || "ERROR";
  const source = (params.source || "APPLICATION").toUpperCase().trim();
  const env = (process.env.NODE_ENV as any) || "development";

  // Compute deterministic fingerprint based on source, route, and sanitized error message
  const normalizedMsg = message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<ID>").replace(/\d+/g, "<NUM>");
  const fingerprint =
    params.fingerprint ||
    crypto
      .createHash("sha256")
      .update(`${source}:${params.route || ""}:${normalizedMsg}`)
      .digest("hex")
      .slice(0, 16);

  const cleanMetadata = params.metadata ? redactSensitiveData(params.metadata) : undefined;

  const appError: ApplicationError = {
    id: `err-${Date.now()}-${uuidv4().slice(0, 8)}`,
    fingerprint,
    severity,
    source,
    message: message.slice(0, 500),
    stack,
    route: params.route,
    method: params.method,
    statusCode: params.statusCode,
    requestId: params.requestId,
    photographerId: params.photographerId,
    environment: env,
    occurrences: 1,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    metadata: cleanMetadata,
  };

  const recorded = recordApplicationError(appError);

  // Log to structured logger
  if (severity === "CRITICAL") {
    logger.critical(`[${source}] ${message}`, {
      requestId: params.requestId,
      route: params.route,
      occurrences: recorded.occurrences,
      metadata: cleanMetadata,
    });
  } else if (severity === "ERROR") {
    logger.error(`[${source}] ${message}`, {
      requestId: params.requestId,
      route: params.route,
      occurrences: recorded.occurrences,
      metadata: cleanMetadata,
    });
  } else if (severity === "WARNING") {
    logger.warn(`[${source}] ${message}`, {
      requestId: params.requestId,
      route: params.route,
      occurrences: recorded.occurrences,
    });
  }

  // Auto-trigger Platform Alert on CRITICAL or repeated HIGH errors
  if (severity === "CRITICAL") {
    triggerAlert({
      title: `Critical failure in ${source}: ${message.slice(0, 80)}`,
      description: `Critical error encountered on route ${params.route || "N/A"}: ${message}`,
      source,
      severity: "CRITICAL",
      metadata: { errorId: recorded.id, fingerprint, occurrences: recorded.occurrences },
    });
  } else if (severity === "ERROR" && recorded.occurrences >= 5) {
    triggerAlert({
      title: `Repeated failure in ${source} (${recorded.occurrences}x): ${message.slice(0, 60)}`,
      description: `Error has occurred ${recorded.occurrences} times on route ${params.route || "N/A"}: ${message}`,
      source,
      severity: "HIGH",
      metadata: { errorId: recorded.id, fingerprint, occurrences: recorded.occurrences },
    });
  }

  return recorded;
}

export {
  getErrors,
  getErrors as getTrackedErrors,
  getErrorById,
  resolveApplicationError,
  resolveApplicationError as resolveError,
};
