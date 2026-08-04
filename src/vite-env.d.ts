/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_DEV_INIT_DATA?: string;
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_SUPPORT_TELEGRAM_USERNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
