"""
Import my_ev_data_final.xlsx into PostgreSQL.

Before running:
1. pip install pandas psycopg2-binary openpyxl
2. Make sure you already ran schema.sql to create the tables.
3. Update the DB_CONFIG values below to match your PostgreSQL setup.
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# ---- 1. UPDATE THESE WITH YOUR OWN POSTGRES DETAILS ----
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "volttrack_db",
    "user": "postgres",
    "password": "Dhi@123",
}

EXCEL_FILE = "my_ev_data_final.xlsx"

# ---- 2. Read the Excel file ----
df = pd.read_excel(EXCEL_FILE)
print(f"Loaded {len(df)} rows from {EXCEL_FILE}")

# ---- 3. Split into VEHICLES (unique specs per vehicle_id) ----
vehicle_cols = [
    "vehicle_id", "vehicle_model", "vehicle_brand", "battery_capacity_kwh",
    "weight_kg", "motor_power_kw", "length_mm", "width_mm", "height_mm",
    "wheel_base_mm", "gross_vehicle_weight_kg", "maximum_payload_kg",
    "cargo_volume_l", "torque", "range_km", "maintenance_due_km",
]
vehicles_df = df[vehicle_cols].drop_duplicates(subset="vehicle_id")
print(f"Found {len(vehicles_df)} unique vehicles")

# ---- 4. Placeholder DRIVERS (dataset only has driver_id, not names/DOB) ----
# These are temporary rows so telemetry import doesn't fail on the foreign key.
# Real driver_name / DOB / password will come from your website's Sign Up form.
driver_ids = df["driver_id"].drop_duplicates().tolist()

# ---- 5. TELEMETRY RECORDS (the full 15,000 rows) ----
telemetry_cols = [
    "record_id", "vehicle_id", "driver_id", "timestamp", "vehicle_status",
    "speed_kmph", "odometer_km", "trip_distance_km", "soc_percent",
    "soh_percent", "battery_voltage", "battery_current",
    "battery_temperature_c", "ambient_temperature_c", "energy_consumed_kwh",
    "charging_status", "charging_power_kw", "charging_duration_min",
    "electricity_rate_per_kwh", "charging_cost", "latitude", "longitude",
    "maintenance_status", "trip_revenue", "alert_status",
]
telemetry_df = df[telemetry_cols]

# ---- 6. Connect and insert ----
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# Insert placeholder drivers first (so the telemetry foreign key works)
print("Inserting placeholder drivers...")
execute_values(
    cur,
    """
    INSERT INTO drivers (driver_id, driver_name, date_of_birth, car_brand, car_model, password_hash)
    VALUES %s
    ON CONFLICT (driver_id) DO NOTHING
    """,
    [(d, f"Driver {d}", "2000-01-01", None, None, "CHANGE_ME") for d in driver_ids],
)

# Insert vehicles
print("Inserting vehicles...")
execute_values(
    cur,
    f"""
    INSERT INTO vehicles ({", ".join(vehicle_cols)})
    VALUES %s
    ON CONFLICT (vehicle_id) DO NOTHING
    """,
    [tuple(row) for row in vehicles_df.itertuples(index=False)],
)

# Insert telemetry records (in batches for speed)
print("Inserting telemetry records...")
records = [tuple(row) for row in telemetry_df.itertuples(index=False)]
execute_values(
    cur,
    f"""
    INSERT INTO telemetry_records ({", ".join(telemetry_cols)})
    VALUES %s
    ON CONFLICT (record_id) DO NOTHING
    """,
    records,
    page_size=1000,
)

conn.commit()
cur.close()
conn.close()
print("Done! Data imported successfully.")
