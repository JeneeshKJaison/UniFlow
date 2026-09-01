const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const {
    getStudentDashboard,
    getStudentAssignments,
    getStudentCourses,
    submitAssignment
} = require('../controllers/studentController');

router.get('/dashboard', authenticateToken, getStudentDashboard);
router.get('/assignments', authenticateToken, getStudentAssignments);
router.get('/courses', authenticateToken, getStudentCourses);
router.patch('/assignments/:id/submit', authenticateToken, submitAssignment);

module.exports = router;
