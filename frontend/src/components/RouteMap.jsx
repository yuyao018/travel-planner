import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routingAPI } from '../services/api';

// ─── Geocoding Cache ──────────────────────────────────────────────────────────
const getCacheKey = (query) => `geo_cache_${query.toLowerCase().replace(/\W/g, '_')}`;
const getCachedCoords = (query) => {
  try { return JSON.parse(localStorage.getItem(getCacheKey(query))); } catch { return null; }
};
const setCachedCoords = (query, coords) => {
  try { localStorage.setItem(getCacheKey(query), JSON.stringify(coords)); } catch {}
};

// ─── Route Cache ──────────────────────────────────────────────────────────────
const getRouteCacheKey = (waypoints, profile) =>
  `route_${profile}_${waypoints.map(w => `${w.lat.toFixed(4)}_${w.lng.toFixed(4)}`).join('|')}`;
const getCachedRoute = (waypoints, profile) => {
  try { return JSON.parse(localStorage.getItem(getRouteCacheKey(waypoints, profile))); } catch { return null; }
};
const setCachedRoute = (waypoints, profile, data) => {
  try { localStorage.setItem(getRouteCacheKey(waypoints, profile), JSON.stringify(data)); } catch {}
};

// ─── ChangeView: auto-fits map bounds ────────────────────────────────────────
function ChangeView({ bounds, center }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (bounds && bounds.length > 1) {
        try { map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 }); } catch {}
      } else if (bounds && bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else if (center) {
        map.setView(center, 13);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [bounds, center, map]);
  return null;
}

// ─── Custom Numbered Marker ───────────────────────────────────────────────────
const createCustomIcon = (number, color = '#E07B2A') =>
  L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background:${color};color:white;width:26px;height:26px;border-radius:50%;
      display:flex;justify-content:center;align-items:center;font-weight:800;font-size:13px;
      border:2px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3);">${number}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

// ─── Routing Panel (rendered inside MapContainer via portal trick) ────────────
function RoutingPanel({ markers, onRouteCalculated, routeLoading, profile, setProfile, showRealRoute, onToggle }) {

  const handleCalculate = async () => {
    if (markers.length < 2) return;
    const waypoints = markers.map(m => ({ lat: m.lat, lng: m.lng }));

    // Check cache first
    const cached = getCachedRoute(waypoints, profile);
    if (cached) { onRouteCalculated(cached); return; }

    try {
      let res;
      if (waypoints.length === 2) {
        res = await routingAPI.getDirections(waypoints[0], waypoints[1], profile);
      } else {
        res = await routingAPI.getMultiStopRoute(waypoints, profile);
      }
      setCachedRoute(waypoints, profile, res.route);
      onRouteCalculated(res.route);
    } catch (err) {
      console.error('Route calculation failed:', err);
      alert('Could not calculate route: ' + err.message);
      onRouteCalculated(null);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 1000,
      background: 'rgba(255,255,255,0.96)', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 190,
      pointerEvents: 'auto'
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>🗺 Route Options</div>

      {/* Toggle real routes */}
      <label style={{ fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <input type="checkbox" checked={showRealRoute} onChange={e => onToggle(e.target.checked)} />
        Show real road route
      </label>

      {showRealRoute && (
        <>
          {/* Travel mode selector */}
          <select
            value={profile}
            onChange={e => setProfile(e.target.value)}
            style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid #ddd' }}
          >
            <option value="driving">🚗 Driving</option>
            <option value="walking">🚶 Walking</option>
            <option value="cycling">🚲 Cycling</option>
          </select>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={routeLoading || markers.length < 2}
            style={{
              fontSize: 11, padding: '6px 10px', borderRadius: 4, border: 'none',
              background: markers.length < 2 ? '#ccc' : '#E07B2A',
              color: 'white', cursor: markers.length < 2 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            {routeLoading
              ? <><span style={{ width: 10, height: 10, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Calculating…</>
              : `Calculate (${markers.length} stops)`
            }
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main RouteMap Component ──────────────────────────────────────────────────
function RouteMap({ stops, destination }) {
  const [markers, setMarkers]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [destCenter, setDestCenter]     = useState([35.6762, 139.6503]);
  const [showRealRoute, setShowRealRoute] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo]       = useState(null);
  const [profile, setProfile]           = useState('driving');

  const delay = ms => new Promise(r => setTimeout(r, ms));

  const cleanQuery = useCallback((location, title) => {
    const q = location || title || '';
    return q.replace(/\s+or\s+.*/i, '').replace(/\(.*\)/g, '').replace(/Area/gi, '').trim();
  }, []);

  const stopsKey = useMemo(() =>
    JSON.stringify((stops || []).map(s => ({ id: s._id, l: s.location, la: s.lat, ln: s.lng }))),
    [stops]
  );

  const jitter = (coord, i) => coord + 0.0001 * i;

  // ── Handle route result from OSRM ──────────────────────────────────────────
  const handleRouteCalculated = useCallback((route) => {
    setRouteLoading(false);
    if (!route) { setRouteGeometry(null); setRouteInfo(null); return; }

    if (route.geometry?.coordinates) {
      // OSRM returns [lng, lat] — Leaflet needs [lat, lng]
      setRouteGeometry(route.geometry.coordinates.map(c => [c[1], c[0]]));
      setRouteInfo({
        distance: route.totalDistance || route.distance,
        duration: route.totalDuration || route.duration,
      });
    }
  }, []);

  // ── Toggle real routes on/off ──────────────────────────────────────────────
  const handleToggle = useCallback((enabled) => {
    setShowRealRoute(enabled);
    if (!enabled) { setRouteGeometry(null); setRouteInfo(null); }
  }, []);

  // ── Geocode destination for initial map center ─────────────────────────────
  useEffect(() => {
    if (!destination) return;
    const cached = getCachedCoords(destination);
    if (cached) { setDestCenter([cached.lat, cached.lng]); return; }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`,
      { headers: { 'User-Agent': 'TravelPlannerApp/1.1' } })
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) {
          const c = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          setDestCenter([c.lat, c.lng]);
          setCachedCoords(destination, c);
        }
      })
      .catch(() => {});
  }, [destination]);

  // ── Geocode all stops ──────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    if (!stops?.length) { setMarkers([]); return; }

    const run = async () => {
      setLoading(true);
      const result = [];

      for (let i = 0; i < stops.length; i++) {
        if (!active) return;
        const s = stops[i];

        // A – use stored coordinates
        if (s.lat != null && s.lng != null && !isNaN(parseFloat(s.lat))) {
          result.push({ id: s._id || `m${i}`, lat: jitter(parseFloat(s.lat), i), lng: jitter(parseFloat(s.lng), i), title: s.activityTitle, time: s.time });
          if (active) setMarkers([...result]);
          continue;
        }

        // B – local cache
        const q = cleanQuery(s.location, s.activityTitle);
        if (!q) continue;
        const query = `${q}, ${destination}`;
        const cached = getCachedCoords(query);
        if (cached) {
          result.push({ id: s._id || `c${i}`, lat: jitter(cached.lat, i), lng: jitter(cached.lng, i), title: s.activityTitle, time: s.time });
          if (active) setMarkers([...result]);
          continue;
        }

        // C – Nominatim (rate-limited)
        try {
          if (i > 0) await delay(1200);
          if (!active) return;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
            { headers: { 'User-Agent': 'TravelPlannerApp/1.1' } }
          );
          if (res.status === 429) { await delay(5000); i--; continue; }
          const data = await res.json();
          if (data?.[0]) {
            const c = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            setCachedCoords(query, c);
            result.push({ id: s._id || `g${i}`, lat: jitter(c.lat, i), lng: jitter(c.lng, i), title: s.activityTitle, time: s.time });
            if (active) setMarkers([...result]);
          }
        } catch {}
      }

      if (active) setLoading(false);
    };

    run();
    return () => { active = false; };
  }, [stopsKey, destination, cleanQuery]);

  // ── Auto-recalculate when profile changes (if already showing real route) ──
  // Clear existing route result and force the user to recalculate with the new
  // profile. This avoids stale-closure issues and makes the behaviour explicit.
  useEffect(() => {
    setRouteGeometry(null);
    setRouteInfo(null);
  }, [profile]);

  // ── Polyline positions: real road geometry OR straight-line fallback ────────
  const polylinePositions = useMemo(() => {
    if (showRealRoute && routeGeometry) return routeGeometry;
    return markers.map(m => [m.lat, m.lng]);
  }, [markers, routeGeometry, showRealRoute]);

  const boundsForView = polylinePositions.length > 0 ? polylinePositions : null;

  return (
    <div style={{
      height: 380, width: '100%', marginBottom: 20, borderRadius: 16,
      overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)',
      background: '#f0f0f0', position: 'relative',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
    }}>
      {/* Geocoding spinner */}
      {loading && (
        <div style={{
          position: 'absolute', top: 15, right: 15, background: 'rgba(255,255,255,0.95)',
          padding: '8px 16px', borderRadius: 30, fontSize: 12, fontWeight: 700,
          zIndex: 2000, color: '#E07B2A', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <span style={{ width: 12, height: 12, border: '2px solid #E07B2A', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
          Mapping… {markers.length}/{stops?.length}
        </div>
      )}

      {/* Route info badge */}
      {routeInfo && showRealRoute && (
        <div style={{
          position: 'absolute', bottom: 10, right: 10, background: 'rgba(255,255,255,0.96)',
          padding: '8px 12px', borderRadius: 8, fontSize: 11, zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', lineHeight: 1.6
        }}>
          <div style={{ fontWeight: 700, color: '#E07B2A', marginBottom: 2 }}>Route Summary</div>
          <div>📏 {routeInfo.distance?.km ?? '–'} km</div>
          <div>⏱ {routeInfo.duration?.minutes ?? '–'} min</div>
          <div style={{ color: '#888', fontSize: 10 }}>via {profile}</div>
        </div>
      )}

      <MapContainer
        center={destCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomleft" />

        {/* Stop markers */}
        {markers.map((m, idx) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={createCustomIcon(idx + 1)}>
            <Popup>
              <div style={{ minWidth: 120 }}>
                <div style={{ color: '#E07B2A', fontWeight: 800, fontSize: 11 }}>{m.time || 'No time'}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route line — blue solid for real road, orange dashed for straight-line */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color={showRealRoute && routeGeometry ? '#2563eb' : '#E07B2A'}
            weight={showRealRoute && routeGeometry ? 5 : 4}
            opacity={showRealRoute && routeGeometry ? 0.85 : 0.6}
            dashArray={showRealRoute && routeGeometry ? null : '8, 12'}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Routing panel overlay */}
        <RoutingPanel
          markers={markers}
          onRouteCalculated={handleRouteCalculated}
          routeLoading={routeLoading}
          profile={profile}
          setProfile={setProfile}
          showRealRoute={showRealRoute}
          onToggle={handleToggle}
        />

        <ChangeView bounds={boundsForView} center={destCenter} />
      </MapContainer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default RouteMap;
