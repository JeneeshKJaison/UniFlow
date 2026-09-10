document.addEventListener('DOMContentLoaded', () => {

    // --- Mock Data Store & Dynamic Logged-in Faculty Context ---
    let currentFaculty = { id: 2, customId: 'FAC001', name: 'Grace Hopper', email: 'faculty@uniflow.edu', deptId: 1, deptName: 'Computer Science' };
    const storedUser = localStorage.getItem('uniflow_currentUser');
    if (storedUser) {
        try {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.role === 'faculty') {
                currentFaculty = {
                    id: parsed.id || 2,
                    customId: parsed.customId || 'FAC',
                    name: parsed.name || 'Faculty Member',
                    email: parsed.email || 'faculty@uniflow.edu',
                    deptId: parsed.deptId || 1,
                    deptName: parsed.deptName || 'Computer Science'
                };
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Set UI labels
    if (document.getElementById('facultyNameDisplay')) document.getElementById('facultyNameDisplay').textContent = currentFaculty.name;
    if (document.getElementById('deptTitle')) document.getElementById('deptTitle').textContent = `${currentFaculty.deptName} Department`;
    if (document.getElementById('profileName')) document.getElementById('profileName').value = currentFaculty.name;


    const dataStore = {
        users: [
            { id: 1, customId: 'FAC001', name: 'Dr. Alan Turing', role: 'faculty', deptId: 1, isHOD: true },
            { id: 2, customId: 'FAC002', name: 'Grace Hopper', role: 'faculty', deptId: 1, isHOD: false },
            { id: 3, customId: 'FAC003', name: 'Linus Torvalds', role: 'faculty', deptId: 1, isHOD: false },
            { id: 4, customId: 'STU001', name: 'Ada Lovelace', role: 'student', deptId: 1, semester: 5, course: 'B.Tech CS' },
            { id: 5, customId: 'STU002', name: 'Tim Berners-Lee', role: 'student', deptId: 1, semester: 5, course: 'B.Tech CS' },
            { id: 101, customId: 'STU003', name: 'John Doe', role: 'student', deptId: 1, semester: 3, course: 'B.Tech CS' },
            { id: 102, customId: 'STU004', name: 'Jane Smith', role: 'student', deptId: 1, semester: 3, course: 'B.Tech CS' }
        ],
        subjects: [
            { id: 1, name: 'Data Structures', code: 'CS201', semester: 3, course: 'B.Tech CS' },
            { id: 2, name: 'Operating Systems', code: 'CS301', semester: 5, course: 'B.Tech CS' },
            { id: 3, name: 'Database Management Systems', code: 'CS302', semester: 5, course: 'B.Tech CS' },
            { id: 4, name: 'Computer Networks', code: 'CS303', semester: 5, course: 'B.Tech CS' }
        ],
        // Mock Timetable Data showing assigned subjects
        timetableData: {
            'Mon-1': { subjectId: 2, facultyIds: [2] }, // Grace Hopper teaches OS
            'Mon-2': { subjectId: 2, facultyIds: [2] },
            'Tue-3': { subjectId: 1, facultyIds: [2, 3] }, // Grace & Linus teach DS
            'Wed-1': { subjectId: 2, facultyIds: [2] },
            'Thu-4': { subjectId: 1, facultyIds: [2] }
        },
        // Tasks assigned BY the HOD TO the faculty
        facultyTasks: [],
        // Tasks assigned BY the faculty TO students
        studentTasks: [
            { id: 101, classId: 2, desc: 'Complete OS assignment chapter 1', deadline: '2026-07-20' },
            { id: 102, classId: 1, desc: 'Write a basic Linked List program', deadline: '2026-07-22' }
        ],
        // Grievances submitted by this faculty
        grievances: [
            { id: 1, subject: 'Projector broken in Lab 3', details: 'The overhead projector in Lab 3 is completely unresponsive.', date: '2026-07-09', status: 'Pending', resolution: '' }
        ],
        studentMarks: [
            // { studentId, subjectId, assignmentScore, examScore }
            { studentId: 4, subjectId: 2, assignmentScore: 85, examScore: 90 },
            { studentId: 5, subjectId: 2, assignmentScore: 75, examScore: 60 }
        ],
        chatThreads: [
            { id: 1, name: 'CS Dept Faculty', isGroup: true, participants: [1, 2, 3], lastMsg: 'Meeting at 3 PM', unread: 2 },
            { id: 2, name: 'Dr. Alan Turing', isGroup: false, participants: [1, 2], lastMsg: 'Please send the report', unread: 0 }
        ],
        messages: [
            { threadId: 1, senderId: 1, text: 'Meeting at 3 PM everyone.', timestamp: '10:00 AM' },
            { threadId: 2, senderId: 1, text: 'Please send the report by EOD.', timestamp: 'Yesterday' }
        ]
    };

    function getUserName(id) {
        const u = dataStore.users.find(x => x.id == id);
        return u ? u.name : 'Unknown User';
    }

    // --- 1. Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'overview') renderOverview();
            if (targetId === 'calendar') renderCalendar();
            if (targetId === 'myClasses') renderMyClasses();
            if (targetId === 'taskAssignment') renderAssignWork();
            if (targetId === 'studentMarks') renderMarksSection();
            if (targetId === 'teamChat') renderChatList();
            if (targetId === 'grievances') renderGrievances();
        });
    });

    // --- 2. My Classes Calculation (Derived from Timetable) ---
    // Returns an array of objects: { subjectId, subject, course, semester, weeklyHours }
    function getMyAssignedClasses() {
        const classMap = {};

        for (const slotId in dataStore.timetableData) {
            const slot = dataStore.timetableData[slotId];
            if (slot.facultyIds.includes(currentFaculty.id)) {
                if (!classMap[slot.subjectId]) classMap[slot.subjectId] = 0;
                classMap[slot.subjectId]++;
            }
        }

        const classes = [];
        for (const subjectId in classMap) {
            const sub = dataStore.subjects.find(s => s.id == subjectId);
            if (sub) {
                classes.push({
                    subjectId: sub.id,
                    subjectName: sub.name,
                    course: sub.course,
                    semester: sub.semester,
                    weeklyHours: classMap[subjectId]
                });
            }
        }
        return classes;
    }

    const API_URL = 'http://localhost:5000';
    const authToken = localStorage.getItem('uniflow_token');

    // --- 1. API: Fetch Faculty Assigned Tasks ---
    async function fetchFacultyTasks() {
        if (!authToken) return;
        try {
            const res = await fetch(`${API_URL}/api/faculty/tasks`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.tasks)) {
                dataStore.facultyTasks = data.tasks;
                renderOverview();
                renderCalendar();
            }
        } catch (err) {
            console.error('Failed to fetch faculty tasks from server:', err);
        }
    }

    // --- 1b. API: Fetch Faculty Assigned Subjects ---
    async function fetchFacultySubjects() {
        if (!authToken) return;
        try {
            const res = await fetch(`${API_URL}/api/faculty/subjects`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.subjects) && data.subjects.length > 0) {
                dataStore.subjects = data.subjects;
            }
        } catch (err) {
            console.error('Failed to fetch faculty subjects:', err);
        }
    }

    // Helper: Parse date strings safely
    function parseDate(dateStr) {
        if (!dateStr) return null;
        const cleaned = dateStr.split('T')[0];
        const [y, m, d] = cleaned.split('-').map(Number);
        if (!y || !m || !d) return new Date(dateStr);
        return new Date(y, m - 1, d);
    }

    // --- 3. Overview ---
    function renderOverview() {
        const myClasses = getMyAssignedClasses();
        const totalHours = myClasses.reduce((sum, c) => sum + c.weeklyHours, 0);

        document.getElementById('statClasses').textContent = myClasses.length;
        document.getElementById('statHours').textContent = totalHours;

        const activeTasks = dataStore.facultyTasks.filter(t => !t.status || t.status.toLowerCase() !== 'completed');
        document.getElementById('statTasks').textContent = activeTasks.length;

        const tbody = document.getElementById('facultyTasksList');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (dataStore.facultyTasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-light); padding: 24px;">
                        No tasks assigned yet by HOD.
                    </td>
                </tr>
            `;
            return;
        }

        dataStore.facultyTasks.forEach(task => {
            const diff = parseInt(task.difficulty) || 1;
            let diffColor = '#48bb78';
            if (diff > 4) diffColor = '#ecc94b';
            if (diff > 7) diffColor = '#f56565';

            const isCompleted = task.status && task.status.toLowerCase() === 'completed';
            const isInProgress = task.status && task.status.toLowerCase() === 'in_progress';

            let statusBadge = `<span style="background: rgba(236, 201, 75, 0.2); color: #ecc94b; border: 1px solid rgba(236, 201, 75, 0.4); padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; text-transform: capitalize;">${task.status || 'Pending'}</span>`;
            if (isCompleted) {
                statusBadge = `<span style="background: rgba(72, 187, 120, 0.2); color: #48bb78; border: 1px solid rgba(72, 187, 120, 0.4); padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;">✓ Completed</span>`;
            } else if (isInProgress) {
                statusBadge = `<span style="background: rgba(66, 153, 225, 0.2); color: #4299e1; border: 1px solid rgba(66, 153, 225, 0.4); padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;">In Progress</span>`;
            }

            const targetDate = task.deadline ? parseDate(task.deadline) : (task.scheduled_date ? parseDate(task.scheduled_date) : null);
            const dateDisplay = targetDate ? targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible';
            const subjectLabel = task.subject_name ? `<div style="font-size: 0.8rem; color: var(--text-light); margin-top: 2px;">Subject: ${task.subject_name}</div>` : '';
            const creatorLabel = task.creator_name ? `<div style="font-size: 0.75rem; color: var(--primary-color);">By ${task.creator_name}</div>` : '';

            let actionButtons = '';
            if (isCompleted) {
                actionButtons = `
                    <button class="btn-primary" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); padding: 4px 10px; font-size: 0.85rem;" onclick="window.updateFacultyTaskStatus(${task.id}, 'pending')">Reopen</button>
                `;
            } else {
                actionButtons = `
                    <div style="display: flex; gap: 6px;">
                        ${!isInProgress ? `<button class="btn-primary" style="background: rgba(66, 153, 225, 0.2); border: 1px solid #4299e1; color: #4299e1; padding: 4px 8px; font-size: 0.85rem;" onclick="window.updateFacultyTaskStatus(${task.id}, 'in_progress')">Start</button>` : ''}
                        <button class="btn-primary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="window.updateFacultyTaskStatus(${task.id}, 'completed')">Mark Done</button>
                    </div>
                `;
            }

            tbody.innerHTML += `
                <tr style="${isCompleted ? 'opacity: 0.6;' : ''}">
                    <td>
                        <strong>${task.description}</strong>
                        ${subjectLabel}
                        ${creatorLabel}
                    </td>
                    <td><span style="background: ${diffColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">Level ${diff}</span></td>
                    <td>${dateDisplay}</td>
                    <td>${statusBadge}</td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        });
    }

    // --- Window function to update task status in DB ---
    window.updateFacultyTaskStatus = async function (id, newStatus) {
        if (!authToken) {
            alert('Authentication token missing. Please log in again.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/faculty/tasks/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await res.json();
            if (data.success) {
                await fetchFacultyTasks();
            } else {
                alert(data.message || 'Failed to update task status.');
            }
        } catch (err) {
            console.error('Error updating task status:', err);
            alert('Failed to connect to backend.');
        }
    };

    window.completeFacultyTask = function (id) {
        window.updateFacultyTaskStatus(id, 'completed');
    };

    // --- 4. Calendar ---
    let currentCalDate = new Date();

    function renderCalendar() {
        const grid = document.getElementById('calendarBody');
        const monthYearDisplay = document.getElementById('currentMonthYear');
        if (!grid) return;

        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

        grid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div class="calendar-day empty"></div>`;
        }

        const today = new Date();

        for (let day = 1; day <= daysInMonth; day++) {
            let classStr = 'calendar-day';

            // Check for tasks on this date
            const dayTasks = dataStore.facultyTasks.filter(task => {
                const isCompleted = task.status && task.status.toLowerCase() === 'completed';
                if (isCompleted) return false;

                const tDate = task.scheduled_date ? parseDate(task.scheduled_date) : (task.deadline ? parseDate(task.deadline) : null);
                if (!tDate) return false;
                return tDate.getFullYear() === year && tDate.getMonth() === month && tDate.getDate() === day;
            });

            if (dayTasks.length > 0) {
                classStr += ' has-tasks';
                if (dayTasks.some(t => parseInt(t.difficulty) > 7)) {
                    classStr += ' urgent';
                }
            }

            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                classStr += ' today';
            }

            grid.innerHTML += `
                <div class="${classStr}" data-day="${day}">
                    <span class="day-number">${day}</span>
                </div>
            `;
        }

        // Add event listeners for day clicking
        document.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                el.classList.add('selected');
                showTasksForDate(year, month, parseInt(el.getAttribute('data-day')));
            });
        });

        const detailsContainer = document.getElementById('calendarTaskDetails');
        if (detailsContainer) detailsContainer.style.display = 'none';
    }

    function showTasksForDate(year, month, day) {
        const detailsContainer = document.getElementById('calendarTaskDetails');
        const selectedDateTasks = document.getElementById('selectedDateTasks');
        const selectedDateDisplay = document.getElementById('selectedDateDisplay');

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        selectedDateDisplay.textContent = `${monthNames[month]} ${day}, ${year}`;

        const dayTasks = dataStore.facultyTasks.filter(task => {
            const tDate = task.scheduled_date ? parseDate(task.scheduled_date) : (task.deadline ? parseDate(task.deadline) : null);
            if (!tDate) return false;
            return tDate.getFullYear() === year && tDate.getMonth() === month && tDate.getDate() === day;
        });

        selectedDateTasks.innerHTML = '';
        if (dayTasks.length === 0) {
            selectedDateTasks.innerHTML = '<p style="color:var(--text-light);">No tasks scheduled or due on this date.</p>';
        } else {
            dayTasks.forEach(t => {
                const isCompleted = t.status && t.status.toLowerCase() === 'completed';
                selectedDateTasks.innerHTML += `
                    <div class="task-detail-card" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); border-left: 4px solid ${isCompleted ? '#48bb78' : 'var(--primary-color)'}; padding: 12px 16px; border-radius: 4px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <strong style="font-size: 1.1rem; margin-bottom:4px;">${t.description}</strong>
                            <span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 10px; background: rgba(255,255,255,0.1);">${t.status || 'Pending'}</span>
                        </div>
                        <div style="color:var(--text-light); font-size: 0.9rem; margin-top: 4px;">
                            <span>Subject: ${t.subject_name || 'General'}</span> &bull; 
                            <span>Difficulty: ${t.difficulty}/10</span> &bull; 
                            <span>By: ${t.creator_name || 'HOD'}</span>
                        </div>
                    </div>
                `;
            });
        }

        detailsContainer.style.display = 'block';
    }

    // Month navigation listeners
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() + 1);
        renderCalendar();
    });

    // --- 5. My Classes ---
    function renderMyClasses() {
        const tbody = document.getElementById('myClassesList');
        if (!tbody) return;
        tbody.innerHTML = '';

        const myClasses = getMyAssignedClasses();
        myClasses.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>${c.subjectName}</td>
                    <td>${c.course} - Sem ${c.semester}</td>
                    <td><strong style="color: var(--primary-color);">${c.weeklyHours}</strong> hours</td>
                </tr>
            `;
        });
    }

    document.getElementById('acRole')?.addEventListener('change', (e) => {
        const role = e.target.value;
        const labContainer = document.getElementById('labStudentsContainer');
        const projContainer = document.getElementById('projectStudentsContainer');
        const labModContainer = document.getElementById('labModContainer');
        
        if (labContainer) labContainer.style.display = (role === 'Lab') ? 'block' : 'none';
        if (labModContainer) labModContainer.style.display = (role === 'Lab') ? 'block' : 'none';
        if (projContainer) projContainer.style.display = (role === 'Project') ? 'block' : 'none';
    });

    document.getElementById('addClassForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const role = document.getElementById('acRole').value;
        const programName = document.getElementById('acProgram').value;
        const subjectName = document.getElementById('acSubjectName').value;
        const semester = document.getElementById('acSemester').value;
        const studentsInLab = document.getElementById('acStudentsLab').value;
        const studentsInProject = document.getElementById('acStudentsProject').value;
        const priorExperience = document.getElementById('acPriorExperience').value === 'Yes';
        const labModification = document.getElementById('acLabModification').value === 'Yes';
        
        const courseTypeValue = document.getElementById('acCourseType').value;
        const [courseType, ltpjCode] = courseTypeValue.split('|');

        try {
            const token = localStorage.getItem('uniflow_token');
            const response = await fetch('http://localhost:5000/api/workload/classes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    programName,
                    subjectName,
                    semester: parseInt(semester),
                    courseType,
                    ltpjCode,
                    role,
                    studentsInLab: parseInt(studentsInLab) || 0,
                    studentsInProject: parseInt(studentsInProject) || 0,
                    priorExperience,
                    labModification
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Class added successfully!');
                
                // Also add to mock store for immediate UI update since faculty.js uses dataStore
                dataStore.subjects.push({
                    id: Date.now(),
                    name: subjectName,
                    code: 'NEW',
                    semester: semester,
                    course: programName
                });
                // Mock adding to timetable so it shows up in getMyAssignedClasses
                dataStore.timetableData['Temp-' + Date.now()] = { subjectId: dataStore.subjects[dataStore.subjects.length - 1].id, facultyIds: [currentFaculty.id] };

                document.getElementById('addClassModal').style.display = 'none';
                e.target.reset();
                renderMyClasses();
            } else {
                alert('Failed to add class: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error adding class:', error);
            alert('An error occurred. Make sure the backend server is running.');
        }
    });

    // --- 6. Task Assignment (To Students) ---
    let pendingStudentTaskPayload = null;

    async function fetchAssignedStudentWorks() {
        if (!authToken) return;
        try {
            const res = await fetch(`${API_URL}/api/faculty/student-assignments`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.assigned_works)) {
                renderAssignedWorksTable(data.assigned_works);
            }
        } catch (err) {
            console.error('Failed to fetch assigned student works:', err);
        }
    }

    function renderAssignedWorksTable(works) {
        const tbody = document.getElementById('assignedWorksList');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!works || works.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-light); padding: 24px;">
                        No assignments created for students yet.
                    </td>
                </tr>
            `;
            return;
        }

        works.forEach(w => {
            const diff = parseInt(w.difficulty) || 1;
            let diffColor = '#48bb78';
            if (diff > 4) diffColor = '#ecc94b';
            if (diff > 7) diffColor = '#f56565';

            const dDate = w.due_date ? parseDate(w.due_date) : null;
            const dFormatted = dDate ? dDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date';

            const total = parseInt(w.total_students) || 0;
            const submitted = parseInt(w.submitted_count) || 0;

            tbody.innerHTML += `
                <tr>
                    <td>
                        <strong>${w.subject_name} (${w.subject_code})</strong>
                        <div style="font-size: 0.8rem; color: var(--text-light);">${w.course_code} - Sem ${w.semester}</div>
                    </td>
                    <td>
                        <strong>${w.title}</strong>
                        <div style="font-size: 0.85rem; color: var(--text-light); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${w.description}</div>
                    </td>
                    <td>
                        <span style="background: ${diffColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">Level ${diff}</span>
                    </td>
                    <td>${dFormatted}</td>
                    <td>
                        <span style="background: rgba(66, 153, 225, 0.15); color: #4299e1; border: 1px solid rgba(66, 153, 225, 0.3); padding: 3px 8px; border-radius: 10px; font-size: 0.85rem;">
                            ${submitted} / ${total} Turn-ins
                        </span>
                    </td>
                </tr>
            `;
        });
    }

    function renderAssignWork() {
        const select = document.getElementById('workClassSelect');
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>Select a subject you teach...</option>';
        if (dataStore.subjects && dataStore.subjects.length > 0) {
            dataStore.subjects.forEach(s => {
                select.innerHTML += `<option value="${s.id}">${s.name} (${s.code} - ${s.course_code || s.course_name} Sem ${s.semester})</option>`;
            });
        }

        fetchAssignedStudentWorks();
    }

    // Direct execute assignment save
    async function executeSaveStudentAssignment(payload) {
        if (!authToken) {
            alert('Authentication session expired. Please log in.');
            return;
        }

        const submitBtn = document.getElementById('btnSubmitAssign');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Publishing Assignment...';
        }

        try {
            const res = await fetch(`${API_URL}/api/faculty/student-assignments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ Success: ${data.message}`);
                document.getElementById('assignWorkForm').reset();
                closeWorkloadModal();
                fetchAssignedStudentWorks();
            } else {
                alert(`❌ ${data.message || 'Failed to assign work.'}`);
            }
        } catch (err) {
            console.error('Error assigning work to students:', err);
            alert('Network error while assigning work to students.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Validate Workload & Assign';
            }
        }
    }

    function closeWorkloadModal() {
        const modal = document.getElementById('studentWorkloadModal');
        if (modal) modal.style.display = 'none';
        pendingStudentTaskPayload = null;
    }

    document.getElementById('btnCancelAssignment')?.addEventListener('click', closeWorkloadModal);

    document.getElementById('btnOverrideAssignment')?.addEventListener('click', () => {
        if (pendingStudentTaskPayload) {
            executeSaveStudentAssignment(pendingStudentTaskPayload);
        }
    });

    document.getElementById('assignWorkForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subjectId = document.getElementById('workClassSelect').value;
        const title = document.getElementById('workTitle').value.trim();
        const desc = document.getElementById('workDesc').value.trim();
        const difficulty = parseInt(document.getElementById('workDifficulty').value);
        const deadline = document.getElementById('workDeadline').value;
        const maxMarks = parseInt(document.getElementById('workMaxMarks').value) || 100;

        if (!subjectId || !desc || !deadline) {
            alert('Please fill in all required assignment details.');
            return;
        }

        const payload = {
            subject_id: parseInt(subjectId),
            title: title,
            description: desc,
            difficulty: difficulty,
            due_date: deadline,
            max_marks: maxMarks
        };

        // 1. Run Intelligent Workload & Collision Check
        try {
            const checkRes = await fetch(`${API_URL}/api/faculty/student-assignments/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    subject_id: payload.subject_id,
                    difficulty: payload.difficulty,
                    due_date: payload.due_date
                })
            });

            const checkData = await checkRes.json();

            if (!checkData.success) {
                alert(checkData.message || 'Workload validation failed.');
                return;
            }

            // 2. If NO collision/overload -> Directly create assignment
            if (checkData.can_assign) {
                await executeSaveStudentAssignment(payload);
                return;
            }

            // 3. If OVERLOAD / COLLISION DETECTED -> Open Smart Recommendation Modal
            pendingStudentTaskPayload = payload;
            const modal = document.getElementById('studentWorkloadModal');
            const notice = document.getElementById('modalClassNotice');
            const summary = document.getElementById('modalWorkloadSummary');
            const colliding = document.getElementById('modalCollidingAssignments');
            const altList = document.getElementById('modalAlternativeDatesList');

            notice.textContent = `${checkData.target_class.course_name} (Sem ${checkData.target_class.semester})`;

            summary.innerHTML = `
                Target Date: <strong>${payload.due_date}</strong><br>
                Current Class Workload: <strong>${checkData.workload.current_daily_workload} pts</strong> + Task: <strong>${payload.difficulty} pts</strong> = 
                <strong style="color:#e53e3e;">${checkData.workload.resulting_daily_workload} pts</strong> (Max Safe Limit: ${checkData.workload.daily_threshold} pts).<br>
                <em>${checkData.reason || 'High workload concentration on this date.'}</em>
            `;

            if (checkData.existing_assignments && checkData.existing_assignments.length > 0) {
                colliding.innerHTML = '<strong>Existing assignments due on this date:</strong><ul style="margin: 4px 0 0 16px;">' +
                    checkData.existing_assignments.map(a => `<li>${a.subject_code} - ${a.title} (Level ${a.difficulty})</li>`).join('') + '</ul>';
            } else {
                colliding.innerHTML = '';
            }

            altList.innerHTML = '';
            if (checkData.alternative_dates && checkData.alternative_dates.length > 0) {
                checkData.alternative_dates.forEach(alt => {
                    const item = document.createElement('div');
                    item.className = 'glass-card';
                    item.style.cssText = 'padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid rgba(72, 187, 120, 0.4); background: rgba(72, 187, 120, 0.08); border-radius: 8px; transition: all 0.2s;';
                    item.innerHTML = `
                        <div>
                            <strong style="color: #48bb78; font-size: 1rem;">📅 ${alt.formatted_date}</strong>
                            <div style="font-size: 0.85rem; color: var(--text-light); margin-top: 2px;">
                                Workload: ${alt.current_workload} pts $\\rightarrow$ <strong>${alt.resulting_workload} / ${alt.threshold} pts</strong> (Safe)
                            </div>
                        </div>
                        <button type="button" class="btn-primary" style="padding: 6px 14px; font-size: 0.85rem;">Select & Assign</button>
                    `;
                    item.addEventListener('click', () => {
                        payload.due_date = alt.date;
                        document.getElementById('workDeadline').value = alt.date;
                        executeSaveStudentAssignment(payload);
                    });
                    altList.appendChild(item);
                });
            } else {
                altList.innerHTML = '<p style="color: var(--text-light);">No safe dates found in the next 14 days. You may choose to override.</p>';
            }

            modal.style.display = 'flex';

        } catch (err) {
            console.error('Workload check error:', err);
            // Fallback: allow saving if check API fails
            if (confirm('Workload verification server did not respond. Do you want to force assign this work?')) {
                await executeSaveStudentAssignment(payload);
            }
        }
    });

    // --- 7. Student Marks ---
    function renderMarksSection() {
        const select = document.getElementById('marksClassSelect');
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>Select Class...</option>';
        const myClasses = getMyAssignedClasses();
        myClasses.forEach(c => {
            select.innerHTML += `<option value="${c.subjectId}" data-sem="${c.semester}" data-course="${c.course}">${c.subjectName}</option>`;
        });

        document.getElementById('marksTableContainer').style.display = 'none';
    }

    document.getElementById('btnLoadStudents')?.addEventListener('click', () => {
        const select = document.getElementById('marksClassSelect');
        if (!select.value) {
            alert('Please select a class first.');
            return;
        }

        const option = select.options[select.selectedIndex];
        const semester = option.getAttribute('data-sem');
        const course = option.getAttribute('data-course');
        const subjectId = select.value;

        // Find students in this sem and course
        const students = dataStore.users.filter(u => u.role === 'student' && u.semester == semester && u.course == course);

        const tbody = document.getElementById('marksList');
        tbody.innerHTML = '';

        students.forEach(s => {
            // Check if marks exist
            const existing = dataStore.studentMarks.find(m => m.studentId == s.id && m.subjectId == subjectId);
            const aScore = existing ? existing.assignmentScore : '';
            const eScore = existing ? existing.examScore : '';

            tbody.innerHTML += `
                <tr data-student-id="${s.id}">
                    <td>${s.customId}</td>
                    <td>${s.name}</td>
                    <td><input type="number" class="assign-mark-input" value="${aScore}" min="0" max="100" style="width: 80px; padding: 6px; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); color: white;"></td>
                    <td><input type="number" class="exam-mark-input" value="${eScore}" min="0" max="100" style="width: 80px; padding: 6px; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); color: white;"></td>
                </tr>
            `;
        });

        document.getElementById('marksTableContainer').style.display = 'block';
    });

    document.getElementById('btnSaveMarks')?.addEventListener('click', () => {
        const subjectId = document.getElementById('marksClassSelect').value;
        const rows = document.querySelectorAll('#marksList tr');

        rows.forEach(row => {
            const sId = row.getAttribute('data-student-id');
            const aScore = row.querySelector('.assign-mark-input').value;
            const eScore = row.querySelector('.exam-mark-input').value;

            // Remove old entry
            dataStore.studentMarks = dataStore.studentMarks.filter(m => !(m.studentId == sId && m.subjectId == subjectId));

            // Add new if valid
            if (aScore !== '' || eScore !== '') {
                dataStore.studentMarks.push({
                    studentId: sId,
                    subjectId: subjectId,
                    assignmentScore: aScore ? parseInt(aScore) : null,
                    examScore: eScore ? parseInt(eScore) : null
                });
            }
        });

        alert('Marks saved successfully!');
    });

    // --- 8. Grievances ---
    function renderGrievances() {
        const tbody = document.getElementById('myGrievanceList');
        if (!tbody) return;
        tbody.innerHTML = '';

        dataStore.grievances.forEach(g => {
            let statColor = '#dd6b20'; // Pending
            if (g.status === 'Resolved') statColor = '#48bb78';
            else if (g.status === 'Remark Sent') statColor = '#3182ce';

            tbody.innerHTML += `
                <tr>
                    <td>${g.date}</td>
                    <td>${g.subject}</td>
                    <td style="color:${statColor}; font-weight:500;">${g.status}</td>
                    <td>
                        <button class="btn-primary" style="padding: 4px 12px; font-size: 0.9rem;" onclick="viewMyGrievance(${g.id})">View Status</button>
                    </td>
                </tr>
            `;
        });
    }

    document.getElementById('btnNewGrievance')?.addEventListener('click', () => {
        document.getElementById('newGrievanceForm').reset();
        document.getElementById('newGrievanceModal').classList.add('active');
    });

    document.getElementById('closeNewGrievanceModal')?.addEventListener('click', () => {
        document.getElementById('newGrievanceModal').classList.remove('active');
    });

    document.getElementById('newGrievanceForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const sub = document.getElementById('grivSubject').value;
        const det = document.getElementById('grivDetails').value;

        dataStore.grievances.push({
            id: Date.now(),
            subject: sub,
            details: det,
            date: new Date().toISOString().split('T')[0],
            status: 'Pending',
            resolution: ''
        });

        alert('Grievance submitted successfully!');
        document.getElementById('newGrievanceModal').classList.remove('active');
        renderGrievances();
    });

    window.viewMyGrievance = function (id) {
        const g = dataStore.grievances.find(x => x.id == id);
        if (!g) return;

        let resolutionHtml = '';
        if (g.status !== 'Pending') {
            resolutionHtml = `
                <div style="margin-top: 16px; border-top: 1px solid var(--glass-border); padding-top: 16px;">
                    <strong style="color: var(--primary-color);">HOD Remarks:</strong>
                    <p style="padding:12px; background:rgba(0,0,0,0.1); border-radius:8px; margin-top:8px;">${g.resolution || 'No details provided.'}</p>
                </div>
            `;
        }

        document.getElementById('viewGrievanceDetails').innerHTML = `
            <strong>Date:</strong> ${g.date}<br>
            <strong>Subject:</strong> ${g.subject}<br><br>
            <strong>Details:</strong>
            <p style="padding:12px; background:rgba(0,0,0,0.1); border-radius:8px;">${g.details}</p>
            ${resolutionHtml}
        `;

        document.getElementById('viewGrievanceModal').classList.add('active');
    };

    document.getElementById('closeViewGrievanceModal')?.addEventListener('click', () => {
        document.getElementById('viewGrievanceModal').classList.remove('active');
    });

    // --- 9. Team Chat ---
    let currentChatThreadId = null;

    function renderChatList() {
        const list = document.getElementById('chatThreadsList');
        if (!list) return;
        list.innerHTML = '';

        dataStore.chatThreads.forEach(t => {
            const isActive = currentChatThreadId === t.id;
            list.innerHTML += `
                <div class="chat-thread-item ${isActive ? 'active' : ''}" style="padding: 16px; border-bottom: 1px solid var(--glass-border); cursor: pointer; transition: all 0.2s;" onclick="openChat(${t.id})">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <strong style="font-size: 1.05rem;">${t.name} ${t.isGroup ? ' (Group)' : ''}</strong>
                        ${t.unread > 0 ? `<span style="background: var(--primary-color); color: white; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem;">${t.unread}</span>` : ''}
                    </div>
                    <div style="color: var(--text-light); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.lastMsg}</div>
                </div>
            `;
        });
    }

    window.openChat = function (id) {
        currentChatThreadId = id;
        const t = dataStore.chatThreads.find(x => x.id === id);
        if (!t) return;
        t.unread = 0; // mark read

        document.getElementById('activeChatName').textContent = t.name + (t.isGroup ? ' (Group)' : '');
        document.getElementById('activeChatAvatar').textContent = t.isGroup ? 'G' : t.name.charAt(0);
        document.getElementById('chatInputArea').style.display = 'flex';

        renderMessages();
        renderChatList(); // update active state and unread count
    };

    function renderMessages() {
        const view = document.getElementById('chatMessagesView');
        view.innerHTML = '';

        const msgs = dataStore.messages.filter(m => m.threadId === currentChatThreadId);

        if (msgs.length === 0) {
            view.innerHTML = '<div style="margin: auto; color: var(--text-light);">No messages yet. Say hello!</div>';
            return;
        }

        msgs.forEach(m => {
            const isMine = m.senderId === currentFaculty.id;
            const senderName = isMine ? 'You' : getUserName(m.senderId);

            view.innerHTML += `
                <div class="message ${isMine ? 'sent' : 'received'}">
                    ${!isMine ? `<div style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">${senderName}</div>` : ''}
                    <div>${m.text}</div>
                    <div style="font-size: 0.7rem; opacity: 0.7; margin-top: 4px; text-align: right;">${m.timestamp}</div>
                </div>
            `;
        });

        view.scrollTop = view.scrollHeight;
    }

    document.getElementById('chatForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatMessageInput');
        const text = input.value.trim();
        if (!text || !currentChatThreadId) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        dataStore.messages.push({
            threadId: currentChatThreadId,
            senderId: currentFaculty.id,
            text: text,
            timestamp: time
        });

        // update thread last msg
        const t = dataStore.chatThreads.find(x => x.id === currentChatThreadId);
        if (t) t.lastMsg = text;

        input.value = '';
        renderMessages();
        renderChatList();
    });

    // Chat modal logic
    document.getElementById('btnNewChat')?.addEventListener('click', () => {
        const select = document.getElementById('newChatUserSelect');
        select.innerHTML = '';
        dataStore.users.forEach(u => {
            if (u.id !== currentFaculty.id) {
                select.innerHTML += `<option value="${u.id}">${u.name} (${u.role})</option>`;
            }
        });
        document.getElementById('newChatModal').classList.add('active');
    });

    document.getElementById('closeNewChatModal')?.addEventListener('click', () => {
        document.getElementById('newChatModal').classList.remove('active');
    });

    document.getElementById('newChatForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = parseInt(document.getElementById('newChatUserSelect').value);
        if (!userId) return;

        const user = dataStore.users.find(u => u.id === userId);

        // check if thread exists
        let existing = dataStore.chatThreads.find(t => !t.isGroup && t.participants.includes(userId) && t.participants.includes(currentFaculty.id));

        if (!existing) {
            existing = {
                id: Date.now(),
                name: user.name,
                isGroup: false,
                participants: [currentFaculty.id, userId],
                lastMsg: 'New conversation started',
                unread: 0
            };
            dataStore.chatThreads.push(existing);
        }

        document.getElementById('newChatModal').classList.remove('active');
        openChat(existing.id);
    });

    // Initial render
    renderOverview();
    fetchFacultyTasks();
    fetchFacultySubjects();

});

