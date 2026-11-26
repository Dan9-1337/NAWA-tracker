import { CircleFlag } from 'react-circle-flags';
import { isCountryCode } from '../../shared/countries';
import { GlobeIcon } from './icons';

/** Flag SVGs are static files in `public/flags/` so they load under the production `img-src 'self'` policy. */
export const FLAGS_BASE_URL = '/flags/';

type CountryFlagProps = {
  code: string;
  size?: number;
  className?: string;
};

export function CountryFlag({ code, size = 20, className }: CountryFlagProps) {
  if (!code || !isCountryCode(code)) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)] ${className ?? ''}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <GlobeIcon size={Math.round(size * 0.65)} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <CircleFlag
        cdnUrl={FLAGS_BASE_URL}
        countryCode={code.toLowerCase()}
        height={size}
        width={size}
        alt=""
        title=""
      />
    </span>
  );
}
