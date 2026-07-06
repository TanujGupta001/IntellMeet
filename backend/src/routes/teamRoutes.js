const express = require("express");
const { protect, attachUser } = require("../middlewares/auth.middleware");
const {
  createTeam,
  getTeams,
  getTeamById,
  addTeamMember,
  removeTeamMember,
} = require("../controllers/team.controller");

const router = express.Router();

router.use(protect, attachUser);

router.post("/", createTeam);
router.get("/", getTeams); // teams the user belongs to
router.get("/:id", getTeamById);
router.post("/:id/members", addTeamMember); // body: { clerkId }
router.delete("/:id/members/:clerkId", removeTeamMember);

module.exports = router;