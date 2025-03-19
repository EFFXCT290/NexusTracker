import React, { useState, useEffect, useRef, useMemo } from "react";
import App from "next/app";
import Head from "next/head";
import Router, { useRouter } from "next/router";
import getConfig from "next/config";
import styled, {
  ThemeProvider,
  createGlobalStyle,
  keyframes,
} from "styled-components";
import { useCookies } from "react-cookie";
import prettyBytes from "pretty-bytes";
import { Menu } from "@styled-icons/boxicons-regular/Menu";
import { Sun } from "@styled-icons/boxicons-regular/Sun";
import { Moon } from "@styled-icons/boxicons-regular/Moon";
import { Bell } from "@styled-icons/boxicons-regular/Bell";
import { LoaderAlt } from "@styled-icons/boxicons-regular/LoaderAlt";
import { Sort } from "@styled-icons/boxicons-regular/Sort";
import { CaretUp } from "@styled-icons/boxicons-regular/CaretUp";
import { CaretDown } from "@styled-icons/boxicons-regular/CaretDown";
import { Run } from "@styled-icons/boxicons-regular/Run";
import { Award } from "@styled-icons/boxicons-regular/Award";
import Navigation from "../components/Navigation";
import Box from "../components/Box";
import Button from "../components/Button";
import Input from "../components/Input";
import { NotificationsProvider } from "../components/Notifications";
import Text from "../components/Text";
import LoadingContext from "../utils/LoadingContext";
import LocaleContext from "../utils/LocaleContext";
import locales from "../locales";
import Link from "next/link";
import { User } from "@styled-icons/boxicons-regular/User";
import { Lock } from "@styled-icons/boxicons-regular/Lock";
import { LogOutCircle } from "@styled-icons/boxicons-regular/LogOutCircle";
import { Upload } from "@styled-icons/boxicons-regular/Upload";
import { User as Person } from "@styled-icons/boxicons-regular/User";
import { ChevronDown } from "@styled-icons/boxicons-regular/ChevronDown";
import { X } from "@styled-icons/boxicons-regular/X";
import { Home } from "@styled-icons/boxicons-regular/Home";
import { ListUl } from "@styled-icons/boxicons-regular/ListUl";
import { HelpCircle } from "@styled-icons/boxicons-regular/HelpCircle";
import { Book } from "@styled-icons/boxicons-regular/Book";
import { Rss } from "@styled-icons/boxicons-regular/Rss";
import { Bookmark } from "@styled-icons/boxicons-regular/Bookmark";

const getThemeColours = (themeName, customTheme = {}) => {
  switch (themeName) {
    case "light":
      return {
        primary: customTheme.primary ?? "#f45d48",
        background: customTheme.background ?? "#ffffff",
        sidebar: customTheme.sidebar ?? "#f8f8f8",
        border: customTheme.border ?? "#deebf1",
        text: customTheme.text ?? "#202224",
        grey: customTheme.grey ?? "#747474",
        error: "#f33",
        success: "#44d944",
        info: "#427ee1",
      };
    case "dark":
      return {
        primary: customTheme.primary ?? "#f45d48",
        background: customTheme.background ?? "#1f2023",
        sidebar: customTheme.sidebar ?? "#27282b",
        border: customTheme.border ?? "#303236",
        text: customTheme.text ?? "#f8f8f8",
        grey: customTheme.grey ?? "#aaa",
        error: "#f33",
        success: "#44d944",
        info: "#427ee1",
      };
  }
};

const baseTheme = {
  breakpoints: ['481px', '601px', '769px', '1025px'],
  space: [0, 2, 4, 8, 16, 32, 64, 128, 256],
  sizes: {
    body: "1200px",
  },
  fonts: {
    heading: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
    mono: '"Source Code Pro", Courier, monospace',
  },
  fontSizes: [12, 14, 16, 20, 24, 36, 48, 60, 80, 96],
  fontWeights: {
    heading: 700,
    body: 400,
  },
  lineHeights: {
    heading: 1.2,
    body: 1.4,
  },
  radii: [2, 4, 8],
  shadows: {
    edge: "0 8px 24px 0 rgba(0, 0, 0, 0.12)",
    drop: "0 4px 24px 0 rgba(0, 0, 0, 0.24)",
  },
};

const GlobalStyle = createGlobalStyle(
  ({
    theme: { breakpoints, fonts, fontSizes, colors, lineHeights, sizes, space },
  }) => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    scrollbar-color: ${colors.border} ${colors.background};
    scrollbar-width: thin;
  }
  body {
    background: ${colors.background};
  }
  #__next {
    color: ${colors.text};
    font-family: ${fonts.body};
    line-height: ${lineHeights.body};
    font-size: ${fontSizes[2]}px;
  }
  
  /* Add back link styling */
  a, a:visited {
    color: ${colors.primary};
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  
  /* Add back list styling */
  ul, ol {
    padding-left: 1em;
  }
  
  /* Add back scrollbar styling */
  *::-webkit-scrollbar {
    width: 10px;
  }
  *::-webkit-scrollbar-track {
    background: ${colors.background};
  }
  *::-webkit-scrollbar-thumb {
    background: ${colors.border};
    border: 2px solid ${colors.background};
    border-radius: 10px;
  }
`
);

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
`;

const Loading = styled(LoaderAlt)`
  animation: ${spin} 1s linear infinite;
`;

const getLocaleString = (locale) => (key) =>
  locales[locale][key] ?? locales.en[key];

const NexusTracker = ({ Component, pageProps, initialTheme }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme || "light");
  const [isServer, setIsServer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const dropdownRef = useRef(null);

  const router = useRouter();
  const searchRef = useRef();

  const [cookies, setCookie] = useCookies();
  const { token } = cookies;

  const [hideNavigation, setHideNavigation] = useState(false);
  const [layoutIsReady, setLayoutIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const isAuthPage = router.pathname === "/login" || 
                     router.pathname === "/register" || 
                     router.pathname.startsWith("/reset-password") ||
                     (router.pathname === "/" && !token);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    if (isAuthPage) {
      document.body.classList.add('login-page');
    } else {
      document.body.classList.remove('login-page');
      
      try {
        const savedNavState = localStorage.getItem('nexusTrackerNavHidden');
        if (savedNavState !== null) {
          setHideNavigation(savedNavState === 'true');
        }
      } catch (err) {
        console.error("Error accessing localStorage:", err);
      }
    }
    
    setTimeout(() => {
      setLayoutIsReady(true);
    }, 0);
  }, [isClient, isAuthPage]);

  const toggleNavigation = () => {
    const newState = !hideNavigation;
    setHideNavigation(newState);
    try {
      localStorage.setItem('nexusTrackerNavHidden', String(newState));
    } catch (err) {
      console.error("Error writing to localStorage:", err);
    }
  };

  const {
    publicRuntimeConfig: {
      SQ_CUSTOM_THEME,
      SQ_SITE_WIDE_FREELEECH,
      SQ_API_URL,
      SQ_MINIMUM_RATIO,
      SQ_MAXIMUM_HIT_N_RUNS,
      SQ_SITE_DEFAULT_LOCALE,
      SQ_SITE_NAME,
    },
  } = getConfig();

  const [locale, setLocale] = useState(SQ_SITE_DEFAULT_LOCALE ?? "en");

  const allowThemeToggle = !Object.keys(SQ_CUSTOM_THEME ?? {}).some(
    (key) => key !== "primary"
  );

  const setThemeAndSave = (theme) => {
    setTheme(theme);
    setCookie("theme", theme, {
      path: "/",
      expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    });
  };

  useEffect(() => {
    setIsServer(false);

    const query = window.matchMedia("(max-width: 767px)");
    setIsMobile(query.matches);
    query.addEventListener("change", ({ matches }) => {
      setIsMobile(matches);
    });

    if (allowThemeToggle) {
      const { theme: themeCookie } = cookies;
      const themeQuery = window.matchMedia("(prefers-color-scheme: light)");
      if (!themeCookie) setThemeAndSave(themeQuery.matches ? "light" : "dark");
      themeQuery.addEventListener("change", ({ matches }) => {
        setThemeAndSave(matches ? "light" : "dark");
      });
    }

    const { locale: localeCookie } = cookies;
    if (Object.keys(locales).includes(localeCookie)) setLocale(localeCookie);

    Router.events.on("routeChangeStart", () => setLoading(true));
    Router.events.on("routeChangeComplete", () => setLoading(false));
    Router.events.on("routeChangeError", () => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isServer && token) {
      fetch(`${SQ_API_URL}/account/get-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.error) {
            setUserStats(res);
          }
        })
        .catch(error => {
          console.error('Error fetching user stats:', error);
        });
        
      fetch(`${SQ_API_URL}/account/get-role`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.text())
        .then((role) => {
          setUserRole(role);
        })
        .catch(error => {
          console.error('Error fetching user role:', error);
        });
    }
  }, [isServer, token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  useEffect(() => {
    setUserDropdownOpen(false);
  }, [token]);

  const appTheme = {
    ...baseTheme,
    colors: getThemeColours(theme, SQ_CUSTOM_THEME),
    name: theme,
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const query = form.get("query");
    if (query) {
      searchRef.current.value = "";
      searchRef.current.blur();
      router.push(`/search/${encodeURIComponent(query)}`);
    }
  };

  return (
    <>
      <Head>
        <title>nexustracker</title>
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Source+Code+Pro:wght@400;500;700&display=swap"
        />
      </Head>
      <ThemeProvider theme={appTheme}>
        <GlobalStyle />
        <LoadingContext.Provider value={{ loading, setLoading }}>
          <LocaleContext.Provider
            value={{
              locale,
              setLocale: (l) => {
                setLocale(l);
                setCookie("locale", l, { path: "/" });
              },
              locales: Object.keys(locales),
              getLocaleString: getLocaleString(locale),
            }}
          >
            <NotificationsProvider>
              {!isAuthPage && !hideNavigation && (
                <Box 
                  display={["none", "none", "none", "block"]}
                >
                  <Navigation
                    isMobile={isMobile}
                    menuIsOpen={menuIsOpen}
                    setMenuIsOpen={setMenuIsOpen}
                    isVisible={layoutIsReady}
                    siteTitle={process.env.NEXT_PUBLIC_SQ_SITE_NAME || "NexusTracker"}
                    toggleNavigation={toggleNavigation}
                  />
                </Box>
              )}
              
              {!isAuthPage && !hideNavigation && (
                <Box
                  width="100%"
                  height="60px"
                  bg={theme === "dark" ? "background" : "#1e1e1e"}
                  borderBottom="1px solid"
                  borderColor="border"
                  position="fixed"
                  top={0}
                  zIndex={9}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    height="100%"
                    width="100%"
                    maxWidth={["95%", "90%", "95%", "95%"]}
                    mx="auto"
                    px={[2, 2, 3, 3]}
                  >
                    <Box display="flex" alignItems="center">
                      <Text
                        as="div"
                        fontSize={[2, 2, 3]}
                        fontWeight={600}
                      >
                        {SQ_SITE_NAME || "Nexus Tracker"}
                      </Text>
                      
                      <Box
                        display={["none", "none", "none", "flex"]}
                        alignItems="center"
                      >
                        <Box
                          height="24px"
                          width="1px"
                          bg="border"
                          mx={2}
                        />
                        
                        {SQ_SITE_WIDE_FREELEECH === true && (
                          <Box 
                            display="flex"
                            alignItems="center"
                          >
                            <Bell size={24} color={appTheme.colors.primary} />
                            <Text
                              ml={2}
                              fontSize={2}
                            >
                              {getLocaleString(locale)("freeLeechEnabled")}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    
                    <Box display="flex" alignItems="center">
                      <Box display={["block", "block", "block", "none"]}>
                        <Button
                          onClick={() => setMenuIsOpen(!menuIsOpen)}
                          variant="transparent"
                          display={["block", "block", "block", "none"]}
                          px={1}
                          py={1}
                          mr={3}
                          _css={{
                            color: "primary",
                          }}
                        >
                          {menuIsOpen ? <X size={24} /> : <Menu size={24} />}
                        </Button>
                      </Box>
                      
                      {!isServer && token && (
                        <Box display={["none", "none", "none", "flex"]} alignItems="center" justifyContent="flex-end">
                          {userStats && (
                            <Box
                              display="flex"
                              alignItems="center"
                              color="grey"
                              mr={3}
                              flexShrink={0}
                            >
                              {Number(SQ_MINIMUM_RATIO) !== -1 && (
                                <>
                                  <Sort size={14} />
                                  <Text
                                    color={
                                      userStats.ratio !== -1 &&
                                      userStats.ratio < SQ_MINIMUM_RATIO
                                        ? "error"
                                        : "grey"
                                    }
                                    fontSize={0}
                                    ml={1}
                                    mr={2}
                                  >
                                    {userStats.ratio === -1
                                      ? "N/A"
                                      : userStats.ratio}
                                  </Text>
                                </>
                              )}
                              <CaretUp size={16} />
                              <Text fontSize={0} ml={0} mr={2}>
                                {prettyBytes(userStats.up ?? 0)}
                              </Text>
                              <CaretDown size={16} />
                              <Text fontSize={0} ml={0} mr={2}>
                                {prettyBytes(userStats.down ?? 0)}
                              </Text>
                              {Number(SQ_MAXIMUM_HIT_N_RUNS) !== -1 && (
                                <>
                                  <Run size={16} />
                                  <Text
                                    color={
                                      userStats.hitnruns > SQ_MAXIMUM_HIT_N_RUNS
                                        ? "error"
                                        : "grey"
                                    }
                                    fontSize={0}
                                    ml={1}
                                    mr={2}
                                  >
                                    {userStats.hitnruns ?? 0}
                                  </Text>
                                </>
                              )}
                              <Award size={16} />
                              <Text fontSize={0} ml={0} mr={3}>
                                {userStats.bp ?? 0} BP
                              </Text>
                            </Box>
                          )}
                          
                          <Link href="/upload" passHref>
                            <Button
                              as="a"
                              variant="transparent"
                              p={2}
                              mr={2}
                              flexShrink={0}
                              _css={{
                                textDecoration: "none",
                                color: appTheme.colors.primary,
                              }}
                            >
                              <Upload size={24} />
                            </Button>
                          </Link>
                          
                          <Box 
                            as="form" 
                            onSubmit={handleSearch} 
                            mr={3}
                            width={["180px", "200px", "230px", "300px"]}
                          >
                            <Input
                              name="query"
                              placeholder={getLocaleString(locale)("headerSearchPlaceholder")}
                              width="100%"
                              height="40px"
                              bg="#222"
                              color="white"
                              fontSize={2}
                              borderRadius={1}
                              _css={{
                                "&::placeholder": {
                                  color: "white",
                                  opacity: 0.8
                                }
                              }}
                              ref={searchRef}
                            />
                          </Box>
                          
                          <Box position="relative" ref={dropdownRef}>
                            <Box 
                              display="flex" 
                              alignItems="center" 
                              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                              _css={{
                                cursor: "pointer",
                                "& > *": { 
                                  cursor: "pointer" 
                                }
                              }}
                            >
                              <Person size={22} style={{ marginRight: '4px' }} />
                              <Text fontSize={2} fontWeight={500} mr={1}>
                                {cookies.username}
                              </Text>
                              <ChevronDown size={16} />
                            </Box>
                            
                            {userDropdownOpen && (
                              <Box
                                position="absolute"
                                right={0}
                                top="100%"
                                mt={1}
                                bg="sidebar"
                                borderRadius={1}
                                boxShadow="drop"
                                minWidth="200px"
                                border="1px solid"
                                borderColor="border"
                                zIndex={11}
                                _css={{
                                  overflow: "hidden",
                                }}
                              >
                                <Link href={`/user/${cookies.username}`} passHref>
                                  <Box
                                    as="a"
                                    display="flex"
                                    alignItems="center"
                                    p={3}
                                    _css={{
                                      textDecoration: "none",
                                      color: appTheme.colors.text,
                                      "&:hover": { 
                                        bg: "background",
                                        textDecoration: "none",
                                      }
                                    }}
                                  >
                                    <User size={20} />
                                    <Text ml={2} fontSize={2}>
                                      {getLocaleString(locale)("userProfile")}
                                    </Text>
                                  </Box>
                                </Link>
                                
                                {userRole === "admin" && (
                                  <Link href="/adminPanel" passHref>
                                    <Box
                                      as="a"
                                      display="flex"
                                      alignItems="center"
                                      p={3}
                                      _css={{
                                        textDecoration: "none",
                                        color: appTheme.colors.text,
                                        "&:hover": { 
                                          bg: "background",
                                          textDecoration: "none",
                                        }
                                      }}
                                    >
                                      <Lock size={20} />
                                      <Text ml={2} fontSize={2}>
                                        {getLocaleString(locale)("navAdminPanel")}
                                      </Text>
                                    </Box>
                                  </Link>
                                )}
                                
                                <Link href="/logout" passHref>
                                  <Box
                                    as="a"
                                    display="flex"
                                    alignItems="center"
                                    p={3}
                                    _css={{
                                      textDecoration: "none",
                                      color: appTheme.colors.text,
                                      "&:hover": { 
                                        bg: "background",
                                        textDecoration: "none",
                                      }
                                    }}
                                  >
                                    <LogOutCircle size={20} />
                                    <Text ml={2} fontSize={2}>
                                      {getLocaleString(locale)("navLogOut")}
                                    </Text>
                                  </Box>
                                </Link>
                              </Box>
                            )}
                          </Box>
                          
                          {allowThemeToggle && (
                            <Button
                              variant="transparent"
                              onClick={() => {
                                setThemeAndSave(
                                  theme === "light" ? "dark" : "light"
                                );
                              }}
                              px={2}
                              py={2}
                              ml={3}
                              _css={{
                                color: appTheme.colors.text,
                              }}
                            >
                              {theme === "light" ? (
                                <Sun size={24} />
                              ) : (
                                <Moon size={24} />
                              )}
                            </Button>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
              
              {/* Mobile/Tablet Menu Dropdown */}
              {menuIsOpen && (
                <Box
                  position="fixed"
                  top="60px"
                  left={0}
                  width="100%"
                  height="calc(100vh - 60px)"
                  bg="sidebar"
                  zIndex={8}
                  display={["block", "block", "block", "none"]}
                  boxShadow="drop"
                  overflow="auto"
                  _css={{
                    transition: "transform 0.3s ease",
                  }}
                >
                  <Box as="nav" px={4} py={2}>
                    <Link href="/" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <Home size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navHome")}</Text>
                      </Box>
                    </Link>

                    <Link href="/upload" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <Upload size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navUpload")}</Text>
                      </Box>
                    </Link>

                    <Link href="/categories" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <ListUl size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navBrowse")}</Text>
                      </Box>
                    </Link>

                    <Link href="/requests" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <HelpCircle size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navRequests")}</Text>
                      </Box>
                    </Link>

                    <Link href="/announcements" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <Bell size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navAnnouncements")}</Text>
                      </Box>
                    </Link>

                    <Link href="/wiki" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <Book size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navWiki")}</Text>
                      </Box>
                    </Link>

                    <Link href="/rss" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <Rss size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navRSS")}</Text>
                      </Box>
                    </Link>

                    <Link href="/bookmarks" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <Bookmark size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navBookmarks")}</Text>
                      </Box>
                    </Link>

                    <Link href={`/user/${cookies.username}`} passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <User size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("userProfile")}</Text>
                      </Box>
                    </Link>

                    {userRole === "admin" && (
                      <Link href="/adminPanel" passHref>
                        <Box
                          as="a"
                          display="flex"
                          alignItems="center"
                          py={3}
                          onClick={() => setMenuIsOpen(false)}
                          _css={{
                            textDecoration: "none",
                            color: appTheme.colors.text,
                            "&:hover": { color: appTheme.colors.primary }
                          }}
                        >
                          <Lock size={22} />
                          <Text ml={3} fontSize={2}>{getLocaleString(locale)("navAdminPanel")}</Text>
                        </Box>
                      </Link>
                    )}

                    <Link href="/logout" passHref>
                      <Box
                        as="a"
                        display="flex"
                        alignItems="center"
                        py={3}
                        onClick={() => setMenuIsOpen(false)}
                        _css={{
                          textDecoration: "none",
                          color: appTheme.colors.text,
                          "&:hover": { color: appTheme.colors.primary }
                        }}
                      >
                        <LogOutCircle size={22} />
                        <Text ml={3} fontSize={2}>{getLocaleString(locale)("navLogOut")}</Text>
                      </Box>
                    </Link>

                    {/* Locale selector from login.js style */}
                    <Box 
                      borderTop="1px solid" 
                      borderColor="border" 
                      mt={4} 
                      pt={4}
                    >
                      <Box mb={3}>
                        <Text
                          as="h2"
                          fontSize={2}
                        >
                          {getLocaleString(locale)("selectLanguage")}
                        </Text>
                      </Box>
                      
                      <Box 
                        display="flex"
                        border="1px solid"
                        borderColor="border"
                        borderRadius={1}
                        alignSelf="flex-start"
                        overflow="hidden"
                        mt={2}
                      >
                        {Object.keys(locales).map((loc) => (
                          <Box
                            key={loc}
                            as="button"
                            onClick={() => {
                              setLocale(loc);
                              setMenuIsOpen(false);
                            }}
                            px={3}
                            py={2}
                            bg={locale === loc ? "primary" : "background"}
                            color={locale === loc ? "white" : "text"}
                            borderRight={loc !== Object.keys(locales)[Object.keys(locales).length - 1] ? "1px solid" : "none"}
                            borderColor="border"
                            _css={{
                              cursor: "pointer",
                              border: "none",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                backgroundColor: locale === loc ? appTheme.colors.primary : appTheme.colors.border,
                              },
                            }}
                          >
                            {loc.toUpperCase()}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
              
              <Box 
                as="main" 
                width={(isAuthPage || hideNavigation) ? "100%" : undefined}
                height={(isAuthPage || hideNavigation) ? "100%" : undefined}
                mt={(isAuthPage || hideNavigation) ? 0 : "60px"}
                ml={(isAuthPage || hideNavigation) ? 0 : ["0", "0", "0", "60px"]}
                maxWidth={(isAuthPage || hideNavigation) ? "none" : ["100%", "100%", "100%", "100%"]}
                px={[3, 3, 4, 4]}
                py={[3, 4, 4, 4]}
                mx={(isAuthPage || hideNavigation) ? 0 : "auto"}
                position="relative"
                visibility={(isClient && layoutIsReady) ? "visible" : "hidden"}
                opacity={(isClient && layoutIsReady) ? 1 : 0}
                _css={{
                  transition: "opacity 0.3s ease, visibility 0.3s ease",
                  "& > *": {
                    maxWidth: (isAuthPage || hideNavigation) ? "none" : ['95%', '90%', '90%', '95%'],
                    marginLeft: "auto",
                    marginRight: "auto"
                  }
                }}
              >
                <Component {...pageProps} />
              </Box>
            </NotificationsProvider>
          </LocaleContext.Provider>
        </LoadingContext.Provider>
      </ThemeProvider>
    </>
  );
};

NexusTracker.getInitialProps = async (appContext) => {
  const { theme } = appContext?.ctx?.req?.cookies || {};
  const appInitialProps = App.getInitialProps(appContext);
  return { initialTheme: theme, ...appInitialProps };
};

export default NexusTracker;
