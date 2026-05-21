import React, { useState } from 'react';
import './addTrip.css';

const PREFERENCE_OPTIONS = ['Shopping', 'Food', 'Scenery', 'Adventure', 'Culture'];

function AddTrip({ setCurrentPage }) {
  const [formData, setFormData] = useState({
    tripName: '',
    destination: '',
    startDate: '',
    endDate: '',
    totalBudget: '',
    currency: 'USD',
    arrivalTime: '',
    departureTime: '',
    hotelName: '',
    checkIn: '',
    checkOut: '',
    preferences: [],
    notes: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePreference = (pref) => {
    setFormData(prev => {
      const isSelected = prev.preferences.includes(pref);
      return {
        ...prev,
        preferences: isSelected
          ? prev.preferences.filter(p => p !== pref)
          : [...prev.preferences, pref]
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation: End Date cannot be before Start Date
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      alert('Error: End Date cannot be earlier than Start Date.');
      return;
    }

    // Capture and display JSON payload
    console.log('Form Submitted:', formData);
    alert(`Trip Created Successfully!\n\nPayload: ${JSON.stringify(formData, null, 2)}`);
    
    // Navigate back to dashboard
    setCurrentPage('home');
  };

  return (
    <div className="add-trip-container">
      <div className="back-home" onClick={() => setCurrentPage('home')}>
        <ion-icon name="arrow-back-outline"></ion-icon> Back to Home
      </div>
      <div className="add-trip-card">
        <h1>Create New Trip</h1>
        
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
                <label htmlFor="totalBudget">Total Budget</label>
                <input
                  type="number"
                  id="totalBudget"
                  name="totalBudget"
                  min="0"
                  placeholder="0.00"
                  required
                  value={formData.totalBudget}
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
                <label htmlFor="departureTime">Departure Time</label>
                <input
                  type="time"
                  id="departureTime"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group full-width">
                <label htmlFor="hotelName">Hotel Location / Name</label>
                <input
                  type="text"
                  id="hotelName"
                  name="hotelName"
                  placeholder="e.g., Shinjuku Prince Hotel"
                  value={formData.hotelName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="checkIn">Hotel Check-in</label>
                <input
                  type="datetime-local"
                  id="checkIn"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="checkOut">Hotel Check-out</label>
                <input
                  type="datetime-local"
                  id="checkOut"
                  name="checkOut"
                  value={formData.checkOut}
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
                    className={`tag-pill ${formData.preferences.includes(option) ? 'active' : ''}`}
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
            <button type="submit" className="btn-submit">
              Create Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTrip;
