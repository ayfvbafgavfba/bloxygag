/** @format */

const localDevApi = "http://127.0.0.1:3218";
const localDevSocket = "http://127.0.0.1:6565";

function getBaseUrl() {
  if (typeof window === "undefined") {
    return localDevApi;
  }

  const { hostname, port, protocol } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

function getLocalApiUrl() {
  if (typeof window === "undefined") {
    return localDevApi;
  }

  const { hostname, port, protocol } = window.location;
  const isViteDev = port === "5173" || ((hostname === "localhost" || hostname === "127.0.0.1") && port === "5173");

  if (isViteDev) {
    return localDevApi;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

function getLocalSocketUrl() {
  if (typeof window === "undefined") {
    return localDevSocket;
  }

  const { hostname, port, protocol } = window.location;
  const isViteDev = port === "5173" || hostname === "localhost" || hostname === "127.0.0.1";

  if (isViteDev) {
    return localDevSocket;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

const isProduction = import.meta.env.PROD;
const apiOverride = import.meta.env.VITE_API_URL;
const socketOverride = import.meta.env.VITE_SOCKET_URL;
const productionHost = "https://bloxygag.org";

export default {
  api: apiOverride || (isProduction ? productionHost : getLocalApiUrl()),
  socketUrl: socketOverride || (isProduction ? productionHost : getLocalSocketUrl()),
  h_captcha_key: isProduction
    ? "495be111-f6a7-4ca5-9b8f-d0149998a742"
    : "20000000-ffff-ffff-ffff-000000000002",
};
