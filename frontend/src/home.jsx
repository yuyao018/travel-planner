import React, { useState, useEffect } from 'react';
import './home.css';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const MOCK_TRIPS = [
  {
    id: 1,
    city: 'Tokyo',
    country: 'Japan',
    dates: 'Oct 12 - Oct 20, 2024',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=300&q=80',
    attractions: [
      { name: 'Shibuya Crossing', rating: 5 },
      { name: 'Senso-ji Temple', rating: 4 },
      { name: 'Tokyo Skytree', rating: 5 }
    ]
  },
  {
    id: 2,
    city: 'Paris',
    country: 'France',
    dates: 'Dec 05 - Dec 12, 2024',
    status: 'completed',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=300&q=80',
    attractions: [
      { name: 'Eiffel Tower', rating: 5 },
      { name: 'Louvre Museum', rating: 5 },
      { name: 'Notre-Dame', rating: 4 }
    ]
  },
  {
    id: 3,
    city: 'New York',
    country: 'USA',
    dates: 'Jan 15 - Jan 22, 2025',
    status: 'ongoing',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=300&q=80',
    attractions: [
      { name: 'Times Square', rating: 4 },
      { name: 'Central Park', rating: 5 },
      { name: 'Statue of Liberty', rating: 5 }
    ]
  },
  {
    id: 4,
    city: 'London',
    country: 'UK',
    dates: 'Mar 10 - Mar 15, 2025',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=300&q=80',
    attractions: [
      { name: 'Big Ben', rating: 5 },
      { name: 'London Eye', rating: 4 },
      { name: 'British Museum', rating: 5 }
    ]
  }
];

function Home({ setCurrentPage, setSelectedTripId }) {
  const [hoveredTrip, setHoveredTrip] = useState(MOCK_TRIPS[0]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');

  const handleTripClick = (id) => {
    setSelectedTripId(id);
    setCurrentPage('planview');
  };

  const filteredTrips = filter === 'All' 
    ? MOCK_TRIPS 
    : MOCK_TRIPS.filter(trip => trip.status.toLowerCase() === filter.toLowerCase());

  useEffect(() => {
    const fetchWeather = async () => {
      if (!API_KEY || API_KEY === 'your_api_key_here') {
        console.warn('OpenWeatherMap API Key is missing or placeholder. Falling back to mock data.');
        setWeather({
          temp: '22°C',
          condition: 'Sunny',
          wind: '12 km/h',
          uv: 'Moderate',
          sunrise: '05:45 AM'
        });
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${hoveredTrip.city}&units=metric&appid=${API_KEY}`
        );
        const data = await response.json();

        if (response.ok) {
          setWeather({
            temp: `${Math.round(data.main.temp)}°C`,
            condition: data.weather[0].main,
            wind: `${data.wind.speed} m/s`,
            uv: 'N/A',
            sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        } else {
          console.error('Weather API Error:', data.message);
          // Fallback to mock data if API key is invalid or other API error
          setWeather({
            temp: '24°C',
            condition: 'Sunny',
            wind: '10 km/h',
            uv: 'Low',
            sunrise: '06:15 AM'
          });
        }
      } catch (error) {
        console.error('Network Error:', error);
        setWeather({
          temp: '20°C',
          condition: 'Cloudy',
          wind: '5 km/h',
          uv: 'N/A',
          sunrise: '07:00 AM'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [hoveredTrip]);

  const renderStars = (rating) => {
    return (
      <div className="rating-stars">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < rating ? 'star-filled' : 'star-empty'}>
            {i < rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

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
          <div className="user-profile-circle" onClick={() => setCurrentPage('landing')}>
            <ion-icon name="person-outline"></ion-icon>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* 2. Stat Cards Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="icon-box amber"><ion-icon name="briefcase"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Total Trips</span>
              <span className="stat-value">12 Trips</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="icon-box green"><ion-icon name="calendar"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Upcoming</span>
              <span className="stat-value">3 Trips</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="icon-box purple"><ion-icon name="earth"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Countries</span>
              <span className="stat-value">8 Visited</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="icon-box blue"><ion-icon name="star"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Favorites</span>
              <span className="stat-value">4 Saved</span>
            </div>
          </div>
        </div>

        {/* 3. Main Body Grid */}
        <div className="dashboard-grid">
          {/* Left Column: Trip List */}
          <section className="trips-section">
            <div className="trips-header">
              <h2>Your Itineraries</h2>
              <div className="filter-buttons">
                {['All', 'Upcoming', 'Ongoing', 'Completed'].map((type) => (
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
              {filteredTrips.map((trip) => (
                <div 
                  key={trip.id} 
                  className="trip-card"
                  onMouseEnter={() => setHoveredTrip(trip)}
                  onClick={() => handleTripClick(trip.id)}
                >
                  <img src={trip.image} alt={trip.city} className="trip-image" />
                  <div className="trip-info">
                    <h4>{trip.city}, {trip.country}</h4>
                    <p><ion-icon name="calendar-outline"></ion-icon> {trip.dates}</p>
                  </div>
                  <div className={`status-pill ${trip.status}`}>
                    {trip.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right Column: Preview Panel */}
          <aside className="right-column">
            <div className="preview-panel">
              <h2>{hoveredTrip.city}</h2>
              
              <div className="weather-widget">
                {loading ? (
                  <p>Loading weather...</p>
                ) : weather ? (
                  <div className="weather-grid">
                    <div className="weather-item">
                      <span>Temp</span>
                      <p>{weather.temp}</p>
                    </div>
                    <div className="weather-item">
                      <span>Condition</span>
                      <p>{weather.condition}</p>
                    </div>
                    <div className="weather-item">
                      <span>Wind</span>
                      <p>{weather.wind}</p>
                    </div>
                    <div className="weather-item">
                      <span>Sunrise</span>
                      <p>{weather.sunrise}</p>
                    </div>
                  </div>
                ) : (
                  <p>No weather data available</p>
                )}
              </div>

              <div className="attractions-panel">
                <h3>Top Attractions</h3>
                <div className="attractions-list">
                  {hoveredTrip.attractions.map((attr, index) => (
                    <div key={index} className="attraction-item">
                      <span className="attraction-name">{attr.name}</span>
                      {renderStars(attr.rating)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Home;
