import React, { useState, useEffect, useRef } from 'react';
import './planView.css';
import { tripsAPI, stopsAPI, budgetAPI, weatherAPI, placesAPI, aiAPI } from './services/api';
import RouteMap from './components/RouteMap';

const CATEGORY_OPTIONS = ['Food', 'Sightseeing', 'Logistics', 'Shopping', 'Transport', 'Adventure', 'Culture', 'General'];

function PlanView({ tripId, setCurrentPage }) {
  const [trip, setTrip] = useState(null);
  const [stops, setStops] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Stop form state
  const [showStopForm, setShowStopForm] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [stopForm, setStopForm] = useState({
    day: 1,
    time: '',
    activityTitle: '',
    location: '',
    category: 'General',
    durationHours: '0',
    durationMinutes: '30',
    notes: '',
  });
  const [savingStop, setSavingStop] = useState(false);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({ amount: '', currency: '', category: 'Food', notes: '' });
  const [addingExpense, setAddingExpense] = useState(false);

  // Nearby places (Foursquare) state
  const [placesQuery, setPlacesQuery] = useState('');
  const [placesResults, setPlacesResults] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Ref for scrolling to timeline after adding a place
  const timelineRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tripData = await tripsAPI.getOne(tripId);
        setTrip(tripData.trip);

        const stopsData = await stopsAPI.getAll(tripId);
        setStops(stopsData.stops || []);

        const budgetData = await budgetAPI.getExpenses(tripId);
        setExpenses(budgetData.expenses || []);
        setBudgetSummary(budgetData.summary || null);

        try {
          const weatherData = await weatherAPI.getWeather(tripData.trip.destination);
          setWeather(weatherData.weather);
        } catch (weatherErr) {
          console.error('Weather unavailable:', weatherErr.message);
        }
      } catch (err) {
        console.error('Failed to load trip data:', err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (tripId) fetchData();
  }, [tripId]);

  // Group stops by day and ensure they are sorted by time
  const stopsByDay = stops.reduce((acc, stop) => {
    const day = stop.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(stop);
    return acc;
  }, {});

  // Sort stops within each day chronologically
  Object.keys(stopsByDay).forEach(day => {
    stopsByDay[day].sort((a, b) => {
      // If time is missing, treat it as very late (or very early, but usually better at the end)
      const timeA = a.time || '99:99';
      const timeB = b.time || '99:99';
      
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;
      
      // If times are equal, use the order field
      return (a.order || 0) - (b.order || 0);
    });
  });

  // Calculate trip duration
  const getTripDuration = () => {
    if (!trip) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const tripDuration = getTripDuration();

  // Generate day tabs (based on trip duration, not just existing stops)
  const dayTabs = [];
  for (let i = 1; i <= tripDuration; i++) {
    dayTabs.push(i);
  }

  // ─── Stop Handlers ─────────────────────────────────────────────────────────

  const parseDuration = (durationStr) => {
    if (!durationStr) return { hours: '0', minutes: '30' };
    
    let hours = '0';
    let minutes = '0';
    
    const hourMatch = durationStr.match(/(\d+)h/);
    const minuteMatch = durationStr.match(/(\d+)m/);
    
    if (hourMatch) hours = hourMatch[1];
    if (minuteMatch) minutes = minuteMatch[1];
    
    return { hours, minutes };
  };

  const openAddStopForm = () => {
    setEditingStop(null);
    setStopForm({
      day: activeDay,
      time: '',
      activityTitle: '',
      location: '',
      category: 'General',
      durationHours: '0',
      durationMinutes: '30',
      notes: '',
    });
    setShowStopForm(true);
  };

  const openEditStopForm = (stop) => {
    const { hours, minutes } = parseDuration(stop.duration);
    setEditingStop(stop);
    setStopForm({
      day: stop.day || 1,
      time: stop.time || '',
      activityTitle: stop.activityTitle || '',
      location: stop.location || '',
      category: stop.category || 'General',
      durationHours: hours,
      durationMinutes: minutes,
      notes: stop.notes || '',
    });
    setShowStopForm(true);
  };

  const handleStopFormChange = (e) => {
    const { name, value } = e.target;
    setStopForm(prev => ({ ...prev, [name]: value }));
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  };

  const minutesToTime = (totalMinutes) => {
    // Handle overflow past 24 hours
    const normalizedMinutes = totalMinutes % (24 * 60);
    const hrs = Math.floor(normalizedMinutes / 60);
    const mins = normalizedMinutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleSaveStop = async (e) => {
    e.preventDefault();
    setSavingStop(true);

    try {
      // 1. Geocode the location if it's new/changed to get lat/lng
      let lat = editingStop?.lat || null;
      let lng = editingStop?.lng || null;

      // If location changed or is new, geocode it
      if (!editingStop || editingStop.location !== stopForm.location) {
        try {
          const query = `${stopForm.location || stopForm.activityTitle}, ${trip.destination}`;
          console.log('PlanView: Geocoding stop location:', query);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
            { headers: { 'User-Agent': 'TravelPlannerApp/1.1 (Contact: travel@example.com)' } }
          );
          const data = await response.json();
          if (data && data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
            console.log('PlanView: Found coordinates:', lat, lng);
          } else {
            console.warn('PlanView: No coordinates found for:', query);
          }
        } catch (err) {
          console.warn('PlanView: Geocoding during save failed:', err);
        }
      }

      // 2. Construct duration string and calculate duration in minutes
      let duration = '';
      const dHours = parseInt(stopForm.durationHours) || 0;
      const dMinutes = parseInt(stopForm.durationMinutes) || 0;
      const totalDurationMinutes = dHours * 60 + dMinutes;

      if (dHours > 0) duration += `${dHours}h `;
      if (dMinutes > 0) duration += `${dMinutes}m`;
      duration = duration.trim();

      const finalStopData = {
        ...stopForm,
        duration,
        lat,
        lng,
        day: parseInt(stopForm.day),
      };

      let savedStop;
      if (editingStop) {
        // Update existing stop
        const result = await stopsAPI.update(editingStop._id, finalStopData);
        savedStop = result.stop || { ...finalStopData, _id: editingStop._id };
      } else {
        // Create new stop
        const result = await stopsAPI.create(tripId, finalStopData);
        savedStop = result.stop;
      }

      // 3. Shift subsequent stops if the saved stop has a time and duration
      if (savedStop && savedStop.time && totalDurationMinutes > 0) {
        const currentDayStops = stops.filter(s => 
          s.day === savedStop.day && 
          s._id !== savedStop._id && 
          s.time
        );

        const newStopMinutes = timeToMinutes(savedStop.time);
        
        // Find stops that occur at or after the new stop's start time
        const stopsToShift = currentDayStops.filter(s => {
          const sMinutes = timeToMinutes(s.time);
          return sMinutes >= newStopMinutes;
        });

        if (stopsToShift.length > 0) {
          // Shift each stop by the new stop's duration
          const shiftPromises = stopsToShift.map(async (s) => {
            const currentMinutes = timeToMinutes(s.time);
            const shiftedMinutes = currentMinutes + totalDurationMinutes;
            const shiftedTime = minutesToTime(shiftedMinutes);
            
            return stopsAPI.update(s._id, { ...s, time: shiftedTime });
          });

          await Promise.all(shiftPromises);
        }
      }

      // Refresh stops
      const stopsData = await stopsAPI.getAll(tripId);
      setStops(stopsData.stops || []);

      setShowStopForm(false);
      setEditingStop(null);
    } catch (err) {
      console.error('Failed to save stop:', err.message);
    } finally {
      setSavingStop(false);
    }
  };

  const handleDeleteStop = async (stopId) => {
    if (!window.confirm('Delete this stop?')) return;

    try {
      await stopsAPI.delete(stopId);

      // Refresh stops
      const stopsData = await stopsAPI.getAll(tripId);
      setStops(stopsData.stops || []);
    } catch (err) {
      console.error('Failed to delete stop:', err.message);
    }
  };

  // ─── Expense Handlers ──────────────────────────────────────────────────────

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setAddingExpense(true);

    try {
      await budgetAPI.addExpense({
        tripId,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        notes: expenseForm.notes,
        currency: expenseForm.currency || trip.currency,
      });

      const budgetData = await budgetAPI.getExpenses(tripId);
      setExpenses(budgetData.expenses || []);
      setBudgetSummary(budgetData.summary || null);
      setExpenseForm({ amount: '', currency: '', category: 'Food', notes: '' });
    } catch (err) {
      console.error('Failed to add expense:', err.message);
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await budgetAPI.deleteExpense(expenseId);

      const budgetData = await budgetAPI.getExpenses(tripId);
      setExpenses(budgetData.expenses || []);
      setBudgetSummary(budgetData.summary || null);
    } catch (err) {
      console.error('Failed to delete expense:', err.message);
    }
  };

  // Category icon mapping
  const getCategoryIcon = (category) => {
    const icons = {
      food: '🍔',
      sightseeing: '📸',
      logistics: '✈️',
      shopping: '🛍️',
      transport: '🚗',
      adventure: '🏔️',
      culture: '🏛️',
      general: '📍',
    };
    return icons[category?.toLowerCase()] || '📍';
  };

  // ─── Nearby Places (Foursquare) Handlers ─────────────────────────────────

  const handleSearchPlaces = async (e) => {
    e.preventDefault();
    if (!placesQuery.trim()) return;

    setPlacesLoading(true);
    setPlacesError('');
    setPlacesResults([]);

    try {
      // Use trip destination as the "near" location — Foursquare geocodes it
      const data = await placesAPI.searchByLocation(
        placesQuery.trim(),
        trip.destination,
        10
      );
      setPlacesResults(data.places || []);

      if (data.places && data.places.length === 0) {
        setPlacesError('No places found. Try a different search term.');
      }
    } catch (err) {
      console.error('Places search error:', err.message);
      setPlacesError(err.message || 'Failed to search nearby places.');
    } finally {
      setPlacesLoading(false);
    }
  };

  const handleAddPlaceAsStop = async (place) => {
    try {
      await stopsAPI.create(tripId, {
        day: activeDay,
        time: '',
        activityTitle: place.name,
        location: place.address || '',
        category: mapPlaceCategory(place.categories),
        duration: '',
        notes: place.rating ? `Rating: ${place.rating}/5` : '',
        lat: place.lat || null,
        lng: place.lng || null,
      });

      // Refresh stops
      const stopsData = await stopsAPI.getAll(tripId);
      setStops(stopsData.stops || []);

      // Reset places search results
      setPlacesResults([]);
      setPlacesQuery('');

      // Scroll down to the timeline to show the newly added stop
      setTimeout(() => {
        timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('Failed to add place as stop:', err.message);
    }
  };

  // Map Google Places category to our stop categories
  const mapPlaceCategory = (categories) => {
    if (!categories || categories.length === 0) return 'General';
    const catName = categories[0].name.toLowerCase();
    if (catName.includes('restaurant') || catName.includes('food') || catName.includes('cafe') || catName.includes('bar') || catName.includes('bakery')) return 'Food';
    if (catName.includes('hotel') || catName.includes('lodging') || catName.includes('inn')) return 'Logistics';
    if (catName.includes('shop') || catName.includes('store') || catName.includes('mall') || catName.includes('market')) return 'Shopping';
    if (catName.includes('museum') || catName.includes('temple') || catName.includes('shrine') || catName.includes('monument') || catName.includes('historic')) return 'Culture';
    if (catName.includes('park') || catName.includes('garden') || catName.includes('beach') || catName.includes('scenic') || catName.includes('viewpoint')) return 'Sightseeing';
    if (catName.includes('sport') || catName.includes('outdoor') || catName.includes('hiking') || catName.includes('adventure')) return 'Adventure';
    if (catName.includes('station') || catName.includes('airport') || catName.includes('bus') || catName.includes('transit')) return 'Transport';
    return 'Sightseeing';
  };

  const handleGenerateAI = async () => {
    if (!window.confirm('This will replace your current itinerary with an AI-generated one. Continue?')) {
      return;
    }

    setIsGeneratingAI(true);
    try {
      await aiAPI.generateItinerary(tripId);
      // Refresh stops
      const stopsData = await stopsAPI.getAll(tripId);
      setStops(stopsData.stops || []);
      alert('AI Itinerary generated successfully!');
    } catch (err) {
      console.error('AI Generation error:', err.message);
      alert('Failed to generate itinerary: ' + err.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your adventure...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="plan-container">
        <div className="fallback-state">
          <p>{error || 'Trip not found.'}</p>
          <button onClick={() => setCurrentPage('home')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const budgetSpent = budgetSummary?.totalSpent || 0;
  const budgetTotal = trip.budget || 0;
  const budgetPercent = budgetTotal > 0 ? Math.min((budgetSpent / budgetTotal) * 100, 100) : 0;

  return (
    <div className="plan-container">
      {/* 1. Hero Banner */}
      <div className="hero-banner">
        <div className="hero-left">
          <a href="#" className="back-link" onClick={() => setCurrentPage('home')}>
            <ion-icon name="arrow-back-outline"></ion-icon> Back to Dashboard
          </a>
          <h1>{trip.destination}</h1>
          <div className="hero-info">
            <span><ion-icon name="calendar-outline"></ion-icon> {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</span>
            <span><ion-icon name="moon-outline"></ion-icon> {tripDuration} Days</span>
            <span><ion-icon name="wallet-outline"></ion-icon> {trip.currency} {trip.budget}</span>
            {(trip.arrivalAirport || trip.departureAirport) && (
              <span>
                <ion-icon name="airplane-outline"></ion-icon> 
                {trip.arrivalAirport || '???'} → {trip.departureAirport || '???'}
              </span>
            )}
          </div>
        </div>
        <div className="hero-right">
          {weather && (
            <div className="weather-chip">
              <ion-icon name={weather.description?.includes('cloud') ? 'cloud-outline' : 'sunny-outline'}></ion-icon>
              <span className="temp">{weather.temperature}°C</span>
              <span className="condition">{weather.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="plan-content">
        {/* 2. Stat Cards */}
        <div className="plan-stats-grid">
          <div className="plan-stat-card">
            <div className="icon-box amber"><ion-icon name="calendar"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{tripDuration} Days</span>
            </div>
          </div>
          <div className="plan-stat-card">
            <div className="icon-box green"><ion-icon name="list"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Activities</span>
              <span className="stat-value">{stops.length} Stops</span>
            </div>
          </div>
          <div className="plan-stat-card">
            <div className="icon-box purple"><ion-icon name="wallet"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Budget</span>
              <span className="stat-value">{trip.currency} {budgetTotal}</span>
              <span className="stat-subtitle">{trip.currency} {budgetSpent.toFixed(2)} spent</span>
            </div>
          </div>
          <div className="plan-stat-card">
            <div className="icon-box blue"><ion-icon name="business"></ion-icon></div>
            <div className="stat-text">
              <span className="stat-label">Hotel</span>
              <span className="stat-value">{trip.hotelLocation || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* 3. Main Workspace */}
        <div className="workspace-grid">
          {/* Left Column: Itinerary Timeline */}
          <div className="itinerary-section">
            <div className="itinerary-header">
              <div className="day-selector">
                {dayTabs.map(day => (
                  <div 
                    key={day} 
                    className={`day-tab ${activeDay === day ? 'active' : ''}`}
                    onClick={() => setActiveDay(day)}
                  >
                    Day {day}
                  </div>
                ))}
              </div>
              <div className="itinerary-actions">
                <button className="btn-ai-generate" onClick={handleGenerateAI} disabled={isGeneratingAI}>
                  <ion-icon name={isGeneratingAI ? 'sync-outline' : 'sparkles-outline'} className={isGeneratingAI ? 'rotating' : ''}></ion-icon>
                  {isGeneratingAI ? 'Generating...' : 'AI Generate'}
                </button>
                <button className="btn-add-stop" onClick={openAddStopForm}>
                  <ion-icon name="add-circle-outline"></ion-icon> Add Stop
                </button>
              </div>
            </div>

            {/* Discover Nearby Places (Google Places via SerpAPI) */}
            <div className="places-panel">
              <h3>Discover Nearby Places</h3>
              <p className="panel-subtitle">Search for attractions, restaurants, and hotels near {trip.destination}.</p>
              
              <form className="places-search-form" onSubmit={handleSearchPlaces}>
                <input
                  type="text"
                  placeholder="e.g., restaurant, temple, museum"
                  value={placesQuery}
                  onChange={(e) => setPlacesQuery(e.target.value)}
                />
                <button type="submit" disabled={placesLoading}>
                  {placesLoading ? '...' : 'Search'}
                </button>
              </form>

              {placesError && <p className="places-error">{placesError}</p>}

              {placesResults.length > 0 && (
                <div className="places-results-grid">
                  {placesResults.map((place) => (
                    <div key={place.id} className="place-item">
                      <div className="place-info">
                        <span className="place-name">{place.name}</span>
                        {place.categories && place.categories.length > 0 && (
                          <span className="place-category">{place.categories[0].name}</span>
                        )}
                        {place.address && <span className="place-address">{place.address}</span>}
                        {place.rating && <span className="place-rating">Rating: {place.rating}/5</span>}
                      </div>
                      <button 
                        className="btn-add-place"
                        onClick={() => handleAddPlaceAsStop(place)}
                        title="Add as stop to Day"
                      >
                        <ion-icon name="add-circle-outline"></ion-icon>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Route Map */}
            <RouteMap 
              key={`map-day-${activeDay}`}
              stops={stopsByDay[activeDay] || []} 
              destination={trip.destination} 
            />

            {/* Add/Edit Stop Form */}
            {showStopForm && (
              <div className="stop-form-overlay">
                <form className="stop-form" onSubmit={handleSaveStop}>
                  <h3>{editingStop ? 'Edit Stop' : 'Add New Stop'}</h3>
                  
                  <div className="stop-form-grid">
                    <div className="stop-form-group">
                      <label>Activity Title *</label>
                      <input
                        type="text"
                        name="activityTitle"
                        placeholder="e.g., Visit Senso-ji Temple"
                        required
                        value={stopForm.activityTitle}
                        onChange={handleStopFormChange}
                      />
                    </div>

                    <div className="stop-form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        name="location"
                        placeholder="e.g., Asakusa, Tokyo"
                        value={stopForm.location}
                        onChange={handleStopFormChange}
                      />
                    </div>

                    <div className="stop-form-group">
                      <label>Day</label>
                      <select name="day" value={stopForm.day} onChange={handleStopFormChange}>
                        {dayTabs.map(d => (
                          <option key={d} value={d}>Day {d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="stop-form-group">
                      <label>Time</label>
                      <input
                        type="time"
                        name="time"
                        value={stopForm.time}
                        onChange={handleStopFormChange}
                      />
                    </div>

                    <div className="stop-form-group">
                      <label>Category</label>
                      <select name="category" value={stopForm.category} onChange={handleStopFormChange}>
                        {CATEGORY_OPTIONS.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="stop-form-group">
                      <label>Duration</label>
                      <div className="duration-selectors">
                        <div className="duration-select-wrapper">
                          <select 
                            name="durationHours" 
                            value={stopForm.durationHours} 
                            onChange={handleStopFormChange}
                          >
                            {[...Array(24).keys()].map(h => (
                              <option key={h} value={h}>{h}h</option>
                            ))}
                          </select>
                        </div>
                        <div className="duration-select-wrapper">
                          <select 
                            name="durationMinutes" 
                            value={stopForm.durationMinutes} 
                            onChange={handleStopFormChange}
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m}>{m}m</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="stop-form-group full-width">
                      <label>Notes</label>
                      <input
                        type="text"
                        name="notes"
                        placeholder="Optional notes..."
                        value={stopForm.notes}
                        onChange={handleStopFormChange}
                      />
                    </div>
                  </div>

                  <div className="stop-form-actions">
                    <button type="button" className="btn-cancel-stop" onClick={() => setShowStopForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-save-stop" disabled={savingStop}>
                      {savingStop ? 'Saving...' : (editingStop ? 'Update Stop' : 'Add Stop')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Timeline */}
            <div className="timeline" ref={timelineRef}>
              {(stopsByDay[activeDay] || []).length > 0 ? (
                stopsByDay[activeDay].map((stop, index) => (
                  <div key={stop._id || index} className="timeline-item">
                    <div className="timeline-left">{stop.time || '--:--'}</div>
                    <div className="timeline-middle">
                      <div className={`dot ${index === stopsByDay[activeDay].length - 1 ? 'hollow' : ''}`}></div>
                      <div className="connector"></div>
                    </div>
                    <div className="timeline-right">
                      <div className="stop-card">
                        <div className="stop-header">
                          <div>
                            <h4>{getCategoryIcon(stop.category)} {stop.activityTitle}</h4>
                            <div className="location-text">
                              <ion-icon name="location"></ion-icon> {stop.location || 'No location'}
                            </div>
                          </div>
                          <div className="stop-actions">
                            <button 
                              className="btn-edit-stop" 
                              onClick={() => openEditStopForm(stop)}
                              title="Edit stop"
                            >
                              <ion-icon name="create-outline"></ion-icon>
                            </button>
                            <button 
                              className="btn-delete-stop" 
                              onClick={() => handleDeleteStop(stop._id)}
                              title="Delete stop"
                            >
                              <ion-icon name="trash-outline"></ion-icon>
                            </button>
                          </div>
                        </div>
                        <div className="stop-footer">
                          <div className="stop-footer-left">
                            <span className={`tag ${(stop.category || 'general').toLowerCase()}`}>{stop.category || 'General'}</span>
                            {stop.duration && (
                              <span className="duration">
                                <ion-icon name="time-outline"></ion-icon> {stop.duration}
                              </span>
                            )}
                            {stop.notes && (
                              <span className="stop-notes">{stop.notes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-timeline">
                  <p>No stops planned for Day {activeDay}.</p>
                  <button className="btn-add-stop-inline" onClick={openAddStopForm}>
                    Add your first stop
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Budget Panel */}
          <div className="side-panels">
            <div className="side-panel">
              <h3>Budget Tracker</h3>
              <div className="budget-progress">
                <div className="progress-header">
                  <span>{trip.currency} {budgetSpent.toFixed(2)} spent</span>
                  <span>{trip.currency} {budgetTotal} total</span>
                </div>
                <div className="progress-container">
                  <div 
                    className={`progress-bar ${budgetPercent > 80 ? 'bg-red' : 'bg-green'}`} 
                    style={{ width: `${budgetPercent}%` }}
                  ></div>
                </div>
                <span className="remaining">
                  {trip.currency} {(budgetTotal - budgetSpent).toFixed(2)} remaining
                </span>
              </div>

              {/* Quick-add expense form */}
              <form className="expense-form" onSubmit={handleAddExpense}>
                <input
                  type="number"
                  placeholder="Amount"
                  step="0.01"
                  min="0"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                />
                <select
                  value={expenseForm.currency || trip.currency}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, currency: e.target.value }))}
                  title="Expense currency (auto-converts if different from trip currency)"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="MYR">MYR</option>
                  <option value="JPY">JPY</option>
                  <option value="SGD">SGD</option>
                  <option value="THB">THB</option>
                  <option value="AUD">AUD</option>
                  <option value="KRW">KRW</option>
                  <option value="CNY">CNY</option>
                </select>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Activities">Activities</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                />
                <button type="submit" disabled={addingExpense}>
                  {addingExpense ? '...' : '+ Add'}
                </button>
              </form>
              {trip.currency && (
                <p className="conversion-note">
                  Trip currency: {trip.currency}. Expenses in other currencies are auto-converted.
                </p>
              )}
            </div>

            {/* Expense List */}
            <div className="side-panel">
              <h3>Expenses</h3>
              <div className="budget-list">
                {expenses.length > 0 ? (
                  Object.values(expenses.reduce((acc, curr) => {
                    const cat = curr.category || 'Other';
                    if (!acc[cat]) {
                      acc[cat] = { category: cat, totalAmount: 0, items: [] };
                    }
                    acc[cat].totalAmount += curr.convertedAmount || 0;
                    acc[cat].items.push(curr);
                    return acc;
                  }, {})).map((group) => (
                    <div key={group.category} className="budget-item">
                      <div className="budget-item-header">
                        <span className={`cat-label ${group.category.toLowerCase()}`}>{group.category}</span>
                        <span className="amount">{trip.currency} {group.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="metadata-stack">
                        {group.items.map((item) => (
                          <div key={item._id} className="item-metadata">
                            <div className="item-details">
                              {item.notes && <span className="expense-notes-tag">{item.notes}</span>}
                              {item.originalCurrency && item.originalCurrency !== item.baseCurrency && (
                                <div className="exchange-rate-container">
                                    <div className="exchange-rate-tag">
                                      {item.originalCurrency} {item.amount?.toFixed(2)} → <span className="rate-pill">@ {item.baseCurrency} {item.convertedAmount?.toFixed(2)}</span>
                                    </div>
                                    <div className="unit-rate">
                                      1 {item.originalCurrency} = {item.conversionRate?.toFixed(4)} {item.baseCurrency}
                                    </div>
                                  </div>
                              )}
                            </div>
                            <button 
                              className="btn-delete-expense-red"
                              onClick={() => handleDeleteExpense(item._id)}
                              title="Delete this expense"
                            >
                              <ion-icon name="trash-outline"></ion-icon>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-expenses">No expenses logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlanView;
