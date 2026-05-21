import React, { useState } from 'react';
import './App.css';
import SignIn from './signIn';
import Home from './home';
import AddTrip from './addTrip';
import PlanView from './planView';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedTripId, setSelectedTripId] = useState(null);

  if (currentPage === 'signin') {
    return <SignIn setCurrentPage={setCurrentPage} />;
  }

  if (currentPage === 'home') {
    return <Home setCurrentPage={setCurrentPage} setSelectedTripId={setSelectedTripId} />;
  }

  if (currentPage === 'addtrip') {
    return <AddTrip setCurrentPage={setCurrentPage} />;
  }

  if (currentPage === 'planview') {
    return <PlanView setCurrentPage={setCurrentPage} tripId={selectedTripId} />;
  }

  return (
    <div className="travel-container">
      <div className="travel-card">
        
        {/* Navigation Bar */}
        <header className="travel-navbar">
          <div className="travel-logo">
            <span>✈</span> Travel Planner
          </div>
          <button 
            className="btn-get-started-nav"
            onClick={() => setCurrentPage('signin')}
          >
            Get Started
          </button>
        </header>

        {/* Hero Banner Area */}
        <main className="travel-hero">
          <div className="travel-hero-overlay">
            <h1 className="hero-heading">
              Explore <br />
              <span className="orange-text">the world</span> <br />
              with us
            </h1>
            <p className="hero-subtext">
              Coordinating your next adventure, step by step.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;