import express from "express";
import {
  addComment as addCommentTorrent,
  addVote,
  deleteTorrent,
  fetchTorrent,
  listLatest,
  listAll,
  removeVote,
  searchTorrents,
  toggleFreeleech,
  uploadTorrent,
  editTorrent,
  toggleBookmark,
  listTags,
  downloadTorrent,
} from "../controllers/torrent";
import { deleteComment } from "../controllers/Comment";
import { createReport } from "../controllers/moderation";
import auth from "../middleware/auth";

const router = express.Router();

export default (tracker) => {
  router.post("/upload", uploadTorrent);
  router.get("/info/:infoHash", fetchTorrent(tracker));
  router.delete("/delete/:infoHash", deleteTorrent);
  router.post("/edit/:infoHash", editTorrent);
  router.post("/comment/:infoHash", addCommentTorrent);
  router.post("/vote/:infoHash/:vote", addVote);
  router.post("/unvote/:infoHash/:vote", removeVote);
  router.post("/report/:infoHash", createReport);
  router.post("/toggle-freeleech/:infoHash", toggleFreeleech);
  router.post("/bookmark/:infoHash", toggleBookmark);
  router.get("/latest", listLatest(tracker));
  router.get("/all", listAll);
  router.get("/search", searchTorrents(tracker));
  router.get("/tags", listTags);
  router.post("/download/:infoHash", downloadTorrent);
  router.delete('/comment/:commentId', auth, async (req, res) => {
    return deleteComment(req, res);
  });
  return router;
};

export const publicRoutes = (app) => {
  app.get("/torrent/download/:infoHash/:uid", downloadTorrent);
};
