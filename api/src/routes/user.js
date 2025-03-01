import express from "express";
import { banUser, fetchUser, unbanUser, fetchAllUsers, deleteUser } from "../controllers/user";

const router = express.Router();

export default (tracker) => {
  router.get("/", fetchAllUsers);
  router.get("/:username", fetchUser(tracker));
  router.post("/ban/:username", banUser);
  router.post("/unban/:username", unbanUser);
  router.delete("/:username", deleteUser);
  return router;
};
