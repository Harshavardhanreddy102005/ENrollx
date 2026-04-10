// ========================================
// EnrollX – Admin Module
// ========================================

let currentAdmin = null;

// ---------- Role-Based Access Control (RBAC) ----------
function enforceAdminPermissions(admin) {
  const type = admin.adminType || 'super';
  
  // Hide Administrators link for non-super admins
  if (type !== 'super') {
    document.querySelectorAll('.sidebar-link[href="admin-admins.html"]').forEach(el => el.style.display = 'none');
    if (window.location.pathname.includes('admin-admins.html')) {
      window.location.href = 'admin-dashboard.html';
    }
  }

  // Placement Admin restrictions
  if (type === 'placement') {
    document.querySelectorAll('.sidebar-link[href="admin-courses.html"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.sidebar-link[href="admin-faculty.html"]').forEach(el => el.style.display = 'none');
    // Hide UI add buttons
    document.querySelectorAll('button[data-bs-target^="#add"], button[data-bs-target="#courseModal"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.btn-outline-danger').forEach(el => el.style.display = 'none'); // Hide deletes
    document.querySelectorAll('.btn-outline-primary').forEach(el => el.style.display = 'none'); // Hide edits
    // Quick actions on dashboard
    document.querySelectorAll('.quick-link-card[href="admin-courses.html"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.quick-link-card[href="admin-faculty.html"]').forEach(el => el.style.display = 'none');
  }

  // Exam Admin restrictions
  if (type === 'exam') {
    // Hide UI add buttons
    document.querySelectorAll('button[data-bs-target^="#add"], button[data-bs-target="#courseModal"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.btn-outline-danger').forEach(el => el.style.display = 'none');
    // Hide quick actions for adding
    document.querySelectorAll('.quick-link-card[href="admin-courses.html"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.quick-link-card[href="admin-faculty.html"]').forEach(el => el.style.display = 'none');
  }

  lockDepartmentDropdowns();
}

// Database query wrapper for Department Admins
function getAdminQuery(collectionName) {
  let ref = db.collection(collectionName);
  
  if (currentAdmin && currentAdmin.adminType === 'department' && currentAdmin.adminDepartment) {
    if (['students', 'faculty', 'courses', 'enrollments'].includes(collectionName)) {
      ref = ref.where('department', '==', currentAdmin.adminDepartment);
    }
  }
  return ref;
}

function lockDepartmentDropdowns() {
  if (currentAdmin && currentAdmin.adminType === 'department' && currentAdmin.adminDepartment) {
    const selects = document.querySelectorAll('select[id*="Department"], select[id*="Dept"]');
    selects.forEach(select => {
      select.value = currentAdmin.adminDepartment;
      // Disable editing but add a hidden input so the form data still passes if needed (or just let the logic handle it)
      if (!select.querySelector(`option[value="${currentAdmin.adminDepartment}"]`)) {
        select.innerHTML += `<option value="${currentAdmin.adminDepartment}">${currentAdmin.adminDepartment}</option>`;
        select.value = currentAdmin.adminDepartment;
      }
      select.disabled = true;
    });
  }
}

// ---------- Initialize Admin Dashboard ----------
async function initAdminDashboard() {
  try {
    const { user, data } = await requireAuth('admin', 'admin-login.html');
    currentAdmin = { uid: user.uid, ...data };
    updateAdminUI(currentAdmin);
    enforceAdminPermissions(currentAdmin);
    EnrollX.initSidebar();

    await loadAdminStats();
    await loadAdminCharts();
    await loadAdminActivity();

  } catch (error) {
    console.error('Admin dashboard error:', error);
  }
}

function updateAdminUI(admin) {
  document.querySelectorAll('.admin-name').forEach(el => el.textContent = admin.name || 'Admin');
  document.querySelectorAll('.admin-avatar-text').forEach(el => {
    const names = (admin.name || 'A').split(' ');
    el.textContent = names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });
}

async function loadAdminStats() {
  try {
    const students = await getAdminQuery('students').get();
    const faculty = await getAdminQuery('faculty').get();
    const courses = await getAdminQuery('courses').get();
    const enrollments = await getAdminQuery('enrollments').where('status', '==', 'enrolled').get();
    const results = await db.collection('results').get();

    const els = {
      totalStudents: students.size,
      totalFaculty: faculty.size,
      totalCourses: courses.size,
      activeEnrollments: enrollments.size,
      totalResults: results.size
    };

    Object.entries(els).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) EnrollX.animateCounter(el, value);
    });

  } catch (error) {
    console.error('Admin stats error:', error);
  }
}

async function loadAdminCharts() {
  try {
    // Department-wise enrollment chart
    const enrollments = await getAdminQuery('enrollments').where('status', '==', 'enrolled').get();
    const deptCounts = {};
    enrollments.docs.forEach(doc => {
      const dept = doc.data().department || 'Other';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const deptChartEl = document.getElementById('deptChart');
    if (deptChartEl && Object.keys(deptCounts).length > 0) {
      new Chart(deptChartEl, {
        type: 'doughnut',
        data: {
          labels: Object.keys(deptCounts),
          datasets: [{
            data: Object.values(deptCounts),
            backgroundColor: [
              '#3d5afe', '#9333ea', '#0d9488', '#ea580c',
              '#db2777', '#059669', '#2563eb', '#d97706'
            ],
            borderWidth: 0,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, font: { size: 12 } } }
          },
          cutout: '65%'
        }
      });
    }

    // Semester-wise course chart
    const courses = await getAdminQuery('courses').get();
    const semCounts = {};
    courses.docs.forEach(doc => {
      const sem = doc.data().semester || 0;
      semCounts[`Sem ${sem}`] = (semCounts[`Sem ${sem}`] || 0) + 1;
    });

    const semChartEl = document.getElementById('semChart');
    if (semChartEl && Object.keys(semCounts).length > 0) {
      new Chart(semChartEl, {
        type: 'bar',
        data: {
          labels: Object.keys(semCounts),
          datasets: [{
            label: 'Courses',
            data: Object.values(semCounts),
            backgroundColor: 'rgba(61, 90, 254, 0.8)',
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 40
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

  } catch (error) {
    console.error('Charts error:', error);
  }
}

async function loadAdminActivity() {
  const container = document.getElementById('adminActivity');
  if (!container) return;

  try {
    const enrollments = await getAdminQuery('enrollments')
      .orderBy('enrolledAt', 'desc')
      .limit(8)
      .get();

    if (enrollments.empty) {
      container.innerHTML = '<div class="text-center text-muted p-3">No recent activity</div>';
      return;
    }

    let html = '';
    enrollments.docs.forEach(doc => {
      const data = doc.data();
      const isEnrolled = data.status === 'enrolled';
      html += `
        <div class="activity-item">
          <div class="activity-icon ${isEnrolled ? 'green' : 'orange'}">
            <i class="bi ${isEnrolled ? 'bi-person-plus-fill' : 'bi-person-dash-fill'}"></i>
          </div>
          <div class="activity-text">
            <p><strong>${EnrollX.escapeHtml(data.studentName || 'Student')}</strong> ${isEnrolled ? 'enrolled in' : 'dropped'} <strong>${EnrollX.escapeHtml(data.courseName || '')}</strong></p>
            <small>${EnrollX.timeAgo(data.enrolledAt)}</small>
          </div>
        </div>`;
    });
    container.innerHTML = html;
  } catch (error) {
    console.error('Admin activity error:', error);
  }
}

// ---------- Course Management ----------
async function initAdminCourses() {
  try {
    const { user, data } = await requireAuth('admin', 'admin-login.html');
    currentAdmin = { uid: user.uid, ...data };
    updateAdminUI(currentAdmin);
    enforceAdminPermissions(currentAdmin);
    EnrollX.initSidebar();

    await loadAdminCoursesList();
    await loadFacultyForSelect();
  } catch (error) {
    console.error('Admin courses error:', error);
  }
}

async function loadAdminCoursesList() {
  const container = document.getElementById('adminCoursesBody');
  if (!container) return;

  try {
    const snapshot = await getAdminQuery('courses').get();

    if (snapshot.empty) {
      container.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">No courses found. Add your first course!</td></tr>';
      return;
    }

    let html = '';
    snapshot.docs.forEach((doc, index) => {
      const course = doc.data();
      html += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${EnrollX.escapeHtml(course.courseName)}</strong></td>
          <td><span class="badge-enrollx badge-blue">${EnrollX.escapeHtml(course.courseCode)}</span></td>
          <td>${course.credits}</td>
          <td>${EnrollX.escapeHtml(course.department)}</td>
          <td>${course.semester}</td>
          <td>${EnrollX.escapeHtml(course.facultyName || 'Unassigned')}</td>
          <td><span class="badge-enrollx ${course.availableSeats > 0 ? 'badge-green' : 'badge-red'}">${course.availableSeats}/${course.totalSeats}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editCourse('${doc.id}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteCourse('${doc.id}', '${EnrollX.escapeHtml(course.courseName)}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`;
    });
    container.innerHTML = html;

    const countEl = document.getElementById('adminCoursesCount');
    if (countEl) countEl.textContent = snapshot.size;

  } catch (error) {
    console.error('Load courses error:', error);
  }
}

async function loadFacultyForSelect() {
  const select = document.getElementById('courseFaculty');
  if (!select) return;

  try {
    const snapshot = await getAdminQuery('faculty').get();
    snapshot.docs.forEach(doc => {
      const f = doc.data();
      select.innerHTML += `<option value="${doc.id}" data-name="${f.name}">${f.name} - ${f.department}</option>`;
    });
  } catch (error) {
    console.error('Load faculty error:', error);
  }
}

async function saveCourse(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    const courseId = document.getElementById('courseDocId').value;
    const courseName = document.getElementById('courseName').value.trim();
    const courseCode = document.getElementById('courseCode').value.trim().toUpperCase();
    const credits = parseInt(document.getElementById('courseCredits').value);
    const department = document.getElementById('courseDepartment').value;
    const semester = parseInt(document.getElementById('courseSemester').value);
    const totalSeats = parseInt(document.getElementById('courseSeats').value);
    const description = document.getElementById('courseDescription').value.trim();
    const facultySelect = document.getElementById('courseFaculty');
    const facultyId = facultySelect.value;
    const facultyName = facultySelect.selectedOptions[0]?.dataset?.name || '';

    if (!courseName || !courseCode || !credits || !department || !semester || !totalSeats) {
      throw new Error('Please fill in all required fields');
    }

    const courseData = {
      courseName,
      courseCode,
      credits,
      department,
      semester,
      totalSeats,
      description,
      facultyId: facultyId || '',
      facultyName: facultyName || 'Unassigned'
    };

    if (courseId) {
      // Edit existing
      await db.collection('courses').doc(courseId).update(courseData);
      EnrollX.toast('Course updated successfully!', 'success');
    } else {
      // Add new
      courseData.availableSeats = totalSeats;
      courseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('courses').add(courseData);
      EnrollX.toast('Course added successfully!', 'success');
    }

    // Close modal and refresh
    const modal = bootstrap.Modal.getInstance(document.getElementById('courseModal'));
    if (modal) modal.hide();
    e.target.reset();
    document.getElementById('courseDocId').value = '';
    await loadAdminCoursesList();

  } catch (error) {
    console.error('Save course error:', error);
    EnrollX.toast(error.message || 'Failed to save course', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function editCourse(docId) {
  try {
    const doc = await db.collection('courses').doc(docId).get();
    if (!doc.exists) return;

    const course = doc.data();
    document.getElementById('courseDocId').value = docId;
    document.getElementById('courseName').value = course.courseName;
    document.getElementById('courseCode').value = course.courseCode;
    document.getElementById('courseCredits').value = course.credits;
    document.getElementById('courseDepartment').value = course.department;
    document.getElementById('courseSemester').value = course.semester;
    document.getElementById('courseSeats').value = course.totalSeats;
    document.getElementById('courseDescription').value = course.description || '';
    document.getElementById('courseFaculty').value = course.facultyId || '';

    document.getElementById('courseModalLabel').textContent = 'Edit Course';
    const modal = new bootstrap.Modal(document.getElementById('courseModal'));
    modal.show();

  } catch (error) {
    console.error('Edit course error:', error);
    EnrollX.toast('Failed to load course details', 'error');
  }
}

async function deleteCourse(docId, courseName) {
  const confirmed = await EnrollX.confirm(`Are you sure you want to delete "${courseName}"? This will also remove related enrollments.`);
  if (!confirmed) return;

  try {
    // Delete enrollments for this course
    const enrollments = await db.collection('enrollments').where('courseId', '==', docId).get();
    const batch = db.batch();
    enrollments.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('courses').doc(docId));
    await batch.commit();

    EnrollX.toast('Course deleted successfully!', 'success');
    await loadAdminCoursesList();

  } catch (error) {
    console.error('Delete course error:', error);
    EnrollX.toast('Failed to delete course', 'error');
  }
}

function resetCourseForm() {
  document.getElementById('courseForm').reset();
  document.getElementById('courseDocId').value = '';
  document.getElementById('courseModalLabel').textContent = 'Add New Course';
}

// ---------- Admin Students Management ----------
async function initAdminStudents() {
  try {
    const { user, data } = await requireAuth('admin', 'admin-login.html');
    currentAdmin = { uid: user.uid, ...data };
    updateAdminUI(currentAdmin);
    enforceAdminPermissions(currentAdmin);
    EnrollX.initSidebar();

    await loadAdminStudentsList();
  } catch (error) {
    console.error('Admin students error:', error);
  }
}

async function loadAdminStudentsList() {
  const container = document.getElementById('adminStudentsBody');
  if (!container) return;

  try {
    const snapshot = await getAdminQuery('students').get();

    if (snapshot.empty) {
      container.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No students found</td></tr>';
      return;
    }

    let html = '';
    snapshot.docs.forEach((doc, index) => {
      const s = doc.data();
      html += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${EnrollX.escapeHtml(s.name)}</strong></td>
          <td>${EnrollX.escapeHtml(s.studentId)}</td>
          <td>${EnrollX.escapeHtml(s.email)}</td>
          <td>${EnrollX.escapeHtml(s.department)}</td>
          <td>Sem ${s.semester}</td>
          <td><span class="badge-enrollx badge-green">Active</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary rounded-circle" onclick="editStudent('${doc.id}')" title="Edit Student">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger rounded-circle ms-1" onclick="deleteStudent('${doc.id}', '${EnrollX.escapeHtml(s.name).replace(/'/g, "\\'")}')" title="Delete Student">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    });
    container.innerHTML = html;

    const countEl = document.getElementById('adminStudentsCount');
    if (countEl) countEl.textContent = snapshot.size;

  } catch (error) {
    console.error('Load students error:', error);
  }
}

function searchStudents() {
  const term = document.getElementById('studentSearch')?.value.toLowerCase() || '';
  const rows = document.querySelectorAll('#adminStudentsBody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(term) ? '' : 'none';
  });
}

async function editStudent(docId) {
  try {
    const doc = await db.collection('students').doc(docId).get();
    if (!doc.exists) return;

    const s = doc.data();
    document.getElementById('editStudentDocId').value = docId;
    document.getElementById('editStudentName').value = s.name;
    document.getElementById('editStudentRegId').value = s.studentId;
    document.getElementById('editStudentEmail').value = s.email;
    document.getElementById('editStudentDept').value = s.department;
    document.getElementById('editStudentSem').value = s.semester;
    document.getElementById('editStudentPhone').value = s.phone || '';

    const modal = new bootstrap.Modal(document.getElementById('editStudentModal'));
    modal.show();
  } catch (error) {
    console.error('Edit student error:', error);
    EnrollX.toast('Failed to load student details', 'error');
  }
}

async function saveStudentEdit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    const docId = document.getElementById('editStudentDocId').value;
    const name = document.getElementById('editStudentName').value.trim();
    const department = document.getElementById('editStudentDept').value;
    const semester = parseInt(document.getElementById('editStudentSem').value);
    const phone = document.getElementById('editStudentPhone').value.trim();

    if (!name || !department || !semester) throw new Error('Name, Department, and Semester are required.');

    await db.collection('students').doc(docId).update({
      name,
      department,
      semester,
      phone
    });

    EnrollX.toast('Student details updated successfully!', 'success');

    const modal = bootstrap.Modal.getInstance(document.getElementById('editStudentModal'));
    if (modal) modal.hide();
    await loadAdminStudentsList();

  } catch (error) {
    console.error('Save student edit error:', error);
    EnrollX.toast(error.message || 'Failed to update student', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function deleteStudent(docId, studentName) {
  const confirmed = await EnrollX.confirm(`Are you sure you want to completely delete "${studentName}"? This action cannot be undone and will delete their enrollments.`);
  if (!confirmed) return;

  try {
    // Delete all related enrollments
    const enrollments = await db.collection('enrollments').where('studentId', '==', docId).get();
    const batch = db.batch();
    enrollments.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete the student profile
    batch.delete(db.collection('students').doc(docId));
    
    await batch.commit();

    EnrollX.toast('Student and their enrollments deleted.', 'success');
    await loadAdminStudentsList();
  } catch (error) {
    console.error('Delete student error:', error);
    EnrollX.toast('Failed to delete student', 'error');
  }
}

// ---------- Admin Faculty Management ----------
async function initAdminFaculty() {
  try {
    const { user, data } = await requireAuth('admin', 'admin-login.html');
    currentAdmin = { uid: user.uid, ...data };
    updateAdminUI(currentAdmin);
    enforceAdminPermissions(currentAdmin);
    EnrollX.initSidebar();

    await loadAdminFacultyList();
  } catch (error) {
    console.error('Admin faculty error:', error);
  }
}

async function loadAdminFacultyList() {
  const container = document.getElementById('adminFacultyBody');
  if (!container) return;

  try {
    const snapshot = await getAdminQuery('faculty').get();

    if (snapshot.empty) {
      container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No faculty found</td></tr>';
      return;
    }

    let html = '';
    snapshot.docs.forEach((doc, index) => {
      const f = doc.data();
      html += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${EnrollX.escapeHtml(f.name)}</strong></td>
          <td>${EnrollX.escapeHtml(f.email)}</td>
          <td>${EnrollX.escapeHtml(f.department)}</td>
          <td>${EnrollX.escapeHtml(f.designation || 'N/A')}</td>
          <td><span class="badge-enrollx badge-purple">Active</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary rounded-circle" onclick="editFaculty('${doc.id}')" title="Edit Faculty">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger rounded-circle ms-1" onclick="deleteFaculty('${doc.id}', '${EnrollX.escapeHtml(f.name).replace(/'/g, "\\'")}')" title="Delete Faculty">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    });
    container.innerHTML = html;

    const countEl = document.getElementById('adminFacultyCount');
    if (countEl) countEl.textContent = snapshot.size;

  } catch (error) {
    console.error('Load faculty error:', error);
  }
}

async function addFacultyMember(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';

    const name = document.getElementById('facultyName').value.trim();
    const email = document.getElementById('facultyEmailInput').value.trim();
    const password = document.getElementById('facultyPasswordInput').value;
    const department = document.getElementById('facultyDeptInput').value;
    const designation = document.getElementById('facultyDesignation').value.trim();
    const phone = document.getElementById('facultyPhone').value.trim();

    if (!name || !email || !password || !department) {
      throw new Error('Please fill in all required fields');
    }

    // Create auth account (Note: this will sign out current admin)
    // In production, use Firebase Admin SDK via Cloud Functions
    // For demo, we create the account and re-login admin
    const tempAuth = await auth.createUserWithEmailAndPassword(email, password);
    const uid = tempAuth.user.uid;
    await tempAuth.user.updateProfile({ displayName: name });

    // Save faculty to Firestore
    await db.collection('faculty').doc(uid).set({
      uid,
      name,
      email,
      department,
      designation,
      phone,
      role: 'faculty',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    EnrollX.toast('Faculty member created. Please log in again as admin.', 'success');

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addFacultyModal'));
    if (modal) modal.hide();

    // The admin will need to re-login since creating a new user signs them in
    setTimeout(() => window.location.href = 'admin-login.html', 2000);

  } catch (error) {
    console.error('Add faculty error:', error);
    let message = error.message;
    if (error.code === 'auth/email-already-in-use') message = 'Email already in use';
    EnrollX.toast(message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function editFaculty(docId) {
  try {
    const doc = await db.collection('faculty').doc(docId).get();
    if (!doc.exists) return;

    const f = doc.data();
    document.getElementById('editFacultyDocId').value = docId;
    document.getElementById('editFacultyName').value = f.name;
    document.getElementById('editFacultyEmail').value = f.email;
    document.getElementById('editFacultyDept').value = f.department;
    document.getElementById('editFacultyDesignation').value = f.designation || '';
    document.getElementById('editFacultyPhone').value = f.phone || '';

    const modal = new bootstrap.Modal(document.getElementById('editFacultyModal'));
    modal.show();
  } catch (error) {
    console.error('Edit faculty error:', error);
    EnrollX.toast('Failed to load faculty details', 'error');
  }
}

async function saveFacultyEdit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    const docId = document.getElementById('editFacultyDocId').value;
    const name = document.getElementById('editFacultyName').value.trim();
    const department = document.getElementById('editFacultyDept').value;
    const designation = document.getElementById('editFacultyDesignation').value.trim();
    const phone = document.getElementById('editFacultyPhone').value.trim();

    if (!name || !department) throw new Error('Name and Department are required.');

    await db.collection('faculty').doc(docId).update({
      name,
      department,
      designation,
      phone
    });

    EnrollX.toast('Faculty details updated successfully!', 'success');

    const modal = bootstrap.Modal.getInstance(document.getElementById('editFacultyModal'));
    if (modal) modal.hide();
    await loadAdminFacultyList();

  } catch (error) {
    console.error('Save faculty edit error:', error);
    EnrollX.toast(error.message || 'Failed to update faculty', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function deleteFaculty(docId, facultyName) {
  const confirmed = await EnrollX.confirm(`Are you sure you want to delete the faculty profile for "${facultyName}"?`);
  if (!confirmed) return;

  try {
    await db.collection('faculty').doc(docId).delete();
    EnrollX.toast('Faculty member deleted from database.', 'success');
    await loadAdminFacultyList();
  } catch (error) {
    console.error('Delete faculty error:', error);
    EnrollX.toast('Failed to delete faculty member', 'error');
  }
}

// ---------- Administrator Management ----------
async function initAdminAdmins() {
  try {
    const { user, data } = await requireAuth('admin', 'admin-login.html');
    currentAdmin = { uid: user.uid, ...data };
    updateAdminUI(currentAdmin);
    enforceAdminPermissions(currentAdmin);
    EnrollX.initSidebar();

    await loadAdminList();
  } catch (error) {
    console.error('Admin management error:', error);
  }
}

async function loadAdminList() {
  const container = document.getElementById('adminAdminsBody');
  if (!container) return;

  try {
    const snapshot = await db.collection('admins').get();
    const isSuperAdmin = currentAdmin && currentAdmin.adminType === 'super';

    // Hide actions column header if not super admin
    const actionsHeader = document.getElementById('actionsColHeader');
    if (actionsHeader) actionsHeader.style.display = isSuperAdmin ? '' : 'none';

    if (snapshot.empty) {
      container.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No administrators found</td></tr>';
      return;
    }

    let html = '';
    snapshot.docs.forEach((doc, index) => {
      const a = doc.data();
      const roleDisplayName = {
        super: 'Super Admin',
        department: 'Dept Admin',
        placement: 'Placement Admin',
        exam: 'Exam Admin'
      }[a.adminType || 'super'];

      const deptName = a.adminType === 'department' ? (a.adminDepartment || 'N/A') : 'All';
      const isSelf = a.uid === currentAdmin?.uid;

      html += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${EnrollX.escapeHtml(a.name || 'Admin')}</strong>${isSelf ? ' <span class="badge-enrollx badge-blue" style="font-size:0.7rem;">You</span>' : ''}</td>
          <td>${EnrollX.escapeHtml(a.email)}</td>
          <td><span class="badge-enrollx badge-red">${roleDisplayName}</span></td>
          <td>${EnrollX.escapeHtml(deptName)}</td>
          <td style="display:${isSuperAdmin ? '' : 'none'}">
            <button class="btn btn-sm btn-outline-primary rounded-circle" onclick="editAdmin('${doc.id}')" title="Edit Admin">
              <i class="bi bi-pencil"></i>
            </button>
            ${!isSelf ? `<button class="btn btn-sm btn-outline-danger rounded-circle ms-1" onclick="deleteAdmin('${doc.id}', '${EnrollX.escapeHtml(a.name || 'Admin').replace(/'/g, "\\'")}'" title="Delete Admin">
              <i class="bi bi-trash"></i>
            </button>` : ''}
          </td>
        </tr>`;
    });
    container.innerHTML = html;

    const countEl = document.getElementById('adminAdminsCount');
    if (countEl) countEl.textContent = snapshot.size;

  } catch (error) {
    console.error('Load admins error:', error);
  }
}

async function addAdminMember(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';

    const name = document.getElementById('adminName').value.trim();
    const email = document.getElementById('adminEmailInput').value.trim();
    const password = document.getElementById('adminPasswordInput').value;
    const adminType = document.getElementById('adminTypeSelect').value;
    const adminDepartment = adminType === 'department' ? document.getElementById('adminDeptSelect').value : null;

    if (!name || !email || !password) {
      throw new Error('Please fill in all required fields');
    }
    if (adminType === 'department' && !adminDepartment) {
      throw new Error('Please select a department for Department Admin');
    }

    // Create auth account (Note: this will sign out current admin)
    const tempAuth = await auth.createUserWithEmailAndPassword(email, password);
    const uid = tempAuth.user.uid;
    await tempAuth.user.updateProfile({ displayName: name });

    // Save admin to Firestore
    await db.collection('admins').doc(uid).set({
      uid,
      name,
      email,
      role: 'admin',
      adminType: adminType,
      adminDepartment: adminDepartment,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    EnrollX.toast('Administrator created. Please log in again.', 'success');

    const modal = bootstrap.Modal.getInstance(document.getElementById('addAdminModal'));
    if (modal) modal.hide();

    setTimeout(() => window.location.href = 'admin-login.html', 2000);

  } catch (error) {
    console.error('Add admin error:', error);
    let message = error.message;
    if (error.code === 'auth/email-already-in-use') message = 'Email already in use';
    EnrollX.toast(message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ---------- Edit Admin ----------
async function editAdmin(docId) {
  try {
    const doc = await db.collection('admins').doc(docId).get();
    if (!doc.exists) return;
    const a = doc.data();

    document.getElementById('editAdminDocId').value = docId;
    document.getElementById('editAdminName').value = a.name || '';
    document.getElementById('editAdminEmail').value = a.email || '';
    document.getElementById('editAdminType').value = a.adminType || 'super';

    const deptContainer = document.getElementById('editAdminDeptContainer');
    if (a.adminType === 'department') {
      deptContainer.style.display = 'block';
      document.getElementById('editAdminDept').value = a.adminDepartment || '';
    } else {
      deptContainer.style.display = 'none';
    }

    const modal = new bootstrap.Modal(document.getElementById('editAdminModal'));
    modal.show();
  } catch (error) {
    console.error('Edit admin error:', error);
    EnrollX.toast('Failed to load admin details', 'error');
  }
}

async function saveAdminEdit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    const docId = document.getElementById('editAdminDocId').value;
    const name = document.getElementById('editAdminName').value.trim();
    const adminType = document.getElementById('editAdminType').value;
    const adminDepartment = adminType === 'department'
      ? document.getElementById('editAdminDept').value
      : null;

    if (!name) throw new Error('Name is required.');
    if (adminType === 'department' && !adminDepartment) throw new Error('Please select a department.');

    await db.collection('admins').doc(docId).update({
      name,
      adminType,
      adminDepartment: adminDepartment || null
    });

    EnrollX.toast('Administrator updated successfully!', 'success');
    const modal = bootstrap.Modal.getInstance(document.getElementById('editAdminModal'));
    if (modal) modal.hide();
    await loadAdminList();

  } catch (error) {
    console.error('Save admin edit error:', error);
    EnrollX.toast(error.message || 'Failed to update admin', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function deleteAdmin(docId, adminName) {
  if (docId === currentAdmin?.uid) {
    EnrollX.toast('You cannot delete your own account.', 'warning');
    return;
  }
  const confirmed = await EnrollX.confirm(`Are you sure you want to delete administrator "${adminName}"? This action cannot be undone.`);
  if (!confirmed) return;

  try {
    await db.collection('admins').doc(docId).delete();
    EnrollX.toast('Administrator deleted.', 'success');
    await loadAdminList();
  } catch (error) {
    console.error('Delete admin error:', error);
    EnrollX.toast('Failed to delete administrator', 'error');
  }
}
