import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Simple Persistent Cache for Geocoding
const getCacheKey = (query) => `geo_cache_${query.toLowerCase().replace(/\W/g, '_')}`;
const getCachedCoords = (query) => {
  try {
    const cached = localStorage.getItem(getCacheKey(query));
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
};
const setCachedCoords = (query, coords) => {
  try {
    localStorage.setItem(getCacheKey(query), JSON.stringify(coords));
  } catch { /* storage full or private mode */ }
};

/**
 * Component to automatically adjust map bounds to fit all markers
 */
function ChangeView({ bounds, center }) {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (bounds && bounds.length > 0) {
        try {
          if (bounds.length === 1) {
            map.setView(bounds[0], 13);
          } else {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          }
        } catch (err) { console.warn('Map fitBounds failed:', err); }
      } else if (center) {
        map.setView(center, 13);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bounds, center, map]);

  return null;
}

/**
 * Custom Marker Icon Generator
 */
const createCustomIcon = (number, color = '#E07B2A') => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background-color: ${color};
      color: white;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 800;
      font-size: 13px;
      border: 2px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      position: relative;
    ">${number}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

function RouteMap({ stops, destination }) {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [destCenter, setDestCenter] = useState([35.6762, 139.6503]); // Default Tokyo

  // Helper for rate limiting
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const cleanLocationQuery = useCallback((location, title) => {
    let query = location || title;
    if (!query) return '';
    return query.replace(/\s+or\s+.*/i, '').replace(/\(.*\)/g, '').replace(/Area/gi, '').trim();
  }, []);

  const stopsJson = useMemo(() => 
    JSON.stringify((stops || []).map(s => ({ id: s._id, l: s.location, t: s.time, la: s.lat, ln: s.lng }))),
    [stops]
  );

  const addJitter = (coord, index) => coord + (0.0001 * index);

  // 1. Geocode the destination once to set the map center
  useEffect(() => {
    const geocodeDestination = async () => {
      if (!destination) return;
      const cached = getCachedCoords(destination);
      if (cached) {
        console.log('RouteMap: Using cached dest center for', destination);
        setDestCenter([cached.lat, cached.lng]);
        return;
      }
      try {
        console.log('RouteMap: Fetching dest center for', destination);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`, { 
          headers: { 'User-Agent': 'TravelPlannerApp/1.1 (Contact: travel@example.com)' } 
        });
        const data = await res.json();
        if (data && data.length > 0) {
          const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          console.log('RouteMap: Found dest center', coords);
          setDestCenter([coords.lat, coords.lng]);
          setCachedCoords(destination, coords);
        } else if (markers.length > 0) {
          // Fallback to first marker if destination search fails
          console.log('RouteMap: Dest search failed, falling back to first marker');
          setDestCenter([markers[0].lat, markers[0].lng]);
        }
      } catch (err) { 
        console.warn('RouteMap: Dest geocode failed:', err); 
        if (markers.length > 0) {
          setDestCenter([markers[0].lat, markers[0].lng]);
        }
      }
    };
    geocodeDestination();
  }, [destination, markers.length]);

  // 2. Main Geocoding Effect
  useEffect(() => {
    let isMounted = true;
    console.log('RouteMap: Geocoding started for', stops?.length, 'stops');

    const geocodeAll = async () => {
      if (!stops || stops.length === 0) {
        setMarkers([]);
        return;
      }

      setLoading(true);
      const newMarkers = [];

      for (let i = 0; i < stops.length; i++) {
        if (!isMounted) return;
        const stop = stops[i];
        
        // Step A: Use explicit coordinates if they exist
        if (stop.lat !== undefined && stop.lat !== null && stop.lng !== undefined && stop.lng !== null && !isNaN(parseFloat(stop.lat))) {
          console.log('RouteMap: Using explicit coords for', stop.activityTitle);
          newMarkers.push({
            id: stop._id || `m-${i}`,
            lat: addJitter(parseFloat(stop.lat), i),
            lng: addJitter(parseFloat(stop.lng), i),
            title: stop.activityTitle,
            time: stop.time
          });
          if (isMounted) setMarkers([...newMarkers]);
          continue;
        }

        // Step B: Use Local Cache
        const searchLocation = cleanLocationQuery(stop.location, stop.activityTitle);
        if (!searchLocation) {
          console.warn('RouteMap: No location for stop', i);
          continue;
        }
        
        const query = `${searchLocation}, ${destination}`;
        const cached = getCachedCoords(query);
        
        if (cached) {
          console.log('RouteMap: Using cached coords for', searchLocation);
          newMarkers.push({
            id: stop._id || `c-${i}`,
            lat: addJitter(cached.lat, i),
            lng: addJitter(cached.lng, i),
            title: stop.activityTitle,
            time: stop.time
          });
          if (isMounted) setMarkers([...newMarkers]);
          continue;
        }

        // Step C: Call API (with strict throttling)
        try {
          console.log('RouteMap: Fetching Nominatim for', query);
          await delay(1200); // 1.2s delay for safety
          if (!isMounted) return;

          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, { 
            headers: { 'User-Agent': 'TravelPlannerApp/1.1 (Contact: travel@example.com)' } 
          });
          
          if (res.status === 429) {
            console.warn('RouteMap: Rate limit! Waiting 5s...');
            await delay(5000);
            i--; continue;
          }

          const data = await res.json();
          if (data && data.length > 0) {
            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            console.log('RouteMap: Found coords for', query, coords);
            newMarkers.push({
              id: stop._id || `g-${i}`,
              lat: addJitter(coords.lat, i),
              lng: addJitter(coords.lng, i),
              title: stop.activityTitle,
              time: stop.time
            });
            setCachedCoords(query, coords);
            if (isMounted) setMarkers([...newMarkers]);
          } else {
            console.warn('RouteMap: No results for', query);
          }
        } catch (err) { 
          console.error('RouteMap: Geocode error for', query, err); 
        }
      }
      if (isMounted) {
        setLoading(false);
        console.log('RouteMap: Geocoding finished. Markers found:', newMarkers.length);
      }
    };

    geocodeAll();
    return () => { isMounted = false; };
  }, [stopsJson, destination, cleanLocationQuery]);

  const polylinePositions = useMemo(() => 
    markers.map(m => [m.lat, m.lng]), [markers]
  );

  return (
    <div className="route-map-container" style={{ height: '350px', width: '100%', marginBottom: '20px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', background: '#f0f0f0', position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
      {loading && (
        <div className="map-loading-overlay" style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.95)', padding: '8px 16px', borderRadius: '30px', fontSize: '12px', fontWeight: '700', zIndex: 2000, color: '#E07B2A', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div className="mini-spinner" style={{ width: '12px', height: '12px', border: '2px solid #E07B2A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          Mapping route... {markers.length}/{stops?.length}
        </div>
      )}
      
      {!destCenter && !loading && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8f9fa', color: '#666', fontSize: '14px', zIndex: 10 }}>
          Initializing map for {destination}...
        </div>
      )}

      <MapContainer 
        center={destCenter || [35.6762, 139.6503]} 
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {markers.map((marker, index) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={createCustomIcon(index + 1)}>
            <Popup>
              <div style={{ padding: '2px', minWidth: '120px' }}>
                <div style={{ color: '#E07B2A', fontWeight: '800', fontSize: '11px', marginBottom: '2px' }}>{marker.time || 'No time set'}</div>
                <div style={{ fontWeight: '600', fontSize: '14px', lineHeight: '1.2' }}>{marker.title}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {polylinePositions.length > 1 && (
          <Polyline positions={polylinePositions} color="#E07B2A" weight={4} opacity={0.6} dashArray="8, 12" lineJoin="round" lineCap="round" />
        )}

        <ChangeView bounds={polylinePositions.length > 0 ? polylinePositions : null} center={destCenter} />
      </MapContainer>
    </div>
  );
}

export default RouteMap;
