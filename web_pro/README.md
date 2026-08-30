# ⚡ VoltTrack — EV Telemetry & Driver Monitoring Platform

VoltTrack is an enterprise-grade Electric Vehicle (EV) telemetry monitoring, fleet analytics, and predictive ML platform. It enables real-time tracking of vehicle battery status (SOC, SOH), charging metrics, driver behaviour, vehicle health alerts, and AI-driven range estimations.

---

## 🚀 Features

- **Fleet Command Center & Overview**: Live monitored EV roster with Leaflet interactive location map and marker clustering.
- **Precomputed Fleet Analytics**: Instant (< 300 ms) high-performance multi-month revenue, maintenance expense trends, driver eco-score leaderboards, and aggregate CO2 savings.
- **Server-Side Paginated Roster & Drivers**: Multi-filtered table for 15,000+ EVs and driver profiles with pagination, search, and sorting.
- **Machine Learning Range Prediction**: Flask-based Random Forest model predicting EV remaining range based on battery capacity, passenger count, route type, motor specs, and SOC.
- **Role-Based Authentication**: Secure JWT authentication for Admins and Drivers with protected routes.
- **Responsive Dark/Modern Aesthetics**: Glassmorphism UI with TailwindCSS, Framer Motion, and Recharts.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Leaflet / React-Leaflet, Lucide Icons.
- **Backend API**: Node.js, Express, Prisma ORM, PostgreSQL (pg driver & `@prisma/adapter-pg`), Compression middleware, JSON Web Tokens (JWT), BcryptJS.
- **ML Microservice**: Python, Flask, Scikit-learn / Random Forest Regressor, Pandas, Joblib.

---

## ⚙️ Quick Start & Setup Instructions

### 1. Prerequisites
- Node.js (v18+ recommended)
- Python 3.9+
- PostgreSQL database

### 2. Clone Repository
```bash
git clone https://github.com/Dhineshbabu13/volttrack-ev-monitoring.git
cd volttrack-ev-monitoring
```

### 3. Install Dependencies
```bash
npm install
```

For ML service dependencies:
```bash
pip install flask pandas numpy joblib scikit-learn
```

### 4. Configure Environment Variables
Create a `.env` file in the project root (never committed to Git):
```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/volttrack_db"
JWT_SECRET="your_custom_jwt_secret_key"
```

### 5. Initialize Database Schema
```bash
npx prisma db push
```

### 6. Run the Application Services

**Terminal 1 — Backend Express API (Port 4000):**
```bash
node server/index.js
```

**Terminal 2 — ML Prediction Service (Port 5001):**
```bash
python ml_service/predict_server.py
```

**Terminal 3 — Frontend Vite Dev Server (Port 3000):**
```bash
npm run dev
```

Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

## 🔒 Security & Git Exclusion

Important credentials in `.env`, regenerable `node_modules/`, scratch files, and large ML pickle files (`*.pkl`) are explicitly ignored via `.gitignore` to protect security and repository size.
