/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HR_API_BASE_URL: string;
  /** @deprecated Use VITE_HR_API_BASE_URL */
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AUTH_API_BASE_URL: string;
  readonly VITE_APP_SYSTEM_CODE: string;
  readonly VITE_USE_MOCKS: string;
  readonly VITE_AUTH_MODE: string;
  readonly VITE_AUTH_SERVICE_PROVIDER: string;
  readonly VITE_AUTH_SERVICE_BASE_URL: string;
  readonly VITE_AUTH_SERVICE_LOGIN_URL: string;
  readonly VITE_AUTH_SERVICE_LOGOUT_URL: string;
  readonly VITE_AUTH_SERVICE_CLIENT_ID: string;
  readonly VITE_AUTH_SERVICE_REDIRECT_URI: string;
  /** @deprecated Use VITE_AUTH_SERVICE_BASE_URL */
  readonly VITE_CHAT_AUTH_BASE_URL: string;
  /** @deprecated Use VITE_AUTH_SERVICE_LOGIN_URL */
  readonly VITE_CHAT_AUTH_LOGIN_URL: string;
  /** @deprecated Use VITE_AUTH_SERVICE_LOGOUT_URL */
  readonly VITE_CHAT_AUTH_LOGOUT_URL: string;
  /** @deprecated Use VITE_AUTH_SERVICE_CLIENT_ID */
  readonly VITE_CHAT_AUTH_CLIENT_ID: string;
  /** @deprecated Use VITE_AUTH_SERVICE_REDIRECT_URI */
  readonly VITE_CHAT_AUTH_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
