// ========================================
// EnrollX – Student Module
// ========================================

let currentStudent = null;

// ---------- Initialize Student Dashboard ----------
async function initStudentDashboard() {
  try {
    const { user, data } = await requireAuth('student', 'login.html');
    currentStudent = { uid: user.uid, ...data };

    // Update UI
    updateStudentUI(currentStudent);
    await loadDashboardStats();
    await loadRecentActivity();
    EnrollX.initSidebar();

  } catch (error) {
    console.error('Dashboard init error:', error);
  }
}

function updateStudentUI(student) {
  // Update name displays
  document.querySelectorAll('.student-name').forEach(el => el.textContent = student.name || 'Student');
  document.querySelectorAll('.student-dept').forEach(el => el.textContent = student.department || '');
  document.querySelectorAll('.student-id-display').forEach(el => el.textContent = student.studentId || '');
  document.querySelectorAll('.student-semester').forEach(el => el.textContent = `Semester ${student.semester}` || '');

  // Avatar initials
  document.querySelectorAll('.student-avatar-text').forEach(el => {
    const names = (student.name || 'S').split(' ');
    el.textContent = names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });
}

async function loadDashboardStats() {
  try {
    // Enrolled courses count
    const enrollments = await db.collection('enrollments')
      .where('studentId', '==', currentStudent.uid)
      .where('status', '==', 'enrolled')
      .get();

    const enrolledCount = enrollments.size;
    const countEl = document.getElementById('enrolledCount');
    if (countEl) EnrollX.animateCounter(countEl, enrolledCount);

    // Total available courses
    const courses = await db.collection('courses').get();
    const coursesEl = document.getElementById('availableCoursesCount');
    if (coursesEl) EnrollX.animateCounter(coursesEl, courses.size);

    // Results count
    const results = await db.collection('results')
      .where('studentId', '==', currentStudent.uid)
      .get();

    const resultsEl = document.getElementById('resultsCount');
    if (resultsEl) EnrollX.animateCounter(resultsEl, results.size);

    // Calculate CGPA
    if (results.size > 0) {
      const resultData = results.docs.map(d => d.data());
      const cgpa = EnrollX.calculateCGPA(resultData);
      const cgpaEl = document.getElementById('cgpaDisplay');
      if (cgpaEl) cgpaEl.textContent = cgpa;
    }

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadRecentActivity() {
  const container = document.getElementById('recentActivity');
  if (!container) return;

  try {
    const enrollments = await db.collection('enrollments')
      .where('studentId', '==', currentStudent.uid)
      .orderBy('enrolledAt', 'desc')
      .limit(5)
      .get();

    if (enrollments.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-clock-history"></i>
          <h5>No Recent Activity</h5>
          <p>Start enrolling in courses to see your activity here.</p>
        </div>`;
      return;
    }

    let html = '';
    enrollments.docs.forEach(doc => {
      const data = doc.data();
      const isEnrolled = data.status === 'enrolled';
      html += `
        <div class="activity-item">
          <div class="activity-icon ${isEnrolled ? 'green' : 'orange'}">
            <i class="bi ${isEnrolled ? 'bi-plus-circle-fill' : 'bi-dash-circle-fill'}"></i>
          </div>
          <div class="activity-text">
            <p>${isEnrolled ? 'Enrolled in' : 'Dropped'} <strong>${EnrollX.escapeHtml(data.courseName || '')}</strong> (${EnrollX.escapeHtml(data.courseCode || '')})</p>
            <small>${EnrollX.timeAgo(data.enrolledAt)}</small>
          </div>
        </div>`;
    });
    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading activity:', error);
    container.innerHTML = '<p class="text-muted text-center p-3">Unable to load activity</p>';
  }
}

// ---------- Initialize Student Profile ----------
async function initStudentProfile() {
  try {
    const { user, data } = await requireAuth('student', 'login.html');
    currentStudent = { uid: user.uid, ...data };
    updateStudentUI(currentStudent);
    EnrollX.initSidebar();

    // Fill profile details
    const fields = ['name', 'studentId', 'email', 'department', 'semester', 'phone'];
    fields.forEach(field => {
      const el = document.getElementById(`profile-${field}`);
      if (el) el.textContent = currentStudent[field] || 'N/A';
    });

    const joinedEl = document.getElementById('profile-joined');
    if (joinedEl) joinedEl.textContent = EnrollX.formatDate(currentStudent.createdAt);

  } catch (error) {
    console.error('Profile init error:', error);
  }
}

// ---------- Update Student Profile ----------
async function updateStudentProfile(e) {
  e.preventDefault();
  try {
    const phone = document.getElementById('editPhone').value.trim();
    const semester = parseInt(document.getElementById('editSemester').value);

    await db.collection('students').doc(currentStudent.uid).update({
      phone,
      semester
    });

    EnrollX.toast('Profile updated successfully!', 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    console.error('Update profile error:', error);
    EnrollX.toast('Failed to update profile', 'error');
  }
}
