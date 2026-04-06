/**
 * Application Configuration
 * 
 * Determines the API base URL based on the environment.
 * 
 * - In Production (Docker/Nginx): The frontend is served from the same origin as the API proxy,
 *   so we use a relative path '/api'.
 * - In Development (Localhost): The frontend (e.g. port 3000) needs to point to the 
 *   backend (port 5000) explicitly.
 */

const getApiUrl = () => {
  if (import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
  }
  // Fallback: If on localhost port 3000 (standard React/Vite dev), point to Flask default
  if (window.location.hostname === 'localhost' && window.location.port !== '80') {
      // If we are strictly in dev mode and not proxied
      return 'http://localhost:5000/api';
  }
  // Default to relative path for production (served via Nginx)
  return '/api';
};

export const API_BASE_URL = getApiUrl();

export const ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  DASHBOARD_STATS: `${API_BASE_URL}/dashboard/stats`,
  RECENT_ACTIVITY: `${API_BASE_URL}/dashboard/recent-activity`,
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  KNOWLEDGE_SESSION: `${API_BASE_URL}/knowledge/expert/session`,
};