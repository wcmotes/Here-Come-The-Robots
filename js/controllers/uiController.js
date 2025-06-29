export class UIController {
    constructor(modelDataService, notificationService) {
        this.modelDataService = modelDataService;
        this.notificationService = notificationService;
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadSavedSettings();
        console.log("🎨 UI Controller initialized");
    }

    cacheElements() {
        this.elements = {
            sortSelect: document.getElementById('sort-models'),
            refreshBtn: document.getElementById('refresh-btn'),
            retryBtn: document.getElementById('retry-btn'),
            loadingMessage: document.getElementById('global-loading-message'),
            errorMessage: document.getElementById('error-message'),
            modelContainer: document.querySelector('.model-list-container'),
            notificationForm: document.getElementById('notification-form'),
            emailInput: document.getElementById('email'),
            phoneInput: document.getElementById('phone'),
            betaCheckbox: document.getElementById('beta-notifications'),
            highScoreCheckbox: document.getElementById('high-score-notifications'),
            notificationStatus: document.getElementById('notification-status')
        };
    }

    bindEvents() {
        // Sort functionality
        this.elements.sortSelect?.addEventListener('change', () => {
            localStorage.setItem('sortPreference', this.elements.sortSelect.value);
            this.renderModels();
        });

        // Refresh functionality
        this.elements.refreshBtn?.addEventListener('click', () => {
            this.refreshData();
        });

        // Retry functionality
        this.elements.retryBtn?.addEventListener('click', () => {
            this.refreshData();
        });

        // Notification form
        this.elements.notificationForm?.addEventListener('submit', (e) => {
            this.handleNotificationSubmit(e);
        });
    }

    loadSavedSettings() {
        const savedSort = localStorage.getItem('sortPreference');
        if (savedSort && this.elements.sortSelect) {
            this.elements.sortSelect.value = savedSort;
        }

        const settings = this.notificationService.getSettings();
        if (this.elements.emailInput) this.elements.emailInput.value = settings.email;
        if (this.elements.phoneInput) this.elements.phoneInput.value = settings.phone;
        if (this.elements.betaCheckbox) this.elements.betaCheckbox.checked = settings.betaNotifications;
        if (this.elements.highScoreCheckbox) this.elements.highScoreCheckbox.checked = settings.highScoreNotifications;
    }

    async refreshData() {
        this.showLoading();
        this.hideError();
        
        try {
            await this.modelDataService.fetchAllData(true);
            this.renderModels();
            this.hideLoading();
        } catch (error) {
            console.error("Refresh failed:", error);
            this.hideLoading();
            this.showError("Failed to refresh data. Please try again.");
        }
    }

    renderModels() {
        if (!this.elements.modelContainer) return;

        const sortBy = this.elements.sortSelect?.value || 'date-desc';
        const models = this.modelDataService.getSortedModels(sortBy);

        if (models.length === 0) {
            this.elements.modelContainer.innerHTML = `
                <div class="no-models">
                    <p>No models available. Try refreshing the data.</p>
                </div>
            `;
            return;
        }

        this.elements.modelContainer.innerHTML = models.map(model => 
            this.createModelCard(model)
        ).join('');

        console.log(`🎨 Rendered ${models.length} model cards`);
    }

    createModelCard(model) {
        const scoreDisplay = model.score !== null ? 
            `<p><strong>Score/Elo:</strong> ${model.score.toFixed(2)}</p>` : '';
        
        const pricingDisplay = model.pricing ? 
            `<p><strong>Pricing:</strong> $${model.pricing.prompt}/$${model.pricing.completion} per 1K tokens</p>` : '';

        return `
            <div class="model-card" data-model-id="${model.id}">
                <h3>
                    ${model.name}
                    ${model.version ? `<span style="font-size: 0.7em; color: #666;">(${model.version})</span>` : ''}
                </h3>
                <p>${model.description}</p>
                
                <div class="model-meta">
                    <span class="model-source">${model.source}</span>
                    <span class="model-type model-type-${model.type.toLowerCase()}">${model.type}</span>
                </div>
                
                <div class="model-footer">
                    <p><strong>Date:</strong> ${model.date.toLocaleDateString()}</p>
                    ${scoreDisplay}
                    ${pricingDisplay}
                    ${model.tokens ? `<p><strong>Avg Tokens:</strong> ${model.tokens}</p>` : ''}
                    ${model.link ? `<a href="${model.link}" target="_blank" rel="noopener noreferrer">View Details →</a>` : ''}
                </div>
            </div>
        `;
    }

    async handleNotificationSubmit(event) {
        event.preventDefault();
        
        const email = this.elements.emailInput?.value.trim() || '';
        const phone = this.elements.phoneInput?.value.trim() || '';
        const betaNotifications = this.elements.betaCheckbox?.checked || false;
        const highScoreNotifications = this.elements.highScoreCheckbox?.checked || false;

        // Validation
        if (!email) {
            this.showNotificationStatus('Please enter an email address.', 'error');
            return;
        }

        if (!this.notificationService.validateEmail(email)) {
            this.showNotificationStatus('Please enter a valid email address.', 'error');
            return;
        }

        if (phone && !this.notificationService.validatePhone(phone)) {
            this.showNotificationStatus('Please enter a valid phone number.', 'error');
            return;
        }

        // Save settings
        const settings = {
            email,
            phone,
            betaNotifications,
            highScoreNotifications
        };

        this.notificationService.saveSettings(settings);
        
        // Show success message
        this.showNotificationStatus(
            `Settings saved! You'll be notified at ${email} when new models are released.`,
            'success'
        );

        // Simulate saving to backend
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 1500);
    }

    showNotificationStatus(message, type = 'info') {
        if (!this.elements.notificationStatus) return;
        
        this.elements.notificationStatus.textContent = message;
        this.elements.notificationStatus.className = `notification-status ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                this.elements.notificationStatus.style.display = 'none';
            }, 5000);
        }
    }

    showLoading() {
        if (this.elements.loadingMessage) {
            this.elements.loadingMessage.style.display = 'block';
        }
        if (this.elements.modelContainer) {
            this.elements.modelContainer.innerHTML = '';
        }
    }

    hideLoading() {
        if (this.elements.loadingMessage) {
            this.elements.loadingMessage.style.display = 'none';
        }
    }

    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.querySelector('p').textContent = message;
            this.elements.errorMessage.style.display = 'block';
        }
    }

    hideError() {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.style.display = 'none';
        }
    }
}