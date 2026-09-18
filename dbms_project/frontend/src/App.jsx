import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import SplashScreen from './components/SplashScreen';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Layout from './components/Layout';
import LoginRegister from './pages/LoginRegister';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import Exercises from './pages/Exercises';
import Diet from './pages/Diet';
import AICoach from './pages/AICoach';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);

  // Only show splash screen once per browser session
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('stryvon_splash_shown');
  });

  // Enforce permanent dark mode (Figma design system)
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, [token]);

  const handleSplashFinish = useCallback(() => {
    sessionStorage.setItem('stryvon_splash_shown', 'true');
    setShowSplash(false);
  }, []);

  const handleLogin = useCallback((newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }, []);

  // Determine API URL: use env variable if available, else auto-detect localhost vs production fallback
  const API_URL = import.meta.env.VITE_API_URL || 
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5001/api'
      : '/api');

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen key="app-splash" onFinish={handleSplashFinish} />
        )}
      </AnimatePresence>

      <Router>
        <PWAInstallPrompt />
        <Routes>
          {/* Public auth route */}
          <Route 
            path="/login" 
            element={token ? <Navigate to="/" /> : <LoginRegister onLogin={handleLogin} apiUrl={API_URL} />} 
          />

          {/* Protected layout routes */}
          <Route 
            path="/" 
            element={
              token ? (
                <Layout 
                  user={user} 
                  onLogout={handleLogout} 
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route index element={<Dashboard apiUrl={API_URL} token={token} user={user} />} />
            <Route path="workouts" element={<Workouts apiUrl={API_URL} token={token} />} />
            <Route path="exercises" element={<Exercises apiUrl={API_URL} token={token} />} />
            <Route path="diet" element={<Diet apiUrl={API_URL} token={token} user={user} />} />
            <Route path="coach" element={<AICoach apiUrl={API_URL} token={token} user={user} />} />
            <Route path="analytics" element={<Analytics apiUrl={API_URL} token={token} />} />
            <Route path="profile" element={<Profile apiUrl={API_URL} token={token} onLogout={handleLogout} onUpdateUser={(updatedUser) => setUser(updatedUser)} />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </>
  );
}

