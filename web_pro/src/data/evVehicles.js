// EV Brands and Models dynamic catalog
export const EV_BRANDS = [
  {
    id: 'tata',
    name: 'Tata EV',
    country: 'India',
    models: [
      { id: 'nexon-ev', name: 'Nexon.ev Long Range', battery: '45.0 kWh', range: '465 km', power: '142 bhp', speed0100: '8.9s', maxChargeRate: '50 kW DC' },
      { id: 'curvv-ev', name: 'Curvv.ev 55', battery: '55.0 kWh', range: '585 km', power: '167 bhp', speed0100: '8.6s', maxChargeRate: '70 kW DC' },
      { id: 'punch-ev', name: 'Punch.ev LR', battery: '35.0 kWh', range: '421 km', power: '120 bhp', speed0100: '9.5s', maxChargeRate: '50 kW DC' },
      { id: 'harrier-ev', name: 'Harrier.ev AWD', battery: '75.0 kWh', range: '620 km', power: '240 bhp', speed0100: '6.4s', maxChargeRate: '120 kW DC' },
      { id: 'tiago-ev', name: 'Tiago.ev Long Range', battery: '24.0 kWh', range: '315 km', power: '74 bhp', speed0100: '11.2s', maxChargeRate: '30 kW DC' },
    ]
  },
  {
    id: 'mahindra',
    name: 'Mahindra Electric',
    country: 'India',
    models: [
      { id: 'xuv400-pro', name: 'XUV400 Pro EL', battery: '39.4 kWh', range: '456 km', power: '148 bhp', speed0100: '8.3s', maxChargeRate: '50 kW DC' },
      { id: 'be6e', name: 'BE 6e Born Electric', battery: '59.0 kWh', range: '550 km', power: '228 bhp', speed0100: '6.7s', maxChargeRate: '140 kW DC' },
      { id: 'xev9e', name: 'XEV 9e Flagship', battery: '79.0 kWh', range: '656 km', power: '282 bhp', speed0100: '6.1s', maxChargeRate: '175 kW DC' },
    ]
  },
  {
    id: 'tesla',
    name: 'Tesla',
    country: 'USA',
    models: [
      { id: 'model-3', name: 'Model 3 Long Range AWD', battery: '78.1 kWh', range: '629 km', power: '490 bhp', speed0100: '4.2s', maxChargeRate: '250 kW DC' },
      { id: 'model-y', name: 'Model Y Performance', battery: '82.0 kWh', range: '533 km', power: '527 bhp', speed0100: '3.7s', maxChargeRate: '250 kW DC' },
      { id: 'model-s-plaid', name: 'Model S Plaid Tri-Motor', battery: '100.0 kWh', range: '600 km', power: '1,020 bhp', speed0100: '2.1s', maxChargeRate: '250 kW DC' },
      { id: 'cybertruck', name: 'Cybertruck Cyberbeast', battery: '123.0 kWh', range: '515 km', power: '845 bhp', speed0100: '2.6s', maxChargeRate: '350 kW DC' },
    ]
  },
  {
    id: 'byd',
    name: 'BYD (Build Your Dreams)',
    country: 'China',
    models: [
      { id: 'seal-perf', name: 'SEAL Performance AWD', battery: '82.5 kWh', range: '580 km', power: '523 bhp', speed0100: '3.8s', maxChargeRate: '150 kW DC' },
      { id: 'atto-3', name: 'Atto 3 Blade Extended', battery: '60.4 kWh', range: '521 km', power: '201 bhp', speed0100: '7.3s', maxChargeRate: '88 kW DC' },
      { id: 'sealion-7', name: 'Sea Lion 7 e-Platform 3.0', battery: '91.3 kWh', range: '605 km', power: '523 bhp', speed0100: '4.5s', maxChargeRate: '230 kW DC' },
    ]
  },
  {
    id: 'hyundai',
    name: 'Hyundai',
    country: 'South Korea',
    models: [
      { id: 'ioniq-5', name: 'IONIQ 5 Long Range AWD', battery: '84.0 kWh', range: '570 km', power: '320 bhp', speed0100: '5.1s', maxChargeRate: '350 kW DC' },
      { id: 'ioniq-6', name: 'IONIQ 6 Streamliner', battery: '77.4 kWh', range: '614 km', power: '320 bhp', speed0100: '5.1s', maxChargeRate: '350 kW DC' },
      { id: 'creta-ev', name: 'Creta EV High-Power', battery: '45.0 kWh', range: '470 km', power: '138 bhp', speed0100: '8.8s', maxChargeRate: '60 kW DC' },
    ]
  },
  {
    id: 'mg',
    name: 'MG Motor EV',
    country: 'UK / SAIC',
    models: [
      { id: 'windsor-ev', name: 'Windsor EV Aero Lounge', battery: '38.0 kWh', range: '331 km', power: '134 bhp', speed0100: '8.9s', maxChargeRate: '45 kW DC' },
      { id: 'zs-ev', name: 'ZS EV Exclusive Pro', battery: '50.3 kWh', range: '461 km', power: '174 bhp', speed0100: '8.5s', maxChargeRate: '50 kW DC' },
      { id: 'comet-ev', name: 'Comet EV Smart Urban', battery: '17.3 kWh', range: '230 km', power: '41 bhp', speed0100: '13.5s', maxChargeRate: '7.4 kW AC' },
      { id: 'cyberster', name: 'Cyberster Electric Roadster', battery: '77.0 kWh', range: '508 km', power: '536 bhp', speed0100: '3.2s', maxChargeRate: '144 kW DC' },
    ]
  },
  {
    id: 'kia',
    name: 'Kia EV',
    country: 'South Korea',
    models: [
      { id: 'ev6-gt', name: 'EV6 GT Line AWD', battery: '77.4 kWh', range: '528 km', power: '577 bhp', speed0100: '3.5s', maxChargeRate: '350 kW DC' },
      { id: 'ev9', name: 'EV9 Flagship 3-Row SUV', battery: '99.8 kWh', range: '563 km', power: '379 bhp', speed0100: '5.3s', maxChargeRate: '350 kW DC' },
    ]
  },
  {
    id: 'rivian',
    name: 'Rivian',
    country: 'USA',
    models: [
      { id: 'r1s', name: 'R1S Quad-Motor AWD', battery: '135.0 kWh', range: '640 km', power: '835 bhp', speed0100: '3.0s', maxChargeRate: '220 kW DC' },
      { id: 'r1t', name: 'R1T Adventure Truck', battery: '135.0 kWh', range: '660 km', power: '835 bhp', speed0100: '3.0s', maxChargeRate: '220 kW DC' },
    ]
  },
  {
    id: 'ather',
    name: 'Ather Energy',
    country: 'India',
    models: [
      { id: '450-apex', name: '450 Apex Hyper Edition', battery: '3.7 kWh', range: '157 km', power: '7.0 kW', speed0100: '2.9s (0-40)', maxChargeRate: '1.5 km/min' },
      { id: 'rizta-z', name: 'Rizta Z Family EV', battery: '3.7 kWh', range: '160 km', power: '4.3 kW', speed0100: '4.7s (0-40)', maxChargeRate: 'Fast Pod' },
    ]
  },
  {
    id: 'other',
    name: 'Custom / Other EV Brand',
    country: 'Global',
    models: [
      { id: 'custom-ev-1', name: 'Custom Fleet EV Sedan', battery: '60.0 kWh', range: '450 km', power: '200 bhp', speed0100: '6.5s', maxChargeRate: '100 kW DC' },
      { id: 'custom-ev-2', name: 'Commercial EV Cargo Van', battery: '75.0 kWh', range: '380 km', power: '180 bhp', speed0100: '9.0s', maxChargeRate: '120 kW DC' },
    ]
  }
];

// Pre-seeded Demo Credentials
export const DEMO_ADMIN = {
  name: 'Marcus Vance',
  adminId: 'ADM-9021-X',
  email: 'admin@volttrack.ev',
  password: 'Password@2026',
  role: 'admin',
  department: 'Global EV Fleet Operations & Sentinel Control',
  accessLevel: 'Level 5 SuperAdmin',
  activeFleets: 12,
  managedVehicles: 184
};

export const DEMO_DRIVER = {
  name: 'Aarav Sharma',
  driverId: 'DRV-2026-0842',
  email: 'aarav.sharma@volttrack.ev',
  password: 'Password@2026',
  role: 'driver',
  dob: '1998-05-14',
  brand: 'tata',
  brandName: 'Tata EV',
  model: 'curvv-ev',
  modelName: 'Curvv.ev 55',
  registration: 'MH 02 EV 8899',
  vin: 'MAT618429NX002914',
  batteryCapacity: '55.0 kWh',
  currentBatterySoc: 78,
  estimatedRange: 456,
  odometer: 14280,
  ecoScore: 96,
  status: 'Active Driving',
  location: 'Western Express Highway, Sector 4',
  motorTemp: 48,
  tirePressure: { fl: 36, fr: 36, rl: 38, rr: 38 },
  currentSpeed: 64,
  chargingStatus: 'Discharging'
};

// Initial Fleet Mock Data for Admin
export const INITIAL_FLEET = [
  {
    id: 'EV-01',
    driverName: 'Aarav Sharma',
    driverId: 'DRV-2026-0842',
    model: 'Tata Curvv.ev 55',
    regNo: 'MH 02 EV 8899',
    battery: 78,
    status: 'Driving',
    speed: 64,
    temp: 48,
    range: 456,
    lat: 19.0760,
    lng: 72.8777,
    alert: null,
    lastUpdate: 'Just now'
  },
  {
    id: 'EV-02',
    driverName: 'Elena Rostova',
    driverId: 'DRV-2026-0192',
    model: 'Tesla Model Y Perf',
    regNo: 'DL 01 EV 4102',
    battery: 92,
    status: 'Charging',
    speed: 0,
    temp: 34,
    range: 490,
    lat: 28.6139,
    lng: 77.2090,
    alert: 'Fast DC Charging (150kW)',
    lastUpdate: '2 mins ago'
  },
  {
    id: 'EV-03',
    driverName: 'David Chen',
    driverId: 'DRV-2026-0511',
    model: 'BYD SEAL Performance',
    regNo: 'KA 05 EV 1120',
    battery: 18,
    status: 'Low Battery',
    speed: 42,
    temp: 52,
    range: 104,
    lat: 12.9716,
    lng: 77.5946,
    alert: 'Low Battery Warning (<20%)',
    lastUpdate: '1 min ago'
  },
  {
    id: 'EV-04',
    driverName: 'Sarah Jenkins',
    driverId: 'DRV-2026-0337',
    model: 'Hyundai IONIQ 5',
    regNo: 'TS 09 EV 9081',
    battery: 64,
    status: 'Driving',
    speed: 82,
    temp: 46,
    range: 365,
    lat: 17.3850,
    lng: 78.4867,
    alert: null,
    lastUpdate: 'Just now'
  },
  {
    id: 'EV-05',
    driverName: 'Karthik Raja',
    driverId: 'DRV-2026-0924',
    model: 'Mahindra BE 6e',
    regNo: 'TN 07 EV 3301',
    battery: 85,
    status: 'Idle',
    speed: 0,
    temp: 29,
    range: 468,
    lat: 13.0827,
    lng: 80.2707,
    alert: null,
    lastUpdate: '12 mins ago'
  }
];
