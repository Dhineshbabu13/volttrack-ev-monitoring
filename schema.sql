-- ============================================
-- VoltTrack Database Schema (PostgreSQL)
-- ============================================

-- 1. ADMINS TABLE (created when an admin account is registered)
CREATE TABLE admins (
    admin_id        VARCHAR(50) PRIMARY KEY,
    admin_name      VARCHAR(100) NOT NULL,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 2. DRIVERS TABLE (created at sign-up on your website)
CREATE TABLE drivers (
    driver_id       VARCHAR(50) PRIMARY KEY,      -- e.g. DRV-2026-55696
    driver_name     VARCHAR(100) NOT NULL,
    date_of_birth   DATE NOT NULL,
    car_brand       VARCHAR(50),
    car_model       VARCHAR(50),
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 3. VEHICLES TABLE (static specs — one row per physical vehicle)
CREATE TABLE vehicles (
    vehicle_id              VARCHAR(20) PRIMARY KEY,   -- e.g. EV001
    vehicle_model            VARCHAR(100),
    vehicle_brand             VARCHAR(50),
    battery_capacity_kwh      NUMERIC(6,2),
    weight_kg                 NUMERIC(8,2),
    motor_power_kw             NUMERIC(6,2),
    length_mm                 NUMERIC(8,2),
    width_mm                  NUMERIC(8,2),
    height_mm                 NUMERIC(8,2),
    wheel_base_mm              NUMERIC(8,2),
    gross_vehicle_weight_kg    NUMERIC(8,2),
    maximum_payload_kg         NUMERIC(8,2),
    cargo_volume_l             NUMERIC(8,2),
    torque                    NUMERIC(8,4),
    range_km                  NUMERIC(6,2),
    maintenance_due_km         NUMERIC(10,2)
);

-- 4. TELEMETRY RECORDS TABLE (the 15,000 time-series rows from your dataset)
CREATE TABLE telemetry_records (
    record_id                  BIGINT PRIMARY KEY,
    vehicle_id                 VARCHAR(20) REFERENCES vehicles(vehicle_id),
    driver_id                  VARCHAR(50) REFERENCES drivers(driver_id),
    "timestamp"                 TIMESTAMP NOT NULL,
    vehicle_status              VARCHAR(30),
    speed_kmph                 NUMERIC(6,2),
    odometer_km                NUMERIC(10,2),
    trip_distance_km            NUMERIC(8,2),
    soc_percent                NUMERIC(5,2),
    soh_percent                NUMERIC(5,2),
    battery_voltage             NUMERIC(6,2),
    battery_current             NUMERIC(6,2),
    battery_temperature_c        NUMERIC(5,2),
    ambient_temperature_c        NUMERIC(5,2),
    energy_consumed_kwh          NUMERIC(6,2),
    charging_status              VARCHAR(30),
    charging_power_kw            NUMERIC(6,2),
    charging_duration_min         NUMERIC(6,2),
    electricity_rate_per_kwh      NUMERIC(6,2),
    charging_cost               NUMERIC(8,2),
    latitude                   NUMERIC(9,6),
    longitude                  NUMERIC(9,6),
    maintenance_status           VARCHAR(30),
    trip_revenue                NUMERIC(10,2),
    alert_status                VARCHAR(30)
);

-- Helpful indexes for fast dashboard queries
CREATE INDEX idx_telemetry_vehicle ON telemetry_records(vehicle_id);
CREATE INDEX idx_telemetry_driver ON telemetry_records(driver_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_records("timestamp");
