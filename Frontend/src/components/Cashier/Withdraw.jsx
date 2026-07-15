import "./Withdraw.css";
import { useState, useCallback, useEffect, useContext } from "react";
import { toast } from "react-hot-toast";
import { getJWT } from "../../utils/api";
import PropTypes from "prop-types";
import SocketContext from "../../utils/SocketContext";
import { plus, purpleRobux, roblox } from "../../assets/imageExport";
import Deposit from "./Deposit";
import { m } from "framer-motion";
import config from "../../config";
import { resolvePetImage } from "../../utils/image";
import { sort } from "fast-sort";
import UserContext from "../../utils/UserContext";
import { isUserBanned } from "../../utils/banUtils";


export default function Withdraw({ closeModal, renderModal }) {
  const [isLoading, setIsLoading] = useState(false);
  const [pets, setPets] = useState([]);
  const [selectedPets, setSelectedPets] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [selectedValue, setSelectedValue] = useState(0);
  const [totalPets, setTotalPets] = useState(0);
  const [depositPopup, setDepositPopup] = useState(false);
  const socket = useContext(SocketContext);
  const userData = useContext(UserContext);
  const banned = isUserBanned(userData?.username);
  let canGiveaway = true;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`${config.api}/user/inventory`, {
      headers: {
        Authorization: `Bearer ${getJWT()}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Inventory request failed");
        const loadedPets = await res.json().catch(() => ({}));
        if (!isMounted) return;
        const inventoryItems = Array.isArray(loadedPets?.userItems) ? loadedPets.userItems : [];
        const sortedPets = sort(inventoryItems).desc((pet) => {
          return Number(pet.item?.item_value ?? 0);
        });
        setPets(sortedPets);
        setTotalValue(Number(loadedPets?.totalValue ?? 0));
        setTotalPets(inventoryItems.length);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPets([]);
        setTotalValue(0);
        setTotalPets(0);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateInventory = useCallback(async () => {
    await fetch(`${config.api}/user/inventory`, {
      headers: {
        Authorization: `Bearer ${getJWT()}`,
      },
    }).then(async (res) => {
      const loadedPets = await res.json();
      setPets(loadedPets.userItems);
      setTotalValue(loadedPets.totalValue);
      setTotalPets(loadedPets.userItems.length);
      setSelectedPets([]);
    });
  }, []);

  const handleWithdrawItems = useCallback(() => {
    if (isUserBanned(userData?.username)) {
      return toast.error("You are banned from withdrawing.");
    }
    if (selectedPets.length < 1) {
      return toast.error("Please make sure you select an item");
    }

    const loadingToast = toast.loading("Withdrawing items...");

    const withdrawalInfo = JSON.stringify({
      chosenItems: selectedPets,
    });

    fetch(`${config.api}/withdraw`, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${getJWT()}`,
      },
      mode: "cors",
      method: "POST",
      body: withdrawalInfo,
    }).then(async (res) => {
      if (res.status != 200) {
        const response = await res.text();
        return toast.error(response.toString(), {
          id: loadingToast,
        });
      }
      const response = await res.json();
      toast.success(
        response.message || "Withdrawal request submitted. The bot will send items to your mail soon.",
        {
          id: loadingToast,
        }
      );
      updateInventory();
    });
  }, [selectedPets, updateInventory]);

  const handleCreateGiveaway = useCallback(() => {
    if (isUserBanned(userData?.username)) {
      return toast.error("You are banned from creating giveaways.");
    }
    if (selectedValue < 1) {
      return toast.error("Please make sure you select an item");
    }

    setIsLoading(true);

    const giveawayInfo = JSON.stringify({
      chosenItem: selectedPets[0],
    });
    fetch(`${config.api}/giveaway/create`, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${getJWT()}`,
      },
      mode: "cors",
      method: "POST",
      body: giveawayInfo,
    }).then(async (res) => {
      const response = await res.text();
      if (res.status != 200) {
        return toast.error(response);
      }
      setIsLoading(false);
      socket.emit("GIVEAWAY_UPDATE");
      toast.success("Giveaway Created");
      setTotalValue(totalValue - Number(selectedPets[0].item.item_value));
      setTotalPets(pets.length);
      setSelectedPets([]);
    });
  }, [pets.length, selectedPets, selectedValue, socket, totalValue]);

  const handleDepositModal = useCallback(() => {
    if (isUserBanned(userData?.username)) {
      return toast.error("You are banned from depositing.");
    }
    setDepositPopup(true);
  }, [userData]);

  const handlePetSelection = useCallback(
    (pet) => {
      const checkSelected = selectedPets.includes(pet);
      if (checkSelected == false) {
        let temp = 0;
        let arr = [...selectedPets, pet];
        arr.forEach((item) => {
          temp += Number(item.item.item_value);
        });
        setSelectedValue(temp);
        setSelectedPets(arr);
        const sortedPets = sort(pets).desc((pet) => {
          pet.item.item_value;
        });
        setPets(sortedPets.filter((currentPet) => currentPet != pet));
      } else if (checkSelected == true) {
        let temp = 0;
        let arr = selectedPets.filter((currentPet) => currentPet != pet);
        arr.forEach((item) => {
          temp += Number(item.item.item_value);
        });
        setSelectedValue(temp);
        setSelectedPets(arr);
        const sortedPets = sort(pets).desc((pet) => {
          return Number(pet.item.item_value);
        });
        setPets([...sortedPets, pet]);
      }
    },
    [selectedPets, pets]
  );

  if (selectedPets.length > 1) {
    canGiveaway = false;
  }

  if (banned) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ModalBackground"
        onClick={() => closeModal()}
      >
        <m.div
          className="WithdrawModal"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="Navbar">
            <div className="Options">
              <input
                type="text"
                className="Search"
                placeholder="Search for an item"
              />
            </div>
            <div className="Interaction">
              <button className="Withdraw Disabled">
                <p>Withdraw</p>
              </button>
            </div>
          </div>
          <div className="BlockedNotice">
            <p>You are banned from withdrawing and creating giveaways.</p>
          </div>
        </m.div>
      </m.div>
    );
  }

  return (
    <>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ModalBackground"
        onClick={() => closeModal()}
      >
        {isLoading && (
          <div className="loadingContainer">
            <div className="loading"></div>
          </div>
        )}
        <m.div
          className="WithdrawModal"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="Navbar">
            <div className="Options">
              <input
                type="text"
                className="Search"
                placeholder="Search for an item"
              />
            </div>
            <div className="Interaction">
              <button
                className={`Giveaway${canGiveaway == true ? "" : " Disabled"}`}
                onClick={() => handleCreateGiveaway()}
              >
                <p>Create Giveaway</p>
              </button>
              <button
                className="Withdraw"
                onClick={() => handleWithdrawItems()}
              >
                <p>Withdraw R${numeral(selectedValue).format("0,0aaa")}</p>
              </button>
            </div>
          </div>
          <div className="Selection">
            <div className="SelectionStatistics">
              <div className="TotalValue">
                <img src={purpleRobux} alt="Total Value" />
                <div className="Text">
                  <p className="Worth">WORTH</p>
                  <p className="Value">{numeral(totalValue).format("0,0")}</p>
                </div>
              </div>
              <div className="TotalItems">
                <img src={roblox} alt="Total Items" />
                <div className="Text">
                  <p className="TheItems">ITEMS</p>
                  <p className="Value">{numeral(totalPets).format("0,0aaa")}</p>
                </div>
              </div>
              <button className="Deposit" onClick={() => handleDepositModal()}>
                <img src={plus} alt="Deposit" />
              </button>
            </div>
            <div className="ItemsDisplay">
              {
                <>
                  {selectedPets.map((pet) => {
                    return (
                      <div
                        key={pet._id}
                        className={`Item Active`}
                        id={pet.name}
                        onClick={() => handlePetSelection(pet)}
                      >
                        <img
                          src={resolvePetImage(pet.item.item_image)}
                          alt=""
                        />
                        <div className="Info">
                          <p>{pet.item.display_name}</p>
                          <p className="Value">
                            {numeral(pet.item.item_value).format("0,0")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {pets.map((pet) => {
                    return (
                      <div
                        key={pet._id}
                        className={`Item`}
                        id={pet.item.item_name}
                        onClick={() => handlePetSelection(pet)}
                      >
                        <img
                          src={resolvePetImage(pet.item.item_image)}
                          alt=""
                        />
                        <div className="Info">
                          <p>{pet.item.display_name}</p>
                          <p className="Value">
                            {numeral(pet.item.item_value).format("0,0")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
              }
            </div>
          </div>
        </m.div>
        {depositPopup == true && (
          <Deposit closeModal={closeModal} changeModal={renderModal} />
        )}
      </m.div>
    </>
  );
}

Withdraw.propTypes = {
  closeModal: PropTypes.func,
  renderModal: PropTypes.func,
};
