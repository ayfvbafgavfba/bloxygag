import { useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import "./CryptoDeposit.css";
import {
  ethLogo,
  litecoinLogo,
  logoGradient,
  backArrow,
  arrow,
  regenerate,
} from "../../assets/imageExport";
import { getJWT } from "../../utils/api";
import toast from "react-hot-toast";
import { AnimatePresence, m } from "framer-motion";
import CryptoWithdrawal from "./CryptoWithdrawal";
import Deposit from "./Deposit";
import config from "../../config";
import UserContext from "../../utils/UserContext";

export default function CryptoDepositModal({ closeModal, changeModal }) {
  const [currency, setCurrency] = useState("LTC");
  const [currencyLong, setCurrencyLong] = useState("LITECOIN (LTC)");
  const [isLoading, setIsLoading] = useState(false);
  const [listActive, setListActive] = useState(null);
  const [address, setAddress] = useState("");

  const userData = useContext(UserContext);

  const handleCurrencyListExpand = useCallback(() => {
    if (listActive == true) {
      setListActive(false);
    } else {
      setListActive(true);
    }
  }, [listActive]);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(address);
    toast("Address copied");
  }, [address]);

  const handleModalChange = useCallback(() => {
    changeModal(
      <CryptoWithdrawal closeModal={closeModal} changeModal={changeModal} />
    );
  }, [changeModal, closeModal]);

  const handleCurrencyChange = useCallback(async (currency) => {
    setCurrency(currency);
    switch (currency) {
      case "ETH":
        setCurrencyLong("ETHEREUM (ERC20)");
        break;
      case "LTC":
        setCurrencyLong("LITECOIN (LTC)");
        break;
    }

    if (!getJWT() || !userData) {
      toast.error("Please sign in and connect your Roblox account before depositing.");
      return;
    }

    try {
      const response = await fetch(`${config.api}/apirone/get-address`, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ currency }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.message || "Failed to fetch address";
        toast.error(message);
        return;
      }

      const data = await response.json();
      if (data.success && data.address) {
        setAddress(data.address);
      } else {
        toast.error(data.message || "Failed to fetch address");
      }
    } catch (error) {
      console.error("Address fetch error:", error);
      toast.error("Failed to fetch address. Check console for details.");
    }
  }, [userData]);

  useEffect(() => {
    if (getJWT() && userData) {
      handleCurrencyChange("LTC");
    }
  }, [handleCurrencyChange, userData]);

  const handleAddressRefresh = useCallback(async () => {
    if (!getJWT() || !userData) {
      toast.error("Please sign in and connect your Roblox account before refreshing the address.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${config.api}/apirone/get-address`, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ currency }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.message || "Failed to refresh address";
        toast.error(message);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success && data.address) {
        setAddress(data.address);
      } else {
        toast.error(data.message || "Failed to refresh address");
      }
    } catch (error) {
      console.error("Address refresh error:", error);
      toast.error("Failed to refresh address. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  }, [currency, userData]);

  const getCurrencyLogo = (currency) => {
    switch (currency) {
      case "ETH":
        return ethLogo;
      case "LTC":
        return litecoinLogo;
      default:
        return litecoinLogo;
    }
  };

  const currentCurrencyLogo = getCurrencyLogo(currency);
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ModalBackground"
      onClick={() => closeModal()}
    >
      {isLoading ? (
        <div className="loadingContainer">
          <div className="loading"></div>
        </div>
      ) : (
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="CryptoDepositModal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="Header">
            <div className="Navigation">
              <div className="Nav">
                <img src={logoGradient} alt="bloxpvp logo" />
                <div className="NavLinks">
                  <p className="NavLink Active">Deposit</p>
                  <p className="NavLink Inactive" onClick={handleModalChange}>
                    Withdraw
                  </p>
                </div>
              </div>
              <m.div
                whileHover={{ opacity: 0.7 }}
                className="Navigate"
                onClick={() => {
                  changeModal(
                    <Deposit
                      closeModal={closeModal}
                      changeModal={changeModal}
                    />
                  );
                }}
              >
                <p>Go Back</p>
                <img src={backArrow} alt="" />
              </m.div>
            </div>
            <p>
              Access our <span>marketplace!</span>
            </p>
          </div>
          <div className="Bottom">
            <div className="Interaction">
              <div className="Currency">
                <div className="Header">
                  <p>Currency:</p>
                  <div className="Gradient"></div>
                </div>
                <div
                  className="CurrencyList"
                  onClick={handleCurrencyListExpand}
                >
                  <div className="Currency">
                    <img src={currentCurrencyLogo} alt="cryptocurrency logo" />
                    <p>{currencyLong}</p>
                  </div>
                  <img src={arrow} alt="arrow icon" className="Arrow" />
                  <AnimatePresence>
                    {listActive == true && (
                      <m.div
                        initial={{ scale: 0.95, y: -10, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: -10, opacity: 0 }}
                        transition={{ ease: "easeOut", duration: 0.1 }}
                        className="ListSelection"
                      >
                        <div
                          className={`Option${
                            currency == "ETH" ? " Active" : ""
                          }`}
                          onClick={() => handleCurrencyChange("ETH")}
                        >
                          <img src={ethLogo} alt="ethereum icon" />
                          <p>ETHEREUM (ERC20)</p>
                        </div>
                        <div
                          className={`Option${
                            currency == "LTC" ? " Active" : ""
                          }`}
                          onClick={() => handleCurrencyChange("LTC")}
                        >
                          <img src={litecoinLogo} alt="litecoin icon" />
                          <p>LITECOIN (LTC)</p>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="Address">
                <div className="Header">
                  <p>{currency} Address:</p>
                  <div className="Gradient"></div>
                </div>
                <div className="AddressBox">
                  <img
                    src={regenerate}
                    alt="regeneration icon"
                    className="Regenerate"
                    onClick={handleAddressRefresh}
                  />
                  <p>{address}</p>
                  <div className="Copy" onClick={handleCopyAddress}>
                    <p>Copy Address</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </m.div>
      )}
    </m.div>
  );
}

CryptoDepositModal.propTypes = {
  closeModal: PropTypes.func,
  changeModal: PropTypes.func,
};
