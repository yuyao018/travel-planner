import React, { useState, useEffect } from 'react';
import './home.css';
import { useAuth } from './context/AuthContext';
import { tripsAPI, weatherAPI } from './services/api';

function Home({ setCurrentPage, setSelectedTripId }) {
  const { logout } = useAuth();
  const [trips, setTrips] = useState([]);
  const [metrics, setMetrics] = useState({ totalPlannedTrips: 0, upcomingTrips: 0, countriesPlanned: 0 });
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [filter, setFilter] = useState('All');

  // Fetch trips from backend on mount
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const data = await tripsAPI.getAll();
        setTrips(data.trips || []);
        setMetrics(data.metrics || { totalPlannedTrips: 0, upcomingTrips: 0, countriesPlanned: 0 });

        // Select first trip by default
        if (data.trips && data.trips.length > 0) {
          setSelectedTrip(data.trips[0]);
        }
      } catch (err) {
        console.error('Failed to fetch trips:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  // Fetch weather via backend proxy when selected trip changes
  useEffect(() => {
    const fetchWeather = async () => {
      if (!selectedTrip) return;

      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const data = await weatherAPI.getWeather(selectedTrip.destination);
        setWeather(data.weather);
      } catch (err) {
        console.error('Weather fetch error:', err.message);
        setWeatherError(err.message);
        setWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [selectedTrip]);

  const handleTripClick = (trip) => {
    setSelectedTripId(trip._id);
    setCurrentPage('planview');
  };

  const handleEditTrip = (e, trip) => {
    e.stopPropagation(); // Prevent triggering the card click (planview)
    setSelectedTripId(trip._id);
    setCurrentPage('edittrip');
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('landing');
  };

  // Filter trips by status
  const getFilteredTrips = () => {
    const now = new Date();
    if (filter === 'All') return trips;
    if (filter === 'Upcoming') return trips.filter(t => new Date(t.startDate) > now);
    if (filter === 'Ongoing') return trips.filter(t => new Date(t.startDate) <= now && new Date(t.endDate) >= now);
    if (filter === 'Passed') return trips.filter(t => new Date(t.endDate) < now);
    return trips;
  };

  const filteredTrips = getFilteredTrips();

  const getTripStatus = (trip) => {
    const now = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    if (start > now) return 'upcoming';
    if (start <= now && end >= now) return 'ongoing';
    return 'passed';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="fallback-state">Loading your trips...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 1. Dark Hero Banner */}
      <header className="home-hero">
        <div className="hero-left">
          <h1>Travel <span>Planner</span> ✈</h1>
          <p className="hero-subtext">Coordinating your next adventure, step by step.</p>
        </div>
        <div className="nav-right">
          <button 
            className="btn-add-trip"
            onClick={() => setCurrentPage('addtrip')}
          >
            <ion-icon name="add-circle-outline"></ion-icon>
            Add Trip
          </button>
          <div className="user-profile-circle" onClick={handleLogout}>
            <ion-icon name="log-out-outline"></ion-icon>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* 2. Stat Cards Row */}
        <div className="home-stats-grid">
          <div className="home-stat-card">
            <div className="icon-box amber"><ion-icon name="briefcase"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Total Trips</span>
              <span className="stat-value">{metrics.totalPlannedTrips} Trips</span>
            </div>
          </div>
          <div className="home-stat-card">
            <div className="icon-box green"><ion-icon name="calendar"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Upcoming</span>
              <span className="stat-value">{metrics.upcomingTrips} Trips</span>
            </div>
          </div>
          <div className="home-stat-card">
            <div className="icon-box purple"><ion-icon name="earth"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Countries</span>
              <span className="stat-value">{metrics.countriesPlanned} Planned</span>
            </div>
          </div>
        </div>

        {/* 3. Main Body Grid */}
        <div className="dashboard-grid">
          {/* Left Column: Trip List */}
          <section className="trips-section">
            <div className="trips-header">
              <h2>All Trips</h2>
              <div className="filter-buttons">
                {['All', 'Upcoming', 'Ongoing', 'Passed'].map((type) => (
                  <button 
                    key={type}
                    className={`filter-btn ${filter === type ? 'active' : ''}`}
                    onClick={() => setFilter(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="trips-list">
              {filteredTrips.length === 0 ? (
                <div className="empty-state">
                  <p>No trips found. Click "Add Trip" to plan your first adventure!</p>
                </div>
              ) : (
                filteredTrips.map((trip) => (
                  <div 
                    key={trip._id} 
                    className={`trip-card ${selectedTrip && selectedTrip._id === trip._id ? 'selected' : ''}`}
                    onMouseEnter={() => setSelectedTrip(trip)}
                    onClick={() => handleTripClick(trip)}
                  >
                    <div className="trip-info">
                      <h4>{trip.destination}</h4>
                      <p className="trip-name">{trip.tripName}</p>
                      <p><ion-icon name="calendar-outline"></ion-icon> {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</p>
                    </div>
                    <div className="trip-card-actions">
                      <button 
                        className="btn-edit-trip" 
                        onClick={(e) => handleEditTrip(e, trip)}
                        title="Edit trip"
                      >
                        <ion-icon name="create-outline"></ion-icon>
                      </button>
                      <div className={`status-pill ${getTripStatus(trip)}`}>
                        {getTripStatus(trip)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Right Column: Preview Panel */}
          <aside className="right-column">
            <div className="preview-panel">
              <h2>{selectedTrip ? selectedTrip.destination : 'Select a trip'}</h2>
              
              <div className="weather-widget">
                {weatherLoading ? (
                  <p>Loading weather...</p>
                ) : weather ? (
                  <div className="weather-grid">
                    <div className="weather-item">
                      <span>Temp</span>
                      <p>{weather.temperature}°C</p>
                    </div>
                    <div className="weather-item">
                      <span>Condition</span>
                      <p>{weather.description}</p>
                    </div>
                    <div className="weather-item">
                      <span>Wind</span>
                      <p>{weather.windSpeed} m/s</p>
                    </div>
                    <div className="weather-item">
                      <span>Humidity</span>
                      <p>{weather.humidity}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="weather-error">
                    {selectedTrip 
                      ? (weatherError || 'Weather data unavailable') 
                      : 'Hover over a trip to see weather'}
                  </p>
                )}
              </div>

              {selectedTrip && (
                <div className="trip-details-panel">
                  <h3 className="details-label">TRIP DETAILS</h3>
                  
                  <div className="details-grid">
                    <div className="detail-block">
                      <span className="detail-label">TOTAL BUDGET</span>
                      <p className="detail-value budget-value">
                        {selectedTrip.currency} {selectedTrip.budget?.toLocaleString()}
                      </p>
                    </div>

                    <div className="detail-block">
                      <span className="detail-label">ACCOMMODATION</span>
                      <p className="detail-value">
                        <ion-icon name="business-outline"></ion-icon> {selectedTrip.hotelLocation || 'Not specified'}
                      </p>
                    </div>

                    <div className="detail-block full-width">
                      <span className="detail-label">TRAVEL PREFERENCES</span>
                      <div className="preferences-tags">
                        {selectedTrip.travelPreferences && selectedTrip.travelPreferences.length > 0 ? (
                          selectedTrip.travelPreferences.map(pref => (
                            <span key={pref} className={`pref-tag ${pref.toLowerCase()}`}>{pref}</span>
                          ))
                        ) : (
                          <span className="no-prefs">No preferences set</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Home;
