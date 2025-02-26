import React, { useContext, useState } from 'react';
import Link from "next/link";
import moment from "moment";
import { Comment as CommentIcon } from "@styled-icons/boxicons-regular/Comment";
import { File } from "@styled-icons/boxicons-regular/File";
import { News } from "@styled-icons/boxicons-regular/News";
import { CommentAdd } from "@styled-icons/boxicons-regular/CommentAdd";
import Box from "./Box";
import Text from "./Text";
import { NotificationContext } from './Notifications';
import LocaleContext from '../utils/LocaleContext';
import getConfig from 'next/config';
import styled from 'styled-components';

const { publicRuntimeConfig: { SQ_API_URL } } = getConfig();

// Add a styled component for the title
const TitleText = styled(Text)`
  white-space: nowrap; // Prevents text from wrapping
  overflow: hidden; // Hides overflow text
  text-overflow: ellipsis; // Adds ellipsis for overflow text
  max-width: 200px; // Set a max width for the title
`;

/**
 * Comment component that displays a single comment.
 * Allows users to delete their comments if they have the appropriate role.
 */
const Comment = ({ comment, token, userRole, onCommentDeleted }) => {
  const { addNotification } = useContext(NotificationContext);
  const { getLocaleString } = useContext(LocaleContext);
  const [loading, setLoading] = useState(false);

  /**
   * Handles the deletion of a comment.
   * Confirms with the user before proceeding and updates the UI accordingly.
   */
  const handleDeleteComment = async () => {
    if (!confirm(getLocaleString('commentDeleteConfirm'))) return;

    setLoading(true);
    try {
      const response = await fetch(`${SQ_API_URL}/torrent/comment/${comment._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(await response.text() || getLocaleString('commentDeleteFailed'));
      }

      addNotification('success', getLocaleString('commentDeleteSuccess'));
      if (onCommentDeleted) onCommentDeleted(comment._id);
    } catch (error) {
      addNotification('error', `${getLocaleString('commentDeleteError')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      p={4}
      borderTop="1px solid"
      borderColor="border"
      _css={{
        "&:last-child": {
          borderBottom: "1px solid",
          borderBottomColor: "border",
        },
      }}
    >
      <Box
        display="flex"
        flexDirection={["column", "row"]}
        alignItems={["flex-start", "center"]}
        justifyContent="space-between"
        mb={3}
      >
        <Text color="grey" icon={CommentIcon} mb={[2, 0]}>
          {getLocaleString("comCommentBy")}{" "}
          {comment.user?.username ? (
            <Link href={`/user/${comment.user.username}`} passHref>
              <TitleText as="a">{comment.user.username}</TitleText>
            </Link>
          ) : (
            <Text as="span" color="grey">
              {getLocaleString("comDelUser")}
            </Text>
          )}{" "}
          {getLocaleString("comOn")}{" "}
          {comment.type === "torrent" && comment.torrent ? (
            <Link href={`/torrent/${comment.torrent.infoHash}`} passHref>
              <TitleText as="a" icon={File} iconColor="primary">
                {comment.torrent.name}
              </TitleText>
            </Link>
          ) : comment.type === "announcement" && comment.announcement ? (
            <Link href={`/announcements/${comment.announcement.slug}`} passHref>
              <TitleText as="a" icon={News} iconColor="primary">
                {comment.announcement.title}
              </TitleText>
            </Link>
          ) : comment.type === "request" && comment.request ? (
            <Link href={`/requests/${comment.request.index}`} passHref>
              <TitleText as="a" icon={CommentAdd} iconColor="primary">
                {comment.request.title}
              </TitleText>
            </Link>
          ) : (
            <Text as="span" color="grey">
              {getLocaleString("comDeleted")}
            </Text>
          )}
        </Text>
        <Box display="flex" alignItems="center">
          <Text color="grey" textAlign="right" mr={userRole === 'admin' ? 3 : 0}>
            {getLocaleString("reqPosted")}{" "}
            {moment(comment.created).format(`${getLocaleString("indexTime")}`)}
          </Text>
          {userRole === 'admin' && (
            <Text
              as="button"
              onClick={handleDeleteComment}
              disabled={loading}
              color="error"
              _css={{
                background: "none",
                border: "none",
                cursor: "pointer",
                "&:disabled": {
                  opacity: 0.5,
                  cursor: "not-allowed"
                }
              }}
            >
              {loading ? getLocaleString('commentDeleting') : getLocaleString('commentDelete')}
            </Text>
          )}
        </Box>
      </Box>
      <Text>{comment.comment}</Text>
    </Box>
  );
};

export default Comment;
