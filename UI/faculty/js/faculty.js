document.addEventListener('DOMContentLoaded', () => {

    const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.includes(':5000')) ? window.location.origin : 'http://localhost:5000';

    // --- Dynamic Logged-in Faculty Context ---
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
    // --- 1. Global Navigation Logic ---
    window.switchNavSection = function(targetId) {
        if (!targetId) return;
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');

        navItems.forEach(nav => {
            if (nav.getAttribute('data-target') === targetId) nav.classList.add('active');
            else nav.classList.remove('active');
        });

        sections.forEach(sec => {
            if (sec.id === targetId) sec.classList.add('active');
            else sec.classList.remove('active');
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (targetId === 'overview') renderOverview();
        if (targetId === 'calendar') renderCalendar();
        if (targetId === 'myClasses') renderMyClasses();
        if (targetId === 'taskAssignment') renderAssignWork();
        if (['deptWorkload', 'instWorkload', 'extraWorkload', 'fdpWorkload', 'researchWorkload', 'consultancyWorkload'].includes(targetId)) {
            renderAllFacultyWorkloads();
        }
        if (targetId === 'studentMarks') renderMarksSection();
        if (targetId === 'teamChat') renderChatList();
        if (targetId === 'grievances') renderGrievances();
    };

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            window.switchNavSection(targetId);
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

    let authToken = localStorage.getItem('uniflow_token');
    if (!authToken) {
        fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'faculty@uniflow.edu', password: 'faculty123' })
        }).then(r => r.json()).then(data => {
            if (data.success && data.token) {
                authToken = data.token;
                localStorage.setItem('uniflow_token', data.token);
                // Refresh data once token acquired
                fetchFacultyTasks();
                fetchFacultySubjects();
                renderFacultyDepartmentWorkload();
            }
        }).catch(() => {});
    }

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
            const workloadPoints = Number(task.workload_points ?? task.estimated_hours ?? task.difficulty ?? 0);
            const diff = workloadPoints;
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
            const categoryLabel = task.category_name || task.subject_name || 'General work';
            const subjectLabel = `<div style="font-size: 0.8rem; color: var(--text-light); margin-top: 2px;">${categoryLabel}${task.estimated_hours ? ` · ${task.estimated_hours} hours (${workloadPoints} workload points)` : ` · ${workloadPoints} legacy workload points`}</div>`;
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
                    <td><span style="background: ${diffColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">${diff} points</span></td>
                    <td>${dateDisplay}</td>
                    <td>${statusBadge}</td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        });
    }

    // --- Window function to update task status in DB ---
    window.updateFacultyTaskStatus = async function (id, newStatus) {
        // Fallback update locally first so UI is instantly responsive
        const localTask = dataStore.facultyTasks.find(x => x.id === id);
        if (localTask) {
            localTask.status = newStatus;
            renderOverview();
            renderCalendar();
        }

        if (!authToken) return;

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
            }
        } catch (err) {
            console.warn('Backend update failed, using local status:', err);
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
                if (dayTasks.some(t => Number(t.workload_points ?? t.estimated_hours ?? t.difficulty ?? 0) > 7)) {
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
                            <span>${t.category_name || t.subject_name || 'General work'}</span> &bull;
                            <span>${t.estimated_hours ? `${t.estimated_hours} hours` : `${t.workload_points ?? t.difficulty} workload points`}</span> &bull;
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

    // --- MCA Curriculum 2023 Course Presets ---
    const MCA_2023_PRESETS = [
        { code: '23MCAJ101', name: 'Programming in Python', sem: 1, cred: 5, type: 'Project based course|2-0-2-2', role: 'Project' },
        { code: '23MCAP103', name: 'Mathematical Foundations for Computing', sem: 1, cred: 4, type: 'Theory course embedded with tutorial & practical|2-1-2-0', role: 'Theory' },
        { code: '23MCAP105', name: 'Advanced Data Structures', sem: 1, cred: 4, type: 'Theory course embedded with tutorial & practical|2-1-2-0', role: 'Theory' },
        { code: '23MCAT107', name: 'Computer Networks', sem: 1, cred: 4, type: 'Theory course embedded with tutorial|3-1-0-0', role: 'Theory' },
        { code: '23MCAP109', name: 'Data Analytics and Visualization', sem: 1, cred: 2, type: 'Theory course embedded with practical without ESE|1-0-2-0', role: 'Lab' },
        { code: '23MCAP111', name: 'Linux Commands and Shell Scripting', sem: 1, cred: 2, type: 'Theory course embedded with practical without ESE|1-0-2-0', role: 'Lab' },
        { code: '23MCAP113', name: 'Professional Communication & Business Etiquettes', sem: 1, cred: 2, type: 'Theory course embedded with practical without ESE|1-0-2-0', role: 'Theory' },
        { code: '23MCAJ202', name: 'Web Application Development', sem: 2, cred: 5, type: 'Project based course|2-0-2-2', role: 'Project' },
        { code: '23MCAP204', name: 'Object Oriented Programming (JAVA)', sem: 2, cred: 4, type: 'Theory course embedded with tutorial & practical|2-1-2-0', role: 'Theory' },
        { code: '23MCAP206', name: 'Advanced Database Management Systems', sem: 2, cred: 4, type: 'Theory course embedded with tutorial & practical|2-1-2-0', role: 'Theory' },
        { code: '23MCAE232', name: 'Design and Analysis of Algorithms', sem: 2, cred: 4, type: 'Theory course embedded with tutorial|3-1-0-0', role: 'Theory' },
        { code: '23MCAP208', name: 'Cloud Computing', sem: 2, cred: 2, type: 'Theory course embedded with practical without ESE|1-0-2-0', role: 'Lab' },
        { code: '23MCAP210', name: 'Applied Statistics with R', sem: 2, cred: 2, type: 'Theory course embedded with practical without ESE|1-0-2-0', role: 'Lab' },
        { code: '23MCAP212', name: 'Virtualisation and Containers', sem: 2, cred: 2, type: 'Theory course embedded with practical without ESE|1-0-2-0', role: 'Lab' },
        { code: '23MCAJ301', name: 'Machine Learning', sem: 3, cred: 5, type: 'Project based course|2-0-2-2', role: 'Project' },
        { code: '23MCAT302', name: 'Advanced Software Engineering', sem: 3, cred: 4, type: 'Theory course embedded with tutorial|3-1-0-0', role: 'Theory' },
        { code: '23MCAE331', name: 'Artificial Intelligence', sem: 3, cred: 4, type: 'Theory course embedded with tutorial|3-1-0-0', role: 'Theory' },
        { code: '23MCAE361', name: 'Deep Learning', sem: 3, cred: 4, type: 'Theory course embedded with tutorial|3-1-0-0', role: 'Theory' },
        { code: '23MCAP305', name: 'Mobile Application Development (Flutter)', sem: 3, cred: 2, type: 'Theory course embedded with practical without ESE|1-0-2-0', role: 'Lab' },
        { code: '23MCAT306', name: 'Cyber Security', sem: 3, cred: 2, type: 'Theory course without ESE|2-0-0-0', role: 'Theory' },
        { code: '23MCAM307', name: 'Mini Project', sem: 3, cred: 3, type: 'Mini Project|0-0-6-0', role: 'Project' },
        { code: '23MCAN402', name: 'Main Project (Research Project / Internship)', sem: 4, cred: 14, type: 'Final year Project|0-0-12-0', role: 'Project' },
        { code: '23MCAS404', name: 'Seminar and Technical Writing', sem: 4, cred: 1, type: 'Seminar|0-0-2-0', role: 'Theory' }
    ];

    const acMcaPresetSelect = document.getElementById('acMcaPresetSelect');
    if (acMcaPresetSelect) {
        acMcaPresetSelect.innerHTML = '<option value="">-- Choose MCA Course from Catalog --</option>';
        MCA_2023_PRESETS.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.code;
            opt.textContent = `[Sem ${p.sem}] ${p.code} - ${p.name} (${p.cred} Credits)`;
            acMcaPresetSelect.appendChild(opt);
        });

        acMcaPresetSelect.addEventListener('change', () => {
            const selected = MCA_2023_PRESETS.find(p => p.code === acMcaPresetSelect.value);
            if (selected) {
                const prog = document.getElementById('acProgram');
                const sub = document.getElementById('acSubjectName');
                const sem = document.getElementById('acSemester');
                const role = document.getElementById('acRole');
                const type = document.getElementById('acCourseType');

                if (prog) prog.value = 'Master of Computer Applications (MCA 2023 Scheme)';
                if (sub) sub.value = `${selected.name} (${selected.code})`;
                if (sem) sem.value = selected.sem;
                if (role) {
                    role.value = selected.role;
                    role.dispatchEvent(new Event('change'));
                }
                if (type) type.value = selected.type;
            }
        });
    }

    // Modal open / close wiring for Add Class
    document.getElementById('btnAddClass')?.addEventListener('click', () => {
        const modal = document.getElementById('addClassModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    });

    document.getElementById('closeAddClassModal')?.addEventListener('click', () => {
        const modal = document.getElementById('addClassModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    });

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
        const studentsClass = document.getElementById('acStudentsClass').value;
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
                    studentsClass: parseInt(studentsClass) || 60,
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
                document.getElementById('addClassModal').classList.remove('active');
                e.target.reset();
                renderMyClasses();
            } else {
                alert('Failed to add class: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.warn('Backend unavailable, saving class locally:', error);
            dataStore.subjects.push({
                id: Date.now(),
                name: subjectName,
                code: 'NEW',
                semester: semester,
                course: programName
            });
            dataStore.timetableData['Temp-' + Date.now()] = { subjectId: dataStore.subjects[dataStore.subjects.length - 1].id, facultyIds: [currentFaculty.id] };

            const modal = document.getElementById('addClassModal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
            e.target.reset();
            renderMyClasses();
            alert('✓ Class added successfully!');
        }
    });

    // --- 6. Task Assignment (To Students) ---
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
            } else if (res.status === 409 && data.alternative_dates) {
                showStudentWorkloadRecommendations(data, payload);
            } else {
                alert(`❌ ${data.message || 'Failed to assign work.'}${res.status === 409 ? ' Please validate again for current alternative dates.' : ''}`);
            }
        } catch (err) {
            console.error('Error while assigning student work:', err);
            alert('Could not save the assignment. Check your connection and try again.');
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
    }

    function showStudentWorkloadRecommendations(checkData, payload) {
        const modal = document.getElementById('studentWorkloadModal');
        const notice = document.getElementById('modalClassNotice');
        const summary = document.getElementById('modalWorkloadSummary');
        const colliding = document.getElementById('modalCollidingAssignments');
        const altList = document.getElementById('modalAlternativeDatesList');
        const workload = checkData.workload;

        notice.textContent = checkData.target_class
            ? `${checkData.target_class.course_name} (Sem ${checkData.target_class.semester})`
            : document.getElementById('workClassSelect').selectedOptions[0]?.textContent || 'Selected class';
        summary.innerHTML = `
            Target Date: <strong>${payload.due_date}</strong><br>
            Current Class Workload: <strong>${workload.current_daily_workload} pts</strong> + Task: <strong>${workload.task_difficulty ?? payload.difficulty} pts</strong> =
            <strong style="color:#e53e3e;">${workload.resulting_daily_workload} pts</strong> (Daily limit: ${workload.daily_threshold} pts).<br>
            Weekly workload: <strong>${workload.resulting_weekly_workload} / ${workload.weekly_threshold} pts</strong>.<br>
            <em>${checkData.reason || checkData.message || 'Workload limit exceeded.'}</em>
        `;

        const existingAssignments = checkData.existing_assignments || [];
        colliding.innerHTML = existingAssignments.length
            ? '<strong>Existing assignments due on this date:</strong><ul style="margin: 4px 0 0 16px;">' +
                existingAssignments.map(assignment => `<li>${assignment.subject_code} - ${assignment.title} (Level ${assignment.difficulty})</li>`).join('') +
                '</ul>'
            : '';

        altList.innerHTML = '';
        if (checkData.alternative_dates?.length) {
            checkData.alternative_dates.forEach(alternative => {
                const item = document.createElement('div');
                item.className = 'glass-card';
                item.style.cssText = 'padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid rgba(72, 187, 120, 0.4); background: rgba(72, 187, 120, 0.08); border-radius: 8px; transition: all 0.2s;';
                item.innerHTML = `
                    <div>
                        <strong style="color: #48bb78; font-size: 1rem;">📅 ${alternative.formatted_date}</strong>
                        <div style="font-size: 0.85rem; color: var(--text-light); margin-top: 2px;">
                            Daily: ${alternative.current_workload} pts → <strong>${alternative.resulting_workload} / ${alternative.threshold} pts</strong> ·
                            Weekly: <strong>${alternative.resulting_weekly_workload} / ${alternative.weekly_threshold} pts</strong>
                        </div>
                    </div>
                    <button type="button" class="btn-primary" style="padding: 6px 14px; font-size: 0.85rem;">Select & Assign</button>
                `;
                item.addEventListener('click', () => {
                    payload.due_date = alternative.date;
                    document.getElementById('workDeadline').value = alternative.date;
                    executeSaveStudentAssignment(payload);
                });
                altList.appendChild(item);
            });
        } else {
            altList.innerHTML = '<p style="color: var(--text-light);">No safe dates found in the next 14 days. Change the due date and validate again.</p>';
        }

        modal.style.display = 'flex';
    }

    document.getElementById('btnCancelAssignment')?.addEventListener('click', closeWorkloadModal);

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

            if (!checkRes.ok || !checkData.success) {
                alert(checkData.message || 'Workload validation failed.');
                return;
            }

            // 2. If NO collision/overload -> Directly create assignment
            if (checkData.can_assign) {
                await executeSaveStudentAssignment(payload);
                return;
            }

            showStudentWorkloadRecommendations(checkData, payload);

        } catch (err) {
            console.error('Workload check error:', err);
            alert('Could not verify student workload. The assignment was not saved; check your connection and try again.');
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
                    <td style="font-weight: 600; color: #4338ca;">${s.customId}</td>
                    <td style="font-weight: 500; color: #0f172a;">${s.name}</td>
                    <td><input type="number" class="assign-mark-input" value="${aScore}" min="0" max="100" style="width: 80px; padding: 6px 10px; border-radius: 6px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #0f172a; font-weight: 600;"></td>
                    <td><input type="number" class="exam-mark-input" value="${eScore}" min="0" max="100" style="width: 80px; padding: 6px 10px; border-radius: 6px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #0f172a; font-weight: 600;"></td>
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

    // --- 8. Student Grievances ---
    let facultyGrievances = [];
    let activeFacultyGrievance = null;

    function escapeGrievanceHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    let facultyHodDepartmentsLoaded = false;

    async function loadFacultyHodDepartments() {
        const select = document.getElementById('facultyGrievanceDepartment');
        if (!select || facultyHodDepartmentsLoaded) return;
        if (!authToken) {
            select.innerHTML = '<option value="">Sign in to load your department HODs</option>';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/grievances/faculty/hod-departments`, {
                headers: { 'Authorization': 'Bearer ' + authToken }
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load your department HODs.');
            }

            select.innerHTML = '<option value="">Select a department and HOD</option>';
            data.departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.id;
                option.textContent = `${department.name} — ${department.hod_name}`;
                select.appendChild(option);
            });
            if (data.departments.length === 0) {
                select.innerHTML = '<option value="">No department HOD is assigned to you</option>';
            }
            facultyHodDepartmentsLoaded = true;
        } catch (error) {
            console.error('Load faculty grievance HODs error:', error);
            select.innerHTML = '<option value="">Unable to load department HODs</option>';
        }
    }

    async function renderFacultyHodGrievances() {
        const tbody = document.getElementById('facultyHodGrievanceList');
        if (!tbody) return;
        if (!authToken) {
            tbody.innerHTML = '<tr><td colspan="6">Sign in to view grievances filed with your HOD.</td></tr>';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/grievances/faculty/hod`, {
                headers: { 'Authorization': 'Bearer ' + authToken }
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load your HOD grievances.');
            }

            if (data.grievances.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;">You have not filed any grievances with your HOD.</td></tr>';
                return;
            }

            tbody.innerHTML = data.grievances.map(grievance => {
                const status = grievance.resolved_at
                    ? 'Resolved by both parties'
                    : grievance.hod_resolved_at
                        ? 'HOD marked resolved — awaiting your confirmation'
                        : Date.parse(grievance.due_at) < Date.now()
                            ? 'Overdue — awaiting HOD'
                            : 'Awaiting HOD response';
                const confirmAction = grievance.hod_resolved_at && !grievance.faculty_confirmed_at && !grievance.resolved_at
                    ? `<button class="btn-primary" style="padding:4px 12px;" onclick="confirmFacultyHodGrievance(${grievance.id})">Confirm resolved</button>`
                    : '';
                return `
                    <tr>
                        <td>${escapeGrievanceHtml(new Date(grievance.created_at).toLocaleDateString())}</td>
                        <td>${escapeGrievanceHtml(grievance.hod_name)}</td>
                        <td><details><summary>${escapeGrievanceHtml(grievance.subject)}</summary><p>${escapeGrievanceHtml(grievance.details)}</p>${grievance.resolution_comment ? `<p><strong>HOD resolution comment:</strong> ${escapeGrievanceHtml(grievance.resolution_comment)}</p>` : ''}</details></td>
                        <td>${escapeGrievanceHtml(new Date(grievance.due_at).toLocaleString())}</td>
                        <td>${escapeGrievanceHtml(status)}</td>
                        <td>${confirmAction}</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Load faculty-to-HOD grievances error:', error);
            tbody.innerHTML = `<tr><td colspan="6" role="alert">${escapeGrievanceHtml(error.message)}</td></tr>`;
        }
    }

    async function renderGrievances() {
        loadFacultyHodDepartments();
        renderFacultyHodGrievances();

        const tbody = document.getElementById('myGrievanceList');
        if (!tbody) return;
        if (!authToken) {
            tbody.innerHTML = '<tr><td colspan="6">Sign in to view student grievances assigned to you.</td></tr>';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/grievances/faculty`, {
                headers: { 'Authorization': 'Bearer ' + authToken }
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load student grievances.');
            }

            facultyGrievances = data.grievances;
            if (facultyGrievances.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;">No student grievances are assigned to you.</td></tr>';
                return;
            }

            tbody.innerHTML = facultyGrievances.map(grievance => {
                const status = grievance.resolved_at
                    ? 'Resolved by both parties'
                    : grievance.status === 'escalated'
                        ? 'Escalated to HOD'
                        : grievance.faculty_resolved_at
                            ? 'Awaiting student confirmation'
                            : 'Needs your attention';
                return `
                    <tr>
                        <td>${escapeGrievanceHtml(new Date(grievance.created_at).toLocaleDateString())}</td>
                        <td>${escapeGrievanceHtml(grievance.student_name)}</td>
                        <td>${escapeGrievanceHtml(grievance.subject)}</td>
                        <td>${escapeGrievanceHtml(new Date(grievance.due_at).toLocaleString())}</td>
                        <td>${escapeGrievanceHtml(status)}</td>
                        <td><button class="btn-primary" style="padding:4px 12px;" onclick="viewMyGrievance(${grievance.id})">View</button></td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Load faculty grievances error:', error);
            tbody.innerHTML = `<tr><td colspan="6" role="alert">${escapeGrievanceHtml(error.message)}</td></tr>`;
        }
    }

    document.getElementById('facultyHodGrievanceForm')?.addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_URL}/api/grievances/faculty/hod`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + authToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    department_id: document.getElementById('facultyGrievanceDepartment').value,
                    category: document.getElementById('facultyGrievanceCategory').value,
                    subject: document.getElementById('facultyGrievanceSubject').value,
                    details: document.getElementById('facultyGrievanceDetails').value
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not file grievance with your HOD.');
            }

            form.reset();
            await renderFacultyHodGrievances();
            alert(data.message);
        } catch (error) {
            console.error('File faculty grievance to HOD error:', error);
            alert(error.message);
        } finally {
            submitButton.disabled = false;
        }
    });

    window.confirmFacultyHodGrievance = async function(grievanceId) {
        try {
            const response = await fetch(`${API_URL}/api/grievances/${grievanceId}/faculty-confirmed`, {
                method: 'PATCH',
                headers: { 'Authorization': 'Bearer ' + authToken }
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not confirm grievance resolution.');
            }
            await renderFacultyHodGrievances();
            alert(data.message);
        } catch (error) {
            console.error('Confirm faculty grievance resolution error:', error);
            alert(error.message);
        }
    };

    window.viewMyGrievance = function(id) {
        const grievance = facultyGrievances.find(item => item.id === id);
        if (!grievance) return;
        activeFacultyGrievance = grievance;

        const facultyStatus = grievance.faculty_resolved_at ? 'Marked resolved' : 'Not marked resolved';
        const studentStatus = grievance.student_resolved_at ? 'Confirmed resolved' : 'Not confirmed';
        document.getElementById('viewGrievanceDetails').innerHTML = `
            <p><strong>Student:</strong> ${escapeGrievanceHtml(grievance.student_name)}</p>
            <p><strong>Department:</strong> ${escapeGrievanceHtml(grievance.department_name)}</p>
            <p><strong>Category:</strong> ${escapeGrievanceHtml(grievance.category)}</p>
            <p><strong>Subject:</strong> ${escapeGrievanceHtml(grievance.subject)}</p>
            <p><strong>Description:</strong></p>
            <p style="white-space:pre-wrap; padding:12px; background:#f1f5f9; border-radius:8px;">${escapeGrievanceHtml(grievance.details)}</p>
            <p><strong>Filed:</strong> ${escapeGrievanceHtml(new Date(grievance.created_at).toLocaleString())}</p>
            <p><strong>7-day deadline:</strong> ${escapeGrievanceHtml(new Date(grievance.due_at).toLocaleString())}</p>
            <p><strong>Faculty:</strong> ${facultyStatus} · <strong>Student:</strong> ${studentStatus}</p>
            ${grievance.resolution_comment ? `<p><strong>Resolution comment:</strong></p><p style="white-space:pre-wrap; padding:12px; background:#f1f5f9; border-radius:8px;">${escapeGrievanceHtml(grievance.resolution_comment)}</p>` : ''}
            ${grievance.status === 'escalated' ? '<p style="color:#b45309; font-weight:600;">This grievance has been escalated to your HOD.</p>' : ''}
        `;

        const resolveButton = document.getElementById('facultyResolveGrievanceBtn');
        resolveButton.hidden = Boolean(grievance.faculty_resolved_at || grievance.resolved_at);
        document.getElementById('facultyResolutionCommentField').hidden = resolveButton.hidden;
        document.getElementById('facultyResolutionComment').value = '';
        document.getElementById('viewGrievanceModal').classList.add('active');
    };

    document.getElementById('facultyResolveGrievanceBtn')?.addEventListener('click', async () => {
        if (!activeFacultyGrievance) return;
        const resolveButton = document.getElementById('facultyResolveGrievanceBtn');
        resolveButton.disabled = true;

        try {
            const response = await fetch(`${API_URL}/api/grievances/${activeFacultyGrievance.id}/faculty-resolved`, {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + authToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resolution_comment: document.getElementById('facultyResolutionComment').value
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not mark grievance resolved.');
            }

            document.getElementById('viewGrievanceModal').classList.remove('active');
            await renderGrievances();
            alert(data.message);
        } catch (error) {
            console.error('Mark faculty grievance resolved error:', error);
            alert(error.message);
        } finally {
            resolveButton.disabled = false;
        }
    });

    document.getElementById('closeViewGrievanceModal')?.addEventListener('click', () => {
        document.getElementById('viewGrievanceModal').classList.remove('active');
    });

    window.setInterval(() => {
        if (document.getElementById('grievances')?.classList.contains('active')) {
            renderGrievances();
        }
    }, 60_000);

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

    // =========================================================================
    // --- MULTI-DOMAIN WORKLOAD MANAGEMENT (Department, Institutional, Extra, FDP, Research, Consultancy) ---
    // =========================================================================

    const MULTI_DOMAIN_CATALOGS = {
        Department: {
            name: 'Department Workload',
            icon: 'account_tree',
            badgeBg: '#eff6ff',
            badgeColor: '#1e40af',
            badgeBorder: '#bfdbfe',
            roles: [
                { id: 'R01', name: 'Head of the Department', summary: 'Workload allocation, subject allotment, budget, procurement, departmental coordination.' },
                { id: 'R02', name: 'Assistant Head of Department', summary: 'Supports HOD; monitors classes/attendance, academic schedule, SOP compliance.' },
                { id: 'R03', name: 'DQAC', summary: 'Quality policies, quality records, feedback, academic audit, result analysis, remedial monitoring.' },
                { id: 'R04', name: 'PAQIC', summary: 'PO/PSO/PEO monitoring, stakeholder feedback, CO-PO mapping, course-file verification.' },
                { id: 'R05', name: 'Programme Coordinator', summary: 'Programme quality, outcomes, stakeholder interaction, curriculum review, budgets, SAR.' },
                { id: 'R06', name: 'Academic Coordinator', summary: 'Academic calendar, course schedules, faculty workloads, timetables, academic monitoring.' },
                { id: 'R07', name: 'Faculty Advisor', summary: 'Student guidance/counselling, attendance, feedback, class/advisory/PTA meetings, remedial action.' },
                { id: 'R08', name: 'Subject Group Coordinator', summary: 'Curriculum/course delivery, assessment quality, CO-PO mapping, lesson plans, course files.' },
                { id: 'R09', name: 'Department Placement Coordinator', summary: 'Placement-cell liaison, eligibility lists, training attendance, performance analysis.' },
                { id: 'R10', name: 'Department AMS Coordinator', summary: 'Course setup, faculty allocation, timetable support, quizzes/exams, monitoring and reports.' },
                { id: 'R11', name: 'Lab In-charge', summary: 'Equipment availability, requirements, stock records, cleanliness, maintenance, manuals.' },
                { id: 'R12', name: 'Department SWAYAM/NPTEL Coordinator', summary: 'Department-level SWAYAM/NPTEL coordination and student participation monitoring.' },
                { id: 'R13', name: 'SWAYAM/NPTEL Mentor', summary: 'Mentoring and support for students participating in SWAYAM/NPTEL courses.' },
                { id: 'R14', name: 'Department Time-Table Coordinator', summary: 'Department timetable preparation, room/lab allocation, updates and discrepancy handling.' },
                { id: 'R15', name: 'Department Library In-charge', summary: 'Department library management, book records, issue monitoring and cataloging.' },
                { id: 'R16', name: 'Department Advisory Committee (DAC)', summary: 'Department advisory meetings, industry-academia interaction, strategic development.' }
            ],
            tasks: [
                { id: 'T001', role_id: 'R07', role_name: 'Faculty Advisor', responsibility_task: 'Attendance monitoring', work_unit: 'Student', std_effort: 0.03, occurrences_per_semester: 16, complexity_factor: 1.0 },
                { id: 'T002', role_id: 'R07', role_name: 'Faculty Advisor', responsibility_task: 'Student counselling / progress review', work_unit: 'Student', std_effort: 0.08, occurrences_per_semester: 4, complexity_factor: 1.25 },
                { id: 'T003', role_id: 'R07', role_name: 'Faculty Advisor', responsibility_task: 'Parent / PTA meeting', work_unit: 'Meeting', std_effort: 1.5, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T004', role_id: 'R07', role_name: 'Faculty Advisor', responsibility_task: 'Class / advisory committee meeting', work_unit: 'Meeting', std_effort: 1.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T005', role_id: 'R07', role_name: 'Faculty Advisor', responsibility_task: 'Remedial action coordination', work_unit: 'Student', std_effort: 0.1, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T006', role_id: 'R07', role_name: 'Faculty Advisor', responsibility_task: 'Student records / reports', work_unit: 'Student', std_effort: 0.03, occurrences_per_semester: 4, complexity_factor: 1.0 },
                { id: 'T007', role_id: 'R03', role_name: 'DQAC', responsibility_task: 'Quality records maintenance', work_unit: 'Record set', std_effort: 3.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T008', role_id: 'R03', role_name: 'DQAC', responsibility_task: 'Academic audit / result analysis', work_unit: 'Audit', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T009', role_id: 'R03', role_name: 'DQAC', responsibility_task: 'Stakeholder feedback collection/analysis', work_unit: 'Survey cycle', std_effort: 2.5, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T010', role_id: 'R03', role_name: 'DQAC', responsibility_task: 'Quality workshop / seminar coordination', work_unit: 'Event', std_effort: 4.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T011', role_id: 'R03', role_name: 'DQAC', responsibility_task: 'AQAR/SSR/SAR/quality report preparation', work_unit: 'Report', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T012', role_id: 'R04', role_name: 'PAQIC', responsibility_task: 'CO-PO/PSO mapping verification', work_unit: 'Course', std_effort: 0.5, occurrences_per_semester: 1, complexity_factor: 1.25 },
                { id: 'T013', role_id: 'R04', role_name: 'PAQIC', responsibility_task: 'Course-file verification', work_unit: 'Course', std_effort: 0.75, occurrences_per_semester: 1, complexity_factor: 1.25 },
                { id: 'T014', role_id: 'R04', role_name: 'PAQIC', responsibility_task: 'Survey analysis / stakeholder review', work_unit: 'Survey cycle', std_effort: 2.5, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T015', role_id: 'R04', role_name: 'PAQIC', responsibility_task: 'Programme outcome / attainment review', work_unit: 'Review', std_effort: 4.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T016', role_id: 'R05', role_name: 'Programme Coordinator', responsibility_task: 'Programme review / improvement', work_unit: 'Review', std_effort: 4.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T017', role_id: 'R05', role_name: 'Programme Coordinator', responsibility_task: 'SAR / programme documentation', work_unit: 'Report', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T018', role_id: 'R05', role_name: 'Programme Coordinator', responsibility_task: 'Stakeholder/alumni interaction', work_unit: 'Meeting', std_effort: 1.5, occurrences_per_semester: 4, complexity_factor: 1.25 },
                { id: 'T019', role_id: 'R06', role_name: 'Academic Coordinator', responsibility_task: 'Academic calendar / planning', work_unit: 'Plan', std_effort: 4.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T020', role_id: 'R06', role_name: 'Academic Coordinator', responsibility_task: 'Faculty workload / course scheduling', work_unit: 'Planning cycle', std_effort: 4.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T021', role_id: 'R06', role_name: 'Academic Coordinator', responsibility_task: 'Assessment planning / monitoring', work_unit: 'Planning cycle', std_effort: 3.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T022', role_id: 'R06', role_name: 'Academic Coordinator', responsibility_task: 'Academic report preparation', work_unit: 'Report', std_effort: 3.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T023', role_id: 'R08', role_name: 'Subject Group Coordinator', responsibility_task: 'Curriculum/course review', work_unit: 'Course', std_effort: 0.75, occurrences_per_semester: 1, complexity_factor: 1.25 },
                { id: 'T024', role_id: 'R08', role_name: 'Subject Group Coordinator', responsibility_task: 'Assessment / assignment review', work_unit: 'Course', std_effort: 0.5, occurrences_per_semester: 1, complexity_factor: 1.25 },
                { id: 'T025', role_id: 'R08', role_name: 'Subject Group Coordinator', responsibility_task: 'Course-file / lesson-plan review', work_unit: 'Course', std_effort: 0.5, occurrences_per_semester: 1, complexity_factor: 1.25 },
                { id: 'T026', role_id: 'R08', role_name: 'Subject Group Coordinator', responsibility_task: 'Subject-group meeting', work_unit: 'Meeting', std_effort: 1.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T027', role_id: 'R09', role_name: 'Placement Coordinator', responsibility_task: 'Placement Cell communication', work_unit: 'Communication cycle', std_effort: 0.5, occurrences_per_semester: 12, complexity_factor: 1.0 },
                { id: 'T028', role_id: 'R09', role_name: 'Placement Coordinator', responsibility_task: 'Placement eligibility verification', work_unit: 'Student', std_effort: 0.03, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T029', role_id: 'R09', role_name: 'Placement Coordinator', responsibility_task: 'Placement training attendance/report', work_unit: 'Session', std_effort: 0.75, occurrences_per_semester: 10, complexity_factor: 1.25 },
                { id: 'T030', role_id: 'R09', role_name: 'Placement Coordinator', responsibility_task: 'Placement-test performance analysis', work_unit: 'Test', std_effort: 1.5, occurrences_per_semester: 6, complexity_factor: 1.25 },
                { id: 'T031', role_id: 'R09', role_name: 'Placement Coordinator', responsibility_task: 'Alumni interaction', work_unit: 'Interaction', std_effort: 0.75, occurrences_per_semester: 6, complexity_factor: 1.0 },
                { id: 'T032', role_id: 'R10', role_name: 'AMS Coordinator', responsibility_task: 'Course setup / maintenance', work_unit: 'Course', std_effort: 0.5, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'T033', role_id: 'R10', role_name: 'AMS Coordinator', responsibility_task: 'Content / assessment upload support', work_unit: 'Course', std_effort: 0.5, occurrences_per_semester: 4, complexity_factor: 1.0 },
                { id: 'T034', role_id: 'R10', role_name: 'AMS Coordinator', responsibility_task: 'AMS issue resolution', work_unit: 'Issue', std_effort: 0.25, occurrences_per_semester: 20, complexity_factor: 1.25 },
                { id: 'T035', role_id: 'R10', role_name: 'AMS Coordinator', responsibility_task: 'AMS report generation', work_unit: 'Report', std_effort: 1.0, occurrences_per_semester: 4, complexity_factor: 1.25 },
                { id: 'T036', role_id: 'R11', role_name: 'Lab In-charge', responsibility_task: 'Equipment / stock verification', work_unit: 'Lab', std_effort: 3.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T037', role_id: 'R11', role_name: 'Lab In-charge', responsibility_task: 'Maintenance coordination', work_unit: 'Maintenance event', std_effort: 0.75, occurrences_per_semester: 12, complexity_factor: 1.25 },
                { id: 'T038', role_id: 'R11', role_name: 'Lab In-charge', responsibility_task: 'Purchase / consumable requirement', work_unit: 'Purchase request', std_effort: 0.5, occurrences_per_semester: 6, complexity_factor: 1.25 },
                { id: 'T039', role_id: 'R11', role_name: 'Lab In-charge', responsibility_task: 'Laboratory cleanliness / readiness check', work_unit: 'Lab', std_effort: 0.5, occurrences_per_semester: 16, complexity_factor: 1.0 },
                { id: 'T040', role_id: 'R12', role_name: 'Department SWAYAM/NPTEL Coordinator', responsibility_task: 'Department monitoring / coordination', work_unit: 'Coordination cycle', std_effort: 1.5, occurrences_per_semester: 4, complexity_factor: 1.25 },
                { id: 'T041', role_id: 'R13', role_name: 'SWAYAM/NPTEL Mentor', responsibility_task: 'Student mentoring', work_unit: 'Student', std_effort: 0.05, occurrences_per_semester: 4, complexity_factor: 1.0 },
                { id: 'T042', role_id: 'R14', role_name: 'Time-Table Coordinator', responsibility_task: 'Semester timetable preparation', work_unit: 'Planning cycle', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'T043', role_id: 'R14', role_name: 'Time-Table Coordinator', responsibility_task: 'Timetable change / discrepancy handling', work_unit: 'Change', std_effort: 0.5, occurrences_per_semester: 20, complexity_factor: 1.25 },
                { id: 'T044', role_id: 'R15', role_name: 'Library In-charge', responsibility_task: 'Library records / coordination', work_unit: 'Cycle', std_effort: 1.5, occurrences_per_semester: 4, complexity_factor: 1.0 },
                { id: 'T045', role_id: 'R16', role_name: 'DAC', responsibility_task: 'Advisory meeting / coordination', work_unit: 'Meeting', std_effort: 1.5, occurrences_per_semester: 2, complexity_factor: 1.25 }
            ]
        },

        Institutional: {
            name: 'Institutional Work',
            icon: 'corporate_fare',
            badgeBg: '#e0f2fe',
            badgeColor: '#0369a1',
            badgeBorder: '#bae6fd',
            roles: [
                { id: 'INS01', name: 'Internal Quality Assurance Cell (IQAC)', summary: 'Institutional quality assurance, NAAC accreditation, NIRF ranking, academic audits and AQAR.' },
                { id: 'INS02', name: 'College Examination Cell', summary: 'Conduct of university/autonomous semester exams, central valuation camps, exam discipline.' },
                { id: 'INS03', name: 'Central Admissions Committee', summary: 'Institutional admissions, verification, helpdesk and government portal collation.' },
                { id: 'INS04', name: 'Campus Life & Student Welfare', summary: 'Hostel administration, anti-ragging squad, student discipline, Internal Complaints Committee.' },
                { id: 'INS05', name: 'Central Training & Placement Cell', summary: 'College-wide placement drives, corporate relations, industry MoUs and skill enhancement.' },
                { id: 'INS06', name: 'Institutional Statutory Bodies', summary: 'Academic Council, Board of Studies, Governing Body faculty representation.' }
            ],
            tasks: [
                { id: 'INST01', role_id: 'INS01', role_name: 'IQAC', responsibility_task: 'IQAC College Coordinator / Member Secretary', work_unit: 'Cycle', std_effort: 4.0, occurrences_per_semester: 8, complexity_factor: 1.5 },
                { id: 'INST02', role_id: 'INS01', role_name: 'IQAC', responsibility_task: 'NAAC / NBA Institutional Criteria Lead', work_unit: 'Criterion', std_effort: 6.0, occurrences_per_semester: 4, complexity_factor: 1.5 },
                { id: 'INST03', role_id: 'INS01', role_name: 'IQAC', responsibility_task: 'NIRF Data Collation & Verification', work_unit: 'Submission', std_effort: 8.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'INST04', role_id: 'INS01', role_name: 'IQAC', responsibility_task: 'Academic and Administrative Audit (AAA) Team', work_unit: 'Audit', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'INST05', role_id: 'INS01', role_name: 'IQAC', responsibility_task: 'AQAR Annual Report Compilation', work_unit: 'Report', std_effort: 6.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'INST06', role_id: 'INS02', role_name: 'Examination Cell', responsibility_task: 'Controller of Examinations (COE) / Deputy COE', work_unit: 'Exam Cycle', std_effort: 6.0, occurrences_per_semester: 4, complexity_factor: 1.5 },
                { id: 'INST07', role_id: 'INS02', role_name: 'Examination Cell', responsibility_task: 'Chief Superintendent / University Exam Officer', work_unit: 'Session', std_effort: 3.5, occurrences_per_semester: 8, complexity_factor: 1.25 },
                { id: 'INST08', role_id: 'INS02', role_name: 'Examination Cell', responsibility_task: 'Central Valuation Camp Officer / Chairman', work_unit: 'Camp', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'INST09', role_id: 'INS02', role_name: 'Examination Cell', responsibility_task: 'Malpractice Enquiry Committee Member', work_unit: 'Case', std_effort: 2.0, occurrences_per_semester: 4, complexity_factor: 1.0 },
                { id: 'INST10', role_id: 'INS03', role_name: 'Central Admissions', responsibility_task: 'Institutional Admission In-charge / Verification', work_unit: 'Day', std_effort: 4.0, occurrences_per_semester: 10, complexity_factor: 1.25 },
                { id: 'INST11', role_id: 'INS03', role_name: 'Central Admissions', responsibility_task: 'Admission Helpdesk & Candidate Counselling', work_unit: 'Session', std_effort: 3.0, occurrences_per_semester: 6, complexity_factor: 1.0 },
                { id: 'INST12', role_id: 'INS04', role_name: 'Student Welfare', responsibility_task: 'Chief Warden / Resident Hostel Warden', work_unit: 'Month', std_effort: 5.0, occurrences_per_semester: 5, complexity_factor: 1.5 },
                { id: 'INST13', role_id: 'INS04', role_name: 'Student Welfare', responsibility_task: 'Anti-Ragging Squad / Committee Convener', work_unit: 'Inspection', std_effort: 2.0, occurrences_per_semester: 8, complexity_factor: 1.25 },
                { id: 'INST14', role_id: 'INS04', role_name: 'Student Welfare', responsibility_task: 'Disciplinary Committee / Campus Vigil', work_unit: 'Duty Cycle', std_effort: 2.0, occurrences_per_semester: 6, complexity_factor: 1.0 },
                { id: 'INST15', role_id: 'INS04', role_name: 'Student Welfare', responsibility_task: 'Internal Complaints Committee (ICC) / POSH', work_unit: 'Meeting', std_effort: 3.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'INST16', role_id: 'INS05', role_name: 'Central Placement', responsibility_task: 'Institute Placement & Corporate Relations Lead', work_unit: 'Drive', std_effort: 4.0, occurrences_per_semester: 8, complexity_factor: 1.5 },
                { id: 'INST17', role_id: 'INS05', role_name: 'Central Placement', responsibility_task: 'Campus Recruitment Training (CRT) Coordinator', work_unit: 'Batch', std_effort: 3.0, occurrences_per_semester: 6, complexity_factor: 1.25 },
                { id: 'INST18', role_id: 'INS06', role_name: 'Statutory Bodies', responsibility_task: 'Academic Council / Governing Body Member', work_unit: 'Meeting', std_effort: 3.0, occurrences_per_semester: 3, complexity_factor: 1.5 },
                { id: 'INST19', role_id: 'INS06', role_name: 'Statutory Bodies', responsibility_task: 'Board of Studies (BOS) Institutional Member', work_unit: 'Meeting', std_effort: 4.0, occurrences_per_semester: 2, complexity_factor: 1.25 }
            ]
        },

        ExtraProactive: {
            name: 'Extra Work Done Proactively',
            icon: 'rocket_launch',
            badgeBg: '#ecfdf5',
            badgeColor: '#047857',
            badgeBorder: '#a7f3d0',
            roles: [
                { id: 'EXT01', name: 'Student Technical Clubs & Chapters', summary: 'Mentoring student technical clubs, coding forums, competitive programming, and hackathon teams.' },
                { id: 'EXT02', name: 'Tech Fests & Symposia', summary: 'Organizing national technical fests, project expos, Maker fairs, and open source communities.' },
                { id: 'EXT03', name: 'Media, Web & Public Relations', summary: 'Institutional newsletter editing, website curation, press releases and promotional content.' },
                { id: 'EXT04', name: 'Community Outreach & Social Initiatives', summary: 'Unnat Bharat Abhiyan (UBA), NSS programs, and rural technical literacy workshops.' }
            ],
            tasks: [
                { id: 'EX01', role_id: 'EXT01', role_name: 'Technical Clubs', responsibility_task: 'Faculty Advisor for Coding Club / Google DSC / ACM / CSI', work_unit: 'Month', std_effort: 2.5, occurrences_per_semester: 5, complexity_factor: 1.25 },
                { id: 'EX02', role_id: 'EXT01', role_name: 'Technical Clubs', responsibility_task: 'Organizing Hackathons / 24-hr Coding Contests', work_unit: 'Event', std_effort: 6.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'EX03', role_id: 'EXT01', role_name: 'Technical Clubs', responsibility_task: 'Mentoring Teams for Smart India Hackathon (SIH)', work_unit: 'Team', std_effort: 3.0, occurrences_per_semester: 4, complexity_factor: 1.25 },
                { id: 'EX04', role_id: 'EXT02', role_name: 'Tech Fests', responsibility_task: 'Faculty Convener for Annual National Tech Fest / Symposium', work_unit: 'Event', std_effort: 8.0, occurrences_per_semester: 1, complexity_factor: 1.5 },
                { id: 'EX05', role_id: 'EXT02', role_name: 'Tech Fests', responsibility_task: 'Project Exhibition & Maker Fair Coordinator', work_unit: 'Exhibition', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'EX06', role_id: 'EXT02', role_name: 'Tech Fests', responsibility_task: 'Open Source / Linux Users Group (LUG) Mentorship', work_unit: 'Workshop', std_effort: 3.0, occurrences_per_semester: 4, complexity_factor: 1.0 },
                { id: 'EX07', role_id: 'EXT03', role_name: 'Media & PR', responsibility_task: 'Institute / Department Newsletter Chief Editor', work_unit: 'Issue', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'EX08', role_id: 'EXT03', role_name: 'Media & PR', responsibility_task: 'Website Content Maintenance & News Curation', work_unit: 'Update Cycle', std_effort: 1.5, occurrences_per_semester: 10, complexity_factor: 1.0 },
                { id: 'EX09', role_id: 'EXT03', role_name: 'Media & PR', responsibility_task: 'Official Social Media & Press Release Management', work_unit: 'Month', std_effort: 2.0, occurrences_per_semester: 5, complexity_factor: 1.0 },
                { id: 'EX10', role_id: 'EXT04', role_name: 'Community Outreach', responsibility_task: 'NSS / Unnat Bharat Abhiyan (UBA) Faculty Officer', work_unit: 'Activity', std_effort: 4.0, occurrences_per_semester: 4, complexity_factor: 1.25 },
                { id: 'EX11', role_id: 'EXT04', role_name: 'Community Outreach', responsibility_task: 'Technical Literacy Outreach for Local Community', work_unit: 'Session', std_effort: 2.5, occurrences_per_semester: 4, complexity_factor: 1.0 }
            ]
        },

        FDP_Workshop: {
            name: 'FDPs & Workshops Conducted & Attended',
            icon: 'school',
            badgeBg: '#fffbeb',
            badgeColor: '#b45309',
            badgeBorder: '#fde68a',
            roles: [
                { id: 'FDP01', name: 'FDPs & STTPs Conducted', summary: 'Coordinating AICTE, KTU, ISTE sponsored faculty development and short term training programs.' },
                { id: 'FDP02', name: 'Hands-on Workshops Conducted', summary: 'Conducting specialized technological bootcamps (AI, Cloud, Full Stack, DevOps, Security).' },
                { id: 'FDP03', name: 'Resource Person & Expert Talks', summary: 'Keynote speaking and expert session delivery at universities, research bodies, and industry webinars.' },
                { id: 'FDP04', name: 'Professional Training Attended', summary: 'Attending FDPs, STTPs, industrial training, and earning advanced MOOC certifications.' }
            ],
            tasks: [
                { id: 'FD01', role_id: 'FDP01', role_name: 'FDPs Conducted', responsibility_task: 'Coordinator for AICTE/KTU Approved 1-Week or 2-Week FDP', work_unit: 'Program', std_effort: 10.0, occurrences_per_semester: 1, complexity_factor: 1.5 },
                { id: 'FD02', role_id: 'FDP01', role_name: 'FDPs Conducted', responsibility_task: 'Co-Coordinator for National / International Technical STTP', work_unit: 'Program', std_effort: 6.0, occurrences_per_semester: 1, complexity_factor: 1.25 },
                { id: 'FD03', role_id: 'FDP02', role_name: 'Workshops Conducted', responsibility_task: 'Organizing 2-3 Day Specialized Technology Bootcamp', work_unit: 'Workshop', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'FD04', role_id: 'FDP02', role_name: 'Workshops Conducted', responsibility_task: 'Student Skill-Bridge Workshop Coordinator', work_unit: 'Workshop', std_effort: 3.5, occurrences_per_semester: 3, complexity_factor: 1.0 },
                { id: 'FD05', role_id: 'FDP03', role_name: 'Resource Person', responsibility_task: 'Resource Person / Keynote Speaker at External College', work_unit: 'Talk', std_effort: 3.0, occurrences_per_semester: 4, complexity_factor: 1.5 },
                { id: 'FD06', role_id: 'FDP03', role_name: 'Resource Person', responsibility_task: 'Session Chair / Reviewer at IEEE / Springer Conference', work_unit: 'Conference', std_effort: 4.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'FD07', role_id: 'FDP04', role_name: 'Training Attended', responsibility_task: 'Attended 5-Day / 10-Day Approved FDP / Industrial Training', work_unit: 'Program', std_effort: 6.0, occurrences_per_semester: 2, complexity_factor: 1.0 },
                { id: 'FD08', role_id: 'FDP04', role_name: 'Training Attended', responsibility_task: 'Completed NPTEL / SWAYAM / Coursera MOOC Certification', work_unit: 'Course', std_effort: 8.0, occurrences_per_semester: 1, complexity_factor: 1.25 }
            ]
        },

        Research: {
            name: 'Own Research Workload',
            icon: 'biotech',
            badgeBg: '#f3e8ff',
            badgeColor: '#7e22ce',
            badgeBorder: '#d8b4fe',
            roles: [
                { id: 'RES01', name: 'Sponsored & Funded Research Projects', summary: 'Principal Investigator or Co-PI for funded projects from DST, SERB, AICTE, and Industry.' },
                { id: 'RES02', name: 'Doctoral & Masters Research Guidance', summary: 'Guiding PhD scholars, MCA & M.Tech final year research projects, and viva voce examiners.' },
                { id: 'RES03', name: 'Research Publications & Dissemination', summary: 'Authoring publications in SCI/Scopus indexed journals, international conferences, and books.' },
                { id: 'RES04', name: 'Intellectual Property & Patents', summary: 'Filing, publishing, and granting technological patents and software copyrights.' }
            ],
            tasks: [
                { id: 'RS01', role_id: 'RES01', role_name: 'Sponsored Projects', responsibility_task: 'Principal Investigator (PI) for Major Funded Research Grant', work_unit: 'Project', std_effort: 8.0, occurrences_per_semester: 4, complexity_factor: 1.5 },
                { id: 'RS02', role_id: 'RES01', role_name: 'Sponsored Projects', responsibility_task: 'Co-PI for Funded Research Project', work_unit: 'Project', std_effort: 4.0, occurrences_per_semester: 4, complexity_factor: 1.25 },
                { id: 'RS03', role_id: 'RES01', role_name: 'Sponsored Projects', responsibility_task: 'Research Grant Proposal Preparation & Submission', work_unit: 'Proposal', std_effort: 6.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'RS04', role_id: 'RES02', role_name: 'Research Guidance', responsibility_task: 'PhD Research Scholar Supervision (per active scholar)', work_unit: 'Scholar', std_effort: 3.0, occurrences_per_semester: 8, complexity_factor: 1.5 },
                { id: 'RS05', role_id: 'RES02', role_name: 'Research Guidance', responsibility_task: 'MCA / M.Tech Research Project & Dissertation Guide [23MCAN402]', work_unit: 'Student/Team', std_effort: 2.0, occurrences_per_semester: 12, complexity_factor: 1.25 },
                { id: 'RS06', role_id: 'RES02', role_name: 'Research Guidance', responsibility_task: 'Doctoral Viva Voce / Thesis External Examiner', work_unit: 'Examination', std_effort: 4.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'RS07', role_id: 'RES03', role_name: 'Publications', responsibility_task: 'Publication in SCI / SCIE / Scopus Q1/Q2 Indexed Journal', work_unit: 'Paper', std_effort: 12.0, occurrences_per_semester: 1, complexity_factor: 1.5 },
                { id: 'RS08', role_id: 'RES03', role_name: 'Publications', responsibility_task: 'Publication in Scopus Indexed International IEEE Conference', work_unit: 'Paper', std_effort: 8.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'RS09', role_id: 'RES03', role_name: 'Publications', responsibility_task: 'Book / Book Chapter Published with Reputed Academic Publisher', work_unit: 'Chapter', std_effort: 6.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'RS10', role_id: 'RES04', role_name: 'Patents & IPR', responsibility_task: 'Patent Filing / Official Publication', work_unit: 'Patent', std_effort: 10.0, occurrences_per_semester: 1, complexity_factor: 1.5 },
                { id: 'RS11', role_id: 'RES04', role_name: 'Patents & IPR', responsibility_task: 'Patent Granted / Technology Commercialization', work_unit: 'Patent', std_effort: 15.0, occurrences_per_semester: 1, complexity_factor: 2.0 }
            ]
        },

        Consultancy: {
            name: 'Consultancy & Technical Services',
            icon: 'handshake',
            badgeBg: '#ccfbf1',
            badgeColor: '#0f766e',
            badgeBorder: '#99f6e4',
            roles: [
                { id: 'CON01', name: 'Industrial Software Development', summary: 'Industrial software architecture, full-stack systems development, and corporate cloud migration.' },
                { id: 'CON02', name: 'Testing, Auditing & Quality Services', summary: 'Cybersecurity vulnerability audit, code compliance checking, and performance engineering.' },
                { id: 'CON03', name: 'Corporate Training & Executive Education', summary: 'Delivering tailored technical upskilling and training bootcamps to corporate IT staff.' },
                { id: 'CON04', name: 'Institutional Revenue & Incubation', summary: 'External consultancy projects generating institutional revenue, and mentoring campus startups.' }
            ],
            tasks: [
                { id: 'CN01', role_id: 'CON01', role_name: 'Software Consultancy', responsibility_task: 'Industrial Software Product Architecture & Lead Developer', work_unit: 'Project', std_effort: 10.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'CN02', role_id: 'CON01', role_name: 'Software Consultancy', responsibility_task: 'Technical Consulting & System Modernization', work_unit: 'Contract', std_effort: 6.0, occurrences_per_semester: 4, complexity_factor: 1.25 },
                { id: 'CN03', role_id: 'CON02', role_name: 'Auditing Services', responsibility_task: 'Cybersecurity Audit / Web Application Penetration Testing', work_unit: 'Audit', std_effort: 8.0, occurrences_per_semester: 2, complexity_factor: 1.5 },
                { id: 'CN04', role_id: 'CON02', role_name: 'Auditing Services', responsibility_task: 'Software Quality & Performance Stress Testing for Client', work_unit: 'Test Cycle', std_effort: 5.0, occurrences_per_semester: 3, complexity_factor: 1.25 },
                { id: 'CN05', role_id: 'CON03', role_name: 'Corporate Training', responsibility_task: 'Delivering Customized Technical Corporate Training', work_unit: 'Day', std_effort: 6.0, occurrences_per_semester: 4, complexity_factor: 1.5 },
                { id: 'CN06', role_id: 'CON03', role_name: 'Corporate Training', responsibility_task: 'Corporate Upskilling Curriculum Design & Delivery', work_unit: 'Module', std_effort: 5.0, occurrences_per_semester: 2, complexity_factor: 1.25 },
                { id: 'CN07', role_id: 'CON04', role_name: 'Revenue & Incubation', responsibility_task: 'Industry Consultancy Generating Institutional Revenue', work_unit: 'Project', std_effort: 12.0, occurrences_per_semester: 1, complexity_factor: 1.5 },
                { id: 'CN08', role_id: 'CON04', role_name: 'Revenue & Incubation', responsibility_task: 'Incubation & Tech Startup Mentoring on Campus', work_unit: 'Startup', std_effort: 4.0, occurrences_per_semester: 4, complexity_factor: 1.25 }
            ]
        }
    };

    const DOMAIN_SECTIONS = {
        Department: {
            tableId: 'facultyDeptWorkloadList',
            kpiTotalId: 'deptKpiTotalHours',
            kpiCountId: 'deptKpiTaskCount',
            badgeId: 'deptWorkloadTableCountBadge',
            overviewId: 'ovDeptHours',
            overviewCountId: 'ovDeptTasks'
        },
        Institutional: {
            tableId: 'facultyInstWorkloadList',
            kpiTotalId: 'instKpiTotalHours',
            kpiCountId: 'instKpiTaskCount',
            badgeId: 'instWorkloadTableCountBadge',
            overviewId: 'ovInstHours',
            overviewCountId: 'ovInstTasks'
        },
        ExtraProactive: {
            tableId: 'facultyExtraWorkloadList',
            kpiTotalId: 'extraKpiTotalHours',
            kpiCountId: 'extraKpiTaskCount',
            badgeId: 'extraWorkloadTableCountBadge',
            overviewId: 'ovExtraHours',
            overviewCountId: 'ovExtraTasks'
        },
        FDP_Workshop: {
            tableId: 'facultyFdpWorkloadList',
            kpiTotalId: 'fdpKpiTotalHours',
            kpiCountId: 'fdpKpiCount',
            badgeId: 'fdpWorkloadTableCountBadge',
            overviewId: 'ovFdpHours',
            overviewCountId: 'ovFdpTasks'
        },
        Research: {
            tableId: 'facultyResearchWorkloadList',
            kpiTotalId: 'researchKpiTotalHours',
            kpiCountId: 'researchKpiCount',
            badgeId: 'researchWorkloadTableCountBadge',
            overviewId: 'ovResearchHours',
            overviewCountId: 'ovResearchTasks'
        },
        Consultancy: {
            tableId: 'facultyConsultancyWorkloadList',
            kpiTotalId: 'consultancyKpiTotalHours',
            kpiCountId: 'consultancyKpiCount',
            badgeId: 'consultancyWorkloadTableCountBadge',
            overviewId: 'ovConsultancyHours',
            overviewCountId: 'ovConsultancyTasks'
        }
    };

    let multiDomainAllocations = [];

    async function fetchAllCatalogsFromBackend() {
        try {
            const res = await fetch(`${API_URL}/api/workload/catalogs`);
            const data = await res.json();
            if (data.success && data.catalogs) {
                Object.keys(data.catalogs).forEach(k => {
                    if (MULTI_DOMAIN_CATALOGS[k]) {
                        MULTI_DOMAIN_CATALOGS[k].roles = data.catalogs[k].roles || MULTI_DOMAIN_CATALOGS[k].roles;
                        MULTI_DOMAIN_CATALOGS[k].tasks = data.catalogs[k].tasks || MULTI_DOMAIN_CATALOGS[k].tasks;
                    }
                });
            }
        } catch (e) {
            console.warn('Using local multi-domain catalogs:', e);
        }
    }

    // Main Renderer for all 6 domains and overview statistics
    window.renderAllFacultyWorkloads = async function() {
        await fetchAllCatalogsFromBackend();

        try {
            if (!authToken) {
                throw new Error('Sign in to load your workload details.');
            }
            const headers = {};
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            const res = await fetch(`${API_URL}/api/workload/department/faculty?category=all`, {
                headers: headers
            });
            const data = await res.json();

            if (!res.ok || !data.success || !Array.isArray(data.allocations)) {
                throw new Error(data.message || 'Failed to load your workload allocations.');
            }
            multiDomainAllocations = data.allocations;
        } catch (err) {
            console.error('Load faculty workload error:', err);
            Object.values(DOMAIN_SECTIONS).forEach(conf => {
                const totalEl = document.getElementById(conf.kpiTotalId);
                const countEl = document.getElementById(conf.kpiCountId);
                const badgeEl = document.getElementById(conf.badgeId);
                const overviewEl = document.getElementById(conf.overviewId);
                const overviewCountEl = document.getElementById(conf.overviewCountId);
                const tbody = document.getElementById(conf.tableId);
                if (totalEl) totalEl.textContent = 'Unavailable';
                if (countEl) countEl.textContent = '—';
                if (badgeEl) badgeEl.textContent = 'Unavailable';
                if (overviewEl) overviewEl.textContent = 'Unavailable';
                if (overviewCountEl) overviewCountEl.textContent = 'Unavailable';
                if (tbody) {
                    tbody.innerHTML = '';
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.colSpan = 11;
                    cell.setAttribute('role', 'alert');
                    cell.style.textAlign = 'center';
                    cell.textContent = err.message;
                    row.appendChild(cell);
                    tbody.appendChild(row);
                }
            });
            const grandTotal = document.getElementById('statTotalWorkloadHours');
            if (grandTotal) grandTotal.textContent = 'Unavailable';
            return;
        }

        let grandTotalMultiDomainHours = 0;

        // Render each category's table and KPI cards
        Object.keys(DOMAIN_SECTIONS).forEach(catKey => {
            const conf = DOMAIN_SECTIONS[catKey];
            const catMeta = MULTI_DOMAIN_CATALOGS[catKey] || {};

            const items = multiDomainAllocations.filter(x => {
                const itemCat = x.category || 'Department';
                return itemCat.toLowerCase() === catKey.toLowerCase();
            });

            const catHours = items.reduce((sum, item) => sum + parseFloat(item.calculated_workload || 0), 0);
            grandTotalMultiDomainHours += catHours;

            // Update KPI Cards for this section
            const totalEl = document.getElementById(conf.kpiTotalId);
            const countEl = document.getElementById(conf.kpiCountId);
            const badgeEl = document.getElementById(conf.badgeId);
            const ovStatEl = document.getElementById(conf.overviewId);
            const overviewCountEl = document.getElementById(conf.overviewCountId);

            if (totalEl) totalEl.textContent = `${catHours.toFixed(2)} hrs`;
            if (countEl) countEl.textContent = items.length;
            if (badgeEl) badgeEl.textContent = `${items.length} Tasks Active`;
            if (ovStatEl) ovStatEl.textContent = `${catHours.toFixed(2)} hrs`;
            if (overviewCountEl) overviewCountEl.textContent = `${items.length} Tasks`;

            if (catKey === 'Department') {
                const statDept = document.getElementById('statDeptHours');
                if (statDept) statDept.textContent = `${catHours.toFixed(2)} hrs`;
            }

            // Render table rows
            const tbody = document.getElementById(conf.tableId);
            if (!tbody) return;

            tbody.innerHTML = '';
            if (items.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; padding: 36px; color: var(--text-light);">
                            <span class="material-symbols-outlined" style="font-size: 38px; opacity: 0.45; display: block; margin-bottom: 8px;">assignment_late</span>
                            No ${catMeta.name || catKey} responsibilities allocated yet.<br>
                            Click <strong>"+ Allocate ${catMeta.name || catKey} Role"</strong> above to record your workload.
                        </td>
                    </tr>
                `;
            } else {
                items.forEach(item => {
                    const hrs = parseFloat(item.calculated_workload || 0).toFixed(2);
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #e2e8f0';

                    tr.innerHTML = `
                        <td style="padding: 12px 10px; font-weight: 700; color: #4338ca; font-family: monospace;">${item.task_id}</td>
                        <td style="padding: 12px 10px; font-weight: 500;">
                            <span style="background: ${catMeta.badgeBg || '#eff6ff'}; color: ${catMeta.badgeColor || '#1e40af'}; border: 1px solid ${catMeta.badgeBorder || '#bfdbfe'}; padding: 4px 8px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;">
                                ${item.role_name}
                            </span>
                        </td>
                        <td style="padding: 12px 10px; font-weight: 600; color: #0f172a;">${item.task_name}</td>
                        <td style="padding: 12px 10px; color: #0284c7; font-weight: 600;">${item.work_unit}</td>
                        <td style="padding: 12px 10px; font-weight: 700; color: #0f172a;">${item.quantity}</td>
                        <td style="padding: 12px 10px; color: #475569; font-weight: 500;">${item.std_effort} hrs</td>
                        <td style="padding: 12px 10px; color: #0f172a; font-weight: 500;">${item.occurrences}</td>
                        <td style="padding: 12px 10px; color: #0f172a; font-weight: 500;">${item.complexity_factor}</td>
                        <td style="padding: 12px 10px;">
                            <span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.95rem;">
                                ${hrs} hrs
                            </span>
                        </td>
                        <td style="padding: 12px 10px; color: #64748b; font-size: 0.88rem; max-width: 180px;">${item.remarks || '-'}</td>
                        <td style="padding: 12px 10px; text-align: center;">
                            <button class="btn-secondary" onclick="deleteDeptWorkloadItem('${item.task_id}', '${catKey}')" title="Remove Allocation" 
                                style="padding: 5px 10px; border-radius: 6px; color: #dc2626; border: 1.5px solid #fecaca; background: #fff5f5; cursor: pointer; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle;">delete</span>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });

        // Update Grand Total in Overview Card
        const statGrandTotal = document.getElementById('statTotalWorkloadHours');
        if (statGrandTotal) {
            statGrandTotal.textContent = `${grandTotalMultiDomainHours.toFixed(2)} hrs`;
        }
    };

    // Alias for backwards compatibility
    window.renderFacultyDepartmentWorkload = window.renderAllFacultyWorkloads;

    // =========================================================================
    // --- MULTI-DOMAIN MODAL WORKLOAD ALLOCATION CONTROLLER ---
    // =========================================================================

    const allocateModal = document.getElementById('allocateDeptRoleModal');
    const catSelect = document.getElementById('workloadCategorySelect');
    const deptRoleSelect = document.getElementById('deptRoleSelect');
    const deptTaskSelect = document.getElementById('deptTaskSelect');
    const roleSummaryBadge = document.getElementById('roleSummaryBadge');
    const deptWorkUnitDisplay = document.getElementById('deptWorkUnitDisplay');
    const deptStdEffort = document.getElementById('deptStdEffort');
    const deptOccurrences = document.getElementById('deptOccurrences');
    const deptComplexity = document.getElementById('deptComplexity');
    const deptQuantity = document.getElementById('deptQuantity');
    const deptRemarks = document.getElementById('deptRemarks');
    const deptFormulaBreakdown = document.getElementById('deptFormulaBreakdown');
    const deptLiveWorkloadHours = document.getElementById('deptLiveWorkloadHours');
    const allocateDeptRoleForm = document.getElementById('allocateDeptRoleForm');

    function updateModalCategoryHeader(category) {
        const catMeta = MULTI_DOMAIN_CATALOGS[category] || MULTI_DOMAIN_CATALOGS['Department'];
        const modalIcon = document.getElementById('modalDomainIcon');
        const modalTitle = document.getElementById('modalDomainTitle');
        const modalDesc = document.getElementById('modalDomainDesc');

        if (modalIcon) modalIcon.textContent = catMeta.icon || 'account_tree';
        if (modalTitle) modalTitle.textContent = `Allocate ${catMeta.name} Role & Task`;
        if (modalDesc) {
            modalDesc.textContent = `Select your assigned ${catMeta.name.toLowerCase()} role and measurable task. Standard effort, occurrences, and complexity factor will be preloaded automatically according to the institutional responsibility matrix.`;
        }
    }

    function populateRolesForCategory(category) {
        if (!deptRoleSelect) return;
        const catMeta = MULTI_DOMAIN_CATALOGS[category] || MULTI_DOMAIN_CATALOGS['Department'];
        deptRoleSelect.innerHTML = `<option value="">-- Choose Assigned ${catMeta.name} Role --</option>`;

        catMeta.roles.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = `[${r.id}] ${r.name}`;
            deptRoleSelect.appendChild(opt);
        });

        // Reset task dropdown
        if (deptTaskSelect) {
            deptTaskSelect.innerHTML = '<option value="">-- Select a role first --</option>';
            deptTaskSelect.disabled = true;
        }
        if (roleSummaryBadge) roleSummaryBadge.style.display = 'none';
    }

    window.openAllocateRoleModal = function(category = 'Department') {
        if (!allocateModal) return;

        if (catSelect) {
            catSelect.value = category;
        }

        updateModalCategoryHeader(category);
        populateRolesForCategory(category);
        resetDeptModalForm();

        allocateModal.style.display = 'flex';
        allocateModal.classList.add('active');
    };

    window.openAllocateDeptModal = function() {
        window.openAllocateRoleModal('Department');
    };

    window.closeDeptModal = function() {
        if (allocateModal) {
            allocateModal.style.display = 'none';
            allocateModal.classList.remove('active');
        }
        resetDeptModalForm();
    };

    // Category switch within modal dropdown
    if (catSelect) {
        catSelect.addEventListener('change', () => {
            const selectedCat = catSelect.value;
            updateModalCategoryHeader(selectedCat);
            populateRolesForCategory(selectedCat);
            resetDeptModalForm();
        });
    }

    function resetDeptModalForm() {
        if (allocateDeptRoleForm) allocateDeptRoleForm.reset();
        if (catSelect) {
            // retain selected category
        }
        if (deptTaskSelect) {
            deptTaskSelect.innerHTML = '<option value="">-- Select a role first --</option>';
            deptTaskSelect.disabled = true;
        }
        if (roleSummaryBadge) {
            roleSummaryBadge.style.display = 'none';
            roleSummaryBadge.textContent = '';
        }
        if (deptWorkUnitDisplay) deptWorkUnitDisplay.textContent = '-';
        if (deptStdEffort) deptStdEffort.value = '';
        if (deptOccurrences) deptOccurrences.value = '';
        if (deptComplexity) deptComplexity.value = '';
        if (deptQuantity) deptQuantity.value = '1';
        if (deptLiveWorkloadHours) deptLiveWorkloadHours.textContent = '0.00 hrs';
        if (deptFormulaBreakdown) deptFormulaBreakdown.textContent = '0 × 0 × 0 × 0';
    }

    if (deptRoleSelect) {
        deptRoleSelect.addEventListener('change', () => {
            const roleId = deptRoleSelect.value;
            const currentCat = catSelect ? catSelect.value : 'Department';
            const catMeta = MULTI_DOMAIN_CATALOGS[currentCat] || MULTI_DOMAIN_CATALOGS['Department'];

            if (!roleId) {
                if (deptTaskSelect) {
                    deptTaskSelect.innerHTML = '<option value="">-- Select a role first --</option>';
                    deptTaskSelect.disabled = true;
                }
                if (roleSummaryBadge) roleSummaryBadge.style.display = 'none';
                return;
            }

            const role = catMeta.roles.find(r => r.id === roleId);
            if (role && roleSummaryBadge) {
                roleSummaryBadge.textContent = role.summary || '';
                roleSummaryBadge.style.display = 'block';
            } else if (roleSummaryBadge) {
                roleSummaryBadge.style.display = 'none';
            }

            // Filter tasks for this role
            const matchedTasks = catMeta.tasks.filter(t => t.role_id === roleId);
            deptTaskSelect.innerHTML = '<option value="">-- Choose Measurable Task --</option>';

            matchedTasks.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `[${t.id}] ${t.responsibility_task} (${t.work_unit})`;
                deptTaskSelect.appendChild(opt);
            });

            deptTaskSelect.disabled = false;
        });
    }

    if (deptTaskSelect) {
        deptTaskSelect.addEventListener('change', () => {
            const taskId = deptTaskSelect.value;
            const currentCat = catSelect ? catSelect.value : 'Department';
            const catMeta = MULTI_DOMAIN_CATALOGS[currentCat] || MULTI_DOMAIN_CATALOGS['Department'];
            if (!taskId) return;

            const task = catMeta.tasks.find(t => t.id === taskId);
            if (task) {
                deptWorkUnitDisplay.textContent = task.work_unit || 'Unit';
                deptStdEffort.value = task.std_effort;
                deptOccurrences.value = task.occurrences_per_semester || 1;
                deptComplexity.value = task.complexity_factor || 1.0;

                // Smart default quantities based on task unit
                if (task.work_unit === 'Student' && task.id === 'T001') deptQuantity.value = 45;
                else if (task.work_unit === 'Student' && task.id === 'T028') deptQuantity.value = 120;
                else if (task.work_unit === 'Session') deptQuantity.value = 8;
                else if (task.work_unit === 'Scholar') deptQuantity.value = 2;
                else if (task.work_unit === 'Student/Team') deptQuantity.value = 3;
                else deptQuantity.value = 1;

                updateLiveWorkloadCalculation();
            }
        });
    }

    function updateLiveWorkloadCalculation() {
        const effort = parseFloat(deptStdEffort?.value) || 0;
        const qty = parseFloat(deptQuantity?.value) || 0;
        const occ = parseInt(deptOccurrences?.value) || 0;
        const comp = parseFloat(deptComplexity?.value) || 1.0;

        const total = (effort * qty * occ * comp).toFixed(2);

        if (deptLiveWorkloadHours) deptLiveWorkloadHours.textContent = `${total} hrs`;
        if (deptFormulaBreakdown) {
            deptFormulaBreakdown.textContent = `${effort} hrs × ${qty} (${deptWorkUnitDisplay.textContent}) × ${occ} occ × ${comp}`;
        }
    }

    [deptQuantity, deptOccurrences, deptComplexity].forEach(input => {
        if (input) input.addEventListener('input', updateLiveWorkloadCalculation);
    });

    if (allocateDeptRoleForm) {
        allocateDeptRoleForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const category = catSelect ? catSelect.value : 'Department';
            const roleId = deptRoleSelect.value;
            const taskId = deptTaskSelect.value;

            if (!roleId || !taskId) {
                alert('Please select both a role and a task.');
                return;
            }

            const catMeta = MULTI_DOMAIN_CATALOGS[category] || MULTI_DOMAIN_CATALOGS['Department'];
            const role = catMeta.roles.find(r => r.id === roleId);
            const task = catMeta.tasks.find(t => t.id === taskId);

            const eff = parseFloat(deptStdEffort.value) || 0;
            const qty = parseFloat(deptQuantity.value) || 1;
            const occ = parseInt(deptOccurrences.value) || 1;
            const comp = parseFloat(deptComplexity.value) || 1.0;
            const totalWorkload = parseFloat((eff * qty * occ * comp).toFixed(2));
            const remarks = deptRemarks.value.trim();

            const payload = {
                faculty_id: currentFaculty.id,
                category: category,
                role_id: roleId,
                role_name: role ? role.name : roleId,
                task_id: taskId,
                task_name: task ? task.responsibility_task : taskId,
                work_unit: task ? task.work_unit : 'Unit',
                quantity: qty,
                std_effort: eff,
                occurrences: occ,
                complexity_factor: comp,
                remarks: remarks,
                calculated_workload: totalWorkload
            };

            const submitBtn = document.getElementById('btnSaveDeptWorkload');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            try {
                const headers = { 'Content-Type': 'application/json' };
                if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

                const res = await fetch(`${API_URL}/api/workload/department/faculty`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Could not save this workload allocation.');
                }
                window.closeDeptModal();
                await window.renderAllFacultyWorkloads();
                alert(`✓ [${category}] task [${taskId}] allocated successfully! (${totalWorkload} hrs added)`);
            } catch (err) {
                console.error('Save faculty workload allocation error:', err);
                alert(err.message || 'Could not save this workload allocation.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Allocation';
                }
            }
        });
    }

    // Delete Workload Allocation
    window.deleteDeptWorkloadItem = async function(taskId, category = 'Department') {
        if (!confirm(`Are you sure you want to remove task allocation [${taskId}]?`)) return;

        try {
            const headers = {};
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            const res = await fetch(`${API_URL}/api/workload/department/faculty/${taskId}`, {
                method: 'DELETE',
                headers: headers
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Could not delete workload allocation.');
            }
        } catch (e) {
            console.error('Delete faculty workload allocation error:', e);
            alert(e.message || 'Could not delete workload allocation.');
        }

        await window.renderAllFacultyWorkloads();
    };

    // Initial render
    renderOverview();
    fetchFacultyTasks();
    fetchFacultySubjects();
    window.renderAllFacultyWorkloads();

});
