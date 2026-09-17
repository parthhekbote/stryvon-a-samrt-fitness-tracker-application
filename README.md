# FITGENIUS AI - Smart AI-Powered Fitness Tracker

FITGENIUS AI is a state-of-the-art, full-stack fitness tracking web application built to help users manage workouts, count calories, track body indices, and consult a grounded AI fitness coach. It features image-based calorie tracking using Groq Vision API and a motivational gamification reward badge system.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Folder Structure](#folder-structure)
3. [Database Design & 3NF Normalization](#database-design--3nf-normalization)
4. [ER Diagram Explanation](#er-diagram-explanation)
5. [Backend API Documentation](#backend-api-documentation)
6. [AI Coach & Calorie Camera Integration](#ai-coach--calorie-camera-integration)
7. [Installation & Setup Guide](#installation--setup-guide)

---

## Tech Stack

*   **Frontend**: React (Vite) + Tailwind CSS v4 + Lucide React + Recharts (dynamic animated charts)
*   **Backend**: Node.js + Express.js
*   **Database**: MySQL
*   **AI Integration**: Groq API
    *   *Chatbot Engine*: `llama-3.3-70b-specdec`
    *   *Calorie Vision Scanner*: `llama-3.2-11b-vision-preview`
*   **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing

---

## Folder Structure

```text
dbms_project/
├── database/
│   └── schema.sql                 # 3NF SQL creation schema + presets seed data
├── server/
│   ├── config/
│   │   └── db.js                  # MySQL pool configuration & self-healing migration
│   ├── middleware/
│   │   └── auth.js                # JWT payload gatekeeper middleware
│   ├── controllers/
│   │   ├── auth.controller.js     # User registration, login, streaks, & profiles
│   │   ├── exercise.controller.js # Exercise search & category filtering
│   │   ├── workout.controller.js  # Custom workout creators & sets/reps logging
│   │   ├── diet.controller.js     # Meal logs, water logs, & Groq Vision calorie scanner
│   │   ├── ai.controller.js       # Grounded Coach chatroom & weekly summaries
│   │   └── progress.controller.js # Body weight loggers, BMI calculators, & PDF export
│   ├── index.js                   # Express server config, Multer file limits, & app router
│   ├── package.json               # Backend Node.js package manifests
│   └── .env.example               # Template environment configuration
└── client/
    ├── src/
    │   ├── components/
    │   │   └── Layout.jsx         # Mobile-responsive sidebar, theme toggles, & active streak indicators
    │   ├── pages/
    │   │   ├── LoginRegister.jsx  # Glassmorphic auth forms & credentials gate
    │   │   ├── Dashboard.jsx      # Calories consumed/burned meters, water logging, & progress telemetry
    │   │   ├── Workouts.jsx       # Sets/reps/weights logging panel & template managers
    │   │   ├── Exercises.jsx      # Exercise search lists & instruction modals with video tutorial links
    │   │   ├── Diet.jsx           # Calorie breakdown rings, water logging, & AI camera image calorie scanner
    │   │   ├── AICoach.jsx        # Grounded chatbot chat room & quick-tap suggestions
    │   │   ├── Analytics.jsx      # Recharts reports & PDF export print handlers
    │   │   └── Profile.jsx        # Profile configuration form & unlocked achievement showcase
    │   ├── App.jsx                # Route guards & root state managers
    │   ├── main.jsx               # React entry binder
    │   └── index.css              # Tailwind directives & glassmorphic aesthetics
    ├── postcss.config.js          # PostCSS v4 configuration loader
    ├── tailwind.config.js         # Custom theme colors and keyframe animation anchors
    ├── package.json               # React frontend package manifests
    └── index.html                 # App metadata & Outfit/Inter Google Font imports
```

---

## Database Design & 3NF Normalization

The SQL schema defined in `database/schema.sql` adheres strictly to the **Third Normal Form (3NF)** rules to ensure maximum performance, remove redundancy, and prevent modification anomalies.

### Normalization Process
1.  **First Normal Form (1NF)**:
    *   All column attributes hold atomic value sets (no compound values like list of exercises in a single text column).
    *   Every table is uniquely identifiable by a Primary Key (`user_id`, `workout_id`, etc.).
2.  **Second Normal Form (2NF)**:
    *   Satisfies 1NF.
    *   No partial dependencies exist. In composite key tables (like `workout_exercises`), non-key fields like `sequence_order` depend entirely on the composite PK `(workout_id, exercise_id)`, not a subset of it.
3.  **Third Normal Form (3NF)**:
    *   Satisfies 2NF.
    *   No transitive dependencies exist. For example, rather than placing the details of exercises directly inside a logged workout row (which would result in redundant duplicates every time the exercise is performed), exercises are mapped to their own unique `exercises` table, and connected to logged workouts through `workout_sets` (mapping to the unique logged session `user_workouts`).

---

## ER Diagram Explanation

The relational structure of our MySQL database is organized around the following constraints and keys:

*   **USER performs WORKOUT**: A User logs workout sessions in `user_workouts` (linked via `user_id` FK).
*   **WORKOUT contains EXERCISE**: Many-to-many junction table `workout_exercises` maps exercises to workout templates. When a workout is logged, individual performance details (sets, reps, weights) are recorded in `workout_sets` referencing the `user_workouts` session.
*   **USER follows DIET_PLAN**: Relies on a clean `current_diet_id` foreign key in the `users` table, which points to the target values in `diet_plans(diet_id)`.
*   **USER logs PROGRESS**: One-to-many relationship with the `progress` table. Each entry stores daily stats like weight and calculated BMI.
*   **USER logs MEAL_LOG**: One-to-many relationship with `meal_logs` allowing breakfast, lunch, dinner, or snack calories to be summed against daily diet targets.
*   **USER interacts with AI_CHAT_HISTORY**: One-to-many relationship tracking prompt logs with the coach.

---

## Backend API Documentation

### Authentication & Profile
*   `POST /api/auth/register` - Create accounts, assign default diet plans, log initial weight progress, and award initial badges.
*   `POST /api/auth/login` - Verify password hashes, increment/reset active streak trackers, and return JWT tokens.
*   `GET /api/auth/profile` - Fetch usernames, goals, calculated BMI, and array of unlocked badges.
*   `PUT /api/auth/profile` - Update usernames, body parameters, water targets, or active diet templates.

### Exercises Library
*   `GET /api/exercises` - Retrieve exercises catalog with query options for search title, muscle filter, and level difficulty.

### Workout Logger
*   `GET /api/workouts` - Fetch presets and user custom workout plans.
*   `POST /api/workouts` - Save a custom workout template with selected exercises.
*   `POST /api/workouts/log` - Record completed workout sessions, logging sets, reps, and weights for exercises. Automatically increments active streaks.
*   `GET /api/workouts/history` - Fetch logged history of finished workouts with sets details.

### Nutrition & Calorie Camera
*   `GET /api/diet/meals` - Sum today's logged breakfast, lunch, or snack macros.
*   `POST /api/diet/log-meal` - Manually enter a dish name and macros.
*   `POST /api/diet/log-meal-image` - **AI Calorie Camera**. Uploads a food picture via Multer, encodes it to base64, queries Groq Vision (`llama-3.2-11b-vision-preview`) to estimate calories/protein/carbs/fats, and adds it immediately.
*   `POST /api/diet/water` - Log ml of water consumed.

### AI Fitness Coach
*   `POST /api/ai/chat` - Chat with AI Coach. Prompt is sent along with a system prompt grounded on the user's active goals, weight trend, streak, and calories logged today.
*   `GET /api/ai/weekly-summary` - Get synthetic AI weekly progress report.

### Analytics Reports
*   `POST /api/progress` - Log daily weight and body fat to calculate BMI.
*   `GET /api/progress/analytics` - Format historical data for Recharts (Line, Bar, Pie).
*   `GET /api/progress/pdf-export` - Extract raw progress statistics for printing summary reports.

---

## AI Coach & Calorie Camera Integration

1.  **AI Calorie Camera (Phone Native Capture)**:
    *   By incorporating `<input type="file" accept="image/*" capture="environment">` on the frontend, users on mobile devices are prompted directly to launch their phone camera.
    *   The picture file is uploaded to the backend via Multer. If a `GROQ_API_KEY` is present, Llama-3.2 Vision estimates the dish's macros and returns a structured JSON payload:
        ```json
        { "meal_name": "Grilled Chicken and Rice", "calories": 480, "protein": 38, "carbs": 42, "fats": 12 }
        ```
    *   If no key is present, the server falls back to a dynamic mockup list of healthy items (tagged with `AI Demo`) so the app is always fully testable.
2.  **Context-Grounded Coach Chatbot**:
    *   The coach pulls the user's details on height, weight, current goals, active workout streak, and macros eaten today.
    *   It crafts a tailored coaching response (e.g. "Excellent job on your 3-day streak! Since you have consumed 40g of protein today against your bulk goal of 180g, try incorporating...").

---

## Installation & Setup Guide

### Prerequisites
- Node.js (v18 or higher)
- MySQL Server running locally or in the cloud

### 1. Database Setup
Launch your MySQL terminal and run the sync schema:
```bash
mysql -u root -p < database/schema.sql
```
*Note: The backend has a built-in self-healing synchronization script. It will verify and automatically create the `fitgenius_db` database and all 3NF tables on startup if they do not exist.*

### 2. Backend Server Setup
1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure variables inside the `.env` file:
    ```bash
    cp .env.example .env
    # Add your MySQL password and your Groq API Key
    ```
4.  Start the development server:
    ```bash
    npm run start
    # Server will start on http://localhost:5001
    ```

### 3. Frontend Client Setup
1.  Navigate to the client directory:
    ```bash
    cd ../client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the Vite development server:
    ```bash
    npm run dev
    # Client will open on http://localhost:5173
    ```
