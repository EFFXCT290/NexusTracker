import express from "express";
import {
  fetchReport,
  getReports,
  setReportResolved,
} from "../controllers/moderation";

const router = express.Router();

export default () => {
  // Add a GET handler for the root path to fetch all reports
  router.get("/", (req, res, next) => {
    req.query.page = "0"; // Default to first page
    getReports(req, res, next);
  });
  
  router.get("/page/:page", getReports);
  router.post("/resolve/:reportId", setReportResolved);
  router.get("/:reportId", fetchReport);
  return router;
};
