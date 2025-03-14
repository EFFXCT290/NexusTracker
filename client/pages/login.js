import React, { useContext, useState } from "react";
import getConfig from "next/config";
import { useRouter } from "next/router";
import Link from "next/link";
import { useCookies } from "react-cookie";
import SEO from "../components/SEO";
import Text from "../components/Text";
import Input from "../components/Input";
import Button from "../components/Button";
import { NotificationContext } from "../components/Notifications";
import LoadingContext from "../utils/LoadingContext";
import LocaleContext from "../utils/LocaleContext";
import { usernamePattern } from "./register";

const Login = () => {
  const [totpRequired, setTotpRequired] = useState(false);

  const [, setCookie] = useCookies();

  const { addNotification } = useContext(NotificationContext);
  const { setLoading } = useContext(LoadingContext);
  const { locale, setLocale, locales, getLocaleString } = useContext(LocaleContext);

  const router = useRouter();

  const {
    publicRuntimeConfig: { 
      SQ_API_URL, 
      SQ_VERSION, 
      SQ_SITE_NAME 
    },
  } = getConfig();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);

    try {
      const res = await fetch(`${SQ_API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
          totp: form.get("totp"),
        }),
      });

      if (res.status !== 200) {
        const reason = await res.text();
        if (reason === "One-time code required") setTotpRequired(true);
        throw new Error(reason);
      }

      const { token, uid, username } = await res.json();

      const expires = new Date();
      expires.setTime(expires.getTime() + 60 * 60 * 24 * 14 * 1000); // 14 days
      setCookie("token", token, { path: "/", expires });
      setCookie("userId", uid, { path: "/", expires });
      setCookie("username", username, { path: "/", expires });

      addNotification(
        "success",
        `${getLocaleString("welcomeBack")} ${form.get("username")}!`
      );

      router.push("/");
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("logInFailed")}: ${e.message}`
      );
    }

    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <SEO title={getLocaleString("logIn")} />
      
      <div className="login-header">
        <Text as="h1" className="header-title">{SQ_SITE_NAME}</Text>
      </div>
      
      <div className="login-form-container">
        <Text as="h2" className="form-heading" style={{ textAlign: 'center' }}>
          {getLocaleString("logIn")}
        </Text>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="username">{getLocaleString("username")} <span className="required">*</span></label>
            <input
              id="username"
              name="username"
              pattern={usernamePattern}
              required
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">{getLocaleString("password")} <span className="required">*</span></label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="form-input"
            />
          </div>
          
          {totpRequired && (
            <div className="form-group">
              <label htmlFor="totp">{getLocaleString("totp")}</label>
              <input id="totp" name="totp" required className="form-input" />
            </div>
          )}
          
          <button type="submit" className="login-button">{getLocaleString("logIn")}</button>
        </form>
        
        <div className="login-links">
          <Link href="/register" legacyBehavior>
            <a className="auth-link">{getLocaleString("register")}</a>
          </Link>
          
          <Link href="/reset-password/initiate" legacyBehavior>
            <a className="auth-link">{getLocaleString("resetPassword")}</a>
          </Link>
        </div>
      </div>
      
      <footer className="login-footer">
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
        .login-wrapper {
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
        
        .login-header {
          margin-bottom: 16px;
          text-align: center;
        }
        
        .header-title {
          color: white;
          font-size: 24px;
          font-weight: 500;
        }
        
        .login-form-container {
          background-color: #2a2a2a;
          border-radius: 6px;
          width: 100%;
          max-width: 95%;
          padding: 20px;
        }
        
        .form-heading {
          color: white;
          text-align: center;
          margin-bottom: 16px;
          font-size: 20px;
          font-weight: 400;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        label {
          display: block;
          color: white;
          margin-bottom: 6px;
          font-size: 14px;
        }
        
        .required {
          color: red;
        }
        
        .form-input {
          width: 100%;
          padding: 10px;
          background-color: #333333;
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 14px;
        }
        
        .login-button {
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
        
        .login-links {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 16px;
          gap: 10px;
        }
        
        .auth-link {
          color: white;
          text-decoration: none;
          font-size: 14px;
        }
        
        .login-footer {
          position: static;
          margin-top: 24px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-bottom: 16px;
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
          .login-wrapper {
            padding: 20px;
          }
          
          .header-title {
            font-size: 26px;
          }
          
          .login-form-container {
            padding: 24px;
            max-width: 90%;
          }
          
          .form-heading {
            font-size: 22px;
          }
          
          .form-input {
            padding: 11px;
          }
          
          .login-button {
            padding: 11px;
          }
        }
        
        /* Small Tablets (601px - 768px) */
        @media screen and (min-width: 601px) {
          .login-wrapper {
            padding: 24px;
          }
          
          .header-title {
            font-size: 28px;
          }
          
          .login-form-container {
            padding: 26px;
            max-width: 500px;
          }
          
          .form-heading {
            margin-bottom: 20px;
          }
          
          label {
            font-size: 15px;
          }
          
          .form-input {
            font-size: 15px;
          }
          
          .login-button {
            font-size: 15px;
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
          .login-header {
            margin-bottom: 20px;
          }
          
          .header-title {
            font-size: 30px;
          }
          
          .login-form-container {
            padding: 30px;
            max-width: 400px;
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
          
          .login-button {
            padding: 12px;
            font-size: 16px;
            margin-top: 10px;
          }
          
          .login-links {
            margin-top: 20px;
            gap: 12px;
          }
          
          .login-footer {
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
        }
      `}</style>
    </div>
  );
};

export default Login;