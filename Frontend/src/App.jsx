import Router from "./router";
import { io } from "socket.io-client";
import SocketContext from "./utils/SocketContext";
import UserContext from "./utils/UserContext";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getJWT, clearJWT } from "./utils/api";
import "./global.css";
import config from "./config";
import ConnectRoblox from "./components/Account/ConnectRoblox";
import { AnimatePresence } from "framer-motion";
import { LazyMotion, domAnimation } from "framer-motion";
import Cookies from "js-cookie";

if (import.meta.env.PROD) {
  console.log(
    "[config] api:",
    config.api,
    "socketUrl:",
    config.socketUrl,
    "VITE_API_URL:",
    import.meta.env.VITE_API_URL,
    "VITE_SOCKET_URL:",
    import.meta.env.VITE_SOCKET_URL
  );
}

// Socket will be initialized after auth is checked to ensure a valid token
// is provided during the Socket.IO handshake.

export default function App() {
  const [userData, setUserData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [socket, setSocket] = useState(null);
  const [ConnectRobloxModal, setModalState] = useState(null);

  const effectiveUserData = userData;

  const handleBalanceUpdate = useCallback(
    (balance) => {
      setUserData({
        ...userData,
        balance: balance,
      });
    },
    [userData]
  );

  useEffect(() => {
    window.localStorage.removeItem("adminImpersonation");
  }, []);

  useEffect(() => {
    const token = getJWT();

    if (!token) {
      setUserData(null);
      setLoadingData(false);
      return;
    }

    fetch(`${config.api}/login-auto`, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if ([401, 403, 404].includes(res.status)) {
            clearJWT();
            setUserData(null);
          }

          throw new Error(
            data?.message || data?.error || "Authentication failed"
          );
        }

        return data;
      })
      .then((data) => {
        if (data && !data.robloxId) {
          setModalState(
            <ConnectRoblox
              closeModal={() => {
                setModalState(null);
              }}
            />
          );
        }

        setUserData(data);
      })
      .catch((err) => {
        console.error("Authentication error:", err);
        setUserData(null);
        toast.error("Authentication failed. Please sign in again.");
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("BALANCE_UPDATE", handleBalanceUpdate);
    return () => {
      socket.off("BALANCE_UPDATE", handleBalanceUpdate);
    };
  }, [handleBalanceUpdate]);

  useEffect(() => {
    // Initialize socket after auth check so the token is available
    if (loadingData) return;
    // Clean up existing socket if any
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    const s = io(config.socketUrl, {
      path: "/socket.io",
      reconnectionDelayMax: 10000,
      auth: {
        token: getJWT(),
      },
      transports: ["polling", "websocket"],
    });

    s.on("connect", () => {
      console.log("[client socket] connect", s.id, "authPresent:", !!getJWT());
    });
    s.on("disconnect", (reason) => {
      console.log("[client socket] disconnect", reason);
    });

    setSocket(s);

    return () => {
      try {
        s.disconnect();
      } catch (e) {}
    };
  }, [loadingData]);

  return (
    <>
      {loadingData && (
        <div className="LoadingScreen">
          <img src="" alt="BloxyGAG Logo" />
        </div>
      )}

      {!loadingData && (
        <SocketContext.Provider value={socket}>
          <UserContext.Provider value={effectiveUserData}>
            <LazyMotion features={domAnimation}>
              <Toaster
                toastOptions={{
                  style: {
                    padding: "16px",
                    color: "#fff",
                    background: "#140f08",
                    border: "1px solid rgba(134,58,255,0.18)",
                    boxShadow: "0 16px 30px rgba(134,58,255,0.18)",
                  },
                  iconTheme: {
                    primary: "#9b50ff",
                    secondary: "#fff",
                  },
                }}
              />
              <AnimatePresence>
                {ConnectRobloxModal && ConnectRobloxModal}
              </AnimatePresence>
              <Router />
            </LazyMotion>
          </UserContext.Provider>
        </SocketContext.Provider>
      )}
    </>
  );
}

