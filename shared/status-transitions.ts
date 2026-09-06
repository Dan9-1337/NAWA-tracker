import { isAllowedStatusTransition } from './status-options';
import { type ApplicationStatus, terminalApplicationStatuses } from './contracts';

const terminalStatusSet = new Set<ApplicationStatus>(terminalApplicationStatuses);

export function isTerminalApplicationStatus(status: ApplicationStatus): boolean {
  return terminalStatusSet.has(status);
}

/**
 * Non-blocking hint used only for client-side warnings. The Supabase update
 * RPC is the source of truth and applies the same rule server-side.
 */
export function isSuspiciousStatusTransition(
  previousStatus: ApplicationStatus,
  nextStatus: ApplicationStatus,
): boolean {
  if (previousStatus === nextStatus) return false;

  if (isTerminalApplicationStatus(previousStatus) && !isTerminalApplicationStatus(nextStatus)) {
    return true;
  }

  if (!isAllowedStatusTransition(previousStatus, nextStatus)) {
    return true;
  }

  return false;
}

export function isBackdatedStatusChange(previousStatusChangedAt: string, nextStatusChangedAt: string): boolean {
  return nextStatusChangedAt < previousStatusChangedAt;
}
