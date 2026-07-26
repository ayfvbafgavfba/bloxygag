import "./Profile.css";
import {
  backArrow,
  statistics,
  tippingCash,
  diceGradient,
  coinsGradient,
  coinsDrop,
} from "../../assets/imageExport";
import PropTypes from "prop-types";
import { m } from "framer-motion";
import config from "../../config";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import numeral from "numeral";
import toast from "react-hot-toast";
import { getJWT } from "../../utils/api";
import { resolvePetImage } from "../../utils/image";

export default function Profile({ closeModal, userId }) {
  const [data, setData] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [showInventoryTip, setShowInventoryTip] = useState(false);

  useEffect(() => {
    const profileBody = JSON.stringify({
      userId: userId,
    });

    fetch(`${config.api}/profile`, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      body: profileBody,
      method: "post",
    }).then(async (res) => {
      const info = await res.json();
      if (res.status == 200 || res.status == 304) {
        setData(info);
      }
    });
  }, [userId]);

  useEffect(() => {
    const token = getJWT();
    if (!token) return;

    fetch(`${config.api}/user/inventory`, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "GET",
    })
      .then(async (res) => {
        if (!res.ok) return;
        const info = await res.json();
        if (Array.isArray(info.userItems)) {
          setInventory(info.userItems);
          if (info.userItems.length > 0) {
            setSelectedItemId(info.userItems[0]._id);
          }
        }
      })
      .catch((error) => {
        console.warn("Failed to load inventory:", error);
      });
  }, []);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ModalBackground"
      onClick={() => closeModal()}
    >
      {data ? (
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="Profile"
        >
          <div className="Header">
            <div className="Profile">
              <img
                src={data.thumbnail}
                alt="profile picture"
                width={96}
                height={96}
              />
              <div className="Info">
                <div className="Heading">
                  <p>{data.username}</p>
                  <div className="Level">
                    <p>LVL {numeral(Math.floor(data.level)).format("0,0")}</p>
                  </div>
                </div>
                <div className="Stats">
                  <p className="XP">
                    XP:{" "}
                    <span>
                      {numeral(data.xp).format("0,0")}/
                      {numeral(data.xpMax).format("0,0")}
                    </span>
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={data.xpMax}
                    value={data.xp}
                    id="XPRange"
                    readOnly
                    aria-readonly
                    style={{
                      background: `linear-gradient(to right, #a148ff ${0}%, #D42626 ${
                        (data.xp / data.xpMax) * 100
                      }%, #211936 ${(data.xp / data.xpMax) * 100}%)`,
                      borderRadius: "2px",
                    }}
                  />
                  <p className="JoinDate">
                    Join Date: <span>{format(data.joinDate, "PPPp")}</span>
                  </p>
                </div>
              </div>
              <div className="Navigation" onClick={closeModal}>
                <p>Go Back</p>
                <img src={backArrow} alt="back arrow" />
              </div>
            </div>
          </div>
          <div className="Content">
            <div className="Container">
              <div className="Actions">
                <div className="Header">
                  <p>Actions</p>
                </div>
                <div className="Tip" onClick={() => setShowInventoryTip((value) => !value)}>
                  <img
                    src={tippingCash}
                    width={8}
                    height={8}
                    alt="tipping icon"
                  />
                  <p>{showInventoryTip ? "Hide Inventory" : "Show Inventory"}</p>
                </div>
                {showInventoryTip && (
                  <div className="TipPet" style={{ marginTop: "16px" }}>
                    {inventory.length === 0 ? (
                      <p style={{ marginBottom: "16px" }}>
                        You have no pets available to tip.
                      </p>
                    ) : (
                      <>
                        <div className="InventoryGrid">
                          {inventory.map((pet) => {
                            const itemName = pet.item?.display_name || pet.item?.item_name || pet.item?.name || "Unknown Pet";
                            return (
                              <div
                                key={pet._id}
                                className={`InventoryItem ${selectedItemId === pet._id ? "Selected" : ""}`}
                                onClick={() => setSelectedItemId(pet._id)}
                              >
                                <img
                                  src={resolvePetImage(
                                    pet.item?.item_image,
                                    pet.item?.display_name || pet.item?.item_name || pet.item?.name
                                  )}
                                  alt={itemName}
                                />
                                <div className="Info">
                                  <p>{itemName}</p>
                                  <p className="Value">{numeral(pet.item?.item_value || 0).format("0,0")}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div
                          className="Tip"
                          onClick={async () => {
                            if (!selectedItemId) {
                              toast.error("Select a pet to tip");
                              return;
                            }

                            const selectedItem = inventory.find((pet) => pet._id === selectedItemId);
                            const itemName = selectedItem?.item?.display_name || selectedItem?.item?.item_name || selectedItem?.item?.name || "pet";

                            const confirmTip = window.confirm(
                              `Tip ${itemName} to ${data?.username || "this user"}? This will transfer the pet from your inventory.`
                            );
                            if (!confirmTip) return;

                            try {
                              const body = JSON.stringify({ recipientRobloxId: userId, itemId: selectedItemId });
                              const res = await fetch(`${config.api}/tip`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${getJWT()}`,
                                },
                                body,
                              });

                              if (res.ok) {
                                toast.success("Pet tip sent!");
                                setInventory((current) => current.filter((pet) => pet._id !== selectedItemId));
                                setSelectedItemId("");
                              } else {
                                let msg = "Tip failed";
                                try {
                                  const j = await res.json();
                                  msg = j.message || j.error || msg;
                                } catch (e) {
                                  console.warn("Failed to parse pet tip error response:", e);
                                }
                                toast.error(msg);
                              }
                            } catch (e) {
                              console.error(e);
                              toast.error("Network error sending pet tip");
                            }
                          }}
                        >
                          <img
                            src={tippingCash}
                            width={8}
                            height={8}
                            alt="tipping icon"
                          />
                          <p>TIP PET</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="Statistics">
                <div className="Header">
                  <img src={statistics} alt="statistics icon" />
                  <p>User Statistics</p>
                </div>
                <div className="Boxes">
                  <div className="Box">
                    <div className="Header">
                      <img src={diceGradient} alt="dice icon" />
                      <p>Total Bets</p>
                    </div>
                    <p>{numeral(data.totalBets).format("0,0")}</p>
                  </div>
                  <div className="Box">
                    <div className="Header">
                      <img src={diceGradient} alt="dice icon" />
                      <p>Games Won</p>
                    </div>
                    <p>{numeral(data.gamesWon).format("0,0")}</p>
                  </div>
                  <div className="Box">
                    <div className="Header">
                      <img src={coinsGradient} alt="dice icon" />
                      <p>Total Wagered</p>
                    </div>
                    <p>{numeral(data.wagered).format("0,0")} R$</p>
                  </div>
                  <div className="Box">
                    <div className="Header">
                      <img src={coinsDrop} alt="dice icon" />
                      <p>Net Profit</p>
                    </div>
                    <p>
                      {data.profit > 0 && "+"}
                      {numeral((data.profit * 1000) / 5).format("0,0")} R$
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </m.div>
      ) : (
        <div className="loadingContainer">
          <div className="loading"></div>
        </div>
      )}
    </m.div>
  );
}

Profile.propTypes = {
  closeModal: PropTypes.func,
  userId: PropTypes.string,
};
