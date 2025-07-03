import React, { useContext, useEffect } from "react";
import getConfig from "next/config";
import { useRouter } from "next/router";
import moment from "moment";
import slugify from "slugify";
import qs from "qs";
import { ListUl } from "@styled-icons/boxicons-regular/ListUl";
import { Upload } from "@styled-icons/boxicons-regular/Upload";
import { Download } from "@styled-icons/boxicons-regular/Download";
import { File } from "@styled-icons/boxicons-regular/File";
import { Chat } from "@styled-icons/boxicons-solid/Chat";
import { ChevronsLeft } from "@styled-icons/boxicons-solid/ChevronsLeft";
import { ChevronLeft } from "@styled-icons/boxicons-solid/ChevronLeft";
import { ChevronsRight } from "@styled-icons/boxicons-solid/ChevronsRight";
import { ChevronRight } from "@styled-icons/boxicons-solid/ChevronRight";
import { Bookmark } from "@styled-icons/boxicons-solid/Bookmark";
import List from "./List";
import Text from "./Text";
import Box from "./Box";
import Button from "./Button";
import LocaleContext from "../utils/LocaleContext";
import { NotificationContext } from "../components/Notifications";
import Link from "next/link";
import DownloadProtectedTorrentModal from "./DownloadProtectedTorrentModal";

const pageSize = 25;

const TorrentList = ({
  torrents = [],
  setTorrents,
  categories,
  total,
  fetchPath,
  token,
  userStats,
}) => {
  const {
    publicRuntimeConfig: { SQ_SITE_WIDE_FREELEECH, SQ_API_URL, SQ_SITE_NAME, SQ_MINIMUM_RATIO, SQ_MAXIMUM_HIT_N_RUNS, SQ_ENABLE_PROTECTED_TORRENTS = false },
  } = getConfig();

  const router = useRouter();
  const {
    query: { page: pageParam, sort },
  } = router;

  const page = pageParam ? parseInt(pageParam) - 1 : 0;

  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const canPrevPage = page > 0;
  const canNextPage = page < maxPage;

  const setPage = (number) => {
    const query = qs.parse(window.location.search.replace("?", ""));
    if (number === 0) delete query.page;
    else query.page = number + 1;
    router.push(
      Object.keys(query).length
        ? `${window.location.pathname}?${qs.stringify(query)}`
        : window.location.pathname
    );
  };

  useEffect(() => {
    const fetchTorrents = async () => {
      try {
        const searchRes = await fetch(
          `${fetchPath}?${qs.stringify(router.query)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const results = await searchRes.json();
        setTorrents(results.torrents);
      } catch (e) {}
    };
    if (fetchPath && token) fetchTorrents();
  }, [sort, page]);

  const { locale, getLocaleString } = useContext(LocaleContext);
  const { addNotification } = useContext(NotificationContext);
  const isFrench = locale === 'fr';

  const [showDownloadModal, setShowDownloadModal] = React.useState(false);
  const [selectedTorrent, setSelectedTorrent] = React.useState(null);

  // Function to handle torrent download
  const handleDownloadTorrent = async (event, torrent, password = null) => {
    event.preventDefault(); // Prevent default link behavior
    event.stopPropagation(); // Stop event from bubbling up

    if (SQ_ENABLE_PROTECTED_TORRENTS && torrent.isProtected && !password) {
      setSelectedTorrent(torrent);
      setShowDownloadModal(true);
      return;
    }

    try {
      const response = await fetch(
        `${SQ_API_URL}/torrent/download/${torrent.infoHash}`,
        {
          method: "POST", // Always use POST
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(password ? { password } : {}), // Always send a JSON body
        }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          const errorText = await response.text();
          if (errorText.includes("Password required") || errorText.includes("Invalid password")) {
            setSelectedTorrent(torrent);
            setShowDownloadModal(true);
            return;
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link with proper filename
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${torrent.name} - ${SQ_SITE_NAME}.torrent`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      addNotification('error', getLocaleString('torrentDownloadFailed'));
    }
  };

  // Improved isDownloadDisabled function with debugging
  const isDownloadDisabled = () => {
    // For debugging, you can add these console logs temporarily
    console.log("User stats:", userStats);
    console.log("SQ_MINIMUM_RATIO:", SQ_MINIMUM_RATIO);
    console.log("SQ_MAXIMUM_HIT_N_RUNS:", SQ_MAXIMUM_HIT_N_RUNS);
    
    if (!userStats) {
      console.log("No user stats available");
      return false; // Allow download if no stats (safer default)
    }
    
    const ratioTooLow = Number(SQ_MINIMUM_RATIO) !== -1 && 
                       userStats.ratio !== -1 && 
                       userStats.ratio < Number(SQ_MINIMUM_RATIO);
                       
    const tooManyHnR = Number(SQ_MAXIMUM_HIT_N_RUNS) !== -1 && 
                       userStats.hitnruns > Number(SQ_MAXIMUM_HIT_N_RUNS);
    
    console.log("Ratio too low:", ratioTooLow);
    console.log("Too many HnR:", tooManyHnR);
    
    return ratioTooLow || tooManyHnR;
  };

  return (
    <>
      <Box
        overflowX="auto"
        width="100%"
        sx={{
          '& table': {
            width: 'max-content',
            minWidth: '100%'
          }
        }}
      >
        <List
          data={torrents.map((torrent) => ({
            ...torrent,
            href: `/torrent/${torrent.infoHash}`,
          }))}
          columns={[
            {
              header: `${getLocaleString("uploadName")}`,
              accessor: "name",
              cell: ({ value, row }) => (
                <Text title={value} fontSize={isFrench ? 0 : 1}>
                  {value}
                  {row.fetchedBy?.bookmarked && (
                    <Box as={Bookmark} size={16} color="primary" ml={2} />
                  )}
                  {(row.freeleech || SQ_SITE_WIDE_FREELEECH === true) && (
                    <Text as="span" fontSize={0} color="primary" ml={3}>
                      {getLocaleString("torrFL")}
                    </Text>
                  )}
                </Text>
              ),
              gridWidth: "minmax(200px, 2fr)",
            },
            {
              header: `${getLocaleString("uploadCategory")}`,
              accessor: "type",
              cell: ({ value }) => {
                const category =
                  Object.keys(categories).find(
                    (c) => slugify(c, { lower: true }) === value
                  ) || "None";
                return (
                  <Text icon={ListUl} title={category} fontSize={isFrench ? 0 : 1}>
                    {category}
                  </Text>
                );
              },
              gridWidth: "minmax(70px, 0.6fr)",
            },
            {
              header: `${getLocaleString("torrSeeders")}`,
              accessor: "seeders",
              cell: ({ value }) => (
                <Text
                  icon={Upload}
                  iconTextWrapperProps={{ justifyContent: "flex-end" }}
                  fontSize={isFrench ? 0 : 1}
                >
                  {value !== undefined ? value : "?"}
                </Text>
              ),
              gridWidth: isFrench ? "120px" : "100px",
              rightAlign: true,
              sortable: !!token,
            },
            {
              header: `${getLocaleString("torrLeechers")}`,
              accessor: "leechers",
              cell: ({ value }) => (
                <Text
                  icon={Download}
                  iconTextWrapperProps={{ justifyContent: "flex-end" }}
                  fontSize={isFrench ? 0 : 1}
                >
                  {value !== undefined ? value : "?"}
                </Text>
              ),
              gridWidth: isFrench ? "120px" : "100px",
              rightAlign: true,
              sortable: !!token,
            },
            {
              header: `${getLocaleString("torrDownloads")}`,
              accessor: "downloads",
              cell: ({ value }) => (
                <Text
                  icon={File}
                  iconTextWrapperProps={{ justifyContent: "flex-end" }}
                  fontSize={isFrench ? 0 : 1}
                >
                  {value || 0}
                </Text>
              ),
              gridWidth: isFrench ? "135px" : "115px",
              rightAlign: true,
              sortable: !!token,
            },
            {
              header: `${getLocaleString("userComments")}`,
              accessor: "comments.count",
              cell: ({ value }) => (
                <Text
                  icon={Chat}
                  iconTextWrapperProps={{ justifyContent: "flex-end" }}
                  fontSize={isFrench ? 0 : 1}
                >
                  {value || 0}
                </Text>
              ),
              gridWidth: isFrench ? "130px" : "110px",
              rightAlign: true,
              sortable: !!token,
            },
            {
              header: `${getLocaleString("torrUploaded")}`,
              accessor: "created",
              cell: ({ value }) => (
                <Text fontSize={isFrench ? 0 : 1}>
                  {moment(value).format(
                    `${getLocaleString("userUserSinceTime")}`
                  )}
                </Text>
              ),
              gridWidth: isFrench ? "160px" : "140px",
              rightAlign: true,
              sortable: !!token,
            },
            {
              header: ``,
              accessor: "infoHash",
              cell: ({ row }) => (
                <Box display="flex" justifyContent="flex-end" alignItems="center">
                  <Button
                    onClick={(event) => handleDownloadTorrent(event, row)}
                    title={getLocaleString("torrDownload")}
                    variant="secondary"
                    px={2}
                    py={1}
                    disabled={!token}
                  >
                    <Download size={18} />
                  </Button>
                </Box>
              ),
              gridWidth: "60px",
            },
          ]}
          _css={{
            "th": {
              fontSize: isFrench ? "12px" : "14px",
              whiteSpace: "nowrap",
            },
            "table": {
              "table-layout": "fixed",
              "width": "100%"
            },
            "td": {
              "overflow": "hidden",
              "text-overflow": "ellipsis",
              "white-space": "nowrap"
            }
          }}
        />
      </Box>
      {typeof total === "number" && (
        <Box display="flex" alignItems="center" mt={4}>
          <Button
            onClick={() => setPage(0)}
            variant="secondary"
            disabled={!canPrevPage}
            px={1}
            py={1}
            mr={2}
          >
            <ChevronsLeft size={24} />
          </Button>
          <Button
            onClick={() => setPage(page - 1)}
            variant="secondary"
            disabled={!canPrevPage}
            px={1}
            py={1}
            mr={2}
          >
            <ChevronLeft size={24} />
          </Button>
          <Button
            onClick={() => setPage(page + 1)}
            variant="secondary"
            disabled={!canNextPage}
            px={1}
            py={1}
            mr={2}
          >
            <ChevronRight size={24} />
          </Button>
          <Button
            onClick={() => setPage(maxPage)}
            variant="secondary"
            disabled={!canNextPage}
            px={1}
            py={1}
            mr={3}
          >
            <ChevronsRight size={24} />
          </Button>
          <Text color="grey">
            {total.toLocaleString()} {getLocaleString("torrResults")} —{" "}
            {getLocaleString("torrPage")} {page + 1} {getLocaleString("torrOf")}{" "}
            {(maxPage + 1).toLocaleString()}
          </Text>
        </Box>
      )}
      {SQ_ENABLE_PROTECTED_TORRENTS && selectedTorrent && (
        <DownloadProtectedTorrentModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          torrentName={selectedTorrent.name}
          infoHash={selectedTorrent.infoHash}
          onDownload={(password) => handleDownloadTorrent({ preventDefault: () => {}, stopPropagation: () => {} }, selectedTorrent, password)}
        />
      )}
    </>
  );
};

export default TorrentList;
