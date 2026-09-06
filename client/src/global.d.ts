export {};

declare global {
  interface Window {
    __APP_CONFIG__?: { API_BASE_URL?: string; WS_BASE_URL?: string };
  }
}
