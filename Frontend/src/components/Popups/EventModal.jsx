import { logoGradient } from "../../assets/imageExport";
import PropTypes from "prop-types";
import "./EventModal.css";
import { m } from "framer-motion";

export default function EventModal({ closeModal }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ModalBackground"
      onClick={() => closeModal()}
    >
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="EventModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="Header">
          <img src={logoGradient} alt="BloxyGAG Logo" />
          <h1>EVENT</h1>
        </div>
        <div className="Content">
          <p className="ComingSoon">Coming Soon!</p>
        </div>
      </m.div>
    </m.div>
  );
}

EventModal.propTypes = {
  closeModal: PropTypes.func.isRequired,
};
