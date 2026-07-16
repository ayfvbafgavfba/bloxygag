  import "./Login.css";
  import PropTypes from "prop-types";
  import { longLogo, copy } from "../../assets/imageExport";
  import { useCallback, useEffect, useState } from "react";
  import { toast } from "react-hot-toast";
  import { m } from "framer-motion";
  import config from "../../config";
  import { getJWT, setJWT } from "../../utils/api";

  export default function ConnectRoblox({ closeModal }) {
    const [step, setStep] = useState(1);
    const [descriptionCode, setDescriptionCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState("");
    const { search } = window.location;

    const handleLoginSubmit = useCallback(
      async (e) => {
        e.preventDefault();
        setIsLoading(true);
        if (step === 1) {
          const urlParams = new URLSearchParams(search);
          const sendUsername = (document.querySelector('input[name="RobloxName"]')?.value || username || '').trim();
          await fetch(`${config.api}/connect-roblox`, {
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              Authorization: `Bearer ${getJWT()}`,
            },
            mode: "cors",
            method: "POST",
            credentials: 'include',
            body: JSON.stringify({
              username: sendUsername,
              referrer: urlParams.get("referrer"),
            }),
          }).then(async (res) => {
            if (res.status === 200) {
              setDescriptionCode(await res.text());
              setStep(2);
            } else {
              const text = await res.text();
              try {
                const data = JSON.parse(text);
                if (data?.errors) {
                  data.errors?.forEach((err) => {
                    toast.error(err.msg);
                  });
                } else if (data?.message) {
                  toast.error(data?.message);
                } else {
                  toast.error(text || `Error: ${res.status}`);
                }
              } catch {
                toast.error(text || `Error: ${res.status}`);
              }
            }
          });
          setIsLoading(false);
        } else {
          const sendUsername = (document.querySelector('input[name="RobloxName"]')?.value || username || '').trim();
          const usernameBody = JSON.stringify({
            username: sendUsername,
          });
          await fetch(`${config.api}/connect-roblox`, {
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              Authorization: `Bearer ${getJWT()}`,
            },
            mode: "cors",
            method: "POST",
            credentials: 'include',
            body: usernameBody,
          }).then(async (res) => {
            if (res.status === 400) {
              closeModal();
              return toast.error("Description does not match");
            } else if (res.status === 200) {
              const data = await res.text();
              if (data && data.split(".").length === 3) {
                closeModal();
                setJWT(data);
                toast("Login Successful");
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                toast.error("Login failed. Please try again.");
              }
            } else {
              const text = await res.text();
              toast.error(text || `Error: ${res.status}`);
            }
          });
          setIsLoading(false);
        }
      },
      [step, username, search, closeModal]
    );

    const handleCopyCode = useCallback(() => {
      navigator.clipboard.writeText(descriptionCode);
      toast("Code copied");
    }, [descriptionCode]);

    return (
      <>
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
            className="LoginModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="Art">
              <img src={longLogo} alt="BloxyGAG Logo" className="Logo" />
              <h1>THE MOST REWARDING AND INNOVATIVE GROW A GARDEN 2 CASINO</h1>
              <p className="ArtFooter">
                By signing in you confirm that you are 18 years of age or over, of
                sound mind capable of taking responsibility for your own actions &
                are in proper jurisdiction, and have read and agreed to our terms
                of service.
              </p>
            </div>
            <div className="Login">
              <div className="Content">
                <div className="Heading">
                  <h2>Connect Roblox Account</h2>
                  <p className="Subtext">
                    Before you start using our platform please connect your Roblox
                    account with our website.
                  </p>
                </div>
                <form action="" onSubmit={(e) => handleLoginSubmit(e)}>
                  {step === 1 && (
                    <div className="form-group">
                      <label className="inputLabel" htmlFor="RobloxName">
                        Roblox Username
                      </label>
                      <input
                        className="input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        type="text"
                        name="RobloxName"
                        placeholder="Your Roblox Username"
                      />
                    </div>
                  )}
                  {step === 2 && (
                    <div className="form-group">
                      <p className="inputLabel">
                        Put the following code into your roblox description
                      </p>
                      <div className="text">
                        <img
                          src={copy}
                          alt="Copy Description"
                          onClick={() => handleCopyCode()}
                        />
                        <p>{descriptionCode}</p>
                      </div>
                    </div>
                  )}

                  {/* <HCaptcha
                    sitekey={config.h_captcha_key}
                    onVerify={(token, ekey) =>
                      this.setState({
                        ...this.state,
                        captcha: token
                      })
                    }
                  /> */}

                  <button type="submit">Connect</button>
                </form>
              </div>
              <div className="Footer">
                <p className="FooterText">
                  By signing in you confirm that you are 18 years of age or over,
                  of sound mind capable of taking responsibility for your own
                  actions & are in proper jurisdiction, and have read and agreed
                  to our terms of service.
                </p>
                <div className="ExtraLinks">
                  <p className="Terms">Terms of Use</p>
                  <p className="Support">Support</p>
                </div>
              </div>
            </div>
          </m.div>
        </m.div>
      </>
    );
  }

  ConnectRoblox.propTypes = {
    closeModal: PropTypes.func,
    submitForm: PropTypes.func,
  };
