const asyncHandler = require("express-async-handler");
const Task = require("../models/Task");
const Team = require("../models/Team");

/**
 * Small helper: confirms the requester belongs to the given team.
 * Throws (via res.status + Error) if not — caller must be in an
 * asyncHandler context for this to be caught correctly.
 */
const assertTeamMember = async (teamId, clerkId, res) => {
  const team = await Team.findById(teamId);
  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }
  if (!team.members.includes(clerkId)) {
    res.status(403);
    throw new Error("You are not a member of this team");
  }
  return team;
};

/**
 * POST /api/teams/:teamId/tasks
 * body: { title, description?, assignee?, dueDate? }
 */
const createTask = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { title, description = "", assignee = null, dueDate = null } = req.body;

  await assertTeamMember(teamId, req.user.clerkId, res);

  if (!title) {
    res.status(400);
    throw new Error("Task title is required");
  }

  const task = await Task.create({ title, description, teamId, assignee, dueDate });
  res.status(201).json(task);
});

/**
 * GET /api/teams/:teamId/tasks
 * Supports optional ?status=todo|in_progress|done filter for board columns.
 */
const getTeamTasks = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { status } = req.query;

  await assertTeamMember(teamId, req.user.clerkId, res);

  const filter = { teamId };
  if (status) filter.status = status;

  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  res.status(200).json(tasks);
});

/**
 * PATCH /api/tasks/:id
 * body: any of { title, description, assignee, status, dueDate }
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  await assertTeamMember(task.teamId, req.user.clerkId, res);

  const allowedFields = ["title", "description", "assignee", "status", "dueDate"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  });

  await task.save();
  res.status(200).json(task);
});

/**
 * DELETE /api/tasks/:id
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  await assertTeamMember(task.teamId, req.user.clerkId, res);

  await task.deleteOne();
  res.status(200).json({ message: "Task deleted" });
});

module.exports = { createTask, getTeamTasks, updateTask, deleteTask };