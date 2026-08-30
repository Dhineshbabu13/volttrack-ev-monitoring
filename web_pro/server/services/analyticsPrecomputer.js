/**
 * Background Precomputation Service for Heavy Fleet Analytics Aggregations.
 * Periodically calculates 180k-row telemetry aggregations in the background
 * and persists the results in the `fleet_analytics_summary` table.
 */

export async function ensureSummaryTable(prisma) {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS fleet_analytics_summary (
        key VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        last_updated TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('[Precomputer] Error ensuring summary table:', err.message);
  }
}

export async function runFleetAnalyticsPrecomputation(prisma) {
  const startTime = Date.now();
  console.log('[Precomputer] Starting background fleet analytics precomputation...');

  try {
    await ensureSummaryTable(prisma);

    // -------------------------------------------------------------
    // 1. PRECOMPUTE ENHANCED ANALYTICS
    // -------------------------------------------------------------

    // 1a. Vehicle Status Breakdown
    const statusRaw = await prisma.$queryRaw`
      WITH latest_t AS (
        SELECT DISTINCT ON (vehicle_id) vehicle_id, vehicle_status, charging_status
        FROM telemetry_records
        ORDER BY vehicle_id, timestamp DESC
      )
      SELECT 
        CASE 
          WHEN LOWER(COALESCE(charging_status, '')) = 'charging' OR LOWER(COALESCE(vehicle_status, '')) = 'charging' THEN 'Charging'
          WHEN LOWER(COALESCE(vehicle_status, '')) IN ('garage', 'maintenance') THEN 'Garage'
          WHEN LOWER(COALESCE(vehicle_status, '')) = 'parked' THEN 'Parked'
          ELSE 'Working'
        END as status_group,
        COUNT(*)::int as count
      FROM latest_t
      GROUP BY status_group;
    `;

    const statusMap = { 'Working': 0, 'Garage': 0, 'Charging': 0, 'Parked': 0 };
    let totalVehiclesForStatus = 0;
    for (const row of statusRaw) {
      statusMap[row.status_group] = (statusMap[row.status_group] || 0) + Number(row.count);
      totalVehiclesForStatus += Number(row.count);
    }
    if (totalVehiclesForStatus === 0) totalVehiclesForStatus = 1;

    const statusColorMap = {
      'Working': '#10B981', // Green
      'Garage': '#F59E0B',  // Amber
      'Charging': '#3B82F6',// Blue
      'Parked': '#6B7280',  // Gray
    };

    const statusBreakdown = Object.entries(statusMap).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalVehiclesForStatus) * 100),
      color: statusColorMap[name] || '#9CA3AF'
    }));

    // 1b. Driver Violations Leaderboard
    const violationsRaw = await prisma.$queryRaw`
      SELECT 
        t.driver_id,
        COALESCE(d.driver_name, t.driver_id) as driver_name,
        MAX(t.vehicle_id) as assigned_vehicle,
        COUNT(*)::int as total_violations,
        CASE 
          WHEN COUNT(*) FILTER (WHERE LOWER(TRIM(t.driving_mode)) IN ('sport', 'sports')) >= COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(t.alert_status, ''))) NOT IN ('normal', 'ok', ''))
          THEN 'Sport Driving Mode'
          ELSE 'Alert Triggered'
        END as most_common_violation
      FROM telemetry_records t
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      WHERE t.driver_id IS NOT NULL
        AND (
          LOWER(TRIM(t.driving_mode)) IN ('sport', 'sports') OR
          LOWER(TRIM(COALESCE(t.alert_status, ''))) NOT IN ('normal', 'ok', '')
        )
      GROUP BY t.driver_id, d.driver_name
      ORDER BY total_violations DESC;
    `;

    const violationsLeaderboard = violationsRaw.map(v => ({
      driver_id: v.driver_id,
      driver_name: v.driver_name || v.driver_id,
      assigned_vehicle: v.assigned_vehicle || 'Unassigned',
      total_violations: Number(v.total_violations || 0),
      most_common_violation: v.most_common_violation || 'Aggressive Driving'
    }));

    // 1c. Driver Revenue Leaderboard
    const driverRevenueRaw = await prisma.$queryRaw`
      SELECT 
        t.driver_id,
        COALESCE(d.driver_name, t.driver_id) as driver_name,
        COALESCE(SUM(t.trip_revenue), 0)::float as total_revenue,
        COUNT(*)::int as total_trips,
        COALESCE(SUM(t.trip_distance_km), 0)::float as total_distance_km
      FROM telemetry_records t
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      WHERE t.driver_id IS NOT NULL
      GROUP BY t.driver_id, d.driver_name
      ORDER BY total_revenue DESC;
    `;

    const fullDriverRevenue = driverRevenueRaw.map(r => ({
      driver_id: r.driver_id,
      driver_name: r.driver_name || r.driver_id,
      total_revenue: Math.round(Number(r.total_revenue || 0)),
      total_trips: Number(r.total_trips || 0),
      total_distance_km: Math.round(Number(r.total_distance_km || 0))
    }));

    // 1d. Expenses: Vehicle-wise & Brand-wise
    const vehicleExpensesRaw = await prisma.$queryRaw`
      SELECT 
        v.vehicle_id,
        CASE 
          WHEN LOWER(TRIM(v.vehicle_brand)) IN ('tata', 'tata ev') THEN 'Tata'
          ELSE TRIM(v.vehicle_brand) 
        END as vehicle_brand,
        v.vehicle_model,
        COALESCE(SUM(t.charging_cost), 0)::float as total_charging_cost,
        COALESCE(SUM(t.maintenance_cost_inr), 0)::float as total_maintenance_cost
      FROM vehicles v
      LEFT JOIN telemetry_records t ON v.vehicle_id = t.vehicle_id
      GROUP BY v.vehicle_id, vehicle_brand, v.vehicle_model
      ORDER BY (COALESCE(SUM(t.charging_cost), 0) + COALESCE(SUM(t.maintenance_cost_inr), 0)) DESC;
    `;

    const vehicleExpenses = vehicleExpensesRaw.map(v => ({
      vehicle_id: v.vehicle_id,
      vehicle_brand: v.vehicle_brand || 'EV',
      vehicle_model: v.vehicle_model || '',
      charging_cost: Math.round(Number(v.total_charging_cost || 0)),
      maintenance_cost: Math.round(Number(v.total_maintenance_cost || 0)),
      total_expense: Math.round(Number(v.total_charging_cost || 0) + Number(v.total_maintenance_cost || 0))
    }));

    const brandExpensesRaw = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN LOWER(TRIM(v.vehicle_brand)) IN ('tata', 'tata ev') THEN 'Tata'
          ELSE TRIM(v.vehicle_brand) 
        END as brand,
        COALESCE(SUM(t.charging_cost), 0)::float as total_charging_cost,
        COALESCE(SUM(t.maintenance_cost_inr), 0)::float as total_maintenance_cost
      FROM vehicles v
      LEFT JOIN telemetry_records t ON v.vehicle_id = t.vehicle_id
      WHERE v.vehicle_brand IS NOT NULL AND v.vehicle_brand != ''
      GROUP BY brand
      ORDER BY (COALESCE(SUM(t.charging_cost), 0) + COALESCE(SUM(t.maintenance_cost_inr), 0)) DESC;
    `;

    const brandExpenses = brandExpensesRaw.map(b => ({
      brand: b.brand,
      charging_cost: Math.round(Number(b.total_charging_cost || 0)),
      maintenance_cost: Math.round(Number(b.total_maintenance_cost || 0)),
      total_expense: Math.round(Number(b.total_charging_cost || 0) + Number(b.total_maintenance_cost || 0))
    }));

    const enhancedPayload = {
      statusBreakdown,
      violationsLeaderboard,
      fullDriverRevenue,
      vehicleExpenses,
      brandExpenses,
      last_updated: new Date().toISOString()
    };

    // -------------------------------------------------------------
    // 2. PRECOMPUTE FLEET ANALYTICS (TRENDS & ECO LEADERBOARD)
    // -------------------------------------------------------------

    // 2a. Multi-month trends
    const monthlyTrendsRaw = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(timestamp, 'YYYY-MM') as month,
        TO_CHAR(timestamp, 'Mon YYYY') as month_label,
        COALESCE(SUM(trip_revenue), 0)::float as total_revenue,
        COALESCE(SUM(maintenance_cost_inr), 0)::float as total_maintenance_cost,
        COALESCE(SUM(energy_consumed_kwh), 0)::float as total_energy_consumed
      FROM telemetry_records
      WHERE timestamp IS NOT NULL
      GROUP BY TO_CHAR(timestamp, 'YYYY-MM'), TO_CHAR(timestamp, 'Mon YYYY')
      ORDER BY month ASC;
    `;

    const monthlyTrends = monthlyTrendsRaw.map(row => ({
      month: row.month,
      label: row.month_label,
      revenue: Math.round(row.total_revenue || 0),
      maintenanceCost: Math.round(row.total_maintenance_cost || 0),
      electricityConsumedKwh: Math.round(row.total_energy_consumed || 0)
    }));

    // 2b. Driver Eco-Score Leaderboard
    const driverStatsRaw = await prisma.$queryRaw`
      WITH driver_modes AS (
        SELECT 
          driver_id,
          COUNT(*) as total_trips,
          COUNT(*) FILTER (WHERE LOWER(TRIM(driving_mode)) = 'eco') as eco_trips,
          COUNT(*) FILTER (WHERE LOWER(TRIM(driving_mode)) IN ('sport', 'sports')) as sport_trips,
          COALESCE(SUM(trip_distance_km), 0)::float as total_distance_km,
          COALESCE(SUM(trip_revenue), 0)::float as total_revenue,
          MAX(vehicle_id) as assigned_vehicle_id
        FROM telemetry_records
        WHERE driver_id IS NOT NULL
        GROUP BY driver_id
      )
      SELECT 
        dm.driver_id,
        COALESCE(d.driver_name, dm.driver_id) as driver_name,
        d.driver_licence_number,
        d.driver_years_of_experience,
        dm.assigned_vehicle_id,
        v.vehicle_brand,
        v.vehicle_model,
        dm.total_trips,
        dm.eco_trips,
        dm.sport_trips,
        dm.total_distance_km,
        dm.total_revenue
      FROM driver_modes dm
      LEFT JOIN drivers d ON dm.driver_id = d.driver_id
      LEFT JOIN vehicles v ON dm.assigned_vehicle_id = v.vehicle_id;
    `;

    const driversWithEco = driverStatsRaw.map(d => {
      const totalTrips = Number(d.total_trips || 1);
      const ecoTrips = Number(d.eco_trips || 0);
      const sportTrips = Number(d.sport_trips || 0);
      const ecoPercent = (ecoTrips / totalTrips) * 100;
      const sportPercent = (sportTrips / totalTrips) * 100;
      let ecoScore = Math.round(50 + (ecoPercent * 0.5) - (sportPercent * 0.5));
      ecoScore = Math.max(0, Math.min(100, ecoScore));

      let scoreLabel = 'Moderate';
      if (ecoScore >= 80) scoreLabel = 'Highly Efficient';
      else if (ecoScore >= 65) scoreLabel = 'Efficient';
      else if (ecoScore < 45) scoreLabel = 'High Consumption';

      return {
        driver_id: d.driver_id,
        driver_name: d.driver_name || 'Driver',
        driver_licence_number: d.driver_licence_number || 'DL-2025-N/A',
        driver_years_of_experience: d.driver_years_of_experience != null ? Number(d.driver_years_of_experience) : 2,
        assigned_vehicle: d.assigned_vehicle_id ? `${d.vehicle_brand || 'EV'} (${d.assigned_vehicle_id})` : 'Unassigned',
        total_distance_km: Math.round(Number(d.total_distance_km || 0)),
        total_revenue: Math.round(Number(d.total_revenue || 0)),
        eco_score: ecoScore,
        scoreLabel
      };
    });

    const ecoLeaderboard = [...driversWithEco]
      .sort((a, b) => b.eco_score - a.eco_score || b.total_distance_km - a.total_distance_km)
      .slice(0, 10);

    // 2c. Fleet Aggregate CO2 Saved
    const distRaw = await prisma.$queryRaw`
      SELECT COALESCE(SUM(trip_distance_km), 0)::float as total_km FROM telemetry_records;
    `;
    const totalKm = Number(distRaw[0]?.total_km || 0);
    const co2SavedKg = Math.round(totalKm * 0.120);

    const fleetAnalyticsPayload = {
      monthlyTrends,
      ecoLeaderboard,
      fleetCo2Saved: {
        co2SavedKg,
        co2SavedTonnes: (co2SavedKg / 1000).toFixed(2),
        totalDistanceKm: Math.round(totalKm),
        disclaimer: 'Aggregate estimate derived from zero tailpipe EV emissions vs. average petrol vehicle (0.120 kg CO2/km).'
      },
      last_updated: new Date().toISOString()
    };

    // -------------------------------------------------------------
    // 3. PERSIST PRECOMPUTED SUMMARY INTO DATABASE
    // -------------------------------------------------------------

    const nowStr = new Date().toISOString();

    await prisma.$executeRaw`
      INSERT INTO fleet_analytics_summary (key, data, last_updated)
      VALUES ('enhanced_analytics', ${JSON.stringify(enhancedPayload)}::jsonb, ${new Date()})
      ON CONFLICT (key) DO UPDATE SET
        data = EXCLUDED.data,
        last_updated = EXCLUDED.last_updated;
    `;

    await prisma.$executeRaw`
      INSERT INTO fleet_analytics_summary (key, data, last_updated)
      VALUES ('fleet_analytics', ${JSON.stringify(fleetAnalyticsPayload)}::jsonb, ${new Date()})
      ON CONFLICT (key) DO UPDATE SET
        data = EXCLUDED.data,
        last_updated = EXCLUDED.last_updated;
    `;

    const duration = Date.now() - startTime;
    console.log(`[Precomputer Success] Fleet analytics summary updated in ${duration} ms.`);

  } catch (error) {
    console.error('[Precomputer Error] Failed to precompute fleet analytics:', error);
  }
}
