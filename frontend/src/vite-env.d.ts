/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_VERSION?: string;
  readonly APP_SUBTITLE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_VERIFICATION_COOKIE_NAME?: string;
  readonly VITE_VERIFICATION_TIMEOUT_MS?: string;
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

