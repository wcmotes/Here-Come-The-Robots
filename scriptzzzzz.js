let openRouterModelsData = [];
let llmArenaModelsData = [];
let allModelsCombined = []; // To store the combined and consistently structured list

let activeFetchOperations = 0;

function showGlobalLoading() {
    activeFetchOperations++;
    const loadingDiv = document.getElementById('global-loading-message');
    if (loadingDiv) {
        loadingDiv.textContent = 'Loading model data...'; // Ensure fresh message
        loadingDiv.style.display = 'block';
    }
}

function hideGlobalLoading() {
    activeFetchOperations--;
    if (activeFetchOperations <= 0) {
        const loadingDiv = document.getElementById('global-loading-message');
        if (loadingDiv) loadingDiv.style.display = 'none';
        activeFetchOperations = 0; // Reset in case it goes negative
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("AI/LLM Release Tracker script loaded.");

    const notificationForm = document.getElementById('notification-form');
    if (notificationForm) {
        notificationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const betaNotifications = document.getElementById('beta-notifications').checked;

            console.log("Notification Settings Saved (Placeholder):");
            console.log("Email:", email);
            console.log("Phone:", phone);
            console.log("Beta Notifications:", betaNotifications);

            const submitButton = notificationForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Saving...';
            submitButton.disabled = true;

            setTimeout(() => {
                localStorage.setItem('notificationEmail', email);
                localStorage.setItem('notificationPhone', phone);
                localStorage.setItem('notifyForBeta', betaNotifications.toString());

                submitButton.textContent = 'Settings Saved!';
                console.log("Notification settings saved to localStorage.");

                setTimeout(() => {
                    submitButton.textContent = originalButtonText;
                    submitButton.disabled = false;
                }, 2000);

                let infoMessage = document.getElementById('notification-info');
                if (!infoMessage) {
                    infoMessage = document.createElement('p');
                    infoMessage.id = 'notification-info';
                    infoMessage.style.marginTop = '10px';
                    infoMessage.style.fontSize = '0.9em';
                    notificationForm.appendChild(infoMessage);
                }
                infoMessage.innerHTML = `Settings are saved in your browser. <strong>Actual email/SMS notifications require a backend server to process and send them.</strong> This part is a conceptual demonstration.`;
            }, 500);
        });
    }

    const savedEmail = localStorage.getItem('notificationEmail');
    const savedPhone = localStorage.getItem('notificationPhone');
    const savedBetaNotify = localStorage.getItem('notifyForBeta');

    if (savedEmail) document.getElementById('email').value = savedEmail;
    if (savedPhone) document.getElementById('phone').value = savedPhone;
    if (savedBetaNotify !== null) document.getElementById('beta-notifications').checked = (savedBetaNotify === 'true');

    const sortDropdown = document.getElementById('sort-models');
    
    // Load saved sort preference
    const savedSortPreference = localStorage.getItem('sortPreference');
    if (savedSortPreference) {
        sortDropdown.value = savedSortPreference;
    }

    sortDropdown.addEventListener('change', () => {
        localStorage.setItem('sortPreference', sortDropdown.value);
        renderAllModels();
    });

    fetchAllDataAndRender(); // This will now use the loaded (or default) sort preference
});

async function fetchAllDataAndRender() {
    const globalLoadingDiv = document.getElementById('global-loading-message');
    const modelListContainer = document.querySelector('#model-listings .model-list-container');

    if(modelListContainer) modelListContainer.innerHTML = ''; // Clear models before showing loading
    showGlobalLoading(); // For OpenRouter fetch
    showGlobalLoading(); // For LLM Arena fetch

    try {
        await Promise.all([
            fetchOpenRouterModels(),
            fetchLlmArenaModels()
        ]);
    } catch (error) {
        console.error("Error during initial data fetching wrapper:", error);
        if (globalLoadingDiv) globalLoadingDiv.textContent = 'Failed to load all model data.';
    } finally {
        combineAndNormalizeData();
        renderAllModels(); // Initial render after fetching
        // hideGlobalLoading is handled by individual fetch functions
        // If all fetches completed, loading will be hidden.
        // If some are still pending (should not happen with Promise.all), it might stay.
        // Force hide if counter is 0 but message visible (edge case)
        if (activeFetchOperations === 0 && globalLoadingDiv && globalLoadingDiv.style.display !== 'none') {
            hideGlobalLoading();
        }
    }
}

function combineAndNormalizeData() {
    allModelsCombined = [];

    openRouterModelsData.forEach(model => {
        allModelsCombined.push({
            id: `or-${model.id}`,
            name: model.name || model.id,
            source: model.id.split('/')[0] || 'OpenRouter',
            sourceType: 'OpenRouter',
            description: model.description || 'No detailed description provided.',
            score: model.stats?.rating_elo, // This field is often null or not present for all OpenRouter models
            date: model.created_at ? new Date(model.created_at * 1000) : new Date(0),
            version: model.architecture?.model_version || model.id.split('/')[1] || '',
            type: (model.id.toLowerCase().includes('beta') ? 'beta' : (model.id.toLowerCase().includes('alpha') ? 'alpha' : 'stable')),
            link: `https://openrouter.ai/models/${model.id}`
        });
    });

    llmArenaModelsData.forEach(model => {
        // Basic date parsing, assuming YYYY-MM-DD. Robust parsing might be needed.
        let parsedDate = new Date(0); // Default to epoch
        if (model.date) {
            const parts = model.date.split('-');
            if (parts.length === 3) {
                parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
                parsedDate = new Date(model.date); // Fallback if not YYYY-MM-DD
            }
             if (isNaN(parsedDate.getTime())) parsedDate = new Date(0); // Invalid date check
        }

        allModelsCombined.push({
            id: `lmsys-${model.model.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: model.model,
            source: 'LLM Arena (LMSys)',
            sourceType: 'LlmArena',
            description: `Elo: ${parseFloat(model.score).toFixed(2)} (CI: ${model.CI || 'N/A'}, Tokens: ${model.avg_tokens || 'N/A'})`,
            score: parseFloat(model.score),
            date: parsedDate,
            version: '', 
            type: (model.model.toLowerCase().includes('beta') || model.model.toLowerCase().includes('preview') ? 'beta' : 'arena'),
            link: 'https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard'
        });
    });
    console.log("Combined and Normalized Data:", allModelsCombined.length, "items.");
}

function renderAllModels() {
    const modelListContainer = document.querySelector('#model-listings .model-list-container');
    if (!modelListContainer) {
        console.error("Model list container not found for rendering!");
        return;
    }
    modelListContainer.innerHTML = ''; 

    if (allModelsCombined.length === 0 && activeFetchOperations === 0) {
        modelListContainer.innerHTML = "<p>No models to display. All data sources might have failed or returned no data. Check console for errors.</p>";
        return;
    }
    
    const sortValue = document.getElementById('sort-models').value;
    let sortedModels = [...allModelsCombined];

    switch (sortValue) {
        case 'name-asc':
            sortedModels.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sortedModels.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'score-desc':
            sortedModels.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
            break;
        case 'score-asc':
            sortedModels.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));
            break;
        case 'date-desc':
            sortedModels.sort((a, b) => b.date.getTime() - a.date.getTime());
            break;
        case 'date-asc':
            sortedModels.sort((a, b) => a.date.getTime() - b.date.getTime());
            break;
        default:
            console.warn("Unknown sort value:", sortValue);
            break;
    }

    if (sortedModels.length === 0 && activeFetchOperations > 0) {
        // If still fetching, don't say "no models", wait for fetches to complete.
        // The global loading message should cover this.
        return;
    }


    sortedModels.forEach(model => {
        const modelCard = document.createElement('div');
        modelCard.className = 'model-card';
        modelCard.setAttribute('data-model-id', model.id);

        modelCard.innerHTML = `
            <h3>${model.name} ${model.version ? `<span style="font-size: 0.7em; color: #666;">(${model.version})</span>` : ''}</h3>
            <p>${model.description}</p>
            <div class="model-meta">
                <span class="model-source">Source: ${model.source}</span>
                <span class="model-type model-type-${model.type.toLowerCase()}">${model.type}</span>
            </div>
            <div class="model-footer" style="margin-top:1em; padding-top:0.5em; border-top: 1px solid #f0f0f0; font-size:0.9em;">
                <p><strong>${model.sourceType === 'LlmArena' ? 'Leaderboard Date' : 'Listed Date'}:</strong> ${model.date.toLocaleDateString()}</p>
                ${model.score !== undefined && model.score !== null ? `<p><strong>Score/Elo:</strong> ${model.score.toFixed(2)}</p>` : ''}
                ${model.link ? `<a href="${model.link}" target="_blank" rel="noopener noreferrer">View Source</a>` : ''}
            </div>
        `;
        modelListContainer.appendChild(modelCard);
    });
}

async function fetchOpenRouterModels() {
    // showGlobalLoading(); // Moved to fetchAllDataAndRender
    console.log("Fetching models from OpenRouter API...");
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) {
            let errorData;
            try { errorData = await response.json(); } catch (e) { /* ignore */ }
            const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(`Failed to fetch models from OpenRouter: ${errorMessage}`);
        }
        const data = await response.json();
        openRouterModelsData = data.data || []; 
        console.log("OpenRouter models fetched:", openRouterModelsData.length);
    } catch (error) {
        console.error("Error fetching OpenRouter models:", error);
        openRouterModelsData = [];
        // Error message will be shown in renderAllModels if allModelsCombined is empty
    } finally {
        hideGlobalLoading();
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 1) return []; // Handle empty CSV
    const headers = lines[0].split(',').map(header => header.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines
        const values = lines[i].split(',').map(value => value.trim());
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j];
        }
        rows.push(row);
    }
    return rows;
}

async function fetchLlmArenaModels() {
    // showGlobalLoading(); // Moved to fetchAllDataAndRender
    console.log("Fetching models from LLM Arena (Hugging Face CSV)...");

    try {
        const response = await fetch('https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard/resolve/main/arena_hard_auto_leaderboard_v0.1.csv');
        if (!response.ok) {
            throw new Error(`Failed to fetch LLM Arena CSV: HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        llmArenaModelsData = parseCSV(csvText); 
        console.log("LLM Arena models fetched:", llmArenaModelsData.length);
    } catch (error) {
        console.error("Error fetching LLM Arena models:", error);
        llmArenaModelsData = []; 
        // Error message will be shown in renderAllModels if allModelsCombined is empty
    } finally {
        hideGlobalLoading();
    }
}

// Note: The actual fetching from OpenRouter/LLM Arena and the notification backend
// will be implemented in later steps. This script.js provides the basic frontend
// structure and interaction logic.
