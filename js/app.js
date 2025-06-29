import { ModelDataService } from './services/modelDataService.js';
import { UIController } from './controllers/uiController.js';
import { NotificationService } from './services/notificationService.js';

class AITrackerApp {
    constructor() {
        this.modelDataService = new ModelDataService();
        this.notificationService = new NotificationService();
        this.uiController = new UIController(this.modelDataService, this.notificationService);
    }

    async init() {
        console.log("🤖 AI/LLM Release Tracker initializing...");
        
        // Initialize UI controller
        this.uiController.init();
        
        // Load initial data
        await this.loadInitialData();
        
        console.log("✅ AI/LLM Release Tracker ready!");
    }

    async loadInitialData() {
        try {
            await this.modelDataService.fetchAllData();
            this.uiController.renderModels();
        } catch (error) {
            console.error("Failed to load initial data:", error);
            this.uiController.showError("Failed to load model data. Please check your connection and try again.");
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new AITrackerApp();
    app.init().catch(error => {
        console.error("Failed to initialize app:", error);
    });
});