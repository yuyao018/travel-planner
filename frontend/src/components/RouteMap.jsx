import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Webpack/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import shadowIcon from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: shadowIcon,
});

/**
 * Component to automatically adjust map bounds to fit all markers
 */
function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
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
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
      font-size: 12px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function RouteMap({ stops, destination }) {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper for rate limiting
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to clean up location strings for better geocoding
  const cleanLocationQuery = (location, title) => {
    let query = location || title;
    // Remove "or", "(NRT/HND)", and other ambiguous parts
    query = query.replace(/\s+or\s+.*/i, '');
    query = query.replace(/\(.*\)/g, '');
    query = query.replace(/Area/gi, '');
    return query.trim();
  };

  // Helper to add jitter to overlapping markers
  const addJitter = (coord, index) => {
    // Very small offset (approx 10-20 meters) based on index to separate markers
    const jitter = 0.0001 * index; 
    return coord + jitter;
  };

  useEffect(() => {
    let isMounted = true;

    const geocodeStops = async () => {
      if (!stops || stops.length === 0) {
        setMarkers([]);
        return;
      }

      setLoading(true);
      const newMarkers = [];

      for (let i = 0; i < stops.length; i++) {
        if (!isMounted) return;
        
        const stop = stops[i];
        
        // 1. Check if stop already has explicit coordinates (Stored in DB or from Search)
        if (stop.lat && stop.lng) {
          newMarkers.push({
            id: stop._id || i,
            lat: addJitter(parseFloat(stop.lat), i),
            lng: addJitter(parseFloat(stop.lng), i),
            title: stop.activityTitle,
            time: stop.time,
          });
          // Skip geocoding if we already have coordinates
          if (isMounted) setMarkers([...newMarkers]);
          continue;
        }

        // 2. Geocode using Nominatim
        try {
          if (i > 0) await delay(1000);

          const searchLocation = cleanLocationQuery(stop.location, stop.activityTitle);
          const query = `${searchLocation}, ${destination}`;
          
          let response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'SmartTravelPlanner/1.0'
              }
            }
          );
          
          if (response.status === 429) {
            await delay(2000);
            i--; 
            continue;
          }

          let data = await response.json();
          
          // Fallback: If specific location fails, try geocoding just the activity title or destination area
          if ((!data || data.length === 0) && stop.location) {
            await delay(1000);
            const fallbackQuery = `${stop.activityTitle}, ${destination}`;
            response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1`,
              { headers: { 'User-Agent': 'SmartTravelPlanner/1.0' } }
            );
            data = await response.json();
          }

          if (data && data.length > 0) {
            newMarkers.push({
              id: stop._id || i,
              lat: addJitter(parseFloat(data[0].lat), i),
              lng: addJitter(parseFloat(data[0].lon), i),
              title: stop.activityTitle,
              time: stop.time,
            });
          } else {
            console.warn(`No coordinates found for: ${stop.activityTitle}`);
            // Final Fallback: Put it at the general destination coordinates if all else fails 
            // so the marker at least exists in the list
          }
        } catch (err) {
          console.error(`Geocoding failed for ${stop.activityTitle}:`, err);
        }

        if (isMounted) {
          setMarkers([...newMarkers]);
        }
      }

      if (isMounted) setLoading(false);
    };

    geocodeStops();

    return () => {
      isMounted = false;
    };
  }, [stops, destination]);

  const polylinePositions = markers.map(m => [m.lat, m.lng]);
  const bounds = markers.length > 0 ? markers.map(m => [m.lat, m.lng]) : null;

  // Default center if no markers
  const defaultCenter = [35.6762, 139.6503]; // Tokyo

  return (
    <div className="route-map-container" style={{ height: '300px', width: '100%', marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
      {loading && <div className="map-loading-overlay">Updating route...</div>}
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {markers.map((marker, index) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]}
            icon={createCustomIcon(index + 1)}
          >
            <Popup>
              <strong>{marker.time || '--:--'}</strong><br />
              {marker.title}
            </Popup>
          </Marker>
        ))}

        {polylinePositions.length > 1 && (
          <Polyline 
            positions={polylinePositions} 
            color="#E07B2A" 
            weight={3} 
            opacity={0.7}
            dashArray="10, 10"
          />
        )}

        {bounds && <ChangeView bounds={bounds} />}
      </MapContainer>
    </div>
  );
}

export default RouteMap;
