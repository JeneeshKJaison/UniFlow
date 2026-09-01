const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const {
    getMyTasks,
    updateTaskStatus,
    getMySubjects,
    checkStudentWorkload,
    assignWorkToStudents,
    getMyAssignedStudentWorks
} = require('../controllers/facultyController');

// All faculty routes require authentication
router.get('/tasks', authenticateToken, getMyTasks);
router.patch('/tasks/:id/status', authenticateToken, updateTaskStatus);
router.get('/subjects', authenticateToken, getMySubjects);

// Faculty assigning work to students (Workload-aware)
router.post('/student-assignments/check', authenticateToken, checkStudentWorkload);
router.post('/student-assignments', authenticateToken, assignWorkToStudents);
router.get('/student-assignments', authenticateToken, getMyAssignedStudentWorks);

module.exports = router;
