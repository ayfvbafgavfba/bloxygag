import "./CoinflipJoining.css";
import { useState, useCallback, useEffect, useContext } from "react";
import { toast } from "react-hot-toast";
import { getJWT } from "../../../utils/api";
import PropTypes from "prop-types";
import SocketContext from "../../../utils/SocketContext";
import numeral from "numeral";
import UserContext from "../../../utils/UserContext";
import { isUserBanned } from "../../../utils/banUtils";
import CoinflipViewing from "../CoinflipView/CoinflipView";
import { m } from "framer-motion";
import config from "../../../config";
import { resolvePetImage } from "../../../utils/image";
import { sort } from "fast-sort";


export default function CoinflipJoining({
  Information,
  renderModal,
  closeModal,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [pets, setPets] = useState([]);
  const [selectedPets, setSelectedPets] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [selectedValue, setSelectedValue] = useState(0);
  const socket = useContext(SocketContext);
  const userData = useContext(UserContext);

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
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPets([]);
        setTotalValue(0);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const autoSelectPets = useCallback(() => {
    if (!pets || pets.length === 0) {
      return toast.error("No items available for auto selection");
    }

    const sortedItems = [...pets].sort(
      (a, b) => Number(b.item?.item_value || 0) - Number(a.item?.item_value || 0)
    );
    const minValue = Number(Information.requirements.min || 0);
    const maxValue = Number(Information.requirements.max || Infinity);

    let selection = [];
    let sum = 0;

    for (const pet of sortedItems) {
      const value = Number(pet.item?.item_value || 0);
      if (sum + value > maxValue) {
        continue;
      }
      selection.push(pet);
      sum += value;
      if (sum >= minValue) {
        break;
      }
    }

    if (sum < minValue) {
      const ascending = [...sortedItems].reverse();
      selection = [];
      sum = 0;
      for (const pet of ascending) {
        const value = Number(pet.item?.item_value || 0);
        if (sum + value > maxValue) {
          continue;
        }
        selection.push(pet);
        sum += value;
        if (sum >= minValue) {
          break;
        }
      }
    }

    if (sum < minValue) {
      return toast.error("Unable to auto-select a valid item set. Please choose manually.");
    }

    setSelectedPets(selection);
    setSelectedValue(sum);
    setPets(pets.filter((pet) => !selection.includes(pet)));
  }, [Information.requirements.max, Information.requirements.min, pets]);

  const handleCoinflipJoin = useCallback(
    async (e) => {
      e.preventDefault();
      if (isUserBanned(userData?.username)) {
        setIsLoading(false);
        return toast.error("You are banned from joining Coinflip games.");
      }
      if (selectedValue < 1) {
        return toast.error("Please make sure you select an item");
      }
      setIsLoading(true);
      const gameInfo = JSON.stringify({
        chosenItems: selectedPets,
        id: Information._id,
      });
      try {
        const res = await fetch(`${config.api}/coinflip/join`, {
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Authorization: `Bearer ${getJWT()}`,
          },
          mode: "cors",
          method: "POST",
          body: gameInfo,
        });

        if (res.status === 422) {
          const message = await res.text();
          return toast.error(message || "One of your selected items does not exist");
        }

        if (!res.ok) {
          const message = await res.text();
          return toast.error(message || `Failed to join coinflip (${res.status})`);
        }

        const data = await res.json();
        closeModal();
        setTimeout(() => {
          renderModal(
            <CoinflipViewing Information={data} closeModal={closeModal} />
          );
        }, 500);
        toast.success("Game Joined");
      } catch (error) {
        console.error("Coinflip join failed:", error);
        toast.error("Unable to join coinflip. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedValue, selectedPets, closeModal, Information, renderModal, userData]
  );

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
        const sortedPets = sort(pets).desc((pet) => Number(pet.item.item_value));
        setPets(sortedPets.filter((currentPet) => currentPet != pet));
      } else if (checkSelected == true) {
        let temp = 0;
        let arr = selectedPets.filter((currentPet) => currentPet != pet);
        arr.forEach((item) => {
          temp += Number(item.item.item_value);
        });
        setSelectedValue(temp);
        setSelectedPets(arr);
        const sortedPets = sort(pets).desc((pet) => Number(pet.item.item_value));
        setPets([...sortedPets, pet]);
      }
    },
    [selectedPets, pets]
  );

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
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="JoiningModal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="Navbar">
            <div className="Options">
              <input
                type="text"
                className="Search"
                placeholder="Search for an item"
              />
              <div className="SelectWrapper">
                <select name="SortItems">
                  <option value="HighToLow">Highest To Lowest</option>
                  <option value="LowToHigh">Lowest To Highest</option>
                </select>
              </div>
            </div>
            <div className="Creation">
              <form action="" onSubmit={(e) => handleCoinflipJoin(e)}>
                <div className="Coins">
                  <input
                    type="radio"
                    disabled
                    className={`Tails ${
                      Information.ownerCoin != "tails" && "Selected"
                    }`}
                    value="tails"
                    name="coin"
                  />
                  <input
                    type="radio"
                    disabled
                    className={`Heads ${
                      Information.ownerCoin != "heads" && "Selected"
                    }`}
                    value="heads"
                    name="coin"
                  />
                </div>
                <div className="JoinActions">
                  <button
                    type="button"
                    className="AutoSelectButton"
                    onClick={autoSelectPets}
                  >
                    Auto Select
                  </button>
                  <button
                    type="submit"
                    className={`${
                      selectedValue >= Information.requirements.min &&
                      selectedValue <= Information.requirements.max
                        ? ""
                        : "Disabled"
                    }`}
                  >
                    Join Game
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="SelectionStats">
            <p className="Range">
              <span>
                R${numeral(Information.requirements.min).format("0,0")}
              </span>{" "}
              -{" "}
              <span>
                R${numeral(Information.requirements.max).format("0,0")}
              </span>
            </p>
            <p className="TotalValue">
              Total Value: <span>{numeral(totalValue).format("0,0")}</span>
            </p>
            <p className="SelectedValue">
              Total Value Selected:{" "}
              <span>{numeral(selectedValue).format("0,0")}</span>
            </p>
          </div>
          <div className="Selection">
            <div className="Items">
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
      </m.div>
    </>
  );
}

CoinflipJoining.propTypes = {
  closeModal: PropTypes.func,
  renderModal: PropTypes.func,
  Information: PropTypes.object,
};
