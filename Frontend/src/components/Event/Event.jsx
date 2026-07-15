import "./Event.css";
import { useState, useEffect, useContext } from "react";
import { m } from "framer-motion";
import UserContext from "../../utils/UserContext";
import config from "../../config";
import numeral from "numeral";

export default function Event() {
  const userData = useContext(UserContext);
  const [event, setEvent] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${config.api}/event/active`);
        const data = await res.json();

        if (data.event) {
          setEvent(data.event);
          setLeaderboard(data.leaderboard || []);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
    const interval = setInterval(fetchEvent, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="Event">
        <div className="Loading">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="Event">
        <div className="NoEvent">
          <p>No active event</p>
        </div>
      </div>
    );
  }

  const timeRemaining = new Date(event.endDate) - new Date();
  const minutesRemaining = Math.floor(timeRemaining / 60000);
  const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);

  const getPrizeInfo = (rank) => {
    if (rank === 1) return { amount: event.prizes.first, type: "🐀 Raccoon" };
    if (rank === 2) return { amount: event.prizes.second, type: "🐀 Raccoon" };
    if (rank === 3) return { amount: event.prizes.third, type: "🐀 Raccoon" };
    if (rank >= 4 && rank <= 10) return { amount: event.prizes.other, type: "🦄 Unicorn" };
    return { amount: 0, type: "None" };
  };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="Event"
    >
      <div className="EventContainer">
        <div className="EventHeader">
          <h1>{event.name}</h1>
          <p className="EventDescription">{event.description}</p>
          <div className="EventTimer">
            <p>
              Time Remaining:{" "}
              <span className="Timer">
                {minutesRemaining}m {secondsRemaining}s
              </span>
            </p>
          </div>
        </div>

        <div className="Leaderboard">
          <h2>Leaderboard</h2>
          <div className="LeaderboardTable">
            <div className="LeaderboardHeader">
              <div className="Rank">Rank</div>
              <div className="Username">Player</div>
              <div className="Wagered">Total Wagered</div>
              <div className="Prize">Prize</div>
            </div>
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => {
                const prize = getPrizeInfo(index + 1);
                const isCurrentUser = userData?.username === entry.username;
                return (
                  <m.div
                    key={entry._id}
                    className={`LeaderboardRow ${isCurrentUser ? "CurrentUser" : ""} Rank${index + 1}`}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="Rank">
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index > 2 && `#${index + 1}`}
                    </div>
                    <div className="Username">{entry.username}</div>
                    <div className="Wagered">${numeral(entry.totalWagered).format("0,0")}</div>
                    <div className="Prize">
                      {prize.amount > 0 ? `${prize.amount} ${prize.type}` : "-"}
                    </div>
                  </m.div>
                );
              })
            ) : (
              <div className="NoLeaderboard">
                <p>No participants yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="EventInfo">
          <div className="InfoBox">
            <h3>Prizes</h3>
            <div className="PrizeList">
              <p>🥇 1st Place: {event.prizes.first} 🐀 Raccoons</p>
              <p>🥈 2nd Place: {event.prizes.second} 🐀 Raccoons</p>
              <p>🥉 3rd Place: {event.prizes.third} 🐀 Raccoons</p>
              <p>4th-10th Place: {event.prizes.other} 🦄 Unicorns</p>
            </div>
          </div>
          <div className="InfoBox">
            <h3>Event Stats</h3>
            <div className="StatsList">
              <p>Total Wagered: ${numeral(event.totalWagered).format("0,0")}</p>
              <p>Participants: {leaderboard.length}</p>
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
}
