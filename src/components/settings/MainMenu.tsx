import type { ResponseFormInput } from '../../../shared/contracts';
import { useI18n } from '../../i18n/context';
import { botSubscribeLink, openTelegramUrl } from '../../lib/bot-links';
import { openCountryInvite } from '../../lib/country-invite';
import { trackProductEvent } from '../../lib/product-events';
import type { ThemePreference } from '../../lib/theme';
import { ChatIcon, DocumentIcon, GlobeIcon, InfoIcon, PaletteIcon, ShieldIcon, UserEditIcon, UsersIcon } from '../icons';
import { SettingsMenuGroup, SettingsMenuRow } from './SettingsMenu';
import type { SettingsView } from './settings-view';

type MainMenuProps = {
  current: ResponseFormInput | null;
  themePreference: ThemePreference;
  onNavigate: (view: SettingsView) => void;
  onEditProfile?: () => void;
  onClose: () => void;
};

export function MainMenu({ current, themePreference, onNavigate, onEditProfile, onClose }: MainMenuProps) {
  const { t, locale } = useI18n();

  return (
    <div className="mt-5 space-y-3">
      <SettingsMenuGroup>
        {onEditProfile ? (
          <SettingsMenuRow
            label={t.settings.editProfile}
            icon={<UserEditIcon size={17} />}
            onClick={() => {
              onClose();
              onEditProfile();
            }}
          />
        ) : null}
        {current ? (
          <SettingsMenuRow
            label={t.settings.viewData}
            icon={<DocumentIcon size={17} />}
            onClick={() => onNavigate('data')}
          />
        ) : null}
        <SettingsMenuRow
          label={t.settings.privacyPolicy}
          icon={<ShieldIcon size={17} />}
          onClick={() => onNavigate('privacy')}
        />
        <SettingsMenuRow
          label={t.settings.language}
          value={t.language[locale]}
          icon={<GlobeIcon size={17} />}
          onClick={() => onNavigate('language')}
        />
        <SettingsMenuRow
          label={t.settings.appearance}
          value={themePreference === 'dark' ? t.theme.dark : t.theme.light}
          icon={<PaletteIcon size={17} />}
          onClick={() => onNavigate('appearance')}
        />
      </SettingsMenuGroup>

      <SettingsMenuGroup>
        <SettingsMenuRow
          label={t.settings.reminders}
          icon={<ChatIcon size={17} />}
          onClick={() => {
            void trackProductEvent({ name: 'reminders_link_opened' });
            openTelegramUrl(botSubscribeLink());
          }}
        />
        {current ? (
          <SettingsMenuRow
            label={t.settings.invite}
            icon={<UsersIcon size={17} />}
            onClick={() => {
              void trackProductEvent({ name: 'invite_link_opened' });
              openCountryInvite(current.rankingCountry, locale, t.settings.inviteText);
            }}
          />
        ) : null}
      </SettingsMenuGroup>

      <SettingsMenuGroup>
        <SettingsMenuRow label={t.settings.help} icon={<ChatIcon size={17} />} onClick={() => onNavigate('help')} />
        <SettingsMenuRow label={t.about.title} icon={<InfoIcon size={17} />} onClick={() => onNavigate('about')} />
      </SettingsMenuGroup>
    </div>
  );
}
