import PropTypes from "prop-types";
import "./MM2Deposit.css";
import { logoGradient, backArrow } from "../../assets/imageExport";
import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { toast } from "react-hot-toast";
import config from "../../config";

export default function MM2DepositModal({ closeModal, changeModal }) {
  const [bots, setBots] = useState([]);

  useEffect(() => {
    fetch(`${config.api}/cashier/bots/gag2`, {
      method: "GET",
    })
      .then(async (req) => {
        if (req.status == 200) {
          const json = await req.json();
          const foundBots = Array.isArray(json)
            ? json
            : Array.isArray(json?.bots)
            ? json.bots
            : [];
          setBots(foundBots);
          return;
        }
        console.error("Error retrieving GAG2 bots");
      })
      .catch((error) => {
        console.error("Fetch error retrieving GAG2 bots:", error);
      });
  }, []);

  const copyUsername = (username) => {
    navigator.clipboard.writeText(username);
    toast.success(`Copied ${username}`);
  };

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
        className="MM2Modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="Nav">
          <div className="Title">
            <img src={logoGradient} alt="bloxpvp logo" />
            <p>Bot Deposits</p>
          </div>
          <m.div
            whileHover={{ opacity: 0.7 }}
            className="Navigate"
            onClick={changeModal}
          >
            <p>Go Back</p>
            <img src={backArrow} alt="" />
          </m.div>
        </div>
        <div className="Instructions">
          <h3>GAG2 Deposit Instructions</h3>
          <p>
            Mail your items to the bot accounts listed below. Green means online,
            red means offline.
          </p>
        </div>
        <div className="Content">
          <div className="BotsContainer">
            <div className="Bots">
              {bots.length === 0 && (
                <div className="EmptyState">
                  <p>No bot data found yet.</p>
                  <p>Try again once the bot is online.</p>
                </div>
              )}
              {bots.map((bot, index) => {
                const username = bot.username || `bloxygagbot${index + 1}`;
                const status = bot.status === "Online" ? "Online" : "Offline";
                return (
                  <div key={bot._id || username} className="Bot">
                    <div className="Info">
                      <img src={bot.thumbnail || ""} alt="" className="Pfp" />
                      <div className="Meta">
                        <p className="Name">{username}</p>
                        <div className="Actions">
                          <button
                            type="button"
                            className="CopyButton"
                            onClick={() => copyUsername(username)}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className={status}>
                        <div className={status}></div>
                      </div>
                    </div>
                    <div className="BotHint">
                      <p>
                        Mail your item(s) to <strong>{username}</strong> and the
                        bot will deposit them to the site.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </m.div>
    </m.div>
  );
}

MM2DepositModal.propTypes = {
  closeModal: PropTypes.func,
  changeModal: PropTypes.func,
};
