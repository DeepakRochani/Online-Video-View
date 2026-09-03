import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  PlatformAlert,
  AlertSeverity,
  AlertStatus,
  recordPlatformAlert,
  getPlatformAlerts,
  getPlatformAlertById,
  updatePlatformAlertStatus,
  getOpenAlertsCount,
} from "./db";
import { logger } from "./logger";

export interface TriggerAlertParams {
  title: string;
  description?: string;
  message?: string;
  source: string;
  severity: AlertSeverity | "WARNING" | "INFO" | "ERROR";
  photographerId?: string;
  metadata?: Record<string, any>;
  fingerprint?: string;
}

/**
 * Creates or updates a deduplicated platform alert.
 */
export function triggerAlert(params: TriggerAlertParams): PlatformAlert {
  const normalizedSource = (params.source || "SYSTEM").toUpperCase().trim();
  const desc = params.description || params.message || params.title;
  let sev: AlertSeverity = "MEDIUM";
  if (params.severity === "CRITICAL") sev = "CRITICAL";
  else if (params.severity === "HIGH" || params.severity === "ERROR" || params.severity === "WARNING") sev = "HIGH";
  else if (params.severity === "LOW" || params.severity === "INFO") sev = "LOW";

  const fingerprint =
    params.fingerprint ||
    crypto
      .createHash("sha256")
      .update(`${normalizedSource}:${params.title.toLowerCase().trim()}`)
      .digest("hex")
      .slice(0, 16);

  const alert: PlatformAlert = {
    id: `alert-${Date.now()}-${uuidv4().slice(0, 8)}`,
    fingerprint,
    title: params.title,
    description: desc,
    source: normalizedSource,
    severity: sev,
    status: "OPEN",
    occurrences: 1,
    createdAt: new Date().toISOString(),
    lastOccurredAt: new Date().toISOString(),
    photographerId: params.photographerId,
    metadata: params.metadata,
  };

  const recorded = recordPlatformAlert(alert);

  logger.warn(`[ALERT_${params.severity}] ${params.title}`, {
    source: normalizedSource,
    occurrences: recorded.occurrences,
    metadata: params.metadata,
  });

  return recorded;
}

export function acknowledgeAlert(alertId: string, adminEmail: string, note?: string): PlatformAlert | null {
  return updatePlatformAlertStatus(alertId, "ACKNOWLEDGED", adminEmail);
}

export function resolveAlert(alertId: string, adminEmail: string, note?: string): PlatformAlert | null {
  return updatePlatformAlertStatus(alertId, "RESOLVED", adminEmail);
}

export {
  getPlatformAlerts,
  getPlatformAlerts as getAlerts,
  getPlatformAlertById,
  getOpenAlertsCount,
};
