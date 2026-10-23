// ======================================================================
// Comprehensive Workload Master Catalogs (TKM College of Engineering Schema)
// Covers: Department, Institutional, Extra Proactive, FDP/Workshops, Research, Consultancy
// ======================================================================

const WORKLOAD_CATALOGS = {
    Department: {
        name: 'Department Workload',
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

module.exports = WORKLOAD_CATALOGS;
