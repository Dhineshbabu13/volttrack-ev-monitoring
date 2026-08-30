# ⚡ VoltTrack — EV Telemetry & Driver Monitoring Platform

VoltTrack is an enterprise-grade Electric Vehicle (EV) telemetry monitoring, fleet analytics, and predictive ML platform. It enables real-time tracking of vehicle battery status (SOC, SOH), charging metrics, driver behaviour, vehicle health alerts, and AI-driven range estimations.

---

## 📁 Repository Structure

- `web_pro/`: Full-stack web application (React + Vite frontend, Node.js + Express + Prisma backend API, Flask ML prediction microservice).
- `EV_Dataset_2025_15000_Cars_Final_180K_Realistic.xlsx`: Complete dataset containing 15,000 EV vehicles and 180,000 telemetry records.
- `schema_v2_replace_tables.sql`: PostgreSQL database schema initialization script.
- `import_new_full_dataset_FAST.py`: High-performance Python script to import the dataset into PostgreSQL.
- `POSTGRES_SETUP_GUIDE.md`: Comprehensive guide for PostgreSQL setup and data import.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Leaflet / React-Leaflet, Lucide Icons.
- **Backend API**: Node.js, Express, Prisma ORM, PostgreSQL (`pg` driver & `@prisma/adapter-pg`), Compression middleware, JSON Web Tokens (JWT), BcryptJS.
- **ML Microservice**: Python, Flask, Scikit-learn / Random Forest Regressor, Pandas, Joblib.
- **Data Pipelines**: Python, Pandas, Psycopg2, OpenPyXL.

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

### 3. Database Setup & Data Import
1. Create a PostgreSQL database named `volttrack_db`.
2. Run `schema_v2_replace_tables.sql` in pgAdmin or psql to initialize the table schemas.
3. Import the dataset into PostgreSQL:
   ```bash
   pip install pandas psycopg2-binary openpyxl bcrypt
   python import_new_full_dataset_FAST.py
   ```

### 4. Application Setup (`web_pro`)
Navigate to the web application directory:
```bash
cd web_pro
npm install
```

For the ML prediction service:
```bash
pip install flask pandas numpy joblib scikit-learn
```

### 5. Configure Environment Variables
Create a `.env` file in `web_pro/` (never committed to Git):
```env
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/volttrack_db"
JWT_SECRET="your_custom_jwt_secret_key"
```

### 6. Run the Application Services

**Terminal 1 — Backend Express API (Port 4000):**
```bash
cd web_pro
node server/index.js
```

**Terminal 2 — ML Prediction Service (Port 5001):**
```bash
cd web_pro
python ml_service/predict_server.py
```

**Terminal 3 — Frontend Vite Dev Server (Port 3000):**
```bash
cd web_pro
npm run dev
```

Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

## 🔒 Security & Safety Note

Environment credentials (`.env`), `node_modules/`, `scratch/`, and model files (`*.pkl`) are explicitly ignored via `.gitignore` to prevent sensitive credentials or temporary files from being committed.
