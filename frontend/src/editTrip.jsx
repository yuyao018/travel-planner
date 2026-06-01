import React, { useState, useEffect, useRef } from 'react';
import './addTrip.css';
import { tripsAPI } from './services/api';

const PREFERENCE_OPTIONS = ['Shopping', 'Food', 'Scenery', 'Adventure', 'Culture'];

function EditTrip({ setCurrentPage, tripId }) {
  const [formData, setFormData] = useState({
    tripName: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'USD',
    arrivalTime: '',
    departureTime: '',
    arrivalAirport: '',
    departureAirport: '',
    hotelLocation: '',
    hotelCheckIn: '',
    hotelCheckOut: '',
    travelPreferences: [],
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [airportSuggestions, setAirportSuggestions] = useState({ arrival: [], departure: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAirportSuggestions, setShowAirportSuggestions] = useState({ arrival: false, departure: false });
  const searchTimeoutRef = useRef(null);
  const suggestionRef = useRef(null);
  const arrivalAirportRef = useRef(null);
  const departureAirportRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (arrivalAirportRef.current && !arrivalAirportRef.current.contains(event.target)) {
        setShowAirportSuggestions(prev => ({ ...prev, arrival: false }));
      }
      if (departureAirportRef.current && !departureAirportRef.current.contains(event.target)) {
        setShowAirportSuggestions(prev => ({ ...prev, departure: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch existing trip data on mount
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const data = await tripsAPI.getOne(tripId);
        const trip = data.trip;

        setFormData({
          tripName: trip.tripName || '',
          destination: trip.destination || '',
          startDate: trip.startDate ? trip.startDate.split('T')[0] : '',
          endDate: trip.endDate ? trip.endDate.split('T')[0] : '',
          budget: trip.budget || '',
          currency: trip.currency || 'USD',
          arrivalTime: trip.arrivalTime || '',
          departureTime: trip.departureTime || '',
          arrivalAirport: trip.arrivalAirport || '',
          departureAirport: trip.departureAirport || '',
          hotelLocation: trip.hotelLocation || '',
          hotelCheckIn: trip.hotelCheckIn || '',
          hotelCheckOut: trip.hotelCheckOut || '',
          travelPreferences: trip.travelPreferences || [],
          notes: trip.notes || ''
        });
      } catch (err) {
        setError('Failed to load trip data.');
        console.error('Fetch trip error:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (tripId) fetchTrip();
  }, [tripId]);

  const fetchAirports = async (value, type) => {
    // If value is short or empty, just search for airports near the destination
    const query = value.length >= 2 
      ? `${value} airport near ${formData.destination}` 
      : `airport near ${formData.destination}`;

    if (!formData.destination) return;

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&featuretype=airport`,
          { headers: { 'User-Agent': 'SmartTravelPlanner/1.0' } }
        );
        const data = await response.json();
        const formatted = data.map(item => ({
          id: item.place_id,
          display: item.display_name.split(',')[0] + (item.address?.iata ? ` (${item.address.iata})` : ''),
          fullName: item.display_name
        }));
        setAirportSuggestions(prev => ({ ...prev, [type]: formatted }));
        setShowAirportSuggestions(prev => ({ ...prev, [type]: true }));
      } catch (err) {
        console.error('Airport autocomplete error:', err);
      }
    }, 500);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Autocomplete for destination
    if (name === 'destination') {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      
      if (value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1`,
            { headers: { 'User-Agent': 'SmartTravelPlanner/1.0' } }
          );
          const data = await response.json();
          const formatted = data.map(item => ({
            id: item.place_id,
            display: item.display_name,
            name: item.name,
            address: item.address
          }));
          setSuggestions(formatted);
          setShowSuggestions(true);
        } catch (err) {
          console.error('Autocomplete error:', err);
        }
      }, 500);
    }

    // Autocomplete for airports
    if (name === 'arrivalAirport') {
      fetchAirports(value, 'arrival');
    }
    if (name === 'departureAirport') {
      fetchAirports(value, 'departure');
    }
  };

  const selectSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      destination: suggestion.display
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const selectAirportSuggestion = (suggestion, type) => {
    setFormData(prev => ({
      ...prev,
      [type === 'arrival' ? 'arrivalAirport' : 'departureAirport']: suggestion.display
    }));
    setAirportSuggestions(prev => ({ ...prev, [type]: [] }));
    setShowAirportSuggestions(prev => ({ ...prev, [type]: false }));
  };

  const togglePreference = (pref) => {
    setFormData(prev => {
      const isSelected = prev.travelPreferences.includes(pref);
      return {
        ...prev,
        travelPreferences: isSelected
          ? prev.travelPreferences.filter(p => p !== pref)
          : [...prev.travelPreferences, pref]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End Date cannot be earlier than Start Date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedFormData = { ...formData };

      // Geocode Arrival Airport
      if (formData.arrivalAirport) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.arrivalAirport + ', ' + formData.destination)}&limit=1`, { headers: { 'User-Agent': 'SmartTravelPlanner/1.0' } });
          const data = await res.json();
          if (data && data.length > 0) {
            updatedFormData.arrivalAirportLat = parseFloat(data[0].lat);
            updatedFormData.arrivalAirportLng = parseFloat(data[0].lon);
          }
        } catch (err) { console.warn('Geocoding arrival airport failed:', err); }
      }

      // Geocode Departure Airport
      if (formData.departureAirport) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.departureAirport + ', ' + formData.destination)}&limit=1`, { headers: { 'User-Agent': 'SmartTravelPlanner/1.0' } });
          const data = await res.json();
          if (data && data.length > 0) {
            updatedFormData.departureAirportLat = parseFloat(data[0].lat);
            updatedFormData.departureAirportLng = parseFloat(data[0].lon);
          }
        } catch (err) { console.warn('Geocoding departure airport failed:', err); }
      }

      // Geocode Hotel Location
      if (formData.hotelLocation) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.hotelLocation + ', ' + formData.destination)}&limit=1`, { headers: { 'User-Agent': 'SmartTravelPlanner/1.0' } });
          const data = await res.json();
          if (data && data.length > 0) {
            updatedFormData.hotelLat = parseFloat(data[0].lat);
            updatedFormData.hotelLng = parseFloat(data[0].lon);
          }
        } catch (err) { console.warn('Geocoding hotel location failed:', err); }
      }

      await tripsAPI.update(tripId, {
        ...updatedFormData,
        budget: parseFloat(formData.budget) || 0,
      });

      setCurrentPage('home');
    } catch (err) {
      setError(err.message || 'Failed to update trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this trip? This will also remove all stops and expenses.')) {
      return;
    }

    try {
      await tripsAPI.delete(tripId);
      setCurrentPage('home');
    } catch (err) {
      setError(err.message || 'Failed to delete trip.');
    }
  };

  if (isLoading) {
    return (
      <div className="add-trip-container">
        <div className="add-trip-card">
          <p>Loading trip data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-trip-container">
      <div className="back-home" onClick={() => setCurrentPage('home')}>
        <ion-icon name="arrow-back-outline"></ion-icon> Back to Home
      </div>
      <div className="add-trip-card">
        <div className="edit-trip-header">
          <h1>Edit Trip</h1>
          <button className="btn-delete-trip" onClick={handleDelete}>
            <ion-icon name="trash-outline"></ion-icon> Delete Trip
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Trip Details */}
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="tripName">Trip Name</label>
                <input
                  type="text"
                  id="tripName"
                  name="tripName"
                  placeholder="e.g., Graduation Getaway"
                  required
                  value={formData.tripName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group" ref={suggestionRef}>
                <label htmlFor="destination">Destination</label>
                <div className="autocomplete-wrapper">
                  <input
                  type="text"
                  id="destination"
                  name="destination"
                  placeholder="e.g., Tokyo, Japan"
                  value={formData.destination}
                  onChange={handleInputChange}
                  autoComplete="off"
                  required
                />
                {showSuggestions && suggestions.length > 0 && (
                    <ul className="autocomplete-suggestions">
                      {suggestions.map((suggestion) => (
                        <li 
                          key={suggestion.id} 
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          {suggestion.display}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="startDate">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">End Date</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Budgeting */}
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="budget">Total Budget</label>
                <input
                  type="number"
                  id="budget"
                  name="budget"
                  min="0"
                  placeholder="0.00"
                  required
                  value={formData.budget}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="MYR">MYR</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Logistics & Accommodation */}
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="arrivalTime">Arrival Time</label>
                <input
                  type="time"
                  id="arrivalTime"
                  name="arrivalTime"
                  value={formData.arrivalTime}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group" ref={arrivalAirportRef}>
                <label htmlFor="arrivalAirport">Arrival Airport</label>
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    id="arrivalAirport"
                    name="arrivalAirport"
                    placeholder="e.g., NRT"
                    value={formData.arrivalAirport}
                    onChange={handleInputChange}
                    onFocus={() => fetchAirports(formData.arrivalAirport, 'arrival')}
                    autoComplete="off"
                  />
                  {showAirportSuggestions.arrival && airportSuggestions.arrival.length > 0 && (
                    <ul className="autocomplete-suggestions">
                      {airportSuggestions.arrival.map((suggestion) => (
                        <li 
                          key={suggestion.id} 
                          onClick={() => selectAirportSuggestion(suggestion, 'arrival')}
                        >
                          {suggestion.display}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="departureTime">Departure Time</label>
                <input
                  type="time"
                  id="departureTime"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group" ref={departureAirportRef}>
                <label htmlFor="departureAirport">Departure Airport</label>
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    id="departureAirport"
                    name="departureAirport"
                    placeholder="e.g., HND"
                    value={formData.departureAirport}
                    onChange={handleInputChange}
                    onFocus={() => fetchAirports(formData.departureAirport, 'departure')}
                    autoComplete="off"
                  />
                  {showAirportSuggestions.departure && airportSuggestions.departure.length > 0 && (
                    <ul className="autocomplete-suggestions">
                      {airportSuggestions.departure.map((suggestion) => (
                        <li 
                          key={suggestion.id} 
                          onClick={() => selectAirportSuggestion(suggestion, 'departure')}
                        >
                          {suggestion.display}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group full-width">
                <label htmlFor="hotelLocation">Hotel Location / Name</label>
                <input
                  type="text"
                  id="hotelLocation"
                  name="hotelLocation"
                  placeholder="e.g., Shinjuku Prince Hotel"
                  value={formData.hotelLocation}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="hotelCheckIn">Hotel Check-in</label>
                <input
                  type="datetime-local"
                  id="hotelCheckIn"
                  name="hotelCheckIn"
                  value={formData.hotelCheckIn}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="hotelCheckOut">Hotel Check-out</label>
                <input
                  type="datetime-local"
                  id="hotelCheckOut"
                  name="hotelCheckOut"
                  value={formData.hotelCheckOut}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Personalization */}
          <div className="form-section">
            <div className="form-group full-width">
              <label>Travel Preference</label>
              <div className="tags-container">
                {PREFERENCE_OPTIONS.map(option => (
                  <div
                    key={option}
                    className={`tag-pill ${formData.travelPreferences.includes(option) ? 'active' : ''}`}
                    onClick={() => togglePreference(option)}
                  >
                    {option}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group full-width">
              <label htmlFor="notes">Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                rows="4"
                placeholder="Any packing reminders, flight codes, or extra details..."
                value={formData.notes}
                onChange={handleInputChange}
              ></textarea>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => setCurrentPage('home')}
            >
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditTrip;
