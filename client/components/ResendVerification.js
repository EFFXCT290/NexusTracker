import React, { useContext } from "react";
import getConfig from "next/config";
import Button from "./Button";
import { NotificationContext } from "./Notifications";
import LoadingContext from "../utils/LoadingContext";
import LocaleContext from "../utils/LocaleContext";

const ResendVerification = ({ token }) => {
  const { addNotification } = useContext(NotificationContext);
  const { setLoading } = useContext(LoadingContext);
  const { getLocaleString } = useContext(LocaleContext);

  const {
    publicRuntimeConfig: { SQ_API_URL },
  } = getConfig();

  const handleResend = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SQ_API_URL}/account/resend-verification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        addNotification(
          "success",
          getLocaleString("verificationEmailResent")
        );
      } else {
        const error = await res.text();
        addNotification(
          "error",
          error
        );
      }
    } catch (e) {
      addNotification(
        "error",
        e.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleResend} small>
      {getLocaleString("resendVerificationEmail")}
    </Button>
  );
};

export default ResendVerification; 
