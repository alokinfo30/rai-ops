// State management
import { apiFetch, AuthError } from './api.js';
import * as ui from './ui.js';
import { initDashboard } from './dashboard.js';
import * as redteam from './redteam.js';
import * as monitoring from './monitoring.js';
import * as knowledge from './knowledge.js';
import * as auth from './auth.js';
import * as reports from './reports.js';

let currentUser = null;
let currentPage = 'dashboard';
let authToken = localStorage.getItem('token');
let refreshToken = localStorage.getItem('refreshToken');
let currentTheme = localStorage.getItem('theme') || 'light';
let itemsPerPage = parseInt(localStorage.getItem('itemsPerPage'), 10) || 10;
let pageCleanup = null;
// Sanitize token if it got corrupted
if (authToken === 'null' || authToken === 'undefined') {
    authToken = null;
    localStorage.removeItem('token');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    checkAuth();
    initTheme();
    const lastPage = localStorage.getItem('lastPage') || 'dashboard';
    updateNotificationCount();
    setInterval(updateNotificationCount, 60000);
    navigateTo(lastPage);
    ui.setCopyright();
});

function initEventListeners() {
    ui.injectModals();
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
                ui.toggleMobileMenu();
                break;
            case 'open-modal':
                e.preventDefault();
                const modalId = actionTarget.dataset.modalId;
                if (modalId) ui.openModal(modalId);
                break;
            case 'logout':
                logout();
                break;
            case 'close-modal':
                ui.closeAllModals();
                break;
            case 'resolve-alert':
                const alertId = actionTarget.dataset.id;
                if (alertId) monitoring.resolveAlert(parseInt(alertId, 10));
                break;
            case 'resolve-all-alerts':
                monitoring.resolveAllAlerts();
                break;
            case 'copy-results':
                copyResultsToClipboard();
                break;
            case 'refresh-monitoring':
                monitoring.loadMonitoringData(true); // Generate new data on refresh
                break;
            case 'download-report':
                reports.downloadComplianceReport();
                break;
            case 'email-report':
                reports.emailComplianceReport();
                break;
            case 'toggle-theme':
                handleToggleTheme();
                break;
            case 'view-test-details':
                const testId = actionTarget.dataset.id;
                if (testId) viewTestDetails(testId);
                break;
            case 'back-to-top':
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'load-more-logs':
                const nextPage = actionTarget.dataset.page;
                if (nextPage) monitoring.fetchAndRenderLogs(true, parseInt(nextPage, 10));
                break;
            case 'export-logs-csv':
                monitoring.exportComplianceLogsCsv();
                break;
            case 'save-log-filter':
                monitoring.handleSaveFilter();
                break;
            case 'manage-log-filters':
                monitoring.handleDeleteSavedFilter();
                break;
            case 'bulk-delete-logs':
                monitoring.handleBulkDeleteLogs();
                break;
            case 'download-test-pdf':
                const pdfTestId = actionTarget.dataset.testId;
                if (pdfTestId) downloadTestPdf(pdfTestId);
                break;
            case 'retry-test':
                const retryTestId = actionTarget.dataset.testId;
                if (retryTestId) handleRetryTest(retryTestId);
                break;
            case 'delete-schedule':
                const scheduleId = actionTarget.dataset.id;
                if (scheduleId) handleDeleteSchedule(scheduleId);
                break;
            case 'toggle-compare':
                // This action comes from the checkbox
                redteam.handleCompareCheck(actionTarget);
                break;
            case 'run-comparison':
                redteam.runComparison();
                break;
        }
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            ui.closeAllModals();
        }
    });

    // Scroll listener for back-to-top button
    window.addEventListener('scroll', ui.handleScroll);
    
    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', (e) => auth.handleLogin(e, onLoginSuccess));
    document.getElementById('signupForm').addEventListener('submit', auth.handleSignup);
    document.getElementById('forgotPasswordForm').addEventListener('submit', auth.handleForgotPassword);
    document.getElementById('resetPasswordForm').addEventListener('submit', auth.handleResetPassword);
    document.getElementById('saveFilterForm').addEventListener('submit', monitoring.handleSaveFilterSubmit);

    document.getElementById('notificationsModal').addEventListener('show.bs.modal', function (event) {
        loadNotifications();
    });
}

function onLoginSuccess(user) {
    authToken = localStorage.getItem('token');
    refreshToken = localStorage.getItem('refreshToken');
    currentUser = user;
    ui.updateUIForAuth(currentUser, currentTheme);
    navigateTo('dashboard');
}

async function navigateTo(page) {
    if (monitoring.logState.deleteTimeout) {
        clearTimeout(monitoring.logState.deleteTimeout);
        await monitoring.executePendingDelete();
    }
    if (pageCleanup) {
        pageCleanup();
        pageCleanup = null;
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
    
    // Show loading spinner
    mainContent.innerHTML = '<div class="spinner"></div>';
    
    try {
        switch(page) {
            case 'dashboard':
                pageCleanup = await initDashboard(mainContent, currentUser);
                break;
            case 'redteaming':
                await redteam.loadRedTeaming(currentUser);
                break;
            case 'monitoring':
                await monitoring.loadMonitoring(currentUser);
                break;
            case 'knowledge':
                await knowledge.loadKnowledgeTransfer(currentUser);
                break;
            case 'profile':
                if (!currentUser) {
                    navigateTo('dashboard');
                } else {
                    auth.loadProfile(
                        currentUser, 
                        itemsPerPage, 
                        (e) => auth.handleProfileUpdate(e, (updatedUser, newItemsPerPage) => {
                            currentUser = updatedUser;
                            itemsPerPage = newItemsPerPage;
                            redteam.setItemsPerPage(itemsPerPage);
                            ui.updateUIForAuth(currentUser, currentTheme);
                            alert('Profile updated successfully');
                        }).catch(err => { if (err instanceof AuthError) logout(); }),
                        () => auth.handleDeleteAccount(() => logout())
                    );
                }
                break;
            case 'reports':
                await reports.loadReports(currentUser);
                break;
        }
    } catch (error) {
        if (error instanceof AuthError) {
            logout();
            return;
        }
        mainContent.innerHTML = `<div class="error">Error loading page: ${error.message}</div>`;
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
        
        redteam.displayTestResults({ results: test.results }, testId, logsData.logs);
    } catch (error) {
        if (error instanceof AuthError) {
            logout();
            return;
        }
        console.error('Error fetching test details:', error);
        alert('Failed to load test details.');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
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
        await redteam.downloadTestPdf(testId);
    } catch (error) {
        if (error instanceof AuthError) {
            logout();
        }
    } finally {
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}

// UI Functions
function checkAuth() {
    if (authToken) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            ui.updateUIForAuth(currentUser, currentTheme);
        } else {
            // Token exists but user data is missing/corrupted
            logout();
        }
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
    ui.updateUIForAuth(currentUser, currentTheme);
    navigateTo('dashboard');
}

function initTheme() {
    ui.applyTheme(currentTheme);
}

function handleToggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    ui.applyTheme(currentTheme);
}