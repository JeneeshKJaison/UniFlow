const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const {
    getFacultyOptions,
    getStudentGrievances,
    fileGrievance,
    markStudentResolved,
    getFacultyGrievances,
    markFacultyResolved,
    getFacultyHodDepartments,
    fileFacultyHodGrievance,
    getFacultyHodGrievances,
    markFacultyHodConfirmed,
    getHodFacultyGrievances,
    markHodResolved,
    getHodEscalatedGrievances
} = require('../controllers/grievanceController');

const router = express.Router();

router.use(authenticateToken);

router.get('/faculty-options', requireRole('student'), getFacultyOptions);
router.get('/student', requireRole('student'), getStudentGrievances);
router.post('/', requireRole('student'), fileGrievance);
router.patch('/:id/student-resolved', requireRole('student'), markStudentResolved);

router.get('/faculty', requireRole('faculty'), getFacultyGrievances);
router.patch('/:id/faculty-resolved', requireRole('faculty'), markFacultyResolved);
router.get('/faculty/hod-departments', requireRole('faculty'), getFacultyHodDepartments);
router.get('/faculty/hod', requireRole('faculty'), getFacultyHodGrievances);
router.post('/faculty/hod', requireRole('faculty'), fileFacultyHodGrievance);
router.patch('/:id/faculty-confirmed', requireRole('faculty'), markFacultyHodConfirmed);

router.get('/hod/escalated', requireRole('hod'), getHodEscalatedGrievances);
router.get('/hod/faculty-grievances', requireRole('hod'), getHodFacultyGrievances);
router.patch('/:id/hod-resolved', requireRole('hod'), markHodResolved);

module.exports = router;
