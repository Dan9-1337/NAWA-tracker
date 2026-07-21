/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_DEV_INIT_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
