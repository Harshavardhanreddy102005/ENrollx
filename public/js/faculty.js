// ========================================
// EnrollX – Faculty Module
// ========================================

let currentFaculty = null;

// ---------- Initialize Faculty Dashboard ----------
async function initFacultyDashboard() {
  try {
    const { user, data } = await requireAuth('faculty', 'faculty-login.html');
    currentFaculty = { uid: user.uid, ...data };
    updateFacultyUI(currentFaculty);
    EnrollX.initSidebar();

    await loadFacultyStats();
    await loadFacultyRecentActivity();

  } catch (error) {
    console.error('Faculty dashboard error:', error);
  }
}

function updateFacultyUI(faculty) {
  document.querySelectorAll('.faculty-name').forEach(el => el.textContent = faculty.name || 'Faculty');
  document.querySelectorAll('.faculty-dept').forEach(el => el.textContent = faculty.department || '');
  document.querySelectorAll('.faculty-designation').forEach(el => el.textContent = faculty.designation || '');
  document.querySelectorAll('.faculty-avatar-text').forEach(el => {
    const names = (faculty.name || 'F').split(' ');
    el.textContent = names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });
}

async function loadFacultyStats() {
  try {
    // Assigned courses
    const courses = await db.collection('courses')
      .where('facultyId', '==', currentFaculty.uid)
      .get();

    const coursesEl = document.getElementById('facultyCoursesCount');
    if (coursesEl) EnrollX.animateCounter(coursesEl, courses.size);

    // Total enrolled students across all assigned courses
    let totalStudents = 0;
    for (const courseDoc of courses.docs) {
      const enrollments = await db.collection('enrollments')
        .where('courseId', '==', courseDoc.id)
        .where('status', '==', 'enrolled')
        .get();
      totalStudents += enrollments.size;
    }

    const studentsEl = document.getElementById('facultyStudentsCount');
    if (studentsEl) EnrollX.animateCounter(studentsEl, totalStudents);

    // Results uploaded
    const results = await db.collection('results')
      .where('facultyId', '==', currentFaculty.uid)
      .get();

    const resultsEl = document.getElementById('facultyResultsCount');
    if (resultsEl) EnrollX.animateCounter(resultsEl, results.size);

    // Render assigned courses list
    renderAssignedCourses(courses.docs);

  } catch (error) {
    console.error('Faculty stats error:', error);
  }
}

function renderAssignedCourses(courseDocs) {
  const container = document.getElementById('assignedCoursesList');
  if (!container) return;

  if (courseDocs.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="bi bi-journal-x"></i><h5>No Courses Assigned</h5></div>';
    return;
  }

  let html = '';
  courseDocs.forEach((doc, index) => {
    const course = doc.data();
    const color = EnrollX.getCardColor(index);
    html += `
      <div class="col-md-6 col-lg-4">
        <div class="course-card">
          <div class="course-header ${color}">
            <h5>${EnrollX.escapeHtml(course.courseName)}</h5>
            <span class="course-code">${EnrollX.escapeHtml(course.courseCode)}</span>
          </div>
          <div class="course-body">
            <div class="course-meta">
              <span><i class="bi bi-building"></i> ${EnrollX.escapeHtml(course.department)}</span>
              <span><i class="bi bi-star-fill"></i> ${course.credits} Credits</span>
              <span><i class="bi bi-people-fill"></i> ${course.availableSeats}/${course.totalSeats} seats</span>
            </div>
            <div class="course-footer mt-2">
              <a href="faculty-students.html?courseId=${doc.id}" class="btn btn-sm btn-primary-gradient btn-enrollx">
                <i class="bi bi-people me-1"></i>View Students
              </a>
              <a href="faculty-results.html?courseId=${doc.id}" class="btn btn-sm btn-purple-gradient btn-enrollx">
                <i class="bi bi-clipboard-data me-1"></i>Manage Results
              </a>
            </div>
          </div>
        </div>
      </div>`;
  });
  container.innerHTML = html;
}

async function loadFacultyRecentActivity() {
  const container = document.getElementById('facultyActivity');
  if (!container) return;

  try {
    const results = await db.collection('results')
      .where('facultyId', '==', currentFaculty.uid)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (results.empty) {
      container.innerHTML = '<div class="text-center text-muted p-3">No recent activity</div>';
      return;
    }

    let html = '';
    results.docs.forEach(doc => {
      const data = doc.data();
      html += `
        <div class="activity-item">
          <div class="activity-icon purple"><i class="bi bi-clipboard-check"></i></div>
          <div class="activity-text">
            <p>Uploaded marks for <strong>${EnrollX.escapeHtml(data.courseName || '')}</strong></p>
            <small>${EnrollX.timeAgo(data.createdAt)}</small>
          </div>
        </div>`;
    });
    container.innerHTML = html;
  } catch (error) {
    console.error('Faculty activity error:', error);
  }
}

// ---------- Faculty Students Page ----------
async function initFacultyStudents() {
  try {
    const { user, data } = await requireAuth('faculty', 'faculty-login.html');
    currentFaculty = { uid: user.uid, ...data };
    updateFacultyUI(currentFaculty);
    EnrollX.initSidebar();

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');

    if (courseId) {
      await loadCourseStudents(courseId);
    } else {
      await loadAllFacultyStudents();
    }
  } catch (error) {
    console.error('Faculty students error:', error);
  }
}

async function loadCourseStudents(courseId) {
  const container = document.getElementById('studentsTableBody');
  if (!container) return;

  try {
    const courseDoc = await db.collection('courses').doc(courseId).get();
    const courseName = courseDoc.exists ? courseDoc.data().courseName : 'Unknown Course';

    const headerEl = document.getElementById('courseNameHeader');
    if (headerEl) headerEl.textContent = courseName;

    const enrollments = await db.collection('enrollments')
      .where('courseId', '==', courseId)
      .where('status', '==', 'enrolled')
      .get();

    if (enrollments.empty) {
      container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No students enrolled</td></tr>';
      return;
    }

    let html = '';
    for (const [index, enrollDoc] of enrollments.docs.entries()) {
      const enrollment = enrollDoc.data();
      const studentDoc = await db.collection('students').doc(enrollment.studentId).get();
      const student = studentDoc.exists ? studentDoc.data() : {};

      html += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${EnrollX.escapeHtml(student.name || enrollment.studentName || 'N/A')}</strong></td>
          <td>${EnrollX.escapeHtml(student.studentId || 'N/A')}</td>
          <td>${EnrollX.escapeHtml(student.department || 'N/A')}</td>
          <td>Semester ${student.semester || 'N/A'}</td>
          <td><span class="badge-enrollx badge-green">Enrolled</span></td>
        </tr>`;
    }
    container.innerHTML = html;

    const countEl = document.getElementById('studentCount');
    if (countEl) countEl.textContent = enrollments.size;

  } catch (error) {
    console.error('Load students error:', error);
  }
}

async function loadAllFacultyStudents() {
  const container = document.getElementById('studentsTableBody');
  if (!container) return;

  try {
    const courses = await db.collection('courses')
      .where('facultyId', '==', currentFaculty.uid)
      .get();

    if (courses.empty) {
      container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No courses assigned. Contact admin to assign courses.</td></tr>';
      return;
    }

    // Load course selector
    const selector = document.getElementById('courseSelector');
    if (selector) {
      selector.innerHTML = '<option value="">Select Course</option>';
      courses.docs.forEach(doc => {
        const course = doc.data();
        selector.innerHTML += `<option value="${doc.id}">${course.courseName} (${course.courseCode})</option>`;
      });

      // Wire change event to reload students
      selector.onchange = async function() {
        if (this.value) {
          await loadCourseStudents(this.value);
          if (selector) selector.value = this.value;
        } else {
          container.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Select a course to view students</td></tr>';
        }
      };

      // Auto-select and load first course
      selector.value = courses.docs[0].id;
      await loadCourseStudents(courses.docs[0].id);
    }

  } catch (error) {
    console.error('Load all students error:', error);
  }
}

// ---------- Faculty Results Page ----------
async function initFacultyResults() {
  try {
    const { user, data } = await requireAuth('faculty', 'faculty-login.html');
    currentFaculty = { uid: user.uid, ...data };
    updateFacultyUI(currentFaculty);
    EnrollX.initSidebar();

    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');

    // Load courses for selector
    const courses = await db.collection('courses')
      .where('facultyId', '==', currentFaculty.uid)
      .get();

    const selector = document.getElementById('resultCourseSelector');
    if (selector) {
      selector.innerHTML = '<option value="">Select Course</option>';
      courses.docs.forEach(doc => {
        const course = doc.data();
        const selected = courseId === doc.id ? 'selected' : '';
        selector.innerHTML += `<option value="${doc.id}" ${selected}>${course.courseName} (${course.courseCode})</option>`;
      });
    }

    if (courseId) {
      await loadCourseForResults(courseId);
    } else if (!courses.empty) {
      // Auto-load first assigned course
      const firstCourseId = courses.docs[0].id;
      if (selector) selector.value = firstCourseId;
      await loadCourseForResults(firstCourseId);
    }
  } catch (error) {
    console.error('Faculty results error:', error);
  }
}

async function loadCourseForResults(courseId) {
  const container = document.getElementById('resultsTableBody');
  if (!container) return;

  try {
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return;
    const courseData = courseDoc.data();

    // Get enrolled students
    const enrollments = await db.collection('enrollments')
      .where('courseId', '==', courseId)
      .where('status', '==', 'enrolled')
      .get();

    if (enrollments.empty) {
      container.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No students enrolled</td></tr>';
      return;
    }

    // Check existing results
    const existingResults = await db.collection('results')
      .where('courseId', '==', courseId)
      .get();

    const resultsMap = {};
    existingResults.docs.forEach(doc => {
      const data = doc.data();
      resultsMap[data.studentId] = { id: doc.id, ...data };
    });

    let html = '';
    for (const [index, enrollDoc] of enrollments.docs.entries()) {
      const enrollment = enrollDoc.data();
      const studentDoc = await db.collection('students').doc(enrollment.studentId).get();
      const student = studentDoc.exists ? studentDoc.data() : {};
      const existing = resultsMap[enrollment.studentId];

      html += `
        <tr data-student-id="${enrollment.studentId}" data-course-id="${courseId}">
          <td>${index + 1}</td>
          <td><strong>${EnrollX.escapeHtml(student.name || 'N/A')}</strong></td>
          <td>${EnrollX.escapeHtml(student.studentId || 'N/A')}</td>
          <td><input type="number" class="form-control form-control-sm internal-marks" min="0" max="50" value="${existing ? existing.internalMarks : ''}" placeholder="0-50"></td>
          <td><input type="number" class="form-control form-control-sm external-marks" min="0" max="50" value="${existing ? existing.externalMarks : ''}" placeholder="0-50"></td>
          <td class="total-marks fw-bold">${existing ? existing.totalMarks : '-'}</td>
          <td class="grade-display">${existing ? `<span class="grade-badge ${EnrollX.getGradeBadgeClass(existing.grade)}">${existing.grade}</span>` : '-'}</td>
          <td>
            <button class="btn btn-sm btn-primary-gradient btn-enrollx" onclick="saveResult(this)">
              <i class="bi bi-check-lg"></i> Save
            </button>
          </td>
        </tr>`;
    }
    container.innerHTML = html;

    // Auto-calculate on input
    document.querySelectorAll('.internal-marks, .external-marks').forEach(input => {
      input.addEventListener('input', function() {
        const row = this.closest('tr');
        const internal = parseInt(row.querySelector('.internal-marks').value) || 0;
        const external = parseInt(row.querySelector('.external-marks').value) || 0;
        const total = internal + external;
        row.querySelector('.total-marks').textContent = total;
        const grade = EnrollX.getGrade(total);
        row.querySelector('.grade-display').innerHTML = `<span class="grade-badge ${EnrollX.getGradeBadgeClass(grade)}">${grade}</span>`;
      });
    });

  } catch (error) {
    console.error('Load results error:', error);
  }
}

async function saveResult(btn) {
  const row = btn.closest('tr');
  const studentId = row.dataset.studentId;
  const courseId = row.dataset.courseId;

  const internal = parseInt(row.querySelector('.internal-marks').value);
  const external = parseInt(row.querySelector('.external-marks').value);

  if (isNaN(internal) || isNaN(external)) {
    EnrollX.toast('Please enter both internal and external marks', 'warning');
    return;
  }

  if (internal < 0 || internal > 50 || external < 0 || external > 50) {
    EnrollX.toast('Marks must be between 0 and 50', 'warning');
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    const total = internal + external;
    const grade = EnrollX.getGrade(total);
    const gradePoint = EnrollX.getGradePoint(grade);

    // Get course info
    const courseDoc = await db.collection('courses').doc(courseId).get();
    const courseData = courseDoc.data();

    // Get student info
    const studentDoc = await db.collection('students').doc(studentId).get();
    const studentData = studentDoc.exists ? studentDoc.data() : {};

    // Check for existing result
    const existing = await db.collection('results')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get();

    const resultData = {
      studentId,
      studentName: studentData.name || '',
      courseId,
      courseName: courseData.courseName,
      courseCode: courseData.courseCode,
      credits: courseData.credits,
      semester: courseData.semester,
      department: courseData.department,
      internalMarks: internal,
      externalMarks: external,
      totalMarks: total,
      grade,
      gradePoint,
      facultyId: currentFaculty.uid,
      facultyName: currentFaculty.name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!existing.empty) {
      await db.collection('results').doc(existing.docs[0].id).update(resultData);
    } else {
      await db.collection('results').add(resultData);
    }

    EnrollX.toast(`Result saved for student successfully!`, 'success');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Save';

  } catch (error) {
    console.error('Save result error:', error);
    EnrollX.toast('Failed to save result', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Save';
  }
}

async function saveAllResults() {
  const rows = document.querySelectorAll('#resultsTableBody tr');
  let saved = 0;
  for (const row of rows) {
    const internal = row.querySelector('.internal-marks')?.value;
    const external = row.querySelector('.external-marks')?.value;
    if (internal && external) {
      const btn = row.querySelector('button');
      await saveResult(btn);
      saved++;
    }
  }
  if (saved > 0) {
    EnrollX.toast(`${saved} results saved successfully!`, 'success');
  }
}

// ---------- Faculty Profile ----------
async function initFacultyProfile() {
  try {
    const { user, data } = await requireAuth('faculty', 'faculty-login.html');
    currentFaculty = { uid: user.uid, ...data };
    updateFacultyUI(currentFaculty);
    EnrollX.initSidebar();

    const fields = ['name', 'email', 'department', 'designation', 'phone'];
    fields.forEach(field => {
      const el = document.getElementById(`faculty-profile-${field}`);
      if (el) el.textContent = currentFaculty[field] || 'N/A';
    });

    const joinedEl = document.getElementById('faculty-profile-joined');
    if (joinedEl) joinedEl.textContent = EnrollX.formatDate(currentFaculty.createdAt);

  } catch (error) {
    console.error('Faculty profile error:', error);
  }
}
