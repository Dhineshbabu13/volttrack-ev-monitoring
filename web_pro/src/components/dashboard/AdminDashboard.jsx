import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import {
  Shield,
  Car,
  Zap,
  Radio,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  UserPlus,
  TrendingUp,
  Wrench,
  Battery,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  LogOut,
  Award,
  Crown,
  Trophy,
  PieChart as PieChartIcon,
  Compass,
  DollarSign,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Leaf,
  Filter,
  ArrowUpDown,
  Trash2,
  Activity,
  Tag,
  RotateCcw
} from 'lucide-react';
import { AdminAvatar } from '../../utils/avatarUtils';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Fix default Leaflet marker icons in Vite with bundled local assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

/**
 * Fleet-Wide Leaflet Location Map Component with Marker Clustering
 */
const FleetLocationMap = ({ vehicles = [], onSelectVehicle }) => {
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const clusterGroupRef = useRef(null);

  // Initialize Map container once
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapInstance.current) {
      const defaultCenter = [13.0827, 80.2707];
      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom: 7,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 40,
        showCoverageOnHover: false,
      });
      map.addLayer(clusterGroup);

      clusterGroupRef.current = clusterGroup;
      leafletMapInstance.current = map;
    }

    return () => {
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
        clusterGroupRef.current = null;
      }
    };
  }, []);

  // Synchronize map markers whenever vehicles data changes
  useEffect(() => {
    const map = leafletMapInstance.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();
    const bounds = [];

    if (Array.isArray(vehicles) && vehicles.length > 0) {
      vehicles.forEach((v) => {
        const lat = (v.latitude !== null && v.latitude !== undefined && v.latitude !== '') ? Number(v.latitude) : null;
        const lng = (v.longitude !== null && v.longitude !== undefined && v.longitude !== '') ? Number(v.longitude) : null;

        if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
          bounds.push([lat, lng]);

          let pinBg = '#059669'; // Green - Working
          if (v.vehicle_status === 'Garage') pinBg = '#D97706'; // Amber - Garage
          if (v.vehicle_status === 'Charging') pinBg = '#2563EB'; // Blue - Charging

          const customIcon = L.divIcon({
            className: 'custom-fleet-pin',
            html: `<div style="background-color: ${pinBg}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">🚗</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const marker = L.marker([lat, lng], { icon: customIcon });
          marker.bindPopup(`
            <div style="font-family: monospace; font-size: 11px; line-height: 1.4;">
              <strong style="color: ${pinBg};">${v.vehicle_id} (${v.vehicle_brand || ''} ${v.vehicle_model || ''})</strong><br/>
              <span>Status: <b>${v.vehicle_status}</b></span><br/>
              <span>Driver: ${v.driver_name || 'Unassigned'}</span><br/>
              <span>Route: <b>${v.route_type || 'N/A'}</b></span><br/>
              <span>Year: <b>${v.manufacturing_year || 'N/A'}</b></span><br/>
              <span>Battery: ${v.battery_percent}%</span>
            </div>
          `);

          if (onSelectVehicle) {
            marker.on('click', () => onSelectVehicle(v));
          }

          clusterGroup.addLayer(marker);
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      }
    }
  }, [vehicles, onSelectVehicle]);

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative z-0">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};


export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();
  const token = currentUser?.token;

  // Active Navigation Tab: 'overview' | 'fleet-analytics' | 'vehicles' | 'drivers' | 'admin-management'
  const [activeTab, setActiveTab] = useState('overview');

  // Month selection state for Monthly Analysis
  const [month, setMonth] = useState('2025-10');

  // Multi-Filter state for Vehicles table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [modelFilter, setModelFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [routeTypeFilter, setRouteTypeFilter] = useState('All');
  const [maintStatusFilter, setMaintStatusFilter] = useState('All');
  const [chargingStatusFilter, setChargingStatusFilter] = useState('All');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Overview Tab Filter State
  const [overviewTimeRange, setOverviewTimeRange] = useState('All Time');
  const [alertSeverity, setAlertSeverity] = useState('All');

  // Fleet Analytics Filter State
  const [metricFocus, setMetricFocus] = useState('All Metrics');

  // Drivers Tab Filter State
  const [driverExpFilter, setDriverExpFilter] = useState('All');
  const [driverBrandFilter, setDriverBrandFilter] = useState('All');

  // Admin Management Filter State
  const [adminDateRange, setAdminDateRange] = useState('all');

  // Vehicle Filter Dropdown Options
  const [filterOptions, setFilterOptions] = useState({
    brands: [],
    models: [],
    years: [],
    routeTypes: [],
    maintenanceStatuses: [],
    chargingStatuses: []
  });


  // Drivers Tab State (Server-side Pagination & Sorting)
  const [driverSearch, setDriverSearch] = useState('');
  const [debouncedDriverSearch, setDebouncedDriverSearch] = useState('');
  const [driverSortBy, setDriverSortBy] = useState('driver_name');
  const [driverSortOrder, setDriverSortOrder] = useState('asc');
  const [driverPage, setDriverPage] = useState(1);
  const [driverLimit] = useState(25);
  const [driversResponse, setDriversResponse] = useState({ drivers: [], totalCount: 0, totalPages: 1 });
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // API Data States
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [monthlyAnalysis, setMonthlyAnalysis] = useState(null);
  const [fleetAnalytics, setFleetAnalytics] = useState(null);
  const [enhancedAnalytics, setEnhancedAnalytics] = useState(null);
  const [loadingEnhanced, setLoadingEnhanced] = useState(true);
  const [violationSearch, setViolationSearch] = useState('');
  const [violationPage, setViolationPage] = useState(1);
  const [revenueSearch, setRevenueSearch] = useState('');
  const [expenseSortKey, setExpenseSortKey] = useState('total_expense');
  const [expenseSortOrder, setExpenseSortOrder] = useState('desc');
  const [expensePage, setExpensePage] = useState(1);
  const [vehiclesResponse, setVehiclesResponse] = useState({ vehicles: [], totalCount: 0, totalPages: 1, currentPage: 1 });
  const [adminList, setAdminList] = useState([]);

  // UI Loading & Error States
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingFleetAnalytics, setLoadingFleetAnalytics] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [errorKpis, setErrorKpis] = useState(null);
  const [errorMonthly, setErrorMonthly] = useState(null);
  const [errorVehicles, setErrorVehicles] = useState(null);
  const [errorAlerts, setErrorAlerts] = useState(null);
  const [errorEnhanced, setErrorEnhanced] = useState(null);

  // Expandable Charging Details state
  const [showChargingDetails, setShowChargingDetails] = useState(false);

  // Add Admin Modal & Removal State
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [adminFormData, setAdminFormData] = useState({ admin_name: '', password: '' });
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const [adminFormError, setAdminFormError] = useState(null);
  const [adminFormSuccess, setAdminFormSuccess] = useState(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [removeAdminLoading, setRemoveAdminLoading] = useState(false);

  // Selected Vehicle for inspection drawer
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Pagination state for Vehicles table (10 vehicles per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Debounce search query inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDriverSearch(driverSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [driverSearch]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, brandFilter, modelFilter, yearFilter, routeTypeFilter]);

  useEffect(() => {
    setDriverPage(1);
  }, [debouncedDriverSearch, driverSortBy, driverSortOrder]);

  // Calculations for Vehicles Pagination
  const totalVehicles = vehiclesResponse.totalCount || 0;
  const totalPages = vehiclesResponse.totalPages || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVehicles = vehiclesResponse.vehicles || [];

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };


  // Auth Protection Check
  useEffect(() => {
    if (!token) {
      showToast('Please log in as Admin to access Fleet Command', 'error', 'Session Expired');
      navigate('/auth/admin');
    }
  }, [token, navigate, showToast]);

  // Helper fetch function with Bearer Authorization header
  // Helper fetch function with Bearer Authorization header & 10-second timeout safety net
  const authFetch = useCallback(
    async (url, timeoutMs = 10000) => {
      if (!token) throw new Error('No authentication token');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        clearTimeout(timeoutId);

        if (res.status === 401) {
          logout();
          navigate('/auth/admin');
          throw new Error('Session expired. Please sign in again.');
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }
        return res.json();
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw err;
      }
    },
    [token, logout, navigate]
  );

  // Fetch KPIs & Alerts
  const fetchKpis = useCallback(async () => {
    setLoadingKpis(true);
    setErrorKpis(null);
    try {
      const data = await authFetch('http://localhost:4000/api/admin/kpis');
      setKpis(data);
    } catch (err) {
      setErrorKpis(err.message);
    } finally {
      setLoadingKpis(false);
    }
  }, [authFetch]);

  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setErrorAlerts(null);
    try {
      const data = await authFetch('http://localhost:4000/api/admin/alerts');
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setErrorAlerts(err.message || 'Failed to load active alerts');
    } finally {
      setLoadingAlerts(false);
    }
  }, [authFetch]);

  // Fetch Monthly Analysis
  const fetchMonthlyAnalysis = useCallback(async () => {
    setLoadingMonthly(true);
    setErrorMonthly(null);
    try {
      const data = await authFetch(`http://localhost:4000/api/admin/monthly-analysis?month=${month}`);
      setMonthlyAnalysis(data);
    } catch (err) {
      setErrorMonthly(err.message);
    } finally {
      setLoadingMonthly(false);
    }
  }, [authFetch, month]);

  // Fetch Deeper Fleet Analytics
  const fetchFleetAnalytics = useCallback(async () => {
    setLoadingFleetAnalytics(true);
    try {
      const data = await authFetch('http://localhost:4000/api/admin/fleet-analytics');
      setFleetAnalytics(data);
    } catch (err) {
      console.error('Error fetching fleet analytics:', err);
    } finally {
      setLoadingFleetAnalytics(false);
    }
  }, [authFetch]);

  // Fetch Enhanced Analytics (Status Breakdown, Violations, Driver Revenue, Vehicle & Brand Expenses)
  const fetchEnhancedAnalytics = useCallback(async () => {
    setLoadingEnhanced(true);
    setErrorEnhanced(null);
    try {
      const data = await authFetch('http://localhost:4000/api/admin/analytics/enhanced');
      setEnhancedAnalytics(data);
    } catch (err) {
      console.error('Error fetching enhanced analytics:', err);
      setErrorEnhanced(err.message || 'Failed to load section data');
    } finally {
      setLoadingEnhanced(false);
    }
  }, [authFetch]);

  // Fetch Vehicle Filter Dropdown Options
  const fetchVehicleOptions = useCallback(async (selectedBrand) => {
    try {
      const url = selectedBrand && selectedBrand !== 'All' 
        ? `http://localhost:4000/api/admin/vehicles/options?brand=${encodeURIComponent(selectedBrand)}`
        : 'http://localhost:4000/api/admin/vehicles/options';
      const data = await authFetch(url);
      setFilterOptions(prev => ({
        ...prev,
        brands: data.brands || [],
        models: data.models || [],
        years: data.years || [],
        routeTypes: data.routeTypes || [],
        maintenanceStatuses: data.maintenanceStatuses || [],
        chargingStatuses: data.chargingStatuses || []
      }));
    } catch (err) {
      console.error('Error fetching vehicle options:', err);
    }
  }, [authFetch]);

  // Fetch Vehicles (Server-Side Filtered & Paginated)
  const fetchVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    setErrorVehicles(null);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      if (debouncedSearch) queryParams.set('search', debouncedSearch);
      if (statusFilter !== 'All') queryParams.set('status', statusFilter);
      if (brandFilter !== 'All') queryParams.set('brand', brandFilter);
      if (modelFilter !== 'All') queryParams.set('model', modelFilter);
      if (yearFilter !== 'All') queryParams.set('year', yearFilter);
      if (routeTypeFilter !== 'All') queryParams.set('route_type', routeTypeFilter);
      if (maintStatusFilter !== 'All') queryParams.set('maint_status', maintStatusFilter);
      if (chargingStatusFilter !== 'All') queryParams.set('charging_status', chargingStatusFilter);

      const url = `http://localhost:4000/api/admin/vehicles?${queryParams.toString()}`;
      const data = await authFetch(url);
      setVehiclesResponse(data);
    } catch (err) {
      setErrorVehicles(err.message);
    } finally {
      setLoadingVehicles(false);
    }
  }, [authFetch, currentPage, ITEMS_PER_PAGE, debouncedSearch, statusFilter, brandFilter, modelFilter, yearFilter, routeTypeFilter, maintStatusFilter, chargingStatusFilter]);

  // Fetch Drivers (Server-Side Paginated)
  const fetchDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const queryParams = new URLSearchParams({
        page: driverPage.toString(),
        limit: driverLimit.toString(),
        sortBy: driverSortBy,
        sortOrder: driverSortOrder,
      });
      if (debouncedDriverSearch) queryParams.set('search', debouncedDriverSearch);
      if (driverExpFilter !== 'All') queryParams.set('experienceRange', driverExpFilter);
      if (driverBrandFilter !== 'All') queryParams.set('assignedBrand', driverBrandFilter);

      const data = await authFetch(`http://localhost:4000/api/admin/drivers?${queryParams.toString()}`);
      setDriversResponse(data);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setLoadingDrivers(false);
    }
  }, [authFetch, driverPage, driverLimit, driverSortBy, driverSortOrder, debouncedDriverSearch, driverExpFilter, driverBrandFilter]);

  // Fetch Admin List
  const fetchAdminList = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const data = await authFetch(`http://localhost:4000/api/admin/list?dateRange=${encodeURIComponent(adminDateRange)}`);
      setAdminList(data);
    } catch (err) {
      console.error('Error fetching admin list:', err);
    } finally {
      setLoadingAdmins(false);
    }
  }, [authFetch, adminDateRange]);

  // Track which tabs have been fetched to prevent over-fetching on initial load
  const loadedTabsRef = useRef(new Set());

  // On-demand tab data loader & active Vehicles/Drivers filter fetcher
  useEffect(() => {
    if (!token) return;

    if (activeTab === 'overview') {
      if (!loadedTabsRef.current.has('overview')) {
        loadedTabsRef.current.add('overview');
        fetchKpis();
        fetchAlerts();
        fetchEnhancedAnalytics();
      }
    } else if (activeTab === 'fleet-analytics') {
      if (!loadedTabsRef.current.has('fleet-analytics')) {
        loadedTabsRef.current.add('fleet-analytics');
        Promise.all([
          fetchMonthlyAnalysis(),
          fetchFleetAnalytics(),
          fetchEnhancedAnalytics()
        ]).catch((err) => console.error('Error in parallel fleet analytics fetch:', err));
      }
    } else if (activeTab === 'vehicles') {
      fetchVehicles();
      if (!loadedTabsRef.current.has('vehicles-options')) {
        loadedTabsRef.current.add('vehicles-options');
        fetchVehicleOptions(brandFilter);
      }
    } else if (activeTab === 'drivers') {
      fetchDrivers();
    } else if (activeTab === 'admin-management') {
      fetchAdminList();
    }
  }, [token, activeTab, brandFilter, fetchKpis, fetchAlerts, fetchMonthlyAnalysis, fetchFleetAnalytics, fetchEnhancedAnalytics, fetchVehicles, fetchVehicleOptions, fetchDrivers, fetchAdminList]);


  // Refresh model choices when brand changes
  useEffect(() => {
    if (token && activeTab === 'vehicles') {
      fetchVehicleOptions(brandFilter);
    }
  }, [token, activeTab, brandFilter, fetchVehicleOptions]);


  // Tab Change Handler
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Add Admin Handler
  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminFormError(null);
    setAdminFormSuccess(null);

    if (!adminFormData.admin_name.trim() || !adminFormData.password) {
      setAdminFormError('Both Admin Full Name and Password are required.');
      return;
    }

    setAdminFormLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/admin/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_name: adminFormData.admin_name.trim(),
          password: adminFormData.password
        })
      });

      const data = await res.json();
      setAdminFormLoading(false);

      if (!res.ok) {
        setAdminFormError(data.error || 'Failed to create admin');
        return;
      }

      const generatedId = data.admin?.admin_id || data.admin_id;
      setAdminFormSuccess(`Admin created successfully — ID: ${generatedId}`);
      showToast(`Admin created: ${generatedId}`, 'success');
      setAdminFormData({ admin_name: '', password: '' });
      fetchAdminList();
    } catch (err) {
      setAdminFormLoading(false);
      setAdminFormError(err.message || 'Error connecting to server');
    }
  };

  // Remove Admin Handler
  const handleRemoveAdminSubmit = async () => {
    if (!adminToDelete) return;
    setRemoveAdminLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/admin/${adminToDelete.admin_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove admin account');
      }
      showToast(data.message || `Admin ${adminToDelete.admin_name} removed successfully`, 'success', 'Admin Removed');
      setAdminToDelete(null);
      fetchAdminList();
    } catch (err) {
      showToast(err.message, 'error', 'Removal Failed');
    } finally {
      setRemoveAdminLoading(false);
    }
  };


  // Status Badge Styling
  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'working':
      case 'running':
      case 'parked':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'garage':
      case 'maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'charging':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Exactly 5 Navigation Items Matching Driver Dashboard Left Sidebar Pattern
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'fleet-analytics', label: 'Fleet Analytics', icon: TrendingUp },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'admin-management', label: 'Admin Management', icon: ShieldCheck },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm mb-6">
        <div className="flex items-center space-x-3.5">
          <AdminAvatar
            name={currentUser?.name || currentUser?.admin_name || 'Admin'}
            id={currentUser?.adminId || currentUser?.admin_id || 'ADM001'}
            size="lg"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-brand-dark">
                VoltTrack Command Center
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-50 text-brand-red border border-red-200 font-bold uppercase">
                Fleet Admin
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1.5">
              <span>Commander: <strong className="text-gray-900">{currentUser?.name || currentUser?.admin_name || 'Admin'}</strong></span>
              <span>•</span>
              <span>ID: <strong className="text-gray-700">{currentUser?.adminId || currentUser?.admin_id || 'ADM001'}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              if (activeTab === 'overview') { fetchKpis(); fetchAlerts(); }
              else if (activeTab === 'fleet-analytics') { fetchMonthlyAnalysis(); fetchFleetAnalytics(); }
              else if (activeTab === 'vehicles') { fetchVehicles(); }
              else if (activeTab === 'drivers') { fetchDrivers(); }
              else if (activeTab === 'admin-management') { fetchAdminList(); }
              showToast('Fleet command metrics refreshed', 'info');
            }}
            className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center space-x-1.5 text-xs font-mono font-bold cursor-pointer"
            title="Refresh Fleet Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Layout with Fixed/Sticky Left Navigation Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 items-start relative">
        <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-20 z-30">
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-clean-sm flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 scrollbar-none">
            <div className="hidden lg:block px-3.5 py-2 text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
              Admin Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all text-left whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-red-50 text-brand-red font-bold border-l-4 border-brand-red shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-semibold border-l-4 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-red' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area — Tab Switcher */}
        <div key={activeTab} className="flex-1 min-w-0 space-y-6 w-full animate-tab-fade">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Cars */}
                <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-gray-500 uppercase font-bold">Total Monitored EVs</span>
                      <Car className="w-4 h-4 text-gray-400" />
                    </div>
                    {loadingKpis ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      <p className="text-3xl font-mono font-black text-gray-900 mt-1">
                        {kpis?.totalCars ?? 0} <span className="text-xs font-normal text-gray-500 font-sans">Units</span>
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-emerald-600 font-medium mt-2">Live telemetry active</p>
                </div>

                {/* Working Cars */}
                <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-gray-500 uppercase font-bold">Working / Active EVs</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    {loadingKpis ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      <p className="text-3xl font-mono font-black text-emerald-600 mt-1">
                        {kpis?.workingCars ?? 0} <span className="text-xs font-normal text-gray-500 font-sans">Vehicles</span>
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-2">Operational on route</p>
                </div>

                {/* Garage Cars */}
                <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-gray-500 uppercase font-bold">Garage / Maintenance</span>
                      <Wrench className="w-4 h-4 text-amber-500" />
                    </div>
                    {loadingKpis ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      <p className="text-3xl font-mono font-black text-amber-600 mt-1">
                        {kpis?.garageCars ?? 0} <span className="text-xs font-normal text-gray-500 font-sans">Vehicles</span>
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-amber-700 font-medium mt-2">Under service / repair</p>
                </div>

                {/* Charging Cars */}
                <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-gray-500 uppercase font-bold">Charging Cars</span>
                      <Zap className="w-4 h-4 text-blue-500 animate-pulse" />
                    </div>
                    {loadingKpis ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      <p className="text-3xl font-mono font-black text-blue-600 mt-1">
                        {kpis?.chargingCars ?? 0} <span className="text-xs font-normal text-gray-500 font-sans">Units</span>
                      </p>
                    )}
                  </div>

                  {kpis?.chargingDetails && kpis.chargingDetails.length > 0 && (
                    <button
                      onClick={() => setShowChargingDetails(!showChargingDetails)}
                      className="flex items-center justify-between w-full mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors pt-2 border-t border-gray-100 cursor-pointer"
                    >
                      <span>{showChargingDetails ? 'Hide Details' : 'Show Charging Breakdown'}</span>
                      {showChargingDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {/* Expandable Charging Details Breakdown */}
                  {showChargingDetails && kpis?.chargingDetails && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 p-3 rounded-lg bg-white border border-blue-200 shadow-xl space-y-2 max-h-48 overflow-y-auto">
                      <p className="text-[10px] font-mono font-bold text-gray-500 uppercase">Live Charging Sessions</p>
                      {kpis.chargingDetails.map((c, i) => (
                        <div key={i} className="p-2 rounded bg-blue-50/70 border border-blue-100 text-xs flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-900">{c.vehicle_id}</span>
                          <div className="text-right font-mono text-[11px] text-gray-700">
                            <span>{c.charging_duration_min} min</span> • <span>{c.energy_consumed_kwh} kWh</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Driving Activity Highlight Banner */}
              {kpis?.topDriverByDistance && (
                <div className="p-5 rounded-xl bg-gradient-to-r from-red-900 via-brand-dark to-gray-900 text-white shadow-clean-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-red-800/40">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6 text-brand-red" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-brand-red text-white font-bold">
                          Top Distance Record
                        </span>
                      </div>
                      <h3 className="text-lg font-bold mt-1 text-white">
                        {kpis.topDriverByDistance.driver_name} <span className="text-xs font-mono font-normal text-red-200">({kpis.topDriverByDistance.driver_id})</span>
                      </h3>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Highest overall fleet mileage achieved across all recorded trips.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-lg border border-white/10 shrink-0">
                    <div>
                      <p className="text-[10px] font-mono text-gray-300 uppercase">Total Distance</p>
                      <p className="text-xl font-mono font-bold text-white">
                        {kpis.topDriverByDistance.total_distance_km.toLocaleString()} <span className="text-xs font-normal">km</span>
                      </p>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div>
                      <p className="text-[10px] font-mono text-gray-300 uppercase">Last Trip Timestamp</p>
                      <p className="text-xs font-mono text-gray-200">
                        {new Date(kpis.topDriverByDistance.last_trip_timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fleet Vehicle Status Breakdown Donut Chart Panel */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                      <PieChartIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Vehicle Status Breakdown</h2>
                      <p className="text-xs text-gray-500">Live operational status split across entire monitored fleet</p>
                    </div>
                  </div>
                </div>

                {errorEnhanced ? (
                  <div className="p-6 text-center space-y-2.5 font-mono">
                    <p className="text-xs text-red-600 font-bold">Failed to load Vehicle Status Breakdown ({errorEnhanced})</p>
                    <button
                      onClick={() => fetchEnhancedAnalytics()}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-50 hover:bg-red-100 text-[#E30613] border border-red-200 cursor-pointer transition-colors"
                    >
                      Retry Loading Section
                    </button>
                  </div>
                ) : loadingEnhanced || !enhancedAnalytics?.statusBreakdown ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="h-56 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={enhancedAnalytics.statusBreakdown}
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {enhancedAnalytics.statusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val, name, item) => [`${val} vehicles (${item.payload.percentage}%)`, name]}
                            contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-mono font-black text-gray-900">
                          {enhancedAnalytics.statusBreakdown.reduce((sum, s) => sum + s.value, 0)}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Total EVs</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {enhancedAnalytics.statusBreakdown.map((status) => (
                        <div key={status.name} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                          <div className="flex items-center space-x-2.5">
                            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                            <span className="text-xs font-semibold text-gray-800">{status.name}</span>
                          </div>
                          <div className="flex items-center space-x-3 font-mono">
                            <span className="text-sm font-bold text-gray-900">{status.value}</span>
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 font-bold">
                              {status.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fleet Alerts Summary Card */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-brand-red border border-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Fleet-Wide Active Alerts Summary</h2>
                      <p className="text-xs text-gray-500">Live monitoring of vehicles reporting non-normal alerts or service advisories</p>
                    </div>
                  </div>

                  {/* Overview Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Time Range Filter */}
                    <select
                      value={overviewTimeRange}
                      onChange={(e) => setOverviewTimeRange(e.target.value)}
                      className="py-1 px-2.5 corporate-input text-xs font-mono font-semibold"
                    >
                      <option value="All Time">All Time</option>
                      <option value="Today">Today</option>
                      <option value="This Week">This Week</option>
                      <option value="This Month">This Month</option>
                    </select>

                    {/* Severity Filter */}
                    <select
                      value={alertSeverity}
                      onChange={(e) => setAlertSeverity(e.target.value)}
                      className="py-1 px-2.5 corporate-input text-xs font-mono font-semibold"
                    >
                      <option value="All">All Severities</option>
                      <option value="Warning">Warning</option>
                      <option value="Urgent">Urgent / Critical</option>
                    </select>

                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-50 text-brand-red border border-red-200">
                      {alerts?.totalAlerts || 0} Requiring Attention
                    </span>
                  </div>
                </div>

                {/* Overview Active Filter Chips Bar */}
                {(overviewTimeRange !== 'All Time' || alertSeverity !== 'All') && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs font-mono">
                    <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3 text-gray-400" /> Active Filters:
                    </span>
                    {overviewTimeRange !== 'All Time' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Time: {overviewTimeRange}</span>
                        <button onClick={() => setOverviewTimeRange('All Time')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    {alertSeverity !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Severity: {alertSeverity}</span>
                        <button onClick={() => setAlertSeverity('All')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setOverviewTimeRange('All Time');
                        setAlertSeverity('All');
                      }}
                      className="text-[11px] font-bold text-brand-red hover:underline ml-1 cursor-pointer"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

                {errorAlerts ? (
                  <div className="p-6 text-center space-y-2.5 font-mono border-t border-gray-100">
                    <p className="text-xs text-red-600 font-bold">Failed to load Active Alerts ({errorAlerts})</p>
                    <button
                      onClick={() => fetchAlerts()}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-50 hover:bg-red-100 text-[#E30613] border border-red-200 cursor-pointer transition-colors"
                    >
                      Retry Loading Alerts
                    </button>
                  </div>
                ) : loadingAlerts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                  </div>
                ) : (() => {
                  const filteredAlerts = (alerts?.urgentAlerts || []).filter((item) => {
                    const statusLower = (item.alert_status || '').toLowerCase();
                    if (alertSeverity === 'Urgent' && !statusLower.includes('urgent') && !statusLower.includes('critical') && !statusLower.includes('overheat')) {
                      return false;
                    }
                    if (alertSeverity === 'Warning' && (statusLower.includes('urgent') || statusLower.includes('critical'))) {
                      return false;
                    }
                    return true;
                  });

                  if (filteredAlerts.length > 0) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {filteredAlerts.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-red-100 bg-red-50/40 flex items-start justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-gray-900">{item.vehicle_id}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-100 text-red-800">
                                  {item.alert_status}
                                </span>
                              </div>
                              <p className="text-gray-600 font-medium">Driver: <strong className="text-gray-900">{item.driver_name}</strong> ({item.driver_id})</p>
                              <p className="text-[11px] text-gray-500 font-mono">Location: {item.location}</p>
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 shrink-0">
                              {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center font-mono">
                      No results match your filters. All monitored vehicles are operating normally within this selection.
                    </div>
                  );
                })()}
              </div>


            </div>
          )}

          {/* TAB 2: FLEET ANALYTICS */}
          {activeTab === 'fleet-analytics' && (
            <div className="space-y-6">

              {/* Precomputed Data Transparency Banner */}
              {(fleetAnalytics?.last_updated || enhancedAnalytics?.last_updated) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-mono gap-2 shadow-clean-sm">
                  <div className="flex items-center space-x-2.5">
                    <Activity className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                    <span>
                      <strong className="text-emerald-950">Precomputed Fleet Analytics:</strong> Data as of{' '}
                      <span className="font-bold text-emerald-900">
                        {new Date(fleetAnalytics?.last_updated || enhancedAnalytics?.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-sans font-medium">Refreshed background schedule (2-min interval)</span>
                </div>
              )}

              
              {/* Existing Single-Month Performance Analysis */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-brand-red" />
                      <span>Single-Month Target Analysis</span>
                    </h2>
                    <p className="text-xs text-gray-500">Filtered metrics by target billing month</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <label className="text-xs font-mono font-semibold text-gray-700">Select Month:</label>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-900 border-red-200 focus:border-brand-red"
                    />
                  </div>
                </div>

                {loadingMonthly ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                    <span className="ml-2 text-xs font-mono text-gray-500">Fetching monthly telemetry analysis...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Highest Revenue Driver */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-red-50/80 to-white border border-red-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-brand-red">Highest Revenue Driver</span>
                        <Award className="w-4 h-4 text-brand-red" />
                      </div>
                      {monthlyAnalysis?.highestRevenueDriver ? (
                        <div>
                          <p className="text-base font-bold text-gray-900">{monthlyAnalysis.highestRevenueDriver.driver_name}</p>
                          <p className="text-xs font-mono text-gray-500">ID: {monthlyAnalysis.highestRevenueDriver.driver_id}</p>
                          <p className="text-2xl font-mono font-black text-brand-red mt-2">
                            ₹{monthlyAnalysis.highestRevenueDriver.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic py-2">No revenue records for selected month</p>
                      )}
                    </div>

                    {/* Top Maintenance Manufacturer */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50/80 to-white border border-amber-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-amber-800">Top Maintenance Manufacturer</span>
                        <Wrench className="w-4 h-4 text-amber-600" />
                      </div>
                      {monthlyAnalysis?.topMaintenanceManufacturer ? (
                        <div>
                          <p className="text-base font-bold text-gray-900">{monthlyAnalysis.topMaintenanceManufacturer.vehicle_brand}</p>
                          <p className="text-2xl font-mono font-black text-amber-600 mt-2">
                            {monthlyAnalysis.topMaintenanceManufacturer.maintenance_count} <span className="text-xs font-normal text-gray-600 font-sans">Incidents</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic py-2">No maintenance events in selected month</p>
                      )}
                    </div>

                    {/* Peak Electricity Consumption */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50/80 to-white border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-blue-800">Peak Electricity Consumption</span>
                        <Zap className="w-4 h-4 text-blue-600" />
                      </div>
                      {monthlyAnalysis?.highestElectricityConsumption ? (
                        <div>
                          <p className="text-base font-bold text-gray-900">Vehicle: {monthlyAnalysis.highestElectricityConsumption.vehicle_id}</p>
                          <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-blue-100">
                            <div>
                              <p className="text-[10px] text-gray-500 font-mono">Energy</p>
                              <p className="text-lg font-mono font-bold text-blue-700">
                                {monthlyAnalysis.highestElectricityConsumption.energy_consumed_kwh} kWh
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 font-mono">Charging Cost</p>
                              <p className="text-lg font-mono font-bold text-gray-900">
                                ₹{monthlyAnalysis.highestElectricityConsumption.charging_cost.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic py-2">No charging data available for this month</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Month Trends (Revenue, Maintenance, Electricity) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Multi-Month Analytics Trends</h3>
                    <p className="text-xs text-gray-500">Historical performance metrics across recent operational months</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-mono font-semibold text-gray-700">Metric Focus:</label>
                    <select
                      value={metricFocus}
                      onChange={(e) => setMetricFocus(e.target.value)}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-900"
                    >
                      <option value="All Metrics">All Metrics (Side-by-Side)</option>
                      <option value="Revenue">Revenue Only</option>
                      <option value="Maintenance Cost">Maintenance Cost Only</option>
                      <option value="Electricity Consumption">Electricity Consumption Only</option>
                    </select>
                  </div>
                </div>

                {/* Fleet Analytics Active Filter Chips Bar */}
                {metricFocus !== 'All Metrics' && (
                  <div className="flex items-center space-x-2 text-xs font-mono px-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3 text-gray-400" /> Active Focus:
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                      <span>{metricFocus}</span>
                      <button onClick={() => setMetricFocus('All Metrics')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                    </span>
                    <button
                      onClick={() => setMetricFocus('All Metrics')}
                      className="text-[11px] font-bold text-brand-red hover:underline cursor-pointer"
                    >
                      Reset Focus
                    </button>
                  </div>
                )}

                <div className={`grid grid-cols-1 ${metricFocus === 'All Metrics' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-5`}>
                  {/* 1. Multi-Month Revenue Trend Line Chart */}
                  {(metricFocus === 'All Metrics' || metricFocus === 'Revenue') && (
                    <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Revenue Trend (Multi-Month)</h3>
                          <p className="text-[11px] text-gray-500">Fleet gross revenue over time (₹)</p>
                        </div>
                        <DollarSign className="w-4 h-4 text-brand-red" />
                      </div>
                      <div className="h-56 w-full">
                        {loadingFleetAnalytics ? (
                          <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={fleetAnalytics?.monthlyTrends || []}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']} />
                              <Line type="monotone" dataKey="revenue" stroke="#E30613" strokeWidth={2.5} dot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. Multi-Month Maintenance Cost Trend Bar Chart */}
                  {(metricFocus === 'All Metrics' || metricFocus === 'Maintenance Cost') && (
                    <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Maintenance Cost Trend</h3>
                          <p className="text-[11px] text-gray-500">Fleet service expenses (₹)</p>
                        </div>
                        <Wrench className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="h-56 w-full">
                        {loadingFleetAnalytics ? (
                          <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fleetAnalytics?.monthlyTrends || []}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Maintenance Cost']} />
                              <Bar dataKey="maintenanceCost" fill="#D97706" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Multi-Month Electricity Consumption Area Chart */}
                  {(metricFocus === 'All Metrics' || metricFocus === 'Electricity Consumption') && (
                    <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Electricity Consumption</h3>
                          <p className="text-[11px] text-gray-500">Total energy consumed (kWh)</p>
                        </div>
                        <Zap className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="h-56 w-full">
                        {loadingFleetAnalytics ? (
                          <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={fleetAnalytics?.monthlyTrends || []}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(val) => [`${val.toLocaleString()} kWh`, 'Energy Consumed']} />
                              <Area type="monotone" dataKey="electricityConsumedKwh" fill="#2563EB" stroke="#1D4ED8" fillOpacity={0.2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* Fleet-Wide CO2 Saved Aggregate Highlight Banner */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-clean-md border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <Leaf className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500 text-white font-bold">
                        Fleet Aggregate CO2 Savings
                      </span>
                    </div>
                    <h3 className="text-2xl font-black font-mono mt-1 text-white">
                      {fleetAnalytics?.fleetCo2Saved?.co2SavedKg?.toLocaleString() || '0'} <span className="text-sm font-normal text-emerald-300">kg CO₂ Saved</span>
                      <span className="text-xs font-mono font-normal text-emerald-400 ml-2">({fleetAnalytics?.fleetCo2Saved?.co2SavedTonnes || '0'} Tonnes)</span>
                    </h3>
                    <p className="text-xs text-emerald-200 mt-1 max-w-xl">
                      {fleetAnalytics?.fleetCo2Saved?.disclaimer || 'Aggregate estimate derived from zero tailpipe EV emissions vs. average petrol vehicle (0.120 kg CO2/km).'}
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 shrink-0 text-right">
                  <p className="text-[10px] font-mono text-emerald-300 uppercase font-bold">Total Monitored Fleet Distance</p>
                  <p className="text-xl font-mono font-bold text-white mt-0.5">
                    {fleetAnalytics?.fleetCo2Saved?.totalDistanceKm?.toLocaleString() || '0'} <span className="text-xs font-normal">km</span>
                  </p>
                </div>
              </div>

              {/* Driver Eco-Score Leaderboard (Top 10) */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Driver Eco-Score Leaderboard (Top 10)</h3>
                      <p className="text-xs text-gray-500">Fleet-wide ranking computed from driving mode telemetry history</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    Top 10 Performers
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-mono uppercase text-[10px]">
                        <th className="pb-2.5 font-semibold">Rank</th>
                        <th className="pb-2.5 font-semibold">Driver Name & ID</th>
                        <th className="pb-2.5 font-semibold">Assigned Vehicle</th>
                        <th className="pb-2.5 font-semibold">Eco-Score</th>
                        <th className="pb-2.5 font-semibold">Efficiency Rating</th>
                        <th className="pb-2.5 font-semibold text-right">Total Distance</th>
                        <th className="pb-2.5 font-semibold text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {fleetAnalytics?.ecoLeaderboard?.map((d, idx) => (
                        <tr key={d.driver_id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3">
                            {idx === 0 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shadow-sm">
                                👑
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center">
                                #{idx + 1}
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <p className="font-bold text-gray-900">{d.driver_name}</p>
                            <p className="text-[10px] text-gray-400">{d.driver_id}</p>
                          </td>
                          <td className="py-3 text-gray-700 font-sans">{d.assigned_vehicle}</td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-gray-900 text-sm">{d.eco_score}</span>
                              <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden border">
                                <div
                                  className={`h-full rounded-full ${d.eco_score >= 80 ? 'bg-emerald-500' : d.eco_score >= 65 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                  style={{ width: `${d.eco_score}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              d.eco_score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {d.scoreLabel}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-gray-900">
                            {d.total_distance_km.toLocaleString()} km
                          </td>
                          <td className="py-3 text-right font-bold text-brand-red">
                            ₹{d.total_revenue.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Driver Behavior — Violations Leaderboard */}
              {/* 
                DATA DEFINITION: Driver Violations Leaderboard
                A "violation" is defined as a telemetry record where:
                1. driving_mode is 'Sport' (aggressive driving), OR
                2. alert_status is anything other than 'Normal'/'OK'/empty (e.g. 'High Temperature', 'Battery Health Warning', etc.)
              */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-brand-red border border-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-[#E30613]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Driver Behavior — Violations Leaderboard</h3>
                      <p className="text-xs text-gray-500">Ranked highest-first (Derived from Sport driving mode & active vehicle alert triggers)</p>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search driver ID or name..."
                      value={violationSearch}
                      onChange={(e) => { setViolationSearch(e.target.value); setViolationPage(1); }}
                      className="w-full sm:w-56 h-8 pl-8 pr-3 text-xs rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                </div>

                {loadingEnhanced ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-mono uppercase text-[10px]">
                          <th className="pb-2.5 font-semibold">Rank</th>
                          <th className="pb-2.5 font-semibold">Driver Name</th>
                          <th className="pb-2.5 font-semibold">Driver ID</th>
                          <th className="pb-2.5 font-semibold">Assigned Vehicle</th>
                          <th className="pb-2.5 font-semibold text-center">Total Violations</th>
                          <th className="pb-2.5 font-semibold">Most Common Violation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {(enhancedAnalytics?.violationsLeaderboard || [])
                          .filter(v => !violationSearch || v.driver_name.toLowerCase().includes(violationSearch.toLowerCase()) || v.driver_id.toLowerCase().includes(violationSearch.toLowerCase()))
                          .slice((violationPage - 1) * 8, violationPage * 8)
                          .map((v, idx) => {
                            const globalRank = (violationPage - 1) * 8 + idx + 1;
                            return (
                              <tr key={v.driver_id} className="hover:bg-red-50/40 transition-colors">
                                <td className="py-3 font-bold text-gray-700">#{globalRank}</td>
                                <td className="py-3 font-bold text-gray-900 font-sans">{v.driver_name}</td>
                                <td className="py-3 text-gray-500">{v.driver_id}</td>
                                <td className="py-3 text-gray-700 font-sans">{v.assigned_vehicle}</td>
                                <td className="py-3 text-center">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                    {v.total_violations}
                                  </span>
                                </td>
                                <td className="py-3 text-gray-600 font-sans font-medium">{v.most_common_violation}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-mono">
                      <span className="text-gray-500">
                        Showing {Math.min((violationPage - 1) * 8 + 1, enhancedAnalytics?.violationsLeaderboard?.length || 0)} - {Math.min(violationPage * 8, enhancedAnalytics?.violationsLeaderboard?.length || 0)} of {enhancedAnalytics?.violationsLeaderboard?.length || 0} Drivers
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          disabled={violationPage <= 1}
                          onClick={() => setViolationPage(p => p - 1)}
                          className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold"
                        >
                          Prev
                        </button>
                        <span>Page {violationPage}</span>
                        <button
                          disabled={violationPage >= Math.ceil((enhancedAnalytics?.violationsLeaderboard?.length || 0) / 8)}
                          onClick={() => setViolationPage(p => p + 1)}
                          className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Full Revenue Leaderboard & Driver Revenue Table */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Revenue by Driver — Full Fleet Standings</h3>
                      <p className="text-xs text-gray-500">Total generated revenue rankings across all drivers in the network</p>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter driver name or ID..."
                      value={revenueSearch}
                      onChange={(e) => setRevenueSearch(e.target.value)}
                      className="w-full sm:w-56 h-8 pl-8 pr-3 text-xs rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                </div>

                {errorEnhanced ? (
                  <div className="p-6 text-center space-y-2.5 font-mono">
                    <p className="text-xs text-red-600 font-bold">Failed to load Revenue Leaderboard ({errorEnhanced})</p>
                    <button
                      onClick={() => fetchEnhancedAnalytics()}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-50 hover:bg-red-100 text-[#E30613] border border-red-200 cursor-pointer transition-colors"
                    >
                      Retry Loading Section
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Top 10 Revenue Bar Chart */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono font-bold text-gray-500 uppercase">Top 10 High-Revenue Drivers (₹)</h4>
                      <div className="h-64 w-full">
                        {loadingEnhanced ? (
                          <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-brand-red animate-spin" /></div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(enhancedAnalytics?.fullDriverRevenue || []).slice(0, 10)}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="driver_name" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Total Revenue']} />
                              <Bar dataKey="total_revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                {/* Full Driver Revenue Table */}
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-gray-200 text-gray-500 font-mono uppercase text-[10px]">
                        <th className="pb-2.5 font-semibold">Rank</th>
                        <th className="pb-2.5 font-semibold">Driver Name</th>
                        <th className="pb-2.5 font-semibold">Driver ID</th>
                        <th className="pb-2.5 font-semibold text-center">Total Trips</th>
                        <th className="pb-2.5 font-semibold text-right">Distance (km)</th>
                        <th className="pb-2.5 font-semibold text-right">Total Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {(enhancedAnalytics?.fullDriverRevenue || [])
                        .filter(r => !revenueSearch || r.driver_name.toLowerCase().includes(revenueSearch.toLowerCase()) || r.driver_id.toLowerCase().includes(revenueSearch.toLowerCase()))
                        .map((r, idx) => (
                          <tr key={r.driver_id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 font-bold text-gray-700">#{idx + 1}</td>
                            <td className="py-2.5 font-bold text-gray-900 font-sans">{r.driver_name}</td>
                            <td className="py-2.5 text-gray-500">{r.driver_id}</td>
                            <td className="py-2.5 text-center font-semibold text-gray-700">{r.total_trips}</td>
                            <td className="py-2.5 text-right font-semibold text-gray-700">{r.total_distance_km.toLocaleString()}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600 text-sm">
                              ₹{r.total_revenue.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

              {/* Charging & Maintenance Expenses — Vehicle-Wise and Brand-Wise */}
              <div className="space-y-6">
                {/* Brand-Wise Expenses Grouped Bar Chart */}
                <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Brand-Wise Charging & Maintenance Expenses</h3>
                        <p className="text-xs text-gray-500">Comparison of total operational costs per manufacturer across fleet</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    {loadingEnhanced ? (
                      <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-brand-red animate-spin" /></div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={enhancedAnalytics?.brandExpenses || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="brand" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(val, name) => [`₹${val.toLocaleString('en-IN')}`, name === 'charging_cost' ? 'Charging Cost' : 'Maintenance Cost']} />
                          <Legend formatter={(value) => value === 'charging_cost' ? 'Charging Cost (₹)' : 'Maintenance Cost (₹)'} />
                          <Bar dataKey="charging_cost" name="charging_cost" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="maintenance_cost" name="maintenance_cost" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Vehicle-Wise Expenses Sortable Table */}
                <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Vehicle-Wise Expense Roster</h3>
                        <p className="text-xs text-gray-500">Detailed breakdown of total charging & maintenance costs summed per vehicle</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <label className="text-gray-500">Sort by:</label>
                      <select
                        value={expenseSortKey}
                        onChange={(e) => {
                          setExpenseSortKey(e.target.value);
                          setExpensePage(1);
                        }}
                        className="h-8 px-2.5 rounded border border-gray-300 font-bold bg-white text-gray-800"
                      >
                        <option value="total_expense">Total Expense</option>
                        <option value="charging_cost">Charging Cost</option>
                        <option value="maintenance_cost">Maintenance Cost</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const allExpenses = (enhancedAnalytics?.vehicleExpenses || []).slice().sort((a, b) => (b[expenseSortKey] || 0) - (a[expenseSortKey] || 0));
                    const expenseLimit = 25;
                    const totalExpensePages = Math.ceil(allExpenses.length / expenseLimit) || 1;
                    const paginatedExpenses = allExpenses.slice((expensePage - 1) * expenseLimit, expensePage * expenseLimit);

                    return (
                      <>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-white z-10">
                              <tr className="border-b border-gray-200 text-gray-500 font-mono uppercase text-[10px]">
                                <th className="pb-2.5 font-semibold">Vehicle ID</th>
                                <th className="pb-2.5 font-semibold">Brand & Model</th>
                                <th className="pb-2.5 font-semibold text-right">Charging Cost (₹)</th>
                                <th className="pb-2.5 font-semibold text-right">Maintenance Cost (₹)</th>
                                <th className="pb-2.5 font-semibold text-right">Total Expense (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                              {paginatedExpenses.map((v) => (
                                <tr key={v.vehicle_id} className="hover:bg-gray-50 transition-colors">
                                  <td className="py-2.5 font-bold text-gray-900">{v.vehicle_id}</td>
                                  <td className="py-2.5 text-gray-800 font-sans font-medium">{v.vehicle_brand} {v.vehicle_model}</td>
                                  <td className="py-2.5 text-right text-blue-600 font-semibold">₹{v.charging_cost.toLocaleString('en-IN')}</td>
                                  <td className="py-2.5 text-right text-amber-600 font-semibold">₹{v.maintenance_cost.toLocaleString('en-IN')}</td>
                                  <td className="py-2.5 text-right font-bold text-gray-900 text-sm">₹{v.total_expense.toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs font-mono text-gray-500">
                          <div>
                            Showing <span className="font-bold text-gray-900">{paginatedExpenses.length > 0 ? (expensePage - 1) * expenseLimit + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(expensePage * expenseLimit, allExpenses.length)}</span> of <span className="font-bold text-gray-900">{allExpenses.length}</span> vehicles
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              disabled={expensePage <= 1}
                              onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                              className="px-2.5 py-1 rounded border border-gray-300 font-bold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Previous
                            </button>
                            <span className="font-bold text-gray-900">Page {expensePage} of {totalExpensePages}</span>
                            <button
                              disabled={expensePage >= totalExpensePages}
                              onClick={() => setExpensePage(p => Math.min(totalExpensePages, p + 1))}
                              className="px-2.5 py-1 rounded border border-gray-300 font-bold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: VEHICLES */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6">
              
              {/* Cohesive Vehicles Search & Filter Console Panel */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#F8F9FA] border border-gray-200/90 shadow-clean-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-200/70">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-100/80 text-brand-red flex items-center justify-center border border-red-200/60 shadow-clean-xs">
                      <Filter className="w-4 h-4 text-[#E30613]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base font-bold text-gray-900">Fleet Live Telemetry Roster</h2>
                        {(searchQuery || statusFilter !== 'All' || brandFilter !== 'All' || modelFilter !== 'All' || yearFilter !== 'All' || maintStatusFilter !== 'All' || chargingStatusFilter !== 'All') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono text-white bg-[#E30613] shadow-sm">
                            {[
                              searchQuery ? 1 : 0,
                              statusFilter !== 'All' ? 1 : 0,
                              brandFilter !== 'All' ? 1 : 0,
                              modelFilter !== 'All' ? 1 : 0,
                              yearFilter !== 'All' ? 1 : 0,
                              maintStatusFilter !== 'All' ? 1 : 0,
                              chargingStatusFilter !== 'All' ? 1 : 0,
                            ].reduce((a, b) => a + b, 0)} Active Filters
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Real-time status joined with active driver telemetry</p>
                    </div>
                  </div>

                  {(searchQuery || statusFilter !== 'All' || brandFilter !== 'All' || modelFilter !== 'All' || yearFilter !== 'All' || maintStatusFilter !== 'All' || chargingStatusFilter !== 'All') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('All');
                        setBrandFilter('All');
                        setModelFilter('All');
                        setYearFilter('All');
                        setRouteTypeFilter('All');
                        setMaintStatusFilter('All');
                        setChargingStatusFilter('All');
                      }}
                      className="text-xs font-bold text-[#E30613] hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer transition-colors self-start md:self-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear All Filters</span>
                    </button>
                  )}
                </div>

                {/* Filter Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
                  {/* Search Box */}
                  <div className="relative col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search ID, brand..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-gray-300 bg-white font-medium text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative">
                    <Activity className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full h-9 pl-8 pr-7 text-xs font-mono font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all cursor-pointer appearance-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Working">Working</option>
                      <option value="Garage">Garage</option>
                      <option value="Charging">Charging</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Brand Dropdown */}
                  <div className="relative">
                    <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={brandFilter}
                      onChange={(e) => {
                        setBrandFilter(e.target.value);
                        setModelFilter('All');
                      }}
                      className="w-full h-9 pl-8 pr-7 text-xs font-mono font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all cursor-pointer appearance-none"
                    >
                      <option value="All">All Brands</option>
                      {filterOptions.brands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Model Dropdown */}
                  <div className="relative">
                    <Car className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={modelFilter}
                      onChange={(e) => setModelFilter(e.target.value)}
                      className="w-full h-9 pl-8 pr-7 text-xs font-mono font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all cursor-pointer appearance-none"
                    >
                      <option value="All">All Models</option>
                      {filterOptions.models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Manufacturing Year Dropdown */}
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="w-full h-9 pl-8 pr-7 text-xs font-mono font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all cursor-pointer appearance-none"
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Maintenance Dropdown */}
                  <div className="relative">
                    <Wrench className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={maintStatusFilter}
                      onChange={(e) => setMaintStatusFilter(e.target.value)}
                      className="w-full h-9 pl-8 pr-7 text-xs font-mono font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all cursor-pointer appearance-none"
                    >
                      <option value="All">All Maintenance</option>
                      {filterOptions.maintenanceStatuses.map((ms) => (
                        <option key={ms} value={ms}>{ms}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Charging State Dropdown */}
                  <div className="relative">
                    <Zap className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={chargingStatusFilter}
                      onChange={(e) => setChargingStatusFilter(e.target.value)}
                      className="w-full h-9 pl-8 pr-7 text-xs font-mono font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-all cursor-pointer appearance-none"
                    >
                      <option value="All">All Charging States</option>
                      {filterOptions.chargingStatuses.map((cs) => (
                        <option key={cs} value={cs}>{cs}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Active Filter Chips */}
                {(searchQuery || statusFilter !== 'All' || brandFilter !== 'All' || modelFilter !== 'All' || yearFilter !== 'All' || routeTypeFilter !== 'All' || maintStatusFilter !== 'All' || chargingStatusFilter !== 'All') && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/80 text-xs font-mono">
                    <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3 text-[#E30613]" /> Active Filters:
                    </span>
                    {searchQuery && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E30613] font-semibold border border-red-200 shadow-clean-xs">
                        <span>Search: "{searchQuery}"</span>
                        <button onClick={() => setSearchQuery('')} className="hover:text-red-900 ml-1 cursor-pointer font-bold">✕</button>
                      </span>
                    )}
                    {statusFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E30613] font-semibold border border-red-200 shadow-clean-xs">
                        <span>Status: {statusFilter}</span>
                        <button onClick={() => setStatusFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer font-bold">✕</button>
                      </span>
                    )}
                    {brandFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E30613] font-semibold border border-red-200 shadow-clean-xs">
                        <span>Brand: {brandFilter}</span>
                        <button onClick={() => setBrandFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer font-bold">✕</button>
                      </span>
                    )}
                    {modelFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E30613] font-semibold border border-red-200 shadow-clean-xs">
                        <span>Model: {modelFilter}</span>
                        <button onClick={() => setModelFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer font-bold">✕</button>
                      </span>
                    )}
                    {yearFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E30613] font-semibold border border-red-200 shadow-clean-xs">
                        <span>Year: {yearFilter}</span>
                        <button onClick={() => setYearFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer font-bold">✕</button>
                      </span>
                    )}
                    {routeTypeFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E30613] font-semibold border border-red-200 shadow-clean-xs">
                        <span>Route: {routeTypeFilter}</span>
                        <button onClick={() => setRouteTypeFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer font-bold">✕</button>
                      </span>
                    )}
                    {maintStatusFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E30613] font-semibold border border-red-200 shadow-clean-xs">
                        <span>Maintenance: {maintStatusFilter}</span>
                        <button onClick={() => setMaintStatusFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer font-bold">✕</button>
                      </span>
                    )}
                    {chargingStatusFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E30613] font-semibold border border-red-200 shadow-clean-xs">
                        <span>Charging: {chargingStatusFilter}</span>
                        <button onClick={() => setChargingStatusFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer font-bold">✕</button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Vehicle Details Table Container */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">


                {/* Table Content */}
                {loadingVehicles ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                    <span className="ml-2 text-xs font-mono text-gray-500">Querying live vehicle database...</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 font-mono uppercase text-[10px]">
                            <th className="pb-2.5 font-semibold">Vehicle & Model</th>
                            <th className="pb-2.5 font-semibold">Year</th>
                            <th className="pb-2.5 font-semibold">Battery %</th>
                            <th className="pb-2.5 font-semibold">Location</th>
                            <th className="pb-2.5 font-semibold">Route Type</th>
                            <th className="pb-2.5 font-semibold">Status</th>
                            <th className="pb-2.5 font-semibold">Driver</th>
                            <th className="pb-2.5 font-semibold">Charging</th>
                            <th className="pb-2.5 font-semibold">Maintenance</th>
                            <th className="pb-2.5 font-semibold text-right">Inspect</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedVehicles.map((v) => (
                            <tr key={v.vehicle_id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-3">
                                <p className="font-bold text-gray-900 font-mono">{v.vehicle_id}</p>
                                <p className="text-[11px] text-gray-500">{v.vehicle_brand} {v.vehicle_model}</p>
                              </td>

                              <td className="py-3 font-mono text-[11px] text-gray-700">
                                {v.manufacturing_year || 'N/A'}
                              </td>

                              <td className="py-3">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-gray-900">{v.battery_percent}%</span>
                                  <div className="w-12 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        v.battery_percent > 50 ? 'bg-emerald-600' : v.battery_percent > 25 ? 'bg-amber-500' : 'bg-brand-red'
                                      }`}
                                      style={{ width: `${Math.min(v.battery_percent, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 font-mono text-[11px] text-gray-700">
                                {v.latitude && v.longitude ? `${v.latitude}, ${v.longitude}` : 'N/A'}
                              </td>

                              <td className="py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  v.route_type === 'City' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                  {v.route_type || 'N/A'}
                                </span>
                              </td>

                              <td className="py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getStatusBadgeClass(v.vehicle_status)}`}>
                                  {v.vehicle_status}
                                </span>
                              </td>

                              <td className="py-3 font-semibold text-gray-800">
                                {v.driver_name}
                              </td>

                              <td className="py-3 text-[11px] text-gray-600 font-mono">
                                {v.charging_status}
                              </td>

                              <td className="py-3 text-[11px] text-gray-600">
                                {v.maintenance_status}
                              </td>

                              <td className="py-3 text-right">
                                <button
                                  onClick={() => setSelectedVehicle(v)}
                                  className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-[11px] transition-colors cursor-pointer"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}

                          {paginatedVehicles.length === 0 && (
                            <tr>
                              <td colSpan="10" className="text-center py-8 text-gray-500 text-xs">
                                No vehicles found matching search criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalVehicles > 0 && (

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 text-xs font-mono">
                        <div className="text-gray-500">
                          Showing <span className="font-bold text-gray-900">{startIndex + 1}</span>–
                          <span className="font-bold text-gray-900">{Math.min(startIndex + ITEMS_PER_PAGE, totalVehicles)}</span> of{' '}
                          <span className="font-bold text-gray-900">{totalVehicles}</span> vehicles
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            ‹ Previous
                          </button>

                          {getPageNumbers().map((item, idx) => {
                            if (item === '...') {
                              return (
                                <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 font-bold">
                                  …
                                </span>
                              );
                            }
                            const isActive = item === currentPage;
                            return (
                              <button
                                key={item}
                                onClick={() => setCurrentPage(item)}
                                className={`w-7 h-7 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-brand-red text-white shadow-sm'
                                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            Next ›
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Fleet-Wide Interactive Leaflet Map Card (Synced with Vehicle Filters) */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Fleet Live Location Map</h3>
                      <p className="text-xs text-gray-500">Interactive map synced with active vehicle search/filters</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-mono font-semibold">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1.5" /> Working</span>
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5" /> Garage</span>
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-1.5" /> Charging</span>
                  </div>
                </div>

                <FleetLocationMap vehicles={paginatedVehicles} onSelectVehicle={(v) => setSelectedVehicle(v)} />
              </div>

            </div>
          )}

          {/* TAB 4: DRIVERS */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Fleet Driver Roster & Analytics</h2>
                    <p className="text-xs text-gray-500">Server-side paginated list of registered fleet drivers</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search driver name, ID, license..."
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        className="w-full sm:w-56 py-1.5 pl-9 pr-3 corporate-input text-xs"
                      />
                    </div>

                    {/* Experience Filter */}
                    <select
                      value={driverExpFilter}
                      onChange={(e) => {
                        setDriverExpFilter(e.target.value);
                        setDriverPage(1);
                      }}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-800 bg-white"
                    >
                      <option value="All">All Experience</option>
                      <option value="0-2">0–2 yrs</option>
                      <option value="3-5">3–5 yrs</option>
                      <option value="6-10">6–10 yrs</option>
                      <option value="10+">10+ yrs</option>
                      <option value="unspecified">Unspecified (Not provided)</option>
                    </select>

                    {/* Assigned Brand Filter */}
                    <select
                      value={driverBrandFilter}
                      onChange={(e) => {
                        setDriverBrandFilter(e.target.value);
                        setDriverPage(1);
                      }}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-800 bg-white"
                    >
                      <option value="All">All Assigned Brands</option>
                      {filterOptions.brands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>

                    {/* Sort By Dropdown */}
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={driverSortBy}
                        onChange={(e) => setDriverSortBy(e.target.value)}
                        className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-800 bg-white"
                      >
                        <option value="driver_name">Sort: Name</option>
                        <option value="total_distance_km">Sort: Total Distance</option>
                        <option value="total_revenue">Sort: Total Revenue</option>
                        <option value="eco_score">Sort: Eco-Score</option>
                        <option value="driver_years_of_experience">Sort: Experience</option>
                      </select>

                      <button
                        onClick={() => setDriverSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                        className="p-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                        title={`Order: ${driverSortOrder.toUpperCase()}`}
                      >
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Drivers Active Filter Chips Bar */}
                {(driverSearch || driverExpFilter !== 'All' || driverBrandFilter !== 'All') && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs font-mono">
                    <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3 text-gray-400" /> Active Filters:
                    </span>
                    {driverSearch && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Search: "{driverSearch}"</span>
                        <button onClick={() => setDriverSearch('')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    {driverExpFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Experience: {driverExpFilter === 'unspecified' ? 'Unspecified' : `${driverExpFilter} yrs`}</span>
                        <button onClick={() => setDriverExpFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    {driverBrandFilter !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Brand: {driverBrandFilter}</span>
                        <button onClick={() => setDriverBrandFilter('All')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setDriverSearch('');
                        setDriverExpFilter('All');
                        setDriverBrandFilter('All');
                        setDriverPage(1);
                      }}
                      className="text-[11px] font-bold text-brand-red hover:underline ml-1 cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}


                {/* Table Content */}
                {loadingDrivers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                    <span className="ml-2 text-xs font-mono text-gray-500">Loading server-side driver roster...</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 font-mono uppercase text-[10px]">
                            <th className="pb-2.5 font-semibold">Driver ID & Name</th>
                            <th className="pb-2.5 font-semibold">Assigned Vehicle</th>
                            <th className="pb-2.5 font-semibold text-right">Total Distance</th>
                            <th className="pb-2.5 font-semibold text-right">Total Revenue</th>
                            <th className="pb-2.5 font-semibold">Eco-Score</th>
                            <th className="pb-2.5 font-semibold">License Number</th>
                            <th className="pb-2.5 font-semibold text-center">Experience</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {driversResponse.drivers.map((d) => (
                            <tr key={d.driver_id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3">
                                <p className="font-bold text-gray-900 font-mono">{d.driver_name}</p>
                                <p className="text-[11px] text-gray-500 font-mono">{d.driver_id}</p>
                              </td>

                              <td className="py-3 font-semibold text-gray-800">
                                {d.assigned_vehicle}
                              </td>

                              <td className="py-3 text-right font-mono font-bold text-gray-900">
                                {d.total_distance_km.toLocaleString()} km
                              </td>

                              <td className="py-3 text-right font-mono font-bold text-brand-red">
                                ₹{d.total_revenue.toLocaleString('en-IN')}
                              </td>

                              <td className="py-3">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-gray-900">{d.eco_score}</span>
                                  <div className="w-12 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        d.eco_score >= 80 ? 'bg-emerald-600' : d.eco_score >= 65 ? 'bg-blue-500' : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${d.eco_score}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 font-mono text-[11px] text-gray-600">
                                {d.driver_licence_number || 'Unspecified'}
                              </td>

                              <td className="py-3 text-center font-mono font-bold text-gray-700">
                                {d.driver_years_of_experience != null ? `${d.driver_years_of_experience} yrs` : <span className="text-gray-400 font-normal italic">Unspecified</span>}
                              </td>
                            </tr>
                          ))}


                          {driversResponse.drivers.length === 0 && (
                            <tr>
                              <td colSpan="7" className="text-center py-8 text-gray-500 text-xs">
                                No drivers found matching search criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Server-Side Pagination Controls */}
                    {driversResponse.drivers.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 text-xs font-mono">
                        <div className="text-gray-500">
                          Showing page <span className="font-bold text-gray-900">{driversResponse.page}</span> of{' '}
                          <span className="font-bold text-gray-900">{driversResponse.totalPages}</span> ({driversResponse.totalCount} total drivers)
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setDriverPage((prev) => Math.max(prev - 1, 1))}
                            disabled={driversResponse.page === 1}
                            className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            ‹ Previous Page
                          </button>

                          <button
                            onClick={() => setDriverPage((prev) => Math.min(prev + 1, driversResponse.totalPages))}
                            disabled={driversResponse.page >= driversResponse.totalPages}
                            className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            Next Page ›
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: ADMIN MANAGEMENT */}
          {activeTab === 'admin-management' && (
            <div className="space-y-6">
              
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">System Admin Roster</h2>
                    <p className="text-xs text-gray-500">Authorized fleet administrators with full portal permissions</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Admin Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search admin ID or name..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full sm:w-48 py-1.5 pl-9 pr-3 corporate-input text-xs"
                      />
                    </div>

                    {/* Date Range Filter */}
                    <select
                      value={adminDateRange}
                      onChange={(e) => setAdminDateRange(e.target.value)}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-800 bg-white"
                    >
                      <option value="all">All Created Dates</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                    </select>

                    <button
                      onClick={() => setIsAddAdminOpen(true)}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-red text-white text-xs font-bold hover:bg-brand-red-hover transition-colors shadow-sm cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Add New Admin</span>
                    </button>
                  </div>
                </div>

                {/* Admin Active Filter Chips Bar */}
                {(adminSearch || adminDateRange !== 'all') && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs font-mono">
                    <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3 text-gray-400" /> Active Filters:
                    </span>
                    {adminSearch && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Search: "{adminSearch}"</span>
                        <button onClick={() => setAdminSearch('')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    {adminDateRange !== 'all' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Created: {adminDateRange === 'last7' ? 'Last 7 Days' : 'Last 30 Days'}</span>
                        <button onClick={() => setAdminDateRange('all')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setAdminSearch('');
                        setAdminDateRange('all');
                      }}
                      className="text-[11px] font-bold text-brand-red hover:underline ml-1 cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}


                {loadingAdmins ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                    <span className="ml-2 text-xs font-mono text-gray-500">Fetching admin list...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-mono uppercase text-[10px]">
                          <th className="pb-2.5 font-semibold">Admin ID</th>
                          <th className="pb-2.5 font-semibold">Full Name</th>
                          <th className="pb-2.5 font-semibold">Created Date</th>
                          <th className="pb-2.5 font-semibold">Status</th>
                          <th className="pb-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {adminList
                          .filter((a) => {
                            if (!adminSearch.trim()) return true;
                            const q = adminSearch.toLowerCase();
                            return (
                              a.admin_id.toLowerCase().includes(q) ||
                              (a.admin_name && a.admin_name.toLowerCase().includes(q))
                            );
                          })
                          .map((adm) => {
                            const isSelf = (adm.admin_id === (currentUser?.adminId || currentUser?.admin_id));
                            return (
                              <tr key={adm.admin_id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 font-bold text-gray-900">
                                  {adm.admin_id}
                                </td>
                                <td className="py-3 font-sans font-semibold text-gray-800">
                                  <div className="flex items-center space-x-2.5">
                                    <AdminAvatar name={adm.admin_name} id={adm.admin_id} size="sm" />
                                    <span>{adm.admin_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 text-gray-500">
                                  {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Active Admin
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  {isSelf ? (
                                    <span className="text-[11px] text-gray-400 font-mono italic bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
                                      Current User
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setAdminToDelete(adm)}
                                      className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-brand-red font-semibold text-xs border border-red-200 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                                      title="Remove Admin Account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Remove</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                        {adminList.filter((a) => {
                          if (!adminSearch.trim()) return true;
                          const q = adminSearch.toLowerCase();
                          return a.admin_id.toLowerCase().includes(q) || (a.admin_name && a.admin_name.toLowerCase().includes(q));
                        }).length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-gray-500 text-xs font-mono">
                              No admin accounts found matching "{adminSearch}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Modal: Remove Admin Confirmation */}
          {adminToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={() => setAdminToDelete(null)} className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" />
              <div className="relative w-full max-w-md p-6 rounded-xl bg-white text-gray-900 shadow-2xl z-10 border border-gray-200">
                <button
                  onClick={() => setAdminToDelete(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red border border-red-200 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Remove Admin Account</h3>
                    <p className="text-xs text-gray-500">Security & permission revocation</p>
                  </div>
                </div>

                <div className="p-3 bg-red-50/70 border border-red-100 rounded-lg my-4 text-xs text-gray-800 leading-relaxed font-sans">
                  Are you sure you want to remove <strong className="text-brand-red font-bold">{adminToDelete.admin_name}</strong> (<span className="font-mono font-bold">{adminToDelete.admin_id}</span>)? This action cannot be undone.
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdminToDelete(null)}
                    disabled={removeAdminLoading}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAdminSubmit}
                    disabled={removeAdminLoading}
                    className="px-4 py-2 rounded-lg bg-brand-red text-white text-xs font-bold hover:bg-brand-red-hover flex items-center space-x-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    {removeAdminLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Remove</span>
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Modal: Add Admin Form */}
      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddAdminOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md p-6 rounded-xl bg-white text-gray-900 shadow-2xl z-10 border border-gray-200">
            <button
              onClick={() => setIsAddAdminOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-brand-red border border-red-200 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create New Fleet Admin</h3>
                <p className="text-xs text-gray-500">Authorized creation of admin credentials</p>
              </div>
            </div>

            {adminFormError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {adminFormError}
              </div>
            )}

            {adminFormSuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                {adminFormSuccess}
              </div>
            )}

            <form onSubmit={handleAddAdminSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-gray-700 mb-1">
                  Admin Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={adminFormData.admin_name}
                  onChange={(e) => setAdminFormData((p) => ({ ...p, admin_name: e.target.value }))}
                  className="w-full py-2 px-3 corporate-input text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase font-bold text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData((p) => ({ ...p, password: e.target.value }))}
                  className="w-full py-2 px-3 corporate-input text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminFormLoading}
                  className="px-4 py-2 rounded-lg bg-brand-red text-white text-xs font-bold hover:bg-brand-red-hover flex items-center space-x-1.5 cursor-pointer"
                >
                  {adminFormLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Vehicle Detail Drawer (Right-side slide-over panel) */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={() => setSelectedVehicle(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col justify-between animate-slideInRight text-gray-900 z-50">
              
              {/* Drawer Header */}
              <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/60 flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-red-50 text-brand-red border border-red-200 flex items-center justify-center shadow-sm">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 font-sans">
                      {selectedVehicle.vehicle_brand} {selectedVehicle.vehicle_model}
                    </h3>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                      Vehicle ID: <span className="font-bold text-gray-800">{selectedVehicle.vehicle_id}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body - Scrollable Vehicle Details */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 font-sans">
                <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Live Status</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-bold border ${getStatusBadgeClass(selectedVehicle.vehicle_status)}`}>
                        {selectedVehicle.vehicle_status}
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        • {selectedVehicle.location_type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Assigned Driver</p>
                    <p className="text-xs font-semibold text-white mt-0.5">{selectedVehicle.driver_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-bold mb-1">
                      <span>Battery Level</span>
                      <Battery className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">{selectedVehicle.battery_percent}%</p>
                    <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full ${
                          selectedVehicle.battery_percent > 50
                            ? 'bg-emerald-600'
                            : selectedVehicle.battery_percent > 25
                            ? 'bg-amber-500'
                            : 'bg-brand-red'
                        }`}
                        style={{ width: `${Math.min(selectedVehicle.battery_percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-bold mb-1">
                      <span>Location Sector</span>
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">{selectedVehicle.location_type}</p>
                    <p className="text-[10px] text-gray-500 mt-1 font-sans">
                      {selectedVehicle.location_type === 'City' ? 'Urban Route' : 'Interstate Transit'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-bold mb-1">
                      <span>Charging Status</span>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">{selectedVehicle.charging_status}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-bold mb-1">
                      <span>Maintenance</span>
                      <Wrench className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">{selectedVehicle.maintenance_status}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Vehicle ID</span>
                    <span className="font-bold text-slate-800">{selectedVehicle.vehicle_id}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Brand & Model</span>
                    <span className="font-bold text-slate-800">
                      {selectedVehicle.vehicle_brand} {selectedVehicle.vehicle_model}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Driver Name</span>
                    <span className="font-bold text-slate-800">{selectedVehicle.driver_name}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">GPS Coordinates</span>
                    <span className="font-bold text-slate-800">
                      {selectedVehicle.latitude && selectedVehicle.longitude
                        ? `${selectedVehicle.latitude}, ${selectedVehicle.longitude}`
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Telemetry Stream</span>
                    <span className="font-bold text-emerald-600 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" /> Live Signal
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close Panel
                </button>
                <button
                  onClick={() => {
                    showToast(`CAN-Bus Diagnostic requested for ${selectedVehicle.vehicle_id}`, 'info');
                  }}
                  className="px-4 py-2 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Send CAN Diagnostic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
