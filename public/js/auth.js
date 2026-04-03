// ========================================
// EnrollX – Authentication Logic
// ========================================

// ---------- Student Registration ----------
async function registerStudent(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...';

    const name = document.getElementById('regName').value.trim();
    const studentId = document.getElementById('regStudentId').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const department = document.getElementById('regDepartment').value;
    const semester = parseInt(document.getElementById('regSemester').value);
    const phone = document.getElementById('regPhone').value.trim();

    // Validations
    if (!name || !studentId || !email || !password || !department || !semester || !phone) {
      throw new Error('Please fill in all fields');
    }
    if (!EnrollX.validateEmail(email)) throw new Error('Please enter a valid email');
    if (!EnrollX.validatePassword(password)) throw new Error('Password must be at least 6 characters');
    if (!EnrollX.validatePhone(phone)) throw new Error('Please enter a valid phone number');

    // Check if student ID already exists
    const existingStudent = await db.collection('students').where('studentId', '==', studentId).get();
    if (!existingStudent.empty) throw new Error('This Student ID is already registered');

    // Create Firebase Auth user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // Update display name
    await userCredential.user.updateProfile({ displayName: name });

    // Save to Firestore
    await db.collection('students').doc(uid).set({
      uid,
      name,
      studentId,
      email,
      department,
      semester,
      phone,
      role: 'student',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    EnrollX.toast('Account created successfully! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'student-dashboard.html', 1500);

  } catch (error) {
    console.error('Registration error:', error);
    let message = error.message;
    if (error.code === 'auth/email-already-in-use') message = 'This email is already registered. Please login instead.';
    if (error.code === 'auth/weak-password') message = 'Password should be at least 6 characters.';
    EnrollX.toast(message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ---------- Student Login ----------
async function loginStudent(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) throw new Error('Please enter email and password');

    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // Check user role
    const studentDoc = await db.collection('students').doc(uid).get();
    if (!studentDoc.exists) {
      await auth.signOut();
      throw new Error('No student account found. Please register or use the correct login portal.');
    }

    EnrollX.toast('Login successful! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'student-dashboard.html', 1000);

  } catch (error) {
    console.error('Login error:', error);
    let message = error.message;
    if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
    if (error.code === 'auth/wrong-password') message = 'Incorrect password. Please try again.';
    if (error.code === 'auth/invalid-credential') message = 'Invalid email or password.';
    EnrollX.toast(message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ---------- Faculty Login ----------
async function loginFaculty(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';

    const email = document.getElementById('facultyEmail').value.trim();
    const password = document.getElementById('facultyPassword').value;

    if (!email || !password) throw new Error('Please enter email and password');

    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    const facultyDoc = await db.collection('faculty').doc(uid).get();
    if (!facultyDoc.exists) {
      await auth.signOut();
      throw new Error('No faculty account found. Contact admin for access.');
    }

    EnrollX.toast('Login successful! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'faculty-dashboard.html', 1000);

  } catch (error) {
    console.error('Faculty login error:', error);
    let message = error.message;
    if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
    if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
    if (error.code === 'auth/invalid-credential') message = 'Invalid email or password.';
    EnrollX.toast(message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ---------- Admin Login ----------
async function loginAdmin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) throw new Error('Please enter email and password');

    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    const adminDoc = await db.collection('admins').doc(uid).get();
    if (!adminDoc.exists) {
      await auth.signOut();
      throw new Error('Access denied. You are not an administrator.');
    }

    EnrollX.toast('Admin login successful!', 'success');
    setTimeout(() => window.location.href = 'admin-dashboard.html', 1000);

  } catch (error) {
    console.error('Admin login error:', error);
    let message = error.message;
    if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
    if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
    if (error.code === 'auth/invalid-credential') message = 'Invalid email or password.';
    EnrollX.toast(message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ---------- Password Reset ----------
async function resetPassword(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

    const email = document.getElementById('resetEmail').value.trim();
    if (!email) throw new Error('Please enter your email');
    if (!EnrollX.validateEmail(email)) throw new Error('Please enter a valid email');

    await auth.sendPasswordResetEmail(email);
    EnrollX.toast('Password reset email sent! Check your inbox.', 'success');
    setTimeout(() => window.location.href = 'login.html', 3000);

  } catch (error) {
    console.error('Reset error:', error);
    let message = error.message;
    if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
    EnrollX.toast(message, 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ---------- Logout ----------
async function logout() {
  try {
    await auth.signOut();
    EnrollX.toast('Logged out successfully', 'info');
    setTimeout(() => window.location.href = 'index.html', 800);
  } catch (error) {
    console.error('Logout error:', error);
    EnrollX.toast('Error logging out', 'error');
  }
}

// ---------- Auth State Guard ----------
function requireAuth(role, redirectTo = 'login.html') {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = redirectTo;
        reject('Not authenticated');
        return;
      }

      try {
        let doc;
        if (role === 'student') {
          doc = await db.collection('students').doc(user.uid).get();
        } else if (role === 'faculty') {
          doc = await db.collection('faculty').doc(user.uid).get();
        } else if (role === 'admin') {
          doc = await db.collection('admins').doc(user.uid).get();
        }

        if (!doc || !doc.exists) {
          await auth.signOut();
          window.location.href = redirectTo;
          reject('Invalid role');
          return;
        }

        resolve({ user, data: doc.data() });
      } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = redirectTo;
        reject(error);
      }
    });
  });
}

// ---------- Password Visibility Toggle ----------
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'bi bi-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'bi bi-eye';
  }
}
