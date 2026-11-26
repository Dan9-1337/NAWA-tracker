/** Injected at build time from package.json via vite.config.ts. */
declare const __APP_VERSION__: string | undefined;

export function getAppVersion(): string {
  if (typeof __APP_VERSION__ === 'string' && __APP_VERSION__.length > 0) {
    return __APP_VERSION__;
  }
  return '0.9.0';
}
