// API 调用封装
const API = {
    baseUrl: '/api',

    async request(method, endpoint, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Request failed' }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            if (response.status === 204) return null;
            return await response.json();
        } catch (error) {
            console.error(`API ${method} ${endpoint} failed:`, error);
            throw error;
        }
    },

    // ============ 场景 API ============

    async getScenarios(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/scenarios${query ? '?' + query : ''}`);
    },

    async getScenario(id) {
        return this.request('GET', `/scenarios/${id}`);
    },

    async createScenario(data) {
        return this.request('POST', '/scenarios', data);
    },

    async updateScenario(id, data) {
        return this.request('PUT', `/scenarios/${id}`, data);
    },

    async deleteScenario(id) {
        return this.request('DELETE', `/scenarios/${id}`);
    },

    async getStats() {
        return this.request('GET', '/scenarios/stats');
    },

    async searchScenarios(q) {
        return this.request('GET', `/scenarios/search?q=${encodeURIComponent(q)}`);
    },

    async exportScenario(sceneId) {
        return this.request('GET', `/scenarios/${sceneId}/export`);
    },

    // ============ 跟进记录 API ============

    async getFollowups(sceneId) {
        return this.request('GET', `/scenarios/${sceneId}/followups`);
    },

    async createFollowup(sceneId, data) {
        return this.request('POST', `/scenarios/${sceneId}/followups`, data);
    },

    async getOverdueFollowups() {
        return this.request('GET', '/followups/overdue');
    },

    // ============ 本地存储 API ============

    saveDraft(sceneCode, data) {
        const key = `draft_${sceneCode}`;
        localStorage.setItem(key, JSON.stringify({
            data,
            savedAt: new Date().toISOString()
        }));
    },

    loadDraft(sceneCode) {
        const key = `draft_${sceneCode}`;
        const draft = localStorage.getItem(key);
        return draft ? JSON.parse(draft) : null;
    },

    clearDraft(sceneCode) {
        const key = `draft_${sceneCode}`;
        localStorage.removeItem(key);
    },

    getAllDrafts() {
        const drafts = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('draft_')) {
                drafts[key] = localStorage.getItem(key);
            }
        }
        return drafts;
    }
};

// 暴露到全局
window.API = API;
