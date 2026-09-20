import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';

const DEFAULTS = {
    /** @type {{textContent:string, level:string}[]} */
    hideList: [],
    /** @type {{level:string, title:string, body:string, timestamp:string}[]} */
    history: [],
    maxHistory: 200,
    maxAgeDays: 7,
    captureInfo: true,
    captureSuccess: true,
    captureWarning: true,
    captureError: true,
    unreadCount: 0,
};

function toPositiveInteger(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function normalizeEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const level = String(entry.level || '').trim();
    const timestamp = entry.timestamp && !Number.isNaN(new Date(entry.timestamp).getTime())
        ? String(entry.timestamp)
        : new Date().toISOString();

    if (!level) return null;

    return {
        level,
        title: String(entry.title || ''),
        body: String(entry.body || ''),
        timestamp,
    };
}

function normalizeBlock(block) {
    if (!block || typeof block !== 'object') return null;
    const level = String(block.level || '').trim();
    const textContent = String(block.textContent || '').trim();
    return level && textContent ? { level, textContent } : null;
}

export class Settings {
    constructor() {
        if (!extension_settings.toastTome) {
            extension_settings.toastTome = {};
        }
        const saved = extension_settings.toastTome;
        this.hideList = Array.isArray(saved.hideList) ? saved.hideList.map(normalizeBlock).filter(Boolean) : [];
        this.history = Array.isArray(saved.history) ? saved.history.map(normalizeEntry).filter(Boolean) : [];
        this.maxHistory = toPositiveInteger(saved.maxHistory, DEFAULTS.maxHistory, 1, 5000);
        this.maxAgeDays = toPositiveInteger(saved.maxAgeDays, DEFAULTS.maxAgeDays, 0, 3650);
        this.captureInfo = saved.captureInfo !== false;
        this.captureSuccess = saved.captureSuccess !== false;
        this.captureWarning = saved.captureWarning !== false;
        this.captureError = saved.captureError !== false;
        this.unreadCount = toPositiveInteger(saved.unreadCount, DEFAULTS.unreadCount, 0, this.maxHistory);
        this.save();
    }

    save() {
        // Prune history before saving
        this.pruneHistory();
        extension_settings.toastTome = {
            hideList: this.hideList,
            history: this.history,
            maxHistory: this.maxHistory,
            maxAgeDays: this.maxAgeDays,
            captureInfo: this.captureInfo,
            captureSuccess: this.captureSuccess,
            captureWarning: this.captureWarning,
            captureError: this.captureError,
            unreadCount: this.unreadCount,
        };
        saveSettingsDebounced();
    }

    pruneHistory() {
        // Enforce max history
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
        // Enforce max age
        if (this.maxAgeDays > 0) {
            const cutoff = Date.now() - (this.maxAgeDays * 24 * 60 * 60 * 1000);
            this.history = this.history.filter(h => new Date(h.timestamp).getTime() > cutoff);
        }
    }

    shouldCapture(level) {
        switch (level) {
            case 'info': return this.captureInfo;
            case 'success': return this.captureSuccess;
            case 'warning': return this.captureWarning;
            case 'error': return this.captureError;
            default: return true;
        }
    }

    isBlocked(level, textContent) {
        const normalized = String(textContent || '').trim();
        return this.hideList.some(it => it.level === level && it.textContent === normalized);
    }

    addBlock(level, textContent) {
        const normalized = String(textContent || '').trim();
        if (normalized && !this.isBlocked(level, normalized)) {
            this.hideList.push({ level, textContent: normalized });
            this.save();
        }
    }

    removeBlock(level, textContent) {
        const normalized = String(textContent || '').trim();
        const idx = this.hideList.findIndex(it => it.level === level && it.textContent === normalized);
        if (idx > -1) {
            this.hideList.splice(idx, 1);
            this.save();
        }
    }

    clearBlocks() {
        this.hideList = [];
        this.save();
    }

    addToHistory(level, title, body) {
        this.history.push({
            level,
            title: title || '',
            body: body || '',
            timestamp: new Date().toISOString(),
        });
        this.unreadCount = Math.min(this.maxHistory, this.unreadCount + 1);
        this.save();
    }

    clearHistory() {
        this.history = [];
        this.unreadCount = 0;
        this.save();
    }

}
