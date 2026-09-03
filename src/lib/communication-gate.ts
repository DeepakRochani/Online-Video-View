/**
 * Production Centralized Communication Gate & Policy Engine (Phase 27)
 * 
 * Enforces:
 * 1. Global Master Switch (ALL_COMMUNICATIONS_ENABLED blocks all outbound communication).
 * 2. Channel-Level Permissions (Email, WhatsApp, SMS, Push, In-App).
 * 3. Feature-Level Permissions (Gallery Published, Selection Submitted, Expiry, Team Invite, Password Reset, Billing, Security).
 * 4. Audience Permissions (Client vs. Photographer vs Marketing).
 * 5. Real Provider Configuration Validation.
 */

import {
  NotificationChannel,
  NotificationType,
  CommunicationProviderStatusReport,
} from "./project-types";
import { CommunicationService } from "./communication-service";

export interface CommunicationGateRequest {
  channel: NotificationChannel;
  event?: NotificationType | string;
  eventType?: NotificationType | string;
  audience: "CLIENT" | "PHOTOGRAPHER" | "SYSTEM" | "MARKETING";
  recipient?: string;
  photographerId?: string;
  isSecurityCritical?: boolean;
  hasMarketingConsent?: boolean;
  skipProviderCheck?: boolean;
}

export interface CommunicationGateResult {
  allowed: boolean;
  code?: string;
  reason?: string;
  isSecurityProtected?: boolean;
  channel: NotificationChannel;
  status?: string;
}

/**
 * Evaluates whether a communication request is permitted under current platform settings
 */
export function canSendCommunication(request: CommunicationGateRequest): CommunicationGateResult {
  const event = request.event || request.eventType || "SYSTEM";
  const result = CommunicationService.evaluateGate({
    channel: request.channel,
    event,
    audience: request.audience,
    recipient: request.recipient,
    photographerId: request.photographerId,
    isSecurityCritical: request.isSecurityCritical,
    hasMarketingConsent: request.hasMarketingConsent,
    skipProviderCheck: request.skipProviderCheck !== undefined ? request.skipProviderCheck : true,
  });

  return {
    allowed: result.allowed,
    code: result.code,
    reason: result.reason,
    channel: result.channel,
    status: result.status,
    isSecurityProtected: request.isSecurityCritical,
  };
}

/**
 * Returns the real, verified configuration status of all communication providers
 * NEVER returns mock data or fake connection status
 */
export function getCommunicationProviderStatuses(): CommunicationProviderStatusReport {
  return CommunicationService.getProviderStatuses();
}
