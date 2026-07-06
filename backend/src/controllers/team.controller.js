const asyncHandler = require("express-async-handler");
const Team = require("../models/Team");
const User = require("../models/User");

/**
 * POST /api/teams
 * body: { name, description?, memberClerkIds?: string[] }
 */
const createTeam = asyncHandler(async (req, res) => {
  const { name, description = "", memberClerkIds = [] } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Team name is required");
  }

  const adminId = req.user.clerkId;
  const members = Array.from(new Set([adminId, ...memberClerkIds]));

  const team = await Team.create({ name, description, admin: adminId, members });

  // Keep each User's teams[] array in sync for fast "my teams" lookups
  await User.updateMany({ clerkId: { $in: members } }, { $addToSet: { teams: team._id } });

  res.status(201).json(team);
});

/**
 * GET /api/teams
 * Lists teams the current user belongs to.
 */
const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({ members: req.user.clerkId }).sort({ createdAt: -1 });
  res.status(200).json(teams);
});

/**
 * GET /api/teams/:id
 */
const getTeamById = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  if (!team.members.includes(req.user.clerkId)) {
    res.status(403);
    throw new Error("You are not a member of this team");
  }

  res.status(200).json(team);
});

/**
 * POST /api/teams/:id/members
 * body: { clerkId }
 * Only the team admin can add members.
 */
const addTeamMember = asyncHandler(async (req, res) => {
  const { clerkId } = req.body;
  const team = await Team.findById(req.params.id);

  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  if (team.admin !== req.user.clerkId) {
    res.status(403);
    throw new Error("Only the team admin can add members");
  }

  if (!clerkId) {
    res.status(400);
    throw new Error("clerkId is required");
  }

  if (!team.members.includes(clerkId)) {
    team.members.push(clerkId);
    await team.save();
    await User.updateOne({ clerkId }, { $addToSet: { teams: team._id } });
  }

  res.status(200).json(team);
});

/**
 * DELETE /api/teams/:id/members/:clerkId
 * Only the team admin can remove members (and cannot remove themselves this way).
 */
const removeTeamMember = asyncHandler(async (req, res) => {
  const { id, clerkId } = req.params;
  const team = await Team.findById(id);

  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  if (team.admin !== req.user.clerkId) {
    res.status(403);
    throw new Error("Only the team admin can remove members");
  }

  if (clerkId === team.admin) {
    res.status(400);
    throw new Error("Cannot remove the team admin");
  }

  team.members = team.members.filter((m) => m !== clerkId);
  await team.save();
  await User.updateOne({ clerkId }, { $pull: { teams: team._id } });

  res.status(200).json(team);
});

module.exports = { createTeam, getTeams, getTeamById, addTeamMember, removeTeamMember };