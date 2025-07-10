import React, { useState, useContext } from "react";
import getConfig from "next/config";
import styled from "styled-components";
import css from "@styled-system/css";
import { X } from "@styled-icons/boxicons-regular/X";
import { Lock } from "@styled-icons/boxicons-regular/Lock";
import Box from "./Box";
import Text from "./Text";
import Input from "./Input";
import Button from "./Button";
import { useCookies } from "react-cookie";
import { NotificationContext } from "./Notifications";
import LocaleContext from "../utils/LocaleContext";
import Checkbox from "./Checkbox";
import Modal from "./Modal";

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

const ProtectTorrentModal = ({ 
  isOpen, 
  onClose, 
  onProtect, 
  infoHash,
  torrentName = "",
  isProtected = false,
  currentPassword = ""
}) => {
  const [protectedState, setProtectedState] = useState(isProtected);
  const [password, setPassword] = useState(currentPassword);
  const [confirmPassword, setConfirmPassword] = useState(currentPassword);
  const [loading, setLoading] = useState(false);
  const [cookies] = useCookies();
  const { addNotification } = useContext(NotificationContext);
  const { getLocaleString } = useContext(LocaleContext);
  const { publicRuntimeConfig: { SQ_API_URL } } = getConfig();
  const [showConfirmUnprotect, setShowConfirmUnprotect] = useState(false);

  React.useEffect(() => {
    setProtectedState(true);
    setPassword("");
    setConfirmPassword("");
  }, [isOpen, isProtected]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!protectedState) {
      if (!isProtected) {
        addNotification("error", getLocaleString("protectTorrentAlreadyUnprotected"));
        return;
      }
      setShowConfirmUnprotect(true);
      return;
    }
    if (password !== confirmPassword) {
      addNotification("error", getLocaleString("protectTorrentPasswordMismatch"));
      return;
    }
    if (password.length < 3) {
      addNotification("error", getLocaleString("protectTorrentPasswordTooShort"));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${SQ_API_URL}/protect-torrent/set/${infoHash}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cookies.token}`,
        },
        body: JSON.stringify(
          protectedState
            ? { isProtected: true, password }
            : { isProtected: false }
        ),
      });
      if (response.ok) {
        const result = await response.json();
        onProtect({ isProtected: protectedState, password: protectedState ? password : undefined, shouldRefetch: true });
        onClose();
      } else {
        const error = await response.text();
        addNotification("error", error);
      }
    } catch (error) {
      addNotification("error", protectedState ? getLocaleString("protectTorrentError") : getLocaleString("protectTorrentRemoveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleUnprotectConfirmed = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SQ_API_URL}/protect-torrent/set/${infoHash}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cookies.token}`,
        },
        body: JSON.stringify({ isProtected: false }),
      });
      if (response.ok) {
        const result = await response.json();
        onProtect({ isProtected: false });
        onClose();
      } else {
        const error = await response.text();
        addNotification("error", error);
      }
    } catch (error) {
      addNotification("error", getLocaleString("protectTorrentRemoveError"));
    } finally {
      setLoading(false);
      setShowConfirmUnprotect(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <X size={24} />
        </CloseButton>
        <Box mb={4}>
          <Text as="h2" fontSize="xl" fontWeight="bold" mb={2}>
            {protectedState ? getLocaleString("protectTorrentEditTitle") : getLocaleString("protectTorrentTitle")}
            {torrentName && (
              <Text as="div" fontSize="md" color="grey" mt={1}>{torrentName}</Text>
            )}
          </Text>
          <Text color="grey" fontSize="sm">
            {protectedState
              ? getLocaleString("protectTorrentEditDescription")
              : getLocaleString("protectTorrentDescription")
            }
          </Text>
        </Box>
        <form onSubmit={handleSubmit}>
          <Box mb={3}>
            <Checkbox
              checked={protectedState}
              onChange={e => setProtectedState(e.target.checked)}
              label={getLocaleString("protectTorrentCheckbox")}
            />
          </Box>
          {protectedState && (
            <>
              <Box mb={3}>
                <Input
                  type="password"
                  label={getLocaleString("protectTorrentPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={getLocaleString("protectTorrentPasswordPlaceholder")}
                  required
                  icon={<Lock size={16} />}
                />
              </Box>
              <Box mb={4}>
                <Input
                  type="password"
                  label={getLocaleString("protectTorrentConfirmPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={getLocaleString("protectTorrentConfirmPasswordPlaceholder")}
                  required
                  icon={<Lock size={16} />}
                />
              </Box>
            </>
          )}
          <Box display="flex" gap={3}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              flex={1}
            >
              {getLocaleString("protectTorrentCancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              flex={1}
              variant={protectedState ? "primary" : "danger"}
            >
              {loading
                ? (protectedState ? getLocaleString("protectTorrentSaving") : getLocaleString("protectTorrentUnprotect"))
                : (protectedState ? (isProtected ? getLocaleString("protectTorrentUpdate") : getLocaleString("protectTorrentSave")) : getLocaleString("protectTorrentUnprotect"))}
            </Button>
          </Box>
        </form>
        {showConfirmUnprotect && (
          <Modal close={() => setShowConfirmUnprotect(false)}>
            <Text mb={4} fontWeight="bold">{getLocaleString("protectTorrentUnprotectConfirm")}</Text>
            <Box display="flex" justifyContent="flex-end" gap={3}>
              <Button variant="secondary" onClick={() => setShowConfirmUnprotect(false)} disabled={loading}>{getLocaleString("protectTorrentCancel")}</Button>
              <Button variant="danger" onClick={handleUnprotectConfirmed} disabled={loading}>{getLocaleString("protectTorrentUnprotectOk")}</Button>
            </Box>
          </Modal>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default ProtectTorrentModal;

// End of Protect Torrent Feature 