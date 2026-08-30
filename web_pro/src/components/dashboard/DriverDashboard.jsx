import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import {
  Car,
  Zap,
  Gauge,
  MapPin,
  Wind,
  Navigation,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  IndianRupee,
  Clock,
  BatteryCharging,
  Info,
  Calendar,
  Activity,
  Maximize2,
  X,
  User,
  Sliders,
  Leaf,
  Trees,
  Award,
  Download,
  FileText,
  Settings,
  Lock,
  Key,
  Phone,
  Mail,
  CheckCircle,
  LayoutDashboard,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getVehicleImage } from '../../utils/vehicleImageMap';
import { KmRangePrediction } from './KmRangePrediction';

// Fix default Leaflet marker icons in Vite with bundled local assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

/**
 * Sub-component to render interactive Leaflet map
 */
const LocationMap = ({ lat, lng, locationName, destinationName, stations = [] }) => {
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || isNaN(lat) || isNaN(lng)) return;

    if (leafletMapInstance.current) {
      leafletMapInstance.current.remove();
      leafletMapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 12,
      zoomControl: true,
    });

    leafletMapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Vehicle custom marker (red pin)
    const vehicleIcon = L.divIcon({
      className: 'custom-vehicle-pin',
      html: `<div style="background-color: #E30613; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">🚗</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const vehicleMarker = L.marker([lat, lng], { icon: vehicleIcon }).addTo(map);
    const popupContent = `
      <div style="font-family: monospace; font-size: 11px; line-height: 1.4;">
        <strong style="color: #E30613;">Vehicle Position</strong><br/>
        <span>Loc: ${locationName || 'Current Location'}</span><br/>
        <span>Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
        ${destinationName ? `<br/><span style="color:#4B5563;">Dest: ${destinationName}</span>` : ''}
      </div>
    `;
    vehicleMarker.bindPopup(popupContent);

    // Charging Stations custom marker (green pin)
    const stationIcon = L.divIcon({
      className: 'custom-station-pin',
      html: `<div style="background-color: #059669; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">⚡</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    if (Array.isArray(stations) && stations.length > 0) {
      stations.forEach((st) => {
        if (st.latitude != null && st.longitude != null && !isNaN(st.latitude) && !isNaN(st.longitude)) {
          const stMarker = L.marker([st.latitude, st.longitude], { icon: stationIcon }).addTo(map);
          stMarker.bindPopup(`
            <div style="font-family: monospace; font-size: 11px; line-height: 1.4;">
              <strong style="color: #059669;">⚡ ${st.name}</strong><br/>
              <span>${st.address}</span><br/>
              ${st.distance ? `<span style="font-weight: bold; color: #1E293B;">Distance: ${st.distance}</span><br/>` : ''}
              <span>Points: ${st.numPoints || 1} available</span>
            </div>
          `);
        }
      });
    }

    return () => {
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, [lat, lng, locationName, destinationName, stations]);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200 shadow-inner my-2 relative z-0">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export const DriverDashboard = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState('');
  const [activeTelemetry, setActiveTelemetry] = useState(null);

  // Dashboard Multi-Filter States
  const [chartTimeRange, setChartTimeRange] = useState('Full Year'); // 'Full Year' | 'Last 6 Months' | 'Last 3 Months'
  const [tripDateRange, setTripDateRange] = useState('All'); // 'All' | 'This Month' | 'Last 3 Months'
  const [tripRouteType, setTripRouteType] = useState('All'); // 'All' | 'City' | 'Highway' | 'Mixed'
  const [ecoTimeRange, setEcoTimeRange] = useState('All Time'); // 'All Time' | 'This Month' | 'Last 3 Months'

  // Nearby Charging Stations Hooks
  const [chargingStations, setChargingStations] = useState([]);

  const [chargingLoading, setChargingLoading] = useState(false);
  const [chargingError, setChargingError] = useState(null);

  // Eco Stats Hooks
  const [ecoStats, setEcoStats] = useState(null);
  const [ecoStatsLoading, setEcoStatsLoading] = useState(false);

  // Proactive Alert Banner & Account Settings State
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [isProfileBannerDismissed, setIsProfileBannerDismissed] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile'); // 'profile' | 'specs' | 'photo' | 'password'

  const [profileMobile, setProfileMobile] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [licenceNo, setLicenceNo] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Extended Vehicle Specifications Form States
  const [specWeight, setSpecWeight] = useState('');
  const [specLength, setSpecLength] = useState('');
  const [specWidth, setSpecWidth] = useState('');
  const [specHeight, setSpecHeight] = useState('');
  const [specWheelbase, setSpecWheelbase] = useState('');
  const [specGrossWeight, setSpecGrossWeight] = useState('');
  const [specPayload, setSpecPayload] = useState('');
  const [specCargoVol, setSpecCargoVol] = useState('');
  const [specTorque, setSpecTorque] = useState('');
  const [specMotorPower, setSpecMotorPower] = useState('');
  const [specPassengerCap, setSpecPassengerCap] = useState('');
  const [specsSaving, setSpecsSaving] = useState(false);

  // Vehicle Photo Upload States
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Active Tab Switcher State (overview | vehicle | location | driver | settings)
  const [activeTab, setActiveTab] = useState('overview');

  const activeDriverId = currentUser?.driverId || currentUser?.driver_id || 'DRV-2025-00001';

  // 1. Fetch Driver Dashboard Telemetry
  const fetchDashboardData = (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);

    fetch(`http://localhost:4000/api/driver/dashboard?driverId=${encodeURIComponent(activeDriverId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load driver dashboard data');
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        if (resData.driver) {
          setProfileMobile(resData.driver.driver_mobile_number || '');
          setProfileEmail(resData.driver.driver_email || '');
          setLicenceNo(resData.driver.driver_licence_number || '');
          setYearsExp(resData.driver.driver_years_of_experience || '');
        }
        if (resData.vehicle) {
          setSpecWeight(resData.vehicle.weight_kg ?? '');
          setSpecLength(resData.vehicle.length_mm ?? '');
          setSpecWidth(resData.vehicle.width_mm ?? '');
          setSpecHeight(resData.vehicle.height_mm ?? '');
          setSpecWheelbase(resData.vehicle.wheel_base_mm ?? '');
          setSpecGrossWeight(resData.vehicle.gross_vehicle_weight_kg ?? '');
          setSpecPayload(resData.vehicle.maximum_payload_kg ?? '');
          setSpecCargoVol(resData.vehicle.cargo_volume_l ?? '');
          setSpecTorque(resData.vehicle.torque ?? '');
          setSpecMotorPower(resData.vehicle.motor_power_kw ?? '');
          setSpecPassengerCap(resData.vehicle.max_passenger_capacity ?? '');
        }
        if (resData.monthlyRecords && resData.monthlyRecords.length > 0) {
          setSelectedMonthKey(resData.monthlyRecords[0].key);
          setActiveTelemetry(resData.monthlyRecords[0].telemetry);
        } else {
          setActiveTelemetry(resData.latestTelemetry);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Driver dashboard fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, [activeDriverId]);


  // 2. Fetch Driver Eco Stats
  useEffect(() => {
    let isMounted = true;
    setEcoStatsLoading(true);

    fetch(`http://localhost:4000/api/driver/eco-stats?driverId=${encodeURIComponent(activeDriverId)}`)
      .then((res) => res.json())
      .then((resData) => {
        if (isMounted) {
          setEcoStats(resData);
          setEcoStatsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching driver eco stats:', err);
          setEcoStats(null);
          setEcoStatsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeDriverId]);

  // Compute current coordinates safely
  const latest = activeTelemetry || data?.latestTelemetry || {};
  const lat = latest.latitude != null ? Number(latest.latitude) : 13.0827;
  const lng = latest.longitude != null ? Number(latest.longitude) : 80.2707;

  // 3. Fetch Nearby Charging Stations (On-demand for active location/overview tab)
  useEffect(() => {
    if (!data || isNaN(lat) || isNaN(lng)) return;
    if (activeTab !== 'location' && activeTab !== 'overview') return;

    let isMounted = true;
    setChargingLoading(true);
    setChargingError(null);

    fetch(`http://localhost:4000/api/driver/nearby-charging?lat=${lat}&lng=${lng}`)
      .then((res) => res.json())
      .then((resData) => {
        if (isMounted) {
          if (resData.stations && resData.stations.length > 0) {
            setChargingStations(resData.stations);
            setChargingError(null);
          } else {
            setChargingStations([]);
            setChargingError(resData.error || resData.message || 'No charging stations found nearby');
          }
          setChargingLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching nearby charging stations:', err);
          setChargingStations([]);
          setChargingError('Unable to load charging stations right now');
          setChargingLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [data, lat, lng]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleMonthChange = (monthKey) => {
    setSelectedMonthKey(monthKey);
    const found = data?.monthlyRecords?.find((m) => m.key === monthKey);
    if (found?.telemetry) {
      setActiveTelemetry(found.telemetry);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(227, 6, 19); // VoltTrack Brand Red
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('VOLTTRACK EV FLEET MONITORING REPORT', 14, 15);

      // Metadata Section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Driver: ${driver?.driver_name || 'Driver'} (${driver?.driver_id || activeDriverId})`, 14, 32);
      doc.text(`Vehicle: ${vehicle?.vehicle_brand || 'EV'} ${vehicle?.vehicle_model || ''} (${vehicle?.car_reg_no || 'N/A'})`, 14, 38);

      const currentMonthLabel = monthlyRecords?.find((m) => m.key === selectedMonthKey)?.label || 'Latest Reading';
      doc.text(`Report Period / Filter: ${currentMonthLabel}`, 14, 44);
      doc.text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 50);

      // Selected Month / Latest Telemetry Summary Box
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 55, 182, 22, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 55, 182, 22, 'S');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Est. Battery SOC: ${latest?.soc_percent || 0}%`, 18, 62);
      doc.text(`Est. Range: ${latest?.range_km || 0} km`, 75, 62);
      doc.text(`Odometer: ${latest?.odometer_km ? Number(latest.odometer_km).toLocaleString() : 0} km`, 135, 62);

      doc.text(`Trip Distance: ${latest?.trip_distance_km || 0} km`, 18, 70);
      doc.text(`Gross Revenue: INR ${latest?.trip_revenue ? Number(latest.trip_revenue).toLocaleString() : 0}`, 75, 70);
      doc.text(`Net Revenue: INR ${latest?.net_revenue_inr ? Number(latest.net_revenue_inr).toLocaleString() : 0}`, 135, 70);

      // Trip History Table Section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Individual Telemetry & Trip History Log', 14, 86);

      const logRecords = data?.allTelemetryLogs || history || [];
      const tableData = logRecords.map((rec) => [
        rec.timestamp ? new Date(rec.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        rec.location || 'Depot',
        rec.destination_location || 'Not Specified',
        rec.route_type || 'City',
        `${rec.trip_distance_km || 0} km`,
        `${rec.soc_percent || 0}%`,
        rec.vehicle_status || 'Parked',
        `INR ${rec.trip_revenue ? Number(rec.trip_revenue).toLocaleString() : 0}`,
        `INR ${rec.net_revenue_inr ? Number(rec.net_revenue_inr).toLocaleString() : 0}`,
      ]);

      autoTable(doc, {
        startY: 90,
        head: [['Date', 'Location', 'Destination', 'Route', 'Distance', 'Battery', 'Status', 'Gross Rev', 'Net Rev']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });

      const monthSlug = selectedMonthKey || 'summary';
      const fileName = `volttrack-report-${activeDriverId}-${monthSlug}.pdf`;
      doc.save(fileName);
      showToast?.('PDF report generated successfully!', 'success');
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      showToast?.('Failed to generate PDF report', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!activeDriverId) return;

    setProfileSaving(true);
    try {
      const response = await fetch('http://localhost:4000/api/driver/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: activeDriverId,
          driver_mobile_number: profileMobile,
          driver_email: profileEmail,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to update profile');
      }

      setData((prev) => prev ? {
        ...prev,
        driver: {
          ...prev.driver,
          driver_mobile_number: profileMobile,
          driver_email: profileEmail,
        }
      } : prev);

      showToast?.('Profile details updated successfully!', 'success');
      setIsSettingsModalOpen(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast?.(err.message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveProfileDetails = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const response = await fetch('http://localhost:4000/api/driver/profile-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: activeDriverId,
          driver_licence_number: licenceNo,
          driver_years_of_experience: yearsExp,
          driver_mobile_number: profileMobile,
          driver_email: profileEmail,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to update profile details');
      }

      showToast?.('Driver profile details updated successfully!', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Error updating profile details:', err);
      showToast?.(err.message || 'Failed to update profile details', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveVehicleSpecs = async (e) => {
    e.preventDefault();
    setSpecsSaving(true);
    try {
      const response = await fetch('http://localhost:4000/api/driver/vehicle-specs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: activeDriverId,
          vehicleId: vehicle?.vehicle_id,
          weight_kg: specWeight,
          length_mm: specLength,
          width_mm: specWidth,
          height_mm: specHeight,
          wheel_base_mm: specWheelbase,
          gross_vehicle_weight_kg: specGrossWeight,
          maximum_payload_kg: specPayload,
          cargo_volume_l: specCargoVol,
          torque: specTorque,
          motor_power_kw: specMotorPower,
          max_passenger_capacity: specPassengerCap,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to update vehicle specifications');
      }

      showToast?.('Vehicle specifications saved successfully!', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Error saving vehicle specs:', err);
      showToast?.(err.message || 'Failed to save vehicle specifications', 'error');
    } finally {
      setSpecsSaving(false);
    }
  };

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast?.('Image file size must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveVehiclePhoto = async (e) => {
    e.preventDefault();
    if (!uploadedPhotoPreview) {
      showToast?.('Please select a photo file to upload first', 'error');
      return;
    }

    setPhotoUploading(true);
    try {
      const response = await fetch('http://localhost:4000/api/driver/upload-vehicle-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: activeDriverId,
          vehicleId: vehicle?.vehicle_id,
          photoData: uploadedPhotoPreview,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to upload vehicle photo');
      }

      showToast?.('Vehicle photo updated successfully!', 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Error uploading vehicle photo:', err);
      showToast?.(err.message || 'Failed to upload vehicle photo', 'error');
    } finally {
      setPhotoUploading(false);
    }
  };


  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast?.('Please fill out all password fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast?.('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast?.('New password must be at least 6 characters long', 'error');
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch('http://localhost:4000/api/driver/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: activeDriverId,
          currentPassword,
          newPassword,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to change password');
      }

      showToast?.('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsSettingsModalOpen(false);
    } catch (err) {
      console.error('Error changing password:', err);
      showToast?.(err.message || 'Failed to change password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const isPresent = (val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') {
      const trimmed = val.trim().toLowerCase();
      if (trimmed === '' || trimmed === 'n/a' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') return false;
    }
    if (typeof val === 'number') {
      if (isNaN(val) || val === 0) return false;
    }
    return true;
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="inline-flex items-center space-x-3 p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm text-gray-600 font-mono text-sm">
          <Activity className="w-5 h-5 text-brand-red animate-spin" />
          <span>Synchronizing telemetry for {activeDriverId}...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700 space-y-2">
          <AlertTriangle className="w-8 h-8 mx-auto text-brand-red" />
          <h3 className="text-lg font-bold">Telemetry Connection Failure</h3>
          <p className="text-xs">{error || 'Could not retrieve driver telemetry data'}</p>
        </div>
      </div>
    );
  }

  const { driver, vehicle, latestTelemetry, history, monthlyRecords } = data;

  const hasVehicleSpecs = vehicle && (
    isPresent(vehicle.weight_kg) ||
    isPresent(vehicle.length_mm) ||
    isPresent(vehicle.width_mm) ||
    isPresent(vehicle.height_mm) ||
    isPresent(vehicle.wheel_base_mm) ||
    isPresent(vehicle.gross_vehicle_weight_kg) ||
    isPresent(vehicle.maximum_payload_kg) ||
    isPresent(vehicle.cargo_volume_l) ||
    isPresent(vehicle.torque)
  );

  const hasDriverProfile = driver && (
    isPresent(driver.driver_licence_number) ||
    isPresent(driver.driver_years_of_experience) ||
    isPresent(driver.driver_mobile_number) ||
    isPresent(driver.driver_email) ||
    isPresent(driver.driver_behaviour)
  );

  const formatDate = (dStr) => {
    if (!dStr) return null;
    try {
      return new Date(dStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(dStr);
    }
  };

  const isCharging = (latest.charging_status || '').toLowerCase() === 'charging';
  const alertStatus = (latest.alert_status || 'Normal').trim();
  const maintenanceStatus = (latest.maintenance_status || 'Normal').trim();

  const isAlertActive = alertStatus.toLowerCase() !== 'normal';
  const isMaintenanceActive = maintenanceStatus.toLowerCase() !== 'normal' && maintenanceStatus.toLowerCase() !== 'good';

  const showAlertBanner = !isAlertDismissed && (isAlertActive || isMaintenanceActive);
  const isUrgentAlert = alertStatus.toLowerCase().includes('multiple') ||
                        alertStatus.toLowerCase().includes('critical') ||
                        maintenanceStatus.toLowerCase().includes('overdue');

  const hasAlert = isAlertActive;
  const isProfileIncomplete = !hasVehicleSpecs || !driver?.driver_licence_number || !vehicle?.weight_kg;
  const vehicleImgPath = vehicle?.custom_photo_url || getVehicleImage(vehicle?.vehicle_brand, vehicle?.vehicle_model);


  // 6 Navigation Items (with flagship KM Range Prediction tab)
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'vehicle', label: 'Vehicle', icon: Sliders },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'driver', label: 'Driver', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'range', label: 'KM Range', icon: Gauge },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start relative">
        {/* Polished 5-Tab Left Navigation Sidebar */}
        <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-20 z-30">
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-clean-sm flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 scrollbar-none">
            <div className="hidden lg:block px-3.5 py-2 text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
              Dashboard Menu
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
              {/* Post-Signup Onboarding Banner */}
              {isProfileIncomplete && !isProfileBannerDismissed && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-amber-100/60 border border-amber-300 text-amber-900 shadow-clean-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm shrink-0 shadow-sm">
                      👋
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-950">
                        Welcome, {driver?.driver_name || 'Driver'}!
                      </h4>
                      <p className="text-xs font-mono text-amber-800 mt-0.5">
                        Complete your vehicle specs, photo, and profile details to unlock your full dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleTabChange('settings')}
                      className="px-4 py-1.5 rounded-lg bg-brand-red hover:bg-red-700 text-white font-mono font-bold text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      Complete Now →
                    </button>
                    <button
                      onClick={() => setIsProfileBannerDismissed(true)}
                      className="p-1.5 rounded-lg hover:bg-amber-200/50 text-amber-700 transition-colors cursor-pointer"
                      title="Dismiss Banner"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Proactive Alerts Banner */}
              {showAlertBanner && (
                <div className={`p-4 rounded-xl border shadow-clean-sm relative flex items-start justify-between gap-4 transition-all ${
                  isUrgentAlert
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg shrink-0 ${isUrgentAlert ? 'bg-red-100 text-brand-red' : 'bg-amber-100 text-amber-700'}`}>
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wide">
                          {isUrgentAlert ? 'CRITICAL SYSTEM ALERT' : 'VEHICLE ADVISORY'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          isUrgentAlert ? 'bg-red-200/60 text-red-800 border-red-300' : 'bg-amber-200/60 text-amber-800 border-amber-300'
                        }`}>
                          {alertStatus !== 'Normal' ? alertStatus : maintenanceStatus}
                        </span>
                      </div>
                      <p className="text-xs font-mono mt-1 font-semibold">
                        {isAlertActive && isMaintenanceActive
                          ? `⚠ Alert: ${alertStatus} — Vehicle maintenance status is ${maintenanceStatus}. Please schedule a service check soon.`
                          : isAlertActive
                          ? `⚠ Alert: ${alertStatus} — Please inspect your vehicle or schedule a diagnostic check.`
                          : `🔧 Service Notice: Vehicle maintenance status is ${maintenanceStatus}. Please coordinate with fleet operations.`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAlertDismissed(true)}
                    className="p-1 rounded-lg hover:bg-black/5 text-gray-500 hover:text-gray-900 transition-colors shrink-0 cursor-pointer"
                    title="Dismiss alert for this session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Vehicle Identity Card */}
              <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div
                    onClick={() => setIsImageModalOpen(true)}
                    className="group relative w-36 h-24 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-100 shadow-sm cursor-pointer transition-all hover:ring-2 hover:ring-brand-red/50 hover:shadow-md"
                    title="Click to enlarge vehicle photo"
                  >
                    <img
                      src={vehicleImgPath}
                      alt={`${vehicle?.vehicle_brand || ''} ${vehicle?.vehicle_model || 'EV'}`}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono font-bold">
                      {vehicle?.vehicle_brand || 'Tata'}
                    </div>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-5 h-5 drop-shadow-md" />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-2xl font-bold text-gray-900 font-mono">
                        {vehicle?.vehicle_brand || 'EV'} {vehicle?.vehicle_model || 'Vehicle'}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-red-50 text-brand-red border border-red-200">
                        {vehicle?.vehicle_type || 'SUV'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 font-mono mt-1">
                      Driver: <span className="font-bold text-gray-900">{driver?.driver_name || 'Driver'}</span> ({driver?.driver_id})
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-gray-600 font-mono mt-2 pt-2 border-t border-gray-100">
                      <span>Plate: <strong className="text-gray-900">{vehicle?.car_reg_no || 'N/A'}</strong></span>
                      <span>Year: <strong className="text-gray-900">{vehicle?.manufacturing_year || 2025}</strong></span>
                      <span>Capacity: <strong className="text-gray-900">{vehicle?.max_passenger_capacity || 5} Seats</strong></span>
                      <span>Motor: <strong className="text-gray-900">{vehicle?.motor_power_kw || 105} kW</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
                    isCharging
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}>
                    <Zap className="w-3.5 h-3.5 inline mr-1" />
                    {latest.charging_status || 'Not Charging'}
                  </div>

                  <div className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
                    hasAlert
                      ? 'bg-red-50 text-brand-red border-red-300'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                    Alert: {alertStatus}
                  </div>

                  <button
                    onClick={() => handleTabChange('settings')}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Open Account Settings"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-600" />
                    <span>Account Settings</span>
                  </button>
                </div>
              </div>

              {/* Historical Telemetry Month Filter Bar */}
              {monthlyRecords && monthlyRecords.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-gray-700 uppercase">
                    <Calendar className="w-4 h-4 text-brand-red" />
                    <span>Telemetry Month Selector</span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono w-full sm:w-auto">
                    <label htmlFor="driver-month-select" className="text-gray-500 font-bold">
                      Filter Month:
                    </label>
                    <select
                      id="driver-month-select"
                      value={selectedMonthKey}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent cursor-pointer"
                    >
                      {monthlyRecords.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Battery & Range Card */}
              <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-gray-500 uppercase flex items-center space-x-1">
                      <BatteryCharging className="w-4 h-4 text-brand-red" />
                      <span>Battery & Range Snapshot</span>
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-600">
                      SOH: {latest.soh_percent}%
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-1.5 my-2">
                    <span className="text-5xl font-black font-mono text-gray-900">{latest.soc_percent}</span>
                    <span className="text-2xl font-bold font-mono text-brand-red">%</span>
                  </div>

                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200 my-3">
                    <div
                      className="h-full bg-brand-red rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, latest.soc_percent))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
                    <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-center">
                      <span className="text-[10px] text-gray-400 block uppercase">Est. Range</span>
                      <span className="font-bold text-gray-900 text-sm">{latest.range_km} km</span>
                    </div>
                    <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-center">
                      <span className="text-[10px] text-gray-400 block uppercase">Pack Capacity</span>
                      <span className="font-bold text-gray-900 text-sm">{vehicle?.battery_capacity_kwh || 40.5} kWh</span>
                    </div>
                    <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-center">
                      <span className="text-[10px] text-gray-400 block uppercase">Charging Rate</span>
                      <span className="font-bold text-gray-900 text-sm">{isCharging ? `${latest.charging_power_kw} kW` : 'Idle'}</span>
                    </div>
                    <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-center">
                      <span className="text-[10px] text-gray-400 block uppercase">Pack Voltage</span>
                      <span className="font-bold text-gray-900 text-sm">{latest.battery_voltage ? `${latest.battery_voltage} V` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {(isPresent(latest.battery_current) ||
                  isPresent(latest.battery_temperature_c) ||
                  isPresent(latest.ambient_temperature_c)) && (
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-3 pt-3 border-t border-gray-100">
                    {isPresent(latest.battery_current) && (
                      <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
                        <span className="text-[10px] text-gray-400 block uppercase">Pack Current</span>
                        <span className="font-bold text-gray-900">{latest.battery_current} A</span>
                      </div>
                    )}
                    {isPresent(latest.battery_temperature_c) && (
                      <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
                        <span className="text-[10px] text-gray-400 block uppercase">Battery Temp</span>
                        <span className="font-bold text-gray-900">{latest.battery_temperature_c}°C</span>
                      </div>
                    )}
                    {isPresent(latest.ambient_temperature_c) && (
                      <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
                        <span className="text-[10px] text-gray-400 block uppercase">Ambient Temp</span>
                        <span className="font-bold text-gray-900">{latest.ambient_temperature_c}°C</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Trip Summary Strip */}
              <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-gray-700 uppercase">
                    <Gauge className="w-4 h-4 text-brand-red" />
                    <span>Latest Reading Trip Summary</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center text-xs font-mono w-full sm:w-auto">
                    <div className="px-3 py-1.5 rounded bg-gray-50 border border-gray-200">
                      <span className="text-[10px] text-gray-400 block uppercase">Trip Distance</span>
                      <span className="font-bold text-gray-900">{latest.trip_distance_km} km</span>
                    </div>
                    <div className="px-3 py-1.5 rounded bg-gray-50 border border-gray-200">
                      <span className="text-[10px] text-gray-400 block uppercase">Gross Revenue</span>
                      <span className="font-bold text-gray-900">₹{latest.trip_revenue?.toLocaleString()}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                      <span className="text-[10px] text-emerald-600 block uppercase font-bold">Net Revenue</span>
                      <span className="font-bold">₹{latest.net_revenue_inr?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telemetry History & Performance Trends (3 Charts) */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-brand-red" />
                    <div>
                      <h2 className="text-base font-bold text-gray-900 font-mono">Telemetry History & Performance Trends</h2>
                      <p className="text-xs text-gray-500">Historical performance metrics across operational months</p>
                    </div>
                  </div>

                  {/* Chart Time Range Filter */}
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-mono font-semibold text-gray-700">Time Range:</label>
                    <select
                      value={chartTimeRange}
                      onChange={(e) => setChartTimeRange(e.target.value)}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-900 bg-white"
                    >
                      <option value="Full Year">Full Year (All Months)</option>
                      <option value="Last 6 Months">Last 6 Months</option>
                      <option value="Last 3 Months">Last 3 Months</option>
                    </select>
                  </div>
                </div>

                {/* Chart Active Filter Chip */}
                {chartTimeRange !== 'Full Year' && (
                  <div className="flex items-center space-x-2 text-xs font-mono px-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3 text-gray-400" /> Active Range:
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                      <span>{chartTimeRange}</span>
                      <button onClick={() => setChartTimeRange('Full Year')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                    </span>
                    <button
                      onClick={() => setChartTimeRange('Full Year')}
                      className="text-[11px] font-bold text-brand-red hover:underline cursor-pointer"
                    >
                      Reset Range
                    </button>
                  </div>
                )}

                {(() => {
                  const rawHistory = history || [];
                  const chartData = chartTimeRange === 'Last 3 Months' 
                    ? rawHistory.slice(-3) 
                    : chartTimeRange === 'Last 6 Months' 
                    ? rawHistory.slice(-6) 
                    : rawHistory;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Chart 1: Battery SOC Trend */}
                      <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm">
                        <h3 className="text-xs font-mono font-bold text-gray-700 uppercase mb-4">
                          1. Battery SOC Trend (%)
                        </h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#E30613" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#E30613" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                              <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value) => [`${value}%`, 'State of Charge']}
                              />
                              <Area type="monotone" dataKey="soc_percent" stroke="#E30613" strokeWidth={2.5} fillOpacity={1} fill="url(#socGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Energy Consumed & Charging Cost */}
                      <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm">
                        <h3 className="text-xs font-mono font-bold text-gray-700 uppercase mb-4">
                          2. Energy Consumed & Charging Cost
                        </h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                              <YAxis stroke="#94A3B8" fontSize={11} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                              <Bar dataKey="energy_consumed_kwh" name="Energy (kWh)" fill="#E30613" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="charging_cost" name="Cost (₹)" fill="#1E293B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 3: Monthly Trip Distance & Net Revenue */}
                      <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-clean-sm">
                        <h3 className="text-xs font-mono font-bold text-gray-700 uppercase mb-4">
                          3. Monthly Trip Distance (km) & Revenue
                        </h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                              <YAxis stroke="#94A3B8" fontSize={11} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                              <Line type="monotone" dataKey="trip_distance_km" name="Distance (km)" stroke="#E30613" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="net_revenue_inr" name="Net Rev (₹)" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* TAB 2: VEHICLE */}
          {activeTab === 'vehicle' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehicle Specifications Card */}
              <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <span className="text-sm font-mono font-bold text-gray-900 uppercase flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-brand-red" />
                      <span>Vehicle Specifications</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                      Physical Specs
                    </span>
                  </div>

                  {hasVehicleSpecs ? (
                    <div className="space-y-2.5 text-xs font-mono">
                      {isPresent(vehicle?.weight_kg) && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="text-gray-500">Weight:</span>
                          <span className="font-bold text-gray-900">{Number(vehicle.weight_kg).toLocaleString()} kg</span>
                        </div>
                      )}

                      {isPresent(vehicle?.length_mm) && isPresent(vehicle?.width_mm) && isPresent(vehicle?.height_mm) ? (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="text-gray-500">Dimensions (L×W×H):</span>
                          <span className="font-bold text-gray-900">
                            {Number(vehicle.length_mm).toLocaleString()} × {Number(vehicle.width_mm).toLocaleString()} × {Number(vehicle.height_mm).toLocaleString()} mm
                          </span>
                        </div>
                      ) : (
                        <>
                          {isPresent(vehicle?.length_mm) && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                              <span className="text-gray-500">Length:</span>
                              <span className="font-bold text-gray-900">{Number(vehicle.length_mm).toLocaleString()} mm</span>
                            </div>
                          )}
                          {isPresent(vehicle?.width_mm) && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                              <span className="text-gray-500">Width:</span>
                              <span className="font-bold text-gray-900">{Number(vehicle.width_mm).toLocaleString()} mm</span>
                            </div>
                          )}
                          {isPresent(vehicle?.height_mm) && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                              <span className="text-gray-500">Height:</span>
                              <span className="font-bold text-gray-900">{Number(vehicle.height_mm).toLocaleString()} mm</span>
                            </div>
                          )}
                        </>
                      )}

                      {isPresent(vehicle?.wheel_base_mm) && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="text-gray-500">Wheelbase:</span>
                          <span className="font-bold text-gray-900">{Number(vehicle.wheel_base_mm).toLocaleString()} mm</span>
                        </div>
                      )}

                      {isPresent(vehicle?.gross_vehicle_weight_kg) && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="text-gray-500">Gross Vehicle Weight:</span>
                          <span className="font-bold text-gray-900">{Number(vehicle.gross_vehicle_weight_kg).toLocaleString()} kg</span>
                        </div>
                      )}

                      {isPresent(vehicle?.maximum_payload_kg) && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="text-gray-500">Max Payload:</span>
                          <span className="font-bold text-gray-900">{Number(vehicle.maximum_payload_kg).toLocaleString()} kg</span>
                        </div>
                      )}

                      {isPresent(vehicle?.cargo_volume_l) && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="text-gray-500">Cargo Volume:</span>
                          <span className="font-bold text-gray-900">{Number(vehicle.cargo_volume_l).toLocaleString()} L</span>
                        </div>
                      )}

                      {isPresent(vehicle?.torque) && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                          <span className="text-gray-500">Torque:</span>
                          <span className="font-bold text-gray-900">{Number(vehicle.torque).toLocaleString()} Nm</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center space-y-3 font-mono bg-gray-50/70 rounded-xl border border-gray-200">
                      <Info className="w-6 h-6 mx-auto text-amber-500" />
                      <p className="text-xs font-bold text-gray-800">
                        Vehicle specifications not added yet.
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Fill in your vehicle's physical dimensions, weight, and power ratings to complete your profile.
                      </p>
                      <button
                        onClick={() => handleTabChange('settings')}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-red text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm cursor-pointer mt-2"
                      >
                        <span>Complete Vehicle Details →</span>
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Status & Maintenance Card */}
              <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <span className="text-sm font-mono font-bold text-gray-900 uppercase flex items-center space-x-2">
                      <Wrench className="w-4 h-4 text-brand-red" />
                      <span>Status & Maintenance</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                      {latest.driving_mode || 'Eco Mode'}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-gray-500">Vehicle Status:</span>
                      <span className="font-bold text-gray-900">{latest.vehicle_status || 'Parked'} ({latest.speed_kmph} km/h)</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-gray-500">Odometer:</span>
                      <span className="font-bold text-gray-900">{latest.odometer_km?.toLocaleString()} km</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-gray-500">Maintenance Status:</span>
                      <span className="font-bold text-emerald-700">{latest.maintenance_status || 'OK'}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-gray-500">Maintenance Due:</span>
                      <span className="font-bold text-gray-900">{latest.maintenance_due_km} km</span>
                    </div>

                    {isPresent(latest.can_reach_destination) && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-gray-500">Reach Destination:</span>
                        {String(latest.can_reach_destination).trim().toLowerCase() === 'yes' ||
                         String(latest.can_reach_destination).trim().toLowerCase() === 'true' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-brand-red border border-red-200 flex items-center space-x-1">
                            <X className="w-3 h-3 text-brand-red" />
                            <span>No</span>
                          </span>
                        )}
                      </div>
                    )}

                    {latest.passenger_count != null && Number(latest.passenger_count) > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-gray-500">Passengers Onboard:</span>
                        <span className="font-bold text-gray-900">
                          {latest.passenger_count} {Number(latest.passenger_count) === 1 ? 'Passenger' : 'Passengers'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-mono text-gray-500">
                  <span>Last Service: <strong>{formatDate(latest.last_service_date)}</strong></span>
                  <span>Next Service: <strong>{formatDate(latest.next_service_date)}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCATION */}
          {activeTab === 'location' && (
            <div className="space-y-6">
              {/* Location & Navigation Card */}
              <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm font-mono font-bold text-gray-900 uppercase flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-brand-red" />
                    <span>Location & Navigation</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-50 text-brand-red border border-red-200">
                    {latest.route_type || 'City Route'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 block uppercase">Current Location</span>
                    <span className="font-bold text-gray-900 text-sm">{latest.location || 'Unknown Location'}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 block uppercase">Destination</span>
                    <span className="font-bold text-gray-800 text-sm">{latest.destination_location || 'Not Specified'}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 block uppercase">GPS Coordinates</span>
                    <span className="font-bold text-gray-800 text-sm">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                  </div>
                </div>

                {/* Leaflet Map */}
                <LocationMap
                  lat={lat}
                  lng={lng}
                  locationName={latest.location}
                  destinationName={latest.destination_location}
                  stations={chargingStations}
                />

                {/* Charging Station Finder Section */}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-gray-700 flex items-center space-x-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Nearby Charging Stations</span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">Open Charge Map</span>
                  </div>

                  {chargingLoading ? (
                    <div className="p-3 rounded bg-gray-50 border border-gray-200 text-xs font-mono text-gray-500 flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-brand-red animate-spin" />
                      <span>Locating nearby charging stations...</span>
                    </div>
                  ) : chargingStations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {chargingStations.slice(0, 4).map((station) => (
                        <div
                          key={station.id}
                          className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/60 text-xs font-mono flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-gray-900 block truncate">{station.name}</span>
                            <span className="text-[10px] text-gray-500 block truncate">{station.address}</span>
                          </div>
                          <div className="text-right shrink-0">
                            {station.distance && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold block">
                                {station.distance}
                              </span>
                            )}
                            <span className="text-[9px] text-gray-500 block mt-0.5">{station.numPoints || 1} points</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-amber-50/60 border border-amber-200 text-[11px] font-mono text-amber-800 flex items-start space-x-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{chargingError || 'No charging stations found nearby'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trip History Log Table Section */}
              <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-brand-red" />
                      <h2 className="text-lg font-bold text-gray-900 font-mono">
                        Telemetry & Trip History Log
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      Complete historical record of all telemetry entries for {driver?.driver_name || 'Driver'} ({activeDriverId})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Date Range Filter */}
                    <select
                      value={tripDateRange}
                      onChange={(e) => setTripDateRange(e.target.value)}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-800 bg-white"
                    >
                      <option value="All">All Months</option>
                      <option value="This Month">This Month</option>
                      <option value="Last 3 Months">Last 3 Months</option>
                    </select>

                    {/* Route Type Filter */}
                    <select
                      value={tripRouteType}
                      onChange={(e) => setTripRouteType(e.target.value)}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-800 bg-white"
                    >
                      <option value="All">All Route Types</option>
                      <option value="City">City</option>
                      <option value="Highway">Highway</option>
                      <option value="Mixed">Mixed</option>
                    </select>

                    <button
                      onClick={handleDownloadPDF}
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-red hover:bg-red-700 text-white font-mono font-bold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
                      title="Download PDF Report"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Report (PDF)</span>
                    </button>
                  </div>
                </div>

                {/* Trip Active Filter Chips Bar */}
                {(tripDateRange !== 'All' || tripRouteType !== 'All') && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs font-mono">
                    <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3 text-gray-400" /> Active Filters:
                    </span>
                    {tripDateRange !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Date: {tripDateRange}</span>
                        <button onClick={() => setTripDateRange('All')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    {tripRouteType !== 'All' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red font-semibold border border-red-200">
                        <span>Route: {tripRouteType}</span>
                        <button onClick={() => setTripRouteType('All')} className="hover:text-red-900 ml-1 cursor-pointer">✕</button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setTripDateRange('All');
                        setTripRouteType('All');
                      }}
                      className="text-[11px] font-bold text-brand-red hover:underline ml-1 cursor-pointer"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

                {(() => {
                  const rawLogs = data?.allTelemetryLogs || [];
                  const filteredLogs = rawLogs.filter((log) => {
                    if (tripRouteType !== 'All') {
                      const rType = (log.route_type || '').toLowerCase();
                      if (tripRouteType === 'City' && !rType.includes('city')) return false;
                      if (tripRouteType === 'Highway' && !rType.includes('highway')) return false;
                      if (tripRouteType === 'Mixed' && !rType.includes('mix')) return false;
                    }
                    if (tripDateRange !== 'All' && log.timestamp) {
                      const logDate = new Date(log.timestamp);
                      const now = new Date();
                      if (tripDateRange === 'This Month') {
                        if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) return false;
                      } else if (tripDateRange === 'Last 3 Months') {
                        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        if (logDate < threeMonthsAgo) return false;
                      }
                    }
                    return true;
                  });

                  if (filteredLogs.length > 0) {
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs font-mono">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px]">
                              <th className="py-3 px-3">Date</th>
                              <th className="py-3 px-3">Location</th>
                              <th className="py-3 px-3">Destination</th>
                              <th className="py-3 px-3">Route Type</th>
                              <th className="py-3 px-3">Distance</th>
                              <th className="py-3 px-3">Battery %</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3 text-right">Trip Revenue</th>
                              <th className="py-3 px-3 text-right">Net Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-800">
                            {filteredLogs.map((log) => (
                              <tr key={log.record_id} className="hover:bg-gray-50/80 transition-colors">
                                <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                                  {log.timestamp
                                    ? new Date(log.timestamp).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })
                                    : 'N/A'}
                                </td>
                                <td className="py-3 px-3 font-bold text-gray-900">{log.location || 'Depot'}</td>
                                <td className="py-3 px-3 text-gray-600">{log.destination_location || 'Not Specified'}</td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                                    {log.route_type || 'City'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-bold text-gray-900">{log.trip_distance_km} km</td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {log.soc_percent}%
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-brand-red border border-red-200">
                                    {log.vehicle_status || 'Parked'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-gray-900">
                                  ₹{log.trip_revenue ? Number(log.trip_revenue).toLocaleString() : 0}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-emerald-700">
                                  ₹{log.net_revenue_inr ? Number(log.net_revenue_inr).toLocaleString() : 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  return (
                    <div className="p-8 text-center text-xs font-mono text-gray-500 space-y-2 bg-gray-50/50 rounded-xl border border-gray-200">
                      <Info className="w-6 h-6 mx-auto text-amber-500" />
                      <p className="font-bold text-gray-800">No trip history records match your active filters.</p>
                      <p className="text-[11px] text-gray-400">Try selecting "All Months" or "All Route Types" above.</p>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* TAB 4: DRIVER */}
          {activeTab === 'driver' && (
            <div className="space-y-6">
              {/* Driver Profile Card */}
              <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm font-mono font-bold text-gray-900 uppercase flex items-center space-x-2">
                    <User className="w-4 h-4 text-brand-red" />
                    <span>Driver Profile</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-50 text-brand-red border border-red-200">
                    Profile Details
                  </span>
                </div>

                {hasDriverProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-[10px] text-gray-400 block uppercase">Driver Name</span>
                      <span className="font-bold text-gray-900 text-sm">{driver?.driver_name || 'Driver'}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-[10px] text-gray-400 block uppercase">Driver ID</span>
                      <span className="font-bold text-gray-900 text-sm">{driver?.driver_id || activeDriverId}</span>
                    </div>

                    {isPresent(driver?.driver_licence_number) && (
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-[10px] text-gray-400 block uppercase">Driving License</span>
                        <span className="font-bold text-gray-900 text-sm">{driver.driver_licence_number}</span>
                      </div>
                    )}

                    {isPresent(driver?.driver_years_of_experience) && (
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-[10px] text-gray-400 block uppercase">Experience</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {driver.driver_years_of_experience} {Number(driver.driver_years_of_experience) === 1 ? 'Year' : 'Years'}
                        </span>
                      </div>
                    )}

                    {isPresent(driver?.driver_mobile_number) && (
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-[10px] text-gray-400 block uppercase">Mobile Number</span>
                        <span className="font-bold text-gray-900 text-sm">{driver.driver_mobile_number}</span>
                      </div>
                    )}

                    {isPresent(driver?.driver_email) && (
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-[10px] text-gray-400 block uppercase">Email Address</span>
                        <span className="font-bold text-gray-900 text-sm truncate block">{driver.driver_email}</span>
                      </div>
                    )}

                    {isPresent(driver?.driver_behaviour) && (
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-[10px] text-gray-400 block uppercase">Behavior Rating</span>
                        <span className="font-bold text-emerald-700 text-sm">{driver.driver_behaviour}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-3 font-mono bg-gray-50/70 rounded-xl border border-gray-200">
                    <Info className="w-6 h-6 mx-auto text-amber-500" />
                    <p className="text-xs font-bold text-gray-800">
                      Extended driver profile details not added yet.
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Add your driving license number, years of experience, mobile, and email.
                    </p>
                    <button
                      onClick={() => handleTabChange('settings')}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-red text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm cursor-pointer mt-2"
                    >
                      <span>Complete Driver Profile →</span>
                    </button>
                  </div>
                )}

              </div>

              {/* Eco Impact & Fleet Comparison Card */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm">
                  <div className="flex items-center space-x-2">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-base font-bold text-gray-900 font-mono">Sustainability & Driving Efficiency Impact</h3>
                      <p className="text-xs text-gray-500">Recalculated efficiency & CO₂ savings across selected time range</p>
                    </div>
                  </div>

                  {/* Eco Time Range Filter */}
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-mono font-semibold text-gray-700">Time Range:</label>
                    <select
                      value={ecoTimeRange}
                      onChange={(e) => setEcoTimeRange(e.target.value)}
                      className="py-1.5 px-3 corporate-input text-xs font-mono font-bold text-gray-900 bg-white"
                    >
                      <option value="All Time">All Time</option>
                      <option value="This Month">This Month</option>
                      <option value="Last 3 Months">Last 3 Months</option>
                    </select>
                  </div>
                </div>

                {/* Eco Active Filter Chip */}
                {ecoTimeRange !== 'All Time' && (
                  <div className="flex items-center space-x-2 text-xs font-mono px-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3 text-gray-400" /> Active Timeframe:
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      <span>Time: {ecoTimeRange}</span>
                      <button onClick={() => setEcoTimeRange('All Time')} className="hover:text-emerald-900 ml-1 cursor-pointer">✕</button>
                    </span>
                    <button
                      onClick={() => setEcoTimeRange('All Time')}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Reset Timeframe
                    </button>
                  </div>
                )}

                {(() => {
                  if (ecoStatsLoading) {
                    return (
                      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-clean-sm text-xs font-mono text-gray-500 flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-brand-red animate-spin" />
                        <span>Calculating driver eco impact & fleet benchmarks...</span>
                      </div>
                    );
                  }

                  const rawLogs = data?.allTelemetryLogs || [];
                  let filteredLogs = rawLogs;
                  const now = new Date();

                  if (ecoTimeRange === 'This Month') {
                    filteredLogs = rawLogs.filter((l) => {
                      if (!l.timestamp) return false;
                      const d = new Date(l.timestamp);
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    });
                  } else if (ecoTimeRange === 'Last 3 Months') {
                    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    filteredLogs = rawLogs.filter((l) => l.timestamp && new Date(l.timestamp) >= threeMonthsAgo);
                  }

                  if (filteredLogs.length === 0 && ecoTimeRange !== 'All Time') {
                    return (
                      <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm text-center text-xs font-mono text-gray-500 space-y-1">
                        <Info className="w-5 h-5 mx-auto text-amber-500" />
                        <p className="font-bold text-gray-800">No driving telemetry recorded for {ecoTimeRange}.</p>
                        <p className="text-gray-400">Select "All Time" to view your complete eco impact metrics.</p>
                      </div>
                    );
                  }

                  const totalKm = filteredLogs.reduce((sum, l) => sum + (Number(l.trip_distance_km) || 0), 0);
                  const ecoTrips = filteredLogs.filter((l) => (l.driving_mode || '').toLowerCase().includes('eco')).length;
                  const sportTrips = filteredLogs.filter((l) => (l.driving_mode || '').toLowerCase().includes('sport')).length;
                  const totalTrips = filteredLogs.length || 1;

                  const ecoPercent = (ecoTrips / totalTrips) * 100;
                  const sportPercent = (sportTrips / totalTrips) * 100;
                  let score = Math.round(50 + ecoPercent * 0.5 - sportPercent * 0.5);
                  score = Math.max(0, Math.min(100, score));

                  let label = 'Moderate';
                  if (score >= 80) label = 'Highly Efficient';
                  else if (score >= 65) label = 'Efficient';
                  else if (score < 45) label = 'High Consumption';

                  const finalScore = ecoTimeRange === 'All Time' && ecoStats?.ecoScore != null ? ecoStats.ecoScore : score;
                  const finalLabel = ecoTimeRange === 'All Time' && ecoStats?.scoreLabel ? ecoStats.scoreLabel : label;
                  const finalCo2 = ecoTimeRange === 'All Time' && ecoStats?.co2SavedKg != null ? ecoStats.co2SavedKg : Math.round(totalKm * 0.120);

                  return (
                    <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-950 via-gray-900 to-gray-950 text-white shadow-clean-md border border-emerald-800/40">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        {/* Left: Eco-Score */}
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                            <Leaf className="w-7 h-7 text-emerald-400" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                              Driver Eco-Score ({ecoTimeRange})
                            </span>
                            <div className="flex items-baseline space-x-2 my-0.5">
                              <span className="text-3xl font-black font-mono text-white">{finalScore}</span>
                              <span className="text-sm font-mono text-emerald-400 font-bold">/100</span>
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {finalLabel}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-gray-400">
                              Calculated from driving mode history for {ecoTimeRange.toLowerCase()}.
                            </p>
                          </div>
                        </div>

                        {/* Middle: CO2 Saved */}
                        <div className="flex items-center space-x-4 border-t lg:border-t-0 lg:border-l border-gray-800 pt-4 lg:pt-0 lg:pl-6">
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                            <Trees className="w-7 h-7 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                              Est. CO₂ Emissions Saved
                            </span>
                            <div className="text-2xl font-black font-mono text-white my-0.5">
                              {finalCo2.toLocaleString()} <span className="text-sm font-normal text-amber-300">kg CO₂</span>
                            </div>
                            <p className="text-[11px] font-mono text-gray-400">
                              Estimated vs. an average petrol vehicle over {totalKm.toLocaleString()} km.
                            </p>
                          </div>
                        </div>

                        {/* Right: Fleet Comparison Statement */}
                        <div className="w-full lg:w-auto p-3.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-300 font-bold mb-1">
                            <Award className="w-4 h-4 text-emerald-400" />
                            <span>Fleet Performance Ranking</span>
                          </div>
                          <p className="text-xs font-mono text-gray-200">
                            {ecoStats?.fleetComparisonText || 'Your eco-score places you among top eco-friendly drivers.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-clean-sm space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
                <div className="p-2.5 rounded-xl bg-red-50 text-brand-red border border-red-200">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 font-mono">Account Settings</h2>
                  <p className="text-xs text-gray-500 font-mono">Manage your personal profile details and account password</p>
                </div>
              </div>

              {/* Sub-Tabs: Profile Info, Vehicle Specs, Vehicle Photo & Change Password */}
              <div className="flex border-b border-gray-200 text-xs font-mono font-bold space-x-2 overflow-x-auto">
                <button
                  onClick={() => setSettingsTab('profile')}
                  className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    settingsTab === 'profile'
                      ? 'border-brand-red text-brand-red'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Driver Profile Details
                </button>
                <button
                  onClick={() => setSettingsTab('specs')}
                  className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    settingsTab === 'specs'
                      ? 'border-brand-red text-brand-red'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Vehicle Specifications
                </button>
                <button
                  onClick={() => setSettingsTab('photo')}
                  className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    settingsTab === 'photo'
                      ? 'border-brand-red text-brand-red'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Vehicle Photo Upload
                </button>
                <button
                  onClick={() => setSettingsTab('password')}
                  className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    settingsTab === 'password'
                      ? 'border-brand-red text-brand-red'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Account Security
                </button>
              </div>

              {/* Sub-Tab 1: Extended Profile Details */}
              {settingsTab === 'profile' && (
                <form onSubmit={handleSaveProfileDetails} className="space-y-4 max-w-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Driver Mobile Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={profileMobile}
                          onChange={(e) => setProfileMobile(e.target.value)}
                          placeholder="e.g. +91 9876543210"
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          placeholder="e.g. driver@volttrack.com"
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Driving License Number
                      </label>
                      <input
                        type="text"
                        value={licenceNo}
                        onChange={(e) => setLicenceNo(e.target.value)}
                        placeholder="e.g. DL-2025-TN019876"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={yearsExp}
                        onChange={(e) => setYearsExp(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-red-700 text-white font-mono font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {profileSaving ? 'Saving...' : 'Save Profile Details'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Tab 2: Vehicle Specifications */}
              {settingsTab === 'specs' && (
                <form onSubmit={handleSaveVehicleSpecs} className="space-y-4 max-w-2xl">
                  <p className="text-xs font-mono text-gray-500">
                    Fill in your vehicle's physical dimensions, weight ratings, and motor parameters to complete your vehicle profile.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Kerb Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={specWeight}
                        onChange={(e) => setSpecWeight(e.target.value)}
                        placeholder="e.g. 1400"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Motor Power (kW)
                      </label>
                      <input
                        type="number"
                        value={specMotorPower}
                        onChange={(e) => setSpecMotorPower(e.target.value)}
                        placeholder="e.g. 105"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Torque (Nm)
                      </label>
                      <input
                        type="number"
                        value={specTorque}
                        onChange={(e) => setSpecTorque(e.target.value)}
                        placeholder="e.g. 245"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Length (mm)
                      </label>
                      <input
                        type="number"
                        value={specLength}
                        onChange={(e) => setSpecLength(e.target.value)}
                        placeholder="e.g. 3995"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Width (mm)
                      </label>
                      <input
                        type="number"
                        value={specWidth}
                        onChange={(e) => setSpecWidth(e.target.value)}
                        placeholder="e.g. 1811"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Height (mm)
                      </label>
                      <input
                        type="number"
                        value={specHeight}
                        onChange={(e) => setSpecHeight(e.target.value)}
                        placeholder="e.g. 1606"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Wheelbase (mm)
                      </label>
                      <input
                        type="number"
                        value={specWheelbase}
                        onChange={(e) => setSpecWheelbase(e.target.value)}
                        placeholder="e.g. 2498"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Gross Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={specGrossWeight}
                        onChange={(e) => setSpecGrossWeight(e.target.value)}
                        placeholder="e.g. 1800"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Max Payload (kg)
                      </label>
                      <input
                        type="number"
                        value={specPayload}
                        onChange={(e) => setSpecPayload(e.target.value)}
                        placeholder="e.g. 400"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Cargo Volume (L)
                      </label>
                      <input
                        type="number"
                        value={specCargoVol}
                        onChange={(e) => setSpecCargoVol(e.target.value)}
                        placeholder="e.g. 350"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                        Passenger Capacity (Seats)
                      </label>
                      <input
                        type="number"
                        value={specPassengerCap}
                        onChange={(e) => setSpecPassengerCap(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={specsSaving}
                      className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-red-700 text-white font-mono font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {specsSaving ? 'Saving Specifications...' : 'Save Vehicle Specifications'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Tab 3: Vehicle Photo Upload */}
              {settingsTab === 'photo' && (
                <form onSubmit={handleSaveVehiclePhoto} className="space-y-4 max-w-md">
                  <p className="text-xs font-mono text-gray-500">
                    Upload a real photo of your vehicle (Max size: 5MB, accepted formats: JPG, PNG, WEBP).
                  </p>

                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:bg-gray-100/60 transition-colors">
                    {uploadedPhotoPreview || vehicle?.custom_photo_url ? (
                      <div className="space-y-3">
                        <img
                          src={uploadedPhotoPreview || vehicle?.custom_photo_url}
                          alt="Vehicle Preview"
                          className="w-48 h-32 object-cover rounded-lg mx-auto border border-gray-200 shadow-sm"
                        />
                        <p className="text-xs font-mono text-emerald-700 font-bold">Photo ready for display</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Download className="w-8 h-8 mx-auto text-gray-400 rotate-180" />
                        <p className="text-xs font-mono text-gray-700 font-bold">Click below or select a photo file</p>
                        <p className="text-[11px] font-mono text-gray-400">Supported formats: PNG, JPG, JPEG, WEBP</p>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handlePhotoFileChange}
                      className="mt-4 text-xs font-mono text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-red file:text-white hover:file:bg-red-700 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={photoUploading || !uploadedPhotoPreview}
                      className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-red-700 text-white font-mono font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {photoUploading ? 'Uploading...' : 'Save & Set Vehicle Photo'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Tab 4: Account Security */}
              {settingsTab === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                      New Password
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1 font-mono text-xs">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-red-700 text-white font-mono font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {passwordSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* TAB 6: KM RANGE PREDICTION (FLAGSHIP FEATURE) */}
          {activeTab === 'range' && (
            <KmRangePrediction
              driverId={activeDriverId}
              vehicle={vehicle}
              latestTelemetry={latest}
            />
          )}

        </div>
      </div>

      {/* Click-to-Enlarge Vehicle Image Lightbox Modal */}
      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 p-4 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-mono">
                  {vehicle?.vehicle_brand} {vehicle?.vehicle_model}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  Plate: <span className="font-bold text-gray-800">{vehicle?.car_reg_no || 'N/A'}</span> • Model Year: <span className="font-bold text-gray-800">{vehicle?.manufacturing_year || 2025}</span>
                </p>
              </div>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-brand-red text-gray-600 transition-colors"
                title="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full max-h-[75vh] flex items-center justify-center bg-gray-950 rounded-xl overflow-hidden mt-3 p-4">
              <img
                src={vehicleImgPath}
                alt={`${vehicle?.vehicle_brand || ''} ${vehicle?.vehicle_model || 'EV'}`}
                className="max-w-full max-h-[68vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
