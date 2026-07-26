/** @format */

const localDevApi = "http://127.0.0.1:3218";
const localDevSocket = "http://127.0.0.1:6565";

function getLocalApiUrl() {
  if (typeof window === "undefined") {
    return localDevApi;
  }

  const { hostname, port, protocol } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocalHost) {
    // When running Vite locally, backend is on the local development port.
    // When serving a built app from the local backend on localhost, use the same origin.
    if (port === "5173") {
      return localDevApi;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

function getLocalSocketUrl() {
  if (typeof window === "undefined") {
    return localDevSocket;
  }

  const { hostname, port, protocol } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocalHost) {
    if (port === "5173") {
      return localDevSocket;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

const isProduction = import.meta.env.PROD;
const apiOverride = import.meta.env.VITE_API_URL;
const socketOverride = import.meta.env.VITE_SOCKET_URL;

function getProductionApiUrl() {
  return apiOverride || "https://bloxygag-backend.onrender.com";
}

function getProductionSocketUrl() {
  return socketOverride || "https://bloxygag-backend.onrender.com";
}

export default {
  api: apiOverride || (isProduction ? getProductionApiUrl() : getLocalApiUrl()),
  socketUrl: socketOverride || (isProduction ? getProductionSocketUrl() : getLocalSocketUrl()),
  h_captcha_key: isProduction
    ? "495be111-f6a7-4ca5-9b8f-d0149998a742"
    : "20000000-ffff-ffff-ffff-000000000002",
};
