document.addEventListener('DOMContentLoaded', () => {
    
    // --- Initial / Seed Data Store ---
    const defaultDataStore = {
        departments: [
            { id: 1, customId: 'DEP-CS01', name: 'Computer Science', currentHodId: 1 },
            { id: 2, customId: 'DEP-ME02', name: 'Mechanical Engineering', currentHodId: 6 },
            { id: 3, customId: 'DEP-EE03', name: 'Electrical Engineering', currentHodId: 7 },
            { id: 4, customId: 'DEP-CE04', name: 'Civil Engineering', currentHodId: null }
        ],
        courses: [
            { id: 1, deptId: 1, name: 'B.Tech Computer Science', semesters: 8 },
            { id: 2, deptId: 2, name: 'B.Tech Mechanical', semesters: 8 },
            { id: 3, deptId: 3, name: 'B.Tech Electrical', semesters: 8 },
            { id: 4, deptId: 4, name: 'B.Tech Civil', semesters: 8 }
        ],
        users: [
            { id: 1, customId: 'HOD-CS01', name: 'Dr. Alan Turing', email: 'hod.cs@uniflow.edu', password: 'password123', role: 'faculty', deptIds: [1], courseId: null, semester: null, isHOD: true },
            { id: 6, customId: 'HOD-ME02', name: 'Dr. Nikola Tesla', email: 'hod.me@uniflow.edu', password: 'password123', role: 'faculty', deptIds: [2], courseId: null, semester: null, isHOD: true },
            { id: 7, customId: 'HOD-EE03', name: 'Dr. Marie Curie', email: 'hod.ee@uniflow.edu', password: 'password123', role: 'faculty', deptIds: [3], courseId: null, semester: null, isHOD: true },
            { id: 2, customId: 'FAC001', name: 'Grace Hopper', email: 'faculty@uniflow.edu', password: 'faculty123', role: 'faculty', deptIds: [1], courseId: null, semester: null, isHOD: false },
            { id: 3, customId: 'FAC002', name: 'Linus Torvalds', email: 'linus@uniflow.edu', password: 'password123', role: 'faculty', deptIds: [1], courseId: null, semester: null, isHOD: false },
            { id: 4, customId: 'STU001', name: 'Ada Lovelace', email: 'student@uniflow.edu', password: 'student123', role: 'student', deptIds: [1], courseId: 1, semester: 6, isHOD: false },
            { id: 5, customId: 'STU002', name: 'Tim Berners-Lee', email: 'tim@uniflow.edu', password: 'password123', role: 'student', deptIds: [1], courseId: 1, semester: 4, isHOD: false }
        ]
    };

    // Load from LocalStorage if available, otherwise initialize with defaultDataStore
    function loadDataStore() {
        const stored = localStorage.getItem('uniflow_dataStore');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure users have password field if loaded from old schema
                if (parsed.users) {
                    parsed.users.forEach(u => {
                        if (!u.password) u.password = 'password123';
                    });
                }
                return parsed;
            } catch (e) {
                console.error('Error parsing stored dataStore, using defaults', e);
            }
        }
        localStorage.setItem('uniflow_dataStore', JSON.stringify(defaultDataStore));
        return JSON.parse(JSON.stringify(defaultDataStore));
    }

    const dataStore = loadDataStore();

    function saveDataStore() {
        localStorage.setItem('uniflow_dataStore', JSON.stringify(dataStore));
    }

    // --- Tab Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(sec => sec.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // --- Helper Functions ---
    function updateDashboardStats() {
        const assignedHodsCount = dataStore.departments.filter(d => d.currentHodId !== null).length;
        const facultyCount = dataStore.users.filter(u => u.role === 'faculty' && !u.isHOD).length;
        const studentCount = dataStore.users.filter(u => u.role === 'student').length;

        document.getElementById('stat-departments').textContent = dataStore.departments.length;
        if (document.getElementById('stat-hods')) {
            document.getElementById('stat-hods').textContent = assignedHodsCount;
        }
        document.getElementById('stat-courses').textContent = dataStore.courses.length;
        if (document.getElementById('stat-faculty')) {
            document.getElementById('stat-faculty').textContent = facultyCount;
        }
        if (document.getElementById('stat-students')) {
            document.getElementById('stat-students').textContent = studentCount;
        }
        document.getElementById('stat-users').textContent = dataStore.users.length;
    }

    function renderDepartments() {
        const tbody = document.getElementById('departmentList');
        if (!tbody) return;
        tbody.innerHTML = '';
        dataStore.departments.forEach(dept => {
            let hodName = '<span style="color: var(--text-light); font-style: italic;">Unassigned</span>';
            let hodEmail = '-';
            if (dept.currentHodId) {
                const hod = dataStore.users.find(u => u.id == dept.currentHodId);
                if (hod) {
                    hodName = `<strong style="color: var(--primary-color);">${hod.name}</strong> (${hod.customId || 'HOD'})`;
                    hodEmail = `<span class="credential-chip">${hod.email}</span>`;
                }
            }
            tbody.innerHTML += `<tr>
                <td><strong>${dept.customId}</strong></td>
                <td>${dept.name}</td>
                <td>${hodName}</td>
                <td>${hodEmail}</td>
                <td>
                    <button class="action-btn" onclick="openEditModal('department', ${dept.id})">Edit</button>
                    <button class="action-btn" style="background: rgba(11, 122, 117, 0.15); color: var(--primary-color);" onclick="goToHodCredentials(${dept.id})">Manage HOD</button>
                </td>
            </tr>`;
        });
        updateDropdowns();
    }

    // Render Dedicated HOD Credentials Management Table
    function renderHodCredentials() {
        const tbody = document.getElementById('hodCredentialsList');
        if (!tbody) return;
        tbody.innerHTML = '';

        dataStore.departments.forEach(dept => {
            let hodName = '<span style="color: var(--text-light); font-style: italic;">No HOD Assigned</span>';
            let hodId = '-';
            let hodEmail = '<span style="color: var(--text-light);">-</span>';
            let hodPasswordHtml = '<span style="color: var(--text-light);">-</span>';
            let statusBadge = '<span class="status-badge badge-unassigned">Unassigned</span>';
            let actionButtons = `
                <button class="action-btn" style="background: var(--primary-color); color: white;" onclick="setupHodForDept(${dept.id})">Configure Credentials</button>
            `;

            if (dept.currentHodId) {
                const hod = dataStore.users.find(u => u.id == dept.currentHodId);
                if (hod) {
                    hodName = `<strong>${hod.name}</strong>`;
                    hodId = hod.customId || 'HOD';
                    hodEmail = `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="credential-chip" id="email-chip-${hod.id}">${hod.email}</span>
                            <span class="material-symbols-outlined copy-btn" style="font-size: 16px;" onclick="copyCredential('${hod.email}')" title="Copy Email">content_copy</span>
                        </div>
                    `;
                    hodPasswordHtml = `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="credential-chip" id="pwd-display-${hod.id}">••••••••</span>
                            <span class="material-symbols-outlined copy-btn" style="font-size: 16px;" onclick="togglePasswordCell(${hod.id}, '${hod.password || 'password123'}')" title="Show/Hide Password" id="pwd-icon-${hod.id}">visibility</span>
                            <span class="material-symbols-outlined copy-btn" style="font-size: 16px;" onclick="copyCredential('${hod.password || 'password123'}')" title="Copy Password">content_copy</span>
                        </div>
                    `;
                    statusBadge = '<span class="status-badge badge-active">Active Credentials</span>';
                    actionButtons = `
                        <button class="action-btn" onclick="openEditModal('hod', ${hod.id})">Edit</button>
                        <button class="action-btn" style="background: rgba(245, 158, 11, 0.15); color: #d97706;" onclick="resetHodPassword(${dept.id})">Reset Password</button>
                        <button class="action-btn" style="background: rgba(220, 53, 69, 0.15); color: #dc3545;" onclick="unassignHod(${dept.id})">Unassign</button>
                    `;
                }
            }

            tbody.innerHTML += `<tr>
                <td><strong>${dept.name}</strong> <small style="color: var(--text-light);">(${dept.customId})</small></td>
                <td>${hodName}</td>
                <td>${hodId}</td>
                <td>${hodEmail}</td>
                <td>${hodPasswordHtml}</td>
                <td>${statusBadge}</td>
                <td>${actionButtons}</td>
            </tr>`;
        });
    }

    function renderCourses() {
        const tbody = document.getElementById('courseList');
        if (!tbody) return;
        tbody.innerHTML = '';
        dataStore.courses.forEach(course => {
            const dept = dataStore.departments.find(d => d.id == course.deptId);
            tbody.innerHTML += `<tr>
                <td>${course.name}</td>
                <td>${dept ? dept.name : 'Unknown'}</td>
                <td>${course.semesters} Semesters</td>
                <td><button class="action-btn" onclick="openEditModal('course', ${course.id})">Edit</button></td>
            </tr>`;
        });
        updateDropdowns();
    }

    // Advanced Rendering for Users with Filters & Password display
    function renderUsers() {
        const filterInput = document.getElementById('filterUserId');
        const userIdFilter = filterInput ? filterInput.value.toLowerCase() : '';
        const roleFilter = document.getElementById('filterRole') ? document.getElementById('filterRole').value : 'all';
        const deptFilter = document.getElementById('filterDept') ? document.getElementById('filterDept').value : 'all';
        const courseFilter = document.getElementById('filterCourse') ? document.getElementById('filterCourse').value : 'all';
        const semFilter = document.getElementById('filterSem') ? document.getElementById('filterSem').value : 'all';

        const tbody = document.getElementById('userList');
        if (!tbody) return;
        tbody.innerHTML = '';

        const filteredUsers = dataStore.users.filter(user => {
            let match = true;
            if (userIdFilter) {
                const idMatch = user.customId && user.customId.toLowerCase().includes(userIdFilter);
                const nameMatch = user.name && user.name.toLowerCase().includes(userIdFilter);
                const emailMatch = user.email && user.email.toLowerCase().includes(userIdFilter);
                if (!idMatch && !nameMatch && !emailMatch) match = false;
            }
            
            if (roleFilter !== 'all') {
                if (roleFilter === 'hod') {
                    if (!user.isHOD) match = false;
                } else if (user.role !== roleFilter) {
                    match = false;
                }
            }

            if (deptFilter !== 'all' && (!user.deptIds || !user.deptIds.includes(parseInt(deptFilter)))) match = false;
            
            if (roleFilter === 'student' || roleFilter === 'all') {
                if (courseFilter !== 'all' && user.role === 'student' && user.courseId != courseFilter) match = false;
                if (semFilter !== 'all' && user.role === 'student' && user.semester != semFilter) match = false;
            }
            return match;
        });

        filteredUsers.forEach(user => {
            const depts = (user.deptIds || []).map(id => {
                const d = dataStore.departments.find(dept => dept.id == id);
                return d ? d.customId : '';
            }).filter(Boolean).join(', ') || '-';
            
            let courseStr = '-';
            if (user.role === 'student') {
                const c = dataStore.courses.find(course => course.id == user.courseId);
                courseStr = (c ? c.name : 'Course') + ` (Sem ${user.semester || '1'})`;
            }

            let roleBadge = `<span class="badge-role">${user.role}</span>`;
            if (user.isHOD) {
                roleBadge = `<span class="badge-role" style="background: rgba(245, 158, 11, 0.2); color: #b45309; font-weight: 600;">HOD</span>`;
            }

            const pwdDisplay = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="credential-chip" id="user-pwd-disp-${user.id}">••••••••</span>
                    <span class="material-symbols-outlined copy-btn" style="font-size: 16px;" onclick="toggleUserPasswordCell(${user.id}, '${user.password || 'password123'}')" title="Show/Hide Password" id="user-pwd-icon-${user.id}">visibility</span>
                </div>
            `;

            tbody.innerHTML += `<tr>
                <td><strong>${user.customId || 'N/A'}</strong></td>
                <td>${user.name}</td>
                <td>${roleBadge}</td>
                <td>${depts}</td>
                <td>${courseStr}</td>
                <td><span class="credential-chip">${user.email}</span></td>
                <td>${pwdDisplay}</td>
                <td>
                    <button class="action-btn" onclick="openEditModal('user', ${user.id})">Edit</button>
                    <button class="action-btn" style="background: rgba(220, 53, 69, 0.15); color: #dc3545;" onclick="removeUser(${user.id})">Remove</button>
                </td>
            </tr>`;
        });
    }

    function updateDropdowns() {
        const deptOptions = dataStore.departments.map(d => `<option value="${d.id}">${d.name} (${d.customId})</option>`).join('');
        const courseOptions = dataStore.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        // Populate standard forms
        const courseDeptSelect = document.getElementById('courseDeptSelect');
        if (courseDeptSelect) courseDeptSelect.innerHTML = '<option value="">-- Select Department --</option>' + deptOptions;
        
        const userDeptSelect = document.getElementById('userDeptSelect');
        if (userDeptSelect) userDeptSelect.innerHTML = deptOptions;
        
        // Populate HOD Quick Assignment Form
        const hodDeptSelect = document.getElementById('hodDeptSelect');
        if (hodDeptSelect) hodDeptSelect.innerHTML = '<option value="">-- Select Department --</option>' + deptOptions;

        // Populate HOD Credentials Form Department Select
        const hodCredDeptSelect = document.getElementById('hodCredDeptSelect');
        if (hodCredDeptSelect) {
            hodCredDeptSelect.innerHTML = '<option value="">-- Select Department to Configure --</option>' + 
                dataStore.departments.map(d => {
                    const hasHod = d.currentHodId ? ' (Has HOD)' : ' (Unassigned)';
                    return `<option value="${d.id}">${d.name} (${d.customId})${hasHod}</option>`;
                }).join('');
        }
        
        const facultyOptions = dataStore.users.filter(u => u.role === 'faculty').map(f => `<option value="${f.id}">${f.name} (${f.email})</option>`).join('');
        const hodFacultySelect = document.getElementById('hodFacultySelect');
        if (hodFacultySelect) hodFacultySelect.innerHTML = '<option value="">-- Select Faculty --</option>' + facultyOptions;

        // Populate Filter Bar
        const filterDept = document.getElementById('filterDept');
        if (filterDept) filterDept.innerHTML = '<option value="all">All Departments</option>' + deptOptions;
        
        const filterCourse = document.getElementById('filterCourse');
        if (filterCourse) filterCourse.innerHTML = '<option value="all">All Courses</option>' + courseOptions;
        
        // Generate semesters for filter
        const filterSem = document.getElementById('filterSem');
        if (filterSem) {
            let maxSem = 8;
            let semOptions = '<option value="all">All Sems</option>';
            for (let i = 1; i <= maxSem; i++) semOptions += `<option value="${i}">Sem ${i}</option>`;
            filterSem.innerHTML = semOptions;
        }

        filterUserCoursesByDept();
    }

    function filterUserCoursesByDept() {
        const userRoleEl = document.getElementById('userRole');
        const deptSelectEl = document.getElementById('userDeptSelect');
        const courseSelect = document.getElementById('userCourseSelect');
        if (!userRoleEl || !deptSelectEl || !courseSelect) return;

        const role = userRoleEl.value;
        const deptId = deptSelectEl.value;
        
        courseSelect.innerHTML = '<option value="">-- Select Course --</option>';
        if (role === 'student' && deptId) {
            const filteredCourses = dataStore.courses.filter(c => c.deptId == deptId);
            courseSelect.innerHTML += filteredCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }

    // Helper when department is selected in HOD Credentials form
    const hodCredDeptSelect = document.getElementById('hodCredDeptSelect');
    if (hodCredDeptSelect) {
        hodCredDeptSelect.addEventListener('change', (e) => {
            const deptId = parseInt(e.target.value);
            if (!deptId) return;
            const dept = dataStore.departments.find(d => d.id === deptId);
            if (!dept) return;

            if (dept.currentHodId) {
                const currentHod = dataStore.users.find(u => u.id === dept.currentHodId);
                if (currentHod) {
                    document.getElementById('hodCredCustomId').value = currentHod.customId || `HOD-${dept.customId.replace('DEP-', '')}`;
                    document.getElementById('hodCredName').value = currentHod.name;
                    document.getElementById('hodCredEmail').value = currentHod.email;
                    document.getElementById('hodCredPassword').value = currentHod.password || 'password123';
                    return;
                }
            }

            // Default suggestion for new HOD
            const deptCode = dept.customId.toLowerCase().replace('dep-', '').replace('-', '');
            document.getElementById('hodCredCustomId').value = `HOD-${dept.customId.replace('DEP-', '')}`;
            document.getElementById('hodCredName').value = '';
            document.getElementById('hodCredEmail').value = `hod.${deptCode}@uniflow.edu`;
            document.getElementById('hodCredPassword').value = 'password123';
        });
    }

    // --- Dynamic Form Listeners ---
    const userRoleSelect = document.getElementById('userRole');
    if (userRoleSelect) {
        userRoleSelect.addEventListener('change', (e) => {
            const studentFields = document.getElementById('studentFields');
            if (studentFields) {
                if (e.target.value === 'student') {
                    studentFields.style.display = 'grid';
                    filterUserCoursesByDept();
                } else {
                    studentFields.style.display = 'none';
                }
            }
        });
    }

    const userDeptSelect = document.getElementById('userDeptSelect');
    if (userDeptSelect) {
        userDeptSelect.addEventListener('change', () => {
            filterUserCoursesByDept();
        });
    }

    const filterUserIdInput = document.getElementById('filterUserId');
    if (filterUserIdInput) {
        filterUserIdInput.addEventListener('input', () => renderUsers());
    }

    // Filter Bar Listeners
    ['filterRole', 'filterDept', 'filterCourse', 'filterSem'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                if (id === 'filterRole') {
                    const role = e.target.value;
                    const courseGrp = document.getElementById('filterCourseGroup');
                    const semGrp = document.getElementById('filterSemGroup');
                    if (courseGrp) courseGrp.style.display = (role === 'student' || role === 'all') ? 'block' : 'none';
                    if (semGrp) semGrp.style.display = (role === 'student' || role === 'all') ? 'block' : 'none';
                }
                renderUsers();
            });
        }
    });

    // --- Form Submissions ---

    // 1. Add Department
    const addDeptForm = document.getElementById('addDepartmentForm');
    if (addDeptForm) {
        addDeptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const customId = document.getElementById('deptCustomId').value.trim();
            const name = document.getElementById('deptName').value.trim();
            const newId = dataStore.departments.length > 0 ? Math.max(...dataStore.departments.map(d => d.id)) + 1 : 1;
            
            dataStore.departments.push({ id: newId, customId, name, currentHodId: null });
            saveDataStore();
            e.target.reset();
            renderDepartments();
            renderHodCredentials();
            updateDashboardStats();
            alert(`Department "${name}" added successfully! You can now configure its HOD credentials.`);
        });
    }

    // 2. Quick Assign HOD
    const assignHodForm = document.getElementById('assignHodForm');
    if (assignHodForm) {
        assignHodForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const deptId = parseInt(document.getElementById('hodDeptSelect').value);
            const facultyId = parseInt(document.getElementById('hodFacultySelect').value);
            
            const dept = dataStore.departments.find(d => d.id === deptId);
            if (!dept) return;

            // If previous HOD exists, update flag if not HOD elsewhere
            if (dept.currentHodId && dept.currentHodId !== facultyId) {
                const oldHod = dataStore.users.find(u => u.id === dept.currentHodId);
                if (oldHod) {
                    const isHodElsewhere = dataStore.departments.some(d => d.id !== deptId && d.currentHodId === oldHod.id);
                    if (!isHodElsewhere) oldHod.isHOD = false;
                }
            }
            
            // Assign new HOD
            dept.currentHodId = facultyId;
            const newHod = dataStore.users.find(u => u.id === facultyId);
            if (newHod) {
                newHod.isHOD = true;
                if (!newHod.deptIds) newHod.deptIds = [];
                if (!newHod.deptIds.includes(deptId)) newHod.deptIds.push(deptId);
            }
            
            saveDataStore();
            e.target.reset();
            renderDepartments();
            renderHodCredentials();
            renderUsers();
            updateDashboardStats();
            alert(`HOD assigned successfully for ${dept.name}!`);
        });
    }

    // 3. Configure/Save HOD Credentials Form
    const hodCredForm = document.getElementById('hodCredentialsForm');
    if (hodCredForm) {
        hodCredForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const deptId = parseInt(document.getElementById('hodCredDeptSelect').value);
            const customId = document.getElementById('hodCredCustomId').value.trim();
            const name = document.getElementById('hodCredName').value.trim();
            const email = document.getElementById('hodCredEmail').value.trim().toLowerCase();
            const password = document.getElementById('hodCredPassword').value;

            if (!deptId) {
                alert('Please select a department.');
                return;
            }

            const dept = dataStore.departments.find(d => d.id === deptId);
            if (!dept) return;

            // Check if email already used by another user who is NOT this department's current HOD
            const existingUserWithEmail = dataStore.users.find(u => u.email.toLowerCase() === email && u.id !== dept.currentHodId);
            if (existingUserWithEmail) {
                alert(`The email "${email}" is already registered to user "${existingUserWithEmail.name}". Please use a unique email for this HOD.`);
                return;
            }

            if (dept.currentHodId) {
                // Update existing HOD user
                const hod = dataStore.users.find(u => u.id === dept.currentHodId);
                if (hod) {
                    hod.customId = customId;
                    hod.name = name;
                    hod.email = email;
                    hod.password = password;
                    hod.isHOD = true;
                    if (!hod.deptIds) hod.deptIds = [];
                    if (!hod.deptIds.includes(deptId)) hod.deptIds.push(deptId);
                }
            } else {
                // Create new HOD User record
                const newUserId = dataStore.users.length > 0 ? Math.max(...dataStore.users.map(u => u.id)) + 1 : 1;
                const newHodUser = {
                    id: newUserId,
                    customId: customId || `HOD-${dept.customId.replace('DEP-', '')}`,
                    name: name,
                    email: email,
                    password: password,
                    role: 'faculty',
                    deptIds: [deptId],
                    courseId: null,
                    semester: null,
                    isHOD: true
                };
                dataStore.users.push(newHodUser);
                dept.currentHodId = newUserId;
            }

            saveDataStore();
            e.target.reset();
            renderDepartments();
            renderHodCredentials();
            renderUsers();
            updateDashboardStats();
            alert(`HOD Credentials for "${dept.name}" saved successfully!\n\nLogin Email: ${email}\nPassword: ${password}`);
        });
    }

    // 4. Add Course
    const addCourseForm = document.getElementById('addCourseForm');
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const deptId = parseInt(document.getElementById('courseDeptSelect').value);
            const name = document.getElementById('courseName').value.trim();
            const semesters = parseInt(document.getElementById('courseSemesters').value);
            
            const newId = dataStore.courses.length > 0 ? Math.max(...dataStore.courses.map(c => c.id)) + 1 : 1;
            dataStore.courses.push({ id: newId, deptId, name, semesters });
            saveDataStore();
            e.target.reset(); 
            renderCourses();
            updateDashboardStats();
            alert(`Course "${name}" added successfully!`);
        });
    }

    // 5. Enroll User with Password (Faculty / Student)
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const customId = document.getElementById('userCustomId').value.trim();
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim().toLowerCase();
            const role = document.getElementById('userRole').value;
            const password = document.getElementById('userPassword').value;
            
            const deptSelect = document.getElementById('userDeptSelect');
            const deptIds = [parseInt(deptSelect.value)];
            
            // Validate unique email
            const existingEmail = dataStore.users.find(u => u.email.toLowerCase() === email);
            if (existingEmail) {
                alert(`A user with email "${email}" already exists. Please enter a unique email address.`);
                return;
            }

            let courseId = null, semester = null;
            if (role === 'student') {
                courseId = parseInt(document.getElementById('userCourseSelect').value) || null;
                semester = parseInt(document.getElementById('userSemester').value) || 1;
            }
            
            const newId = dataStore.users.length > 0 ? Math.max(...dataStore.users.map(u => u.id)) + 1 : 1;
            dataStore.users.push({ 
                id: newId, 
                customId, 
                name, 
                email, 
                password: password || 'password123', 
                role, 
                deptIds, 
                courseId, 
                semester, 
                isHOD: false 
            });
            
            saveDataStore();
            e.target.reset();
            renderUsers();
            renderHodCredentials();
            updateDashboardStats();
            alert(`User "${name}" enrolled successfully as ${role.toUpperCase()}!\n\nLogin Email: ${email}\nPassword: ${password}`);
        });
    }

    // --- Global Window Helpers for Actions ---
    window.togglePasswordVisibility = function(inputId, buttonEl) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = buttonEl.querySelector('.material-symbols-outlined') || buttonEl;
        if (icon) icon.textContent = isPassword ? 'visibility_off' : 'visibility';
    };

    window.togglePasswordCell = function(hodId, actualPassword) {
        const span = document.getElementById(`pwd-display-${hodId}`);
        const icon = document.getElementById(`pwd-icon-${hodId}`);
        if (!span) return;
        if (span.textContent === '••••••••') {
            span.textContent = actualPassword;
            if (icon) icon.textContent = 'visibility_off';
        } else {
            span.textContent = '••••••••';
            if (icon) icon.textContent = 'visibility';
        }
    };

    window.toggleUserPasswordCell = function(userId, actualPassword) {
        const span = document.getElementById(`user-pwd-disp-${userId}`);
        const icon = document.getElementById(`user-pwd-icon-${userId}`);
        if (!span) return;
        if (span.textContent === '••••••••') {
            span.textContent = actualPassword;
            if (icon) icon.textContent = 'visibility_off';
        } else {
            span.textContent = '••••••••';
            if (icon) icon.textContent = 'visibility';
        }
    };

    window.copyCredential = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert(`Copied to clipboard: "${text}"`);
        }).catch(() => {
            prompt('Copy credential:', text);
        });
    };

    window.goToHodCredentials = function(deptId) {
        const hodNav = document.querySelector('.nav-item[data-target="hods"]');
        if (hodNav) hodNav.click();
        window.setupHodForDept(deptId);
    };

    window.setupHodForDept = function(deptId) {
        const deptSelect = document.getElementById('hodCredDeptSelect');
        if (deptSelect) {
            deptSelect.value = deptId;
            deptSelect.dispatchEvent(new Event('change'));
            deptSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    window.resetHodPassword = function(deptId) {
        const dept = dataStore.departments.find(d => d.id === deptId);
        if (!dept || !dept.currentHodId) return;
        const hod = dataStore.users.find(u => u.id === dept.currentHodId);
        if (!hod) return;

        const newPassword = prompt(`Enter new password for ${hod.name} (${dept.name} HOD):`, 'hod12345');
        if (newPassword && newPassword.trim() !== '') {
            hod.password = newPassword.trim();
            saveDataStore();
            renderHodCredentials();
            renderUsers();
            alert(`Password updated for ${hod.name}!\nNew Password: ${hod.password}`);
        }
    };

    window.unassignHod = function(deptId) {
        const dept = dataStore.departments.find(d => d.id === deptId);
        if (!dept || !dept.currentHodId) return;
        const hod = dataStore.users.find(u => u.id === dept.currentHodId);
        
        if (confirm(`Are you sure you want to unassign ${hod ? hod.name : 'this HOD'} from ${dept.name}?`)) {
            if (hod) {
                const isHodElsewhere = dataStore.departments.some(d => d.id !== deptId && d.currentHodId === hod.id);
                if (!isHodElsewhere) hod.isHOD = false;
            }
            dept.currentHodId = null;
            saveDataStore();
            renderDepartments();
            renderHodCredentials();
            renderUsers();
            updateDashboardStats();
        }
    };

    window.removeUser = function(id) {
        const user = dataStore.users.find(u => u.id === id);
        if (!user) return;

        if (confirm(`Are you sure you want to remove user "${user.name}"?`)) {
            const index = dataStore.users.findIndex(u => u.id === id);
            if (index !== -1) {
                if (user.isHOD) {
                    dataStore.departments.forEach(d => {
                        if (d.currentHodId === id) d.currentHodId = null;
                    });
                }
                dataStore.users.splice(index, 1);
                saveDataStore();
                renderUsers();
                renderHodCredentials();
                renderDepartments();
                updateDashboardStats();
            }
        }
    };

    // --- Edit Modal Logic ---
    window.openEditModal = function(type, id) {
        const modal = document.getElementById('editModal');
        const fieldsContainer = document.getElementById('modalDynamicFields');
        document.getElementById('editItemType').value = type;
        document.getElementById('editItemId').value = id;
        
        fieldsContainer.innerHTML = '';

        if (type === 'department') {
            document.getElementById('modalTitle').textContent = 'Edit Department';
            const dept = dataStore.departments.find(d => d.id === id);
            fieldsContainer.innerHTML = `
                <div class="form-group">
                    <label>Department ID</label>
                    <input type="text" id="editDeptId" value="${dept.customId}" required>
                </div>
                <div class="form-group">
                    <label>Department Name</label>
                    <input type="text" id="editDeptName" value="${dept.name}" required>
                </div>
            `;
        } else if (type === 'course') {
            document.getElementById('modalTitle').textContent = 'Edit Course';
            const course = dataStore.courses.find(c => c.id === id);
            fieldsContainer.innerHTML = `
                <div class="form-group">
                    <label>Course Name</label>
                    <input type="text" id="editCourseName" value="${course.name}" required>
                </div>
                <div class="form-group">
                    <label>Semesters</label>
                    <input type="number" id="editCourseSems" value="${course.semesters}" required min="1" max="10">
                </div>
            `;
        } else if (type === 'user' || type === 'hod') {
            const user = dataStore.users.find(u => u.id === id);
            document.getElementById('modalTitle').textContent = type === 'hod' ? 'Edit HOD Credentials' : 'Edit User & Credentials';
            fieldsContainer.innerHTML = `
                <div class="form-group">
                    <label>User / Employee ID</label>
                    <input type="text" id="editUserCustomId" value="${user.customId || ''}" required>
                </div>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="editUserName" value="${user.name}" required>
                </div>
                <div class="form-group">
                    <label>Login Email Address</label>
                    <input type="email" id="editUserEmail" value="${user.email}" required>
                </div>
                <div class="form-group">
                    <label>Login Password</label>
                    <input type="text" id="editUserPassword" value="${user.password || 'password123'}" required>
                    <span class="field-hint">User's password for logging into UniFlow.</span>
                </div>
            `;
        }
        
        modal.classList.add('active');
    };

    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('editModal').classList.remove('active');
        });
    }

    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('editItemType').value;
            const id = parseInt(document.getElementById('editItemId').value);

            if (type === 'department') {
                const dept = dataStore.departments.find(d => d.id === id);
                dept.customId = document.getElementById('editDeptId').value.trim();
                dept.name = document.getElementById('editDeptName').value.trim();
                renderDepartments();
                renderHodCredentials();
            } else if (type === 'course') {
                const course = dataStore.courses.find(c => c.id === id);
                course.name = document.getElementById('editCourseName').value.trim();
                course.semesters = parseInt(document.getElementById('editCourseSems').value);
                renderCourses();
            } else if (type === 'user' || type === 'hod') {
                const user = dataStore.users.find(u => u.id === id);
                user.customId = document.getElementById('editUserCustomId').value.trim();
                user.name = document.getElementById('editUserName').value.trim();
                user.email = document.getElementById('editUserEmail').value.trim().toLowerCase();
                user.password = document.getElementById('editUserPassword').value;
                renderUsers();
                renderHodCredentials();
                renderDepartments();
            }

            saveDataStore();
            document.getElementById('editModal').classList.remove('active');
        });
    }

    // --- Initial Render ---
    updateDashboardStats();
    renderDepartments();
    renderHodCredentials();
    renderCourses();
    renderUsers();
});
