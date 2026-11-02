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
            } else if(targetId === 'grievances') {
                renderGrievances();
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
        let activeTasks = [];
        let taskLoadError = token ? '' : 'Please sign in again to load tasks from the database.';

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
                    if (taskData.success && Array.isArray(taskData.tasks)) {
                        activeTasks = taskData.tasks;
                    } else {
                        taskLoadError = taskData.message || 'The server returned an invalid task list.';
                    }
                } else if (taskRes.status === 401) {
                    taskLoadError = 'Your session is invalid or expired. Please sign out and sign in again.';
                } else {
                    taskLoadError = `Unable to load tasks (HTTP ${taskRes.status}).`;
                }
            } catch (e) {
                console.warn('Overview backend load note:', e);
                taskLoadError = 'Unable to reach the backend. Make sure it is running, then refresh this page.';
            }
        }

        if (document.getElementById('stat-faculty')) document.getElementById('stat-faculty').textContent = faculty.length;
        if (document.getElementById('stat-students')) document.getElementById('stat-students').textContent = students.length;
        if (document.getElementById('stat-tasks')) document.getElementById('stat-tasks').textContent = activeTasks.length;

        // Workload Threshold is 15 points
        const threshold = 15;
        const workloadContainer = document.getElementById('workloadContainer');
        if (workloadContainer) {
            workloadContainer.innerHTML = '';
            
            faculty.forEach(fac => {
                let totalDiff = fac.total_active_workload;
                if (totalDiff === undefined) {
                    const facTasks = activeTasks.filter(t => (t.assigned_to || t.assigneeId) === fac.id);
                    totalDiff = facTasks.reduce((sum, t) => sum + Number(t.workload_points ?? t.estimated_hours ?? t.difficulty ?? 0), 0);
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
        }

        // Urgent tasks list
        const urgentTasksList = document.getElementById('urgentTasksList');
        if (urgentTasksList) {
            urgentTasksList.innerHTML = '';
            const urgentTasks = [...activeTasks].slice(0, 5);
            
            if (taskLoadError) {
                const errorRow = document.createElement('tr');
                const errorCell = document.createElement('td');
                errorCell.colSpan = 5;
                errorCell.style.cssText = 'text-align: center; color: var(--danger-color); padding: 16px;';
                errorCell.textContent = taskLoadError;
                errorRow.appendChild(errorCell);
                urgentTasksList.appendChild(errorRow);
            } else if (urgentTasks.length === 0) {
                urgentTasksList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 16px;">No active tasks.</td></tr>';
            } else {
                urgentTasks.forEach(t => {
                    const desc = t.description || t.desc;
                    const assignee = t.assignee_name || getUserName(t.assigned_to || t.assigneeId);
                    const diff = Number(t.workload_points ?? t.estimated_hours ?? t.difficulty ?? 0);
                    const days = t.deadline ? `Due: ${new Date(t.deadline).toLocaleDateString()}` : (t.deadlineDays ? `In ${t.deadlineDays} days` : 'Active');
                    const status = t.status || 'Active';
                    
                    urgentTasksList.innerHTML += `
                        <tr>
                            <td>${desc}<br><small>${t.category_name || t.subject_name || 'General work'} · ${t.estimated_hours ? `${t.estimated_hours} hours` : `${diff} workload points`}</small></td>
                            <td>${assignee}</td>
                            <td>${diff} points</td>
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
        const assignmentTypeSelect = document.getElementById('taskAssignmentType');
        const subjectGroup = document.getElementById('taskSubjectGroup');
        const otherCategoryGroup = document.getElementById('taskOtherCategoryGroup');
        const tbody = document.getElementById('allTasksList');

        if (!assigneeSelect || !subjectSelect || !assignmentTypeSelect) return;

        assigneeSelect.innerHTML = '<option value="">-- Select Faculty --</option>';
        subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
        const updateCategoryFields = () => {
            const isSubject = assignmentTypeSelect.value === 'subject';
            subjectGroup.style.display = isSubject ? '' : 'none';
            otherCategoryGroup.style.display = isSubject ? 'none' : '';
            subjectSelect.required = isSubject;
            subjectSelect.disabled = !isSubject;
            const otherCategoryInput = document.getElementById('taskOtherCategory');
            otherCategoryInput.required = !isSubject;
            otherCategoryInput.disabled = isSubject;
        };
        updateCategoryFields();
        assignmentTypeSelect.onchange = updateCategoryFields;

        let facultyList = [];
        let subjectsList = dataStore.subjects || [];
        let activeTasksList = dataStore.tasks || [];

        // Fetch dynamic data from backend API
        if (token) {
            try {
                // 1. Fetch faculty from backend
                const facRes = await fetch('http://localhost:5000/api/workload/faculty', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!facRes.ok) {
                    throw new Error(`Unable to load faculty (HTTP ${facRes.status}).`);
                }
                const facData = await facRes.json();
                if (!facData.success || !Array.isArray(facData.faculty)) {
                    throw new Error(facData.message || 'The server returned an invalid faculty list.');
                }
                facultyList = facData.faculty;

                // 2. Fetch subjects from backend
                const subRes = await fetch('http://localhost:5000/api/workload/subjects', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (subRes.ok) {
                    const subData = await subRes.json();
                    if (subData.success && Array.isArray(subData.subjects)) {
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
                        dataStore.tasks = activeTasksList;
                    }
                }
            } catch (err) {
                console.error('Task assignment data load failed:', err);
                facultyList = [];
            }
        } else {
            assigneeSelect.options[0].textContent = 'Sign in to load faculty';
        }

        // Populate Faculty dropdown
        if (facultyList.length > 0) {
            facultyList.forEach(f => {
                assigneeSelect.innerHTML += `<option value="${f.id}">${f.name} (${f.email || f.custom_id || 'Faculty'})</option>`;
            });
        } else if (token) {
            assigneeSelect.options[0].textContent = 'Unable to load faculty — check backend connection';
        }

        // Helper function to render subjects in dropdown
        function updateSubjectDropdown(filterFacultyId = null) {
            const selectedSubjectId = subjectSelect.value;
            subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
            if (subjectsList.length === 0) {
                subjectSelect.options[0].textContent = 'No subjects available';
            }
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
            if (subjectsList.some(s => String(s.id) === selectedSubjectId)) {
                subjectSelect.value = selectedSubjectId;
            }
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
                    const category = t.category_name || t.subject_name || 'General work';
                    const workloadPoints = Number(t.workload_points ?? t.estimated_hours ?? t.difficulty ?? 0);
                    const categoryBadge = `<br><small style="color: var(--primary-color); font-weight: 500;">${category}${t.subject_code ? ` (${t.subject_code})` : ''} · ${workloadPoints} workload points</small>`;

                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${desc}</strong>${categoryBadge}</td>
                            <td>${assigneeName}</td>
                            <td>${daysText}</td>
                            <td>${attachIcon}</td>
                        </tr>
                    `;
                });
            }
        }

        renderCalendar();
    }

    document.getElementById('assignTaskForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const assigneeId = parseInt(document.getElementById('taskAssignee').value);
        const assignmentType = document.getElementById('taskAssignmentType').value;
        const subjectId = assignmentType === 'subject' ? parseInt(document.getElementById('taskSubject').value) : null;
        const subjectOption = document.getElementById('taskSubject').selectedOptions[0];
        const categoryName = assignmentType === 'subject'
            ? subjectOption?.textContent.split(' ★')[0].trim()
            : document.getElementById('taskOtherCategory').value.trim();
        const desc = document.getElementById('taskDesc').value;
        const estimatedHours = Number(document.getElementById('taskEstimatedHours').value);
        const deadlineDate = document.getElementById('taskDeadline').value;
        const scheduledDate = document.getElementById('taskScheduledDate').value;

        if (!assigneeId || (assignmentType === 'subject' && !subjectId) || !categoryName || !Number.isFinite(estimatedHours) || estimatedHours <= 0) {
            alert('Select a faculty member and complete the required work category and estimated hours.');
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
                    assignment_type: assignmentType,
                    category_name: categoryName,
                    subject_id: subjectId,
                    assigned_to: assigneeId,
                    description: desc,
                    estimated_hours: estimatedHours,
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
                    `• Current Workload: ${faculty.current_workload} points\n` +
                    `• Estimated Time: ${estimatedHours} hours (+${estimatedHours} points)\n` +
                    `• Resulting Workload: ${faculty.resulting_workload} points\n` +
                    `• Maximum Limit: ${result.threshold} points\n\n` +
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
            document.getElementById('taskAssignmentType').dispatchEvent(new Event('change'));

            // Refresh UI components
            await renderTasks();
            if (typeof renderOverview === 'function') renderOverview();
            if (typeof renderCalendar === 'function') renderCalendar();

        } catch (error) {
            console.error('Approval error:', error);
            alert(`Unable to approve and save the task: ${error.message}`);
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
            alert(`Workload exceeded. Current workload: ${result.current_workload} points; result: ${result.resulting_workload} points (limit: ${result.threshold}).`);
            return;
        }

        const fac = result.selected_faculty || {};
        const addedHours = fac.estimated_hours || result.task?.estimated_hours || 0;
        const total = fac.resulting_workload || result.resulting_workload || 0;

        summary.innerHTML = `
            <div style="background: rgba(229, 62, 62, 0.1); border: 1px solid rgba(229, 62, 62, 0.3); border-radius: 8px; padding: 14px;">
                <p style="margin: 0 0 8px 0; font-size: 1rem; color: var(--text-color);">
                    <strong>${fac.name || 'Selected Faculty'}</strong> cannot take this assignment on the selected dates.
                </p>
                <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.9rem;">
                    <div>• Current Active Workload: <strong>${fac.current_workload} points</strong></div>
                    <div>• Estimated Time: <strong>${addedHours} hours (+${addedHours} points)</strong></div>
                    <div>• Resulting Total: <strong style="color: #e53e3e;">${total} points</strong></div>
                    <div>• Max Threshold: <strong>${result.threshold} points</strong></div>
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
                            <li><strong>${t.description}</strong> (${t.workload_points} points) — Active from ${t.scheduled_date} to ${t.deadline || t.scheduled_date}</li>
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
                            Current Workload: ${f.current_workload} points → Resulting: ${f.resulting_workload} / ${result.threshold} points
                        </div>
                    </div>
                    <button type="button" class="btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="applyAlternativeFaculty(${f.id}, '${f.name}')">
                        Assign to ${f.name}
                    </button>
                </div>
            `).join('');
        } else {
            altFacultyContainer.style.display = 'block';
            altFacultyList.innerHTML = '<p style="color: var(--text-light); font-size: 0.85rem; margin: 0;">No other faculty in this department have capacity during these dates.</p>';
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
                            Workload on this window: ${d.existing_workload} points → Resulting: ${d.resulting_workload} / ${result.threshold} points
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
        if (!grid || !displayMonthYear) return;
        grid.innerHTML = '';
        
        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        displayMonthYear.textContent = `${monthNames[month]} ${year}`;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const tasksByDate = new Map();
        (dataStore.tasks || []).forEach(task => {
            const dateValue = task.scheduled_date || task.deadline;
            if (!dateValue) return;
            const dateKey = String(dateValue).split('T')[0];
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
            if (!tasksByDate.has(dateKey)) tasksByDate.set(dateKey, []);
            tasksByDate.get(dateKey).push(task);
        });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Render empty slots for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            grid.innerHTML += `<div class="calendar-day empty"></div>`;
        }
        
        // Render days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDate.get(dayKey) || [];
            const dailyWorkload = dayTasks.reduce(
                (total, task) => {
                    const points = Number(task.workload_points ?? task.estimated_hours ?? task.difficulty ?? 0);
                    return total + (Number.isFinite(points) ? points : 0);
                },
                0
            );
            let classStr = 'calendar-day';
            
            if (dayTasks.length > 0) {
                classStr += ' has-tasks';
                if (dailyWorkload <= 5) classStr += ' workload-low';
                else if (dailyWorkload <= 10) classStr += ' workload-medium';
                else if (dailyWorkload <= 15) classStr += ' workload-high';
                else classStr += ' workload-overloaded';
            }
            
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                classStr += ' today';
            }
            
            grid.innerHTML += `
                <div class="${classStr}" data-day="${day}" ${dayTasks.length ? `title="${dayTasks.length} assigned task${dayTasks.length === 1 ? '' : 's'} · ${dailyWorkload.toFixed(2)} workload points"` : ''}>
                    <span class="day-number">${day}</span>
                    ${dayTasks.length ? `<small class="calendar-task-count">${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}</small>` : ''}
                </div>
            `;
        }

        // Add event listeners for day clicking
        document.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                el.classList.add('selected');
                showTasksForDate(year, month, parseInt(el.getAttribute('data-day')), tasksByDate);
            });
        });
        
        // Hide details by default
        document.getElementById('calendarTaskDetails').style.display = 'none';
    }

    function showTasksForDate(year, month, day, tasksByDate) {
        const detailsContainer = document.getElementById('calendarTaskDetails');
        const selectedDateTasks = document.getElementById('selectedDateTasks');
        const selectedDateDisplay = document.getElementById('selectedDateDisplay');
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        selectedDateDisplay.textContent = `${monthNames[month]} ${day}, ${year}`;
        
        const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasksByDate.get(dayKey) || [];
        
        selectedDateTasks.innerHTML = '';
        if (dayTasks.length === 0) {
            selectedDateTasks.innerHTML = '<p style="color:var(--text-light);">No tasks scheduled on this date.</p>';
        } else {
            dayTasks.forEach(t => {
                const assignee = t.assignee_name || getUserName(t.assigned_to || t.assigneeId);
                const description = t.description || t.desc || 'Assigned task';
                const category = t.category_name || t.subject_name || 'General work';
                const workloadPoints = Number(t.workload_points ?? t.estimated_hours ?? t.difficulty ?? 0);
                const scheduledDate = String(t.scheduled_date || '').split('T')[0];
                const deadlineText = t.deadline && String(t.deadline).split('T')[0] !== scheduledDate
                    ? `Due ${new Date(`${String(t.deadline).split('T')[0]}T00:00:00`).toLocaleDateString()}`
                    : '';
                selectedDateTasks.innerHTML += `
                    <div class="task-detail-card">
                        <strong style="font-size: 1.1rem; display:block; margin-bottom:4px;">${description}</strong>
                        <div style="color:var(--text-light); font-size: 0.9rem;">
                            <span>${category}</span> &bull;
                            <span>Assigned to: ${assignee}</span> &bull;
                            <span>${t.estimated_hours ? `${t.estimated_hours} hours` : `${workloadPoints} workload points`}</span>
                            ${deadlineText ? ` &bull; <span>${deadlineText}</span>` : ''}
                            &bull; <span>Status: ${t.status || 'Pending'}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        detailsContainer.style.display = 'block';
    }

    // Month navigation listeners
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentCalDate.setDate(1);
        currentCalDate.setMonth(currentCalDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentCalDate.setDate(1);
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

    // --- 6. Escalated Student Grievances ---
    let hodGrievances = [];

    function escapeGrievanceHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    async function renderGrievances() {
        const tbody = document.getElementById('grievanceList');
        if (!tbody) return;
        const token = localStorage.getItem('uniflow_token');
        if (!token) {
            tbody.innerHTML = '<tr><td colspan="7">Please sign in as an HOD to view department grievances.</td></tr>';
            return;
        }

        try {
            const headers = { 'Authorization': 'Bearer ' + token };
            const [response, facultyResponse] = await Promise.all([
                fetch('http://localhost:5000/api/grievances/hod/escalated', { headers }),
                fetch('http://localhost:5000/api/grievances/hod/faculty-grievances', { headers })
            ]);
            const [data, facultyData] = await Promise.all([
                response.json(),
                facultyResponse.json()
            ]);
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load escalated student grievances.');
            }
            if (!facultyResponse.ok || !facultyData.success) {
                throw new Error(facultyData.message || 'Failed to load faculty grievances.');
            }

            hodGrievances = [
                ...data.grievances.map(grievance => ({
                    ...grievance,
                    grievance_type: 'student',
                    filed_by_name: grievance.student_name,
                    assigned_to_name: grievance.faculty_name
                })),
                ...facultyData.grievances.map(grievance => ({
                    ...grievance,
                    grievance_type: 'faculty',
                    filed_by_name: grievance.faculty_name,
                    assigned_to_name: grievance.hod_name
                }))
            ];
            if (hodGrievances.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px;">No unresolved grievances need your attention.</td></tr>';
                return;
            }

            tbody.innerHTML = hodGrievances.map(grievance => {
                const status = grievance.grievance_type === 'faculty'
                    ? grievance.hod_resolved_at
                        ? 'Awaiting faculty confirmation'
                        : 'Needs HOD response'
                    : 'Escalated';
                return `
                    <tr>
                        <td>${escapeGrievanceHtml(new Date(grievance.created_at).toLocaleDateString())}</td>
                        <td>${escapeGrievanceHtml(grievance.filed_by_name)}</td>
                        <td>${escapeGrievanceHtml(grievance.assigned_to_name)}</td>
                        <td>${escapeGrievanceHtml(grievance.subject)}</td>
                        <td>${escapeGrievanceHtml(new Date(grievance.due_at).toLocaleDateString())}</td>
                        <td style="font-weight:600;">${escapeGrievanceHtml(status)}</td>
                        <td><button class="action-btn" onclick="viewGrievance(${grievance.id}, '${grievance.grievance_type}')">View</button></td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Load HOD grievances error:', error);
            tbody.innerHTML = `<tr><td colspan="7" role="alert">${escapeGrievanceHtml(error.message)}</td></tr>`;
        }
    }

    window.viewGrievance = function(id, grievanceType = 'student') {
        const grievance = hodGrievances.find(item => item.id === id && item.grievance_type === grievanceType);
        if (!grievance) return;
        activeHodGrievance = grievance;

        const isFacultyGrievance = grievance.grievance_type === 'faculty';
        const filerStatus = isFacultyGrievance
            ? grievance.faculty_confirmed_at ? 'Confirmed resolved' : 'Not confirmed'
            : grievance.student_resolved_at ? 'Confirmed resolved' : 'Not confirmed';
        const responderStatus = isFacultyGrievance
            ? grievance.hod_resolved_at ? 'Marked resolved' : 'Not marked resolved'
            : grievance.faculty_resolved_at ? 'Marked resolved' : 'Not marked resolved';
        document.getElementById('grievanceDetails').innerHTML = `
            <p><strong>Department:</strong> ${escapeGrievanceHtml(grievance.department_name)}</p>
            <p><strong>Filed by:</strong> ${escapeGrievanceHtml(grievance.filed_by_name)}</p>
            <p><strong>Assigned to:</strong> ${escapeGrievanceHtml(grievance.assigned_to_name)}</p>
            <p><strong>Category:</strong> ${escapeGrievanceHtml(grievance.category)}</p>
            <p><strong>Subject:</strong> ${escapeGrievanceHtml(grievance.subject)}</p>
            <p><strong>Description:</strong></p>
            <p style="white-space:pre-wrap; padding:16px; background:#f1f5f9; border-radius:8px;">${escapeGrievanceHtml(grievance.details)}</p>
            <p><strong>Filed:</strong> ${escapeGrievanceHtml(new Date(grievance.created_at).toLocaleString())}</p>
            <p><strong>7-day deadline:</strong> ${escapeGrievanceHtml(new Date(grievance.due_at).toLocaleString())}</p>
            <p><strong>${isFacultyGrievance ? 'HOD' : 'Assigned faculty'}:</strong> ${responderStatus} · <strong>${isFacultyGrievance ? 'Faculty' : 'Student'}:</strong> ${filerStatus}</p>
            ${grievance.resolution_comment ? `<p><strong>Resolution comment:</strong></p><p style="white-space:pre-wrap; padding:12px; background:#f1f5f9; border-radius:8px;">${escapeGrievanceHtml(grievance.resolution_comment)}</p>` : ''}
        `;
        const resolveButton = document.getElementById('hodResolveGrievanceBtn');
        resolveButton.hidden = !isFacultyGrievance || Boolean(grievance.hod_resolved_at || grievance.resolved_at);
        document.getElementById('hodResolutionCommentField').hidden = resolveButton.hidden;
        document.getElementById('hodResolutionComment').value = '';
        document.getElementById('grievanceModal').classList.add('active');
    };

    document.getElementById('hodResolveGrievanceBtn')?.addEventListener('click', async () => {
        if (!activeHodGrievance || activeHodGrievance.grievance_type !== 'faculty') return;
        const button = document.getElementById('hodResolveGrievanceBtn');
        button.disabled = true;
        try {
            const token = localStorage.getItem('uniflow_token');
            const response = await fetch(`http://localhost:5000/api/grievances/${activeHodGrievance.id}/hod-resolved`, {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resolution_comment: document.getElementById('hodResolutionComment').value
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not mark grievance resolved.');
            }

            document.getElementById('grievanceModal').classList.remove('active');
            await renderGrievances();
            alert(data.message);
        } catch (error) {
            console.error('Mark faculty grievance resolved by HOD error:', error);
            alert(error.message);
        } finally {
            button.disabled = false;
        }
    });

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

    // --- HOD Workload Overview & Chart Logic ---
    let hodSummaryData = null;
    let hodDeptSummaryData = null;
    let workloadChartInstance = null;

    // Harmonious, distinct color palette for faculty members across all graphs
    const FACULTY_COLOR_PALETTE = {
        'Dr. Alan Turing':  { bg: 'rgba(99, 102, 241, 0.85)', border: 'rgba(129, 140, 248, 1)' }, // Indigo
        'Dr. Alan Walker':  { bg: 'rgba(14, 165, 233, 0.85)', border: 'rgba(56, 189, 248, 1)' },  // Sky Blue
        'Dr. Jane Smith':   { bg: 'rgba(16, 185, 129, 0.85)', border: 'rgba(52, 211, 153, 1)' }, // Emerald Green
        'Grace Hopper':     { bg: 'rgba(245, 158, 11, 0.85)', border: 'rgba(251, 191, 36, 1)' },  // Amber/Warm Gold
        'Linus Torvalds':   { bg: 'rgba(168, 85, 247, 0.85)', border: 'rgba(192, 132, 252, 1)' }, // Purple/Violet
        'Dr. John Doe':     { bg: 'rgba(244, 63, 94, 0.85)',  border: 'rgba(251, 113, 133, 1)' }, // Rose/Coral
    };

    const FALLBACK_PALETTE = [
        { bg: 'rgba(99, 102, 241, 0.85)', border: 'rgba(129, 140, 248, 1)' },
        { bg: 'rgba(14, 165, 233, 0.85)', border: 'rgba(56, 189, 248, 1)' },
        { bg: 'rgba(16, 185, 129, 0.85)', border: 'rgba(52, 211, 153, 1)' },
        { bg: 'rgba(245, 158, 11, 0.85)', border: 'rgba(251, 191, 36, 1)' },
        { bg: 'rgba(168, 85, 247, 0.85)', border: 'rgba(192, 132, 252, 1)' },
        { bg: 'rgba(244, 63, 94, 0.85)',  border: 'rgba(251, 113, 133, 1)' },
        { bg: 'rgba(20, 184, 166, 0.85)', border: 'rgba(45, 212, 191, 1)' },
        { bg: 'rgba(249, 115, 22, 0.85)', border: 'rgba(251, 146, 60, 1)' }
    ];

    function getFacultyColor(name, index = 0) {
        if (name && FACULTY_COLOR_PALETTE[name]) return FACULTY_COLOR_PALETTE[name];
        for (const [key, val] of Object.entries(FACULTY_COLOR_PALETTE)) {
            if (name && (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase()))) {
                return val;
            }
        }
        return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
    }

    function getOrCreateCanvas() {
        let ctx = document.getElementById('workloadChart');
        if (!ctx) {
            const wrapper = document.getElementById('workloadChartCanvasWrapper') || document.getElementById('workloadChartContainer');
            if (wrapper) {
                wrapper.innerHTML = '<canvas id="workloadChart" style="width: 100%; height: 100%;"></canvas>';
                ctx = document.getElementById('workloadChart');
            }
        }
        return ctx;
    }

    async function fetchAllHodData() {
        try {
            const token = localStorage.getItem('uniflow_token');
            const headers = {};
            if (token) headers['Authorization'] = 'Bearer ' + token;

            const [academicRes, deptRes] = await Promise.all([
                fetch('http://localhost:5000/api/workload/hod/summary', { headers }).catch(e => null),
                fetch('http://localhost:5000/api/workload/department/hod/summary?category=all', { headers }).catch(e => null)
            ]);

            if (academicRes && academicRes.ok) {
                const data = await academicRes.json();
                if (data.success) hodSummaryData = data;
            }

            if (deptRes && deptRes.ok) {
                const deptData = await deptRes.json();
                if (deptData.success) hodDeptSummaryData = deptData;
            }

            // Render Overall Workload with Threshold Line by default
            renderOverallWorkloadChart();

        } catch (error) {
            console.error('Error fetching HOD workload datasets:', error);
            renderOverallWorkloadChart();
        }
    }

    let hodDataLoadPromise;

    async function fetchAndRenderHodSummary() {
        await (hodDataLoadPromise || fetchAllHodData());
    }

    // Flagship: Overall Comprehensive Workload Graph with Red Threshold Line
    function renderOverallWorkloadChart() {
        const ctx = getOrCreateCanvas();
        if (!ctx) return;

        const subtitle = document.getElementById('chartSubtitle');
        const badge = document.getElementById('thresholdBadge');
        if (!hodDeptSummaryData || !Array.isArray(hodDeptSummaryData.faculty_summary)) {
            if (workloadChartInstance) {
                workloadChartInstance.destroy();
                workloadChartInstance = null;
            }
            if (subtitle) subtitle.textContent = 'Overall workload is unavailable. Refresh to try again.';
            if (badge) badge.style.display = 'none';
            return;
        }

        if (subtitle) subtitle.textContent = 'Overall workload: academic units + cross-domain duties + active tasks';
        if (badge) {
            badge.style.display = 'inline-flex';
            badge.innerHTML = '<span style="display: inline-block; width: 14px; border-top: 2px dashed #ef4444;"></span> Ceiling: 120 points';
        }

        const facultyRoster = hodDeptSummaryData.faculty_summary;
        const labels = facultyRoster.map(f => f.faculty_name);
        const values = facultyRoster.map(f => Number(f.overall_workload.toFixed(2)));

        const bgColors = labels.map((name, i) => getFacultyColor(name, i).bg);
        const borderColors = labels.map((name, i) => getFacultyColor(name, i).border);
        const thresholdVal = 120;

        if (workloadChartInstance) {
            workloadChartInstance.destroy();
        }

        workloadChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Overall Workload Points',
                        data: values,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        maxBarThickness: 38,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7,
                        order: 2
                    },
                    {
                        type: 'line',
                        label: 'Recommended Max Threshold (120 points)',
                        data: labels.map(() => thresholdVal),
                        borderColor: '#ef4444',
                        borderWidth: 2.5,
                        borderDash: [8, 6],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff',
                            font: { family: "'Poppins', sans-serif", weight: '500' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.type === 'line') {
                                    return ` Workload Threshold: 120 points (Recommended Limit)`;
                                }
                                const val = parseFloat(context.raw);
                                const diff = (val - thresholdVal).toFixed(1);
                                const faculty = facultyRoster[context.dataIndex];
                                const breakdown = faculty
                                    ? `Academic ${faculty.academic_workload_units.toFixed(2)} + duties ${faculty.overall_cross_domain_workload_hours.toFixed(2)} + active tasks ${faculty.active_task_workload_hours.toFixed(2)}`
                                    : '';
                                if (val > thresholdVal) {
                                    return ` Workload: ${val.toFixed(2)} points (over by +${diff}). ${breakdown}`;
                                } else {
                                    return ` Workload: ${val.toFixed(2)} points (${Math.abs(diff)} below ceiling). ${breakdown}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Overall Workload Points', color: '#a5b4fc', font: { weight: '600' } },
                        ticks: { color: '#e2e8f0' },
                        grid: { color: 'rgba(255,255,255,0.08)' }
                    },
                    x: {
                        ticks: { color: '#e2e8f0', font: { weight: '500' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    function renderWorkloadChart(metricField, title) {
        const ctx = getOrCreateCanvas();
        if (!ctx) return;

        const subtitle = document.getElementById('chartSubtitle');
        const badge = document.getElementById('thresholdBadge');
        if (subtitle) subtitle.textContent = `Academic Workload: ${title}`;

        const isGrandTotal = (metricField === 'grand_total_workload_units');
        if (badge) {
            if (isGrandTotal) {
                badge.style.display = 'inline-flex';
                badge.innerHTML = '<span style="display: inline-block; width: 14px; border-top: 2px dashed #ef4444;"></span> Threshold: 120 pts';
            } else {
                badge.style.display = 'none';
            }
        }

        // Group by faculty
        const facultyTotals = {};
        if (hodSummaryData && hodSummaryData.workload_master) {
            hodSummaryData.workload_master.forEach(row => {
                const name = row.faculty_name || 'Unknown';
                if (!facultyTotals[name]) facultyTotals[name] = 0;
                facultyTotals[name] += parseFloat(row[metricField] || 0);
            });
        }

        const facultyRoster = hodDeptSummaryData?.faculty_summary || [];
        facultyRoster.forEach(f => {
            if (!facultyTotals[f.faculty_name]) facultyTotals[f.faculty_name] = 0;
        });

        const labels = Object.keys(facultyTotals);
        let values = Object.values(facultyTotals).map(v => parseFloat(v.toFixed(2)));

        const bgColors = labels.map((name, i) => getFacultyColor(name, i).bg);
        const borderColors = labels.map((name, i) => getFacultyColor(name, i).border);

        if (workloadChartInstance) {
            workloadChartInstance.destroy();
        }

        const datasets = [{
            type: 'bar',
            label: title,
            data: values,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 38,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
            order: 2
        }];

        if (isGrandTotal) {
            datasets.push({
                type: 'line',
                label: 'Recommended Max Threshold (120 units)',
                data: labels.map(() => 120),
                borderColor: '#ef4444',
                borderWidth: 2.5,
                borderDash: [8, 6],
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false,
                order: 1
            });
        }

        workloadChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff',
                            font: { family: "'Poppins', sans-serif", weight: '500' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.type === 'line') {
                                    return ` Workload Threshold: 120 units`;
                                }
                                const val = parseFloat(context.raw);
                                if (isGrandTotal) {
                                    const diff = (val - 120).toFixed(1);
                                    if (val > 120) {
                                        return ` ${title}: ${val} units (⚠️ Overload by +${diff} pts)`;
                                    } else {
                                        return ` ${title}: ${val} units (✓ Safe: ${Math.abs(diff)} pts below ceiling)`;
                                    }
                                }
                                return ` ${title}: ${val} units`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Workload Units', color: '#a5b4fc', font: { weight: '600' } },
                        ticks: { color: '#e2e8f0' },
                        grid: { color: 'rgba(255,255,255,0.08)' }
                    },
                    x: {
                        ticks: { color: '#e2e8f0', font: { weight: '500' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Workload Categories Configuration & Switching
    const WORKLOAD_DOMAINS = {
        'Department': {
            buttonId: 'linkDepartmentWork',
            title: 'Faculty-wise Department Workload Dashboard',
            label: 'Department Workload',
            icon: 'account_tree',
            bg: 'rgba(99, 102, 241, 0.85)',
            border: 'rgba(129, 140, 248, 1)'
        },
        'Institutional': {
            buttonId: 'linkInstitutionalWork',
            title: 'Faculty-wise Institutional Workload Dashboard',
            label: 'Institutional Workload',
            icon: 'corporate_fare',
            bg: 'rgba(2, 132, 199, 0.85)',
            border: 'rgba(56, 189, 248, 1)'
        },
        'ExtraProactive': {
            buttonId: 'linkExtraWork',
            title: 'Faculty-wise Extra Proactive Workload Dashboard',
            label: 'Extra Proactive Workload',
            icon: 'rocket_launch',
            bg: 'rgba(16, 185, 129, 0.85)',
            border: 'rgba(52, 211, 153, 1)'
        },
        'FDP_Workshop': {
            buttonId: 'linkFdpWork',
            title: 'Faculty-wise FDPs & Workshops Workload Dashboard',
            label: 'FDPs & Workshops Workload',
            icon: 'school',
            bg: 'rgba(245, 158, 11, 0.85)',
            border: 'rgba(251, 191, 36, 1)'
        },
        'Research': {
            buttonId: 'linkResearchWork',
            title: 'Faculty-wise Research Workload Dashboard',
            label: 'Research Workload',
            icon: 'biotech',
            bg: 'rgba(139, 92, 246, 0.85)',
            border: 'rgba(167, 139, 250, 1)'
        },
        'Consultancy': {
            buttonId: 'linkConsultancyWork',
            title: 'Faculty-wise Consultancy Workload Dashboard',
            label: 'Consultancy Workload',
            icon: 'handshake',
            bg: 'rgba(20, 184, 166, 0.85)',
            border: 'rgba(45, 212, 191, 1)'
        }
    };

    let activeWorkloadCategory = 'Department';

    // Toggle to Sub-Links menu
    const linkAcademic = document.getElementById('linkAcademic');
    const deptDashboardContainer = document.getElementById('deptWorkloadDashboardContainer');

    function setActiveCategoryButton(activeId) {
        const allBtnIds = [
            'linkOverallWorkload',
            'linkAcademic',
            'linkDepartmentWork',
            'linkInstitutionalWork',
            'linkExtraWork',
            'linkFdpWork',
            'linkResearchWork',
            'linkConsultancyWork'
        ];
        allBtnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (id === activeId) {
                btn.className = 'btn-primary';
                btn.style.opacity = '1';
            } else {
                btn.className = 'btn-secondary';
                btn.style.opacity = '1';
            }
        });
    }

    const linkOverallWorkload = document.getElementById('linkOverallWorkload');
    if (linkOverallWorkload) {
        linkOverallWorkload.addEventListener('click', () => {
            setActiveCategoryButton('linkOverallWorkload');
            document.getElementById('academicSubLinks').style.display = 'none';
            document.getElementById('workloadQuickLinks').style.display = 'flex';
            document.getElementById('workloadSubTableContainer').style.display = 'none';
            if (deptDashboardContainer) deptDashboardContainer.style.display = 'none';

            renderOverallWorkloadChart();
        });
    }

    if (linkAcademic) {
        linkAcademic.addEventListener('click', () => {
            setActiveCategoryButton('linkAcademic');

            document.getElementById('workloadQuickLinks').style.display = 'none';
            document.getElementById('academicSubLinks').style.display = 'flex';
            if (deptDashboardContainer) deptDashboardContainer.style.display = 'none';

            fetchAndRenderHodSummary().then(() => {
                renderWorkloadChart('grand_total_workload_units', 'Total Academic Workload');
                window.showSubTable('workload_master');
            });
        });
    }

    // Attach click listeners for all 6 categories
    Object.keys(WORKLOAD_DOMAINS).forEach(catKey => {
        const domain = WORKLOAD_DOMAINS[catKey];
        const btn = document.getElementById(domain.buttonId);
        if (btn) {
            btn.addEventListener('click', () => {
                activeWorkloadCategory = catKey;
                setActiveCategoryButton(domain.buttonId);

                document.getElementById('academicSubLinks').style.display = 'none';
                document.getElementById('workloadSubTableContainer').style.display = 'none';
                if (deptDashboardContainer) deptDashboardContainer.style.display = 'block';

                fetchAndRenderHodDeptWorkload(catKey);
            });
        }
    });

    const backToMainLinks = document.getElementById('backToMainLinks');
    if (backToMainLinks) {
        backToMainLinks.addEventListener('click', () => {
            document.getElementById('academicSubLinks').style.display = 'none';
            document.getElementById('workloadQuickLinks').style.display = 'flex';
            document.getElementById('workloadSubTableContainer').style.display = 'none';
            if (deptDashboardContainer) deptDashboardContainer.style.display = 'none';

            setActiveCategoryButton('linkOverallWorkload');
            
            // Revert chart to Overall Workload with Threshold Line
            renderOverallWorkloadChart();
        });
    }

    // Expose showSubTable to global scope for inline onclick handler
    window.showSubTable = function(tableName) {
        const container = document.getElementById('workloadSubTableContainer');
        const content = document.getElementById('subTableContent');
        const toggle = document.getElementById('toggleWorkloadTable');
        const toggleIcon = document.getElementById('workloadTableToggleIcon');
        const thead = document.getElementById('subTableHead');
        const tbody = document.getElementById('subTableBody');
        const titleEl = document.getElementById('subTableTitle');
        if (!container || !content || !toggle || !toggleIcon || !thead || !tbody || !titleEl) return;

        // Update the Chart to show the selected metric
        const tableToMetricMap = {
            'workload_master': { field: 'grand_total_workload_units', title: 'Total Academic Workload' },
            'teaching_loads': { field: 'teaching_load_units', title: 'Teaching Load Units' },
            'paper_and_assignment_setting': { field: 'question_setting_units', title: 'Question/Assignment Setting Units' },
            'preparation_and_course_factors': { field: 'prep_adjustment_units', title: 'Preparation Adjustment Units' },
            'evaluation_units': { field: 'evaluation_units', title: 'Evaluation Units' },
            'theory_hours': { field: 'theory_hours_per_week', title: 'Theory Hours (per week)' },
            'experience_multiplier': { field: 'experience_multiplier', title: 'Experience Multiplier' }
        };
        
        const mapping = tableToMetricMap[tableName];
        if (mapping) {
            renderWorkloadChart(mapping.field, mapping.title);
        }

        container.style.display = 'block';
        content.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Hide workload data table');
        toggleIcon.textContent = 'expand_less';
        thead.innerHTML = '';
        tbody.innerHTML = '';

        const data = hodSummaryData?.[tableName];
        titleEl.textContent = tableName.replace(/_/g, ' ').toUpperCase() + ' DATA';
        if (!Array.isArray(data)) {
            tbody.innerHTML = '<tr><td style="padding:12px;">Academic workload data could not be loaded. Check the backend connection and refresh.</td></tr>';
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td style="padding:12px;">No academic workload has been entered yet.</td></tr>';
            return;
        }

        let keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'subject_id' && k !== 'faculty_id' && k !== 'created_at');

        let headerHtml = '<tr>';
        keys.forEach(k => {
            headerHtml += `<th style="padding:12px; text-align:left; border-bottom: 2px solid var(--primary-color);">${k.replace(/_/g, ' ').toUpperCase()}</th>`;
        });
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;

        let bodyHtml = '';
        data.forEach(row => {
            bodyHtml += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">';
            keys.forEach(k => {
                let val = row[k];
                if (typeof val === 'number' && !Number.isInteger(val)) {
                    val = val.toFixed(2);
                }
                bodyHtml += `<td style="padding:12px;">${val !== null ? val : '-'}</td>`;
            });
            bodyHtml += '</tr>';
        });
        tbody.innerHTML = bodyHtml;
    };

    const workloadTableToggle = document.getElementById('toggleWorkloadTable');
    const workloadTableContent = document.getElementById('subTableContent');
    const workloadTableToggleIcon = document.getElementById('workloadTableToggleIcon');
    if (workloadTableToggle && workloadTableContent && workloadTableToggleIcon) {
        workloadTableToggle.addEventListener('click', () => {
            workloadTableContent.hidden = !workloadTableContent.hidden;
            const isExpanded = !workloadTableContent.hidden;
            workloadTableToggle.setAttribute('aria-expanded', String(isExpanded));
            workloadTableToggle.setAttribute(
                'aria-label',
                isExpanded ? 'Hide workload data table' : 'Show workload data table'
            );
            workloadTableToggleIcon.textContent = isExpanded ? 'expand_less' : 'expand_more';
        });
    }

    // =====================================================
    // --- HOD MULTI-DOMAIN WORKLOAD OVERVIEW & CHART LOGIC ---
    // =====================================================

    async function fetchAndRenderHodDeptWorkload(category = 'Department') {
        const domain = WORKLOAD_DOMAINS[category] || WORKLOAD_DOMAINS['Department'];

        // Update UI Header
        const headerTitle = document.getElementById('deptDashboardHeaderText');
        const headerIcon = document.getElementById('deptDashboardHeaderIcon');
        if (headerTitle) headerTitle.textContent = domain.title;
        if (headerIcon) headerIcon.textContent = domain.icon;

        try {
            const token = localStorage.getItem('uniflow_token');
            const headers = {};
            if (token) headers['Authorization'] = 'Bearer ' + token;

            const res = await fetch(`http://localhost:5000/api/workload/department/hod/summary?category=${category}`, {
                headers: headers
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || `Request failed with HTTP ${res.status}.`);
            }

            hodDeptSummaryData = data;

            // Render Bar Chart for Selected Workload Category
            renderHodDeptChart(data.faculty_summary, domain);

            // Render Table Dashboard
            renderHodDeptTable(data);

        } catch (error) {
            console.error(`Unable to load ${category} workload:`, error);
            const tbody = document.getElementById('hodDeptWorkloadTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--danger-color);">${error.message}</td></tr>`;
            }
        }
    }

    function renderHodDeptChart(facultySummary, domain = WORKLOAD_DOMAINS['Department']) {
        const ctx = getOrCreateCanvas();
        if (!ctx) return;

        const subtitle = document.getElementById('chartSubtitle');
        const badge = document.getElementById('thresholdBadge');
        if (subtitle) subtitle.textContent = domain.title;

        const labels = facultySummary.map(f => f.faculty_name);
        const values = facultySummary.map(f => parseFloat(f.department_workload_hours || 0));

        const bgColors = labels.map((name, i) => getFacultyColor(name, i).bg);
        const borderColors = labels.map((name, i) => getFacultyColor(name, i).border);

        // Calculate average
        const totalHours = values.reduce((sum, v) => sum + v, 0);
        const avgHours = values.length > 0 ? parseFloat((totalHours / values.length).toFixed(1)) : 0;

        if (badge) {
            badge.style.display = 'inline-flex';
            badge.innerHTML = `<span style="display: inline-block; width: 14px; border-top: 2px dashed #f59e0b;"></span> Dept Avg: ${avgHours} hrs`;
        }

        if (workloadChartInstance) {
            workloadChartInstance.destroy();
        }

        workloadChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: `${domain.label} (hours)`,
                        data: values,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        maxBarThickness: 38,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7,
                        order: 2
                    },
                    {
                        type: 'line',
                        label: `Department Average (${avgHours} hrs)`,
                        data: labels.map(() => avgHours),
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        borderDash: [6, 6],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff',
                            font: { family: "'Poppins', sans-serif", weight: '600' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.type === 'line') {
                                    return ` Category Benchmark: ${avgHours} hrs/semester`;
                                }
                                const val = parseFloat(context.raw);
                                const diff = (val - avgHours).toFixed(1);
                                if (val >= avgHours) {
                                    return ` ${context.label}: ${val} hrs (Above average by +${diff} hrs)`;
                                } else {
                                    return ` ${context.label}: ${val} hrs (Below average by ${diff} hrs)`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Hours per Semester', color: '#a5b4fc', font: { weight: '600' } },
                        ticks: { color: '#e2e8f0' },
                        grid: { color: 'rgba(255,255,255,0.08)' }
                    },
                    x: {
                        ticks: { color: '#e2e8f0', font: { weight: '500' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    function renderHodDeptTable(data) {
        const tbody = document.getElementById('hodDeptWorkloadTableBody');
        const totalEl = document.getElementById('hodDeptTotalHours');
        const avgEl = document.getElementById('hodDeptAvgHours');

        if (totalEl) totalEl.textContent = `${data.department_total_hours.toFixed(2)} hrs`;
        if (avgEl) avgEl.textContent = `${data.department_average_hours.toFixed(2)} hrs`;

        if (!tbody) return;
        tbody.innerHTML = '';

        if (!data.faculty_summary || data.faculty_summary.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-light);">No faculty data available.</td></tr>`;
            return;
        }

        data.faculty_summary.forEach(f => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';

            let interpBadge = '';
            if (f.interpretation === 'Above department average') {
                interpBadge = `<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.82rem;">Above department average</span>`;
            } else if (f.interpretation === 'Below department average') {
                interpBadge = `<span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.82rem;">Below department average</span>`;
            } else {
                interpBadge = `<span style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;">No data entered</span>`;
            }

            tr.innerHTML = `
                <td style="padding: 12px 10px; font-weight: 700; color: #4338ca; font-family: monospace;">${f.custom_id}</td>
                <td style="padding: 12px 10px; font-weight: 600; color: #0f172a;">${f.faculty_name}</td>
                <td style="padding: 12px 10px;">
                    <span style="font-weight: 800; color: #047857; font-size: 1.1rem;">${f.department_workload_hours.toFixed(2)}</span>
                </td>
                <td style="padding: 12px 10px; font-weight: 700; color: #0f172a;">${f.number_of_tasks}</td>
                <td style="padding: 12px 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; min-width: 45px; color: #0f172a;">${f.workload_share_pct.toFixed(1)}%</span>
                        <div style="flex: 1; max-width: 80px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${Math.min(100, f.workload_share_pct)}%; height: 100%; background: #4338ca; border-radius: 4px;"></div>
                        </div>
                    </div>
                </td>
                <td style="padding: 12px 10px;">${interpBadge}</td>
                <td style="padding: 12px 10px; text-align: center;">
                    <button class="btn-primary" onclick="openHodFacultyBreakdown(${f.faculty_id})" style="padding: 6px 12px; font-size: 0.82rem; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
                        View Breakdown
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    // Modal breakdown for HOD
    const hodBreakdownModal = document.getElementById('hodDeptBreakdownModal');
    const closeHodBreakdownModal = document.getElementById('closeHodDeptBreakdownModal');

    if (closeHodBreakdownModal) {
        closeHodBreakdownModal.addEventListener('click', () => {
            if (hodBreakdownModal) {
                hodBreakdownModal.style.display = 'none';
                hodBreakdownModal.classList.remove('active');
            }
        });
    }

    window.openHodFacultyBreakdown = function(facultyId) {
        if (!hodDeptSummaryData || !hodDeptSummaryData.faculty_summary) return;
        const faculty = hodDeptSummaryData.faculty_summary.find(f => f.faculty_id == facultyId);
        if (!faculty) return;

        document.getElementById('hodModalFacultyName').textContent = `${faculty.faculty_name} (${faculty.custom_id})`;
        document.getElementById('hodModalFacultySummary').textContent = 
            `Total Department Workload: ${faculty.department_workload_hours.toFixed(2)} hrs across ${faculty.number_of_tasks} assigned tasks (${faculty.workload_share_pct}% of department total).`;

        const tbody = document.getElementById('hodModalTasksBody');
        tbody.innerHTML = '';

        if (!faculty.tasks || faculty.tasks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color: var(--text-light);">No tasks allocated for this faculty member.</td></tr>`;
        } else {
            faculty.tasks.forEach(t => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #e2e8f0';
                tr.innerHTML = `
                    <td style="padding: 10px; font-family: monospace; color: #4338ca; font-weight: 700;">${t.task_id}</td>
                    <td style="padding: 10px;">
                        <span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 3px 8px; border-radius: 4px; font-size: 0.82rem; font-weight: 600;">${t.role_name}</span>
                    </td>
                    <td style="padding: 10px; font-weight: 600; color: #0f172a;">${t.task_name}</td>
                    <td style="padding: 10px; font-weight: 700; color: #0284c7;">${t.quantity} ${t.work_unit}</td>
                    <td style="padding: 10px; color: #475569; font-weight: 500;">${t.std_effort} hrs</td>
                    <td style="padding: 10px; color: #0f172a; font-weight: 500;">${t.occurrences}</td>
                    <td style="padding: 10px; color: #0f172a; font-weight: 500;">${t.complexity_factor}</td>
                    <td style="padding: 10px;">
                        <span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 8px; border-radius: 6px; font-weight: 700;">
                            ${t.calculated_workload.toFixed(2)} hrs
                        </span>
                    </td>
                    <td style="padding: 10px; color: #475569; font-size: 0.85rem;">${t.remarks || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        if (hodBreakdownModal) {
            hodBreakdownModal.style.display = 'flex';
            hodBreakdownModal.classList.add('active');
        }
    };

    // --- Init ---
    hodDataLoadPromise = fetchAllHodData();
    renderOverview();
    renderSubjects();
    renderTimetable();
    renderTasks();
    renderCalendar();
    renderChat();
    renderGrievances();
    renderFaculties();

    window.setInterval(() => {
        if (document.getElementById('grievances')?.classList.contains('active')) {
            renderGrievances();
        }
    }, 60_000);

});
