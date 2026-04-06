import { apiFetch, AuthError } from './api.js';
import * as ui from './ui.js';

let dashboardChartInstance = null;
let vulnerabilityChartInstance = null;
// This state is needed here now.
let itemsPerPage = parseInt(localStorage.getItem('itemsPerPage'), 10) || 10;

async function handleDashboardClick(e) {
    const actionTarget = e.target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;

    switch (action) {
        case 'export-chart-csv':
            exportChartDataCsv();
            break;
        case 'load-more-activity':
            const nextPageActivity = actionTarget.dataset.page;
            if (nextPageActivity) loadMoreActivity(parseInt(nextPageActivity, 10));
            break;
        case 'export-chart':
            const chartId = actionTarget.dataset.chartId;
            if (chartId) ui.exportChartImage(chartId, `chart_export_${new Date().toISOString().slice(0,10)}.png`);
            break;
    }
}

export async function initDashboard(container, currentUser) {
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
            <h2 class="h2-no-margin mb-1">Vulnerability Status Trend (Last 7 Days)</h2>
            <div id="vulnerabilityChartContainer" class="chart-container">
                <canvas id="vulnerabilityChartCanvas"></canvas>
            </div>
        </div>

        <div class="card mt-2">
            <h2>Recent Activity</h2>
            <div id="recentActivity">
                <p>Loading recent activity...</p>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    container.addEventListener('click', handleDashboardClick);
    
    // Fetch and update stats
    if (currentUser) {
        await updateDashboardStats();
        await loadDashboardChart();
        await loadVulnerabilityTrendChart();
        await updateSystemStatus();
    }

    // Return cleanup function
    return () => {
        container.removeEventListener('click', handleDashboardClick);
        if (dashboardChartInstance) {
            dashboardChartInstance.destroy();
            dashboardChartInstance = null;
        }
        if (vulnerabilityChartInstance) {
            vulnerabilityChartInstance.destroy();
            vulnerabilityChartInstance = null;
        }
    };
}

async function updateDashboardStats() {
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
        if (error instanceof AuthError) {
            // The main script will handle logout on the next api call
            console.error("AuthError during dashboard stat update");
        }
        console.error('Error updating dashboard:', error);
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
        if (error instanceof AuthError) { return; }
        console.error('Error loading dashboard chart:', error);
        const container = document.getElementById('dashboardChartContainer');
        if (container) container.innerHTML = '<p class="error">Could not load chart data.</p>';
    }
}

async function loadVulnerabilityTrendChart() {
    try {
        const data = await apiFetch('/dashboard/vulnerability-trend');
        
        const ctx = document.getElementById('vulnerabilityChartCanvas');
        if (!ctx) return;

        if (vulnerabilityChartInstance) {
            vulnerabilityChartInstance.destroy();
        }

        // Process data for a stacked bar chart
        const labels = [...new Set(data.map(d => d.date))].sort();
        const statuses = [...new Set(data.map(d => d.status))];
        const datasets = statuses.map((status, index) => {
            return {
                label: status,
                data: labels.map(label => {
                    const entry = data.find(d => d.date === label && d.status === status);
                    return entry ? entry.count : 0;
                }),
                backgroundColor: ui.getChartColor(index + 2), // Start with different colors
            };
        });

        vulnerabilityChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    } catch (error) {
        if (error instanceof AuthError) { return; }
        console.error('Error loading vulnerability trend chart:', error);
        const container = document.getElementById('vulnerabilityChartContainer');
        if (container) container.innerHTML = '<p class="error">Could not load vulnerability trend data.</p>';
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
        if (error instanceof AuthError) { return; }
        console.error('Error loading more activity:', error);
        if (btn) btn.parentElement.innerHTML = '<p class="error text-center">Failed to load more activity.</p>';
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
        if (error instanceof AuthError) { return; }
        console.error('Failed to export CSV:', error);
        alert('Failed to export data.');
    }
}