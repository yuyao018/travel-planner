import React, { useState, useEffect } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import SignIn from './signIn';
import Home from './home';
import AddTrip from './addTrip';
import EditTrip from './editTrip';
import PlanView from './planView';

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Router guard: redirect to signin if trying to access protected pages while not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated && ['home', 'addtrip', 'edittrip', 'planview'].includes(currentPage)) {
      setCurrentPage('signin');
    }
  }, [isAuthenticated, loading, currentPage]);

  // If user is authenticated and on landing page, go to home
  useEffect(() => {
    if (!loading && isAuthenticated && currentPage === 'landing') {
      setCurrentPage('home');
    }
  }, [isAuthenticated, loading]);

  // Show nothing while checking auth state
  if (loading) return null;

  if (currentPage === 'signin') {
    return <SignIn setCurrentPage={setCurrentPage} />;
  }

  if (currentPage === 'home') {
    return <Home setCurrentPage={setCurrentPage} setSelectedTripId={setSelectedTripId} />;
  }

  if (currentPage === 'addtrip') {
    return <AddTrip setCurrentPage={setCurrentPage} />;
  }

  if (currentPage === 'edittrip') {
    return <EditTrip setCurrentPage={setCurrentPage} tripId={selectedTripId} />;
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
