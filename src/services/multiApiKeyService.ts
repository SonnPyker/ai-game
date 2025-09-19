import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ApiKeyInfo {
  id: string;
  key: string;
  name: string;
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

  constructor() {
    this.loadApiKeys();
    this.initializeGemini();
  }

  // API Key Management
  addApiKey(key: string, name: string = ''): string {
    const id = Date.now().toString();
    const apiKeyInfo: ApiKeyInfo = {
      id,
      key: key.trim(),
      name: name.trim() || `API Key ${this.apiKeys.length + 1}`,
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

  getCurrentApiKey(): ApiKeyInfo | null {
    if (this.apiKeys.length === 0) return null;
    return this.apiKeys[this.currentKeyIndex];
  }

  getApiKeyStats(): ApiKeyStats {
    const activeKeys = this.apiKeys.filter(key => key.isActive);
    const totalUsage = this.apiKeys.reduce((sum, key) => sum + key.usageCount, 0);
    const totalErrors = this.apiKeys.reduce((sum, key) => sum + key.errorCount, 0);

    return {
      totalKeys: this.apiKeys.length,
      activeKeys: activeKeys.length,
      totalUsage,
      totalErrors,
      currentKeyIndex: this.currentKeyIndex
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

  private markKeySuccess(): void {
    if (this.apiKeys.length === 0) return;
    
    const currentKey = this.apiKeys[this.currentKeyIndex];
    currentKey.usageCount++;
    currentKey.lastUsed = new Date().toISOString();
    currentKey.errorCount = Math.max(0, currentKey.errorCount - 1); // Giảm error count
    
    this.saveApiKeys();
    
    // Rotate nếu đã dùng quá nhiều
    if (currentKey.usageCount % this.ROTATION_THRESHOLD === 0) {
      this.rotateToNextKey();
    }
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
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      this.isInitialized = true;
      console.log(`Initialized Gemini with key: ${currentKey.name}`);
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
      console.log(`🔍 Testing API key: ${testKey.name} (${testKey.id})`);
      
      const testGenAI = new GoogleGenerativeAI(testKey.key);
      const testModel = testGenAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
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
      
      console.log(`✅ API test ${success ? 'PASSED' : 'FAILED'} for ${testKey.name}:`, {
        duration: `${duration}ms`,
        responseLength: text.length,
        responsePreview: text.substring(0, 100)
      });
      
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
    
    console.log(`🧪 Testing all ${this.apiKeys.length} API keys...`);
    
    for (const key of this.apiKeys) {
      console.log(`Testing key ${key.name} (${key.id})...`);
      results[key.id] = await this.testApiKey(key.id);
    }
    
    const successCount = Object.values(results).filter(r => r.success).length;
    console.log(`📊 Test results: ${successCount}/${this.apiKeys.length} keys working`);
    
    return results;
  }

  // Main API Methods
  isConfigured(): boolean {
    return this.isInitialized && this.genAI !== null && this.model !== null;
  }

  hasApiKeys(): boolean {
    return this.apiKeys.length > 0;
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Không có API key nào được cấu hình hoặc tất cả đều bị lỗi');
    }

    let lastError: string = '';
    let attempts = 0;
    const maxAttempts = this.apiKeys.filter(k => k.isActive).length;
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      const currentKey = this.getCurrentApiKey();
      if (!currentKey) {
        console.error('❌ No current API key available');
        break;
      }

      try {
        console.log(`🔄 Attempting API call with key: ${currentKey.name} (attempt ${attempts + 1}/${maxAttempts})`);
        
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = await response.text();
        
        const duration = Date.now() - startTime;
        console.log(`✅ API call successful with ${currentKey.name} (${duration}ms)`);
        
        this.markKeySuccess();
        return text;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        const duration = Date.now() - startTime;
        
        console.error(`❌ API call failed with key ${currentKey.name} (${duration}ms):`, error);
        
        // Phân tích lỗi để quyết định có nên chuyển key ngay không
        const shouldSwitchImmediately = this.shouldSwitchKeyImmediately(error);
        
        if (shouldSwitchImmediately) {
          console.log(`🚨 Critical error detected, switching key immediately: ${lastError}`);
          this.markKeyError(lastError);
          
          // Chuyển sang key tiếp theo ngay lập tức
          if (!this.rotateToNextKey()) {
            console.error('❌ No more keys available to switch to');
            break;
          }
        } else {
          // Lỗi nhẹ, vẫn đánh dấu lỗi nhưng có thể thử lại
          this.markKeyError(lastError);
          
          // Thử lại với key tiếp theo
          if (!this.rotateToNextKey()) {
            console.error('❌ No more keys available to switch to');
            break;
          }
        }
        
        attempts++;
      }
    }

    const totalDuration = Date.now() - startTime;
    console.error(`💥 All API keys failed after ${totalDuration}ms. Last error: ${lastError}`);
    throw new Error(`Tất cả API keys đều bị lỗi sau ${attempts} lần thử. Lỗi cuối cùng: ${lastError}`);
  }

  private shouldSwitchKeyImmediately(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Các lỗi cần chuyển key ngay lập tức
    const criticalErrors = [
      'api_key_invalid',
      'invalid',
      'permission_denied',
      'permission',
      'quota_exceeded',
      'quota',
      'billing',
      'unauthorized',
      'forbidden',
      'authentication',
      'credential'
    ];
    
    return criticalErrors.some(criticalError => errorMessage.includes(criticalError));
  }

  // Tự động kiểm tra và chuyển key khi phát hiện vấn đề
  async autoSwitchOnError(): Promise<boolean> {
    const currentKey = this.getCurrentApiKey();
    if (!currentKey) {
      console.log('🔄 No current key to test, attempting to find working key...');
      return this.findAndSwitchToWorkingKey();
    }

    // Test key hiện tại
    console.log(`🔍 Auto-checking current key: ${currentKey.name}`);
    const testResult = await this.testApiKey(currentKey.id);
    
    if (!testResult.success) {
      console.log(`⚠️ Current key ${currentKey.name} failed auto-test: ${testResult.error}`);
      return this.findAndSwitchToWorkingKey();
    }
    
    console.log(`✅ Current key ${currentKey.name} is working fine`);
    return true;
  }

  // Tìm và chuyển sang key đang hoạt động
  private async findAndSwitchToWorkingKey(): Promise<boolean> {
    const activeKeys = this.apiKeys.filter(k => k.isActive);
    console.log(`🔍 Searching for working key among ${activeKeys.length} active keys...`);
    
    for (const key of activeKeys) {
      console.log(`🧪 Testing key: ${key.name}`);
      const testResult = await this.testApiKey(key.id);
      
      if (testResult.success) {
        console.log(`✅ Found working key: ${key.name}, switching to it`);
        this.currentKeyIndex = this.apiKeys.findIndex(k => k.id === key.id);
        this.initializeGemini();
        return true;
      } else {
        console.log(`❌ Key ${key.name} failed: ${testResult.error}`);
      }
    }
    
    console.error('💥 No working keys found!');
    return false;
  }

  // Method để force switch sang key khác (có thể gọi từ UI)
  async forceSwitchToNextKey(): Promise<boolean> {
    console.log('🔄 Force switching to next key...');
    
    if (this.rotateToNextKey()) {
      console.log(`✅ Switched to key: ${this.getCurrentApiKey()?.name}`);
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
}

export const multiApiKeyService = new MultiApiKeyService();
