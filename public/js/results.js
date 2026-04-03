// ========================================
// EnrollX – Results Module
// ========================================

// ---------- Initialize Student Results Page ----------
async function initStudentResults() {
  try {
    const { user, data } = await requireAuth('student', 'login.html');
    currentStudent = { uid: user.uid, ...data };
    updateStudentUI(currentStudent);
    EnrollX.initSidebar();

    EnrollX.showLoading();
    await loadStudentResults();
    EnrollX.hideLoading();

  } catch (error) {
    console.error('Results init error:', error);
    EnrollX.hideLoading();
  }
}

async function loadStudentResults() {
  const container = document.getElementById('resultsContainer');
  if (!container) return;

  try {
    const snapshot = await db.collection('results')
      .where('studentId', '==', currentStudent.uid)
      .get();

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-file-earmark-bar-graph"></i>
          <h5>No Results Available</h5>
          <p>Your results will appear here once your faculty uploads them.</p>
        </div>`;
      
      // Hide CGPA
      const cgpaSection = document.getElementById('cgpaSection');
      if (cgpaSection) cgpaSection.style.display = 'none';
      return;
    }

    const allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Group by semester
    const semesters = {};
    allResults.forEach(result => {
      const sem = result.semester || 1;
      if (!semesters[sem]) semesters[sem] = [];
      semesters[sem].push(result);
    });

    // Calculate CGPA
    const cgpa = EnrollX.calculateCGPA(allResults);
    const cgpaEl = document.getElementById('cgpaValue');
    if (cgpaEl) cgpaEl.textContent = cgpa;

    const cgpaClass = EnrollX.getGPAClass(parseFloat(cgpa));
    const cgpaBadge = document.getElementById('cgpaBadge');
    if (cgpaBadge) {
      cgpaBadge.className = `gpa-badge ${cgpaClass}`;
      if (cgpaClass === 'excellent') cgpaBadge.textContent = 'Distinction';
      else if (cgpaClass === 'good') cgpaBadge.textContent = 'First Class';
      else if (cgpaClass === 'average') cgpaBadge.textContent = 'Second Class';
      else cgpaBadge.textContent = 'Needs Improvement';
    }

    // Render semester-wise results
    let html = '';
    const sortedSemesters = Object.keys(semesters).sort((a, b) => b - a);

    sortedSemesters.forEach(sem => {
      const semResults = semesters[sem];
      const gpa = EnrollX.calculateGPA(semResults);
      const gpaClass = EnrollX.getGPAClass(parseFloat(gpa));

      html += `
        <div class="result-semester-card animate-fade-in-up">
          <div class="semester-header">
            <h5><i class="bi bi-journal-bookmark-fill me-2"></i>Semester ${sem}</h5>
            <span class="gpa-badge ${gpaClass}">GPA: ${gpa}</span>
          </div>
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr style="background: var(--bg-tertiary);">
                  <th>#</th>
                  <th>Course</th>
                  <th>Code</th>
                  <th>Credits</th>
                  <th>Internal</th>
                  <th>External</th>
                  <th>Total</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>`;

      semResults.forEach((result, index) => {
        html += `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${EnrollX.escapeHtml(result.courseName)}</strong></td>
                  <td><span class="badge-enrollx badge-blue">${EnrollX.escapeHtml(result.courseCode)}</span></td>
                  <td>${result.credits}</td>
                  <td>${result.internalMarks}</td>
                  <td>${result.externalMarks}</td>
                  <td><strong>${result.totalMarks}</strong></td>
                  <td><span class="grade-badge ${EnrollX.getGradeBadgeClass(result.grade)}">${result.grade}</span></td>
                </tr>`;
      });

      const totalCredits = semResults.reduce((sum, r) => sum + (r.credits || 0), 0);
      html += `
              </tbody>
              <tfoot>
                <tr style="background: var(--bg-tertiary);">
                  <td colspan="3"><strong>Total</strong></td>
                  <td><strong>${totalCredits}</strong></td>
                  <td colspan="3"></td>
                  <td><strong class="gpa-badge ${gpaClass}" style="font-size:0.8rem;">GPA: ${gpa}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>`;
    });

    container.innerHTML = html;

  } catch (error) {
    console.error('Load results error:', error);
    container.innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><h5>Error Loading Results</h5></div>';
  }
}

// ---------- Download Result PDF ----------
async function downloadResultPDF() {
  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      EnrollX.toast('PDF library not loaded. Please try again.', 'error');
      return;
    }

    const doc = new jsPDF();
    const results = await db.collection('results')
      .where('studentId', '==', currentStudent.uid)
      .get();

    if (results.empty) {
      EnrollX.toast('No results to download', 'warning');
      return;
    }

    const allResults = results.docs.map(d => d.data());
    const cgpa = EnrollX.calculateCGPA(allResults);

    // Header
    doc.setFillColor(61, 90, 254);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('EnrollX - Academic Transcript', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Student Course Registration & Enrollment Management Portal', 105, 28, { align: 'center' });

    // Student Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    let y = 55;
    doc.setFont('helvetica', 'bold');
    doc.text('Student Information', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${currentStudent.name}`, 14, y);
    doc.text(`Student ID: ${currentStudent.studentId}`, 110, y);
    y += 6;
    doc.text(`Department: ${currentStudent.department}`, 14, y);
    doc.text(`Semester: ${currentStudent.semester}`, 110, y);
    y += 6;
    doc.text(`Email: ${currentStudent.email}`, 14, y);
    doc.text(`CGPA: ${cgpa}`, 110, y);
    y += 10;

    // Group by semester
    const semesters = {};
    allResults.forEach(r => {
      const sem = r.semester || 1;
      if (!semesters[sem]) semesters[sem] = [];
      semesters[sem].push(r);
    });

    Object.keys(semesters).sort().forEach(sem => {
      const semResults = semesters[sem];
      const gpa = EnrollX.calculateGPA(semResults);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Semester ${sem} (GPA: ${gpa})`, 14, y);
      y += 6;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, 182, 7, 'F');
      doc.setFontSize(9);
      doc.text('Course', 16, y);
      doc.text('Code', 80, y);
      doc.text('Credits', 110, y);
      doc.text('Total', 135, y);
      doc.text('Grade', 160, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      semResults.forEach(r => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(r.courseName.substring(0, 35), 16, y);
        doc.text(r.courseCode, 80, y);
        doc.text(String(r.credits), 115, y);
        doc.text(String(r.totalMarks), 138, y);
        doc.text(r.grade, 163, y);
        y += 6;
      });

      y += 8;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated by EnrollX on ${new Date().toLocaleDateString()}`, 105, 290, { align: 'center' });

    doc.save(`EnrollX_Transcript_${currentStudent.studentId}.pdf`);
    EnrollX.toast('Transcript downloaded successfully!', 'success');

  } catch (error) {
    console.error('PDF download error:', error);
    EnrollX.toast('Failed to generate PDF', 'error');
  }
}
