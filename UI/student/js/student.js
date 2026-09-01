document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:5000';
    const authToken = localStorage.getItem('uniflow_token');

    // 1. Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');

            if (targetId === 'overview') fetchStudentDashboard();
            if (targetId === 'courses') fetchStudentCourses();
            if (targetId === 'workload') fetchStudentAssignments();
        });
    });

    // Helper: parse dates
    function parseDate(dateStr) {
        if (!dateStr) return null;
        const cleaned = dateStr.split('T')[0];
        const [y, m, d] = cleaned.split('-').map(Number);
        if (!y || !m || !d) return new Date(dateStr);
        return new Date(y, m - 1, d);
    }

    // 2. Fetch Student Dashboard Overview
    async function fetchStudentDashboard() {
        if (!authToken) return;

        try {
            const res = await fetch(`${API_URL}/api/student/dashboard`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();

            if (data.success) {
                const p = data.profile;
                const s = data.stats;

                // Update Header
                const headerName = document.getElementById('headerStudentName');
                const headerInitials = document.getElementById('headerStudentInitials');
                if (headerName) headerName.textContent = p.name;
                if (headerInitials) headerInitials.textContent = p.name.charAt(0).toUpperCase();

                // Update Overview Metrics
                if (document.getElementById('stat-semester')) document.getElementById('stat-semester').textContent = p.semester;
                if (document.getElementById('stat-courses')) document.getElementById('stat-courses').textContent = s.activeCourses;
                if (document.getElementById('stat-cgpa')) document.getElementById('stat-cgpa').textContent = p.cgpa;

                // Update Profile Tab
                if (document.getElementById('profile-id')) document.getElementById('profile-id').textContent = p.customId || `STU00${p.id}`;
                if (document.getElementById('profile-name')) document.getElementById('profile-name').textContent = p.name;
                if (document.getElementById('profile-email')) document.getElementById('profile-email').textContent = p.email;
                if (document.getElementById('profile-dept')) document.getElementById('profile-dept').textContent = p.department;
                if (document.getElementById('profile-course')) document.getElementById('profile-course').textContent = p.courseName;
                if (document.getElementById('profile-year')) document.getElementById('profile-year').textContent = p.admissionYear;

                // Update Workload Metrics Tab
                if (document.getElementById('stat-pending-assignments')) document.getElementById('stat-pending-assignments').textContent = s.pendingAssignments;
                if (document.getElementById('stat-workload-points')) document.getElementById('stat-workload-points').textContent = `${s.workloadPoints} pts`;
                if (document.getElementById('stat-completed-assignments')) document.getElementById('stat-completed-assignments').textContent = s.completedAssignments;

                // Update Weekly Workload Bar
                const pct = s.workloadPercentage;
                const bar = document.getElementById('weeklyWorkloadBar');
                const statusText = document.getElementById('weeklyWorkloadStatus');
                const pointsText = document.getElementById('weeklyWorkloadPoints');
                const adviceText = document.getElementById('weeklyWorkloadAdvice');

                if (bar) bar.style.width = `${pct}%`;
                if (pointsText) pointsText.textContent = `${s.workloadPoints} pts / 20 pts`;

                if (statusText) {
                    if (pct > 75) {
                        statusText.textContent = `${pct}% Overload Alert`;
                        statusText.style.color = '#e53e3e';
                        if (bar) bar.style.background = 'linear-gradient(90deg, #ed8936, #e53e3e)';
                        if (adviceText) adviceText.textContent = '⚠️ High assignment workload this week. Prioritize deadlines approaching earliest.';
                    } else if (pct > 40) {
                        statusText.textContent = `${pct}% Moderate Workload`;
                        statusText.style.color = '#dd6b20';
                        if (bar) bar.style.background = 'linear-gradient(90deg, #ecc94b, #dd6b20)';
                        if (adviceText) adviceText.textContent = 'You have a steady schedule of assignments ahead. Manage your time effectively.';
                    } else {
                        statusText.textContent = `${pct}% Light Workload`;
                        statusText.style.color = '#38a169';
                        if (bar) bar.style.background = 'linear-gradient(90deg, #48bb78, #38a169)';
                        if (adviceText) adviceText.textContent = '✓ Workload is currently light and well balanced. Great job!';
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load student dashboard:', err);
        }
    }

    // 3. Fetch Enrolled Courses
    async function fetchStudentCourses() {
        if (!authToken) return;

        try {
            const res = await fetch(`${API_URL}/api/student/courses`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();

            const tbody = document.getElementById('studentCourseList');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (data.success && Array.isArray(data.courses)) {
                data.courses.forEach(c => {
                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${c.code}</strong></td>
                            <td>${c.name}</td>
                            <td>${c.credits || 3}</td>
                            <td>${c.faculty_names || 'Department Faculty'}</td>
                            <td><span class="status-badge status-active">Enrolled</span></td>
                        </tr>
                    `;
                });
            }
        } catch (err) {
            console.error('Failed to load student courses:', err);
        }
    }

    // 4. Fetch Student Assignments & Render
    async function fetchStudentAssignments() {
        if (!authToken) return;

        try {
            const res = await fetch(`${API_URL}/api/student/assignments`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();

            const listContainer = document.getElementById('studentUpcomingWorksList');
            if (!listContainer) return;
            listContainer.innerHTML = '';

            if (!data.success || !data.assignments || data.assignments.length === 0) {
                listContainer.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: var(--text-light);">
                        🎉 No active assignments due. You are all caught up!
                    </div>
                `;
                return;
            }

            data.assignments.forEach(a => {
                const diff = parseInt(a.difficulty) || 1;
                let diffColor = '#48bb78';
                if (diff > 4) diffColor = '#ecc94b';
                if (diff > 7) diffColor = '#f56565';

                const dDate = a.due_date ? parseDate(a.due_date) : null;
                const dFormatted = dDate ? dDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No Due Date';

                const isSubmitted = a.submission_status === 'submitted' || a.submission_status === 'graded';
                
                let badge = `<span class="status-badge status-pending">Pending</span>`;
                let actionBtn = `
                    <button class="btn-primary" style="padding: 6px 14px; font-size: 0.85rem;" onclick="window.submitStudentWork(${a.id})">
                        📤 Turn In
                    </button>
                `;

                if (isSubmitted) {
                    badge = `<span class="status-badge status-active">✓ Submitted</span>`;
                    actionBtn = `
                        <span style="font-size: 0.85rem; color: #48bb78; font-weight: 500;">
                            ${a.marks_obtained ? `Marks: ${a.marks_obtained}/${a.max_marks}` : 'Awaiting Grading'}
                        </span>
                    `;
                }

                listContainer.innerHTML += `
                    <div class="announcement-item" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 8px;">
                        <div style="flex: 1; margin-right: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <strong style="font-size: 1.05rem;">${a.title}</strong>
                                <span style="background: ${diffColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;">Level ${diff}</span>
                            </div>
                            <p style="font-size: 0.9rem; color: var(--text-light); margin: 4px 0 6px 0;">${a.description}</p>
                            <div style="font-size: 0.8rem; color: var(--text-light);">
                                <span>Subject: <strong>${a.subject_name} (${a.subject_code})</strong></span> &bull; 
                                <span>Faculty: <strong>${a.faculty_name}</strong></span> &bull; 
                                <span>Max Marks: <strong>${a.max_marks}</strong></span>
                            </div>
                        </div>
                        <div style="text-align: right; min-width: 150px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <div style="font-weight: 600; color: var(--primary-color); font-size: 0.9rem;">Due: ${dFormatted}</div>
                            <div>${badge}</div>
                            <div>${actionBtn}</div>
                        </div>
                    </div>
                `;
            });

            // Update mini calendar
            renderStudentCalendar(data.assignments);

        } catch (err) {
            console.error('Failed to fetch student assignments:', err);
        }
    }

    // Mini Calendar Renderer
    function renderStudentCalendar(assignments) {
        const grid = document.getElementById('studentCalendarGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        days.forEach(d => {
            grid.innerHTML += `<div style="font-weight: 600; font-size: 0.8rem; color: var(--text-light); padding: 4px;">${d}</div>`;
        });

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const hasAssignment = assignments.some(a => {
                if (!a.due_date) return false;
                const d = parseDate(a.due_date);
                return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
            });

            const isToday = day === today.getDate();

            let style = 'padding: 8px; font-size: 0.85rem; border-radius: 50%;';
            if (hasAssignment) {
                style += ' background: var(--primary-color); color: white; font-weight: bold; cursor: pointer;';
            } else if (isToday) {
                style += ' border: 1px solid var(--primary-color); font-weight: bold;';
            }

            grid.innerHTML += `<div style="${style}">${day}</div>`;
        }
    }

    // 5. Submit Work Action
    window.submitStudentWork = async function(assignmentId) {
        const text = prompt('Enter your assignment submission notes or repository/drive link:');
        if (text === null) return; // user cancelled

        try {
            const res = await fetch(`${API_URL}/api/student/assignments/${assignmentId}/submit`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ submission_text: text || 'Submitted online.' })
            });

            const data = await res.json();
            if (data.success) {
                alert('✅ Assignment turned in successfully!');
                await fetchStudentDashboard();
                await fetchStudentAssignments();
            } else {
                alert(`❌ ${data.message || 'Failed to submit.'}`);
            }
        } catch (err) {
            console.error('Submit assignment error:', err);
            alert('Server error while submitting assignment.');
        }
    };

    // Initial load
    fetchStudentDashboard();
    fetchStudentCourses();
    fetchStudentAssignments();
});
