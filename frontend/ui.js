/**
 * UI Helper Library
 * Handles styling, modals, and common UI elements.
 */

export function injectModals() {
    const modalsHtml = `
    <div id="loginModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" data-action="close-modal">&times;</span>
            <h2 class="mb-2">Login to RAI Ops</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="username" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" required>
                </div>
                <button type="submit" class="btn-primary" style="width:100%">Login</button>
                <p class="mt-1 text-center">
                    <a href="#" onclick="ui.closeAllModals(); ui.openModal('signupModal'); return false;">Create Account</a> | 
                    <a href="#" onclick="ui.closeAllModals(); ui.openModal('forgotPasswordModal'); return false;">Forgot Password?</a>
                </p>
            </form>
        </div>
    </div>

    <div id="signupModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" data-action="close-modal">&times;</span>
            <h2 class="mb-2">Create Account</h2>
            <form id="signupForm">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="signupUsername" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="signupEmail" required>
                </div>
                <div class="form-group">
                    <label>Company</label>
                    <input type="text" id="signupCompany">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="signupPassword" required minlength="8">
                </div>
                <button type="submit" class="btn-primary" style="width:100%">Register</button>
                <p class="mt-1 text-center">
                    <a href="#" onclick="ui.closeAllModals(); ui.openModal('loginModal'); return false;">Already have an account?</a>
                </p>
            </form>
        </div>
    </div>

    <div id="forgotPasswordModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" data-action="close-modal">&times;</span>
            <h2 class="mb-2">Reset Password</h2>
            <form id="forgotPasswordForm">
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="forgotEmail" required>
                </div>
                <button type="submit" class="btn-primary" style="width:100%">Send Reset Link</button>
            </form>
        </div>
    </div>

    <div id="resetPasswordModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" data-action="close-modal">&times;</span>
            <h2 class="mb-2">Set New Password</h2>
            <form id="resetPasswordForm">
                <input type="hidden" id="resetToken">
                <div class="form-group">
                    <label>New Password</label>
                    <input type="password" id="newResetPassword" required minlength="8">
                </div>
                <button type="submit" class="btn-primary" style="width:100%">Change Password</button>
            </form>
        </div>
    </div>

    <div id="saveFilterModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" data-action="close-modal">&times;</span>
            <h2 class="mb-2">Save Filter Set</h2>
            <form id="saveFilterForm">
                <div class="form-group">
                    <label>Filter Name</label>
                    <input type="text" id="filterNameInput" required placeholder="e.g., Critical Errors Last Week">
                </div>
                <button type="submit" class="btn-primary" style="width:100%">Save Filter</button>
            </form>
        </div>
    </div>

    <div id="manageFiltersModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" data-action="close-modal">&times;</span>
            <h2 class="mb-2">Manage Filters</h2>
            <div id="savedFiltersList" style="max-height: 300px; overflow-y: auto;">
                <!-- Populated dynamically -->
            </div>
        </div>
    </div>

    <div id="notificationsModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" data-action="close-modal">&times;</span>
            <h2 class="mb-2">Notifications</h2>
            <div id="notificationsList" style="max-height: 400px; overflow-y: auto;">
                <p>Loading...</p>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalsHtml);
    
    // Export helper to window for inline onclick handlers in modals
    window.ui = { closeAllModals, openModal };
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        closeAllModals(); // Close others first
        modal.classList.add('show');
    }
}

export function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
}

export function toggleMobileMenu() {
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.toggle('active');
}

export function handleScroll() {
    const btn = document.getElementById('backToTopBtn');
    if (window.scrollY > 300) {
        if (!btn) {
            const newBtn = document.createElement('button');
            newBtn.id = 'backToTopBtn';
            newBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            newBtn.className = 'btn-primary';
            newBtn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; z-index: 999;';
            newBtn.setAttribute('data-action', 'back-to-top');
            document.body.appendChild(newBtn);
        } else {
            btn.style.display = 'flex';
        }
    } else if (btn) {
        btn.style.display = 'none';
    }
}

export function updateUIForAuth(user, theme) {
    const authItems = document.querySelectorAll('.auth-only');
    const guestItems = document.querySelectorAll('.guest-only');
    
    // Update Nav
    const navMenu = document.getElementById('navMenu');
    const existingLogout = navMenu.querySelector('[data-action="logout"]');
    const existingLogin = navMenu.querySelector('[data-action="open-modal"]');

    if (user) {
        if (!existingLogout) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.innerHTML = `<a href="#" class="nav-link" data-action="logout"><i class="fas fa-sign-out-alt"></i> Logout</a>`;
            navMenu.appendChild(li);
        }
        if (existingLogin) existingLogin.closest('li').remove();
    } else {
        if (!existingLogin) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.innerHTML = `<a href="#" class="nav-link" data-action="open-modal" data-modal-id="loginModal"><i class="fas fa-sign-in-alt"></i> Login</a>`;
            navMenu.appendChild(li);
        }
        if (existingLogout) existingLogout.closest('li').remove();
    }
}

export function showLoginPrompt(container, featureName) {
    container.innerHTML = `
        <div class="card text-center" style="padding: 3rem;">
            <i class="fas fa-lock" style="font-size: 3rem; color: var(--secondary-color); margin-bottom: 1rem;"></i>
            <h2>Authentication Required</h2>
            <p class="mb-2">Please login to ${featureName}.</p>
            <button class="btn-primary" data-action="open-modal" data-modal-id="loginModal">Login / Register</button>
        </div>
    `;
}

export function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

export function setCopyright() {
    const footer = document.createElement('footer');
    footer.className = 'text-center mt-2 mb-2';
    footer.style.color = 'var(--secondary-color)';
    footer.innerHTML = `<small>&copy; ${new Date().getFullYear()} RAI Ops Platform. Open Source AI Governance.</small>`;
    document.body.appendChild(footer);
}

export function showUndoToast(count, callback) {
    // Remove existing toast
    const existing = document.getElementById('undoToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'undoToast';
    toast.className = 'toast';
    toast.innerHTML = `
        <span>${count} item(s) deleted</span>
        <button class="btn-primary btn-sm btn-secondary" id="btnUndo">Undo</button>
    `;
    document.body.appendChild(toast);

    document.getElementById('btnUndo').onclick = () => {
        callback();
        toast.remove();
    };

    // Auto dismiss
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.remove();
        }
    }, 5000);
}

export function getChartColor(index) {
    const colors = [
        '#4a90e2', '#50c878', '#e74c3c', '#f39c12', '#9b59b6', 
        '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad'
    ];
    return colors[index % colors.length];
}

export function exportChartImage(chartId, filename) {
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } else {
        alert('Chart not found');
    }
}