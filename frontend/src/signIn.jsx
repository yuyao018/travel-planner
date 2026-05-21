import React, { useState } from 'react';
import './signIn.css';
import { authAPI } from './services/api';
import { useAuth } from './context/AuthContext';

function SignIn({ setCurrentPage }) {
  const { login } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleRegisterClick = (e) => {
    e.preventDefault();
    setIsActive(true);
    setError('');
  };

  const handleLoginClick = (e) => {
    e.preventDefault();
    setIsActive(false);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await authAPI.login(loginEmail, loginPassword);
      // Store token and user in context + localStorage
      login(data);
      setCurrentPage('home');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await authAPI.register(registerName, registerEmail, registerPassword);
      // Store token and user in context + localStorage
      login(data);
      setCurrentPage('home');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="logreg-container">
      <div className="logreg-background"></div>
      
      <div className="back-home" onClick={() => setCurrentPage('landing')}>
        <ion-icon name="arrow-back-outline"></ion-icon> Back to Home
      </div>

      <div className="logreg-box-container">
        <div className="content">
          <h2 className="logo">
            <ion-icon name="airplane"></ion-icon> Travel Planner
          </h2>

          <div className="text-sci">
            <h2>Welcome!<br /><span>Explore the world with us.</span></h2>
            
            <div className="social-icons">
              <a href="#"><ion-icon name="logo-linkedin"></ion-icon></a>
              <a href="#"><ion-icon name="logo-facebook"></ion-icon></a>
              <a href="#"><ion-icon name="logo-instagram"></ion-icon></a>
              <a href="#"><ion-icon name="logo-twitter"></ion-icon></a>
            </div>
          </div>
        </div>

        <div className={`logreg-box ${isActive ? 'active' : ''}`}>
          {/* Login Form */}
          <div className="form-box login">
            <form onSubmit={handleLogin}>
              <h2>Sign In</h2>

              {error && !isActive && <div className="form-error">{error}</div>}

              <div className="input-box">
                <span className="icon"><ion-icon name="mail"></ion-icon></span>
                <input 
                  type="email" 
                  required 
                  placeholder=" "
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <label>Email</label>
              </div>

              <div className="input-box">
                <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
                <input 
                  type="password" 
                  required 
                  minLength="6" 
                  placeholder=" "
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <label>Password</label>
              </div>

              <div className="remember-forgot">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#">Forgot Password?</a>
              </div>

              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="login-register">
                <p>Don't have an account? <a href="#" className="register-link" onClick={handleRegisterClick}>Sign Up</a></p>
              </div>
            </form>
          </div>

          {/* Register Form */}
          <div className="form-box register">
            <form onSubmit={handleRegister}>
              <h2>Sign Up</h2>

              {error && isActive && <div className="form-error">{error}</div>}

              <div className="input-box">
                <span className="icon"><ion-icon name="person"></ion-icon></span>
                <input 
                  type="text" 
                  required 
                  placeholder=" "
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
                <label>Name</label>
              </div>

              <div className="input-box">
                <span className="icon"><ion-icon name="mail"></ion-icon></span>
                <input 
                  type="email" 
                  required 
                  placeholder=" "
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
                <label>Email</label>
              </div>

              <div className="input-box">
                <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
                <input 
                  type="password" 
                  required 
                  minLength="6" 
                  placeholder=" "
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
                <label>Password</label>
              </div>

              <div className="remember-forgot">
                <label>
                  <input type="checkbox" required /> I agree to the terms & conditions
                </label>
              </div>

              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Sign Up'}
              </button>

              <div className="login-register">
                <p>Already have an account? <a href="#" className="login-link" onClick={handleLoginClick}>Sign In</a></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
