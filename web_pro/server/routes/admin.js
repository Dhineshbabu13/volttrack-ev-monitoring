import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { requireAdminAuth } from '../middleware/auth.js';
import { runFleetAnalyticsPrecomputation } from '../services/analyticsPrecomputer.js';


/**
 * Helper function to derive location type from vehicle speed.
 * Derived heuristic: speed_kmph < 60 => "City", speed_kmph >= 60 => "Highway".
 * Note: This is a derived heuristic, not raw data in telemetry_records.
 */
function deriveLocationType(speedKmph) {
  if (speedKmph == null) return "City";
  return Number(speedKmph) < 60 ? "City" : "Highway";
}

export function createAdminRouter(prisma) {
  const router = express.Router();

  /**
   * POST /api/admin/login
   * Public login endpoint. Authenticates admin credentials and returns JWT token.
   */
  router.post('/login', async (req, res) => {
    try {
      const { admin_id, password } = req.body || {};

      if (!admin_id || !password) {
        return res.status(400).json({ error: 'admin_id and password are required' });
      }

      const admin = await prisma.admins.findUnique({
        where: { admin_id }
      });

      if (!admin) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, admin.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      const jwtSecret = process.env.JWT_SECRET || 'volttrack_admin_super_secret_jwt_key_2026_x89q2';
      const token = jwt.sign(
        { admin_id: admin.admin_id, admin_name: admin.admin_name },
        jwtSecret,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        admin_name: admin.admin_name
      });
    } catch (error) {
      console.error('Error during admin login:', error);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  /**
   * POST /api/admin/create
   * Protected endpoint: Creates a new admin. Requires logged-in admin token.
   * Auto-generates admin_id in the format ADM-9021-XXX.
   */
  router.post('/create', requireAdminAuth, async (req, res) => {
    try {
      const { admin_name, password } = req.body || {};

      if (!admin_name || !password) {
        return res.status(400).json({ error: 'admin_name and password are required' });
      }

      // Query existing admins to find the highest ADM-9021-XXX suffix
      const allAdmins = await prisma.admins.findMany({
        select: { admin_id: true }
      });

      let maxNum = 0;
      const pattern = /^ADM-9021-(\d{3})$/;
      for (const a of allAdmins) {
        if (a.admin_id) {
          const match = a.admin_id.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
              maxNum = num;
            }
          }
        }
      }

      const nextNum = maxNum + 1;
      const generatedAdminId = `ADM-9021-${String(nextNum).padStart(3, '0')}`;

      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = await prisma.admins.create({
        data: {
          admin_id: generatedAdminId,
          admin_name,
          password_hash: hashedPassword
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        admin_id: newAdmin.admin_id,
        admin_name: newAdmin.admin_name,
        admin: {
          admin_id: newAdmin.admin_id,
          admin_name: newAdmin.admin_name
        }
      });
    } catch (error) {
      console.error('Error creating admin:', error);
      return res.status(500).json({ error: 'Failed to create admin' });
    }
  });

  /**
   * GET /api/admin/kpis
   * Protected endpoint: Returns fleet KPIs based on the most recent telemetry record per vehicle.
   */
  router.get('/kpis', requireAdminAuth, async (req, res) => {
    try {
      const totalCars = await prisma.vehicles.count();

      // Get most recent telemetry record for each vehicle
      const latestRecords = await prisma.$queryRaw`
        SELECT DISTINCT ON (vehicle_id) *
        FROM telemetry_records
        ORDER BY vehicle_id, timestamp DESC;
      `;

      let workingCars = 0;
      let garageCars = 0;
      let chargingCars = 0;
      const chargingDetails = [];

      for (const record of latestRecords) {
        const vStatus = (record.vehicle_status || '').toLowerCase();
        const cStatus = (record.charging_status || '').toLowerCase();

        if (cStatus === 'charging' || vStatus === 'charging') {
          chargingCars++;
          chargingDetails.push({
            vehicle_id: record.vehicle_id,
            charging_duration_min: record.charging_duration_min ? Number(record.charging_duration_min) : 0,
            energy_consumed_kwh: record.energy_consumed_kwh ? Number(record.energy_consumed_kwh) : 0,
          });
        } else if (vStatus === 'garage' || vStatus === 'maintenance') {
          garageCars++;
        } else {
          workingCars++;
        }
      }

      // Top driver by total trip_distance_km across all records
      const topDriverRaw = await prisma.$queryRaw`
        SELECT t.driver_id, d.driver_name, SUM(t.trip_distance_km) as total_distance_km, MAX(t.timestamp) as last_trip_timestamp
        FROM telemetry_records t
        LEFT JOIN drivers d ON t.driver_id = d.driver_id
        WHERE t.driver_id IS NOT NULL
        GROUP BY t.driver_id, d.driver_name
        ORDER BY total_distance_km DESC
        LIMIT 1;
      `;

      const topDriverByDistance = topDriverRaw[0] ? {
        driver_id: topDriverRaw[0].driver_id,
        driver_name: topDriverRaw[0].driver_name || 'Unknown Driver',
        total_distance_km: Number(topDriverRaw[0].total_distance_km || 0),
        last_trip_timestamp: topDriverRaw[0].last_trip_timestamp,
      } : null;

      res.json({
        totalCars,
        workingCars,
        garageCars,
        chargingCars,
        chargingDetails,
        topDriverByDistance
      });
    } catch (error) {
      console.error('Error fetching admin KPIs:', error);
      res.status(500).json({ error: 'Failed to fetch admin KPIs' });
    }
  });

  /**
   * GET /api/admin/monthly-analysis?month=YYYY-MM
   * Protected endpoint: Returns monthly performance metrics filtered by given month.
   */
  router.get('/monthly-analysis', requireAdminAuth, async (req, res) => {
    try {
      const { month } = req.query;
      let startDate, endDate;

      if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [year, m] = month.split('-').map(Number);
        startDate = new Date(Date.UTC(year, m - 1, 1));
        endDate = new Date(Date.UTC(year, m, 1));
      } else {
        const latestRecord = await prisma.telemetry_records.findFirst({
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true }
        });
        const refDate = latestRecord ? new Date(latestRecord.timestamp) : new Date();
        const year = refDate.getUTCFullYear();
        const m = refDate.getUTCMonth() + 1;
        startDate = new Date(Date.UTC(year, m - 1, 1));
        endDate = new Date(Date.UTC(year, m, 1));
      }

      // 1. Highest Revenue Driver for the month
      const highestRevRaw = await prisma.$queryRaw`
        SELECT t.driver_id, d.driver_name, SUM(t.trip_revenue) as total_revenue
        FROM telemetry_records t
        LEFT JOIN drivers d ON t.driver_id = d.driver_id
        WHERE t.timestamp >= ${startDate} AND t.timestamp < ${endDate} AND t.driver_id IS NOT NULL
        GROUP BY t.driver_id, d.driver_name
        ORDER BY total_revenue DESC
        LIMIT 1;
      `;

      const highestRevenueDriver = highestRevRaw[0] ? {
        driver_id: highestRevRaw[0].driver_id,
        driver_name: highestRevRaw[0].driver_name || 'Unknown Driver',
        total_revenue: Number(highestRevRaw[0].total_revenue || 0)
      } : null;

      // 2. Top Maintenance Manufacturer for the month
      // Note: There is no maintenance cost column in telemetry_records; maintenance cost is unavailable.
      const topMaintRaw = await prisma.$queryRaw`
        SELECT v.vehicle_brand, COUNT(*)::int as maintenance_count
        FROM telemetry_records t
        JOIN vehicles v ON t.vehicle_id = v.vehicle_id
        WHERE t.timestamp >= ${startDate} AND t.timestamp < ${endDate}
          AND t.maintenance_status IS NOT NULL
          AND LOWER(t.maintenance_status) NOT IN ('ok', 'normal')
        GROUP BY v.vehicle_brand
        ORDER BY maintenance_count DESC
        LIMIT 1;
      `;

      const topMaintenanceManufacturer = topMaintRaw[0] ? {
        vehicle_brand: topMaintRaw[0].vehicle_brand,
        maintenance_count: Number(topMaintRaw[0].maintenance_count || 0)
      } : null;

      // 3. Highest Electricity Consumption vehicle for the month
      const highestElecRaw = await prisma.$queryRaw`
        SELECT t.vehicle_id, SUM(t.energy_consumed_kwh) as total_energy, SUM(t.charging_cost) as total_charging_cost
        FROM telemetry_records t
        WHERE t.timestamp >= ${startDate} AND t.timestamp < ${endDate} AND t.vehicle_id IS NOT NULL
        GROUP BY t.vehicle_id
        ORDER BY total_energy DESC
        LIMIT 1;
      `;

      let highestElectricityConsumption = null;
      if (highestElecRaw[0]) {
        const topVehicleId = highestElecRaw[0].vehicle_id;
        const latestLoc = await prisma.telemetry_records.findFirst({
          where: { vehicle_id: topVehicleId, timestamp: { gte: startDate, lt: endDate } },
          orderBy: { timestamp: 'desc' },
          select: { latitude: true, longitude: true }
        });

        highestElectricityConsumption = {
          vehicle_id: topVehicleId,
          latitude: latestLoc?.latitude ? Number(latestLoc.latitude) : null,
          longitude: latestLoc?.longitude ? Number(latestLoc.longitude) : null,
          energy_consumed_kwh: Number(highestElecRaw[0].total_energy || 0),
          charging_cost: Number(highestElecRaw[0].total_charging_cost || 0)
        };
      }

      res.json({
        highestRevenueDriver,
        topMaintenanceManufacturer,
        highestElectricityConsumption
      });
    } catch (error) {
      console.error('Error fetching monthly analysis:', error);
      res.status(500).json({ error: 'Failed to fetch monthly analysis' });
    }
  });

  /**
   * GET /api/admin/vehicles/options
   * Returns distinct filter choices (brands, models, manufacturing years, route types, maintenance statuses, charging statuses).
   */
  router.get('/vehicles/options', requireAdminAuth, async (req, res) => {
    try {
      const { brand } = req.query;

      const brandRows = await prisma.$queryRaw`
        SELECT DISTINCT vehicle_brand FROM vehicles 
        WHERE vehicle_brand IS NOT NULL AND vehicle_brand != '' 
        ORDER BY vehicle_brand;
      `;

      let modelRows;
      if (brand && brand !== 'All') {
        modelRows = await prisma.$queryRaw`
          SELECT DISTINCT vehicle_model FROM vehicles 
          WHERE vehicle_brand = ${brand} AND vehicle_model IS NOT NULL AND vehicle_model != '' 
          ORDER BY vehicle_model;
        `;
      } else {
        modelRows = await prisma.$queryRaw`
          SELECT DISTINCT vehicle_model FROM vehicles 
          WHERE vehicle_model IS NOT NULL AND vehicle_model != '' 
          ORDER BY vehicle_model;
        `;
      }

      const yearRows = await prisma.$queryRaw`
        SELECT DISTINCT manufacturing_year FROM vehicles 
        WHERE manufacturing_year IS NOT NULL 
        ORDER BY manufacturing_year DESC;
      `;

      const routeRows = await prisma.$queryRaw`
        SELECT DISTINCT route_type FROM telemetry_records 
        WHERE route_type IS NOT NULL AND route_type != '' 
        ORDER BY route_type;
      `;

      const maintRows = await prisma.$queryRaw`
        SELECT DISTINCT maintenance_status FROM telemetry_records 
        WHERE maintenance_status IS NOT NULL AND maintenance_status != '' 
        ORDER BY maintenance_status;
      `;

      const chargingRows = await prisma.$queryRaw`
        SELECT DISTINCT charging_status FROM telemetry_records 
        WHERE charging_status IS NOT NULL AND charging_status != '' 
        ORDER BY charging_status;
      `;

      res.json({
        brands: brandRows.map(r => r.vehicle_brand),
        models: modelRows.map(r => r.vehicle_model),
        years: yearRows.map(r => Number(r.manufacturing_year)),
        routeTypes: routeRows.map(r => r.route_type),
        maintenanceStatuses: maintRows.map(r => r.maintenance_status),
        chargingStatuses: chargingRows.map(r => r.charging_status)
      });
    } catch (error) {
      console.error('Error fetching vehicle options:', error);
      res.status(500).json({ error: 'Failed to fetch vehicle filter options' });
    }
  });

  /**
   * GET /api/admin/vehicles
   * Server-side paginated & multi-filtered vehicle roster with latest telemetry record and driver.
   * Query params: ?search=&status=&brand=&model=&year=&route_type=&maint_status=&charging_status=&page=&limit=
   */
  router.get('/vehicles', requireAdminAuth, async (req, res) => {
    try {
      const {
        search = '',
        status = 'All',
        brand = 'All',
        model = 'All',
        year = 'All',
        route_type = 'All',
        maint_status = 'All',
        charging_status = 'All',
        page = 1,
        limit = 10
      } = req.query;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offset = (pageNum - 1) * limitNum;

      const searchPattern = search.trim() ? `%${search.trim().toLowerCase()}%` : null;
      const statusFilter = status !== 'All' ? status : null;
      const brandFilter = brand !== 'All' ? brand : null;
      const modelFilter = model !== 'All' ? model : null;
      const yearFilter = (year !== 'All' && !isNaN(Number(year))) ? Number(year) : null;
      const routeFilter = route_type !== 'All' ? route_type : null;
      const maintFilter = maint_status !== 'All' ? maint_status : null;
      const chargingFilter = charging_status !== 'All' ? charging_status : null;

      const queryResult = await prisma.$queryRaw`
        WITH latest_telemetry AS (
          SELECT DISTINCT ON (vehicle_id)
            vehicle_id, driver_id, soc_percent, latitude, longitude, speed_kmph,
            route_type, vehicle_status, charging_status, maintenance_status
          FROM telemetry_records
          ORDER BY vehicle_id, timestamp DESC
        ),
        joined_roster AS (
          SELECT 
            v.vehicle_id,
            COALESCE(v.vehicle_brand, '') as vehicle_brand,
            COALESCE(v.vehicle_model, '') as vehicle_model,
            v.manufacturing_year,
            COALESCE(lt.soc_percent, 0) as battery_percent,
            lt.latitude,
            lt.longitude,
            lt.speed_kmph,
            COALESCE(lt.route_type, 'City') as route_type,
            lt.vehicle_status as raw_vstatus,
            COALESCE(lt.charging_status, 'Not Charging') as raw_cstatus,
            COALESCE(lt.maintenance_status, 'OK') as maintenance_status,
            COALESCE(d.driver_name, 'Unassigned') as driver_name,
            CASE 
              WHEN LOWER(COALESCE(lt.charging_status, '')) = 'charging' OR LOWER(COALESCE(lt.vehicle_status, '')) = 'charging' THEN 'Charging'
              WHEN LOWER(COALESCE(lt.vehicle_status, '')) = 'garage' OR LOWER(COALESCE(lt.vehicle_status, '')) = 'maintenance' THEN 'Garage'
              ELSE 'Working'
            END as vehicle_status
          FROM vehicles v
          LEFT JOIN latest_telemetry lt ON v.vehicle_id = lt.vehicle_id
          LEFT JOIN drivers d ON lt.driver_id = d.driver_id
        )
        SELECT 
          vehicle_id,
          vehicle_brand,
          vehicle_model,
          manufacturing_year,
          battery_percent,
          latitude,
          longitude,
          speed_kmph,
          route_type,
          vehicle_status,
          driver_name,
          raw_cstatus as charging_status,
          maintenance_status,
          COUNT(*) OVER() as full_count
        FROM joined_roster
        WHERE 1=1
          AND (${searchPattern}::text IS NULL OR (
            LOWER(vehicle_id) LIKE ${searchPattern} OR
            LOWER(vehicle_brand) LIKE ${searchPattern} OR
            LOWER(vehicle_model) LIKE ${searchPattern} OR
            LOWER(driver_name) LIKE ${searchPattern}
          ))
          AND (${statusFilter}::text IS NULL OR vehicle_status = ${statusFilter})
          AND (${brandFilter}::text IS NULL OR vehicle_brand = ${brandFilter})
          AND (${modelFilter}::text IS NULL OR vehicle_model = ${modelFilter})
          AND (${yearFilter}::integer IS NULL OR manufacturing_year = ${yearFilter})
          AND (${routeFilter}::text IS NULL OR LOWER(route_type) = LOWER(${routeFilter}))
          AND (${maintFilter}::text IS NULL OR LOWER(maintenance_status) = LOWER(${maintFilter}))
          AND (${chargingFilter}::text IS NULL OR LOWER(raw_cstatus) = LOWER(${chargingFilter}))
        ORDER BY vehicle_id
        LIMIT ${limitNum} OFFSET ${offset};
      `;

      const totalCount = queryResult.length > 0 ? Number(queryResult[0].full_count) : 0;
      const totalPages = Math.ceil(totalCount / limitNum) || 1;

      const vehiclesList = queryResult.map(r => ({
        vehicle_id: r.vehicle_id,
        vehicle_brand: r.vehicle_brand,
        vehicle_model: r.vehicle_model,
        manufacturing_year: r.manufacturing_year ? Number(r.manufacturing_year) : null,
        battery_percent: Number(r.battery_percent || 0),
        latitude: r.latitude ? Number(r.latitude) : null,
        longitude: r.longitude ? Number(r.longitude) : null,
        location_type: deriveLocationType(r.speed_kmph),
        route_type: r.route_type,
        vehicle_status: r.vehicle_status,
        driver_name: r.driver_name,
        charging_status: r.charging_status || 'Not Charging',
        maintenance_status: r.maintenance_status || 'OK'
      }));

      return res.json({
        vehicles: vehiclesList,
        totalCount,
        totalPages,
        currentPage: pageNum
      });
    } catch (error) {
      console.error('Error fetching admin vehicles:', error);
      res.status(500).json({ error: 'Failed to fetch admin vehicles' });
    }
  });

  /**
   * GET /api/admin/alerts
   * Protected endpoint: Returns active alerts from the most recent telemetry record per vehicle.
   */
  router.get('/alerts', requireAdminAuth, async (req, res) => {
    try {
      const alertsRaw = await prisma.$queryRaw`
        WITH latest_telemetry AS (
          SELECT DISTINCT ON (vehicle_id) *
          FROM telemetry_records
          ORDER BY vehicle_id, timestamp DESC
        )
        SELECT 
          lt.vehicle_id,
          lt.driver_id,
          COALESCE(d.driver_name, 'Driver') as driver_name,
          COALESCE(lt.alert_status, 'Alert Triggered') as alert_status,
          COALESCE(lt.maintenance_status, 'Normal') as maintenance_status,
          COALESCE(lt.route_type, 'City') as location,
          lt.timestamp
        FROM latest_telemetry lt
        LEFT JOIN drivers d ON lt.driver_id = d.driver_id
        WHERE LOWER(TRIM(COALESCE(lt.alert_status, ''))) NOT IN ('normal', 'ok', '')
           OR LOWER(TRIM(COALESCE(lt.maintenance_status, ''))) NOT IN ('normal', 'ok', 'good', '');
      `;

      const alertItems = alertsRaw.map(row => ({
        vehicle_id: row.vehicle_id,
        driver_id: row.driver_id || 'N/A',
        driver_name: row.driver_name || 'Driver',
        alert_status: row.alert_status || 'Alert',
        maintenance_status: row.maintenance_status || 'Normal',
        location: row.location || 'Unknown',
        timestamp: row.timestamp
      }));

      res.json({
        totalAlerts: alertItems.length,
        urgentAlerts: alertItems.slice(0, 10)
      });
    } catch (error) {
      console.error('Error fetching admin alerts:', error);
      res.status(500).json({ error: 'Failed to fetch admin alerts' });
    }
  });

  /**
   * GET /api/admin/fleet-analytics
   * Protected endpoint: Multi-month trends (Revenue, Maintenance Cost, Electricity Consumption),
   * Driver Eco-Score Leaderboard, and aggregate fleet CO2 Saved.
   * Serves precomputed results from fleet_analytics_summary table instantly (<30ms).
   */
  router.get('/fleet-analytics', requireAdminAuth, async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      if (forceRefresh) {
        await runFleetAnalyticsPrecomputation(prisma);
      }

      const summaryRows = await prisma.$queryRaw`
        SELECT data, last_updated FROM fleet_analytics_summary WHERE key = 'fleet_analytics';
      `;

      if (summaryRows.length > 0 && summaryRows[0].data) {
        const payload = typeof summaryRows[0].data === 'string' ? JSON.parse(summaryRows[0].data) : summaryRows[0].data;
        payload.last_updated = summaryRows[0].last_updated || payload.last_updated;
        return res.json(payload);
      }

      // Fallback: run precomputation on demand if summary table row is missing
      await runFleetAnalyticsPrecomputation(prisma);
      const updatedRows = await prisma.$queryRaw`
        SELECT data, last_updated FROM fleet_analytics_summary WHERE key = 'fleet_analytics';
      `;

      if (updatedRows.length > 0 && updatedRows[0].data) {
        const payload = typeof updatedRows[0].data === 'string' ? JSON.parse(updatedRows[0].data) : updatedRows[0].data;
        payload.last_updated = updatedRows[0].last_updated || payload.last_updated;
        return res.json(payload);
      }

      res.status(500).json({ error: 'Summary data unavailable' });
    } catch (error) {
      console.error('Error fetching fleet analytics:', error);
      res.status(500).json({ error: 'Failed to fetch fleet analytics' });
    }
  });


  /**
   * GET /api/admin/drivers
   * Protected endpoint: Server-side paginated list of drivers with aggregated metrics.
   * Query params: page, limit, search, sortBy, sortOrder, experienceRange, assignedBrand
   */
  router.get('/drivers', requireAdminAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 25;
      const search = (req.query.search || '').trim().toLowerCase();
      const sortBy = req.query.sortBy || 'driver_name';
      const sortOrder = (req.query.sortOrder || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
      const { experienceRange = 'All', assignedBrand = 'All' } = req.query;

      const allDriversRaw = await prisma.$queryRaw`
        WITH driver_telemetry AS (
          SELECT 
            driver_id,
            COUNT(*) as total_trips,
            COUNT(*) FILTER (WHERE LOWER(TRIM(driving_mode)) = 'eco') as eco_trips,
            COUNT(*) FILTER (WHERE LOWER(TRIM(driving_mode)) IN ('sport', 'sports')) as sport_trips,
            COALESCE(SUM(trip_distance_km), 0)::float as total_distance_km,
            COALESCE(SUM(trip_revenue), 0)::float as total_revenue,
            MAX(vehicle_id) as telem_vehicle_id
          FROM telemetry_records
          WHERE driver_id IS NOT NULL
          GROUP BY driver_id
        )
        SELECT 
          d.driver_id,
          COALESCE(d.driver_name, d.driver_id) as driver_name,
          d.driver_licence_number,
          d.driver_years_of_experience,
          COALESCE(dt.telem_vehicle_id, v_direct.vehicle_id) as assigned_vehicle_id,
          COALESCE(v_telem.vehicle_brand, v_direct.vehicle_brand, 'Unassigned') as vehicle_brand,
          COALESCE(v_telem.vehicle_model, v_direct.vehicle_model, '') as vehicle_model,
          COALESCE(dt.total_trips, 0)::int as total_trips,
          COALESCE(dt.eco_trips, 0)::int as eco_trips,
          COALESCE(dt.sport_trips, 0)::int as sport_trips,
          COALESCE(dt.total_distance_km, 0)::float as total_distance_km,
          COALESCE(dt.total_revenue, 0)::float as total_revenue
        FROM drivers d
        LEFT JOIN driver_telemetry dt ON d.driver_id = dt.driver_id
        LEFT JOIN vehicles v_telem ON dt.telem_vehicle_id = v_telem.vehicle_id
        LEFT JOIN vehicles v_direct ON REPLACE(d.driver_id, 'DRV-', 'VEH-') = v_direct.vehicle_id;
      `;

      let driversList = allDriversRaw.map(d => {
        const totalTrips = Number(d.total_trips || 1);
        const ecoTrips = Number(d.eco_trips || 0);
        const sportTrips = Number(d.sport_trips || 0);
        const ecoPercent = (ecoTrips / totalTrips) * 100;
        const sportPercent = (sportTrips / totalTrips) * 100;
        let ecoScore = Math.round(50 + (ecoPercent * 0.5) - (sportPercent * 0.5));
        ecoScore = Math.max(0, Math.min(100, ecoScore));

        const vehicleBrand = d.vehicle_brand || 'Unassigned';
        const vehicleModel = d.vehicle_model ? ` ${d.vehicle_model}` : '';
        const assignedVehicleStr = d.assigned_vehicle_id ? `${vehicleBrand}${vehicleModel} (${d.assigned_vehicle_id})` : 'Unassigned';

        return {
          driver_id: d.driver_id,
          driver_name: d.driver_name || 'Driver',
          driver_licence_number: d.driver_licence_number || 'Unspecified',
          driver_years_of_experience: d.driver_years_of_experience != null ? Number(d.driver_years_of_experience) : null,
          assigned_vehicle: assignedVehicleStr,
          vehicle_brand: vehicleBrand,
          total_distance_km: Math.round(Number(d.total_distance_km || 0)),
          total_revenue: Math.round(Number(d.total_revenue || 0)),
          eco_score: ecoScore
        };
      });

      // Filter by search query
      if (search) {
        driversList = driversList.filter(d =>
          d.driver_name.toLowerCase().includes(search) ||
          d.driver_id.toLowerCase().includes(search) ||
          (d.driver_licence_number && d.driver_licence_number.toLowerCase().includes(search)) ||
          d.assigned_vehicle.toLowerCase().includes(search)
        );
      }

      // Filter by Experience Range
      if (experienceRange && experienceRange !== 'All') {
        driversList = driversList.filter(d => {
          const exp = d.driver_years_of_experience;
          if (experienceRange === 'unspecified') return exp === null || exp === undefined;
          if (exp === null || exp === undefined) return false;
          if (experienceRange === '0-2') return exp >= 0 && exp <= 2;
          if (experienceRange === '3-5') return exp >= 3 && exp <= 5;
          if (experienceRange === '6-10') return exp >= 6 && exp <= 10;
          if (experienceRange === '10+') return exp >= 10;
          return true;
        });
      }

      // Filter by Assigned Vehicle Brand
      if (assignedBrand && assignedBrand !== 'All') {
        driversList = driversList.filter(d =>
          d.vehicle_brand.toLowerCase().includes(assignedBrand.toLowerCase()) ||
          d.assigned_vehicle.toLowerCase().includes(assignedBrand.toLowerCase())
        );
      }

      // Sort with NULL safety
      driversList.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toString().toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });


      // Paginate
      const totalCount = driversList.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedDrivers = driversList.slice(startIndex, startIndex + limit);

      res.json({
        drivers: paginatedDrivers,
        totalCount,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      console.error('Error fetching admin drivers:', error);
      res.status(500).json({ error: 'Failed to fetch driver roster' });
    }
  });

  /**
   * GET /api/admin/list
   * Protected endpoint: List all existing admins for the Admin Management tab with date range filter.
   */
  router.get('/list', requireAdminAuth, async (req, res) => {
    try {
      const { dateRange = 'all' } = req.query;
      let dateCondition = {};

      if (dateRange === 'last7') {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dateCondition = { created_at: { gte: cutoff } };
      } else if (dateRange === 'last30') {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        dateCondition = { created_at: { gte: cutoff } };
      }

      const admins = await prisma.admins.findMany({
        where: dateCondition,
        select: {
          admin_id: true,
          admin_name: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' }
      });
      res.json(admins);
    } catch (error) {
      console.error('Error fetching admin list:', error);
      res.status(500).json({ error: 'Failed to fetch admin list' });
    }
  });


  /**
   * DELETE /api/admin/:admin_id
   * Protected endpoint: Deletes an admin account from the admins table.
   * Safety rule: Rejects deleting the currently logged-in admin.
   */
  router.delete('/:admin_id', requireAdminAuth, async (req, res) => {
    try {
      const targetAdminId = req.params.admin_id;
      const currentAdminId = req.admin?.admin_id;

      if (!targetAdminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }

      if (targetAdminId === currentAdminId) {
        return res.status(403).json({ error: 'Safety Rule Rejection: You cannot delete your own currently logged-in admin account.' });
      }

      const existingAdmin = await prisma.admins.findUnique({
        where: { admin_id: targetAdminId }
      });

      if (!existingAdmin) {
        return res.status(404).json({ error: 'Admin account not found' });
      }

      await prisma.admins.delete({
        where: { admin_id: targetAdminId }
      });

      return res.json({
        success: true,
        message: `Admin account ${existingAdmin.admin_name} (${targetAdminId}) was successfully removed.`
      });
    } catch (error) {
      console.error('Error removing admin:', error);
      return res.status(500).json({ error: 'Failed to remove admin account' });
    }
  });


  /**
   * GET /api/admin/alerts
   * Protected endpoint: Active alerts overview.
   */
  router.get('/alerts', requireAdminAuth, async (req, res) => {
    try {
      const alertsRaw = await prisma.$queryRaw`
        WITH latest_telemetry AS (
          SELECT DISTINCT ON (vehicle_id) *
          FROM telemetry_records
          ORDER BY vehicle_id, timestamp DESC
        )
        SELECT 
          lt.vehicle_id,
          lt.driver_id,
          d.driver_name,
          lt.alert_status,
          lt.maintenance_status,
          lt.location,
          lt.timestamp
        FROM latest_telemetry lt
        LEFT JOIN drivers d ON lt.driver_id = d.driver_id
        WHERE LOWER(TRIM(lt.alert_status)) NOT IN ('normal', 'ok', '')
           OR LOWER(TRIM(lt.maintenance_status)) NOT IN ('normal', 'ok', 'good', '');
      `;

      const alertItems = alertsRaw.map(row => ({
        vehicle_id: row.vehicle_id,
        driver_id: row.driver_id || 'N/A',
        driver_name: row.driver_name || 'Driver',
        alert_status: row.alert_status || 'Alert',
        maintenance_status: row.maintenance_status || 'Normal',
        location: row.location || 'Unknown',
        timestamp: row.timestamp
      }));

      res.json({
        totalAlerts: alertItems.length,
        urgentAlerts: alertItems.slice(0, 10)
      });
    } catch (error) {
      console.error('Error fetching admin alerts:', error);
      res.status(500).json({ error: 'Failed to fetch admin alerts' });
    }
  });

  /**
   * GET /api/admin/analytics/enhanced
   * Protected endpoint: Detailed analytics for Status Breakdown, Violations, Driver Revenue, and Expenses.
   * Serves precomputed results from fleet_analytics_summary table instantly (<30ms).
   */
  router.get('/analytics/enhanced', requireAdminAuth, async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      if (forceRefresh) {
        await runFleetAnalyticsPrecomputation(prisma);
      }

      const summaryRows = await prisma.$queryRaw`
        SELECT data, last_updated FROM fleet_analytics_summary WHERE key = 'enhanced_analytics';
      `;

      if (summaryRows.length > 0 && summaryRows[0].data) {
        const payload = typeof summaryRows[0].data === 'string' ? JSON.parse(summaryRows[0].data) : summaryRows[0].data;
        payload.last_updated = summaryRows[0].last_updated || payload.last_updated;
        return res.json(payload);
      }

      // Fallback precomputation if summary row is missing
      await runFleetAnalyticsPrecomputation(prisma);
      const updatedRows = await prisma.$queryRaw`
        SELECT data, last_updated FROM fleet_analytics_summary WHERE key = 'enhanced_analytics';
      `;

      if (updatedRows.length > 0 && updatedRows[0].data) {
        const payload = typeof updatedRows[0].data === 'string' ? JSON.parse(updatedRows[0].data) : updatedRows[0].data;
        payload.last_updated = updatedRows[0].last_updated || payload.last_updated;
        return res.json(payload);
      }

      res.status(500).json({ error: 'Enhanced summary data unavailable' });
    } catch (error) {
      console.error('Error fetching enhanced analytics:', error);
      res.status(500).json({ error: 'Failed to fetch enhanced analytics' });
    }
  });


  return router;
}

