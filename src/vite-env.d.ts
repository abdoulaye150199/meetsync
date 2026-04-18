/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare global {
  interface ViewTransition {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition?: () => void;
  }

  interface Document {
    startViewTransition?: (updateCallback: () => void | Promise<void>) => ViewTransition;
  }

  interface GoogleTokenResponse {
    access_token: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  }

  interface GoogleTokenClient {
    requestAccessToken: (options?: { prompt?: GoogleOAuthPrompt }) => void;
  }

  interface GoogleTokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
  }

  type GoogleOAuthPrompt = '' | 'consent' | 'select_account';

  interface GoogleAccountsOAuth2 {
    initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
  }

  interface GoogleAccounts {
    oauth2: GoogleAccountsOAuth2;
  }

  interface GoogleNamespace {
    accounts: GoogleAccounts;
  }

  interface Window {
    google?: GoogleNamespace;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_CHAT_WS_URL?: string;
  readonly VITE_CHAT_MODE?: 'ws' | 'local';
}

export {};
