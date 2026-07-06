const express = require("express");
const { protect, attachUser } = require("../middlewares/auth.middleware");
const {
  summarizeMeeting,
  getMeetingSummary,
  promoteActionItemToTask,
} = require("../controllers/ai.controller");

const router = express.Router();

router.use(protect, attachUser);

// Triggers Gemini to read the transcript and produce summary + action items
router.post("/summarize/:meetingId", summarizeMeeting);

// Fetch the already-generated summary + action items for a meeting
router.get("/meetings/:meetingId/summary", getMeetingSummary);

// Converts an AI-extracted ActionItem into a real Task on a team board
router.post("/action-items/:actionItemId/promote", promoteActionItemToTask);

module.exports = router;