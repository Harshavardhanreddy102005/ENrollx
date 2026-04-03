// ========================================
// EnrollX – Shared Utilities
// ========================================

const EnrollX = {
  // ---------- Toast Notifications ----------
  toast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `toast-enrollx ${type}`;
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);

    toast.addEventListener('click', () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  },

  // ---------- Loading Spinner ----------
  showLoading() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="spinner-enrollx"></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  },

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.opacity = '1';
      }, 300);
    }
  },

  // ---------- Form Validation ----------
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  validatePhone(phone) {
    return /^[0-9]{10,15}$/.test(phone.replace(/[+\-\s]/g, ''));
  },

  validatePassword(password) {
    return password.length >= 6;
  },

  // ---------- Date Formatting ----------
  formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  timeAgo(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  },

  // ---------- Grade Calculations ----------
  gradePoints: {
    'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0
  },

  getGrade(totalMarks) {
    if (totalMarks >= 90) return 'O';
    if (totalMarks >= 80) return 'A+';
    if (totalMarks >= 70) return 'A';
    if (totalMarks >= 60) return 'B+';
    if (totalMarks >= 50) return 'B';
    if (totalMarks >= 40) return 'C';
    return 'F';
  },

  getGradePoint(grade) {
    return this.gradePoints[grade] || 0;
  },

  calculateGPA(results) {
    if (!results || results.length === 0) return 0;
    let totalCredits = 0;
    let totalPoints = 0;
    results.forEach(r => {
      const credits = r.credits || 0;
      const gp = this.getGradePoint(r.grade);
      totalCredits += credits;
      totalPoints += credits * gp;
    });
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
  },

  calculateCGPA(allResults) {
    return this.calculateGPA(allResults);
  },

  getGPAClass(gpa) {
    if (gpa >= 8.5) return 'excellent';
    if (gpa >= 7) return 'good';
    if (gpa >= 5) return 'average';
    return 'poor';
  },

  getGradeBadgeClass(grade) {
    const map = { 'O': 'grade-O', 'A+': 'grade-Aplus', 'A': 'grade-A', 'B+': 'grade-Bplus', 'B': 'grade-B', 'C': 'grade-C', 'F': 'grade-F' };
    return map[grade] || 'grade-B';
  },

  // ---------- Course Card Colors ----------
  cardColors: ['blue', 'purple', 'teal', 'orange', 'pink', 'green'],

  getCardColor(index) {
    return this.cardColors[index % this.cardColors.length];
  },

  // ---------- Department List ----------
  departments: [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Biotechnology',
    'Mathematics',
    'Physics',
    'Business Administration'
  ],

  // ---------- Sidebar Toggle (Mobile) ----------
  initSidebar() {
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if (overlay) overlay.classList.toggle('show');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
      });
    }
  },

  // ---------- Animated Counter ----------
  animateCounter(element, target, duration = 1500) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        element.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(start).toLocaleString();
      }
    }, 16);
  },

  // ---------- Generate Unique ID ----------
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // ---------- Confirm Dialog ----------
  async confirm(message) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'confirmModal';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-enrollx">
            <div class="modal-header" style="background: var(--gradient-warm);">
              <h5 class="modal-title"><i class="bi bi-exclamation-triangle me-2"></i>Confirm Action</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">${message}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirmYes">Yes, Proceed</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();

      document.getElementById('confirmYes').addEventListener('click', () => {
        bsModal.hide();
        resolve(true);
      });
      modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
        resolve(false);
      });
    });
  },

  // ---------- Escape HTML ----------
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
