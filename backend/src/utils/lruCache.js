/**
 * LRU Cache (Least Recently Used) with TTL support
 * Designed for low-memory, high-concurrency exam delivery
 */
class LRUCache {
  /**
   * @param {number} capacity - Maximum number of items allowed in cache
   * @param {number} defaultTtlMs - Default Time-To-Live in milliseconds (default: 15 mins)
   */
  constructor(capacity = 200, defaultTtlMs = 15 * 60 * 1000) {
    this.capacity = capacity;
    this.defaultTtlMs = defaultTtlMs;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    const item = this.cache.get(key);

    // Check TTL expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position to Mark as Most Recently Used
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict Least Recently Used (first key in map iterator)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  pruneExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singletons for key modules
const examCache = new LRUCache(100, 10 * 60 * 1000); // Cache exam metadata (10 mins)
const examQuestionsCache = new LRUCache(100, 15 * 60 * 1000); // Cache questions per exam (15 mins)
const sessionCache = new LRUCache(500, 5 * 60 * 1000); // Cache active student session state (5 mins)

module.exports = {
  LRUCache,
  examCache,
  examQuestionsCache,
  sessionCache
};
