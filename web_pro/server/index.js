import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createAdminRouter } from './routes/admin.js';
import { createDriverRouter } from './routes/driver.js';
import { runFleetAnalyticsPrecomputation } from './services/analyticsPrecomputer.js';

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const app = express();
const prisma = new PrismaClient({ adapter });

app.use(compression());
app.use(cors());
app.use(express.json());

// Existing endpoints (Updated for new schema)
app.get('/api/vehicles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const vehicles = await prisma.vehicles.findMany({
      take: limit,
      include: {
        telemetry_records: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const result = vehicles.map((vehicle) => {
      const latest = vehicle.telemetry_records?.[0] || {};
      const { telemetry_records, ...staticSpecs } = vehicle;

      return {
        ...staticSpecs,
        range_km: latest.range_km ?? null,
        soc_percent: latest.soc_percent ?? null,
        soh_percent: latest.soh_percent ?? null,
        vehicle_status: latest.vehicle_status ?? null,
        maintenance_status: latest.maintenance_status ?? null,
        maintenance_due_km: latest.maintenance_due_km ?? null,
        telemetry_records,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.get('/api/telemetry', async (req, res) => {
  try {
    const driverId = req.query.driverId;
    const limit = parseInt(req.query.limit, 10) || 20;
    const where = driverId ? { driver_id: driverId } : {};
    const records = await prisma.telemetry_records.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    res.json(records);
  } catch (error) {
    console.error('Error fetching telemetry:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry records' });
  }
});

// Admin Endpoints
app.use('/api/admin', createAdminRouter(prisma));

// Driver Endpoints
app.use('/api/driver', createDriverRouter(prisma));

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
  
  // Run initial precomputation immediately on startup
  runFleetAnalyticsPrecomputation(prisma);

  // Schedule periodic background precomputation every 2 minutes (120,000 ms)
  setInterval(() => {
    runFleetAnalyticsPrecomputation(prisma);
  }, 2 * 60 * 1000);
});