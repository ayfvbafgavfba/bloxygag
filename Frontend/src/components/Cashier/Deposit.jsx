import { useState, useContext, useEffect } from "react";
import { toast } from "react-hot-toast";
import PropTypes from "prop-types";
import { briefcase, Gag2Deposit, CryptoDeposit } from "../../assets/imageExport";
import "./Deposit.css";
import MM2DepositModal from "./MM2Deposit";
import CryptoDepositModal from "./CryptoDeposit";
import { m } from "framer-motion";
import UserContext from "../../utils/UserContext";
import { isUserBanned } from "../../utils/banUtils";
import { getJWT } from "../../utils/api";
import config from "../../config";

export default function Deposit({ closeModal, changeModal }) {
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeemMessage, setRedeemMessage] = useState("");
  const userData = useContext(UserContext);
  const banned = isUserBanned(userData?.username);

  useEffect(() => {
    setRedeemMessage("");
  }, [userData?.username]);

  const handleRedeemCode = async () => {
    if (!promoCode.trim()) {
      return toast.error("Enter a promo code first.");
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${config.api}/promo-codes/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ code: promoCode.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to redeem code.");
      }

      setRedeemMessage(`Redeemed ${data.promo?.code} successfully. ${data.promo?.usesRemaining} use(s) left.`);
      toast.success("Promo code redeemed.");
      setPromoCode("");
    } catch (error) {
      setRedeemMessage(error.message || "Unable to redeem code.");
      toast.error(error.message || "Unable to redeem code.");
    } finally {
      setIsLoading(false);
    }
  };

  if (banned) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ModalBackground"
        onClick={closeModal}
      >
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="DepositModal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="Header">
            <img src={briefcase} alt="Header Image" />
            <p>Deposit</p>
            <div className="Gradient"></div>
          </div>
          <div className="BlockedNotice">
            <p>You are banned from depositing.</p>
          </div>
        </m.div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ModalBackground"
      onClick={closeModal}
    >
      {isLoading && (
        <div className="loadingContainer">
          <div className="loading"></div>
        </div>
      )}
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="DepositModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="Header">
          <img src={briefcase} alt="Header Image" />
          <p>Deposit</p>
          <div className="Gradient"></div>
        </div>
        <div className="Methods">
          <div className="MethodCard">
            <m.img
              whileHover={{ opacity: 0.7 }}
              whileTap={{ scale: 0.95 }}
              src={Gag2Deposit}
              alt="GAG2 Deposit"
              onClick={() =>
                changeModal(
                  <MM2DepositModal
                    closeModal={closeModal}
                    changeModal={() =>
                      changeModal(
                        <Deposit
                          closeModal={closeModal}
                          changeModal={changeModal}
                        />
                      )
                    }
                  />
                )
              }
            />
          </div>
          <div className="MethodCard">
            <m.img
              whileHover={{ opacity: 0.7 }}
              whileTap={{ scale: 0.95 }}
              src={CryptoDeposit}
              alt=""
              onClick={() =>
                changeModal(
                  <CryptoDepositModal
                    closeModal={closeModal}
                    changeModal={changeModal}
                  />
                )
              }
            />
          </div>
        </div>
        <div className="RedeemSection">
          <div className="RedeemCard">
            <h3>Redeem Code</h3>
            <p>Enter a promo code to redeem balance or rewards.</p>
            <div className="RedeemInputRow">
              <input
                type="text"
                placeholder="Promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button onClick={handleRedeemCode}>Redeem</button>
            </div>
            {redeemMessage && <p className="RedeemMessage">{redeemMessage}</p>}
          </div>
        </div>
      </m.div>
    </m.div>
  );
}

Deposit.propTypes = {
  closeModal: PropTypes.func,
  changeModal: PropTypes.func,
};
