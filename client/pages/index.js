import React, { useContext } from "react";
import getConfig from "next/config";
import Link from "next/link";
import { useRouter } from "next/router";
import { withAuthServerSideProps } from "../utils/withAuth";
import Box from "../components/Box";
import Text from "../components/Text";
import SEO from "../components/SEO";
import Input from "../components/Input";
import Button from "../components/Button";
import TorrentList from "../components/TorrentList";
import Infobox from "../components/Infobox";
import { ErrorCircle } from "@styled-icons/boxicons-regular/ErrorCircle";
import { News } from "@styled-icons/boxicons-regular/News";
import moment from "moment/moment";
import LocaleContext from "../utils/LocaleContext";
import ResendVerification from "../components/ResendVerification";

const PublicLanding = ({ name, allowRegister }) => {
  const { getLocaleString } = useContext(LocaleContext);
  return (
    <Box
      minHeight="calc(100vh - 173px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Text as="h1" fontSize={6} textAlign="center" lineHeight={1.2}>
        {name}
      </Text>
      <Box display="flex" mt={4}>
        <Box>
          <Link href="/login">
            <a>{getLocaleString("logIn")}</a>
          </Link>
        </Box>
        {allowRegister && (
          <Box ml={4}>
            <Link href="/register">
              <a>{getLocaleString("register")}</a>
            </Link>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const Index = ({
  token,
  latestTorrents,
  latestAnnouncement,
  emailVerified,
  userStats,
}) => {
  const {
    publicRuntimeConfig: {
      SQ_SITE_NAME,
      SQ_ALLOW_REGISTER,
      SQ_TORRENT_CATEGORIES,
      SQ_API_URL,
    },
  } = getConfig();

  const router = useRouter();

  if (!token)
    return (
      <>
        <SEO />
        <PublicLanding name={SQ_SITE_NAME} allowRegister={SQ_ALLOW_REGISTER} />
      </>
    );

  const handleSearch = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const query = form.get("query");
    if (query) router.push(`/search/${encodeURIComponent(query)}`);
  };

  const { getLocaleString } = useContext(LocaleContext);

  return (
    <>
      <SEO title={getLocaleString("navHome")} />
      <Text as="h1" mb={5}>
        {getLocaleString("navHome")}
      </Text>
      {!emailVerified && (
        <Infobox mb={5}>
          <Text icon={ErrorCircle} iconColor="error" display="flex" alignItems="center">
            {getLocaleString("indexText1")}
            <Box ml={3}>
              <ResendVerification token={token} />
            </Box>
          </Text>
        </Infobox>
      )}
      {latestAnnouncement && (
        <Link href={`/announcements/${latestAnnouncement.slug}`} passHref>
          <Box
            as="a"
            _css={{
              "&:hover": {
                textDecoration: "none",
                h2: { textDecoration: "underline" },
              },
            }}
          >
            <Infobox mb={5}>
              <Text
                icon={News}
                iconColor="primary"
                color="grey"
                fontWeight={600}
                fontSize={1}
                _css={{ textTransform: "uppercase" }}
                mb={3}
              >
                {getLocaleString("indexLatestAnnounce")}
              </Text>
              <Text as="h2" fontSize={3} mb={3}>
                {latestAnnouncement.title}
              </Text>
              <Text color="grey">
                {getLocaleString("reqPosted")}{" "}
                {moment(latestAnnouncement.created).format(
                  `${getLocaleString("indexTime")}`
                )}{" "}
                {getLocaleString("reqBy")}{" "}
                {latestAnnouncement.createdBy?.username ? (
                  <Link
                    href={`/user/${latestAnnouncement.createdBy.username}`}
                    passHref
                  >
                    <a>{latestAnnouncement.createdBy.username}</a>
                  </Link>
                ) : (
                  "deleted user"
                )}
              </Text>
            </Infobox>
          </Box>
        </Link>
      )}
      <Text as="h2" mb={4}>
        {getLocaleString("indexLatestTorrents")}
      </Text>
      <TorrentList
        torrents={latestTorrents}
        setTorrents={() => {}}
        categories={SQ_TORRENT_CATEGORIES}
        total={latestTorrents.length}
        fetchPath={`${SQ_API_URL}/torrent/latest`}
        token={token}
        userStats={userStats}
      />
    </>
  );
};

export const getServerSideProps = withAuthServerSideProps(
  async ({ token, fetchHeaders }) => {
    if (!token) return { props: {} };

    const {
      publicRuntimeConfig: { SQ_API_URL },
    } = getConfig();

    try {
      const latestTorrentsRes = await fetch(`${SQ_API_URL}/torrent/latest`, {
        headers: fetchHeaders,
      });
      if (
        latestTorrentsRes.status === 403 &&
        (await latestTorrentsRes.text()) === "User is banned"
      ) {
        throw "banned";
      }
      const latestTorrents = await latestTorrentsRes.json();

      const latestAnnouncementRes = await fetch(
        `${SQ_API_URL}/announcements/latest`,
        {
          headers: fetchHeaders,
        }
      );
      let latestAnnouncement = null;
      if (latestAnnouncementRes.status === 200) {
        latestAnnouncement = await latestAnnouncementRes.json();
      }

      const verifiedRes = await fetch(`${SQ_API_URL}/account/get-verified`, {
        headers: fetchHeaders,
      });
      const emailVerified = await verifiedRes.json();
      
      const userStatsRes = await fetch(`${SQ_API_URL}/account/get-stats`, {
        headers: fetchHeaders,
      });
      const userStats = await userStatsRes.json();

      return {
        props: { latestTorrents, latestAnnouncement, emailVerified, token, userStats },
      };
    } catch (e) {
      console.error(e);
      if (e === "banned") throw "banned";
      return { props: {} };
    }
  },
  false,
  true
);

export default Index;
