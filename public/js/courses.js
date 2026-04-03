// ========================================
// EnrollX – Course Browsing & Enrollment
// ========================================

let allCourses = [];
let studentEnrollments = [];

// ---------- Load Available Courses ----------
async function initCourseBrowsing() {
  try {
    const { user, data } = await requireAuth('student', 'login.html');
    currentStudent = { uid: user.uid, ...data };
    updateStudentUI(currentStudent);
    EnrollX.initSidebar();

    EnrollX.showLoading();
    await loadAllCourses();
    await loadStudentEnrollments();
    renderCourses(allCourses);
    populateFilters();
    EnrollX.hideLoading();

  } catch (error) {
    console.error('Course browsing init error:', error);
    EnrollX.hideLoading();
  }
}

async function loadAllCourses() {
  const snapshot = await db.collection('courses').get();
  allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadStudentEnrollments() {
  const snapshot = await db.collection('enrollments')
    .where('studentId', '==', currentStudent.uid)
    .where('status', '==', 'enrolled')
    .get();
  studentEnrollments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderCourses(courses) {
  const container = document.getElementById('coursesGrid');
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <i class="bi bi-journal-x"></i>
          <h5>No Courses Found</h5>
          <p>No courses match your current filters. Try adjusting your search.</p>
        </div>
      </div>`;
    return;
  }

  let html = '';
  courses.forEach((course, index) => {
    const color = EnrollX.getCardColor(index);
    const isEnrolled = studentEnrollments.some(e => e.courseId === course.id);
    const seatsFull = course.availableSeats <= 0;
    const seatsPercent = course.totalSeats > 0 ? Math.round((course.availableSeats / course.totalSeats) * 100) : 0;

    html += `
      <div class="col-md-6 col-lg-4 animate-fade-in-up animate-delay-${(index % 5) + 1}">
        <div class="course-card">
          <div class="course-header ${color}">
            <h5>${EnrollX.escapeHtml(course.courseName)}</h5>
            <span class="course-code">${EnrollX.escapeHtml(course.courseCode)}</span>
          </div>
          <div class="course-body">
            <div class="course-meta">
              <span><i class="bi bi-building"></i> ${EnrollX.escapeHtml(course.department)}</span>
              <span><i class="bi bi-calendar3"></i> Sem ${course.semester}</span>
              <span><i class="bi bi-star-fill"></i> ${course.credits} Credits</span>
              <span><i class="bi bi-person"></i> ${EnrollX.escapeHtml(course.facultyName || 'TBA')}</span>
            </div>
            <p class="course-description">${EnrollX.escapeHtml(course.description || 'No description available.')}</p>
            <div class="course-footer">
              <span class="seats-badge ${seatsFull ? 'seats-full' : 'seats-available'}">
                <i class="bi bi-people-fill me-1"></i>${course.availableSeats}/${course.totalSeats} seats
              </span>
              ${isEnrolled 
                ? '<button class="btn btn-sm btn-outline-danger rounded-pill" disabled><i class="bi bi-check-circle me-1"></i>Enrolled</button>'
                : seatsFull 
                  ? '<button class="btn btn-sm btn-outline-secondary rounded-pill" disabled><i class="bi bi-x-circle me-1"></i>Full</button>'
                  : `<button class="btn btn-sm btn-primary-gradient btn-enrollx" onclick="enrollInCourse('${course.id}')"><i class="bi bi-plus-circle me-1"></i>Enroll</button>`
              }
            </div>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;
  // Update count
  const countEl = document.getElementById('coursesCount');
  if (countEl) countEl.textContent = courses.length;
}

function populateFilters() {
  const deptFilter = document.getElementById('deptFilter');
  const semFilter = document.getElementById('semFilter');

  if (deptFilter) {
    const departments = [...new Set(allCourses.map(c => c.department))].sort();
    departments.forEach(dept => {
      deptFilter.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
  }

  if (semFilter) {
    const semesters = [...new Set(allCourses.map(c => c.semester))].sort((a, b) => a - b);
    semesters.forEach(sem => {
      semFilter.innerHTML += `<option value="${sem}">Semester ${sem}</option>`;
    });
  }
}

function filterCourses() {
  const searchTerm = (document.getElementById('courseSearch')?.value || '').toLowerCase();
  const deptFilter = document.getElementById('deptFilter')?.value || '';
  const semFilter = document.getElementById('semFilter')?.value || '';

  let filtered = allCourses;

  if (searchTerm) {
    filtered = filtered.filter(c =>
      c.courseName.toLowerCase().includes(searchTerm) ||
      c.courseCode.toLowerCase().includes(searchTerm) ||
      (c.description || '').toLowerCase().includes(searchTerm)
    );
  }

  if (deptFilter) {
    filtered = filtered.filter(c => c.department === deptFilter);
  }

  if (semFilter) {
    filtered = filtered.filter(c => c.semester === parseInt(semFilter));
  }

  renderCourses(filtered);
}

// ---------- Enroll in Course ----------
async function enrollInCourse(courseId) {
  try {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) throw new Error('Course not found');

    // Duplicate check
    const existing = await db.collection('enrollments')
      .where('studentId', '==', currentStudent.uid)
      .where('courseId', '==', courseId)
      .where('status', '==', 'enrolled')
      .get();

    if (!existing.empty) {
      EnrollX.toast('You are already enrolled in this course!', 'warning');
      return;
    }

    // Seat check
    const courseDoc = await db.collection('courses').doc(courseId).get();
    const currentSeats = courseDoc.data().availableSeats;
    if (currentSeats <= 0) {
      EnrollX.toast('No seats available in this course!', 'error');
      return;
    }

    // Create enrollment
    await db.collection('enrollments').add({
      studentId: currentStudent.uid,
      studentName: currentStudent.name,
      courseId: courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      department: course.department,
      semester: course.semester,
      credits: course.credits,
      status: 'enrolled',
      enrolledAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reduce seats
    await db.collection('courses').doc(courseId).update({
      availableSeats: firebase.firestore.FieldValue.increment(-1)
    });

    EnrollX.toast(`Successfully enrolled in ${course.courseName}!`, 'success');

    // Refresh
    await loadAllCourses();
    await loadStudentEnrollments();
    filterCourses();

  } catch (error) {
    console.error('Enrollment error:', error);
    EnrollX.toast('Failed to enroll. Please try again.', 'error');
  }
}

// ---------- Load Enrolled Courses ----------
async function initEnrolledCourses() {
  try {
    const { user, data } = await requireAuth('student', 'login.html');
    currentStudent = { uid: user.uid, ...data };
    updateStudentUI(currentStudent);
    EnrollX.initSidebar();

    EnrollX.showLoading();
    await loadStudentEnrollmentsList();
    EnrollX.hideLoading();

  } catch (error) {
    console.error('Enrolled courses init error:', error);
    EnrollX.hideLoading();
  }
}

async function loadStudentEnrollmentsList() {
  const container = document.getElementById('enrolledList');
  if (!container) return;

  const snapshot = await db.collection('enrollments')
    .where('studentId', '==', currentStudent.uid)
    .where('status', '==', 'enrolled')
    .get();

  if (snapshot.empty) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <i class="bi bi-journal-bookmark"></i>
          <h5>No Enrolled Courses</h5>
          <p>You haven't enrolled in any courses yet. <a href="student-courses.html">Browse courses</a></p>
        </div>
      </div>`;
    return;
  }

  let html = '';
  let totalCredits = 0;
  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const color = EnrollX.getCardColor(index);
    totalCredits += data.credits || 0;

    html += `
      <div class="col-md-6 col-lg-4 animate-fade-in-up">
        <div class="course-card">
          <div class="course-header ${color}">
            <h5>${EnrollX.escapeHtml(data.courseName)}</h5>
            <span class="course-code">${EnrollX.escapeHtml(data.courseCode)}</span>
          </div>
          <div class="course-body">
            <div class="course-meta">
              <span><i class="bi bi-building"></i> ${EnrollX.escapeHtml(data.department || '')}</span>
              <span><i class="bi bi-calendar3"></i> Sem ${data.semester || ''}</span>
              <span><i class="bi bi-star-fill"></i> ${data.credits || 0} Credits</span>
            </div>
            <p class="course-description">Enrolled ${EnrollX.timeAgo(data.enrolledAt)}</p>
            <div class="course-footer">
              <span class="badge-enrollx badge-green"><i class="bi bi-check-circle me-1"></i>Active</span>
              <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="dropCourse('${doc.id}', '${data.courseId}')">
                <i class="bi bi-x-circle me-1"></i>Drop
              </button>
            </div>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;

  const countEl = document.getElementById('enrolledCoursesCount');
  if (countEl) countEl.textContent = snapshot.size;
  const creditsEl = document.getElementById('totalCredits');
  if (creditsEl) creditsEl.textContent = totalCredits;
}

// ---------- Drop Course ----------
async function dropCourse(enrollmentId, courseId) {
  const confirmed = await EnrollX.confirm('Are you sure you want to drop this course? This action cannot be undone.');
  if (!confirmed) return;

  try {
    // Update enrollment status
    await db.collection('enrollments').doc(enrollmentId).update({
      status: 'dropped',
      droppedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Increase seats
    await db.collection('courses').doc(courseId).update({
      availableSeats: firebase.firestore.FieldValue.increment(1)
    });

    EnrollX.toast('Course dropped successfully!', 'info');
    await loadStudentEnrollmentsList();

  } catch (error) {
    console.error('Drop error:', error);
    EnrollX.toast('Failed to drop course. Please try again.', 'error');
  }
}
