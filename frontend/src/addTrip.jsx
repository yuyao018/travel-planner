import React, { useState } from 'react';
import './addTrip.css';
import { tripsAPI } from './services/api';

const PREFERENCE_OPTIONS = ['Shopping', 'Food', 'Scenery', 'Adventure', 'Culture'];

function AddTrip({ setCurrentPage }) {
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
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

      // Submit to backend API
      await tripsAPI.create({
        ...updatedFormData,
        budget: parseFloat(formData.budget) || 0,
      });

      setCurrentPage('home');
    } catch (err) {
      setError(err.message || 'Failed to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-trip-container">
      <div className="back-home" onClick={() => setCurrentPage('home')}>
        <ion-icon name="arrow-back-outline"></ion-icon> Back to Home
      </div>
      <div className="add-trip-card">
        <h1>Create New Trip</h1>

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
              <div className="form-group">
                <label htmlFor="destination">Destination</label>
                <input
                  type="text"
                  id="destination"
                  name="destination"
                  placeholder="e.g., Tokyo, Japan"
                  required
                  value={formData.destination}
                  onChange={handleInputChange}
                />
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
              <div className="form-group">
                <label htmlFor="arrivalAirport">Arrival Airport</label>
                <input
                  type="text"
                  id="arrivalAirport"
                  name="arrivalAirport"
                  placeholder="e.g., NRT"
                  value={formData.arrivalAirport}
                  onChange={handleInputChange}
                />
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
              <div className="form-group">
                <label htmlFor="departureAirport">Departure Airport</label>
                <input
                  type="text"
                  id="departureAirport"
                  name="departureAirport"
                  placeholder="e.g., HND"
                  value={formData.departureAirport}
                  onChange={handleInputChange}
                />
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
              {isSubmitting ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTrip;
