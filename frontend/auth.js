// Authentication Module
import { apiFetch, AuthError } from './api.js';
import * as ui from './ui.js';

export async function handleLogin(e, onSuccess) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('refreshToken', response.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        if (onSuccess) onSuccess(response.user);
    } catch (error) {
        if (error instanceof AuthError) {
            throw error;
        }
        alert('Login failed: ' + error.message);
    }
}

export async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        alert('Registration successful! Please log in.');
        // Switch to login form
        document.querySelector('.auth-tabs button[data-tab="login"]').click();
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

export async function handleForgotPassword(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        await apiFetch('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        alert('If an account exists, a reset link has been sent to your email.');
    } catch (error) {
        alert('Password reset failed: ' + error.message);
    }
}

export async function handleResetPassword(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        await apiFetch('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        alert('Password reset successful! Please log in.');
        // Switch to login form
        document.querySelector('.auth-tabs button[data-tab="login"]').click();
    } catch (error) {
        alert('Password reset failed: ' + error.message);
    }
}

export function loadProfile(user, itemsPerPage, onUpdate, onDelete) {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-user-circle"></i> Profile</h1>
        </div>
        <div class="content-area">
            <div class="card">
                <div class="card-body">
                    <h3>Welcome, ${user.username}!</h3>
                    <p>Email: ${user.email}</p>
                    <p>Company: ${user.company || 'Not specified'}</p>
                    <div class="mt-3">
                        <button class="btn btn-primary" onclick="auth.handleUpdateProfile()">
                            Update Profile
                        </button>
                        <button class="btn btn-danger ms-2" onclick="auth.handleDeleteAccount()">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export async function handleProfileUpdate(e, onSuccess) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await apiFetch('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        localStorage.setItem('user', JSON.stringify(response.user));
        onSuccess(response.user, data.itemsPerPage || 10);
    } catch (error) {
        if (error instanceof AuthError) {
            throw error;
        }
        alert('Profile update failed: ' + error.message);
    }
}

export async function handleDeleteAccount(onSuccess) {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
    }
    
    try {
        await apiFetch('/api/auth/profile', {
            method: 'DELETE'
        });
        
        alert('Account deleted successfully.');
        onSuccess();
    } catch (error) {
        if (error instanceof AuthError) {
            throw error;
        }
        alert('Account deletion failed: ' + error.message);
    }
}

export function handleUpdateProfile() {
    alert('Profile update functionality coming soon...');
}