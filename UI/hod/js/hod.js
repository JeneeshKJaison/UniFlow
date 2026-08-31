document.addEventListener('DOMContentLoaded', () => {

    // --- Mock Data Store & Logged-in HOD Context ---
    let currentHod = { id: 1, name: 'Dr. Alan Turing', email: 'hod.cs@uniflow.edu', deptId: 1, deptName: 'Computer Science' };
    const storedUser = localStorage.getItem('uniflow_currentUser');
    if (storedUser) {
        try {
            const parsed = JSON.parse(storedUser);
            if (parsed && (parsed.role === 'hod' || parsed.isHOD)) {
                currentHod = {
                    id: parsed.id || 1,
                    name: parsed.name || 'HOD',
                    email: parsed.email || 'hod@uniflow.edu',
                    deptId: parsed.deptId || 1,
                    deptName: parsed.deptName || 'Department'
                };
            }
        } catch(e) {
            console.error(e);
        }
    }
    
    // Set UI labels
    if (document.getElementById('hodNameDisplay')) document.getElementById('hodNameDisplay').textContent = currentHod.name;
    if (document.getElementById('deptTitle')) document.getElementById('deptTitle').textContent = `${currentHod.deptName} Console`;
    if (document.getElementById('profileName')) document.getElementById('profileName').value = `${currentHod.name} (${currentHod.email})`;


    const dataStore = {
        users: [
            { id: 1, customId: 'FAC001', name: 'Dr. Alan Turing', role: 'faculty', deptId: 1, isHOD: true },
            { id: 2, customId: 'FAC002', name: 'Grace Hopper', role: 'faculty', deptId: 1, isHOD: false },
            { id: 3, customId: 'FAC003', name: 'Linus Torvalds', role: 'faculty', deptId: 1, isHOD: false },
            { id: 4, customId: 'STU001', name: 'Ada Lovelace', role: 'student', deptId: 1, isHOD: false },
            { id: 5, customId: 'STU002', name: 'Tim Berners-Lee', role: 'student', deptId: 1, isHOD: false },
            { id: 6, customId: 'FAC004', name: 'Nikola Tesla', role: 'faculty', deptId: 2, isHOD: true, deptName: 'Electrical Eng.' },
            { id: 7, customId: 'FAC005', name: 'Marie Curie', role: 'faculty', deptId: 3, isHOD: true, deptName: 'Physics' }
        ],
        tasks: [],
        grievances: [
            { id: 1, fromId: 2, subject: 'Projector broken in Lab 3', details: 'The overhead projector in Lab 3 is completely unresponsive. Need it fixed for tomorrow.', date: '2026-07-09', status: 'Pending' },
            { id: 2, fromId: 3, subject: 'Schedule Clash', details: 'My DBMS lecture is clashing with the final year seminar.', date: '2026-07-08', status: 'Resolved' }
        ],
        chatMessages: [
            { senderId: 2, text: 'Hello everyone, please submit attendance by EOD.', timestamp: '10:00 AM' },
            { senderId: 4, text: 'Noted, ma\'am.', timestamp: '10:05 AM' }
        ],
        studentStats: [
            { id: 4, semester: 5, workloadScore: 85, performanceScore: 92 },
            { id: 5, semester: 5, workloadScore: 70, performanceScore: 45 },
            { id: 101, name: 'John Doe', role: 'student', semester: 3, workloadScore: 60, performanceScore: 75, customId: 'STU003' },
            { id: 102, name: 'Jane Smith', role: 'student', semester: 3, workloadScore: 90, performanceScore: 35, customId: 'STU004' },
            { id: 103, name: 'Alice Johnson', role: 'student', semester: 7, workloadScore: 40, performanceScore: 88, customId: 'STU005' },
            { id: 104, name: 'Bob Brown', role: 'student', semester: 7, workloadScore: 50, performanceScore: 95, customId: 'STU006' },
            { id: 105, name: 'Charlie Davis', role: 'student', semester: 1, workloadScore: 95, performanceScore: 48, customId: 'STU007' }
        ],
        classWorkload: [
            { semester: 1, subject: 'Math 101', workload: 80 },
            { semester: 3, subject: 'Data Structures', workload: 95 },
            { semester: 5, subject: 'Operating Systems', workload: 65 },
            { semester: 7, subject: 'AI & ML', workload: 45 }
        ],
        subjects: [
            { id: 1, name: 'Math 101', semester: 1, course: 'BTech CS' },
            { id: 2, name: 'Physics 101', semester: 1, course: 'BTech CS' },
            { id: 3, name: 'Data Structures', semester: 3, course: 'BTech AI' },
            { id: 4, name: 'DBMS', semester: 3, course: 'BTech AI' },
            { id: 5, name: 'Operating Systems', semester: 5, course: 'BTech CS' },
            { id: 6, name: 'AI & ML', semester: 7, course: 'BTech AI' }
        ],
        timetableData: [],
        messages: [], // Array of { id, senderId, receiverId, text, timestamp, isGroup }
        chatThreads: [
            { id: 'group', type: 'group', name: 'Department Group', members: 'all', initial: 'G' }
        ],
        invitedFaculties: [] // Array of user IDs
    };

    // Pre-populate some mock messages
    dataStore.messages = [
        { id: 1, senderId: 101, receiverId: 'group', text: 'Welcome to the department chat!', timestamp: new Date(Date.now() - 86400000).toISOString(), isGroup: true },
        { id: 2, senderId: 102, receiverId: 'group', text: 'Hello everyone!', timestamp: new Date(Date.now() - 80000000).toISOString(), isGroup: true }
    ];

    // Merge new mock students into users
    dataStore.studentStats.forEach(s => {
        if(s.name && !dataStore.users.find(u => u.id === s.id)) {
            dataStore.users.push({
                id: s.id, customId: s.customId, name: s.name, role: s.role, deptId: 1, isHOD: false
            });
        }
    });

    // --- Tab Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(sec => sec.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            // Re-render specific sections when navigated
            if(targetId === 'chat') {
                scrollToChatBottom();
            } else if(targetId === 'tasks') {
                renderTasks();
            } else if(targetId === 'overview') {
                renderOverview();
            }
        });
    });

    // --- Helpers ---
    function getFacultyInDept() {
        return dataStore.users.filter(u => (u.deptId === currentHod.deptId || dataStore.invitedFaculties.includes(u.id)) && u.role === 'faculty');
    }
    function getStudentsInDept() {
        return dataStore.users.filter(u => u.deptId === currentHod.deptId && u.role === 'student');
    }
    function getUserName(id) {
        const u = dataStore.users.find(x => x.id === id);
        return u ? u.name : 'Unknown';
    }

    // --- Overview Toggle & Student Overview Logic ---
    const btnFacultyView = document.getElementById('btnFacultyView');
    const btnStudentView = document.getElementById('btnStudentView');
    const facultyOverviewContainer = document.getElementById('facultyOverviewContainer');
    const studentOverviewContainer = document.getElementById('studentOverviewContainer');

    if (btnFacultyView && btnStudentView) {
        btnFacultyView.addEventListener('click', () => {
            btnFacultyView.classList.add('btn-primary');
            btnFacultyView.style.background = '';
            btnFacultyView.style.color = '';
            btnFacultyView.style.border = '';

            btnStudentView.classList.remove('btn-primary');
            btnStudentView.style.background = 'transparent';
            btnStudentView.style.border = '1px solid var(--primary-color)';
            btnStudentView.style.color = 'var(--text-light)';

            facultyOverviewContainer.style.display = 'block';
            studentOverviewContainer.style.display = 'none';
        });

        btnStudentView.addEventListener('click', () => {
            btnStudentView.classList.add('btn-primary');
            btnStudentView.style.background = '';
            btnStudentView.style.color = '';
            btnStudentView.style.border = '';

            btnFacultyView.classList.remove('btn-primary');
            btnFacultyView.style.background = 'transparent';
            btnFacultyView.style.border = '1px solid var(--primary-color)';
            btnFacultyView.style.color = 'var(--text-light)';

            facultyOverviewContainer.style.display = 'none';
            studentOverviewContainer.style.display = 'block';
            renderStudentOverview();
        });
    }

    function renderStudentOverview() {
        const courseFilter = document.getElementById('studentCourseFilter') ? document.getElementById('studentCourseFilter').value : 'all';
        const semesterFilter = document.getElementById('studentSemesterFilter').value;
        const categoryFilter = document.getElementById('studentCategoryFilter').value;

        const classWorkloadContainer = document.getElementById('classWorkloadContainer');
        classWorkloadContainer.innerHTML = '';
        
        let filteredClasses = dataStore.classWorkload;
        if (courseFilter !== 'all') {
            filteredClasses = filteredClasses.filter(c => c.course === courseFilter);
        }
        if (semesterFilter !== 'all') {
            filteredClasses = filteredClasses.filter(c => c.semester == semesterFilter);
        }

        if (filteredClasses.length === 0) {
            classWorkloadContainer.innerHTML = '<p style="color:var(--text-light); grid-column: 1/-1;">No class workload data for this selection.</p>';
        } else {
            filteredClasses.forEach(c => {
                let color = c.workload > 80 ? '#e53e3e' : (c.workload > 50 ? '#dd6b20' : '#48bb78');
                classWorkloadContainer.innerHTML += `
                    <div class="glass-panel" style="padding: 16px;">
                        <h5 style="margin-bottom: 8px;">Sem ${c.semester}: ${c.subject}</h5>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.9rem;">
                            <span>Workload</span>
                            <span style="color: ${color}; font-weight: bold;">${c.workload}%</span>
                        </div>
                        <div class="workload-bar-container" style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${c.workload}%; height: 100%; background: ${color};"></div>
                        </div>
                    </div>
                `;
            });
        }

        const studentPerformanceList = document.getElementById('studentPerformanceList');
        studentPerformanceList.innerHTML = '';

        let filteredStudents = dataStore.studentStats.map(s => {
            const user = dataStore.users.find(u => u.id === s.id);
            return { ...s, name: user ? user.name : 'Unknown' };
        });

        if (courseFilter !== 'all') {
            filteredStudents = filteredStudents.filter(s => s.course === courseFilter);
        }
        if (semesterFilter !== 'all') {
            filteredStudents = filteredStudents.filter(s => s.semester == semesterFilter);
        }

        if (categoryFilter === 'high') {
            filteredStudents = filteredStudents.filter(s => s.performanceScore > 80);
        } else if (categoryFilter === 'attention') {
            filteredStudents = filteredStudents.filter(s => s.performanceScore < 50);
        }

        if (filteredStudents.length === 0) {
            studentPerformanceList.innerHTML = '<tr><td colspan="5">No students match the criteria.</td></tr>';
        } else {
            if (categoryFilter === 'attention') {
                filteredStudents.sort((a, b) => a.performanceScore - b.performanceScore);
            } else {
                filteredStudents.sort((a, b) => b.performanceScore - a.performanceScore);
            }

            filteredStudents.forEach(s => {
                let status = 'Average';
                let statusColor = 'var(--text-light)';
                if (s.performanceScore > 80) {
                    status = 'Doing Well';
                    statusColor = '#48bb78';
                } else if (s.performanceScore < 50) {
                    status = 'Needs Attention';
                    statusColor = '#e53e3e';
                }

                studentPerformanceList.innerHTML += `
                    <tr>
                        <td>${s.name}</td>
                        <td>Semester ${s.semester}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap: 8px;">
                                <div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                                    <div style="width:${s.workloadScore}%; height:100%; background:${s.workloadScore > 80 ? '#e53e3e' : 'var(--primary-color)'};"></div>
                                </div>
                                <span style="font-size:0.85rem">${s.workloadScore}%</span>
                            </div>
                        </td>
                        <td style="font-weight:bold; color:${statusColor}">${s.performanceScore}%</td>
                        <td style="color:${statusColor}">${status}</td>
                    </tr>
                `;
            });
        }
    }

    const studentCourseFilter = document.getElementById('studentCourseFilter');
    const studentSemesterFilter = document.getElementById('studentSemesterFilter');
    const studentCategoryFilter = document.getElementById('studentCategoryFilter');
    if (studentCourseFilter) studentCourseFilter.addEventListener('change', renderStudentOverview);
    if (studentSemesterFilter) studentSemesterFilter.addEventListener('change', renderStudentOverview);
    if (studentCategoryFilter) studentCategoryFilter.addEventListener('change', renderStudentOverview);


    // --- 1. Overview & Workload ---
    async function renderOverview() {
        const token = localStorage.getItem('uniflow_token') || localStorage.getItem('token');
        let faculty = getFacultyInDept().filter(f => !f.isHOD);
        const students = getStudentsInDept();
        let activeTasks = dataStore.tasks.filter(t => t.status === 'Active');

        // Fetch live faculty and tasks from backend if connected
        if (token) {
            try {
                const facRes = await fetch('http://localhost:5000/api/workload/faculty', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (facRes.ok) {
                    const facData = await facRes.json();
                    if (facData.success && facData.faculty) {
                        faculty = facData.faculty;
                    }
                }

                const taskRes = await fetch('http://localhost:5000/api/workload/tasks', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (taskRes.ok) {
                    const taskData = await taskRes.json();
                    if (taskData.success && taskData.tasks) {
                        activeTasks = taskData.tasks;
                    }
                }
            } catch (e) {
                console.warn('Overview backend load note:', e);
            }
        }

        document.getElementById('stat-faculty').textContent = faculty.length;
        document.getElementById('stat-students').textContent = students.length;
        document.getElementById('stat-tasks').textContent = activeTasks.length;

        // Workload Threshold is 15 points
        const threshold = 15;
        const workloadContainer = document.getElementById('workloadContainer');
        workloadContainer.innerHTML = '';
        
        faculty.forEach(fac => {
            let totalDiff = fac.total_active_workload;
            if (totalDiff === undefined) {
                const facTasks = activeTasks.filter(t => (t.assigned_to || t.assigneeId) === fac.id);
                totalDiff = facTasks.reduce((sum, t) => sum + (t.difficulty || 0), 0);
            } else {
                totalDiff = parseInt(totalDiff) || 0;
            }

            const percentage = Math.min((totalDiff / threshold) * 100, 100);
            
            let barClass = '';
            if (percentage >= 100) barClass = 'high';
            else if (percentage > 50) barClass = 'medium';

            workloadContainer.innerHTML += `
                <div class="workload-item">
                    <div class="workload-header">
                        <span><strong>${fac.name}</strong> <small style="color:var(--text-light);">(${fac.email || fac.custom_id || 'Faculty'})</small></span>
                        <span style="font-weight: 600; color: ${percentage >= 100 ? '#e53e3e' : 'var(--text-color)'};">${totalDiff} / ${threshold} pts (${Math.round(percentage)}%)</span>
                    </div>
                    <div class="workload-bar-container">
                        <div class="workload-bar ${barClass}" style="width: ${percentage}%;"></div>
                    </div>
                </div>
            `;
        });

        // Urgent tasks list
        const urgentTasksList = document.getElementById('urgentTasksList');
        if (urgentTasksList) {
            urgentTasksList.innerHTML = '';
            const urgentTasks = [...activeTasks].slice(0, 5);
            
            if (urgentTasks.length === 0) {
                urgentTasksList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 16px;">No active tasks.</td></tr>';
            } else {
                urgentTasks.forEach(t => {
                    const desc = t.description || t.desc;
                    const assignee = t.assignee_name || getUserName(t.assigned_to || t.assigneeId);
                    const diff = t.difficulty || 5;
                    const days = t.deadline ? `Due: ${new Date(t.deadline).toLocaleDateString()}` : (t.deadlineDays ? `In ${t.deadlineDays} days` : 'Active');
                    const status = t.status || 'Active';
                    
                    urgentTasksList.innerHTML += `
                        <tr>
                            <td>${desc}</td>
                            <td>${assignee}</td>
                            <td>${diff}/10</td>
                            <td>${days}</td>
                            <td><span class="status-badge" style="background: rgba(11, 122, 117, 0.15); color: var(--primary-color);">${status}</span></td>
                        </tr>
                    `;
                });
            }
        }
    }

    // --- 1.5. Subjects Management ---
    function renderSubjects() {
        const course = document.getElementById('subjectManageCourseFilter').value;
        const semester = document.getElementById('subjectManageSemesterFilter').value;
        const tbody = document.getElementById('subjectsListBody');
        tbody.innerHTML = '';

        const filtered = dataStore.subjects.filter(s => s.course === course && s.semester == semester);
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No subjects configured for this course and semester.</td></tr>';
        } else {
            filtered.forEach(s => {
                tbody.innerHTML += `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.course}</td>
                        <td>Semester ${s.semester}</td>
                    </tr>
                `;
            });
        }
    }

    document.getElementById('subjectManageCourseFilter').addEventListener('change', renderSubjects);
    document.getElementById('subjectManageSemesterFilter').addEventListener('change', renderSubjects);

    document.getElementById('addSubjectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const course = document.getElementById('subjectManageCourseFilter').value;
        const semester = parseInt(document.getElementById('subjectManageSemesterFilter').value);
        const name = document.getElementById('newSubjectName').value;

        const newId = dataStore.subjects.length > 0 ? Math.max(...dataStore.subjects.map(s => s.id)) + 1 : 1;
        
        dataStore.subjects.push({
            id: newId,
            name: name,
            semester: semester,
            course: course
        });

        document.getElementById('newSubjectName').value = '';
        renderSubjects();
    });

    // --- 2. Timetable Builder ---
    let currentTTContext = { day: null, period: null };

    function renderTimetable() {
        const course = document.getElementById('timetableCourseFilter').value;
        const semester = document.getElementById('timetableSemesterFilter').value;
        const tbody = document.getElementById('timetableBody');
        tbody.innerHTML = '';

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const periods = [1, 2, 3, 4, 5, 6];

        days.forEach(day => {
            let tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-weight: bold; padding: 12px; border: 1px solid var(--glass-border); vertical-align: middle;">${day}</td>`;
            
            periods.forEach(p => {
                const slotData = dataStore.timetableData.find(t => t.course === course && t.semester == semester && t.day === day && t.period === p);
                
                let cellContent = '<div style="color:var(--text-light); font-size: 20px;">+</div>';
                let cellStyle = 'padding: 12px; border: 1px solid var(--glass-border); cursor: pointer; transition: background 0.3s;';
                
                if (slotData) {
                    const subName = slotData.subjectName;
                    const facultyNames = (slotData.facultyIds || []).map(fid => {
                        const fac = dataStore.users.find(u => u.id === parseInt(fid));
                        return fac ? fac.name : 'Unknown';
                    }).join(', ');
                    
                    if (subName) {
                        cellContent = `<div style="font-weight:600; color:var(--primary-color);">${subName}</div>
                                       <div style="font-size:0.8rem; margin-top:4px;">${facultyNames}</div>`;
                        cellStyle += ' background: rgba(var(--primary-color-rgb), 0.05);';
                    }
                }

                let td = document.createElement('td');
                td.className = 'tt-slot';
                td.style.cssText = cellStyle;
                td.setAttribute('data-day', day);
                td.setAttribute('data-period', p);
                td.innerHTML = cellContent;
                
                td.onmouseover = () => { td.style.background = slotData ? 'rgba(var(--primary-color-rgb), 0.1)' : 'rgba(255,255,255,0.05)'; };
                td.onmouseout = () => { td.style.background = slotData ? 'rgba(var(--primary-color-rgb), 0.05)' : 'transparent'; };

                td.addEventListener('click', () => {
                    openTimetableModal(day, p);
                });

                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    function openTimetableModal(day, period) {
        currentTTContext = { day, period };
        document.getElementById('timetableSlotLabel').textContent = `${day} - Period ${period}`;
        
        const course = document.getElementById('timetableCourseFilter').value;
        const semester = document.getElementById('timetableSemesterFilter').value;

        // Populate Subjects
        const subjectSelect = document.getElementById('ttSubjectSelect');
        subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
        dataStore.subjects.filter(s => s.course === course && s.semester == semester).forEach(s => {
            subjectSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });

        // Populate Faculty
        const facultySelect = document.getElementById('ttFacultySelect');
        facultySelect.innerHTML = '';
        getFacultyInDept().forEach(f => {
            facultySelect.innerHTML += `<option value="${f.id}">${f.name}</option>`;
        });

        // Pre-fill if exists
        const existing = dataStore.timetableData.find(t => t.course === course && t.semester == semester && t.day === day && t.period === period);
        if (existing) {
            subjectSelect.value = existing.subjectName || '';
            const fIds = existing.facultyIds || [];
            Array.from(facultySelect.options).forEach(opt => {
                opt.selected = fIds.includes(opt.value);
            });
        } else {
            subjectSelect.value = '';
            Array.from(facultySelect.options).forEach(opt => {
                opt.selected = false;
            });
        }

        document.getElementById('timetableModal').classList.add('active');
    }

    document.getElementById('closeTimetableModal').addEventListener('click', () => {
        document.getElementById('timetableModal').classList.remove('active');
    });

    document.getElementById('timetableAssignForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const course = document.getElementById('timetableCourseFilter').value;
        const semester = document.getElementById('timetableSemesterFilter').value;
        const subjectName = document.getElementById('ttSubjectSelect').value;
        const facultySelect = document.getElementById('ttFacultySelect');
        const facultyIds = Array.from(facultySelect.selectedOptions).map(opt => opt.value);

        // Remove existing if any
        dataStore.timetableData = dataStore.timetableData.filter(t => !(t.course === course && t.semester == semester && t.day === currentTTContext.day && t.period === currentTTContext.period));

        // Add new
        dataStore.timetableData.push({
            course, semester, day: currentTTContext.day, period: currentTTContext.period, subjectName, facultyIds
        });

        document.getElementById('timetableModal').classList.remove('active');
        renderTimetable();
    });

    document.getElementById('ttClearBtn').addEventListener('click', () => {
        const course = document.getElementById('timetableCourseFilter').value;
        const semester = document.getElementById('timetableSemesterFilter').value;
        
        dataStore.timetableData = dataStore.timetableData.filter(t => !(t.course === course && t.semester == semester && t.day === currentTTContext.day && t.period === currentTTContext.period));
        
        document.getElementById('timetableModal').classList.remove('active');
        renderTimetable();
    });

    document.getElementById('saveTimetableBtn').addEventListener('click', () => {
        alert('Timetable saved successfully!');
    });

    document.getElementById('timetableCourseFilter').addEventListener('change', renderTimetable);
    document.getElementById('timetableSemesterFilter').addEventListener('change', renderTimetable);

    // --- 3. Task Assignment ---
    async function renderTasks() {
        const token = localStorage.getItem('uniflow_token') || localStorage.getItem('token');
        const assigneeSelect = document.getElementById('taskAssignee');
        const subjectSelect = document.getElementById('taskSubject');
        const tbody = document.getElementById('allTasksList');

        if (!assigneeSelect || !subjectSelect) return;

        assigneeSelect.innerHTML = '<option value="">-- Select Faculty --</option>';
        subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';

        let facultyList = getFacultyInDept().filter(f => !f.isHOD);
        let subjectsList = dataStore.subjects || [];
        let activeTasksList = dataStore.tasks || [];

        // Fetch dynamic data from backend API
        if (token) {
            try {
                // 1. Fetch faculty from backend
                const facRes = await fetch('http://localhost:5000/api/workload/faculty', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (facRes.ok) {
                    const facData = await facRes.json();
                    if (facData.success && facData.faculty && facData.faculty.length > 0) {
                        facultyList = facData.faculty;
                    }
                }

                // 2. Fetch subjects from backend
                const subRes = await fetch('http://localhost:5000/api/workload/subjects', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (subRes.ok) {
                    const subData = await subRes.json();
                    if (subData.success && subData.subjects && subData.subjects.length > 0) {
                        subjectsList = subData.subjects;
                    }
                }

                // 3. Fetch active tasks from backend
                const taskRes = await fetch('http://localhost:5000/api/workload/tasks', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (taskRes.ok) {
                    const taskData = await taskRes.json();
                    if (taskData.success && taskData.tasks) {
                        activeTasksList = taskData.tasks;
                    }
                }
            } catch (err) {
                console.warn('Backend connection note: using available department store data', err);
            }
        }

        // Populate Faculty dropdown
        facultyList.forEach(f => {
            assigneeSelect.innerHTML += `<option value="${f.id}">${f.name} (${f.email || f.custom_id || 'Faculty'})</option>`;
        });

        // Helper function to render subjects in dropdown
        function updateSubjectDropdown(filterFacultyId = null) {
            subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
            subjectsList.forEach(s => {
                const semInfo = s.semester ? ` - Sem ${s.semester}` : '';
                const codeInfo = s.code ? ` (${s.code})` : '';
                let isAllocated = false;

                if (filterFacultyId) {
                    const facultyObj = facultyList.find(f => f.id === filterFacultyId);
                    const assignedSubIds = facultyObj?.assigned_subjects?.map(sub => sub.id) || [];
                    isAllocated = assignedSubIds.includes(s.id) || (s.faculty && s.faculty.some(fac => fac.id === filterFacultyId));
                }

                const badge = isAllocated ? ' ★ Taught by Selected Faculty' : '';
                subjectSelect.innerHTML += `<option value="${s.id}">${s.name}${codeInfo}${semInfo}${badge}</option>`;
            });
        }

        // Initially render all subjects
        updateSubjectDropdown();

        // Dynamically highlight/filter subjects when a faculty member is selected
        assigneeSelect.onchange = () => {
            const selectedFacultyId = parseInt(assigneeSelect.value);
            updateSubjectDropdown(selectedFacultyId || null);
        };

        // Render Active Tasks Table
        if (tbody) {
            tbody.innerHTML = '';
            if (activeTasksList.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-light); padding: 16px;">No active tasks assigned yet.</td></tr>';
            } else {
                activeTasksList.forEach(t => {
                    const assigneeName = t.assignee_name || getUserName(t.assigned_to || t.assigneeId);
                    const desc = t.description || t.desc;
                    const daysText = t.deadline ? `Due: ${new Date(t.deadline).toLocaleDateString()}` : (t.deadlineDays ? `In ${t.deadlineDays} days` : 'Active');
                    const attachIcon = t.attachment ? `<span style="color:var(--primary-color);" title="${t.attachment}">📎 ${t.attachment}</span>` : '<span style="color:var(--text-light);">None</span>';
                    const subBadge = (t.subject_name || t.subject_code) ? `<br><small style="color: var(--primary-color); font-weight: 500;">${t.subject_name || ''} ${t.subject_code ? `(${t.subject_code})` : ''}</small>` : '';

                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${desc}</strong>${subBadge}</td>
                            <td>${assigneeName}</td>
                            <td>${daysText}</td>
                            <td>${attachIcon}</td>
                        </tr>
                    `;
                });
            }
        }
    }

    document.getElementById('assignTaskForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const assigneeId = parseInt(document.getElementById('taskAssignee').value);
        const subjectId = parseInt(document.getElementById('taskSubject').value);
        const desc = document.getElementById('taskDesc').value;
        const difficulty = parseInt(document.getElementById('taskDifficulty').value);
        const deadlineDate = document.getElementById('taskDeadline').value;
        const scheduledDate = document.getElementById('taskScheduledDate').value;

        if (!assigneeId || !subjectId) {
            alert('Please select both a faculty member and a subject.');
            return;
        }

        const token = localStorage.getItem('uniflow_token') || localStorage.getItem('token');

        if (!token) {
            alert('Authentication session not found. Please log in.');
            window.location.href = '../index.html';
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/workload/suggest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject_id: subjectId,
                    assigned_to: assigneeId,
                    description: desc,
                    difficulty: difficulty,
                    deadline: deadlineDate || null,
                    scheduled_date: scheduledDate
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                alert(result.message || 'Unable to check workload capacity.');
                return;
            }

            // Faculty is available within threshold
            if (result.can_assign) {
                const faculty = result.selected_faculty;
                const confirmAssignment = confirm(
                    `Faculty workload is acceptable.\n\n` +
                    `• Current Workload: ${faculty.current_workload} pts\n` +
                    `• Task Difficulty: +${difficulty} pts\n` +
                    `• Resulting Workload: ${faculty.resulting_workload} pts\n` +
                    `• Maximum Limit: ${result.threshold} pts\n\n` +
                    `Do you want to approve and assign this task?`
                );

                if (!confirmAssignment) {
                    alert('Assignment cancelled.');
                    return;
                }

                await approveTask(result.task, token);
            } else {
                // Faculty workload exceeds threshold - display recommendations
                showWorkloadSuggestions(result);
            }
        } catch (error) {
            console.error('Workload error:', error);
            alert('Unable to connect to the workload backend server. Ensure the backend is running on http://localhost:5000.');
        }
    });

    // Final Approval Function
    async function approveTask(task, token) {
        try {
            const response = await fetch('http://localhost:5000/api/workload/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(task)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                alert(result.message || 'Unable to assign task.');
                return;
            }

            alert('Task approved and assigned successfully!');

            // Reset form
            document.getElementById('assignTaskForm').reset();

            // Refresh UI components
            renderTasks();
            if (typeof renderOverview === 'function') renderOverview();
            if (typeof renderCalendar === 'function') renderCalendar();

        } catch (error) {
            console.error('Approval error:', error);
            alert('Unable to approve and save the task.');
        }
    }

    // Interactive Recommendation Dialog for Overloaded Faculty
    function showWorkloadSuggestions(result) {
        const modal = document.getElementById('workloadModal');
        const summary = document.getElementById('workloadModalSummary');
        const tasksSec = document.getElementById('workloadModalTasksSection');
        const altFacultyList = document.getElementById('altFacultyList');
        const altDatesList = document.getElementById('altDatesList');
        const altFacultyContainer = document.getElementById('altFacultyContainer');
        const altDatesContainer = document.getElementById('altDatesContainer');

        if (!modal) {
            alert(`⚠️ Workload Exceeded!\nFaculty current workload: ${result.current_workload} pts. Adding ${result.selected_faculty?.added_difficulty || result.requested_difficulty} pts reaches ${result.resulting_workload} pts (Limit: ${result.threshold} pts).`);
            return;
        }

        const fac = result.selected_faculty || {};
        const addedDiff = fac.added_difficulty || result.requested_difficulty || 0;
        const total = fac.resulting_workload || result.resulting_workload || 0;

        summary.innerHTML = `
            <div style="background: rgba(229, 62, 62, 0.1); border: 1px solid rgba(229, 62, 62, 0.3); border-radius: 8px; padding: 14px;">
                <p style="margin: 0 0 8px 0; font-size: 1rem; color: var(--text-color);">
                    <strong>${fac.name || 'Selected Faculty'}</strong> cannot take this assignment on the selected dates.
                </p>
                <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.9rem;">
                    <div>• Current Active Workload: <strong>${fac.current_workload} pts</strong></div>
                    <div>• Task Difficulty: <strong style="color: #e53e3e;">+${addedDiff} pts</strong></div>
                    <div>• Resulting Total: <strong style="color: #e53e3e;">${total} pts</strong></div>
                    <div>• Max Threshold: <strong>${result.threshold} pts</strong></div>
                </div>
            </div>
        `;

        // Render overlapping tasks
        if (result.overlapping_tasks && result.overlapping_tasks.length > 0) {
            tasksSec.innerHTML = `
                <div style="margin-top: 10px;">
                    <h5 style="margin: 0 0 6px 0; color: var(--text-light);">Conflicting Active Tasks During This Period:</h5>
                    <ul style="margin: 0; padding-left: 18px; font-size: 0.85rem; color: var(--text-light);">
                        ${result.overlapping_tasks.map(t => `
                            <li><strong>${t.description}</strong> (${t.difficulty} pts) — Active from ${t.scheduled_date} to ${t.deadline || t.scheduled_date}</li>
                        `).join('')}
                    </ul>
                </div>
            `;
            tasksSec.style.display = 'block';
        } else {
            tasksSec.style.display = 'none';
        }

        // Render alternative faculty
        const altFacs = result.recommendations?.alternative_faculty || [];
        if (altFacs.length > 0) {
            altFacultyContainer.style.display = 'block';
            altFacultyList.innerHTML = altFacs.map(f => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 10px 14px; border-radius: 8px;">
                    <div>
                        <strong style="color: var(--text-color);">${f.name}</strong>
                        ${f.teaches_subject ? '<span style="background: rgba(11, 122, 117, 0.2); color: var(--primary-color); font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Teaches this subject</span>' : ''}
                        <div style="font-size: 0.8rem; color: var(--text-light); margin-top: 2px;">
                            Current Workload: ${f.current_workload} pts → Resulting: ${f.resulting_workload} / ${result.threshold} pts
                        </div>
                    </div>
                    <button type="button" class="btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="applyAlternativeFaculty(${f.id}, '${f.name}')">
                        Assign to ${f.name}
                    </button>
                </div>
            `).join('');
        } else {
            altFacultyContainer.style.display = 'block';
            altFacultyList.innerHTML = '<p style="color: var(--text-light); font-size: 0.85rem; margin: 0;">No other faculty in this department have capacity for this subject during these dates.</p>';
        }

        // Render alternative dates
        const altDates = result.recommendations?.alternative_dates || [];
        if (altDates.length > 0) {
            altDatesContainer.style.display = 'block';
            altDatesList.innerHTML = altDates.map(d => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 10px 14px; border-radius: 8px;">
                    <div>
                        <strong style="color: var(--text-color);">${d.scheduled_date}</strong> (Due: ${d.deadline})
                        <div style="font-size: 0.8rem; color: var(--text-light); margin-top: 2px;">
                            Workload on this window: ${d.existing_workload} pts → Resulting: ${d.resulting_workload} / ${result.threshold} pts
                        </div>
                    </div>
                    <button type="button" class="btn-primary" style="background: #2563eb; padding: 6px 12px; font-size: 0.85rem;" onclick="applyAlternativeDate('${d.scheduled_date}', '${d.deadline}')">
                        Shift to ${d.scheduled_date}
                    </button>
                </div>
            `).join('');
        } else {
            altDatesContainer.style.display = 'block';
            altDatesList.innerHTML = '<p style="color: var(--text-light); font-size: 0.85rem; margin: 0;">No free dates found within the next 30 days.</p>';
        }

        modal.classList.add('active');
    }

    // Modal Action: Apply Alternative Faculty
    window.applyAlternativeFaculty = function(facultyId, facultyName) {
        const assigneeSelect = document.getElementById('taskAssignee');
        if (assigneeSelect) {
            assigneeSelect.value = facultyId;
            if (assigneeSelect.onchange) assigneeSelect.onchange();
        }
        document.getElementById('workloadModal').classList.remove('active');
        alert(`Assigned faculty changed to ${facultyName}. Click "Assign Task" to confirm and submit.`);
    };

    // Modal Action: Apply Alternative Date
    window.applyAlternativeDate = function(schedDate, deadline) {
        const schedInput = document.getElementById('taskScheduledDate');
        const deadInput = document.getElementById('taskDeadline');
        if (schedInput) schedInput.value = schedDate;
        if (deadInput) deadInput.value = deadline;
        document.getElementById('workloadModal').classList.remove('active');
        alert(`Dates updated to Start: ${schedDate}, Due: ${deadline}. Click "Assign Task" to confirm and submit.`);
    };

    // Close Modal Listeners
    document.getElementById('closeWorkloadModal')?.addEventListener('click', () => {
        document.getElementById('workloadModal').classList.remove('active');
    });
    document.getElementById('dismissWorkloadModalBtn')?.addEventListener('click', () => {
        document.getElementById('workloadModal').classList.remove('active');
    });

    // --- 4. Calendar View ---
    let currentCalDate = new Date(); // Start with current month
    
    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const displayMonthYear = document.getElementById('currentMonthYear');
        grid.innerHTML = '';
        
        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        displayMonthYear.textContent = `${monthNames[month]} ${year}`;
        
        // Calculate task dates (assuming 'today' is the baseline for deadlineDays)
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const tasksWithDates = dataStore.tasks.map(t => {
            const date = new Date(today);
            date.setDate(today.getDate() + t.deadlineDays);
            return { ...t, targetDate: date };
        });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Render empty slots for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            grid.innerHTML += `<div class="calendar-day empty"></div>`;
        }
        
        // Render days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dayTasks = tasksWithDates.filter(t => t.targetDate.getFullYear() === year && t.targetDate.getMonth() === month && t.targetDate.getDate() === day);
            
            let classStr = 'calendar-day';
            
            if (dayTasks.length > 0) {
                classStr += ' has-tasks';
                const hasUrgent = dayTasks.some(t => t.deadlineDays <= 2);
                if (hasUrgent) classStr += ' urgent';
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
                showTasksForDate(year, month, parseInt(el.getAttribute('data-day')), tasksWithDates);
            });
        });
        
        // Hide details by default
        document.getElementById('calendarTaskDetails').style.display = 'none';
    }

    function showTasksForDate(year, month, day, tasksWithDates) {
        const detailsContainer = document.getElementById('calendarTaskDetails');
        const selectedDateTasks = document.getElementById('selectedDateTasks');
        const selectedDateDisplay = document.getElementById('selectedDateDisplay');
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        selectedDateDisplay.textContent = `${monthNames[month]} ${day}, ${year}`;
        
        const dayTasks = tasksWithDates.filter(t => t.targetDate.getFullYear() === year && t.targetDate.getMonth() === month && t.targetDate.getDate() === day);
        
        selectedDateTasks.innerHTML = '';
        if (dayTasks.length === 0) {
            selectedDateTasks.innerHTML = '<p style="color:var(--text-light);">No tasks due on this date.</p>';
        } else {
            dayTasks.forEach(t => {
                selectedDateTasks.innerHTML += `
                    <div class="task-detail-card">
                        <strong style="font-size: 1.1rem; display:block; margin-bottom:4px;">${t.desc}</strong>
                        <div style="color:var(--text-light); font-size: 0.9rem;">
                            <span>Assigned to: ${getUserName(t.assigneeId)}</span> &bull; 
                            <span>Difficulty: ${t.difficulty}/10</span> &bull; 
                            <span style="color: ${t.deadlineDays <= 2 ? '#e53e3e' : 'var(--text-light)'}">Status: ${t.status}</span>
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

    // --- 5. Team Chat (WhatsApp Style) ---
    let activeChatId = 'group'; // 'group' or userId
    
    function renderChatContacts() {
        const contactsList = document.getElementById('chatContactsList');
        if (!contactsList) return;
        contactsList.innerHTML = '';
        
        dataStore.chatThreads.forEach(t => {
            let name, initial, subText;
            if (t.type === 'group') {
                name = t.name;
                initial = t.initial || name.charAt(0).toUpperCase();
                subText = t.members === 'all' ? 'All Enrolled Users' : `${t.members.length} members`;
            } else {
                const user = dataStore.users.find(u => u.id === t.userId);
                if(!user) return;
                name = user.name;
                initial = name.charAt(0).toUpperCase();
                subText = user.role;
            }

            const isGroup = t.type === 'group';
            const bgPrimary = isGroup ? 'var(--primary-color)' : '#4a5568';
            
            const div = document.createElement('div');
            div.style.cssText = `padding: 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s; background: ${activeChatId === t.id ? 'rgba(255,255,255,0.1)' : 'transparent'}; border-bottom: 1px solid var(--glass-border);`;
            div.onmouseover = () => { if(activeChatId !== t.id) div.style.background = 'rgba(255,255,255,0.05)'; };
            div.onmouseout = () => { if(activeChatId !== t.id) div.style.background = 'transparent'; };
            div.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background: ${bgPrimary}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${initial}</div>
                             <div><h4 style="margin: 0;">${name}</h4><small style="color: var(--text-light); text-transform: capitalize;">${subText}</small></div>`;
            div.onclick = () => switchChat(t.id, name, initial, subText, isGroup);
            contactsList.appendChild(div);
        });
    }

    let activeChatIsGroup = true;
    function switchChat(id, name, initial, subText, isGroup = false) {
        activeChatId = id;
        activeChatIsGroup = isGroup;
        document.getElementById('activeChatName').textContent = name;
        document.getElementById('activeChatAvatar').textContent = initial;
        document.getElementById('activeChatSub').textContent = subText;
        renderChatContacts();
        renderChatMessages();
    }

    function renderChatMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        container.innerHTML = '';
        
        const filteredMsgs = dataStore.messages.filter(m => 
            (activeChatIsGroup && m.receiverId === activeChatId) || 
            (!activeChatIsGroup && !m.isGroup && (m.senderId === activeChatId || m.receiverId === activeChatId))
        );

        if (filteredMsgs.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-light); margin-top: 40px;">No messages yet. Start the conversation!</div>`;
            return;
        }

        filteredMsgs.forEach(m => {
            const isSentByMe = m.senderId === currentHod.id;
            const bubbleStyle = isSentByMe 
                ? `background: var(--primary-color); color: white; margin-left: auto; border-bottom-right-radius: 4px;` 
                : `background: rgba(255,255,255,0.1); color: var(--text-color); margin-right: auto; border-bottom-left-radius: 4px;`;
            
            let senderName = '';
            if (activeChatIsGroup && !isSentByMe) {
                const sender = dataStore.users.find(u => u.id === m.senderId);
                senderName = `<div style="font-size: 0.75rem; color: var(--primary-color); margin-bottom: 4px; font-weight: bold;">${sender ? sender.name : 'Unknown'}</div>`;
            }

            container.innerHTML += `
                <div style="max-width: 70%; padding: 12px 16px; border-radius: 16px; ${bubbleStyle}">
                    ${senderName}
                    <div style="line-height: 1.4;">${m.text}</div>
                    <div style="font-size: 0.7rem; opacity: 0.7; text-align: right; margin-top: 4px;">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            `;
        });
        container.scrollTop = container.scrollHeight;
    }

    function renderChat() {
        renderChatContacts();
        renderChatMessages();
    }

    document.getElementById('chatForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        if(input.value.trim() !== '') {
            dataStore.messages.push({
                id: dataStore.messages.length + 1,
                senderId: currentHod.id,
                receiverId: activeChatId,
                text: input.value,
                timestamp: new Date().toISOString(),
                isGroup: activeChatIsGroup
            });
            input.value = '';
            renderChatMessages();
        }
    });

    // --- 5.5 Chat Modals Logic ---
    const newChatModal = document.getElementById('newChatModal');
    const newGroupModal = document.getElementById('newGroupModal');

    document.getElementById('btnNewChat')?.addEventListener('click', () => {
        const select = document.getElementById('newChatUserSelect');
        select.innerHTML = '';
        dataStore.users.forEach(u => {
            if (u.id !== currentHod.id && !dataStore.chatThreads.some(t => t.type === 'individual' && t.userId === u.id)) {
                select.innerHTML += `<option value="${u.id}">${u.name} (${u.role})</option>`;
            }
        });
        if (select.options.length === 0) {
            select.innerHTML = '<option value="">No new users available</option>';
        }
        newChatModal.classList.add('active');
    });
    
    document.getElementById('btnNewGroup')?.addEventListener('click', () => {
        const select = document.getElementById('newGroupMembersSelect');
        select.innerHTML = '';
        dataStore.users.forEach(u => {
            if (u.id !== currentHod.id) {
                select.innerHTML += `<option value="${u.id}">${u.name} (${u.role})</option>`;
            }
        });
        newGroupModal.classList.add('active');
    });

    document.getElementById('closeNewChatModal')?.addEventListener('click', () => newChatModal.classList.remove('active'));
    document.getElementById('closeNewGroupModal')?.addEventListener('click', () => newGroupModal.classList.remove('active'));

    // Search filters for modals
    document.getElementById('searchNewChatUser')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const options = document.getElementById('newChatUserSelect').options;
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = options[i].text.toLowerCase().includes(term) ? '' : 'none';
        }
    });

    document.getElementById('searchNewGroupUser')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const options = document.getElementById('newGroupMembersSelect').options;
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = options[i].text.toLowerCase().includes(term) ? '' : 'none';
        }
    });

    document.getElementById('newChatForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = parseInt(document.getElementById('newChatUserSelect').value);
        if (!userId) return;
        
        dataStore.chatThreads.push({
            id: userId,
            type: 'individual',
            userId: userId
        });
        
        newChatModal.classList.remove('active');
        const user = dataStore.users.find(u => u.id === userId);
        switchChat(userId, user.name, user.name.charAt(0).toUpperCase(), user.role, false);
    });

    document.getElementById('newGroupForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('newGroupNameInput').value;
        const select = document.getElementById('newGroupMembersSelect');
        const members = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));
        members.push(currentHod.id); // Add self
        
        const groupId = 'group_' + Date.now();
        dataStore.chatThreads.push({
            id: groupId,
            type: 'group',
            name: name,
            members: members,
            initial: name.charAt(0).toUpperCase()
        });
        
        e.target.reset();
        newGroupModal.classList.remove('active');
        switchChat(groupId, name, name.charAt(0).toUpperCase(), `${members.length} members`, true);
    });

    // --- 6. Grievances ---
    function renderGrievances() {
        const tbody = document.getElementById('grievanceList');
        tbody.innerHTML = '';
        dataStore.grievances.forEach(g => {
            let statColor = '#dd6b20'; // Pending
            if (g.status === 'Resolved') statColor = '#48bb78';
            else if (g.status === 'Remark Sent') statColor = '#3182ce';
            
            tbody.innerHTML += `
                <tr>
                    <td>${g.date}</td>
                    <td>${getUserName(g.fromId)}</td>
                    <td>${g.subject}</td>
                    <td style="color:${statColor}; font-weight:500;">${g.status}</td>
                    <td>
                        <button class="action-btn" onclick="viewGrievance(${g.id})">View</button>
                    </td>
                </tr>
            `;
        });
    }

    window.viewGrievance = function(id) {
        const g = dataStore.grievances.find(x => x.id === id);
        if(!g) return;
        
        document.getElementById('grievanceDetails').innerHTML = `
            <strong>From:</strong> ${getUserName(g.fromId)}<br>
            <strong>Date:</strong> ${g.date}<br>
            <strong>Subject:</strong> ${g.subject}<br><br>
            <p style="padding:16px; background:rgba(0,0,0,0.1); border-radius:8px;">${g.details}</p>
        `;
        
        const resolveBtn = document.getElementById('resolveGrievanceBtn');
        const sendRemarkBtn = document.getElementById('sendRemarkBtn');
        const resSection = document.getElementById('grievanceResolutionSection');
        const remarksInput = document.getElementById('grievanceRemarks');

        if (g.status === 'Pending' || g.status === 'Remark Sent') {
            document.getElementById('grievanceActionButtons').style.display = 'flex';
            resSection.style.display = 'block';
            remarksInput.value = g.resolution || '';
            remarksInput.disabled = false;
            
            sendRemarkBtn.onclick = () => {
                const remarks = remarksInput.value.trim();
                if (!remarks) {
                    alert('Please enter a remark to send.');
                    return;
                }
                g.resolution = remarks;
                g.status = 'Remark Sent';
                alert('Remark saved successfully!');
                document.getElementById('grievanceModal').classList.remove('active');
                renderGrievances();
            };

            resolveBtn.onclick = () => {
                const remarks = remarksInput.value.trim();
                if (!remarks) {
                    alert('Please enter resolution remarks.');
                    return;
                }
                g.status = 'Resolved';
                g.resolution = remarks;
                document.getElementById('grievanceModal').classList.remove('active');
                renderGrievances();
            };
        } else {
            document.getElementById('grievanceActionButtons').style.display = 'none';
            resSection.style.display = 'block';
            remarksInput.value = g.resolution || 'No remarks provided.';
            remarksInput.disabled = true;
        }

        document.getElementById('grievanceModal').classList.add('active');
    };

    document.getElementById('closeGrievanceModal').onclick = () => {
        document.getElementById('grievanceModal').classList.remove('active');
    };

    // --- 7. Faculties Directory ---
    function renderFaculties() {
        renderMyDepartment();
        renderAllFaculties();
        renderOtherHods();
    }

    function renderMyDepartment() {
        const tbody = document.getElementById('facultiesMyDeptList');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        const myFaculties = dataStore.users.filter(u => (u.deptId === currentHod.deptId || dataStore.invitedFaculties.includes(u.id)) && u.role === 'faculty');
        
        if(myFaculties.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No faculties found.</td></tr>';
            return;
        }

        myFaculties.forEach(f => {
            const isInvited = dataStore.invitedFaculties.includes(f.id);
            const statusBadge = isInvited ? '<span style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">Invited</span>' : '<span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">Core</span>';
            
            let actionHtml = '-';
            if (isInvited) {
                actionHtml = `<button class="btn-primary" style="background: transparent; border: 1px solid #e53e3e; color: #e53e3e; padding: 4px 12px; font-size: 0.9rem;" onclick="removeFaculty(${f.id})">Remove</button>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${f.name}</td>
                    <td style="text-transform: capitalize;">${f.role}</td>
                    <td>${statusBadge}</td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        });
    }

    function renderAllFaculties() {
        const tbody = document.getElementById('facultiesAllList');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        const filterDept = document.getElementById('facultiesDeptFilter')?.value || 'All';
        
        const allFaculties = dataStore.users.filter(u => u.role === 'faculty');
        
        let filtered = allFaculties;
        if(filterDept !== 'All') {
            filtered = allFaculties.filter(f => f.deptName === filterDept || (!f.deptName && filterDept === 'Computer Science' && f.deptId === 1));
        }

        if(filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No faculties found for this department.</td></tr>';
            return;
        }

        filtered.forEach(f => {
            const isInMyDept = f.deptId === currentHod.deptId;
            const isInvited = dataStore.invitedFaculties.includes(f.id);
            
            let actionHtml = '';
            if (isInMyDept) {
                actionHtml = '<span style="color: var(--text-light);">Your Dept</span>';
            } else if (isInvited) {
                actionHtml = `<button class="btn-primary" style="background: transparent; border: 1px solid #e53e3e; color: #e53e3e; padding: 4px 12px; font-size: 0.9rem;" onclick="removeFaculty(${f.id})">Remove</button>`;
            } else {
                actionHtml = `<button class="btn-primary" style="padding: 4px 12px; font-size: 0.9rem;" onclick="inviteFaculty(${f.id})">Invite</button>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${f.name}</td>
                    <td>${f.deptName || 'Department ' + f.deptId}</td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        });
    }

    window.inviteFaculty = function(id) {
        if(!dataStore.invitedFaculties.includes(id)) {
            dataStore.invitedFaculties.push(id);
            alert('Faculty invited successfully!');
            renderFaculties();
        }
    };

    window.removeFaculty = function(id) {
        dataStore.invitedFaculties = dataStore.invitedFaculties.filter(fId => fId !== id);
        alert('Faculty removed successfully!');
        renderFaculties();
    };

    document.getElementById('facultiesDeptFilter')?.addEventListener('change', renderAllFaculties);

    function renderOtherHods() {
        const container = document.getElementById('otherHodsList');
        if(!container) return;
        container.innerHTML = '';
        const otherHods = dataStore.users.filter(u => u.isHOD && u.id !== currentHod.id);
        
        if(otherHods.length === 0) {
            container.innerHTML = '<p>No other HODs found.</p>';
        }

        otherHods.forEach(h => {
            container.innerHTML += `
                <div class="hod-card">
                    <div class="hod-avatar">${h.name.charAt(0)}</div>
                    <div class="hod-name">${h.name}</div>
                    <div class="hod-dept">${h.deptName || 'Department ' + h.deptId}</div>
                </div>
            `;
        });
    }

    // Tab Logic
    document.getElementById('btnFacultiesMyDept')?.addEventListener('click', () => switchFacultiesTab('mydept'));
    document.getElementById('btnFacultiesAll')?.addEventListener('click', () => switchFacultiesTab('all'));
    document.getElementById('btnFacultiesHods')?.addEventListener('click', () => switchFacultiesTab('hods'));

    function switchFacultiesTab(tab) {
        document.getElementById('btnFacultiesMyDept').style.background = tab === 'mydept' ? 'var(--primary-color)' : 'transparent';
        document.getElementById('btnFacultiesMyDept').style.border = tab === 'mydept' ? 'none' : '1px solid var(--primary-color)';
        document.getElementById('btnFacultiesAll').style.background = tab === 'all' ? 'var(--primary-color)' : 'transparent';
        document.getElementById('btnFacultiesAll').style.border = tab === 'all' ? 'none' : '1px solid var(--primary-color)';
        document.getElementById('btnFacultiesHods').style.background = tab === 'hods' ? 'var(--primary-color)' : 'transparent';
        document.getElementById('btnFacultiesHods').style.border = tab === 'hods' ? 'none' : '1px solid var(--primary-color)';

        document.getElementById('facultiesMyDeptView').style.display = tab === 'mydept' ? 'block' : 'none';
        document.getElementById('facultiesAllView').style.display = tab === 'all' ? 'block' : 'none';
        document.getElementById('facultiesHodsView').style.display = tab === 'hods' ? 'block' : 'none';
    }

    // --- 8. Profile ---
    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = document.getElementById('profilePassword').value;
        if(pwd.length > 0) {
            alert('Password updated successfully!');
            e.target.reset();
        }
    });

    // --- Init ---
    renderOverview();
    renderSubjects();
    renderTimetable();
    renderTasks();
    renderCalendar();
    renderChat();
    renderGrievances();
    renderFaculties();

});
