const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;

const loadGoogleScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity non disponible.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger Google Identity.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export const GOOGLE_AUTH_SCOPES = ['openid', 'email', 'profile'];

export const requestGoogleProfileAccessToken = async (
  clientId: string,
  scopes: string[] = GOOGLE_AUTH_SCOPES,
  prompt: GoogleOAuthPrompt = 'select_account',
) => {
  await loadGoogleScript();

  return new Promise<GoogleTokenResponse>((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity non disponible.'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      callback: (response: GoogleTokenResponse) => {
        if (!response || response.error) {
          reject(new Error(response?.error_description || response?.error || 'Echec OAuth Google'));
          return;
        }

        resolve(response);
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
};
