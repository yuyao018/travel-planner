import React, { useState, useEffect } from 'react';
import './planView.css';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const DETAILED_TRIP_DATA = {
  1: {
    city: 'Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    dates: 'Oct 12 - Oct 20, 2024',
    nights: 8,
    travellers: 2,
    budget: 5000,
    spent: 2300,
    currency: '$',
    hotel: {
      name: 'Shinjuku Prince Hotel',
      checkIn: '3:00 PM',
      address: '1-30-1 Kabukicho, Shinjuku'
    },
    schedule: {
      1: {
        date: 'Oct 12',
        stops: [
          { time: '09:00 AM', activity: 'Arrival at Narita', location: 'Narita Airport', category: 'LOGISTICS', duration: '1h 30m' },
          { time: '12:00 PM', activity: 'Check-in at Hotel', location: 'Shinjuku Prince Hotel', category: 'LOGISTICS', duration: '30m' },
          { time: '02:00 PM', activity: 'Lunch at Ichiran', location: 'Shinjuku', category: 'FOOD', duration: '1h' },
          { time: '04:00 PM', activity: 'Shibuya Crossing', location: 'Shibuya', category: 'SIGHTSEEING', duration: '2h' }
        ]
      },
      2: {
        date: 'Oct 13',
        stops: [
          { time: '10:00 AM', activity: 'Senso-ji Temple', location: 'Asakusa', category: 'SIGHTSEEING', duration: '2h' },
          { time: '01:00 PM', activity: 'Street Food Tour', location: 'Nakamise-dori', category: 'FOOD', duration: '1h 30m' },
          { time: '03:00 PM', activity: 'Tokyo Skytree', location: 'Sumida', category: 'SIGHTSEEING', duration: '2h' }
        ]
      }
    },
    expenses: [
      { category: 'Flight', cost: 1200, color: 'bg-orange' },
      { category: 'Hotel', cost: 1500, color: 'bg-blue' },
      { category: 'Food', cost: 800, color: 'bg-purple' },
      { category: 'Activities', cost: 1000, color: 'bg-green' },
      { category: 'Transport', cost: 500, color: 'bg-red' }
    ],
    route: {
      1: [
        { name: 'Narita → Shinjuku', transport: 'Express Train', time: '1h 15m' },
        { name: 'Shinjuku → Shibuya', transport: 'JR Line', time: '15m' }
      ]
    }
  }
};

function PlanView({ tripId, setCurrentPage }) {
  const [trip, setTrip] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const data = DETAILED_TRIP_DATA[tripId] || DETAILED_TRIP_DATA[1];
      setTrip(data);
      setIsLoading(false);

      if (API_KEY && API_KEY !== 'your_api_key_here') {
        try {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${data.city}&units=metric&appid=${API_KEY}`);
          const wData = await res.json();
          if (res.ok) {
            setWeather({ temp: Math.round(wData.main.temp), condition: wData.weather[0].main });
          }
        } catch (err) {
          console.error('Weather fetch error:', err);
        }
      } else {
        setWeather({ temp: 22, condition: 'Sunny' }); // Mock fallback
      }
    };
    fetchData();
  }, [tripId]);

  if (isLoading || !trip) return <div className="plan-container"><div className="fallback-state">Loading Itinerary...</div></div>;

  const totalActivities = Object.values(trip.schedule).reduce((acc, day) => acc + day.stops.length, 0);

  return (
    <div className="plan-container">
      {/* 1. Hero Banner */}
      <div className="hero-banner">
        <div className="hero-left">
          <a href="#" className="back-link" onClick={() => setCurrentPage('home')}>
            <ion-icon name="arrow-back-outline"></ion-icon> Back to Dashboard
          </a>
          <h1>{trip.city} {trip.flag}</h1>
          <div className="hero-info">
            <span><ion-icon name="calendar-outline"></ion-icon> {trip.dates}</span>
            <span><ion-icon name="moon-outline"></ion-icon> {trip.nights} Nights</span>
            <span><ion-icon name="people-outline"></ion-icon> {trip.travellers} Travellers</span>
          </div>
        </div>
        <div className="hero-right">
          {weather && (
            <div className="weather-chip">
              <ion-icon name={weather.condition.toLowerCase().includes('cloud') ? 'cloud-outline' : 'sunny-outline'}></ion-icon>
              <span className="temp">{weather.temp}°C</span>
              <span className="condition">{weather.condition}</span>
            </div>
          )}
        </div>
      </div>

      <div className="plan-content">
        {/* 2. Stat Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="icon-box amber"><ion-icon name="calendar"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Total Days</span>
              <span className="stat-value">{Object.keys(trip.schedule).length} Days</span>
              <span className="stat-subtitle">{trip.dates}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="icon-box green"><ion-icon name="list"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Total Activities</span>
              <span className="stat-value">{totalActivities} Stops</span>
              <span className="stat-subtitle">Planned itinerary</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="icon-box purple"><ion-icon name="wallet"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Total Budget</span>
              <span className="stat-value">{trip.currency}{trip.budget}</span>
              <span className="stat-subtitle">{trip.currency}{trip.spent} spent so far</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="icon-box blue"><ion-icon name="business"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Hotel Info</span>
              <span className="stat-value">Check-in {trip.hotel.checkIn}</span>
              <span className="stat-subtitle">{trip.hotel.name}</span>
            </div>
          </div>
        </div>

        {/* 3. Main Workspace */}
        <div className="workspace-grid">
          {/* Left Column: Itinerary */}
          <div className="itinerary-section">
            <div className="day-selector">
              {Object.keys(trip.schedule).map(day => (
                <div 
                  key={day} 
                  className={`day-tab ${activeDay === parseInt(day) ? 'active' : ''}`}
                  onClick={() => setActiveDay(parseInt(day))}
                >
                  Day {day} · {trip.schedule[day].date}
                </div>
              ))}
            </div>

            <div className="timeline">
              {trip.schedule[activeDay].stops.map((stop, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-left">{stop.time}</div>
                  <div className="timeline-middle">
                    <div className={`dot ${index === trip.schedule[activeDay].stops.length - 1 ? 'hollow' : ''}`}></div>
                    <div className="connector"></div>
                  </div>
                  <div className="timeline-right">
                    <div className="stop-card">
                      <div className="stop-header">
                        <div>
                          <h4>{stop.activity}</h4>
                          <div className="location-text">
                            <ion-icon name="location"></ion-icon> {stop.location}
                          </div>
                        </div>
                        <button className="btn-add-stop">
                          <ion-icon name="add-circle-outline"></ion-icon> Add stop
                        </button>
                      </div>
                      <div className="stop-footer">
                        <span className={`tag ${stop.category.toLowerCase()}`}>{stop.category}</span>
                        <span className="duration">
                          <ion-icon name="time-outline"></ion-icon> {stop.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column Panels */}
          <div className="side-panels">
            <div className="side-panel">
              <h3>Day {activeDay} Route</h3>
              <div className="route-list">
                {(trip.route[activeDay] || []).map((route, idx) => (
                  <div key={idx} className="route-item">
                    <div className="route-main">
                      <div className="route-dot"></div>
                      <div className="route-details">
                        <span className="route-name">{route.name}</span>
                        <span className="transport-info">
                          <ion-icon name="train-outline"></ion-icon> {route.transport}
                        </span>
                      </div>
                    </div>
                    <div className="time-badge">{route.time}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="side-panel">
              <h3>Budget Breakdown</h3>
              <div className="budget-list">
                {trip.expenses.map((expense, idx) => (
                  <div key={idx} className="budget-item">
                    <div className="budget-top">
                      <span className="cat-label">{expense.category}</span>
                      <span className="amount">{trip.currency}{expense.cost}</span>
                    </div>
                    <div className="progress-container">
                      <div className={`progress-bar ${expense.color}`} style={{ width: `${(expense.cost / trip.budget) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
                <div className="total-row">
                  <span>Total Spent</span>
                  <span>{trip.currency}{trip.spent}</span>
                </div>
              </div>
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlanView;
