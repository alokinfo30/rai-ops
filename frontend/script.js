// State management
let currentUser = null;
let currentPage = 'dashboard';
let authToken = localStorage.getItem('token');
let refreshToken = localStorage.getItem('refreshToken');
let driftChartInstance = null;
let dashboardChartInstance = null;
let currentTheme = localStorage.getItem('theme') || 'light';
let currentLogFilter = '';
let currentLogSearch = '';
let currentLogSort = 'desc';
let currentLogStartDate = '';
let currentLogEndDate = '';
let logSearchTimeout = null;
let itemsPerPage = parseInt(localStorage.getItem('itemsPerPage'), 10) || 10;
let deleteTimeout = null;
let pendingDeleteIds = [];
let pendingDeleteElements = [];
let pendingDeletePayload = null;
let selectAllMatching = false;
let totalLogsCount = 0;
// Sanitize token if it got corrupted
if (authToken === 'null' || authToken === 'undefined') {
    authToken = null;
    localStorage.removeItem('token');
}

// API Configuration
// const API_URL = window.location.hostname === 'localhost'
//     ? '/api' // Use relative path for local dev (proxied by Nginx)
//     : 'https://rai-ops.onrender.com/api'; // Use absolute path for production

const API_URL = '/api'; // Always use a relative path, assuming a reverse proxy.

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    checkAuth();
    initTheme();
    const lastPage = localStorage.getItem('lastPage') || 'dashboard';
    updateNotificationCount();
    setInterval(updateNotificationCount, 60000);
    navigateTo(lastPage);
    setCopyright();
});

function initEventListeners() {
    injectModals();
    // Delegated event listener for dynamic content
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const actionTarget = target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;

        switch (action) {
            case 'navigate':
                e.preventDefault();
                const page = actionTarget.dataset.page;
                if (page) navigateTo(page);
                break;
            case 'toggle-mobile-menu':
                toggleMobileMenu();
                break;
            case 'open-modal':
                e.preventDefault();
                const modalId = actionTarget.dataset.modalId;
                if (modalId) openModal(modalId);
                break;
            case 'logout':
                logout();
                break;
            case 'close-modal':
                closeAllModals();
                break;
            case 'resolve-alert':
                const alertId = actionTarget.dataset.id;
                if (alertId) resolveAlert(parseInt(alertId, 10));
                break;
            case 'resolve-all-alerts':
                resolveAllAlerts();
                break;
            case 'copy-results':
                copyResultsToClipboard();
                break;
            case 'refresh-monitoring':
                loadMonitoringData(true); // Generate new data on refresh
                break;
            case 'download-report':
                downloadComplianceReport();
                break;
            case 'email-report':
                emailComplianceReport();
                break;
            case 'toggle-theme':
                toggleTheme();
                break;
            case 'view-test-details':
                const testId = actionTarget.dataset.id;
                if (testId) viewTestDetails(testId);
                break;
            case 'export-chart':
                const chartId = actionTarget.dataset.chartId;
                if (chartId) exportChartImage(chartId, `chart_export_${new Date().toISOString().slice(0,10)}.png`);
                break;
            case 'export-chart-csv':
                exportChartDataCsv();
                break;
            case 'back-to-top':
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'load-more-logs':
                const nextPage = actionTarget.dataset.page;
                if (nextPage) loadMoreComplianceLogs(parseInt(nextPage, 10));
                break;
            case 'load-more-activity':
                const nextPageActivity = actionTarget.dataset.page;
                if (nextPageActivity) loadMoreActivity(parseInt(nextPageActivity, 10));
                break;
            case 'export-logs-csv':
                exportComplianceLogsCsv();
                break;
            case 'save-log-filter':
                handleSaveFilter();
                break;
            case 'manage-log-filters':
                handleDeleteSavedFilter();
                break;
            case 'bulk-delete-logs':
                handleBulkDeleteLogs();
                break;
            case 'download-test-pdf':
                const pdfTestId = actionTarget.dataset.testId;
                if (pdfTestId) downloadTestPdf(pdfTestId);
                break;
            case 'mark-notification-read':
                const notificationId = actionTarget.dataset.notificationId;
                if (notificationId) markNotificationAsRead(notificationId);
            case 'open-notifications':
                openNotificationsModal();
                break;
            case 'retry-test':
                const retryTestId = actionTarget.dataset.testId;
                if (retryTestId) handleRetryTest(retryTestId);
                break;
            case 'delete-schedule':
                const deleteScheduleId = actionTarget.dataset.id;
                if (deleteScheduleId) handleDeleteSchedule(deleteScheduleId);
                break;
        }
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Scroll listener for back-to-top button
    window.addEventListener('scroll', handleScroll);
    
    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);
    document.getElementById('resetPasswordForm').addEventListener('submit', handleResetPassword);
    document.getElementById('saveFilterForm').addEventListener('submit', handleSaveFilterSubmit);
    document.getElementById('manageFiltersModal').addEventListener('click', handleManageFilterClick);

    document.body.addEventListener('change', (e) => {
        if (e.target.classList.contains('log-checkbox') || e.target.id === 'selectAllLogs') {
            handleLogCheckboxChange(e);
        }
        if (e.target.id === 'btnSelectAllMatching') {
            handleSelectAllMatching(e);
        }
        if (e.target.id === 'btnClearSelection') {
            handleClearSelection(e);
        }
        if (e.target.dataset.action === 'toggle-schedule') {
            const scheduleId = e.target.dataset.id;
            const isActive = e.target.checked;
            if (scheduleId) handleToggleSchedule(scheduleId, isActive);
        }
    });
}

function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

function injectModals() {
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <div id="saveFilterModal" class="modal">
            <div class="modal-content">
                <span class="close" data-action="close-modal">&times;</span>
                <h2>Save Filter Set</h2>
                <p class="modal-description">Save the current filters for quick access later. If the name already exists, it will be overwritten.</p>
                <form id="saveFilterForm">
                    <div class="form-group">
                        <label for="filterNameInput">Filter Name</label>
                        <input type="text" id="filterNameInput" required placeholder="e.g., My Weekly Audit">
                    </div>
                    <button type="submit" class="btn-primary">Save Filter</button>
                </form>
            </div>
        </div>
        <div id="manageFiltersModal" class="modal">
            <div class="modal-content">
                <span class="close" data-action="close-modal">&times;</span>
                <h2>Manage Saved Filters</h2>
                <div id="savedFiltersList" class="scrollable-y-300">
                    <!-- List will be populated dynamically -->
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalContainer);
}

async function navigateTo(page) {
    if (deleteTimeout) {
        clearTimeout(deleteTimeout);
        await executePendingDelete();
    }
    localStorage.setItem('lastPage', page);

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
    
    // Reset chart instance when changing pages to prevent memory leaks
    if (driftChartInstance) {
        driftChartInstance.destroy();
        driftChartInstance = null;
    }
    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
        dashboardChartInstance = null;
    }

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
            case 'profile':
                await loadProfile();
                break;
        }
    } catch (error) {
        // Ignore session errors as logout() handles the redirect
        if (error.isSessionError) return;
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
                    <i class="fas fa-server"></i>
                </div>
                <div class="stats-info">
                    <h3>System Status</h3>
                    <div class="stats-number system-status-number" id="systemStatus">Checking...</div>
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
        
        <div class="card mt-2">
            <div class="d-flex justify-between align-center mb-1">
                <h2 class="h2-no-margin">Security Events Trend (Last 7 Days)</h2>
                <div class="d-flex gap-1">
                    <button data-action="export-chart-csv" class="btn-primary btn-sm btn-secondary">
                        <i class="fas fa-file-csv"></i> CSV
                    </button>
                    <button data-action="export-chart" data-chart-id="dashboardChartCanvas" class="btn-primary btn-sm">
                        <i class="fas fa-camera"></i> Image
                    </button>
                </div>
            </div>
            <div id="dashboardChartContainer" class="chart-container">
                <canvas id="dashboardChartCanvas"></canvas>
            </div>
        </div>

        <div class="card mt-2">
            <h2>Recent Activity</h2>
            <div id="recentActivity">
        <div class="card mt-2">
            <h2>Vulnerability Status Trend (Last 7 Days)</h2>
            <div id="vulnerabilityTrendContainer" class="chart-container">
                <canvas id="vulnerabilityTrendChart"></canvas>
            </div>
        </div>

                <p>Loading recent activity...</p>
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = html;
    
    // Fetch and update stats
    if (currentUser) {
        await updateDashboardStats();
        await loadDashboardChart();
        await updateSystemStatus();
    }
}

async function loadRedTeaming() {
    const html = `
        <div class="redteam-container">
            <div class="card test-form">
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
                <h2>Scheduled Tests</h2>
                <form id="scheduleTestForm" class="mb-1">
                    <input type="text" id="scheduleTestName" class="form-control mb-1" required placeholder="Test Name (e.g., Daily Scan)">
                    <select id="scheduleTestType" class="form-control mb-1" required>
                        <option value="">Select Test Type</option>
                        <option value="deepfake">Deepfake Detection</option>
                        <option value="adversarial">Adversarial Attacks</option>
                        <option value="synthetic">Synthetic Identity</option>
                    </select>
                    <input type="text" id="scheduleTargetSystem" class="form-control mb-1" required placeholder="Target System">
                    <select id="scheduleInterval" class="form-control mb-1" required>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                    <input type="datetime-local" id="scheduleStartDate" class="form-control mb-1" required>
                    <button type="submit" class="btn-primary btn-sm">Schedule Test</button>
                </form>
                <div id="scheduledTestsList"><div class="spinner"></div></div>
            </div>

            <div class="card">
                <h2>Recent Tests</h2>
                <div id="recentTests">
                    <p>No tests run yet</p>
                </div>
            </div>
            <div id="testResultsArea" class="grid-col-span-full"></div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = html;
    
    if (currentUser) {
        document.getElementById('redTeamForm').addEventListener('submit', handleRedTeamTest);
        document.getElementById('scheduleTestForm').addEventListener('submit', handleScheduleTestSubmit);
        await loadRecentTests();
        await loadScheduledTests();
    } else {
        showLoginPrompt(document.getElementById('mainContent'), 'run tests');
        document.getElementById('redTeamForm').addEventListener('submit', (e) => {
            e.preventDefault();
            openModal('loginModal');
        });
    }
}

async function loadMonitoring() {
    const html = `
        <div class="monitoring-container">
            <div class="card">
                <div class="d-flex justify-between align-center mb-1">
                    <h2 class="h2-no-margin">Model Drift Detection</h2>
                    <button data-action="refresh-monitoring" class="btn-primary btn-sm">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
                <div id="driftChartContainer" class="chart-container">
                    <canvas id="driftChartCanvas"></canvas>
                </div>
            </div>
            
            <div class="alerts-list">
                <div class="d-flex justify-between align-center mb-1">
                    <h2 class="h2-no-margin">Active Alerts</h2>
                    <button data-action="resolve-all-alerts" class="btn-primary btn-sm btn-secondary">
                        <i class="fas fa-check-double"></i> Resolve All
                    </button>
                </div>
                <div id="alerts">
                    <p>Loading alerts...</p>
                </div>
            </div>
        </div>
        
        <div class="card mt-2">
            <div class="d-flex justify-between align-center mb-1">
                <h2 class="h2-no-margin">Compliance Logs</h2>
                <div class="d-flex gap-1 align-center" style="flex-wrap: wrap;">
                    <div id="logBulkActions" class="d-flex gap-1 align-center" style="display: none;">
                        <button data-action="bulk-delete-logs" class="btn-primary btn-sm btn-danger" title="Delete selected logs">
                            <i class="fas fa-trash-alt"></i> <span id="logSelectionCount"></span>
                        </button>
                        <span class="filter-divider">|</span>
                    </div>
                    <select id="savedLogFilters" class="form-control-sm" title="Load a saved filter set">
                        <option value="">Saved Filters</option>
                    </select>
                    <button data-action="save-log-filter" class="btn-primary btn-sm btn-secondary" title="Save current filters">
                        <i class="fas fa-save"></i>
                    </button>
                    <button data-action="manage-log-filters" class="btn-primary btn-sm btn-secondary" title="Delete a saved filter">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <span class="filter-divider">|</span>
                    <input type="date" id="logStartDate" class="form-control-sm" title="Start date">
                    <input type="date" id="logEndDate" class="form-control-sm" title="End date">
                    <input type="text" id="logSearch" class="form-control-sm" placeholder="Search resource..." style="max-width: 150px;">
                    <select id="logSort" class="form-control-sm" title="Sort order">
                        <option value="desc">Newest</option>
                        <option value="asc">Oldest</option>
                    </select>
                    <select id="logFilter" class="form-control-sm" title="Filter logs by action">
                        <option value="">All Actions</option>
                        <option value="CREATE_TEST">Test Creation</option>
                        <option value="RETRY_TEST">Test Retry</option>
                        <option value="VULN_STATUS_CHANGE">Vulnerability Status Change</option>
                        <option value="USER_DELETE">Account Deletion</option>
                        <option value="USER_UPDATE">Profile Update</option>
                    </select>
                    <button id="clearLogFilters" class="btn-primary btn-xs btn-secondary" title="Clear all filters" style="line-height: 1;">
                        <i class="fas fa-times"></i>
                    </button>
                    <button data-action="export-logs-csv" class="btn-primary btn-sm btn-secondary">
                        <i class="fas fa-file-csv"></i> CSV
                    </button>
                    <button data-action="email-report" class="btn-primary btn-sm btn-secondary">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                    <button data-action="download-report" class="btn-primary btn-sm">
                        <i class="fas fa-file-pdf"></i> Download
                    </button>
                </div>
            </div>
            <div id="complianceLogs">
                <p>Loading logs...</p>
            </div>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = html;
    
    if (currentUser) {
        const savedFiltersSelect = document.getElementById('savedLogFilters');
        if (savedFiltersSelect) {
            savedFiltersSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    applySavedFilter(e.target.value);
                } else {
                    // Optional: clear filters if "Saved Filters" is selected
                }
            });
        }
        loadSavedFiltersUI(); // Populate the dropdown on load
        // Add event listener for the new filter. It's attached here so it's ready before data loads.
        const logFilterEl = document.getElementById('logFilter');
        if (logFilterEl) {
            logFilterEl.value = currentLogFilter; // Ensure it reflects current state
            logFilterEl.addEventListener('change', async (e) => {
                currentLogFilter = e.target.value;
                // Reload logs from page 1, not appending
                await fetchAndRenderLogs(false, 1);
            });
        }

        const logSearchEl = document.getElementById('logSearch');
        if (logSearchEl) {
            logSearchEl.value = currentLogSearch;
            logSearchEl.addEventListener('input', (e) => {
                currentLogSearch = e.target.value;
                if (logSearchTimeout) clearTimeout(logSearchTimeout);
                logSearchTimeout = setTimeout(() => {
                    fetchAndRenderLogs(false, 1);
                }, 500);
            });
        }

        const logSortEl = document.getElementById('logSort');
        if (logSortEl) {
            logSortEl.value = currentLogSort;
            logSortEl.addEventListener('change', async (e) => {
                currentLogSort = e.target.value;
                await fetchAndRenderLogs(false, 1);
            });
        }

        const logStartDateEl = document.getElementById('logStartDate');
        if (logStartDateEl) {
            logStartDateEl.value = currentLogStartDate;
            logStartDateEl.addEventListener('change', async (e) => {
                currentLogStartDate = e.target.value;
                await fetchAndRenderLogs(false, 1);
            });
        }

        const logEndDateEl = document.getElementById('logEndDate');
        if (logEndDateEl) {
            logEndDateEl.value = currentLogEndDate;
            logEndDateEl.addEventListener('change', async (e) => {
                currentLogEndDate = e.target.value;
                await fetchAndRenderLogs(false, 1);
            });
        }

        const clearFiltersBtn = document.getElementById('clearLogFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', async () => {
                // reset state
                currentLogFilter = '';
                currentLogSearch = '';
                currentLogSort = 'desc';
                currentLogStartDate = '';
                currentLogEndDate = '';
                // reset UI
                if (document.getElementById('logFilter')) document.getElementById('logFilter').value = '';
                if (document.getElementById('logSearch')) document.getElementById('logSearch').value = '';
                if (document.getElementById('logSort')) document.getElementById('logSort').value = 'desc';
                if (document.getElementById('logStartDate')) document.getElementById('logStartDate').value = '';
                if (document.getElementById('logEndDate')) document.getElementById('logEndDate').value = '';
                // fetch
                await fetchAndRenderLogs(false, 1);
            });
        }
        await loadMonitoringData();
    } else {
        showLoginPrompt(document.getElementById('mainContent'), 'view monitoring data');
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
    } else {
        showLoginPrompt(document.getElementById('mainContent'), 'access expert features');
        document.getElementById('expertSessionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            openModal('loginModal');
        });
    }
}

async function loadProfile() {
    if (!currentUser) {
        navigateTo('dashboard');
        return;
    }

    const html = `
        <div class="profile-container">
            <div class="card">
                <h2>User Profile</h2>

                <button class="btn-primary" data-action="open-modal" data-modal-id="notificationsModal">
                        <i class="fas fa-bell"></i> View Notifications
                </button>
                <form id="profilePageForm">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" value="${currentUser.username}" disabled class="input-disabled">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" value="${currentUser.email || ''}" disabled class="input-disabled">
                    </div>
                    <div class="form-group">
                        <label for="profileCompany">Company</label>
                        <input type="text" id="profileCompany" value="${currentUser.company || ''}">
                    </div>
                    <div class="form-group">
                        <label for="settingsItemsPerPage">Items Per Page (Lists)</label>
                        <select id="settingsItemsPerPage" class="form-control">
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="profilePassword">New Password (leave blank to keep current)</label>
                        <input type="password" id="profilePassword" placeholder="New Password">
                    </div>
                    <button type="submit" class="btn-primary">Update Profile</button>
                    <hr class="hr-divider">
                    <button type="button" id="btnDeleteAccount" class="btn-primary btn-danger">Delete Account</button>
                </form>
            </div>
        </div>
    `;
    

    document.getElementById('mainContent').innerHTML = html;
    document.getElementById('profilePageForm').addEventListener('submit', handleProfileUpdate);
    const settingsSelect = document.getElementById('settingsItemsPerPage');
    if (settingsSelect) {
        settingsSelect.value = itemsPerPage.toString();
    }
    document.getElementById('btnDeleteAccount').addEventListener('click', handleDeleteAccount);
}

// API Functions

/**
 * A wrapper for the fetch API to centralize error handling, authentication, and headers.
 * @param {string} endpoint - The API endpoint to call (e.g., '/auth/login').
 * @param {object} options - The options object for the fetch call.
 * @returns {Promise<any>} - The JSON response from the API.
 */
async function apiFetch(endpoint, options = {}) {
    const { responseType = 'json', ...fetchOptions } = options;


    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...fetchOptions.headers,

        ...fetchOptions.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers });

    // Handle Token Expiration (401) with Refresh Flow
        if (refreshToken) {
                const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (refreshResponse.ok) { 
                    const data = await refreshResponse.json();
                    authToken = data.access_token;
                    localStorage.setItem('token', authToken);
                    // Retry original request with new token

                    let retryOptions = {...fetchOptions, headers: {'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json'}};


                    headers['Authorization'] = `Bearer ${authToken}`;
                    const retryResponse = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers });
                    if (!retryResponse.ok) throw new Error(`Request failed with status ${retryResponse.status}`);
                    
                    if (responseType === 'blob') {
                        return retryResponse.blob();
                    }

                    return retryResponse.status === 204 ? null : retryResponse.json();
                }
            } catch (e) {
                console.error("Token refresh failed", e);
                console.error("Token refresh failed", e)
            }
        }
        // If refresh failed or no refresh token exists
        logout();
        logout()
        const err = new Error('Session expired or invalid.');
        err.isSessionError = true;
        throw err;
    }

    if (!response.ok && response.status !== 422) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    if (responseType === 'blob') {
        return response.blob();
    }
    return response.status === 204 ? null : response.json();
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        authToken = data.access_token;
        refreshToken = data.refresh_token;
        currentUser = data.user;
        localStorage.setItem('token', authToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        closeAllModals();
        updateUIForAuth();
        navigateTo('dashboard'); // Always navigate to dashboard after login
    } catch (error) {
        alert(error.message || 'Login failed. Please try again.');
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
        await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        alert('Registration successful! Please login.');
        closeAllModals();
        openModal('loginModal');
    } catch (error) {
        alert(error.message || 'Registration failed. Please try again.');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const company = document.getElementById('profileCompany').value;
    const password = document.getElementById('profilePassword').value;
    const newItemsPerPage = document.getElementById('settingsItemsPerPage').value;

    localStorage.setItem('itemsPerPage', newItemsPerPage);
    itemsPerPage = parseInt(newItemsPerPage, 10);
    
    try {
        const data = await apiFetch('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ company, password })
        });

        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateUIForAuth();
    } catch (error) {
        alert(error.message || 'Failed to update profile.');
    }
}

async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be lost.')) return;
    
    try {
        await apiFetch('/user/me', { method: 'DELETE' });
        alert('Account deleted successfully.');
        logout();
    } catch (error) {
        alert(error.message || 'Failed to delete account.');
    }
}

async function handleScheduleTestSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const scheduleData = {
        test_name: document.getElementById('scheduleTestName').value,
        test_type: document.getElementById('scheduleTestType').value,
        target_system: document.getElementById('scheduleTargetSystem').value,
        schedule_interval: document.getElementById('scheduleInterval').value,
        start_date: document.getElementById('scheduleStartDate').value,
    };

    try {
        await apiFetch('/scheduled_tests', {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        });
        e.target.reset();
        await loadScheduledTests();
    } catch (error) {
        alert('Failed to schedule test: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Schedule Test';
    }
}

async function loadScheduledTests() {
    const container = document.getElementById('scheduledTestsList');
    if (!container) return;
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const scheduledTests = await apiFetch('/scheduled_tests');
        if (scheduledTests.length === 0) {
            container.innerHTML = '<p>No tests are currently scheduled.</p>';
            return;
        }

        const html = scheduledTests.map(s_test => `
            <div class="scheduled-test-item">
                <div>
                    <strong>${s_test.test_name}</strong> (${s_test.schedule_interval})
                    <br>
                    <small>Target: ${s_test.target_system}</small>
                </div>
                <div class="d-flex gap-1 align-center">
                    <label class="switch" title="${s_test.is_active ? 'Active' : 'Paused'}">
                        <input type="checkbox" data-action="toggle-schedule" data-id="${s_test.id}" ${s_test.is_active ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                    <button data-action="delete-schedule" data-id="${s_test.id}" class="btn-primary btn-xs btn-danger" title="Delete Schedule"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p class="error">Could not load scheduled tests.</p>';
    }
}

async function handleToggleSchedule(id, isActive) {
    try {
        await apiFetch(`/scheduled_tests/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: isActive })
        });
    } catch (error) {
        alert('Failed to update schedule status: ' + error.message);
        loadScheduledTests(); // Revert checkbox state on failure
    }
}

async function handleDeleteSchedule(id) {
    if (!confirm('Are you sure you want to delete this scheduled test?')) return;
    try {
        await apiFetch(`/scheduled_tests/${id}`, { method: 'DELETE' });
        await loadScheduledTests();
    } catch (error) {
        alert('Failed to delete schedule: ' + error.message);
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    
    try {
        const data = await apiFetch('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        alert(data.message);
        
        // SIMULATION: In a real app, the user clicks a link in email.
        // Here, we auto-open the reset modal with the mock token for demonstration.
        if (data.mock_token) {
            console.log("Mock Token received:", data.mock_token);
            document.getElementById('resetToken').value = data.mock_token;
            closeAllModals();
            openModal('resetPasswordModal');
        } else {
            closeAllModals();
        }
    } catch (error) {
        alert(error.message || 'Failed to process request.');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const token = document.getElementById('resetToken').value;
    const password = document.getElementById('newResetPassword').value;
    
    try {
        await apiFetch('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password })
        });
        
        alert('Password has been reset successfully. Please login.');
        closeAllModals();
        openModal('loginModal');
    } catch (error) {
        alert(error.message || 'Failed to reset password.');
    }
}

async function handleRedTeamTest(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Test...';

    const testData = {
        test_name: document.getElementById('testName').value,
        test_type: document.getElementById('testType').value,
        target_system: document.getElementById('targetSystem').value
    };
    
    try {
        // Create test
        const test = await apiFetch('/redteam/test', {
            method: 'POST',
            body: JSON.stringify(testData)
        });

        // Run test
        const results = await apiFetch(`/redteam/test/${test.test.id}/run`, {
            method: 'POST'
        });
            
        // Display results
        displayTestResults(results, test.test.id);
        await loadRecentTests();
    } catch (error) {
        console.error(error);
        alert('Error running test: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function handleRetryTest(testId) {
    if (!confirm('Are you sure you want to retry this test?')) return;

    const btn = document.querySelector(`button[data-action="retry-test"][data-test-id="${testId}"]`);
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    try {
        // Create retry test
        const response = await apiFetch(`/redteam/test/${testId}/retry`, { method: 'POST' });
        const newTest = response.test;

        // Run the new test
        const results = await apiFetch(`/redteam/test/${newTest.id}/run`, { method: 'POST' });

        // Refresh list and show results
        await loadRecentTests();
        displayTestResults(results, newTest.id);

    } catch (error) {
        console.error('Retry failed:', error);
        alert('Failed to retry test: ' + error.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}

async function handleExpertSession(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    const sessionData = {
        expert_name: document.getElementById('expertName').value,
        domain: document.getElementById('domain').value,
        experience: document.getElementById('expertise').value
    };
    
    try {
        const data = await apiFetch('/knowledge/expert/session', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });

        displayVirtualApprentice(data.session.id);

    } catch (error) {
        console.error(error);
        alert('Error creating expert session: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function updateDashboardStats() {
    if (!authToken) return;

    document.getElementById('recentActivity').innerHTML = '<div class="spinner"></div>';

    try {
        const [statsResponse, activityResponse] = await Promise.all([
            apiFetch('/dashboard/stats'),
            apiFetch(`/dashboard/recent-activity?page=1&per_page=${itemsPerPage}`)
        ]);

        const stats = statsResponse;
        const activityData = activityResponse;

        // Check if elements exist before updating (user might have navigated away)
        if (!document.getElementById('securityTests')) return;

        document.getElementById('securityTests').textContent = stats.securityTests;
        document.getElementById('activeAlerts').textContent = stats.activeAlerts;
        document.getElementById('complianceScore').textContent = stats.complianceScore + '%';
        document.getElementById('modelsMonitored').textContent = stats.modelsMonitored;

        renderRecentActivity(activityData);
    } catch (error) {
        // Only log actual errors, not auth redirects
        if (authToken) {
            console.error('Error updating dashboard:', error);
        }
        renderRecentActivity(null, error, false);
    }
}

async function updateSystemStatus() {
    try {
        // The health endpoint is at the root /health, not under /api
        const response = await fetch('/health');
        const data = await response.json();
        
        const statusEl = document.getElementById('systemStatus');
        if (statusEl) {
            if (data.status === 'healthy') {
                statusEl.innerHTML = '<span class="status-online">Online</span>';
            } else {
                statusEl.innerHTML = '<span class="status-offline">Issues</span>';
            }
        }
    } catch (error) {
        const statusEl = document.getElementById('systemStatus');
        if (statusEl) statusEl.innerHTML = '<span class="status-offline">Offline</span>';
    }
}

async function loadDashboardChart() {
    try {
        const data = await apiFetch('/dashboard/chart-data');
        
        const ctx = document.getElementById('dashboardChartCanvas');
        if (!ctx) return;

        if (dashboardChartInstance) {
            dashboardChartInstance.destroy();
        }

        dashboardChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Security Tests Run',
                        data: data.tests,
                        borderColor: '#4a90e2',
                        backgroundColor: 'rgba(74, 144, 226, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Alerts Triggered',
                        data: data.alerts,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    } catch (error) {
        console.error('Error loading dashboard chart:', error);
        const container = document.getElementById('dashboardChartContainer');
        if (container) container.innerHTML = '<p class="error">Could not load chart data.</p>';
    }
}

async function loadVulnerabilityTrendChart() {
    try {
        const trendData = await apiFetch('/dashboard/vulnerability-trend');
        
        // Group data by date and status
        const groupedData = {};
        trendData.forEach(item => {
            if (!groupedData[item.date]) {
                groupedData[item.date] = {};
            }
            groupedData[item.date][item.status] = item.count;
        });

        // Extract labels (dates) and datasets (status counts)
        const labels = Object.keys(groupedData).sort();
        const statuses = ['new', 'acknowledged', 'in_progress', 'resolved'];
        const datasets = statuses.map(status => {
            const data = labels.map(date => groupedData[date][status] || 0);
            return {
                label: status,
                data: data,
                borderColor: getChartColor(statuses.indexOf(status)),
                backgroundColor: getChartColor(statuses.indexOf(status)) + '40',
                tension: 0.4
            };
        });

        const ctx = document.getElementById('vulnerabilityTrendChart');
        if (!ctx) return;
        
        if (dashboardChartInstance) {
            dashboardChartInstance.destroy();
        }

        dashboardChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Vulnerabilities'
                        }
                    },
                    x: {
                         title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    title: { display: false },
                    legend: { display: true, position: 'bottom' }
                }
            }
        });

    } catch (error) {
        console.error('Error loading vulnerability trend chart:', error);
        const container = document.getElementById('vulnerabilityTrendContainer');
        if (container) container.innerHTML = '<p class="error">Could not load chart data.</p>';
    }
}

async function loadRecentTests(showAll = false) {
    try {
        const url = showAll ? `/redteam/tests?per_page=${itemsPerPage}` : '/redteam/tests?per_page=5';
        const data = await apiFetch(url);
        const tests = data.tests;
        const totalTests = data.total;

        const testsHtml = tests.map(test => `
            <div class="alert-item">
                <div class="alert-severity ${test.status === 'completed' ? 'low' : 'medium'}">
                    <i class="fas ${test.status === 'completed' ? 'fa-check' : 'fa-spinner fa-spin'}"></i>
                </div>
                <div class="flex-1">
                    <strong>${test.test_name}</strong> (${test.test_type})
                    <br>
                    <small>${test.status} - ${new Date(test.created_at).toLocaleString()}</small>
                </div>
                ${test.status === 'completed' ? `
                <div class="d-flex gap-1">
                    <button data-action="view-test-details" data-id="${test.id}" class="btn-primary btn-xs">
                        View Report
                    </button>
                    <button data-action="retry-test" data-test-id="${test.id}" class="btn-primary btn-xs btn-secondary" title="Retry Test">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
                ` : ''}
            </div>
        `).join('');

        const container = document.getElementById('recentTests');
        if (container) {
            let html = testsHtml || '<p>No tests run yet.</p>';
            
            // If not showing all and there are more tests than currently shown
            if (!showAll && totalTests > tests.length) {
                html += `
                    <div class="text-center mt-1">
                        <button id="btnShowAllTests" class="btn-primary btn-sm btn-secondary">Show All (${totalTests})</button>
                    </div>
                `;
            }
            container.innerHTML = html;
            if (!showAll && totalTests > tests.length) {
                document.getElementById('btnShowAllTests').addEventListener('click', () => loadRecentTests(true));
            }
        }
    } catch (error) {
        console.error('Error loading recent tests:', error);
        const container = document.getElementById('recentTests');
        if (container) {
            container.innerHTML = '<p class="error">Could not load recent tests.</p>';
        }
    }
}

async function viewTestDetails(testId) {
    const btn = document.querySelector(`button[data-id="${testId}"]`);
    const originalText = btn ? btn.innerHTML : 'View Report';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    try {
        // Fetch the specific test details and associated logs
        const [test, logsData] = await Promise.all([
            apiFetch(`/redteam/test/${testId}`),
            apiFetch(`/monitoring/compliance-logs?search=test/${testId}&per_page=50`)
        ]);
        
        displayTestResults({ results: test.results }, testId, logsData.logs);
    } catch (error) {
        console.error('Error fetching test details:', error);
        alert('Failed to load test details.');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

async function loadMonitoringData(generateNewData = false) {
    if (!authToken || authToken === "null") {
        console.warn("Auth token missing or expired. Redirecting to login.");
        logout();
        return;
    }

    // Set loading state for all sections
    document.getElementById('driftChartContainer').innerHTML = '<div class="spinner"></div>';
    document.getElementById('alerts').innerHTML = '<div class="spinner"></div>';
    document.getElementById('complianceLogs').innerHTML = '<div class="spinner"></div>';

    try {
        if (generateNewData) {
            await apiFetch('/monitoring/generate', { method: 'POST' });
        }

        // Fetch all monitoring data in parallel
        const [alerts, driftData] = await Promise.all([
            apiFetch('/monitoring/alerts'),
            apiFetch('/monitoring/drift')
        ]);

        renderDriftChart(driftData);
        renderAlerts(alerts);
        await fetchAndRenderLogs(); // Load logs separately with filter awareness

    } catch (error) {
        console.error('Error loading monitoring data:', error);
        // Display a more user-friendly error within each component on failure
        const driftContainer = document.getElementById('driftChartContainer');
        if (driftContainer) driftContainer.innerHTML = `<p class="error">Could not load drift data.</p>`;

        const alertsContainer = document.getElementById('alerts');
        if (alertsContainer) alertsContainer.innerHTML = `<p class="error">Could not load alerts.</p>`;

        const logsContainer = document.getElementById('complianceLogs');
        if (logsContainer) logsContainer.innerHTML = `<p class="error">Could not load logs.</p>`;
    }
}

async function loadMoreComplianceLogs(page) {
    await fetchAndRenderLogs(true, page);
}

async function fetchAndRenderLogs(append = false, page = 1) {
    const logsContainer = document.getElementById('complianceLogs');
    const loadMoreButton = logsContainer.querySelector('[data-action="load-more-logs"]');

    // Show spinner inside button if it exists, or in the container for a fresh load/filter
    if (append && loadMoreButton) {
        loadMoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        loadMoreButton.disabled = true;
    } else if (!append) {
        // When filtering or doing an initial load, show a loading state for the whole log section
        logsContainer.innerHTML = '<div class="spinner"></div>';
    }

    try {
        let url = `/monitoring/compliance-logs?page=${page}&per_page=${itemsPerPage}`;
        if (currentLogFilter) {
            url += `&action=${currentLogFilter}`;
        }
        if (currentLogSearch) {
            url += `&search=${encodeURIComponent(currentLogSearch)}`;
        }
        if (currentLogSort) {
            url += `&sort=${currentLogSort}`;
        }
        if (currentLogStartDate) {
            url += `&start_date=${currentLogStartDate}`;
        }
        if (currentLogEndDate) {
            url += `&end_date=${currentLogEndDate}`;
        }
        const data = await apiFetch(url);
        renderComplianceLogs(data, append);
    } catch (error) {
        console.error('Error loading compliance logs:', error);
        const container = document.getElementById('complianceLogs');
        if (container) container.innerHTML = '<p class="error text-center">Failed to load logs.</p>';
    }
}

async function loadNotifications() {
    try {
        const notifications = await apiFetch('/notifications');
        const container = document.getElementById('notificationsContainer');

        if (notifications.length === 0) {
            container.innerHTML = '<p>No notifications to display.</p>';
            return;
        }

        const html = notifications.map(notification => `
            <div class="notification-item ${notification.is_read ? 'read' : 'unread'}">
                <span class="notification-message">${notification.message}</span>
                <span class="notification-timestamp">${new Date(notification.timestamp).toLocaleString()}</span>
                ${!notification.is_read ? `<button class="mark-read-button" data-action="mark-notification-read" data-notification-id="${notification.id}">Mark as Read</button>` : ''}
            </div>
        `).join('');
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        await apiFetch(`/notifications/${notificationId}`, {
            method: 'PUT'
        });
        // Refresh notification list and count
        loadNotifications();
        updateNotificationCount();
    } catch (error) {
        console.error('Error marking notification as read:', error);
        alert('Failed to mark notification as read.');
    }
}

async function updateNotificationCount() {
    try {
        const data = await apiFetch('/notifications/unread_count');
        const count = data.unread_count;
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            notificationBadge.textContent = count > 0 ? count : '';
            notificationBadge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    } catch (error) {
        console.error('Error fetching notification count:', error);
    }
}

function openNotificationsModal() {
    openModal('notificationsModal');
    loadNotifications();
}

function initModals() {
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <div id="notificationsModal" class="modal">
            <div class="modal-content">
  <span class="close" data-action="close-modal">&times;</span>
                <h2>Notifications</h2>
                <div id="notificationsContainer" class="notifications-container">Loading...</div>
            </div>
        </div>
    `;
    document.body.appendChild(modalContainer);

async function loadMoreActivity(page) {
    const btn = document.querySelector('[data-action="load-more-activity"]');

    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        btn.disabled = true;
    }

    try {
        const data = await apiFetch(`/dashboard/recent-activity?page=${page}&per_page=${itemsPerPage}`);
        renderRecentActivity(data, null, true); // append results
    } catch (error) {
        console.error('Error loading more activity:', error);
        if (btn) btn.parentElement.innerHTML = '<p class="error text-center">Failed to load more activity.</p>';
    }
}

async function exportComplianceLogsCsv() {
    if (!authToken) return;
    
    const btn = document.querySelector('button[data-action="export-logs-csv"]');
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    try {
        let url = '/monitoring/compliance-logs/export?';
        const params = new URLSearchParams();
        
        if (currentLogFilter) params.append('action', currentLogFilter);
        if (currentLogSearch) params.append('search', currentLogSearch);
        if (currentLogSort) params.append('sort', currentLogSort);
        if (currentLogStartDate) params.append('start_date', currentLogStartDate);
        if (currentLogEndDate) params.append('end_date', currentLogEndDate);
        
        url += params.toString();

        const blob = await apiFetch(url, { responseType: 'blob' });
        if (!blob) throw new Error('Export failed');

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `compliance_logs_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export logs.');
    } finally {
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}

async function handleBulkDeleteLogs() {
    let logIds = [];
    let count = 0;

    if (selectAllMatching) {
        count = totalLogsCount;
        pendingDeletePayload = {
            delete_all_matching: true,
            filters: {
                action: currentLogFilter,
                search: currentLogSearch,
                start_date: currentLogStartDate,
                end_date: currentLogEndDate
            }
        };
    } else {
        const selectedCheckboxes = document.querySelectorAll('.log-items .log-checkbox:checked');
        logIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.logId, 10));
        if (logIds.length === 0) {
            alert("No logs selected.");
            return;
        }
        count = logIds.length;
        pendingDeletePayload = { log_ids: logIds };
    }

    // Optimistically remove from UI (visible items)
    const selectedCheckboxes = document.querySelectorAll('.log-items .log-checkbox:checked');
    pendingDeleteIds = logIds;
    pendingDeleteElements = [];
    
    selectedCheckboxes.forEach(cb => {
        const row = cb.closest('.alert-item');
        if (row) {
            row.style.display = 'none';
            cb.checked = false; // Uncheck so bulk UI updates
            pendingDeleteElements.push(row);
        }
    });
    
    // Reset selection UI
    const selectAllCheckbox = document.getElementById('selectAllLogs');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateBulkActionUI();

    // Show Undo Toast
    showUndoToast(count);

    // Set timeout for actual deletion
    if (deleteTimeout) clearTimeout(deleteTimeout);
    deleteTimeout = setTimeout(async () => {
        await executePendingDelete();
    }, 5000); // 5 seconds
}

async function executePendingDelete() {
    const toast = document.getElementById('undoToast');
    if (toast) toast.remove();
    
    if (!pendingDeletePayload) return;

    try {
        await apiFetch('/monitoring/compliance-logs', {
            method: 'DELETE',
            body: JSON.stringify(pendingDeletePayload)
        });
        
        // Check if list is empty (visually), if so, fetch next page or refresh
        const logsContainer = document.getElementById('complianceLogs');
        if (logsContainer) {
            const itemsContainer = logsContainer.querySelector('.log-items');
            if (itemsContainer) {
                const visibleItems = Array.from(itemsContainer.children).filter(c => c.style.display !== 'none');
                if (visibleItems.length === 0) {
                     await fetchAndRenderLogs(false, 1);
                }
            }
        }

    } catch (error) {
        console.error("Bulk delete failed:", error);
        alert("Failed to delete logs. Restoring...");
        undoDelete();
    } finally {
        pendingDeleteIds = [];
        pendingDeleteElements = [];
        pendingDeletePayload = null;
        deleteTimeout = null;
    }
}

function undoDelete() {
    if (deleteTimeout) clearTimeout(deleteTimeout);
    deleteTimeout = null;

    pendingDeleteElements.forEach(row => {
        row.style.display = 'flex';
        const cb = row.querySelector('.log-checkbox');
        if (cb) cb.checked = true;
    });

    pendingDeleteIds = [];
    pendingDeleteElements = [];
    pendingDeletePayload = null;
    
    const toast = document.getElementById('undoToast');
    if (toast) toast.remove();
    
    updateBulkActionUI();
}

function showUndoToast(count) {
    const existingToast = document.getElementById('undoToast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'undoToast';
    toast.className = 'undo-toast';
    toast.innerHTML = `
        <span>${count} log(s) deleted.</span>
        <button id="btnUndoDelete" class="btn-link">Undo</button>
    `;
    
    document.body.appendChild(toast);
    
    document.getElementById('btnUndoDelete').addEventListener('click', undoDelete);
}

function handleLogCheckboxChange(e) {
    const target = e.target;
    const logsContainer = target.closest('#complianceLogs');
    if (!logsContainer) return;

    const logItemsContainer = logsContainer.querySelector('.log-items');
    if (!logItemsContainer) return;

    const allCheckboxes = logItemsContainer.querySelectorAll('.log-checkbox');
    const selectAllCheckbox = logsContainer.querySelector('#selectAllLogs');

    // If user manually unchecks a box while "Select All Matching" is active, disable "Select All Matching"
    if (target.classList.contains('log-checkbox') && !target.checked && selectAllMatching) {
        selectAllMatching = false;
    }

    if (target.id === 'selectAllLogs') {
        allCheckboxes.forEach(cb => cb.checked = target.checked);
        if (!target.checked) {
            selectAllMatching = false;
        }
    } else {
        const allChecked = allCheckboxes.length > 0 && [...allCheckboxes].every(cb => cb.checked);
        if (selectAllCheckbox) selectAllCheckbox.checked = allChecked;
    }

    updateSelectAllBannerUI();
    updateBulkActionUI();
}

function updateBulkActionUI() {
    const selectedCheckboxes = document.querySelectorAll('.log-items .log-checkbox:checked');
    const count = selectedCheckboxes.length;
    
    const bulkActionsContainer = document.getElementById('logBulkActions');
    const selectionCountEl = document.getElementById('logSelectionCount');

    if (selectAllMatching) {
        bulkActionsContainer.style.display = 'flex';
        selectionCountEl.textContent = `${totalLogsCount} Selected`;
    } else if (count > 0) {
        bulkActionsContainer.style.display = 'flex';
        selectionCountEl.textContent = `${count} Selected`;
    } else {
        bulkActionsContainer.style.display = 'none';
    }
}

function updateSelectAllBannerUI() {
    const selectAllBanner = document.getElementById('selectAllBanner');
    const allSelectedBanner = document.getElementById('allSelectedBanner');
    const selectAllCheckbox = document.getElementById('selectAllLogs');
    const visibleCheckboxes = document.querySelectorAll('.log-items .log-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.log-items .log-checkbox:checked');
    
    if (!selectAllBanner || !allSelectedBanner) return;

    // Hide both initially
    selectAllBanner.style.display = 'none';
    allSelectedBanner.style.display = 'none';

    if (selectAllMatching) {
        allSelectedBanner.style.display = 'block';
        document.getElementById('totalCountSelected').textContent = totalLogsCount;
    } else if (selectAllCheckbox && selectAllCheckbox.checked && totalLogsCount > visibleCheckboxes.length) {
        selectAllBanner.style.display = 'block';
        document.getElementById('visibleCount').textContent = visibleCheckboxes.length;
        document.getElementById('totalCount').textContent = totalLogsCount;
    }
}

function handleSelectAllMatching(e) {
    e.preventDefault();
    selectAllMatching = true;
    updateSelectAllBannerUI();
    updateBulkActionUI();
}

function handleClearSelection(e) {
    e.preventDefault();
    selectAllMatching = false;
    const selectAllCheckbox = document.getElementById('selectAllLogs');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    const allCheckboxes = document.querySelectorAll('.log-items .log-checkbox');
    allCheckboxes.forEach(cb => cb.checked = false);
    
    updateSelectAllBannerUI();
    updateBulkActionUI();
}

function handleSaveFilter() {
    document.getElementById('filterNameInput').value = '';
    openModal('saveFilterModal');
}

function handleSaveFilterSubmit(e) {
    e.preventDefault();
    const filterNameInput = document.getElementById('filterNameInput');
    const filterName = filterNameInput.value.trim();

    if (!filterName) {
        alert("Please enter a filter name.");
        return;
    }

    const savedFilters = getSavedFilters();

    const newFilter = {
        name: filterName,
        settings: {
            filter: currentLogFilter,
            search: currentLogSearch,
            sort: currentLogSort,
            startDate: currentLogStartDate,
            endDate: currentLogEndDate,
        }
    };

    const otherFilters = savedFilters.filter(f => f.name !== filterName);
    const updatedFilters = [...otherFilters, newFilter];
    
    setSavedFilters(updatedFilters);
    loadSavedFiltersUI();
    document.getElementById('savedLogFilters').value = filterName;
    
    closeAllModals();
}

function populateManageFiltersModal() {
    const savedFilters = getSavedFilters();
    const listContainer = document.getElementById('savedFiltersList');

    if (savedFilters.length === 0) {
        listContainer.innerHTML = '<p>No saved filters to manage.</p>';
    } else {
        const sortedFilters = [...savedFilters].sort((a, b) => a.name.localeCompare(b.name));
        listContainer.innerHTML = sortedFilters.map(f => `
            <div class="saved-filter-item">
                <span>${f.name}</span>
                <button data-filter-name="${f.name}" class="btn-primary btn-xs btn-danger">Delete</button>
            </div>
        `).join('');
    }
}

function handleDeleteSavedFilter() {
    populateManageFiltersModal();
    openModal('manageFiltersModal');
}

function handleManageFilterClick(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON' && target.dataset.filterName) {
        const nameToDelete = target.dataset.filterName;
        
        if (confirm(`Are you sure you want to delete the filter "${nameToDelete}"?`)) {
            const savedFilters = getSavedFilters();
            const updatedFilters = savedFilters.filter(f => f.name !== nameToDelete);
            setSavedFilters(updatedFilters);
            
            populateManageFiltersModal();
            loadSavedFiltersUI();
        }
    }
}

function getSavedFilters() {
    try {
        const filters = localStorage.getItem('savedComplianceFilters');
        return filters ? JSON.parse(filters) : [];
    } catch (e) {
        console.error("Could not parse saved filters from localStorage", e);
        return [];
    }
}

function setSavedFilters(filters) {
    localStorage.setItem('savedComplianceFilters', JSON.stringify(filters));
}

function loadSavedFiltersUI() {
    const selectEl = document.getElementById('savedLogFilters');
    if (!selectEl) return;

    const savedFilters = getSavedFilters();
    selectEl.innerHTML = '<option value="">Saved Filters</option>';
    savedFilters.sort((a, b) => a.name.localeCompare(b.name));

    savedFilters.forEach(filter => {
        selectEl.add(new Option(filter.name, filter.name));
    });
}

async function applySavedFilter(filterName) {
    const savedFilters = getSavedFilters();
    const filterToApply = savedFilters.find(f => f.name === filterName);

    if (!filterToApply) {
        alert("Could not find the selected filter.");
        return;
    }

    const settings = filterToApply.settings;

    currentLogFilter = settings.filter || '';
    currentLogSearch = settings.search || '';
    currentLogSort = settings.sort || 'desc';
    currentLogStartDate = settings.startDate || '';
    currentLogEndDate = settings.endDate || '';

    if (document.getElementById('logFilter')) document.getElementById('logFilter').value = currentLogFilter;
    if (document.getElementById('logSearch')) document.getElementById('logSearch').value = currentLogSearch;
    if (document.getElementById('logSort')) document.getElementById('logSort').value = currentLogSort;
    if (document.getElementById('logStartDate')) document.getElementById('logStartDate').value = currentLogStartDate;
    if (document.getElementById('logEndDate')) document.getElementById('logEndDate').value = currentLogEndDate;
    if (document.getElementById('savedLogFilters')) document.getElementById('savedLogFilters').value = filterName;

    await fetchAndRenderLogs(false, 1);
}

function renderDriftChart(driftData) {
    const driftContainer = document.getElementById('driftChartContainer');
    if (!driftContainer) return;

    if (Array.isArray(driftData) && driftData.length > 0 && typeof Chart !== 'undefined') {
        // Re-create canvas because the spinner overwrote it
        driftContainer.innerHTML = '<canvas id="driftChartCanvas"></canvas>';
        const ctx = document.getElementById('driftChartCanvas').getContext('2d');
        
        if (driftChartInstance) {
            driftChartInstance.destroy();
        }

        const models = {};
        const sortedData = [...driftData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        sortedData.forEach(d => {
            if (!models[d.model_name]) {
                models[d.model_name] = {
                    label: d.model_name,
                    data: [],
                    borderColor: getChartColor(Object.keys(models).length),
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4
                };
            }
            models[d.model_name].data.push({
                x: new Date(d.created_at).toLocaleTimeString(),
                y: d.drift_score
            });
        });

        const labels = [...new Set(sortedData.map(d => new Date(d.created_at).toLocaleTimeString()))];

        driftChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: Object.values(models) },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Drift Score' } } }
            }
        });
    } else {
        driftContainer.innerHTML = '<p>No drift data to display.</p>';
    }
}

function renderAlerts(alerts) {
    const alertsContainer = document.getElementById('alerts');
    if (!alertsContainer) return;

    if (Array.isArray(alerts) && alerts.length > 0) {
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.resolved ? 'alert-resolved' : ''}">
                <div class="alert-severity ${alert.severity}">
                    <i class="fas ${alert.resolved ? 'fa-check' : 'fa-exclamation'}"></i>
                </div>
                <div class="flex-1">
                    <strong>${alert.message}</strong>
                    <br>
                    <small>${new Date(alert.timestamp).toLocaleString()}</small>
                </div>
                ${!alert.resolved ? `
                <button data-action="resolve-alert" data-id="${alert.id}" class="btn-primary btn-xs">
                    Resolve
                </button>
                ` : ''}
            </div>
        `).join('');
    } else {
        alertsContainer.innerHTML = '<p>No active alerts.</p>';
    }
}

function renderRecentActivity(data, error = null, append = false) {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (error) {
        container.innerHTML = '<p class="error">Could not load recent activity.</p>';
        return;
    }

    // On initial load, set up the inner container for items
    if (!append) {
        container.innerHTML = '<div class="activity-items"></div>';
    }

    const itemsContainer = container.querySelector('.activity-items');
    const activities = data ? data.activities : [];

    if (activities.length === 0 && !append) {
        itemsContainer.innerHTML = '<p>No recent activity.</p>';
        return;
    }

    const activityHtml = activities.map(activity => {
        const icon = activity.activity_type === 'test' ? 'fa-vial' : 'fa-clipboard-check';
        return `
        <div class="alert-item">
            <div class="alert-severity low"><i class="fas ${icon}"></i></div>
            <div>
                <strong>${activity.activity_type === 'test' ? 'Test' : 'Compliance'}:</strong> ${activity.description}
                <br>
                <small>Status: ${activity.status} - ${new Date(activity.created_at).toLocaleString()}</small>
            </div>
        </div>`;
    }).join('');
    
    itemsContainer.insertAdjacentHTML('beforeend', activityHtml);

    // Handle the "Load More" button
    let buttonContainer = container.querySelector('.load-more-container');
    if (buttonContainer) buttonContainer.remove();

    if (data && data.current_page < data.pages) {
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'text-center mt-1 load-more-container';
        buttonContainer.innerHTML = `<button data-action="load-more-activity" data-page="${data.current_page + 1}" class="btn-primary btn-sm btn-secondary">Load More</button>`;
        container.appendChild(buttonContainer);
    }
}

function renderComplianceLogs(data, append = false) {
    const logsContainer = document.getElementById('complianceLogs');
    if (!logsContainer) return;

    // On initial load or filter, set up the structure
    if (!append) {
        logsContainer.innerHTML = `
            <div class="log-items-header d-flex align-center gap-1">
                <input type="checkbox" id="selectAllLogs" title="Select all visible logs">
                <label for="selectAllLogs" style="margin:0; cursor:pointer;">Select All Visible</label>
            </div>
            <div class="log-items scrollable-y-300"></div>
        `;
        updateBulkActionUI(); // Hide bulk actions on reload
    }

    const itemsContainer = logsContainer.querySelector('.log-items');
    const headerContainer = logsContainer.querySelector('.log-items-header');
    const logs = data.logs || [];
    totalLogsCount = data.total || 0;
    
    // Reset selection state on new data load (unless appending)
    if (!append) {
        selectAllMatching = false;
    }

    if (logs.length === 0 && !append) {
        itemsContainer.innerHTML = '<p>No compliance logs to display.</p>';
        if (headerContainer) headerContainer.style.display = 'none';
        return;
    } else if (headerContainer) {
        // Re-inject banner HTML if missing (it might be missing if we just created the header)
        if (!headerContainer.querySelector('.select-all-banner')) {
             const checkboxContainer = headerContainer.firstElementChild;
             checkboxContainer.insertAdjacentHTML('afterend', `
                <div id="selectAllBanner" class="select-all-banner" style="display:none; margin-left: 1rem; font-size: 0.9rem;">
                    All <span id="visibleCount"></span> logs on this page are selected. 
                    <a href="#" id="btnSelectAllMatching">Select all <span id="totalCount"></span> logs</a>
                </div>
                <div id="allSelectedBanner" class="select-all-banner" style="display:none; margin-left: 1rem; font-size: 0.9rem;">
                    All <span id="totalCountSelected"></span> logs are selected.
                    <a href="#" id="btnClearSelection">Clear selection</a>
                </div>
             `);
        }
        headerContainer.style.display = 'flex';
    }

    const logsHtml = logs.map(log => `
        <div class="alert-item">
            <input type="checkbox" class="log-checkbox" data-log-id="${log.id}" style="margin-right: 1rem; align-self: center;">
            <div class="alert-severity low">
                <i class="fas fa-clipboard-list"></i>
            </div>
            <div>
                <strong>${log.action}</strong> on ${log.resource}
                <br>
                <small>${new Date(log.timestamp).toLocaleString()} - ID: ${log.id}</small>
            </div>
        </div>
    `).join('');

    itemsContainer.insertAdjacentHTML('beforeend', logsHtml);

    if (append) {
        const selectAllCheckbox = logsContainer.querySelector('#selectAllLogs');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        updateSelectAllBannerUI(); // Ensure banners are hidden/updated
    }

    // Handle the "Load More" button
    let buttonContainer = logsContainer.querySelector('.load-more-container');
    if (buttonContainer) buttonContainer.remove();

    if (data.current_page < data.pages) {
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'text-center mt-1 load-more-container';
        buttonContainer.innerHTML = `<button data-action="load-more-logs" data-page="${data.current_page + 1}" class="btn-primary btn-sm btn-secondary">Load More</button>`;
        logsContainer.appendChild(buttonContainer);
    }
}

function displayTestResults(results, testId, logs = []) {
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(results.results, null, 2));
    const reportName = `redteam_report_${new Date().toISOString().slice(0,10)}.json`;
    
    // Calculate stats for chart
    const total = results.results.tests_conducted;
    
    let failed = 0;
    let failedLabel = 'Failed Tests';

    if (results.results.successful_bypasses !== undefined) {
        failed = results.results.successful_bypasses;
        failedLabel = 'Successful Bypasses';
    } else if (results.results.successful_injections !== undefined) {
        failed = results.results.successful_injections;
        failedLabel = 'Successful Injections';
    } else if (results.results.successful_frauds !== undefined) {
        failed = results.results.successful_frauds;
        failedLabel = 'Successful Frauds';
    }

    const passed = total - failed;
    
    const resultsHtml = `
        <div class="card">
            <div class="d-flex justify-between align-center mb-1">
                <h3 class="h2-no-margin">Test Results</h3>
                <div class="d-flex gap-1">
                    <button data-action="copy-results" class="btn-primary btn-sm btn-secondary"><i class="fas fa-copy"></i> Copy</button>
                    <a href="${dataUri}" download="${reportName}" class="btn-primary btn-sm"><i class="fas fa-download"></i> Download JSON</a>
                    ${testId ? `<button data-action="download-test-pdf" data-test-id="${testId}" class="btn-primary btn-sm">
                        <i class="fas fa-file-pdf"></i> Download PDF
                    </button>` : ''}
                    ${testId ? `<button data-action="retry-test" data-test-id="${testId}" class="btn-primary btn-sm btn-secondary">
                        <i class="fas fa-redo"></i> Retry
                    </button>` : ''}
                </div>
            </div>
            
            <div class="results-grid">
                <div>
                    <p><strong>Attack Type:</strong> ${results.results.attack_type}</p>
                    <p><strong>Tests Conducted:</strong> ${total}</p>
                    <p><strong>${failedLabel}:</strong> ${failed}</p>
                    <p><strong>Risk Level:</strong> <span class="badge ${results.results.risk_level}">${results.results.risk_level}</span></p>
                    <p><strong>Overall Score:</strong> ${(results.results.overall_score * 100).toFixed(1)}%</p>
                </div>
                <div class="chart-container results-chart-container">
                    <canvas id="resultsChart"></canvas>
                </div>
            </div>

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

            ${logs && logs.length > 0 ? `
                <div class="history-list">
                    <h3 class="h2-no-margin mb-1">Activity History</h3>
                    ${logs.map(log => {
                        let details = '';
                        if (log.action === 'VULN_STATUS_CHANGE' && log.details) {
                            const d = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                            details = `<div class="mt-1" style="padding-left: 1rem; border-left: 2px solid var(--border-color);"><small>Changed <em>${d.vulnerability}</em> from <strong>${d.old_status}</strong> to <strong>${d.new_status}</strong></small></div>`;
                        }
                        return `
                        <div class="history-item">
                            <div class="d-flex justify-between">
                                <strong>${log.action.replace(/_/g, ' ')}</strong>
                                <small style="color: var(--secondary-color);">${new Date(log.timestamp).toLocaleString()}</small>
                            </div>
                            ${details}
                        </div>`;
                    }).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    const container = document.getElementById('testResultsArea');
    if (!container) return;

    container.innerHTML = resultsHtml;
    container.scrollIntoView({ behavior: 'smooth' });

    // Initialize Chart
    if (typeof Chart !== 'undefined') {
        const ctx = document.getElementById('resultsChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Blocked', 'Bypassed'],
                datasets: [{
                    data: [passed, failed],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    // Store results for copy function
    window.lastTestResults = results.results;
}

function copyResultsToClipboard() {
    if (window.lastTestResults) {
        const text = JSON.stringify(window.lastTestResults, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            alert('Results copied to clipboard!');
        }).catch(err => console.error('Failed to copy:', err));
    }
}

async function downloadTestPdf(testId) {
    if (!authToken) return;
    
    const btn = document.querySelector(`button[data-action="download-test-pdf"][data-test-id="${testId}"]`);
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    try {
        const blob = await apiFetch(`/redteam/test/${testId}/export/pdf`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redteam_test_${testId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('PDF download failed:', error);
        alert('Failed to download PDF report.');
    } finally {
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}


async function downloadComplianceReport() {
    if (!authToken) return;
    
    const btn = document.querySelector('button[data-action="download-report"]');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;

    try {
        const blob = await apiFetch('/reports/compliance/pdf', {
            responseType: 'blob'
        });

        if (!blob) throw new Error('Failed to generate report blob');

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance_report_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download report. Please try again.');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

async function emailComplianceReport() {
    if (!authToken) return;
    
    const btn = document.querySelector('button[data-action="email-report"]');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const response = await apiFetch('/reports/compliance/email', {
            method: 'POST'
        });
        alert(response.message);
    } catch (error) {
        console.error('Email failed:', error);
        alert('Failed to email report: ' + error.message);
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

async function displayVirtualApprentice(sessionId) {
    try {
        const apprentice = await apiFetch(`/knowledge/virtual-apprentice/${sessionId}`);
        if (!apprentice) return;

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
        
        const container = document.getElementById('apprenticeContent');
        if (container) {
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading apprentice:', error);
    }
}

async function resolveAlert(alertId) {
    try {
        await apiFetch(`/monitoring/alerts/${alertId}/resolve`, { method: 'POST' });
        await loadMonitoringData();
    } catch (error) {
        console.error('Error resolving alert:', error);
        alert('Failed to resolve alert');
    }
}



async function resolveAllAlerts() {
    if (!confirm('Are you sure you want to resolve all active alerts?')) return;
    
    try {
        await apiFetch('/monitoring/alerts/resolve-all', { method: 'POST' });
        await loadMonitoringData();
    } catch (error) {
        console.error('Error resolving all alerts:', error);
        alert('Failed to resolve alerts');
    }
}

// UI Functions
function checkAuth() {
    if (authToken) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            updateUIForAuth();
        } else {
            // Token exists but user data is missing/corrupted
            logout();
        }
    }
}

function updateUIForAuth() {
    const navUser = document.getElementById('navUser');
    const themeIcon = currentTheme === 'dark' ? 'fa-sun' : 'fa-moon';
    const themeBtn = `<button class="btn-icon" data-action="toggle-theme" title="Toggle Dark Mode"><i class="fas ${themeIcon}"></i></button>`;
    
    if (currentUser) {
        navUser.innerHTML = `
            ${themeBtn}
            <span class="user-info">Welcome, ${currentUser.username}</span>
            <button class="btn-primary btn-profile" data-action="navigate" data-page="profile">Profile</button>
            <button class="btn-logout" data-action="logout">Logout</button>
        `;
    } else {
        navUser.innerHTML = `
            ${themeBtn}
            <button class="btn-login" data-action="open-modal" data-modal-id="loginModal">Login</button>
            <button class="btn-signup" data-action="open-modal" data-modal-id="signupModal">Sign Up</button>
        `;
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastPage');
    updateUIForAuth();
    navigateTo('dashboard');
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

function showLoginPrompt(container, message) {
    const loginMsg = document.createElement('div');
    loginMsg.className = 'card';
    loginMsg.classList.add('mt-2');
    loginMsg.innerHTML = `<p>Please <a href="#" data-action="open-modal" data-modal-id="loginModal">login</a> to ${message}</p>`;
    container.appendChild(loginMsg);
}

function setCopyright() {
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

function initTheme() {
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    injectGlobalStyles();
    injectDarkModeStyles();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    document.body.classList.toggle('dark-mode');
    
    // Update icon
    const btnIcon = document.querySelector('[data-action="toggle-theme"] i');
    if (btnIcon) {
        btnIcon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function injectGlobalStyles() {
    const styleId = 'global-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .back-to-top {
            display: none;
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 100;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 20px;
            cursor: pointer;
            transition: opacity 0.3s;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .back-to-top:hover {
            opacity: 0.8;
        }
        .d-flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .align-center { align-items: center; }
        .gap-1 { gap: 0.5rem; }
        .mb-1 { margin-bottom: 1rem; }
        .mt-2 { margin-top: 2rem; }
        .h2-no-margin { margin-bottom: 0; }
        .flex-1 { flex: 1; }

        .text-center { text-align: center; }
        .mt-1 { margin-top: 1rem; }
        .chart-container { height: 300px; position: relative; }
        .scrollable-y-300 { max-height: 300px; overflow-y: auto; }
        .log-items-header {
            padding: 0.5rem;
            border-bottom: 1px solid var(--border-color);
            background-color: var(--background-color);
        }
        .select-all-banner a {
            color: var(--primary-color);
            font-weight: bold;
        }
        .filter-divider {
            color: var(--border-color);
            margin: 0 0.2rem;
            font-size: 1.2rem;
        }
        .saved-filter-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0.5rem;
            border-bottom: 1px solid var(--border-color);
        }
        .saved-filter-item:last-child {
            border-bottom: none;
        }
        .history-list {
            margin-top: 2rem;
            border-top: 1px solid var(--border-color);
            padding-top: 1rem;
        }
        .history-item { padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
        .history-item:last-child { border-bottom: none; }
        .scheduled-test-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); }
        .scheduled-test-item:last-child { border-bottom: none; }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
        input:checked + .slider { background-color: var(--primary-color); }
        input:checked + .slider:before { transform: translateX(20px); }
        .slider.round { border-radius: 24px; }
        .slider.round:before { border-radius: 50%; }
        .results-chart-container { height: 200px; }
        .grid-col-span-full { grid-column: 1 / -1; }

        .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.9rem; }
        .btn-xs { padding: 0.3rem 0.8rem; font-size: 0.8rem; }
        .btn-secondary { background-color: var(--secondary-color); }
        .btn-secondary:hover { background-color: #718096; }
        .btn-danger { background-color: #ef4444; border-color: #ef4444; }
        .btn-profile { padding: 0.6rem 1.2rem; font-size: 0.9rem; }
        .btn-icon { margin-right: 1rem; background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2rem; }

        .undo-toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: white;
            padding: 1rem 2rem;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 1rem;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .btn-link {
            background: none;
            border: none;
            color: #60a5fa;
            cursor: pointer;
            text-decoration: underline;
            font-weight: bold;
            padding: 0;
            font-size: 1rem;
        }

        a.btn-primary, a.btn-primary:visited {
            text-decoration: none;
            color: white;
        }

        .login-forgot-link-container {
            margin-top: 1rem;
            text-align: center;
        }
        .forgot-password-link {
            color: var(--primary-color);
            text-decoration: none;
            font-size: 0.9rem;
        }
        .modal-description { margin-bottom: 1rem; color: var(--secondary-color); }

        .profile-container { max-width: 600px; margin: 0 auto; }
        .hr-divider { margin: 2rem 0; border: 0; border-top: 1px solid var(--border-color); }

        .input-disabled {
            background-color: var(--background-color);
            opacity: 0.7;
            cursor: not-allowed;
        }

        .system-status-number { font-size: 1.2rem; }
        .status-online { color: #10b981; }
        .status-offline { color: #ef4444; }
        .alert-resolved { opacity: 0.6; }
        .results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }

        @media (max-width: 768px) {
            .results-grid {
                grid-template-columns: 1fr;
            }
            .results-chart-container {
                order: -1;
            }
        }
    `;
    document.head.appendChild(style);
}

function handleScroll() {
    const backToTopButton = document.querySelector('.back-to-top');
    if (backToTopButton) {
        if (window.scrollY > 300) {
            backToTopButton.style.display = 'flex';
        } else {
            backToTopButton.style.display = 'none';
        }
    }
}

function injectDarkModeStyles() {
    const styleId = 'dark-mode-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        body.dark-mode {
            --primary-color: #60a5fa;
            --secondary-color: #94a3b8;
            --background-color: #0f172a;
            --card-background: #1e293b;
            --text-color: #f1f5f9;
            --border-color: #334155;
        }
        body.dark-mode .card, 
        body.dark-mode .stats-card, 
        body.dark-mode .modal-content,
        body.dark-mode input, 
        body.dark-mode select {
            background-color: var(--card-background);
            color: var(--text-color);
            border-color: var(--border-color);
        }
        body.dark-mode .nav-bar {
            background-color: #1e293b;
            border-bottom: 1px solid #334155;
        }
        body.dark-mode .alert-item {
            background-color: #334155;
        }
        body.dark-mode .log-items-header {
            background-color: var(--card-background);
        }
        body.dark-mode .saved-filter-item {
            border-color: #475569;
        }
        body.dark-mode .slider { background-color: #475569; }
    body.dark-mode .log-items-header {
            background-color: var(--card-background);
        body.dark-mode .scheduled-test-item { border-color: #475569; }
        body.dark-mode .nav-link {
            color: #cbd5e1;
        }
        body.dark-mode .nav-link:hover,
        body.dark-mode .nav-link.active {
            color: #60a5fa;
            background-color: rgba(96, 165, 250, 0.1);
        }
        body.dark-mode .btn-primary { background-color: #3b82f6; }
        body.dark-mode .btn-primary:hover { background-color: #2563eb; }
        body.dark-mode .btn-danger { background-color: #dc2626; border-color: #dc2626; }
    `;
    document.head.appendChild(style);
}

function getChartColor(index) {
    const colors = ['#4a90e2', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e'];
    return colors[index % colors.length];
}

function exportChartImage(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

async function exportChartDataCsv() {
    try {
        const data = await apiFetch('/dashboard/chart-data');
        
        // Convert to CSV
        const headers = ['Date', 'Security Tests', 'Alerts'];
        const rows = data.labels.map((label, index) => [
            label,
            data.tests[index],
            data.alerts[index]
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `security_events_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export data.');
    }

}   } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export data.');
    }

}   } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export data.');
    }

}   } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export data.');
    }

}   } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export data.');
    }

}   } catch (error) {
        console.error('Failed to export CSV:', error);
        alert('Failed to export data.');
    }

}