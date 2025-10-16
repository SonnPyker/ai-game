import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface ApiKeyInfo {
  id: string;
  key: string;
  name: string;
  accountName: string;
  isActive: boolean;
  lastUsed: string;
  usageCount: number;
  errorCount: number;
  lastError?: string;
  createdAt: string;
}

export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  totalUsage: number;
  totalErrors: number;
  currentKeyIndex: number;
  queueLength: number;
  activeRequests: number;
  averageResponseTime: number;
}

interface QueueItem {
  id: string;
  prompt: string;
  contentFlags?: any;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class MultiApiKeyService {
  private readonly API_KEYS_KEY = 'gemini_api_keys';
  private readonly CURRENT_KEY_INDEX_KEY = 'current_api_key_index';
  private readonly MAX_ERRORS_PER_KEY = 5;
  private readonly ROTATION_THRESHOLD = 10; // Rotate after 10 uses
  
  private apiKeys: ApiKeyInfo[] = [];
  private currentKeyIndex: number = 0;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isInitialized: boolean = false;
  
  // Queue System
  private requestQueue: QueueItem[] = [];
  private activeRequests: Map<string, QueueItem> = new Map();
  private requestToKeyMap: Map<string, string> = new Map(); // Track which key is used for each request
  private maxConcurrentRequests: number = 5; // Tăng lên để test parallel processing
  private responseTimes: number[] = [];
  private requestCounter: number = 0; // Counter để tạo unique request ID

  constructor() {
    this.loadApiKeys();
    this.initializeGemini();
  }

  // API Key Management
  addApiKey(key: string, name: string = '', accountName: string = ''): string {
    const trimmedKey = key.trim();
    const trimmedName = name.trim() || `API Key ${this.apiKeys.length + 1}`;
    const trimmedAccount = accountName.trim() || `Account ${this.apiKeys.length + 1}`;
    
    // Check trùng key
    const existingKey = this.apiKeys.find(k => k.key === trimmedKey);
    if (existingKey) {
      throw new Error(`API key đã tồn tại với tên "${existingKey.name}" trong account "${existingKey.accountName}"`);
    }
    
    // Check trùng tên trong cùng account
    const duplicateName = this.apiKeys.find(k => 
      k.name === trimmedName && k.accountName === trimmedAccount
    );
    if (duplicateName) {
      throw new Error(`Tên "${trimmedName}" đã tồn tại trong account "${trimmedAccount}"`);
    }
    
    const id = Date.now().toString();
    const apiKeyInfo: ApiKeyInfo = {
      id,
      key: trimmedKey,
      name: trimmedName,
      accountName: trimmedAccount,
      isActive: true,
      lastUsed: new Date().toISOString(),
      usageCount: 0,
      errorCount: 0,
      createdAt: new Date().toISOString()
    };

    this.apiKeys.push(apiKeyInfo);
    this.saveApiKeys();
    
    // Nếu đây là key đầu tiên, khởi tạo ngay
    if (this.apiKeys.length === 1) {
      this.initializeGemini();
    }
    
    return id;
  }

  removeApiKey(id: string): boolean {
    const index = this.apiKeys.findIndex(key => key.id === id);
    if (index === -1) return false;

    this.apiKeys.splice(index, 1);
    
    // Điều chỉnh currentKeyIndex nếu cần
    if (this.currentKeyIndex >= this.apiKeys.length) {
      this.currentKeyIndex = Math.max(0, this.apiKeys.length - 1);
    }
    
    this.saveApiKeys();
    this.initializeGemini();
    return true;
  }

  updateApiKey(id: string, updates: Partial<ApiKeyInfo>): boolean {
    const index = this.apiKeys.findIndex(key => key.id === id);
    if (index === -1) return false;

    this.apiKeys[index] = { ...this.apiKeys[index], ...updates };
    this.saveApiKeys();
    return true;
  }

  getApiKeys(): ApiKeyInfo[] {
    return [...this.apiKeys];
  }

  // Helper methods for duplicate checking
  isKeyExists(key: string): boolean {
    return this.apiKeys.some(k => k.key === key.trim());
  }

  isNameExistsInAccount(name: string, accountName: string): boolean {
    return this.apiKeys.some(k => 
      k.name === name.trim() && k.accountName === accountName.trim()
    );
  }

  findDuplicateKey(key: string): ApiKeyInfo | null {
    return this.apiKeys.find(k => k.key === key.trim()) || null;
  }

  findDuplicateNameInAccount(name: string, accountName: string): ApiKeyInfo | null {
    return this.apiKeys.find(k => 
      k.name === name.trim() && k.accountName === accountName.trim()
    ) || null;
  }

  getCurrentApiKey(): ApiKeyInfo | null {
    if (this.apiKeys.length === 0) return null;
    return this.apiKeys[this.currentKeyIndex];
  }

  getApiKeyStats(): ApiKeyStats {
    const activeKeys = this.apiKeys.filter(key => key.isActive);
    const totalUsage = this.apiKeys.reduce((sum, key) => sum + key.usageCount, 0);
    const totalErrors = this.apiKeys.reduce((sum, key) => sum + key.errorCount, 0);
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length 
      : 0;

    return {
      totalKeys: this.apiKeys.length,
      activeKeys: activeKeys.length,
      totalUsage,
      totalErrors,
      currentKeyIndex: this.currentKeyIndex,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  // Key Rotation Logic
  private rotateToNextKey(): boolean {
    const activeKeys = this.apiKeys.filter(key => key.isActive);
    if (activeKeys.length <= 1) return false;

    // Tìm key tiếp theo
    let nextIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    let attempts = 0;
    
    while (attempts < this.apiKeys.length) {
      if (this.apiKeys[nextIndex].isActive) {
        this.currentKeyIndex = nextIndex;
        this.saveCurrentKeyIndex();
        this.initializeGemini();
        return true;
      }
      nextIndex = (nextIndex + 1) % this.apiKeys.length;
      attempts++;
    }
    
    return false;
  }

  private markKeyError(error: string): void {
    if (this.apiKeys.length === 0) return;
    
    const currentKey = this.apiKeys[this.currentKeyIndex];
    currentKey.errorCount++;
    currentKey.lastError = error;
    currentKey.lastUsed = new Date().toISOString();
    
    // Nếu key có quá nhiều lỗi, tạm thời disable
    if (currentKey.errorCount >= this.MAX_ERRORS_PER_KEY) {
      currentKey.isActive = false;
      console.warn(`API Key "${currentKey.name}" disabled due to too many errors (${currentKey.errorCount})`);
    }
    
    this.saveApiKeys();
    
    // Thử rotate sang key khác
    this.rotateToNextKey();
  }



  // Gemini Service Integration
  private async initializeGemini() {
    if (this.apiKeys.length === 0) {
      this.genAI = null;
      this.model = null;
      this.isInitialized = false;
      return;
    }

    const currentKey = this.getCurrentApiKey();
    if (!currentKey || !currentKey.isActive) {
      this.genAI = null;
      this.model = null;
      this.isInitialized = false;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(currentKey.key);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ]
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Gemini:', error);
      this.markKeyError(`Initialization failed: ${error}`);
    }
  }

  async testApiKey(keyId?: string): Promise<{ success: boolean; error?: string; details?: any }> {
    const testKey = keyId ? this.apiKeys.find(k => k.id === keyId) : this.getCurrentApiKey();
    if (!testKey) {
      return { 
        success: false, 
        error: 'API key không tồn tại',
        details: { keyId, availableKeys: this.apiKeys.length }
      };
    }

    const startTime = Date.now();
    
    try {
      const testGenAI = new GoogleGenerativeAI(testKey.key);
      const testModel = testGenAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ]
      });
      
      // Test với timeout
      const testPromise = testModel.generateContent('Xin chào, hãy trả lời "OK"');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
      );
      
      const result = await Promise.race([testPromise, timeoutPromise]) as any;
      const response = await result.response;
      const text = response.text();
      const duration = Date.now() - startTime;
      
      const success = text.includes('OK') || text.length > 0;
      
      
      
      return { 
        success, 
        details: { 
          duration: `${duration}ms`,
          responseLength: text.length,
          responsePreview: text.substring(0, 100),
          keyName: testKey.name
        }
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = this.getDetailedErrorMessage(error);
      
      console.error(`❌ API test FAILED for ${testKey.name}:`, {
        error: errorMessage,
        duration: `${duration}ms`,
        errorType: error.constructor.name,
        errorCode: error.code || 'UNKNOWN'
      });
      
      return { 
        success: false, 
        error: errorMessage,
        details: { 
          duration: `${duration}ms`,
          errorType: error.constructor.name,
          errorCode: error.code || 'UNKNOWN',
          keyName: testKey.name
        }
      };
    }
  }

  private getDetailedErrorMessage(error: any): string {
    if (error.message?.includes('timeout')) {
      return 'Kết nối timeout - API key có thể không hợp lệ hoặc mạng chậm';
    }
    
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid')) {
      return 'API key không hợp lệ - vui lòng kiểm tra lại key';
    }
    
    if (error.message?.includes('QUOTA_EXCEEDED') || error.message?.includes('quota')) {
      return 'Đã vượt quá quota API - vui lòng kiểm tra billing';
    }
    
    if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('permission')) {
      return 'Không có quyền truy cập - API key có thể bị hạn chế';
    }
    
    if (error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable')) {
      return 'Dịch vụ Gemini API tạm thời không khả dụng';
    }
    
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return 'Lỗi kết nối mạng - vui lòng kiểm tra internet';
    }
    
    return `Lỗi không xác định: ${error.message || 'Unknown error'}`;
  }

  async testAllApiKeys(): Promise<{ [keyId: string]: { success: boolean; error?: string; details?: any } }> {
    const results: { [keyId: string]: { success: boolean; error?: string; details?: any } } = {};
    
    for (const key of this.apiKeys) {
      results[key.id] = await this.testApiKey(key.id);
    }
    
    // Count successful tests (for debugging if needed)
    // const successCount = Object.values(results).filter(r => r.success).length;
    
    return results;
  }

  // Queue Management Methods

  private getAvailableKey(): ApiKeyInfo | null {
    const availableKeys = this.apiKeys.filter(key => key.isActive && !this.activeRequests.has(key.id));
    if (availableKeys.length === 0) return null;
    
    console.log(`🔍 [Round-Robin] Available keys: ${availableKeys.map(k => `${k.accountName}(${k.name})`).join(', ')}`);
    console.log(`🔍 [Round-Robin] Current index: ${this.currentKeyIndex}, Total keys: ${this.apiKeys.length}`);
    
    // Round-robin: chọn key theo thứ tự, bắt đầu từ currentKeyIndex
    let startIndex = this.currentKeyIndex;
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (startIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[keyIndex];
      
      console.log(`🔍 [Round-Robin] Checking key ${keyIndex}: ${key.accountName}(${key.name}) - Active: ${key.isActive}, HasRequest: ${this.activeRequests.has(key.id)}`);
      
      if (key.isActive && !this.activeRequests.has(key.id)) {
        this.currentKeyIndex = (keyIndex + 1) % this.apiKeys.length; // Update for next round
        console.log(`✅ [Round-Robin] Selected: ${key.accountName}(${key.name}) at index ${keyIndex}`);
        return key;
      }
    }
    
    // Fallback: nếu không tìm được key theo round-robin, lấy key đầu tiên available
    console.log(`⚠️ [Round-Robin] Fallback to: ${availableKeys[0].accountName}(${availableKeys[0].name})`);
    return availableKeys[0];
  }

  private async queueRequest(prompt: string, contentFlags?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      // Fix: Tạo unique request ID với timestamp + random + counter + microtime
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const counter = (++this.requestCounter).toString().padStart(4, '0');
      const microtime = performance.now().toString().replace('.', '');
      const uniqueId = Math.random().toString(36).substr(2, 6);
      const requestId = `${timestamp}-${random}-${counter}-${microtime}-${uniqueId}`;
      
      const queueItem: QueueItem = {
        id: requestId,
        prompt,
        contentFlags,
        resolve,
        reject,
        timestamp
      };

      console.log(`📝 [Request] Created ${requestId.substring(0, 12)} for: ${prompt.substring(0, 50)}...`);
      
      this.requestQueue.push(queueItem);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    while (this.requestQueue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
      const queueItem = this.requestQueue.shift();
      if (!queueItem) break;

      const availableKey = this.getAvailableKey();
      if (!availableKey) {
        // No available keys, put back in queue
        this.requestQueue.unshift(queueItem);
        break;
      }

      await this.assignRequestToKey(queueItem, availableKey);
    }
  }

  private async assignRequestToKey(queueItem: QueueItem, key: ApiKeyInfo): Promise<void> {
    this.activeRequests.set(key.id, queueItem);
    this.requestToKeyMap.set(queueItem.id, key.id); // Track which key is used
    
    console.log(`🔄 [Assign] ${queueItem.id.substring(0, 12)} → ${key.accountName} (${key.name})`);

    try {
      const startTime = Date.now();
      const result = await this.executeRequestWithKey(queueItem.prompt, queueItem.contentFlags, key);
      const duration = Date.now() - startTime;
      
      this.responseTimes.push(duration);
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift(); // Keep only last 100 response times
      }
      
      console.log(`✅ [Complete] ${queueItem.id.substring(0, 12)} by ${key.accountName} (${key.name}) in ${duration}ms`);
      queueItem.resolve(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ [Error] ${queueItem.id.substring(0, 12)} by ${key.accountName} (${key.name}): ${errorMessage}`);
      queueItem.reject(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      this.activeRequests.delete(key.id);
      this.requestToKeyMap.delete(queueItem.id); // Clean up tracking
      // Process next item in queue
      this.processQueue();
    }
  }

  private async executeRequestWithKey(prompt: string, contentFlags: any, key: ApiKeyInfo): Promise<string> {
    const genAI = new GoogleGenerativeAI(key.key);
    const model = this.getModelForContentFlags(contentFlags, genAI);
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = await response.text();
    
    // Update key stats
    key.usageCount++;
    key.lastUsed = new Date().toISOString();
    key.errorCount = Math.max(0, key.errorCount - 1);
    this.saveApiKeys();
    
    return text;
  }

  private getModelForContentFlags(contentFlags: any, genAI: GoogleGenerativeAI): any {
    // Nếu chế độ 18+ được bật, tắt hoàn toàn safety settings
    if (contentFlags?.adult_enabled) {
      return genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        safetySettings: [] // Tắt hoàn toàn safety settings
      });
    }

    // Mặc định: sử dụng safety settings với BLOCK_NONE
    return genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        }
      ]
    });
  }

  // Main API Methods
  isConfigured(): boolean {
    return this.isInitialized && this.genAI !== null && this.model !== null;
  }

  hasApiKeys(): boolean {
    return this.apiKeys.length > 0;
  }

  async generateContent(prompt: string, contentFlags?: any): Promise<string> {
    if (!this.hasApiKeys()) {
      throw new Error('Không có API key nào được cấu hình');
    }

    const activeKeys = this.apiKeys.filter(k => k.isActive);
    if (activeKeys.length === 0) {
      throw new Error('Tất cả API keys đều bị vô hiệu hóa');
    }

    // Use queue system for parallel processing
    return this.queueRequest(prompt, contentFlags);
  }


  // Tự động kiểm tra và chuyển key khi phát hiện vấn đề
  async autoSwitchOnError(): Promise<boolean> {
    const currentKey = this.getCurrentApiKey();
    if (!currentKey) {
      return this.findAndSwitchToWorkingKey();
    }

    // Test key hiện tại
    const testResult = await this.testApiKey(currentKey.id);
    
    if (!testResult.success) {
      return this.findAndSwitchToWorkingKey();
    }
    return true;
  }

  // Tìm và chuyển sang key đang hoạt động
  private async findAndSwitchToWorkingKey(): Promise<boolean> {
    const activeKeys = this.apiKeys.filter(k => k.isActive);
    
    for (const key of activeKeys) {
      const testResult = await this.testApiKey(key.id);
      
      if (testResult.success) {
        this.currentKeyIndex = this.apiKeys.findIndex(k => k.id === key.id);
        this.initializeGemini();
        return true;
      }
    }
    
    console.error('💥 No working keys found!');
    return false;
  }

  // Method để force switch sang key khác (có thể gọi từ UI)
  async forceSwitchToNextKey(): Promise<boolean> {
    if (this.rotateToNextKey()) {
      return true;
    } else {
      console.error('❌ No more keys available to switch to');
      return false;
    }
  }

  // Storage Management
  private loadApiKeys(): void {
    try {
      const data = localStorage.getItem(this.API_KEYS_KEY);
      this.apiKeys = data ? JSON.parse(data) : [];
      
      const indexData = localStorage.getItem(this.CURRENT_KEY_INDEX_KEY);
      this.currentKeyIndex = indexData ? parseInt(indexData) : 0;
      
      // Đảm bảo index hợp lệ
      if (this.currentKeyIndex >= this.apiKeys.length) {
        this.currentKeyIndex = Math.max(0, this.apiKeys.length - 1);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      this.apiKeys = [];
      this.currentKeyIndex = 0;
    }
  }

  private saveApiKeys(): void {
    try {
      localStorage.setItem(this.API_KEYS_KEY, JSON.stringify(this.apiKeys));
    } catch (error) {
      console.error('Error saving API keys:', error);
    }
  }

  private saveCurrentKeyIndex(): void {
    try {
      localStorage.setItem(this.CURRENT_KEY_INDEX_KEY, this.currentKeyIndex.toString());
    } catch (error) {
      console.error('Error saving current key index:', error);
    }
  }

  // Utility Methods
  clearAllApiKeys(): void {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.genAI = null;
    this.model = null;
    this.isInitialized = false;
    localStorage.removeItem(this.API_KEYS_KEY);
    localStorage.removeItem(this.CURRENT_KEY_INDEX_KEY);
  }

  resetKeyErrors(): void {
    this.apiKeys.forEach(key => {
      key.errorCount = 0;
      key.lastError = undefined;
      key.isActive = true;
    });
    this.saveApiKeys();
  }


  getActiveKeysCount(): number {
    return this.apiKeys.filter(key => key.isActive).length;
  }

  getNextRotationIn(): number {
    const currentKey = this.getCurrentApiKey();
    if (!currentKey) return 0;
    return this.ROTATION_THRESHOLD - (currentKey.usageCount % this.ROTATION_THRESHOLD);
  }

  // Get key info for a specific request (for testing/debugging)
  getKeyForRequest(requestId: string): ApiKeyInfo | null {
    const keyId = this.requestToKeyMap.get(requestId);
    if (!keyId) {
      return null;
    }
    const key = this.apiKeys.find(key => key.id === keyId);
    return key || null;
  }

  // Debug method to check all keys status
  debugKeysStatus(): void {
    console.log('🔍 [Debug] All API Keys Status:');
    this.apiKeys.forEach((key, index) => {
      const isActive = this.activeRequests.has(key.id);
      console.log(`  ${index}: ${key.accountName}(${key.name}) - Active: ${key.isActive}, HasRequest: ${isActive}, Usage: ${key.usageCount}, Errors: ${key.errorCount}`);
    });
    console.log(`Current key index: ${this.currentKeyIndex}`);
    console.log(`Queue length: ${this.requestQueue.length}`);
    console.log(`Active requests: ${this.activeRequests.size}`);
    
    // Check if only one account is active
    const accounts = [...new Set(this.apiKeys.filter(k => k.isActive).map(k => k.accountName))];
    console.log(`📊 [Debug] Active accounts: ${accounts.join(', ')}`);
    if (accounts.length === 1) {
      console.warn(`⚠️ [Debug] Only one account active: ${accounts[0]}. Check if other accounts are disabled.`);
    }
  }
}

export const multiApiKeyService = new MultiApiKeyService();
