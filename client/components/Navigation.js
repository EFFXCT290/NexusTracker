import React, { useContext, useState, useEffect } from "react";
import getConfig from "next/config";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCookies } from "react-cookie";
import styled, { ThemeContext } from "styled-components";
import css from "@styled-system/css";
import { Home } from "@styled-icons/boxicons-regular/Home";
import { ListUl } from "@styled-icons/boxicons-regular/ListUl";
import { MessageAdd } from "@styled-icons/boxicons-regular/MessageAdd";
import { News } from "@styled-icons/boxicons-regular/News";
import { BookOpen } from "@styled-icons/boxicons-regular/BookOpen";
import { Rss } from "@styled-icons/boxicons-regular/Rss";
import { Bookmark } from "@styled-icons/boxicons-regular/Bookmark";
import { LogInCircle } from "@styled-icons/boxicons-regular/LogInCircle";
import { UserPlus } from "@styled-icons/boxicons-regular/UserPlus";
import Box from "./Box";
import Text from "./Text";
import LocaleContext from "../utils/LocaleContext";

// Update NavLink to include modern active indicators
const NavLink = styled.a(({ theme, href, highlights = [], mb = 3 }) => {
  const router = useRouter();
  const { asPath } = router;

  const active =
    href === "/"
      ? asPath === "/"
      : asPath.startsWith(href) ||
        highlights.some((link) => asPath.startsWith(link));

  return css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: active ? "primary" : `${theme.colors.text} !important`,
    width: "100%",
    py: 2,
    mb,
    position: "relative",
    "&:before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: "20%",
      bottom: "20%",
      width: "3px",
      borderRadius: "0 3px 3px 0",
      backgroundColor: active ? "primary" : "transparent",
      transition: "all 0.2s ease",
    },
    svg: {
      color: "primary", // All icons are blue
      opacity: active ? 1 : 0.6, // Active icon is full opacity, others are slightly faded
      transition: "all 0.2s ease",
    },
    "&:hover": {
      svg: {
        opacity: 0.8,
      }
    }
  });
});

const LocaleSelector = styled.select(() =>
  css({
    bg: "sidebar",
    color: "text",
    border: 0,
    fontSize: 0,
    fontFamily: "body",
    cursor: "pointer",
    p: 0,
  })
);

const Navigation = ({ isMobile }) => {
  const [cookies] = useCookies();
  const [role, setRole] = useState("user");
  const [isServer, setIsServer] = useState(true);

  const theme = useContext(ThemeContext);

  const { locale, setLocale, locales, getLocaleString } =
    useContext(LocaleContext);

  const { token } = cookies;

  const {
    publicRuntimeConfig: {
      SQ_API_URL,
      SQ_ALLOW_REGISTER,
      SQ_ALLOW_UNREGISTERED_VIEW,
    },
  } = getConfig();

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const roleRes = await fetch(`${SQ_API_URL}/account/get-role`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const role = await roleRes.text();
        setRole(role);
      } catch (e) {}
    };
    if (token) getUserRole();
    setIsServer(false);
  }, [token]);

  return (
    <Box
      position="fixed"
      left={0}
      top="60px"
      bottom={0}
      width="60px"
      bg="sidebar"
      borderRight="1px solid"
      borderColor="border"
      textAlign="center"
      zIndex={10}
      display="flex"
      flexDirection="column"
      alignItems="center"
    >
      {!isServer && (
        <Box 
          as="nav" 
          width="100%" 
          py={4}
          flex="1"
          display="flex"
          flexDirection="column"
          alignItems="center"
        >
          {token ? (
            <>
              <Link href="/" passHref>
                <NavLink title={getLocaleString("navHome")}>
                  <Home size={24} />
                </NavLink>
              </Link>
              <Link href="/categories" passHref>
                <NavLink title={getLocaleString("navBrowse")}>
                  <ListUl size={24} />
                </NavLink>
              </Link>
              <Link href="/requests" passHref>
                <NavLink title={getLocaleString("navRequests")}>
                  <MessageAdd size={24} />
                </NavLink>
              </Link>
              <Link href="/announcements" passHref>
                <NavLink title={getLocaleString("navAnnouncements")}>
                  <News size={24} />
                </NavLink>
              </Link>
              <Link href="/wiki" passHref>
                <NavLink title={getLocaleString("navWiki")}>
                  <BookOpen size={24} />
                </NavLink>
              </Link>
              <Link href="/rss" passHref>
                <NavLink title={getLocaleString("navRSS")}>
                  <Rss size={24} />
                </NavLink>
              </Link>
              <Link href="/bookmarks" passHref>
                <NavLink title={getLocaleString("navBookmarks")}>
                  <Bookmark size={24} />
                </NavLink>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" passHref>
                <NavLink title={getLocaleString("logIn")}>
                  <LogInCircle size={24} />
                </NavLink>
              </Link>
              {(SQ_ALLOW_REGISTER === "open" ||
                SQ_ALLOW_REGISTER === "invite") && (
                <Link href="/register" passHref>
                  <NavLink title={getLocaleString("register")}>
                    <UserPlus size={24} />
                  </NavLink>
                </Link>
              )}
              {SQ_ALLOW_UNREGISTERED_VIEW && (
                <>
                  <Link href="/categories" passHref>
                    <NavLink title={getLocaleString("navBrowse")}>
                      <ListUl size={24} />
                    </NavLink>
                  </Link>
                  <Link href="/wiki" passHref>
                    <NavLink title={getLocaleString("navWiki")}>
                      <BookOpen size={24} />
                    </NavLink>
                  </Link>
                </>
              )}
            </>
          )}
        </Box>
      )}
      
      <Box
        as="footer"
        width="100%"
        borderTop="1px solid"
        borderColor="border"
        p={2}
        textAlign="center"
      >
        <LocaleSelector
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          {locales.sort().map((l) => (
            <option key={`locale-${l}`} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </LocaleSelector>
      </Box>
    </Box>
  );
};

export default Navigation;
