import type { ResponseFormInput } from '../../../shared/contracts';
import { getScoreBreakdown, NAWA_SCORE_FORMULA_VERSION } from '../../../shared/nawa-score';
import { useI18n } from '../../i18n/context';
import { buildSupportMessage, openSupportChat } from '../../lib/support-context';
import { ChatIcon, DocumentIcon, ShieldIcon } from '../icons';
import { SettingsMenuGroup, SettingsMenuRow } from './SettingsMenu';

type SupportKind = 'help' | 'calculation_error' | 'bug';

export function HelpView({ current }: { current: ResponseFormInput | null }) {
  const { t, locale } = useI18n();

  const openSupport = (kind: SupportKind) => {
    const scoreBreakdown =
      kind === 'calculation_error' && current?.scholarshipTrack === 'nawa_director'
        ? getScoreBreakdown(
            current.averageGrade,
            current.maximumGrade,
            current.polishSchoolLevel ?? 'none',
            current.rankingCountry,
            current.applicantKind,
          )
        : null;

    openSupportChat(
      buildSupportMessage({
        screen: current ? 'Dashboard' : 'Settings',
        locale,
        rankingCountry: current?.rankingCountry ?? null,
        kind,
        scoreBreakdown,
        polishSchoolLevel: current?.polishSchoolLevel,
        formulaVersion: NAWA_SCORE_FORMULA_VERSION,
      }),
    );
  };

  return (
    <div className="mt-5 space-y-3">
      <SettingsMenuGroup>
        <SettingsMenuRow label={t.support.general} icon={<ChatIcon size={17} />} onClick={() => openSupport('help')} />
        <SettingsMenuRow
          label={t.support.calculationError}
          icon={<DocumentIcon size={17} />}
          onClick={() => openSupport('calculation_error')}
        />
        <SettingsMenuRow label={t.support.reportBug} icon={<ShieldIcon size={17} />} onClick={() => openSupport('bug')} />
      </SettingsMenuGroup>
      <p className="px-1 text-xs leading-5 text-[var(--text-helper)]">{t.support.hint}</p>
    </div>
  );
}
