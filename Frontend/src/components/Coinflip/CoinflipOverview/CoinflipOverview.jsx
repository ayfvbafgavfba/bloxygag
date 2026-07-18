import "./CoinflipOverview.css";
import { heads, tails, anonymous, eye } from "../../../assets/imageExport";
import PropTypes from "prop-types";
import { useState, useCallback, useContext } from "react";
import CoinflipJoining from "../CoinflipJoining/CoinflipJoining";
import numeral from "numeral";
import UserContext from "../../../utils/UserContext";
import { isUserBanned } from "../../../utils/banUtils";
import CoinflipView from "../CoinflipView/CoinflipView";
import Profile from "../../Popups/Profile";
import { getJWT } from "../../../utils/api";
import config from "../../../config";
import { resolvePetImage } from "../../../utils/image";
import toast from "react-hot-toast";

export default function CoinflipOverview({ Information, renderModal }) {
  const playerOneItems = Information.playerOne.items;
  const playerTwoItems = Information.playerTwo && Information.playerTwo.items;
  const jointItems = Information.playerTwo
    ? [...playerOneItems, ...playerTwoItems]
    : [...playerOneItems];
  const toRender = jointItems.slice(0, 4);
  const userData = useContext(UserContext);
  const [canceling, setCanceling] = useState(false);

  const handleJoinGame = useCallback(() => {
    if (userData != null) {
      if (isUserBanned(userData.username)) {
        return toast.error("You are banned from joining Coinflip games.");
      }
      if (Information.playerOne.username != userData.username) {
        renderModal(
          <CoinflipJoining
            Information={Information}
            renderModal={renderModal}
            closeModal={() => renderModal(null)}
          ></CoinflipJoining>
        );
      }
    }
  }, [Information, renderModal, userData]);

  const handleCancelGame = async () => {
    setCanceling(true);
    try {
      const res = await fetch(`${config.api}/coinflip/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getJWT()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: Information._id }),
      });
      const text = await res.text();
      if (!res.ok) {
        toast.error(text || "Failed to cancel coinflip");
      } else {
        toast.success("Coinflip cancelled");
        renderModal(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel coinflip");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="Overview">
      <div className="Players">
        <div
          className="PlayerOne Player"
          onClick={() => {
            renderModal(
              <Profile
                closeModal={() => renderModal(null)}
                userId={Information.playerOne.robloxId}
              />
            );
          }}
        >
          <img
            src={Information.ownerCoin == "heads" ? heads : tails}
            className="Coin"
            alt="Player One Coin"
          />
          <img
            src={`${Information.playerOne.thumbnail}`}
            className={`Avatar${
              Information.winnerCoin == Information.ownerCoin
                ? " WinnerStroke"
                : ""
            }`}
            alt="Player One"
          />
        </div>
        <p>VS</p>
        <div
          className="PlayerTwo Player"
          onClick={() => {
            Information?.playerTwo &&
              renderModal(
                <Profile
                  closeModal={() => renderModal(null)}
                  userId={Information?.playerTwo.robloxId}
                />
              );
          }}
        >
          <img
            src={Information.ownerCoin == "heads" ? tails : heads}
            className="Coin"
            alt="Player Two Coin"
          />
          <img
            src={
              Information.playerTwo == null
                ? anonymous
                : Information.playerTwo.thumbnail
            }
            className={`Anonymous Avatar${
              Information.winnerCoin != Information.ownerCoin &&
              Information.winnerCoin != null
                ? " WinnerStroke"
                : ""
            }`}
            alt=""
          />
        </div>
      </div>
      <div
        className={`WinningCoin${
          Information.winnerCoin == "heads"
            ? " Heads"
            : Information.winnerCoin == "tails"
            ? " Tails"
            : ""
        }`}
      ></div>
      <div className="Items">
        {toRender.map((item) => {
          if (item) {
            return (
              <div
                className={`${
                  Information.game == "PS99" ? "PS99" : "imageContainer"
                }`}
                key={item._id + Math.random()}
              >
                <img
                  src={resolvePetImage(
                    item.item.item_image,
                    item.item.display_name || item.item.item_name || item.item.name
                  )}
                  className="foregroundImage"
                  alt="Item"
                />
                <img
                  src={resolvePetImage(
                    item.item.item_image,
                    item.item.display_name || item.item.item_name || item.item.name
                  )}
                  className="backgroundImage"
                  alt="Item"
                />
              </div>
            );
          }
        })}
        {jointItems.length > 4 && (
          <div
            className="Extra"
            onClick={() =>
              renderModal(
                <CoinflipView
                  Information={Information}
                  renderModal={renderModal}
                  closeModal={() => renderModal(null)}
                />
              )
            }
          >
            <p>+{jointItems.length - 4}</p>
          </div>
        )}
      </div>
      <div className="Value">
        <p className="Value">{numeral(Information.value).format("0,0")} R$</p>
        <p className="ValueRange">{`(${numeral(
          Information.requirements.min
        ).format("0,0.aaa")} - ${numeral(Information.requirements.max).format(
          "0,0.aaa"
        )})`}</p>
      </div>
      <div className="Interact">
        {Information.winnerCoin == null &&
        Information.playerOne.username !=
          (userData ? userData.username : "") ? (
          <button className="Join" onClick={() => handleJoinGame()}>
            Join
          </button>
        ) : (
          <>
            <div
              className="View Eye"
              onClick={() =>
                renderModal(
                  <CoinflipView
                    Information={Information}
                    renderModal={renderModal}
                    closeModal={() => renderModal(null)}
                  />
                )
              }
            >
              <img src={eye} alt="" />
            </div>
            {Information.winnerCoin == null &&
              Information.playerOne.username ===
                (userData ? userData.username : "") &&
              (!Information.playerTwo || !Information.playerTwo.username) && (
                <button
                  className="Cancel"
                  disabled={canceling}
                  onClick={handleCancelGame}
                >
                  {canceling ? "Cancelling..." : "Cancel"}
                </button>
              )}
          </>
        )}
      </div>
    </div>
  );
}

CoinflipOverview.propTypes = {
  Information: PropTypes.object,
  renderModal: PropTypes.func,
};
