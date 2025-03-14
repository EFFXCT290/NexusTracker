import React, { useContext } from "react";
import getConfig from "next/config";
import Link from "next/link";
import SEO from "../../components/SEO";
import Text from "../../components/Text";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import LocaleContext from "../../utils/LocaleContext";

const InitiatePasswordReset = () => {
  const { addNotification } = useContext(NotificationContext);
  const { setLoading } = useContext(LoadingContext);
  const { locale, setLocale, locales, getLocaleString } = useContext(LocaleContext);

  const {
    publicRuntimeConfig: { 
      SQ_API_URL,
      SQ_VERSION,
      SQ_SITE_NAME 
    },
  } = getConfig();

  const handleInitiate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);

    try {
      const res = await fetch(`${SQ_API_URL}/reset-password/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.get("email"),
        }),
      });

      if (res.status !== 200) {
        const reason = await res.text();
        throw new Error(reason);
      }

      addNotification(
        "success",
        getLocaleString("passwordResetRequestSuccess")
      );
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("passwordResetRequestFailed")}: ${e.message}`
      );
      console.error(e);
    }

    setLoading(false);
  };

  return (
    <div className="reset-wrapper">
      <SEO title={getLocaleString("resetPassword")} />
      
      <div className="reset-header">
        <Text as="h1" className="header-title">{SQ_SITE_NAME}</Text>
      </div>
      
      <div className="reset-form-container">
        <Text as="h2" className="form-heading" style={{ textAlign: 'center' }}>
        {getLocaleString("resetPassword")}
      </Text>
        
        <form onSubmit={handleInitiate} className="reset-form">
          <div className="form-group">
            <label htmlFor="email">{getLocaleString("email")} <span className="required">*</span></label>
            <input
              id="email"
          name="email"
          type="email"
          required
              className="form-input"
        />
          </div>
          
          <button type="submit" className="reset-button">{getLocaleString("resetPassword")}</button>
      </form>
        
        <div className="reset-links">
          <Link href="/login" legacyBehavior>
            <a className="auth-link">{getLocaleString("logIn")}</a>
          </Link>
          
          <Link href="/register" legacyBehavior>
            <a className="auth-link">{getLocaleString("register")}</a>
          </Link>
        </div>
      </div>
      
      <footer className="reset-footer">
        <p className="footer-text">
          {getLocaleString("poweredBy")}{" "}
          <a 
            href="https://github.com/EFFXCT290/NexusTracker" 
            target="_blank" 
            rel="noreferrer"
            className="footer-link"
          >
            ■ NexusTracker
          </a>{" "}
          v{SQ_VERSION}
        </p>
        
        <select 
          className="language-selector" 
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          {locales.sort().map((l) => (
            <option key={`locale-${l}`} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </footer>
      
      <style jsx>{`
        /* Base styles for mobile-first approach */
        .reset-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100vw;
          background-color: #1a1a1a;
          font-family: "Inter", -apple-system, sans-serif;
          margin: 0;
          padding: 16px;
          position: relative;
        }
        
        .reset-header {
          margin-bottom: 16px;
          text-align: center;
        }
        
        .header-title {
          color: white;
          font-size: 24px;
          font-weight: 500;
        }
        
        .reset-form-container {
          background-color: #2a2a2a;
          border-radius: 6px;
          width: 100%;
          max-width: 95%;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .form-heading {
          color: white;
          text-align: center;
          margin-bottom: 12px;
          font-size: 20px;
          font-weight: 400;
        }
        
        .form-group {
          margin-bottom: 12px;
        }
        
        label {
          display: block;
          color: white;
          margin-bottom: 4px;
          font-size: 14px;
        }
        
        .required {
          color: red;
        }
        
        .form-input {
          width: 100%;
          padding: 8px;
          background-color: #333333;
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 14px;
        }
        
        .reset-button {
          width: 100%;
          padding: 10px;
          background-color: #0099ff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 8px;
        }
        
        .reset-links {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 12px;
          gap: 8px;
        }
        
        .auth-link {
          color: white;
          text-decoration: none;
          font-size: 14px;
        }
        
        .auth-link:hover {
          text-decoration: underline;
        }
        
        .reset-footer {
          position: static;
          margin-top: 16px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-bottom: 12px;
        }
        
        .footer-text {
          color: #7a7a7a;
          font-size: 12px;
          margin-bottom: 8px;
        }
        
        .footer-link {
          color: #0099ff;
          text-decoration: none;
        }
        
        .footer-link:hover {
          text-decoration: underline;
        }
        
        .language-selector {
          background-color: transparent;
          color: white;
          border: 1px solid #444444;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          appearance: menulist;
        }
        
        .language-selector option {
          background-color: #2a2a2a;
          color: white;
        }
        
        /* Small Mobile (481px - 600px) */
        @media screen and (min-width: 481px) {
          .reset-wrapper {
            padding: 20px;
          }
          
          .header-title {
            font-size: 26px;
          }
          
          .reset-form-container {
            padding: 20px;
            max-width: 90%;
          }
          
          .form-heading {
            font-size: 22px;
            margin-bottom: 16px;
          }
          
          .form-group {
            margin-bottom: 16px;
          }
          
          .form-input {
            padding: 10px;
          }
          
          .reset-button {
            padding: 11px;
          }
        }
        
        /* Small Tablets (601px - 768px) */
        @media screen and (min-width: 601px) {
          .reset-wrapper {
            padding: 24px;
          }
          
          .header-title {
            font-size: 28px;
          }
          
          .reset-form-container {
            padding: 24px;
            max-width: 500px;
          }
          
          .form-heading {
            margin-bottom: 20px;
          }
          
          label {
            font-size: 15px;
            margin-bottom: 6px;
          }
          
          .form-input {
            font-size: 15px;
            padding: 12px;
          }
          
          .reset-button {
            font-size: 15px;
            padding: 12px;
          }
          
          .auth-link {
            font-size: 15px;
          }
          
          .footer-text {
            font-size: 13px;
          }
          
          .language-selector {
            font-size: 13px;
            padding: 5px 14px;
          }
        }
        
        /* Large Tablets and Small Laptops (769px - 1024px) */
        @media screen and (min-width: 769px) {
          .reset-header {
            margin-bottom: 20px;
          }
          
          .header-title {
            font-size: 30px;
          }
          
          .reset-form-container {
            padding: 30px;
            max-width: 450px;
            margin-bottom: 24px;
          }
          
          .form-heading {
            font-size: 24px;
          }
          
          .form-group {
            margin-bottom: 20px;
          }
          
          label {
            font-size: 16px;
            margin-bottom: 8px;
          }
          
          .form-input {
            padding: 12px;
            font-size: 16px;
          }
          
          .reset-button {
            padding: 14px;
            font-size: 16px;
            margin-top: 10px;
          }
          
          .reset-links {
            margin-top: 20px;
            gap: 12px;
          }
          
          .reset-footer {
            margin-top: 30px;
          }
          
          .footer-text {
            font-size: 14px;
          }
          
          .language-selector {
            font-size: 14px;
            padding: 5px 16px;
          }
        }
        
        /* Large Desktops (1024px+) */
        @media screen and (min-width: 1025px) {
          .header-title {
            font-size: 32px;
          }
          
          .reset-form-container {
            max-width: 480px;
            padding: 36px;
          }
          
          .form-group {
            margin-bottom: 24px;
          }
          
          .form-input {
            padding: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default InitiatePasswordReset;
