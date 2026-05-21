import React, { useState, useEffect } from 'react';
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
    hotelLocation: '',
    hotelCheckIn: '',
    hotelCheckOut: '',
    travelPreferences: [],
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
      await tripsAPI.update(tripId, {
        ...formData,
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
