# EnrollX – University Course Registration Portal

EnrollX is a premium, full-stack student course registration and management portal designed for modern universities. It provides dedicated portals for students, faculty, and administrators to streamline the entire academic lifecycle from registration to result publishing.

## 🌟 Key Features

*   **Role-Based Access Control:** Three distinct secure portals for Students, Faculty, and Administrators.
*   **Student Portal:**
    *   Browse and filter available courses.
    *   Real-time course enrollment with seat availability tracking.
    *   View semester-wise results and calculate GPA/CGPA automatically.
    *   Download academic transcripts as beautifully formatted PDF documents.
*   **Faculty Portal:**
    *   View all courses assigned to the faculty member.
    *   Manage student lists for each course.
    *   Upload internal and external marks.
    *   Auto-calculation of letter grades and grade points.
*   **Admin Portal:**
    *   Comprehensive dashboard with real-time analytics and charts.
    *   Manage all users (Students, Faculty, Admins).
    *   Create, edit, and delete courses.
    *   Seed the database with initial sample data.
*   **Premium UI/UX:** Built with Bootstrap 5 featuring a modern gradient design system, custom animations, and a seamless responsive layout.

## 🛠️ Technology Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript
*   **UI Framework:** Bootstrap 5.3.2, Bootstrap Icons
*   **Backend & Database:** Firebase (Authentication, Firestore Database, Hosting)
*   **Libraries:** Chart.js (Dashboard Analytics), jsPDF & jsPDF-AutoTable (Transcript Generation)

## 🚀 Setup and Installation

### Prerequisites
1.  Node.js installed on your machine (for local serving).
2.  A Google Account to create a Firebase Project.

### Step 1: Clone or Download the Repository
Ensure you have the project files downloaded to your local machine (e.g., `d:\EnrollX`).

### Step 2: Configure Firebase
1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g., `enrollx-portal`).
2.  Enable **Authentication** and turn on the **Email/Password** sign-in provider.
3.  Enable **Firestore Database** and create it in test mode (or configure standard security rules).
4.  Register a new Web App within your Firebase project to get your Firebase configuration object.
5.  Open `public/js/firebase-config.js` and replace the placeholder configuration with your actual Firebase config:
    ```javascript
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT_ID.appspot.com",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```

## 💻 How to Run Locally

You can serve the application locally using any standard web server. The easiest way is using `npx serve`:

1.  Open your terminal or command prompt.
2.  Navigate to the project directory:
    ```bash
    cd d:\EnrollX
    ```
3.  Run the local server targeting the `public` directory:
    ```bash
    npx serve public
    ```
4.  Open your web browser and navigate to the assigned local address (usually `http://localhost:3000`).

## 🌱 How to Seed the Database (Initial Data)

If you are starting with a fresh Firebase project, you need some initial data (courses, faculty, and an admin user) to test the system.

1.  Ensure your local server is running.
2.  Navigate to the seed page in your browser: `http://localhost:3000/seed.html`
3.  Click the **"Run Seed Script"** button. *Warning: Only run this once on a fresh database.*
4.  The script will automatically create:
    *   **1 Admin:** `admin@enrollx.com` / `Admin@123`
    *   **3 Faculty Accounts:** (e.g., `sarah.johnson@enrollx.com` / `Faculty@123`)
    *   **12 Sample Courses** across different departments.
5.  Wait for the green "SEED COMPLETE!" success message in the log.
6.  You can now return to the home page and log in using the credentials above, or register a new student account.

## 📁 Project Structure

```text
EnrollX/
├── public/                 # All web files to be served/hosted
│   ├── index.html          # Main landing page
│   ├── login.html          # Student Login
│   ├── register.html       # Student Registration
│   ├── admin-login.html    # Admin Login
│   ├── faculty-login.html  # Faculty Login
│   ├── seed.html           # Database initial population script
│   ├── css/
│   │   ├── style.css       # Global design variables and components
│   │   ├── landing.css     # Specific styles for the landing page
│   │   ├── auth.css        # Authentication page styling
│   │   └── dashboard.css   # Main application dashboard layout
│   └── js/
│       ├── firebase-config.js # Core firebase initialization
│       ├── auth.js         # Authentication logic (login, register, route guards)
│       ├── utils.js        # Global helpers (toast, validation, GPA calculation)
│       ├── student.js      # Student dashboard logic
│       ├── courses.js      # Course enrollment logic
│       ├── results.js      # Results calculation and PDF generation
│       ├── faculty.js      # Faculty dashboard and marking logic
│       ├── admin.js        # Administrator CRUD logic and charts
│       └── theme.js        # Theme toggle logic (Light/Dark mode)
├── firebase.json           # Firebase CLI deployment configuration
└── firestore.rules         # Database security rules
```
