-- Run this in pgAdmin's Query Tool on volttrack_db.
-- This ONLY touches vehicles, drivers, and telemetry_records.
-- The admins table is left completely untouched.

-- 1. Drop the old tables (order matters: telemetry_records references the others)
DROP TABLE IF EXISTS telemetry_records;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS drivers;

-- 2. Recreate VEHICLES — static specs, one row per vehicle_id
CREATE TABLE vehicles (
    vehicle_id              VARCHAR(30) PRIMARY KEY,
    car_reg_no              VARCHAR(30),
    vehicle_brand           VARCHAR(50),
    vehicle_model           VARCHAR(100),
    vehicle_type            VARCHAR(50),
    manufacturing_year      INT,
    battery_capacity_kwh    NUMERIC(6,2),
    weight_kg               NUMERIC(8,2),
    motor_power_kw          NUMERIC(6,2),
    length_mm               NUMERIC(8,2),
    width_mm                NUMERIC(8,2),
    height_mm               NUMERIC(8,2),
    wheel_base_mm           NUMERIC(8,2),
    gross_vehicle_weight_kg NUMERIC(8,2),
    maximum_payload_kg      NUMERIC(8,2),
    cargo_volume_l          NUMERIC(8,2),
    torque                  NUMERIC(8,2),
    max_passenger_capacity  INT
);

-- 3. Recreate DRIVERS — identity + credentials, one row per driver_id
CREATE TABLE drivers (
    driver_id                  VARCHAR(30) PRIMARY KEY,
    driver_name                VARCHAR(100),
    date_of_birth               DATE,
    driver_age                  INT,
    driver_mobile_number         VARCHAR(20),
    driver_email                VARCHAR(150),
    driver_licence_number        VARCHAR(50),
    driver_years_of_experience    INT,
    driver_behaviour             VARCHAR(30),
    password_hash               TEXT NOT NULL,
    created_at                  TIMESTAMP DEFAULT NOW()
);

-- 4. Recreate TELEMETRY_RECORDS — one row per monthly reading (180,000 total)
CREATE TABLE telemetry_records (
    record_id                BIGINT PRIMARY KEY,
    vehicle_id               VARCHAR(30) REFERENCES vehicles(vehicle_id),
    driver_id                VARCHAR(30) REFERENCES drivers(driver_id),
    "timestamp"                TIMESTAMP NOT NULL,
    location                 VARCHAR(100),
    destination_location       VARCHAR(100),
    route_type                VARCHAR(30),
    vehicle_status             VARCHAR(30),
    speed_kmph                NUMERIC(6,2),
    driving_mode              VARCHAR(30),
    odometer_km               NUMERIC(10,2),
    trip_distance_km           NUMERIC(8,2),
    passenger_count            INT,
    soc_percent               NUMERIC(5,2),
    soh_percent               NUMERIC(5,2),
    battery_voltage            NUMERIC(6,2),
    battery_current            NUMERIC(6,2),
    battery_temperature_c       NUMERIC(5,2),
    ambient_temperature_c       NUMERIC(5,2),
    energy_consumed_kwh         NUMERIC(6,2),
    range_km                  NUMERIC(6,2),
    charging_status             VARCHAR(30),
    charging_power_kw           NUMERIC(6,2),
    charging_duration_min        NUMERIC(6,2),
    electricity_rate_per_kwh     NUMERIC(6,2),
    charging_cost              NUMERIC(8,2),
    latitude                  NUMERIC(9,6),
    longitude                 NUMERIC(9,6),
    can_reach_destination       VARCHAR(10),
    maintenance_status          VARCHAR(30),
    maintenance_due_km          NUMERIC(10,2),
    last_service_date           DATE,
    next_service_date           DATE,
    maintenance_cost_inr         NUMERIC(10,2),
    alert_status               VARCHAR(30),
    trip_revenue               NUMERIC(10,2),
    net_revenue_inr             NUMERIC(10,2)
);

-- 5. Indexes for fast dashboard queries
CREATE INDEX idx_telemetry_vehicle ON telemetry_records(vehicle_id);
CREATE INDEX idx_telemetry_driver ON telemetry_records(driver_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_records("timestamp");

-- 6. Confirm the reset worked
SELECT COUNT(*) AS vehicles_count FROM vehicles;
SELECT COUNT(*) AS drivers_count FROM drivers;
SELECT COUNT(*) AS telemetry_count FROM telemetry_records;
SELECT COUNT(*) AS admins_count FROM admins;  -- should be unchanged (your 5 real admins)
