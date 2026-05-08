import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { RefreshCw, Users } from 'lucide-react';
import { calculateDistance, calculateSpeed } from '../utils/helpers';
import toast from 'react-hot-toast';

// Custom ISS Icon
const issIcon = new L.Icon({
  iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/International_Space_Station.svg',
  iconSize: [50, 30],
  iconAnchor: [25, 15],
  popupAnchor: [0, -15]
});

// Map Updater Component to center map on ISS
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export default function ISSTracker({ onSpeedUpdate, onDashboardUpdate }) {
  const [issData, setIssData] = useState({ lat: 0, lng: 0 });
  const [path, setPath] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [locationName, setLocationName] = useState('Loading...');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const lastUpdateTime = useRef(Date.now());
  const lastPos = useRef(null);

  const fetchISSPosition = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      // wheretheiss.at supports HTTPS natively - no proxy needed
      const res = await axios.get('https://api.wheretheiss.at/v1/satellites/25544');
      const { latitude: lat, longitude: lng, velocity } = res.data;
      const currentTime = Date.now();

      setIssData({ lat, lng });
      setPath((prev) => {
        const newPath = [...prev, [lat, lng]];
        return newPath.slice(-15);
      });

      // Use velocity from API directly (km/h)
      const currentSpeed = velocity;
      setSpeed(currentSpeed);
      if (onSpeedUpdate) {
        onSpeedUpdate({ time: new Date().toLocaleTimeString(), speed: currentSpeed });
      }

      lastPos.current = { lat, lng };
      lastUpdateTime.current = currentTime;

      // Reverse Geocoding
      try {
        const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
        setLocationName(geoRes.data.display_name || 'Over the Ocean');
      } catch (err) {
        setLocationName('Over the Ocean / Unknown');
      }

      if (isManual) {
        toast.success('ISS Location Updated');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch ISS data');
      if (isManual) setLoading(false);
    }
  };

  const fetchPeople = async () => {
    try {
      // Use our serverless function as backup - open-notify HTTP is unreliable
      const res = await axios.get('/api/astros');
      const issPeople = res.data.people.filter(p => p.craft === 'ISS');
      setPeople(issPeople);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchISSPosition();
    fetchPeople();
    setLoading(false);

    const interval = setInterval(() => {
      fetchISSPosition();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (onDashboardUpdate) {
      onDashboardUpdate({
        iss: issData,
        speed: speed,
        locationName: locationName,
        people: people
      });
    }
  }, [issData, speed, locationName, people]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          🛰️ ISS Live Tracker
        </h2>
        <button 
          onClick={() => fetchISSPosition(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-300">Current Position</p>
          <p className="font-mono font-bold text-lg dark:text-white">
            {issData.lat.toFixed(4)}°, {issData.lng.toFixed(4)}°
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-300">Estimated Speed</p>
          <p className="font-mono font-bold text-lg dark:text-white">
            {speed > 0 ? speed.toFixed(2) : '---'} km/h
          </p>
          <p className="text-xs text-slate-400 mt-1">Positions tracked: {path.length}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-300">Nearest Location</p>
          <p className="font-semibold text-sm line-clamp-2 dark:text-white" title={locationName}>
            {locationName}
          </p>
        </div>
      </div>

      <div className="h-[400px] w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 mb-6 relative z-0">
        <MapContainer center={[issData.lat || 0, issData.lng || 0]} zoom={3} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">Carto</a>'
          />
          {issData.lat !== 0 && (
            <Marker position={[issData.lat, issData.lng]} icon={issIcon}>
              <Popup>
                ISS is here! <br />
                Speed: {speed > 0 ? speed.toFixed(2) : '---'} km/h
              </Popup>
            </Marker>
          )}
          {path.length > 1 && (
            <Polyline positions={path} color="red" weight={3} dashArray="5, 10" />
          )}
          <MapUpdater center={[issData.lat, issData.lng]} />
        </MapContainer>
      </div>

      <div className="bg-blue-50 dark:bg-slate-700 p-4 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full text-blue-600 dark:text-blue-300">
            <Users size={20} />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white">
            🧑‍🚀 People aboard ISS: <span className="text-blue-600 dark:text-blue-300">{people.length}</span>
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {people.length === 0 ? (
            <span className="text-sm text-slate-400">Loading crew data...</span>
          ) : (
            people.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-600 border border-blue-200 dark:border-slate-500 text-slate-800 dark:text-white text-sm font-medium rounded-full shadow-sm"
              >
                👤 {p.name}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
