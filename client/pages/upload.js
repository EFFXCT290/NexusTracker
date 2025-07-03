import React, { useState, useCallback, useContext, useEffect } from "react";
import getConfig from "next/config";
import { useRouter } from "next/router";
import styled from "styled-components";
import css from "@styled-system/css";
import { useDropzone } from "react-dropzone";
import slugify from "slugify";
import { Link as LinkIcon } from "@styled-icons/boxicons-regular/Link";
import { Check } from "@styled-icons/boxicons-regular/Check";
import { InfoCircle } from "@styled-icons/boxicons-regular/InfoCircle";
import { Plus } from "@styled-icons/boxicons-regular/Plus";
import { X } from "@styled-icons/boxicons-regular/X";
import { Lock } from "@styled-icons/boxicons-regular/Lock";
import { withAuth } from "../utils/withAuth";
import { withAuthServerSideProps } from "../utils/withAuth";
import SEO from "../components/SEO";
import Box from "../components/Box";
import Text from "../components/Text";
import Input, { WrapLabel } from "../components/Input";
import Select from "../components/Select";
import Checkbox from "../components/Checkbox";
import Button from "../components/Button";
import Infobox from "../components/Infobox";
import List from "../components/List";
import { NotificationContext } from "../components/Notifications";
import LoadingContext from "../utils/LoadingContext";
import LocaleContext from "../utils/LocaleContext";
import MarkdownInput from "../components/MarkdownInput";
import { useCookies } from "react-cookie";

const FileUpload = styled(Box)(() =>
  css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "4px dashed",
    borderColor: "border",
    borderRadius: 2,
    cursor: "pointer",
    p: 6,
    "&:hover": {
      bg: "sidebar",
    },
  })
);

export const TorrentFields = ({
  categories,
  values,
  handleGroupSearch,
  groupSuggestions,
}) => {
  const [category, setCategory] = useState(
    values?.category ?? slugify(Object.keys(categories)[0], { lower: true })
  );
  const [sources, setSources] = useState([]);
  const [tags, setTags] = useState(values?.tags?.split(",") ?? []);

  const { getLocaleString } = useContext(LocaleContext);

  useEffect(() => {
    setSources(
      category
        ? categories[
            Object.keys(categories).find(
              (cat) => slugify(cat, { lower: true }) === category
            )
          ]
        : []
    );
  }, [category]);

  return (
    <>
      <Input
        name="name"
        label={getLocaleString("uploadName")}
        defaultValue={values?.name}
        onBlur={
          typeof handleGroupSearch === "function"
            ? handleGroupSearch
            : undefined
        }
        mb={4}
        required
      />
      {groupSuggestions}
      {!!Object.keys(categories).length && (
        <Select
          name="category"
          label={getLocaleString("uploadCategory")}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
          }}
          mb={4}
          required
        >
          {Object.keys(categories).map((cat) => (
            <option key={cat} value={slugify(cat, { lower: true })}>
              {cat}
            </option>
          ))}
        </Select>
      )}
      {!!sources.length && (
        <Select
          name="source"
          label={getLocaleString("uploadSource")}
          defaultValue={values?.source}
          mb={4}
          required
        >
          {sources.map((source) => (
            <option key={source} value={slugify(source, { lower: true })}>
              {source}
            </option>
          ))}
        </Select>
      )}
      <MarkdownInput
        name="description"
        label={getLocaleString("uploadDescription")}
        rows="10"
        placeholder={getLocaleString("uploadMarkdownSupport")}
        defaultValue={values?.description}
        mb={4}
        required
      />
      <Input
        name="mediaInfo"
        label={getLocaleString("uploadMediaInfo")}
        rows="10"
        defaultValue={values?.mediaInfo}
        fontFamily="mono"
        mb={4}
      />
      <WrapLabel as={Box} label={getLocaleString("uploadTags")} mb={4}>
        <Box display="flex" flexWrap="wrap" m={-2}>
          {tags.map((tag, i) => (
            <Box key={`tag-${i}`} display="flex" m={2}>
              <Input
                value={tag}
                onChange={(e) => {
                  setTags((t) => {
                    const curTags = [...t];
                    curTags.splice(i, 1, e.target.value);
                    return curTags;
                  });
                }}
                width="138px"
                mr={2}
              />
              <Button
                onClick={() => {
                  setTags((t) => {
                    const curTags = [...t];
                    curTags.splice(i, 1);
                    return curTags;
                  });
                }}
                type="button"
                variant="secondary"
                px={3}
              >
                <X size={20} />
              </Button>
            </Box>
          ))}
          <Button
            onClick={() => setTags((t) => [...t, ""])}
            type="button"
            display="flex"
            alignItems="center"
            m={2}
          >
            <Plus size={18} />
            <Text as="span" ml={3}>
              {getLocaleString("uploadAddTag")}
            </Text>
          </Button>
        </Box>
      </WrapLabel>
      <Input name="tags" value={tags.join(",")} display="none" />
    </>
  );
};

const Upload = ({ token, userId, userRole }) => {
  const [torrentFile, setTorrentFile] = useState();
  const [posterFile, setPosterFile] = useState();
  const [dropError, setDropError] = useState("");
  const [groupSuggestions, setGroupSuggestions] = useState([]);
  const [protectSettings, setProtectSettings] = useState({
    isProtected: false,
    password: ""
  });
  const [cookies] = useCookies();

  const {
    publicRuntimeConfig: {
      SQ_BASE_URL,
      SQ_API_URL,
      SQ_TORRENT_CATEGORIES,
      SQ_ALLOW_ANONYMOUS_UPLOAD,
      SQ_EXTENSION_BLACKLIST = [],
      SQ_ENABLE_PROTECTED_TORRENTS = false,
    },
  } = getConfig();

  const { addNotification } = useContext(NotificationContext);
  const { setLoading } = useContext(LoadingContext);
  const { getLocaleString } = useContext(LocaleContext);

  const router = useRouter();

  const [groupWith, setGroupWith] = useState(router.query.groupWith);

  const onDrop = useCallback((acceptedFiles) => {
    try {
      const [file] = acceptedFiles;
      if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
          console.log(
            `[DEBUG] upload complete: ${reader.result.slice(0, 64)}...`
          );
          const [, b64] = reader.result.split("base64,");
          setTorrentFile({ name: file.name, b64 });
        };
        reader.onerror = () => {
          console.log(`[DEBUG] upload error: ${reader.error}`);
          setDropError(reader.error.message);
        };
        reader.onprogress = (e) => {
          console.log(`[DEBUG] progress: ${e.loaded} bytes`);
        };
        reader.readAsDataURL(file);
        setDropError("");
      } else {
        setDropError("Must be a .torrent file");
      }
    } catch (e) {
      setDropError(e.message);
    }
  }, []);

  const onPosterDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result.split(",")[1];
        setPosterFile({ name: file.name, b64 });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/x-bittorrent": [".torrent"] },
    maxFiles: 1,
  });
  const {
    getRootProps: getPosterRootProps,
    getInputProps: getPosterInputProps,
    isDragActive: isPosterDragActive,
  } = useDropzone({
    onDrop: onPosterDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"]
    },
    maxFiles: 1,
    maxSize: 15728640, // 15MB (15 * 1024 * 1024)
  });

  function getImageType(data) {
    const mimeTypes = {
      "data:image/png;base64,": "png",
      "data:image/jpeg;base64,": "jpeg",
      "data:image/gif;base64,": "gif",
      "data:image/webp;base64,": "webp"
    };

    for (const [header, type] of Object.entries(mimeTypes)) {
      if (data.startsWith(header)) {
        return type;
      }
    }
    return "jpeg"; // default fallback
  }

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);
    try {
      if (!torrentFile) throw new Error("No .torrent file added");
      let posterData = null;
      if (posterFile) {
        posterData = posterFile.b64;
      }
      // 1. Upload the torrent (without protection fields)
      const uploadRes = await fetch(`${SQ_API_URL}/torrent/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          torrent: torrentFile.b64,
          name: form.get("name"),
          description: form.get("description"),
          type: form.get("category"),
          source: form.get("source"),
          poster: posterData,
          tags: form.get("tags"),
          mediaInfo: form.get("mediaInfo"),
          groupWith: groupWith,
          anonymous: form.get("anonymous") === "on",
        }),
      });
      if (uploadRes.status !== 200) {
        const reason = await uploadRes.text();
        throw new Error(reason);
      }
      const infoHash = await uploadRes.text();
      // 2. If protection is requested, set protection after upload
      if (protectSettings.isProtected && protectSettings.password) {
        const protectRes = await fetch(`${SQ_API_URL}/protect-torrent/set/${infoHash}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cookies.token || token}`,
          },
          body: JSON.stringify({
            isProtected: true,
            password: protectSettings.password,
          }),
        });
        if (!protectRes.ok) {
          const error = await protectRes.text();
          addNotification("error", getLocaleString("uploadFailedToProtect").replace("{error}", error));
          setLoading(false);
          router.push(`/torrent/${infoHash}`);
          return;
        }
      }
      addNotification(
        "success",
        `${getLocaleString("uploadTorrentUploadSuccess")}`
      );
      router.push(`/torrent/${infoHash}`);
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("uploadCouldNotUploadFile")}: ${e.message}`
      );
      console.error(e);
    }
    setLoading(false);
  };

  const handleGroupSearch = async (e) => {
    const { value } = e.target;

    try {
      const suggestionsRes = await fetch(
        `${SQ_API_URL}/group/search?query=${encodeURIComponent(value)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (suggestionsRes.status !== 200) {
        const reason = await suggestionsRes.text();
        throw new Error(reason);
      }

      const { results } = await suggestionsRes.json();
      setGroupSuggestions(results);
    } catch (e) {
      addNotification(
        "error",
        `${getLocaleString("uploadCouldNotGetGroupSuggestions")}: ${e.message}`
      );
      console.error(e);
    }
  };

  return (
    <>
      <SEO title={getLocaleString("uploadUpload")} />
      <Text as="h1" mb={4}>
        {getLocaleString("uploadUpload")}
      </Text>
      <Box mb={5}>
        <Text icon={LinkIcon} iconColor="primary">
          {getLocaleString("uploadAnnounceURL")}:{" "}
          <Text
            as="strong"
            fontFamily="mono"
            _css={{ userSelect: "all", wordBreak: "break-all" }}
          >
            {SQ_BASE_URL}/sq/{userId}/announce
          </Text>
        </Text>
      </Box>
      {!!SQ_EXTENSION_BLACKLIST.length && (
        <Infobox mb={5}>
          <Text mb={3}>{getLocaleString("uploadInfoBox1")}</Text>
          <Text
            fontFamily="mono"
            display="inline-block"
            bg="background"
            border="1px solid"
            borderColor="border"
            borderRadius={1}
            px={3}
            py={1}
          >
            {SQ_EXTENSION_BLACKLIST.join(", ")}
          </Text>
        </Infobox>
      )}
      <form onSubmit={handleUpload}>
        <Box
          display="grid"
          gridTemplateColumns={["1fr", "repeat(2, 1fr)"]}
          gridGap={4}
          mb={4}
        >
          <Box>
            <WrapLabel
              label={`${getLocaleString("uploadTorrentFile")} *`}
              as="div"
            >
              <FileUpload {...getRootProps()}>
                <input {...getInputProps()} />
                {torrentFile ? (
                  <Text icon={Check} iconColor="success" iconSize={24} ml={2}>
                    {torrentFile.name}
                  </Text>
                ) : isDragActive ? (
                  <Text color="grey">
                    {getLocaleString("uploadDropFileHere")}
                  </Text>
                ) : (
                  <Text color="grey">
                    {getLocaleString("uploadDragDropClickSelect")}
                  </Text>
                )}
              </FileUpload>
            </WrapLabel>
            {dropError && (
              <Text color="error" mt={3}>
                {getLocaleString("uploadCouldNotUploadTorrent")}: {dropError}
              </Text>
            )}
          </Box>
          <Box>
            <WrapLabel label={getLocaleString("posterImage")} as="div">
              <FileUpload {...getPosterRootProps()}>
                <input {...getPosterInputProps()} />
                {posterFile ? (
                  <img
                    src={`data:image/${getImageType(posterFile.b64)};base64,${posterFile.b64}`}
                    alt="Poster"
                    width={"auto"}
                    height={200}
                  />
                ) : isPosterDragActive ? (
                  <Text color="grey">
                    {getLocaleString("uploadDropImageHere")}
                  </Text>
                ) : (
                  <Text color="grey">
                    {getLocaleString("uploadDragDropClickSelectPoster")}
                  </Text>
                )}
              </FileUpload>
            </WrapLabel>
          </Box>
        </Box>
        <TorrentFields
          categories={SQ_TORRENT_CATEGORIES}
          handleGroupSearch={handleGroupSearch}
          groupSuggestions={
            groupSuggestions.length ? (
              <Infobox mb={5}>
                <Text icon={InfoCircle} iconColor="primary" mb={4}>
                  {getLocaleString("uploadInfoBox2")}
                </Text>
                <List
                  data={groupSuggestions.map((torrent) => ({
                    ...torrent,
                    href: `/torrent/${torrent.infoHash}`,
                    hrefTarget: "_blank",
                  }))}
                  columns={[
                    {
                      header: "Similar torrents",
                      accessor: "name",
                      cell: ({ value, row }) => (
                        <Text>
                          {value}
                          <Text as="span" color="grey" fontFamily="mono" ml={3}>
                            {row.infoHash}
                          </Text>
                        </Text>
                      ),
                      gridWidth: "1fr",
                    },
                    {
                      header: "Group?",
                      cell: ({ row }) => (
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="flex-end"
                        >
                          {groupWith === row.infoHash && (
                            <Box color="success" mr={3}>
                              <Check size={24} />
                            </Box>
                          )}
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              setGroupWith(row.infoHash);
                            }}
                            type="button"
                            disabled={groupWith === row.infoHash}
                            small
                          >
                            {getLocaleString("uploadGroupWithThisTorrent")}
                          </Button>
                        </Box>
                      ),
                      gridWidth: "240px",
                      rightAlign: true,
                    },
                  ]}
                />
              </Infobox>
            ) : undefined
          }
        />
        {groupWith && (
          <Box display="flex" alignItems="flex-end" mb={4}>
            <Input
              name="groupWith"
              label={getLocaleString("uploadGroupWith")}
              value={groupWith}
              width="100%"
              disabled
            />
            <Button
              onClick={() => setGroupWith(undefined)}
              variant="secondary"
              type="button"
              ml="3"
            >
              {getLocaleString("uploadRemove")}
            </Button>
          </Box>
        )}
        {SQ_ALLOW_ANONYMOUS_UPLOAD && (
          <Checkbox
            name="anonymous"
            label={getLocaleString("uploadAnonymousUpload")}
          />
        )}
        {SQ_ENABLE_PROTECTED_TORRENTS && userRole === "admin" && (
          <Box mb={4}>
            <Box display="flex" alignItems="center" mb={3}>
              <Checkbox
                checked={protectSettings.isProtected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setProtectSettings({ isProtected: true, password: "" });
                  } else {
                    setProtectSettings({ isProtected: false, password: "" });
                  }
                }}
                label="Protect this torrent with a password"
              />
              {protectSettings.isProtected && (
                <Box ml={3} display="flex" alignItems="center">
                  <Lock size={16} color="#e74c3c" />
                  <Text as="span" ml={1} color="grey" fontSize="sm">
                    Protected
                  </Text>
                </Box>
              )}
            </Box>
            {protectSettings.isProtected && (
              <>
                <Input
                  type="password"
                  label="Password"
                  value={protectSettings.password}
                  onChange={(e) => setProtectSettings(ps => ({ ...ps, password: e.target.value }))}
                  placeholder="Enter protection password"
                  required
                  icon={<Lock size={16} />}
                  mb={3}
                />
              </>
            )}
          </Box>
        )}
        <Button display="block" ml="auto" mt={5}>
          {getLocaleString("uploadUpload")}
        </Button>
      </form>
      <Infobox mt={5}>
        <Text color="grey" fontSize={1}>
          {getLocaleString("uploadInfoBox3")}
        </Text>
      </Infobox>
    </>
  );
};

export default withAuth(Upload);

export const getServerSideProps = withAuthServerSideProps(
  async ({ token, fetchHeaders }) => {
    // Get user role from token
    const jwt = require("jsonwebtoken");
    const { role } = jwt.verify(token, getConfig().serverRuntimeConfig.SQ_JWT_SECRET);
    return { props: { userRole: role } };
  }
);
