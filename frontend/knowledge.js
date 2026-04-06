import { apiFetch, AuthError } from './api.js';
import * as ui from './ui.js';

export async function loadKnowledgeTransfer(currentUser) {
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
        ui.showLoginPrompt(document.getElementById('mainContent'), 'access expert features');
        document.getElementById('expertSessionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            ui.openModal('loginModal');
        });
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

        await displayVirtualApprentice(data.session.id);

    } catch (error) {
        if (error instanceof AuthError) throw error;
        console.error(error);
        alert('Error creating expert session: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function displayVirtualApprentice(sessionId) {
    const apprentice = await apiFetch(`/knowledge/virtual-apprentice/${sessionId}`);
    if (!apprentice) return;

    const html = `
        <h3>Virtual Apprentice Ready</h3>
        <p>Capabilities:</p>
        <ul>${apprentice.capabilities.map(cap => `<li>${cap}</li>`).join('')}</ul>
        <h4>Practice Question:</h4>
        ${apprentice.current_questions.map(q => `<div class="card"><p><strong>Q:</strong> ${q.question}</p><p><strong>Hint:</strong> ${q.hint}</p><p><strong>Expert Answer:</strong> ${q.expert_answer}</p></div>`).join('')}`;
    
    const container = document.getElementById('apprenticeContent');
    if (container) container.innerHTML = html;
}