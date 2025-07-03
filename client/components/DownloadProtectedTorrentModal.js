import React, { useState, useContext } from "react";
import getConfig from "next/config";
import styled from "styled-components";
import css from "@styled-system/css";
import { X } from "@styled-icons/boxicons-regular/X";
import { Lock } from "@styled-icons/boxicons-regular/Lock";
import { Download } from "@styled-icons/boxicons-regular/Download";
import Box from "./Box";
import Text from "./Text";
import Input from "./Input";
import Button from "./Button";
import { NotificationContext } from "./Notifications";
import LocaleContext from "../utils/LocaleContext";
import { useCookies } from "react-cookie";

// ADD PROTECT TORRENT FEATURE

const ModalOverlay = styled.div(() =>
  css({
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  })
);

const ModalContent = styled.div(() =>
  css({
    backgroundColor: "background",
    borderRadius: "8px",
    padding: "24px",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "80vh",
    overflow: "auto",
    border: "1px solid",
    borderColor: "border",
  })
);

const CloseButton = styled.button(() =>
  css({
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    color: "text",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    "&:hover": {
      backgroundColor: "border",
    },
  })
);

const DownloadProtectedTorrentModal = ({ 
  isOpen, 
  onClose, 
  torrentName,
  infoHash,
  onDownload
}) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cookies] = useCookies();
  
  const { addNotification } = useContext(NotificationContext);
  const { getLocaleString } = useContext(LocaleContext);
  const { publicRuntimeConfig: { SQ_API_URL } } = getConfig();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError(getLocaleString("downloadProtectedPasswordRequired"));
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // First verify the password
      const verifyResponse = await fetch(`${SQ_API_URL}/protect-torrent/verify/${infoHash}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cookies.token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!verifyResponse.ok) {
        setError(getLocaleString("downloadProtectedIncorrectPassword"));
        return;
      }

      const verifyResult = await verifyResponse.json();
      if (!verifyResult.isValid) {
        setError(getLocaleString("downloadProtectedIncorrectPassword"));
        return;
      }

      // Log the download attempt
      await fetch(`${SQ_API_URL}/protect-torrent/log/${infoHash}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cookies.token}`,
        },
        body: JSON.stringify({ password }),
      });

      // Proceed with download
      onDownload(password);
      onClose();
      addNotification("success", getLocaleString("downloadProtectedSuccess"));
      
    } catch (error) {
      setError(getLocaleString("downloadProtectedError"));
      addNotification("error", getLocaleString("downloadProtectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={handleClose}>
          <X size={24} />
        </CloseButton>
        
        <Box mb={4} textAlign="center">
          <Box mb={3}>
            <Lock size={48} color="#e74c3c" />
          </Box>
          <Text as="h2" fontSize="xl" fontWeight="bold" mb={2}>
            {getLocaleString("downloadProtectedTitle")}
          </Text>
          <Text color="grey" fontSize="sm" mb={3}>
            {getLocaleString("downloadProtectedDescription")}
          </Text>
          <Text fontWeight="bold" fontSize="md">
            {torrentName}
          </Text>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box mb={4}>
            <Input
              type="password"
              label={getLocaleString("downloadProtectedPassword")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder={getLocaleString("downloadProtectedPasswordPlaceholder")}
              required
              icon={<Lock size={16} />}
              error={error}
            />
          </Box>

          <Box display="flex" gap={3}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
              flex={1}
            >
              {getLocaleString("downloadProtectedCancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              flex={1}
            >
              {loading ? getLocaleString("downloadProtectedVerifying") : (
                <>
                  <Download size={16} />
                  <Text as="span" ml={2}>{getLocaleString("downloadProtectedDownload")}</Text>
                </>
              )}
            </Button>
          </Box>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DownloadProtectedTorrentModal;

// End of Protect Torrent Feature 