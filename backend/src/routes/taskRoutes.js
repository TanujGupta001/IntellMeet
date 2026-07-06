const express = require("express");
const { protect, attachUser } = require("../middlewares/auth.middleware");
const {
  createTask,
  getTeamTasks,
  updateTask,
  deleteTask,
} = require("../controllers/task.controller");

const router = express.Router();

router.use(protect, attachUser);

// Nested under teams: /api/teams/:teamId/tasks
router.post("/teams/:teamId/tasks", createTask);
router.get("/teams/:teamId/tasks", getTeamTasks);

// Flat task operations: /api/tasks/:id
router.patch("/tasks/:id", updateTask); // update status, assignee, dueDate, etc.
router.delete("/tasks/:id", deleteTask);

module.exports = router;