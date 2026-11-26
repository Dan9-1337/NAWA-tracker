import type { Locale } from '../i18n/types';
import type { ResponseFormInput, ScoreBreakdown } from '../../shared/contracts';
import { getAppVersion } from './app-version';
import { getTelegramUserId, getTelegramWebApp } from './telegram';

export type SupportScreen = 'Dashboard' | 'Settings' | 'Create' | 'Other';

export type SupportContextInput = {
  screen: SupportScreen;
  locale: Locale;
  rankingCountry?: string | null;
  kind: 'help' | 'calculation_error' | 'bug';
  scoreBreakdown?: ScoreBreakdown | null;
  polishSchoolLevel?: ResponseFormInput['polishSchoolLevel'];
  formulaVersion?: string;
};

const SCREEN_LABEL: Record<SupportScreen, string> = {
  Dashboard: 'Dashboard',
  Settings: 'Settings',
  Create: 'Create',
  Other: 'Other',
};

/** Short non-PII support reference derived from Telegram user id. */
export function buildSupportResponseId(telegramUserId: string | null): string {
  if (!telegramUserId) return 'NW-LOCAL';
  let hash = 0;
  for (let i = 0; i < telegramUserId.length; i += 1) {
    hash = (hash * 31 + telegramUserId.charCodeAt(i)) >>> 0;
  }
  return `NW-${hash.toString(16).toUpperCase().slice(0, 5)}`;
}

export function buildSupportMessage(input: SupportContextInput): string {
  const lines = [
    input.kind === 'calculation_error'
      ? 'Possible calculation error in NAWAmeter.'
      : input.kind === 'bug'
        ? 'Bug report for NAWAmeter.'
        : 'Need help with NAWAmeter.',
    '',
    `Screen: ${SCREEN_LABEL[input.screen]}`,
  ];

  if (input.rankingCountry) {
    lines.push(`Country: ${input.rankingCountry}`);
  }

  lines.push(
    `Language: ${input.locale.toUpperCase()}`,
    `Version: ${getAppVersion()}`,
    `Response ID: ${buildSupportResponseId(getTelegramUserId())}`,
  );

  if (input.kind === 'calculation_error' && input.scoreBreakdown) {
    lines.push(
      '',
      'Score breakdown:',
      `gradesScore: ${input.scoreBreakdown.gradesScore}`,
      `polishSchoolBonus: ${input.scoreBreakdown.polishSchoolBonus}`,
      `total: ${input.scoreBreakdown.total}`,
    );
    if (input.polishSchoolLevel) {
      lines.push(`polishSchoolLevel: ${input.polishSchoolLevel}`);
    }
    if (input.formulaVersion) {
      lines.push(`formulaVersion: ${input.formulaVersion}`);
    }
  }

  return lines.join('\n');
}

export function getSupportTelegramUsername(): string {
  return (
    import.meta.env.VITE_SUPPORT_TELEGRAM_USERNAME?.trim() ||
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim() ||
    'nawa_tracker_bot'
  );
}

export function openSupportChat(message: string): void {
  const username = getSupportTelegramUsername();
  const url = `https://t.me/${username}?text=${encodeURIComponent(message)}`;
  const webApp = getTelegramWebApp();

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
