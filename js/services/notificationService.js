export class NotificationService {
    constructor() {
        this.settings = this.loadSettings();
    }

    loadSettings() {
        return {
            email: localStorage.getItem('notificationEmail') || '',
            phone: localStorage.getItem('notificationPhone') || '',
            betaNotifications: localStorage.getItem('notifyForBeta') === 'true',
            highScoreNotifications: localStorage.getItem('notifyForHighScore') === 'true'
        };
    }

    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        
        localStorage.setItem('notificationEmail', this.settings.email);
        localStorage.setItem('notificationPhone', this.settings.phone);
        localStorage.setItem('notifyForBeta', this.settings.betaNotifications.toString());
        localStorage.setItem('notifyForHighScore', this.settings.highScoreNotifications.toString());
        
        console.log("💾 Notification settings saved:", this.settings);
    }

    getSettings() {
        return { ...this.settings };
    }

    // Simulate notification sending (would require backend in real implementation)
    async sendNotification(model) {
        console.log("📧 Would send notification for model:", model.name);
        
        // In a real implementation, this would make an API call to your backend
        // which would handle sending emails/SMS notifications
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: `Notification sent for ${model.name}`
                });
            }, 1000);
        });
    }

    shouldNotify(model) {
        if (!this.settings.email) return false;
        
        if (model.type === 'beta' && !this.settings.betaNotifications) {
            return false;
        }
        
        if (model.score && model.score > 1200 && this.settings.highScoreNotifications) {
            return true;
        }
        
        return this.settings.betaNotifications && model.type === 'beta';
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return !phone || phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
}