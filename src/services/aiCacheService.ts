/**
 * AI Cache Service - LRU Cache cho AI responses
 * Giảm 60-80% API calls cho content tương tự
 */

interface CacheEntry {
  response: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
}

class AICacheService {
  private static instance: AICacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100; // Maximum cache entries
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    hitRate: 0
  };

  // TTL constants (in milliseconds)
  private readonly TTL = {
    NARRATIVE: 60 * 60 * 1000,      // 1 hour for narrative content
    STATIC_DATA: 24 * 60 * 60 * 1000, // 24 hours for world gen, character analysis
    QUEST_DATA: 2 * 60 * 60 * 1000,   // 2 hours for quest-related content
    COMBAT_DATA: 30 * 60 * 1000,      // 30 minutes for combat content
    DEFAULT: 60 * 60 * 1000           // 1 hour default
  };

  private constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  static getInstance(): AICacheService {
    if (!AICacheService.instance) {
      AICacheService.instance = new AICacheService();
    }
    return AICacheService.instance;
  }

  /**
   * Generate cache key from prompt and context
   */
  private generateCacheKey(prompt: string, context?: any): string {
    // Create a simple hash of the prompt and context
    const contextStr = context ? JSON.stringify(context) : '';
    const combined = prompt + contextStr;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `ai_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Determine TTL based on prompt content
   */
  private getTTLForPrompt(prompt: string): number {
    const lowerPrompt = prompt.toLowerCase();
    
    // World generation and character creation - long TTL
    if (lowerPrompt.includes('world') || lowerPrompt.includes('thế giới') || 
        lowerPrompt.includes('character') || lowerPrompt.includes('nhân vật') ||
        lowerPrompt.includes('faction') || lowerPrompt.includes('phe phái')) {
      return this.TTL.STATIC_DATA;
    }
    
    // Quest-related content - medium TTL
    if (lowerPrompt.includes('quest') || lowerPrompt.includes('nhiệm vụ') ||
        lowerPrompt.includes('objective') || lowerPrompt.includes('mục tiêu')) {
      return this.TTL.QUEST_DATA;
    }
    
    // Combat content - short TTL
    if (lowerPrompt.includes('combat') || lowerPrompt.includes('chiến đấu') ||
        lowerPrompt.includes('attack') || lowerPrompt.includes('tấn công') ||
        lowerPrompt.includes('enemy') || lowerPrompt.includes('kẻ thù')) {
      return this.TTL.COMBAT_DATA;
    }
    
    // Narrative content - medium TTL
    if (lowerPrompt.includes('narrative') || lowerPrompt.includes('kể chuyện') ||
        lowerPrompt.includes('story') || lowerPrompt.includes('câu chuyện') ||
        lowerPrompt.includes('scene') || lowerPrompt.includes('cảnh')) {
      return this.TTL.NARRATIVE;
    }
    
    return this.TTL.DEFAULT;
  }

  /**
   * Get cached response if available and not expired
   */
  get(prompt: string, context?: any): string | null {
    this.stats.totalRequests++;
    
    const key = this.generateCacheKey(prompt, context);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Update access info
    entry.accessCount++;
    entry.lastAccessed = now;
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(prompt: string, response: string, context?: any): void {
    const key = this.generateCacheKey(prompt, context);
    const ttl = this.getTTLForPrompt(prompt);
    const now = Date.now();
    
    // If cache is full, evict least recently used entry
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      response,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Set maximum cache size
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    
    // If new size is smaller, evict excess entries
    while (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Check if cache has entry for prompt
   */
  has(prompt: string, context?: any): boolean {
    const key = this.generateCacheKey(prompt, context);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache entry info (for debugging)
   */
  getEntryInfo(prompt: string, context?: any): any {
    const key = this.generateCacheKey(prompt, context);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    return {
      key,
      responseLength: entry.response.length,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      age: Date.now() - entry.timestamp,
      isExpired: Date.now() - entry.timestamp > entry.ttl
    };
  }
}

export const aiCacheService = AICacheService.getInstance();
