export class ModelDataService {
    constructor() {
        this.openRouterModels = [];
        this.llmArenaModels = [];
        this.allModels = [];
        this.isLoading = false;
        this.lastFetchTime = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async fetchAllData(forceRefresh = false) {
        if (this.isLoading) return;
        
        // Check cache
        if (!forceRefresh && this.lastFetchTime && 
            Date.now() - this.lastFetchTime < this.cacheTimeout) {
            console.log("Using cached data");
            return;
        }

        this.isLoading = true;
        
        try {
            const [openRouterData, llmArenaData] = await Promise.allSettled([
                this.fetchOpenRouterModels(),
                this.fetchLlmArenaModels()
            ]);

            if (openRouterData.status === 'fulfilled') {
                this.openRouterModels = openRouterData.value;
            } else {
                console.error("OpenRouter fetch failed:", openRouterData.reason);
            }

            if (llmArenaData.status === 'fulfilled') {
                this.llmArenaModels = llmArenaData.value;
            } else {
                console.error("LLM Arena fetch failed:", llmArenaData.reason);
            }

            this.combineAndNormalizeData();
            this.lastFetchTime = Date.now();
            
        } finally {
            this.isLoading = false;
        }
    }

    async fetchOpenRouterModels() {
        console.log("📡 Fetching OpenRouter models...");
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models');
            
            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status}`);
            }
            
            const data = await response.json();
            const models = data.data || [];
            
            console.log(`✅ Fetched ${models.length} OpenRouter models`);
            return models;
            
        } catch (error) {
            console.error("❌ OpenRouter fetch failed:", error);
            throw error;
        }
    }

    async fetchLlmArenaModels() {
        console.log("📡 Fetching LLM Arena models...");
        
        try {
            const response = await fetch(
                'https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard/resolve/main/arena_hard_auto_leaderboard_v0.1.csv'
            );
            
            if (!response.ok) {
                throw new Error(`LLM Arena API error: ${response.status}`);
            }
            
            const csvText = await response.text();
            const models = this.parseCSV(csvText);
            
            console.log(`✅ Fetched ${models.length} LLM Arena models`);
            return models;
            
        } catch (error) {
            console.error("❌ LLM Arena fetch failed:", error);
            throw error;
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim());
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            rows.push(row);
        }
        
        return rows;
    }

    combineAndNormalizeData() {
        this.allModels = [];

        // Process OpenRouter models
        this.openRouterModels.forEach(model => {
            this.allModels.push({
                id: `or-${model.id}`,
                name: model.name || model.id,
                source: model.id.split('/')[0] || 'OpenRouter',
                sourceType: 'OpenRouter',
                description: model.description || 'No description available.',
                score: model.stats?.rating_elo || null,
                date: model.created_at ? new Date(model.created_at * 1000) : new Date(0),
                version: model.architecture?.model_version || model.id.split('/')[1] || '',
                type: this.determineModelType(model.id),
                link: `https://openrouter.ai/models/${model.id}`,
                pricing: model.pricing ? {
                    prompt: model.pricing.prompt,
                    completion: model.pricing.completion
                } : null
            });
        });

        // Process LLM Arena models
        this.llmArenaModels.forEach(model => {
            const parsedDate = this.parseDate(model.date);
            
            this.allModels.push({
                id: `lmsys-${model.model.replace(/[^a-zA-Z0-9]/g, '-')}`,
                name: model.model,
                source: 'LLM Arena (LMSys)',
                sourceType: 'LlmArena',
                description: `Arena Elo: ${parseFloat(model.score || 0).toFixed(2)} (CI: ${model.CI || 'N/A'})`,
                score: parseFloat(model.score || 0),
                date: parsedDate,
                version: '',
                type: this.determineModelType(model.model),
                link: 'https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard',
                tokens: model.avg_tokens || null
            });
        });

        console.log(`🔄 Combined ${this.allModels.length} models total`);
    }

    determineModelType(modelName) {
        const name = modelName.toLowerCase();
        if (name.includes('beta') || name.includes('preview')) return 'beta';
        if (name.includes('alpha')) return 'alpha';
        if (name.includes('arena') || name.includes('lmsys')) return 'arena';
        return 'stable';
    }

    parseDate(dateString) {
        if (!dateString) return new Date(0);
        
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? new Date(0) : date;
    }

    getSortedModels(sortBy = 'date-desc') {
        const models = [...this.allModels];
        
        switch (sortBy) {
            case 'name-asc':
                return models.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc':
                return models.sort((a, b) => b.name.localeCompare(a.name));
            case 'score-desc':
                return models.sort((a, b) => (b.score || -Infinity) - (a.score || -Infinity));
            case 'score-asc':
                return models.sort((a, b) => (a.score || Infinity) - (b.score || Infinity));
            case 'date-desc':
                return models.sort((a, b) => b.date.getTime() - a.date.getTime());
            case 'date-asc':
                return models.sort((a, b) => a.date.getTime() - b.date.getTime());
            default:
                return models;
        }
    }

    getModelStats() {
        return {
            total: this.allModels.length,
            openRouter: this.openRouterModels.length,
            llmArena: this.llmArenaModels.length,
            beta: this.allModels.filter(m => m.type === 'beta').length,
            withScores: this.allModels.filter(m => m.score !== null).length
        };
    }
}