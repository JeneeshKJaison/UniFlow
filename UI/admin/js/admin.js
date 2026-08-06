document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mock Data Store ---
    const dataStore = {
        departments: [
            { id: 1, customId: 'DEP-CS01', name: 'Computer Science', currentHodId: 1 },
            { id: 2, customId: 'DEP-ME02', name: 'Mechanical Engineering', currentHodId: null }
        ],
        courses: [
            { id: 1, deptId: 1, name: 'B.Tech Computer Science', semesters: 8 },
            { id: 2, deptId: 2, name: 'B.Tech Mechanical', semesters: 8 }
        ],
        users: [
            { id: 1, customId: 'FAC001', name: 'Dr. Alan Turing', email: 'alan@uniflow.edu', role: 'faculty', deptIds: [1, 2], courseId: null, semester: null, isHOD: true },
            { id: 2, customId: 'STU001', name: 'Ada Lovelace', email: 'ada@uniflow.edu', role: 'student', deptIds: [1], courseId: 1, semester: 3, isHOD: false }
        ]
    };

    // --- Tab Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(sec => sec.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(item.getAttribute('data-target')).classList.add('active');
        });
    });

    // --- Helper Functions ---
    function updateDashboardStats() {
        document.getElementById('stat-departments').textContent = dataStore.departments.length;
        document.getElementById('stat-courses').textContent = dataStore.courses.length;
        document.getElementById('stat-users').textContent = dataStore.users.length;
    }

    function renderDepartments() {
        const tbody = document.getElementById('departmentList');
        tbody.innerHTML = '';
        dataStore.departments.forEach(dept => {
            let hodName = 'None';
            if (dept.currentHodId) {
                const hod = dataStore.users.find(u => u.id == dept.currentHodId);
                if(hod) hodName = hod.name;
            }
            tbody.innerHTML += `<tr>
                <td>${dept.customId}</td>
                <td>${dept.name}</td>
                <td>${hodName}</td>
                <td><button class="action-btn" onclick="openEditModal('department', ${dept.id})">Edit</button></td>
            </tr>`;
        });
        updateDropdowns();
    }

    function renderCourses() {
        const tbody = document.getElementById('courseList');
        tbody.innerHTML = '';
        dataStore.courses.forEach(course => {
            const dept = dataStore.departments.find(d => d.id == course.deptId);
            tbody.innerHTML += `<tr>
                <td>${course.name}</td>
                <td>${dept ? dept.name : 'Unknown'}</td>
                <td>${course.semesters}</td>
                <td><button class="action-btn" onclick="openEditModal('course', ${course.id})">Edit</button></td>
            </tr>`;
        });
        updateDropdowns();
    }

    // Advanced Rendering for Users with Filters
    function renderUsers() {
        const userIdFilter = document.getElementById('filterUserId').value.toLowerCase();
        const roleFilter = document.getElementById('filterRole').value;
        const deptFilter = document.getElementById('filterDept').value;
        const courseFilter = document.getElementById('filterCourse').value;
        const semFilter = document.getElementById('filterSem').value;

        const tbody = document.getElementById('userList');
        tbody.innerHTML = '';

        const filteredUsers = dataStore.users.filter(user => {
            let match = true;
            if (userIdFilter && (!user.customId || !user.customId.toLowerCase().includes(userIdFilter))) match = false;
            if (roleFilter !== 'all' && user.role !== roleFilter) match = false;
            if (deptFilter !== 'all' && !user.deptIds.includes(parseInt(deptFilter))) match = false;
            
            if (roleFilter === 'student' || roleFilter === 'all') {
                if (courseFilter !== 'all' && user.role === 'student' && user.courseId != courseFilter) match = false;
                if (semFilter !== 'all' && user.role === 'student' && user.semester != semFilter) match = false;
            }
            return match;
        });

        filteredUsers.forEach(user => {
            const depts = user.deptIds.map(id => {
                const d = dataStore.departments.find(dept => dept.id == id);
                return d ? d.customId : '';
            }).join(', ');
            
            let courseStr = '-';
            if (user.role === 'student') {
                const c = dataStore.courses.find(course => course.id == user.courseId);
                courseStr = (c ? c.name : '') + ` (Sem ${user.semester})`;
            }

            tbody.innerHTML += `<tr>
                <td>${user.customId || 'N/A'}</td>
                <td>${user.name}</td>
                <td style="text-transform: capitalize;">${user.role}${user.isHOD ? ' (HOD)' : ''}</td>
                <td>${depts}</td>
                <td>${courseStr}</td>
                <td>
                    <button class="action-btn" onclick="openEditModal('user', ${user.id})">Edit</button>
                    <button class="action-btn" style="background: #dc3545;" onclick="removeUser(${user.id})">Remove</button>
                </td>
            </tr>`;
        });
    }

    function updateDropdowns() {
        const deptOptions = dataStore.departments.map(d => `<option value="${d.id}">${d.name} (${d.customId})</option>`).join('');
        const courseOptions = dataStore.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        // Populate standard forms
        document.getElementById('courseDeptSelect').innerHTML = '<option value="">-- Select Department --</option>' + deptOptions;
        document.getElementById('userDeptSelect').innerHTML = deptOptions; // Multi-select has no placeholder
        
        // Populate HOD Assignment Form
        document.getElementById('hodDeptSelect').innerHTML = '<option value="">-- Select Department --</option>' + deptOptions;
        const facultyOptions = dataStore.users.filter(u => u.role === 'faculty').map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        document.getElementById('hodFacultySelect').innerHTML = '<option value="">-- Select Faculty --</option>' + facultyOptions;

        // Populate Filter Bar
        document.getElementById('filterDept').innerHTML = '<option value="all">All Departments</option>' + deptOptions;
        document.getElementById('filterCourse').innerHTML = '<option value="all">All Courses</option>' + courseOptions;
        
        // Generate max semesters for filter
        let maxSem = 10;
        let semOptions = '<option value="all">All Sems</option>';
        for(let i=1; i<=maxSem; i++) semOptions += `<option value="${i}">Sem ${i}</option>`;
        document.getElementById('filterSem').innerHTML = semOptions;

        filterUserCoursesByDept();
    }

    function filterUserCoursesByDept() {
        const role = document.getElementById('userRole').value;
        const deptId = document.getElementById('userDeptSelect').value;
        const courseSelect = document.getElementById('userCourseSelect');
        
        courseSelect.innerHTML = '<option value="">-- Select Course --</option>';
        if (role === 'student' && deptId) {
            const filteredCourses = dataStore.courses.filter(c => c.deptId == deptId);
            courseSelect.innerHTML += filteredCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }

    // --- Dynamic Form Listeners ---
    document.getElementById('userRole').addEventListener('change', (e) => {
        const studentFields = document.getElementById('studentFields');
        if (e.target.value === 'student') {
            studentFields.style.display = 'grid';
            filterUserCoursesByDept();
        } else {
            studentFields.style.display = 'none';
        }
    });

    document.getElementById('userDeptSelect').addEventListener('change', () => {
        filterUserCoursesByDept();
    });

    document.getElementById('filterUserId').addEventListener('input', () => renderUsers());

    // Filter Bar Listeners
    ['filterRole', 'filterDept', 'filterCourse', 'filterSem'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            if (id === 'filterRole') {
                const role = e.target.value;
                document.getElementById('filterCourseGroup').style.display = (role === 'student') ? 'block' : 'none';
                document.getElementById('filterSemGroup').style.display = (role === 'student') ? 'block' : 'none';
            }
            renderUsers();
        });
    });

    // --- Submit Forms ---
    document.getElementById('addDepartmentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const customId = document.getElementById('deptCustomId').value;
        const name = document.getElementById('deptName').value;
        const newId = dataStore.departments.length + 1;
        dataStore.departments.push({ id: newId, customId, name, currentHodId: null });
        e.target.reset();
        renderDepartments();
        updateDashboardStats();
        alert('Department added successfully!');
    });

    document.getElementById('assignHodForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const deptId = parseInt(document.getElementById('hodDeptSelect').value);
        const facultyId = parseInt(document.getElementById('hodFacultySelect').value);
        
        // Remove HOD from old faculty of this dept
        const dept = dataStore.departments.find(d => d.id === deptId);
        if (dept.currentHodId) {
            const oldHod = dataStore.users.find(u => u.id === dept.currentHodId);
            if (oldHod) {
                // If they are not HOD of any other dept, remove isHOD flag
                const isHodElsewhere = dataStore.departments.some(d => d.id !== deptId && d.currentHodId === oldHod.id);
                if(!isHodElsewhere) oldHod.isHOD = false;
            }
        }
        
        // Assign new HOD
        dept.currentHodId = facultyId;
        const newHod = dataStore.users.find(u => u.id === facultyId);
        if (newHod) {
            newHod.isHOD = true;
            // Ensure they are mapped to this department in their deptIds
            if(!newHod.deptIds.includes(deptId)) newHod.deptIds.push(deptId);
        }
        
        e.target.reset();
        renderDepartments();
        renderUsers();
        alert('HOD Assigned Successfully!');
    });

    document.getElementById('addCourseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const deptId = parseInt(document.getElementById('courseDeptSelect').value);
        const name = document.getElementById('courseName').value;
        const semesters = parseInt(document.getElementById('courseSemesters').value);
        
        const newId = dataStore.courses.length + 1;
        dataStore.courses.push({ id: newId, deptId, name, semesters });
        e.target.reset(); 
        renderCourses();
        updateDashboardStats();
    });

    document.getElementById('addUserForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const customId = document.getElementById('userCustomId').value;
        const name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        const role = document.getElementById('userRole').value;
        
        const deptSelect = document.getElementById('userDeptSelect');
        const deptIds = [parseInt(deptSelect.value)];
        
        let courseId = null, semester = null;
        if(role === 'student') {
            courseId = parseInt(document.getElementById('userCourseSelect').value) || null;
            semester = parseInt(document.getElementById('userSemester').value) || null;
        }
        
        const newId = dataStore.users.length > 0 ? Math.max(...dataStore.users.map(u => u.id)) + 1 : 1;
        dataStore.users.push({ id: newId, customId, name, email, role, deptIds, courseId, semester, isHOD: false });
        
        e.target.reset();
        renderUsers();
        updateDashboardStats();
    });

    // --- Edit and Remove Modal Logic ---
    window.removeUser = function(id) {
        if (confirm('Are you sure you want to remove this user?')) {
            const index = dataStore.users.findIndex(u => u.id === id);
            if (index !== -1) {
                const user = dataStore.users[index];
                if (user.isHOD) {
                    const dept = dataStore.departments.find(d => d.currentHodId === id);
                    if (dept) dept.currentHodId = null;
                }
                dataStore.users.splice(index, 1);
                renderUsers();
                renderDepartments();
                updateDashboardStats();
            }
        }
    };

    window.openEditModal = function(type, id) {
        const modal = document.getElementById('editModal');
        const fieldsContainer = document.getElementById('modalDynamicFields');
        document.getElementById('editItemType').value = type;
        document.getElementById('editItemId').value = id;
        
        fieldsContainer.innerHTML = ''; // clear

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
                    <input type="number" id="editCourseSems" value="${course.semesters}" required>
                </div>
            `;
        } else if (type === 'user') {
            document.getElementById('modalTitle').textContent = 'Edit User';
            const user = dataStore.users.find(u => u.id === id);
            fieldsContainer.innerHTML = `
                <div class="form-group">
                    <label>User ID</label>
                    <input type="text" id="editUserCustomId" value="${user.customId || ''}" required>
                </div>
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="editUserName" value="${user.name}" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="editUserEmail" value="${user.email}" required>
                </div>
            `;
        }
        
        modal.classList.add('active');
    };

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('editModal').classList.remove('active');
    });

    document.getElementById('editForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('editItemType').value;
        const id = parseInt(document.getElementById('editItemId').value);

        if (type === 'department') {
            const dept = dataStore.departments.find(d => d.id === id);
            dept.customId = document.getElementById('editDeptId').value;
            dept.name = document.getElementById('editDeptName').value;
            renderDepartments();
        } else if (type === 'course') {
            const course = dataStore.courses.find(c => c.id === id);
            course.name = document.getElementById('editCourseName').value;
            course.semesters = parseInt(document.getElementById('editCourseSems').value);
            renderCourses();
        } else if (type === 'user') {
            const user = dataStore.users.find(u => u.id === id);
            user.customId = document.getElementById('editUserCustomId').value;
            user.name = document.getElementById('editUserName').value;
            user.email = document.getElementById('editUserEmail').value;
            renderUsers();
        }

        document.getElementById('editModal').classList.remove('active');
    });

    // --- Initial Render ---
    updateDashboardStats();
    renderDepartments();
    renderCourses();
    renderUsers();
});
