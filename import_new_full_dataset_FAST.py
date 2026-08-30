"""
Import your new EV_Dataset_2025_15000_Cars_Final_180K_Realistic.xlsx into
PostgreSQL, replacing vehicles/drivers/telemetry_records entirely.

IMPORTANT: Run schema_v2_replace_tables.sql in pgAdmin FIRST — it drops and
recreates these 3 tables to match this new dataset's structure. The admins
table is left untouched.

Before running this script:
1. pip install pandas psycopg2-binary openpyxl bcrypt
2. Put your dataset file in the same folder as this script.
"""

import pandas as pd
import psycopg2
import bcrypt
from psycopg2.extras import execute_values
from multiprocessing import Pool, cpu_count

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "volttrack_db",
    "user": "postgres",
    "password": "Dhi@123",
}

EXCEL_FILE = "EV_Dataset_2025_15000_Cars_Final_180K_Realistic.xlsx"

# Hashing 15,000 passwords one at a time with bcrypt can take 45-60+ minutes,
# since bcrypt is intentionally slow per password for security. Spreading the
# work across all CPU cores at once cuts this down to a few minutes.
def hash_password(plain_password):
    return bcrypt.hashpw(str(plain_password).encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


if __name__ == "__main__":
    df = pd.read_excel(EXCEL_FILE)
    df.columns = [c.strip() for c in df.columns]
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # ---- 1. VEHICLES ----
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
        f"INSERT INTO vehicles ({', '.join(vehicle_cols)}) VALUES %s ON CONFLICT (vehicle_id) DO NOTHING",
        [tuple(row) for row in vehicles_df.itertuples(index=False)],
        page_size=1000,
    )
    conn.commit()
    print("Vehicles done.")

    # ---- 2. DRIVERS (fast parallel password hashing) ----
    driver_cols = [
        "driver_id", "driver_name", "date_of_birth", "driver_age",
        "driver_mobile_number", "driver_email", "driver_licence_number",
        "driver_years_of_experience", "driver_behaviour", "driver_password",
    ]
    drivers_df = df[driver_cols].drop_duplicates(subset="driver_id")

    print(f">>> Hashing {len(drivers_df)} passwords using {cpu_count()} CPU cores (fast mode) <<<")
    with Pool(cpu_count()) as pool:
        hashed_passwords = pool.map(hash_password, drivers_df["driver_password"].tolist())
    print(">>> Hashing complete <<<")

    driver_rows = []
    for (_, row), hashed in zip(drivers_df.iterrows(), hashed_passwords):
        driver_rows.append((
            row["driver_id"], row["driver_name"], row["date_of_birth"], row["driver_age"],
            row["driver_mobile_number"], row["driver_email"], row["driver_licence_number"],
            row["driver_years_of_experience"], row["driver_behaviour"], hashed,
        ))

    print(f"Inserting {len(driver_rows)} drivers...")
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
    conn.commit()
    print("Drivers done.")

    # ---- 3. TELEMETRY RECORDS ----
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
    print(f"Inserting {len(telemetry_df)} telemetry records...")
    execute_values(
        cur,
        f"INSERT INTO telemetry_records ({', '.join(telemetry_cols)}) VALUES %s ON CONFLICT (record_id) DO NOTHING",
        [tuple(row) for row in telemetry_df.itertuples(index=False)],
        page_size=2000,
    )
    conn.commit()

    cur.close()
    conn.close()
    print("Done! New dataset fully imported: 15,000 vehicles, 15,000 drivers, ~180,000 telemetry records.")
