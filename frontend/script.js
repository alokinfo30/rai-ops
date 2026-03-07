// State management
let currentUser = null;
let currentPage = 'dashboard';
let authToken = localStorage.getItem('token');
// Sanitize token if it got corrupted
if (authToken === 'null' || authToken === 'undefined') {
    authToken = null;
    localStorage.removeItem('token');
}

// API Configuration
const API_URL = window.location.hostname === 'localhost'
    ? '/api' // Use relative path for local dev (proxied by Nginx)
    : 'https://rai-ops.onrender.com/api'; // Use absolute path for production

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    checkAuth();
    loadPage('dashboard');
    setCopyright();
});

function initEventListeners() {
    // Mobile menu toggle
    document.getElementById('mobileMenuBtn').addEventListener('click', toggleMobileMenu);
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
    
    // Modal buttons
    document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('signupBtn').addEventListener('click', () => openModal('signupModal'));
    
    // Close modal buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => closeAllModals());
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
}

function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

function navigateTo(page) {
    // Update active link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
    
    // Close mobile menu
    document.getElementById('navMenu').classList.remove('active');
    
    // Load page content
    loadPage(page);
}

async function loadPage(page) {
    currentPage = page;
    const mainContent = document.getElementById('mainContent');
    
    // Show loading spinner
    mainContent.innerHTML = '<div class="spinner"></div>';
    
    try {
        switch(page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'redteaming':
                await loadRedTeaming();
                break;
            case 'monitoring':
                await loadMonitoring();
                break;
            case 'knowledge':
                await loadKnowledgeTransfer();
                break;
        }
    } catch (error) {
        mainContent.innerHTML = `<div class="error">Error loading page: ${error.message}</div>`;
    }
}

async function loadDashboard() {
    const html = `
        <div class="dashboard-container">
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <div class="stats-info">
                    <h3>Security Tests</h3>
                    <div class="stats-number" id="securityTests">0</div>
                </div>
            </div>
            
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stats-info">
                    <h3>Active Alerts</h3>
                    <div class="stats-number" id="activeAlerts">0</div>
                </div>
            </div>
            
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stats-info">
                    <h3>Compliance Score</h3>
                    <div class="stats-number" id="complianceScore">0%</div>
                </div>
            </div>
            
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="stats-info">
                    <h3>Models Monitored</h3>
                    <div class="stats-number" id="modelsMonitored">0</div>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 2rem;">
            <h2>Recent Activity</h2>
            <div id="recentActivity">
                <p>Loading recent activity...</p>
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = html;
    
    // Fetch and update stats
    if (currentUser) {
        await updateDashboardStats();
    }
}

async function loadRedTeaming() {
    const html = `
        <div class="redteam-container">
            <div class="test-form">
                <h2>Run Security Test</h2>
                <form id="redTeamForm">
                    <div class="form-group">
                        <label for="testName">Test Name</label>
                        <input type="text" id="testName" required placeholder="e.g., Deepfake Detection Test">
                    </div>
                    
                    <div class="form-group">
                        <label for="testType">Test Type</label>
                        <select id="testType" required>
                            <option value="">Select test type</option>
                            <option value="deepfake">Deepfake Detection</option>
                            <option value="adversarial">Adversarial Attacks</option>
                            <option value="synthetic">Synthetic Identity</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="targetSystem">Target System</label>
                        <input type="text" id="targetSystem" required placeholder="e.g., Biometric Auth API">
                    </div>
                    
                    <button type="submit" class="btn-primary">Run Test</button>
                </form>
            </div>
            
            <div class="card">
                <h2>Recent Tests</h2>
                <div id="recentTests">
                    <p>No tests run yet</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = html;
    
    if (currentUser) {
        document.getElementById('redTeamForm').addEventListener('submit', handleRedTeamTest);
        await loadRecentTests();
    } else {
        document.getElementById('mainContent').innerHTML += `
            <div class="card" style="margin-top: 2rem;">
                <p>Please <a href="#" onclick="openModal('loginModal')">login</a> to run tests</p>
            </div>
        `;
    }
}

async function loadMonitoring() {
    const html = `
        <div class="monitoring-container">
            <div class="card">
                <h2>Model Drift Detection</h2>
                <div id="driftChart" style="height: 300px;">
                    <p>Loading drift data...</p>
                </div>
            </div>
            
            <div class="alerts-list">
                <h2>Active Alerts</h2>
                <div id="alerts">
                    <p>Loading alerts...</p>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 2rem;">
            <h2>Compliance Logs</h2>
            <div id="complianceLogs" style="max-height: 300px; overflow-y: auto;">
                <p>Loading logs...</p>
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = html;
    
    if (currentUser) {
        await loadMonitoringData();
    }
}

async function loadKnowledgeTransfer() {
    const html = `
        <div class="knowledge-container">
            <div class="expert-session">
                <h2>Record Expert Session</h2>
                <form id="expertSessionForm">
                    <div class="form-group">
                        <label for="expertName">Expert Name</label>
                        <input type="text" id="expertName" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="domain">Domain</label>
                        <input type="text" id="domain" required placeholder="e.g., Fraud Detection">
                    </div>
                    
                    <div class="form-group">
                        <label for="expertise">Years of Experience</label>
                        <input type="number" id="expertise" required min="1" max="50">
                    </div>
                    
                    <button type="submit" class="btn-primary">Start Recording</button>
                </form>
            </div>
            
            <div class="virtual-apprentice">
                <h2>Virtual Apprentice</h2>
                <div id="apprenticeContent">
                    <p>Record an expert session to create a virtual apprentice</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = html;
    
    if (currentUser) {
        document.getElementById('expertSessionForm').addEventListener('submit', handleExpertSession);
    }
}

// API Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.access_token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            closeAllModals();
            updateUIForAuth();
            loadPage(currentPage);
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const userData = {
        username: document.getElementById('signupUsername').value,
        email: document.getElementById('signupEmail').value,
        company: document.getElementById('signupCompany').value,
        password: document.getElementById('signupPassword').value
    };
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            closeAllModals();
            openModal('loginModal');
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

async function handleRedTeamTest(e) {
    e.preventDefault();
    
    const testData = {
        test_name: document.getElementById('testName').value,
        test_type: document.getElementById('testType').value,
        target_system: document.getElementById('targetSystem').value
    };
    
    try {
        // Create test
        const createResponse = await fetch(`${API_URL}/redteam/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(testData)
        });
        
        const test = await createResponse.json();
        
        if (createResponse.ok) {
            // Run test
            const runResponse = await fetch(`${API_URL}/redteam/test/${test.test.id}/run`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            const results = await runResponse.json();
            
            // Display results
            displayTestResults(results);
            await loadRecentTests();
        }
    } catch (error) {
        alert('Error running test');
    }
}

async function handleExpertSession(e) {
    e.preventDefault();
    
    const sessionData = {
        expert_name: document.getElementById('expertName').value,
        domain: document.getElementById('domain').value,
        experience: document.getElementById('expertise').value
    };
    
    try {
        const response = await fetch(`${API_URL}/knowledge/expert/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(sessionData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayVirtualApprentice(data.session_id);
        }
    } catch (error) {
        alert('Error creating expert session');
    }
}

async function updateDashboardStats() {
    try {
        const [statsResponse, activityResponse] = await Promise.all([
            fetch(`${API_URL}/dashboard/stats`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_URL}/dashboard/recent-activity`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        if (!statsResponse.ok || !activityResponse.ok) {
            if ([401, 422].includes(statsResponse.status) || [401, 422].includes(activityResponse.status)) {
                logout();
            }
            throw new Error('Failed to fetch dashboard data');
        }

        const stats = await statsResponse.json();
        const activities = await activityResponse.json();

        document.getElementById('securityTests').textContent = stats.securityTests;
        document.getElementById('activeAlerts').textContent = stats.activeAlerts;
        document.getElementById('complianceScore').textContent = stats.complianceScore + '%';
        document.getElementById('modelsMonitored').textContent = stats.modelsMonitored;

        const activityHtml = activities.map(activity => {
            const icon = activity.activity_type === 'test' ? 'fa-vial' : 'fa-clipboard-check';
            return `
            <div class="alert-item">
                <div class="alert-severity low">
                    <i class="fas ${icon}"></i>
                </div>
                <div>
                    <strong>${activity.activity_type === 'test' ? 'Test' : 'Compliance'}:</strong> ${activity.description}
                    <br>
                    <small>Status: ${activity.status} - ${new Date(activity.created_at).toLocaleString()}</small>
                </div>
            </div>`;
        }).join('');

        document.getElementById('recentActivity').innerHTML = activityHtml || '<p>No recent activity.</p>';

    } catch (error) {
        console.error('Error updating dashboard:', error);
        document.getElementById('recentActivity').innerHTML = '<p class="error">Could not load recent activity.</p>';
    }
}

async function loadRecentTests() {
    try {
        const response = await fetch(`${API_URL}/redteam/tests`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            if ([401, 422].includes(response.status)) logout();
            throw new Error('Failed to load recent tests');
        }

        const tests = await response.json();

        const testsHtml = tests.map(test => `
            <div class="alert-item">
                <div class="alert-severity ${test.status === 'completed' ? 'low' : 'medium'}">
                    <i class="fas ${test.status === 'completed' ? 'fa-check' : 'fa-spinner fa-spin'}"></i>
                </div>
                <div>
                    <strong>${test.test_name}</strong> (${test.test_type})
                    <br>
                    <small>${test.status} - ${new Date(test.created_at).toLocaleString()}</small>
                </div>
            </div>
        `).join('');

        document.getElementById('recentTests').innerHTML = testsHtml || '<p>No tests run yet.</p>';
    } catch (error) {
        console.error('Error loading recent tests:', error);
        document.getElementById('recentTests').innerHTML = '<p class="error">Could not load recent tests.</p>';
    }
}

async function loadMonitoringData() {
    if (!authToken || authToken === "null" || isTokenExpired(authToken)) {
        console.warn("Auth token missing or expired. Redirecting to login.");
        logout();
        return;
    }

    try {
        // 1. Fetch alerts first to validate token quickly
        const alertsResponse = await fetch(`${API_URL}/monitoring/alerts`, {
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });

        if (alertsResponse.status === 401 || alertsResponse.status === 422) {
            console.warn("Session expired or invalid. Logging out.");
            logout();
            return;
        }

        if (!alertsResponse.ok) {
            throw new Error(`Failed to fetch alerts: ${alertsResponse.status}`);
        }

        const alerts = await alertsResponse.json();

        // 2. Fetch remaining data in parallel
        const endpoints = ['/monitoring/drift', '/monitoring/compliance-logs'];
        const requests = endpoints.map(endpoint => 
            fetch(`${API_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        );

        const responses = await Promise.all(requests);

        for (const res of responses) {
            if (!res.ok) {
                // Throw an error that includes the status to be more specific
                throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
            }
        }

        const [driftData, logs] = await Promise.all(responses.map(res => res.json()));

        // Render Drift Data
        const driftContainer = document.getElementById('driftChart');
        if (Array.isArray(driftData) && driftData.length > 0) {
            driftContainer.innerHTML = driftData.map(drift => `
                <div class="alert-item">
                    <div class="alert-severity ${drift.drift_score > 0.15 ? 'high' : 'medium'}">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div>
                        <strong>${drift.model_name}</strong>
                        <br>
                        <small>${drift.metric_name}: ${(drift.drift_score * 100).toFixed(1)}% drift</small>
                    </div>
                </div>
            `).join('');
        } else {
            driftContainer.innerHTML = '<p>No drift data to display.</p>';
        }

        // Render Alerts
        const alertsContainer = document.getElementById('alerts');
        if (Array.isArray(alerts) && alerts.length > 0) {
            alertsContainer.innerHTML = alerts.map(alert => `
                <div class="alert-item">
                    <div class="alert-severity ${alert.severity}">
                        <i class="fas fa-exclamation"></i>
                    </div>
                    <div>
                        <strong>${alert.message}</strong>
                        <br>
                        <small>${new Date(alert.timestamp).toLocaleString()}</small>
                    </div>
                </div>
            `).join('');
        } else {
            alertsContainer.innerHTML = '<p>No active alerts.</p>';
        }

        // Render Compliance Logs
        const logsContainer = document.getElementById('complianceLogs');
        if (Array.isArray(logs) && logs.length > 0) {
            logsContainer.innerHTML = logs.map(log => `
                <div class="alert-item">
                    <div class="alert-severity low">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <div>
                        <strong>${log.action}</strong> on ${log.resource}
                        <br>
                        <small>${new Date(log.timestamp).toLocaleString()}</small>
                    </div>
                </div>
            `).join('');
        } else {
            logsContainer.innerHTML = '<p>No compliance logs to display.</p>';
        }

    } catch (error) {
        console.error('Error loading monitoring data:', error);
        // Display a more user-friendly error within each component on failure
        document.getElementById('driftChart').innerHTML = `<p class="error">Could not load drift data.</p>`;
        document.getElementById('alerts').innerHTML = `<p class="error">Could not load alerts.</p>`;
        document.getElementById('complianceLogs').innerHTML = `<p class="error">Could not load logs.</p>`;
    }
}

function displayTestResults(results) {
    const resultsHtml = `
        <div class="card" style="margin-top: 1rem;">
            <h3>Test Results</h3>
            <p>Attack Type: ${results.results.attack_type}</p>
            <p>Tests Conducted: ${results.results.tests_conducted}</p>
            <p>Successful Bypasses: ${results.results.successful_bypasses}</p>
            <p>Risk Level: <span class="alert-severity ${results.results.risk_level}">${results.results.risk_level}</span></p>
            <p>Overall Score: ${(results.results.overall_score * 100).toFixed(1)}%</p>
            
            <h4>Vulnerabilities Found:</h4>
            ${results.results.vulnerabilities_found.map(v => `
                <div class="alert-item">
                    <div class="alert-severity ${v.severity}">
                        <i class="fas fa-bug"></i>
                    </div>
                    <div>
                        <strong>${v.description}</strong>
                        <br>
                        <small>Recommendation: ${v.recommendation}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML += resultsHtml;
}

async function displayVirtualApprentice(sessionId) {
    try {
        const response = await fetch(`${API_URL}/knowledge/virtual-apprentice/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const apprentice = await response.json();
        
        const html = `
            <h3>Virtual Apprentice Ready</h3>
            <p>Capabilities:</p>
            <ul>
                ${apprentice.capabilities.map(cap => `<li>${cap}</li>`).join('')}
            </ul>
            
            <h4>Practice Question:</h4>
            ${apprentice.current_questions.map(q => `
                <div class="card">
                    <p><strong>Q:</strong> ${q.question}</p>
                    <p><strong>Hint:</strong> ${q.hint}</p>
                    <p><strong>Expert Answer:</strong> ${q.expert_answer}</p>
                </div>
            `).join('')}
        `;
        
        document.getElementById('apprenticeContent').innerHTML = html;
    } catch (error) {
        console.error('Error loading apprentice:', error);
    }
}

// UI Functions
function checkAuth() {
    if (authToken) {
        if (isTokenExpired(authToken)) {
            logout();
            return;
        }
        const userStr = localStorage.getItem('user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            updateUIForAuth();
        }
    }
}

function updateUIForAuth() {
    const navUser = document.getElementById('navUser');
    
    if (currentUser) {
        navUser.innerHTML = `
            <span class="user-info">Welcome, ${currentUser.username}</span>
            <button class="btn-logout" onclick="logout()">Logout</button>
        `;
    } else {
        navUser.innerHTML = `
            <button class="btn-login" id="loginBtn">Login</button>
            <button class="btn-signup" id="signupBtn">Sign Up</button>
        `;
        
        // Re-attach event listeners
        document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
        document.getElementById('signupBtn').addEventListener('click', () => openModal('signupModal'));
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUIForAuth();
    loadPage('dashboard');
}

function isTokenExpired(token) {
    if (!token) return true;
    try {
        // Decode the JWT payload (Base64Url -> Base64 -> JSON)
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        // Check if current time is past expiration (exp is in seconds)
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return true;
        }
        return false;
    } catch (e) {
        return true;
    }
}

function openModal(modalId) {
    closeAllModals();
    document.getElementById(modalId).style.display = 'block';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function setCopyright() {
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// Make functions available globally
window.openModal = openModal;
window.logout = logout;
window.closeAllModals = closeAllModals;
window.updateUIForAuth = updateUIForAuth;