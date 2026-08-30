"""
Import your new EV_Dataset_2025_15000_Cars_Final_180K_Realistic.xlsx into
PostgreSQL, replacing vehicles/drivers/telemetry_records entirely.

IMPORTANT: Run schema_v2_replace_tables.sql in pgAdmin FIRST — it drops and
recreates these 3 tables to match this new dataset's structure. The admins
table is left untouched.

Before running this script:
1. pip install pandas psycopg2-binary openpyxl bcrypt
2. Put your dataset file in the same folder as this script, and update
   EXCEL_FILE below to match its exact filename.
3. Update DB_CONFIG with your real PostgreSQL password.
"""

import pandas as pd
import psycopg2
import bcrypt
from psycopg2.extras import execute_values

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "volttrack_db",
    "user": "postgres",
    "password": "Dhi@123",  # <-- change this
}

EXCEL_FILE = "EV_Dataset_2025_15000_Cars_Final_180K_Realistic.xlsx"  # <-- confirm exact filename

df = pd.read_excel(EXCEL_FILE)
df.columns = [c.strip() for c in df.columns]  # clean up stray spaces in headers
print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# ---- 1. VEHICLES (static specs, one row per unique vehicle_id) ----
vehicle_cols = [
    "vehicle_id", "car_reg_no", "vehicle_brand", "vehicle_model", "vehicle_type",
    "manufacturing_year", "battery_capacity_kwh", "weight_kg", "motor_power_kw",
    "length_mm", "width_mm", "height_mm", "wheel_base_mm", "gross_vehicle_weight_kg",
    "maximum_payload_kg", "cargo_volume_l", "torque", "max_passenger_capacity",
]
vehicles_df = df[vehicle_cols].drop_duplicates(subset="vehicle_id")
print(f"Inserting {len(vehicles_df)} vehicles...")
execute_values(
    cur,
    f"INSERT INTO vehicles ({', '.join(vehicle_cols)}) VALUES %s "
    f"ON CONFLICT (vehicle_id) DO NOTHING",
    [tuple(row) for row in vehicles_df.itertuples(index=False)],
    page_size=1000,
)

# ---- 2. DRIVERS (identity + hashed password, one row per unique driver_id) ----
driver_cols = [
    "driver_id", "driver_name", "date_of_birth", "driver_age",
    "driver_mobile_number", "driver_email", "driver_licence_number",
    "driver_years_of_experience", "driver_behaviour", "driver_password",
]
drivers_df = df[driver_cols].drop_duplicates(subset="driver_id")
print(f"Inserting {len(drivers_df)} drivers with hashed passwords...")

driver_rows = []
for _, row in drivers_df.iterrows():
    hashed = bcrypt.hashpw(str(row["driver_password"]).encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    driver_rows.append((
        row["driver_id"], row["driver_name"], row["date_of_birth"], row["driver_age"],
        row["driver_mobile_number"], row["driver_email"], row["driver_licence_number"],
        row["driver_years_of_experience"], row["driver_behaviour"], hashed,
    ))

execute_values(
    cur,
    """
    INSERT INTO drivers
        (driver_id, driver_name, date_of_birth, driver_age, driver_mobile_number,
         driver_email, driver_licence_number, driver_years_of_experience,
         driver_behaviour, password_hash)
    VALUES %s
    ON CONFLICT (driver_id) DO NOTHING
    """,
    driver_rows,
    page_size=1000,
)

# ---- 3. TELEMETRY RECORDS (every row — all 180,000 monthly readings) ----
telemetry_cols = [
    "record_id", "vehicle_id", "driver_id", "timestamp", "location",
    "destination_location", "route_type", "vehicle_status", "speed_kmph",
    "driving_mode", "odometer_km", "trip_distance_km", "passenger_count",
    "soc_percent", "soh_percent", "battery_voltage", "battery_current",
    "battery_temperature_c", "ambient_temperature_c", "energy_consumed_kwh",
    "range_km", "charging_status", "charging_power_kw", "charging_duration_min",
    "electricity_rate_per_kwh", "charging_cost", "latitude", "longitude",
    "can_reach_destination", "maintenance_status", "maintenance_due_km",
    "last_service_date", "next_service_date", "maintenance_cost_inr",
    "alert_status", "trip_revenue", "net_revenue_inr",
]
telemetry_df = df[telemetry_cols].drop_duplicates(subset="record_id")
print(f"Inserting {len(telemetry_df)} telemetry records (this will take a bit longer)...")
execute_values(
    cur,
    f"INSERT INTO telemetry_records ({', '.join(telemetry_cols)}) VALUES %s "
    f"ON CONFLICT (record_id) DO NOTHING",
    [tuple(row) for row in telemetry_df.itertuples(index=False)],
    page_size=2000,
)

conn.commit()
cur.close()
conn.close()
print("Done! New dataset fully imported: 15,000 vehicles, 15,000 drivers, ~180,000 telemetry records.")
