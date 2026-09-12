const express = require("express");
const router = express.Router();

const {
    getSubjects,
    getFaculty,
    getTasks,
    suggestTask,
    assignTask,
    addClass,
    getHodSummary
} = require("../controllers/workloadController");

const authenticateToken = require("../middleware/authMiddleware");

// Get subjects list (with optional faculty filter / department scope)
router.get(
    "/subjects",
    authenticateToken,
    getSubjects
);

// Get faculty list for HOD
router.get(
    "/faculty",
    authenticateToken,
    getFaculty
);

// Get all active tasks
router.get(
    "/tasks",
    authenticateToken,
    getTasks
);

// Get workload suggestions
router.post(
    "/suggest",
    authenticateToken,
    suggestTask
);

// Final approval / assignment
router.post(
    "/assign",
    authenticateToken,
    assignTask
);

// Add a new class
router.post(
    "/classes",
    authenticateToken,
    addClass
);

// Get HOD summary
router.get(
    "/hod/summary",
    authenticateToken,
    getHodSummary
);

module.exports = router;