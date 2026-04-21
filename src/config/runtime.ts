const DEFAULT_DEV_API_URL = 'http://localhost:3000/api';
const DEFAULT_PROD_API_URL = 'https://meetsyncback.onrender.com/api';

const getBrowserOrigin = () => {
  if (typeof window === 'undefined') return null;
  return window.location.origin;
};

const isLocalOrigin = (origin: string | null) =>
  origin === null ||
  origin.includes('localhost') ||
  origin.includes('127.0.0.1');

export const getApiBaseUrl = () => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) return envApiUrl;

  const browserOrigin = getBrowserOrigin();
  return isLocalOrigin(browserOrigin) ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL;
};

export const getHttpOrigin = () => {
  const envSocketUrl = import.meta.env.VITE_CHAT_SOCKET_URL;
  if (envSocketUrl) return envSocketUrl;

  return getApiBaseUrl().replace(/\/api\/?$/, '');
};

export const getRealtimeSocketUrl = () => {
  const browserOrigin = getBrowserOrigin();
  const baseUrl = new URL(getApiBaseUrl(), browserOrigin ?? DEFAULT_DEV_API_URL);
  const httpOrigin = baseUrl.href.replace(/\/api\/?$/, '/');
  const parsedBaseUrl = new URL(httpOrigin);
  const protocol = parsedBaseUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  return `${protocol}//${parsedBaseUrl.host}/ws/transcription`;
};
