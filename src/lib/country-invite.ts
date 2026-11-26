import { botCountryLink, openTelegramUrl, telegramShareLink } from './bot-links';
import { formatCountryLabel } from './country-label';

/** Opens Telegram's share sheet with a link that starts the app for the given country. Shared by Settings and the dashboard main button. */
export function openCountryInvite(
  country: string,
  locale: string,
  inviteText: (countryLabel: string) => string,
): void {
  openTelegramUrl(telegramShareLink(botCountryLink(country), inviteText(formatCountryLabel(country, locale))));
}
