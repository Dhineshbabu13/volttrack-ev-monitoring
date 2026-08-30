# Connecting Your EV Dataset to PostgreSQL & Your VoltTrack Website

A step-by-step guide for beginners. Two files are included alongside this guide:
- `schema.sql` — creates your database tables
- `import_data.py` — loads your Excel data into those tables

I looked at your `my_ev_data_final.xlsx` file first. It has **15,000 telemetry rows** covering **50 vehicles** and **50 drivers**. Each vehicle's specs (model, brand, dimensions, battery capacity, etc.) stay the same across all its rows — so the cleanest setup is **two tables**: one for vehicle specs, one for the time-series telemetry readings. That's what `schema.sql` creates.

---

## Step 1: Install PostgreSQL

1. Go to https://www.postgresql.org/download/ and download the installer for your OS (Windows/Mac/Linux).
2. Run the installer. When it asks for a **password for the `postgres` user**, set one and remember it — you'll need it later.
3. Keep the default port `5432`.
4. It will also install **pgAdmin** — a visual tool for managing your database. Open it after install; it's the easiest way to see your tables as a beginner.

## Step 2: Create Your Database

In pgAdmin:
1. Right-click **Servers → PostgreSQL → Databases**.
2. Click **Create → Database**.
3. Name it `volttrack_db` and save.

(Alternatively, in a terminal: `createdb volttrack_db`)

## Step 3: Create the Tables

1. In pgAdmin, click on `volttrack_db`, then open the **Query Tool** (toolbar icon, or right-click → Query Tool).
2. Open the included `schema.sql` file, copy all its contents, paste into the Query Tool, and click **Execute (▶)**.
3. You should now see 4 tables under `volttrack_db → Schemas → public → Tables`: `admins`, `drivers`, `vehicles`, `telemetry_records`.

## Step 4: Import Your Excel Dataset

This uses a small Python script to read your Excel file and load it into the tables.

1. Install the required Python packages:
   ```bash
   pip install pandas psycopg2-binary openpyxl
   ```
2. Put `my_ev_data_final.xlsx` in the same folder as `import_data.py`.
3. Open `import_data.py` and update the `DB_CONFIG` section near the top with your actual password:
   ```python
   DB_CONFIG = {
       "host": "localhost",
       "port": 5432,
       "dbname": "volttrack_db",
       "user": "postgres",
       "password": "YOUR_PASSWORD_HERE",   # <-- change this
   }
   ```
4. Run it:
   ```bash
   python import_data.py
   ```
5. You should see progress messages ending in `Done! Data imported successfully.`

**Note on drivers:** your Excel file only has `driver_id` values (e.g. `D005`) — not names, birthdates, or passwords. The script inserts temporary placeholder driver rows so the import works. Once real drivers sign up through your website's Sign Up form, you can update those rows with their real details, or treat the imported IDs purely as historical demo data separate from real accounts.

## Step 5: Connect Your Website (Next.js) to PostgreSQL

Since your site is built with Next.js, the easiest beginner-friendly way to talk to PostgreSQL is **Prisma** (a tool that lets you query your database using simple JavaScript instead of writing raw SQL).

1. In your project folder, install Prisma:
   ```bash
   npm install prisma --save-dev
   npm install @prisma/client
   npx prisma init
   ```
   This creates a `prisma/schema.prisma` file and a `.env` file.

2. Open `.env` and set your database connection string:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/volttrack_db"
   ```
   **Important:** never commit `.env` to GitHub — make sure it's listed in your `.gitignore` file. This file holds your database password.

3. Pull your existing tables into Prisma automatically (instead of typing them by hand):
   ```bash
   npx prisma db pull
   ```
   This reads your `volttrack_db` tables and writes matching models into `prisma/schema.prisma`.

4. Generate the Prisma Client (the code you'll actually import and use):
   ```bash
   npx prisma generate
   ```

## Step 6: Query Real Data From Your App

Create an API route, for example `app/api/vehicles/route.js` (or `pages/api/vehicles.js` if using the older Pages Router):

```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const vehicles = await prisma.vehicles.findMany();
  return Response.json(vehicles);
}
```

For a specific driver's latest telemetry (e.g. for their dashboard after login):

```javascript
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  const records = await prisma.telemetry_records.findMany({
    where: { driver_id: driverId },
    orderBy: { timestamp: 'desc' },
    take: 20, // most recent 20 readings
  });

  return Response.json(records);
}
```

Then, in your dashboard page/component, fetch it like:
```javascript
const res = await fetch(`/api/telemetry?driverId=${driverId}`);
const data = await res.json();
```

## Step 7: Connect Sign Up / Login to the `drivers` and `admins` Tables

When a driver fills out your Sign Up form, your backend should `INSERT` a new row into `drivers` (hashing the password first — never store plain-text passwords; use a library like `bcrypt`). When they Sign In, look up the row by `driver_id`, then compare the entered password against the stored hash with `bcrypt.compare()`.

Example (Sign Up API route, conceptually):
```javascript
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(req.body.password, 10);

await prisma.drivers.create({
  data: {
    driver_id: generatedDriverId,
    driver_name: req.body.driver_name,
    date_of_birth: req.body.date_of_birth,
    car_brand: req.body.car_brand,
    car_model: req.body.car_model,
    password_hash: hashedPassword,
  },
});
```

## Step 8: Test Everything End-to-End

1. Start your dev server: `npm run dev`
2. Visit an API route directly in the browser, e.g. `http://localhost:3000/api/vehicles` — you should see your 50 vehicles as JSON.
3. Sign up a new test driver through your UI, then check pgAdmin → `drivers` table to confirm the row appeared.
4. Confirm a driver dashboard page can pull their telemetry using the API route from Step 6.

---

## Quick Recap

| What | Tool |
|---|---|
| Database engine | PostgreSQL |
| Visual DB manager | pgAdmin |
| Load Excel → DB | `import_data.py` (pandas + psycopg2) |
| App ↔ DB connection | Prisma (in your Next.js app) |
| Passwords | Never stored in plain text — hash with `bcrypt` |
| Secrets | Kept in `.env`, never committed to Git |

If you get stuck on any single step (an error message, a connection failure, etc.), paste me the exact error and I'll help you debug it directly.
