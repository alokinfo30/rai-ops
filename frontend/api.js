const API_URL = '/api';

export class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

// --- Token Refresh Concurrency Handling ---
let isRefreshing = false;
let refreshPromise = null;

async function refreshToken() {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue || refreshTokenValue === 'null' || refreshTokenValue === 'undefined') {
        throw new AuthError('No refresh token available.');
    }

    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${refreshTokenValue}`,
            'Content-Type': 'application/json'
        }
    });

    if (!refreshResponse.ok) {
        // If refresh fails, clear tokens and throw
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        throw new AuthError('Session expired or invalid.');
    }

    const data = await refreshResponse.json();
    const newAuthToken = data.access_token;
    localStorage.setItem('token', newAuthToken);
    return newAuthToken;
}
/**
 * A wrapper for the fetch API to centralize error handling, authentication, and headers.
 * @param {string} endpoint - The API endpoint to call (e.g., '/auth/login').
 * @param {object} options - The options object for the fetch call.
 * @returns {Promise<any>} - The JSON response from the API.
 */
export async function apiFetch(endpoint, options = {}) {
    const { responseType = 'json', ...fetchOptions } = options;

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...fetchOptions.headers,
    };
    
    // --- Main Fetch Logic ---
    async function doFetch() {
        let authToken = localStorage.getItem('token');
        if (authToken && authToken !== 'null' && authToken !== 'undefined') {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers });

        if (!response.ok) {
            // Handle non-401 errors first
            if (response.status !== 401) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            // Handle 401 Unauthorized
            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = refreshToken().finally(() => {
                    isRefreshing = false;
                    refreshPromise = null;
                });
            }

            try {
                await refreshPromise;
                // Retry the request with the new token by calling doFetch again
                return doFetch();
            } catch (refreshError) {
                // If refresh fails, throw the AuthError which should trigger a logout
                throw refreshError;
            }
        }

        // Handle successful response
        if (responseType === 'blob') {
            return response.blob();
        }
        return response.status === 204 ? null : response.json();
    }
    // --- End of Main Fetch Logic ---

    return doFetch();
}