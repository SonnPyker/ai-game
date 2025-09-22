import { GoogleGenerativeAI } from '@google/generative-ai';
import { multiApiKeyService, ApiKeyInfo, ApiKeyStats } from './multiApiKeyService';
import { SCCSummary, SCCState } from '../types';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private useMultiKeyService: boolean = true;

  constructor() {
    this.initializeGemini();
  }

  private initializeGemini() {
    if (this.useMultiKeyService && multiApiKeyService.isConfigured()) {
      // Use multi-key service - no need to store genAI and model locally
      // They will be accessed through multiApiKeyService.generateContent()
    } else {
      // Fallback to single key
      const apiKey = localStorage.getItem('gemini_api_key');
      if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      }
    }
  }

  setApiKey(apiKey: string) {
    if (this.useMultiKeyService) {
      multiApiKeyService.addApiKey(apiKey, 'Default Key');
    } else {
      localStorage.setItem('gemini_api_key', apiKey);
    }
    this.initializeGemini();
  }

  isConfigured(): boolean {
    if (this.useMultiKeyService) {
      return multiApiKeyService.isConfigured();
    }
    return this.genAI !== null && this.model !== null;
  }

  hasApiKey(): boolean {
    if (this.useMultiKeyService) {
      return multiApiKeyService.isConfigured();
    }
    return localStorage.getItem('gemini_api_key') !== null;
  }

  clearApiKey() {
    if (this.useMultiKeyService) {
      multiApiKeyService.clearAllApiKeys();
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    this.genAI = null;
    this.model = null;
  }

  async testApiKey(keyId?: string): Promise<{ success: boolean; error?: string; details?: any }> {
    if (this.useMultiKeyService) {
      return await multiApiKeyService.testApiKey(keyId);
    }
    
    if (!this.isConfigured()) {
      return { 
        success: false, 
        error: 'API key chưa được cấu hình',
        details: { mode: 'single', configured: false }
      };
    }

    const startTime = Date.now();
    
    try {
      console.log('🔍 Testing single API key...');
      
      const result = await this.generateContent('Xin chào, hãy trả lời "OK"');
      const duration = Date.now() - startTime;
      
      const success = result.length > 0;
      
      console.log(`✅ Single API test ${success ? 'PASSED' : 'FAILED'}:`, {
        duration: `${duration}ms`,
        responseLength: result.length
      });
      
      return { 
        success, 
        details: { 
          duration: `${duration}ms`,
          responseLength: result.length,
          mode: 'single'
        }
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = this.getDetailedErrorMessage(error);
      
      console.error('❌ Single API test FAILED:', {
        error: errorMessage,
        duration: `${duration}ms`
      });
      
      return { 
        success: false, 
        error: errorMessage,
        details: { 
          duration: `${duration}ms`,
          mode: 'single',
          errorType: error.constructor.name
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

  // Multi API Key methods
  getApiKeys(): ApiKeyInfo[] {
    if (this.useMultiKeyService) {
      return multiApiKeyService.getApiKeys();
    }
    return [];
  }

  getApiKeyStats(): ApiKeyStats {
    if (this.useMultiKeyService) {
      return multiApiKeyService.getApiKeyStats();
    }
    return {
      totalKeys: 0,
      activeKeys: 0,
      totalUsage: 0,
      totalErrors: 0,
      currentKeyIndex: 0
    };
  }

  addApiKey(key: string, name: string): string {
    if (this.useMultiKeyService) {
      return multiApiKeyService.addApiKey(key, name);
    } else {
      this.setApiKey(key);
      return 'default';
    }
  }

  removeApiKey(keyId: string): void {
    if (this.useMultiKeyService) {
      multiApiKeyService.removeApiKey(keyId);
    }
  }

  updateApiKey(keyId: string, updates: any): void {
    if (this.useMultiKeyService) {
      multiApiKeyService.updateApiKey(keyId, updates);
    }
  }

  async testAllApiKeys(): Promise<{ [keyId: string]: { success: boolean; error?: string; details?: any } }> {
    if (this.useMultiKeyService) {
      return await multiApiKeyService.testAllApiKeys();
    }
    return {};
  }

  resetKeyErrors(): void {
    if (this.useMultiKeyService) {
      multiApiKeyService.resetKeyErrors();
    }
  }

  getCurrentKeyInfo(): ApiKeyInfo | null {
    if (this.useMultiKeyService) {
      return multiApiKeyService.getCurrentApiKey();
    }
    return this.hasApiKey() ? { 
      id: 'default', 
      name: 'Default Key',
      key: '',
      isActive: true,
      lastUsed: new Date().toISOString(),
      usageCount: 0,
      errorCount: 0,
      createdAt: new Date().toISOString()
    } : null;
  }

  getNextRotationIn(): number {
    if (this.useMultiKeyService) {
      return multiApiKeyService.getNextRotationIn();
    }
    return 10;
  }

  // Auto-switch methods
  async autoSwitchOnError(): Promise<boolean> {
    if (this.useMultiKeyService) {
      return await multiApiKeyService.autoSwitchOnError();
    }
    return false;
  }

  async forceSwitchToNextKey(): Promise<boolean> {
    if (this.useMultiKeyService) {
      return await multiApiKeyService.forceSwitchToNextKey();
    }
    return false;
  }

  // Mode switching
  setUseMultiKeyService(useMulti: boolean): void {
    this.useMultiKeyService = useMulti;
    this.initializeGemini();
  }

  isUsingMultiKeyService(): boolean {
    return this.useMultiKeyService;
  }

  async generateContent(prompt: string): Promise<string> {
    if (this.useMultiKeyService) {
      try {
        return await multiApiKeyService.generateContent(prompt);
      } catch (error) {
        console.error('Multi-key service error:', error);
        
        // Thử auto-switch khi có lỗi
        console.log('🔄 Attempting auto-switch due to error...');
        try {
          const switchSuccess = await this.autoSwitchOnError();
          if (switchSuccess) {
            console.log('✅ Auto-switch successful, retrying...');
            return await multiApiKeyService.generateContent(prompt);
          }
        } catch (switchError) {
          console.error('❌ Auto-switch failed:', switchError);
        }
        
        throw error;
      }
    }
    
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Không thể tạo nội dung. Vui lòng thử lại.');
    }
  }

  async generateWorldDescription(theme: string, setting: string, tone: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `
    Tạo một mô tả thế giới fantasy chi tiết cho game roleplay với các thông tin sau:
    - Chủ đề: ${theme}
    - Bối cảnh: ${setting}
    - Tông màu: ${tone}
    
    Viết dưới dạng văn xuôi tự nhiên như một đoạn tiểu thuyết. Không sử dụng:
    - Icon (emoji)
    - Gạch đầu dòng
    - Số thứ tự
    - Tiêu đề hoặc heading
    - Ký hiệu đặc biệt ngoài văn bản
    
    Thay vào đó: Viết thành các đoạn văn liền mạch, văn phong miêu tả, giống tiểu thuyết. Nếu cần tách ý, chỉ xuống dòng tạo đoạn văn mới, không dùng ký hiệu nào khác.
    
    Hãy tạo một thế giới hấp dẫn với mô tả tổng quan về thế giới, các địa điểm thú vị, những bí mật và thử thách, khí quyển và không khí của thế giới.
    
    Viết bằng tiếng Việt, dài khoảng 200-300 từ, phù hợp cho game roleplay.
    `;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      console.error('Lỗi khi tạo thế giới:', error);
      throw new Error('Không thể tạo thế giới. Vui lòng kiểm tra API key và thử lại.');
    }
  }

  async generateCharacterBackstory(
    name: string,
    race: string,
    characterClass: string,
    personality: string,
    worldContext: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `
    Tạo câu chuyện nền chi tiết cho nhân vật roleplay với thông tin:
    - Tên: ${name}
    - Chủng tộc: ${race}
    - Nghề nghiệp: ${characterClass}
    - Tính cách: ${personality}
    - Bối cảnh thế giới: ${worldContext}
    
    Hãy tạo một câu chuyện nền hấp dẫn bao gồm:
    1. Quá khứ và xuất thân
    2. Động cơ và mục tiêu
    3. Mối quan hệ và kết nối
    4. Những trải nghiệm đặc biệt
    5. Điểm mạnh và điểm yếu
    
    Viết bằng tiếng Việt, dài khoảng 200-400 từ, phù hợp cho game roleplay.
    `;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      console.error('Lỗi khi tạo câu chuyện nền:', error);
      throw new Error('Không thể tạo câu chuyện nền. Vui lòng kiểm tra API key và thử lại.');
    }
  }

  async generateGameScenario(
    character: any,
    worldDescription: string,
    currentSituation: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `
    Tạo một tình huống game roleplay dựa trên:
    - Nhân vật: ${character.name} (${character.race.name} ${character.class.name})
    - Thế giới: ${worldDescription}
    - Tình huống hiện tại: ${currentSituation}
    
    Viết dưới dạng văn xuôi tự nhiên như một đoạn tiểu thuyết. Không sử dụng:
    - Icon (emoji)
    - Gạch đầu dòng
    - Số thứ tự
    - Tiêu đề hoặc heading
    - Ký hiệu đặc biệt ngoài văn bản
    
    Thay vào đó: Viết thành các đoạn văn liền mạch, văn phong miêu tả, giống tiểu thuyết. Nếu cần tách ý, chỉ xuống dòng tạo đoạn văn mới, không dùng ký hiệu nào khác.
    
    Hãy tạo một tình huống hấp dẫn với mô tả môi trường xung quanh, những nhân vật NPC có thể gặp, các lựa chọn và thử thách, những bí mật hoặc manh mối.
    
    Viết bằng tiếng Việt, dài khoảng 150-300 từ, phù hợp cho game roleplay.
    `;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      console.error('Lỗi khi tạo tình huống game:', error);
      throw new Error('Không thể tạo tình huống game. Vui lòng kiểm tra API key và thử lại.');
    }
  }

  async generateCharacterSuggestions(
    race: string,
    characterClass: string,
    worldTheme: string
  ): Promise<{
    name: string;
    personality: string;
    backstory: string;
    goals: string[];
  }> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `
    Tạo gợi ý nhân vật roleplay cho:
    - Chủng tộc: ${race}
    - Nghề nghiệp: ${characterClass}
    - Chủ đề thế giới: ${worldTheme}
    
    Hãy trả về JSON với format:
    {
      "name": "Tên nhân vật",
      "personality": "Mô tả tính cách",
      "backstory": "Câu chuyện nền ngắn gọn",
      "goals": ["Mục tiêu 1", "Mục tiêu 2", "Mục tiêu 3"]
    }
    
    Viết bằng tiếng Việt, phù hợp cho game roleplay.
    `;

    try {
      const text = await this.generateContent(prompt);
      
      // Cố gắng parse JSON từ response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        // Fallback: Không thể parse JSON, trả về response thô
      }
      
      // Fallback nếu không parse được JSON
      return {
        name: "Nhân vật được đề xuất",
        personality: text.substring(0, 100) + "...",
        backstory: text.substring(100, 300) + "...",
        goals: ["Khám phá thế giới", "Tìm kiếm vinh quang", "Bảo vệ người vô tội"]
      };
    } catch (error) {
      console.error('Lỗi khi tạo gợi ý nhân vật:', error);
      throw new Error('Không thể tạo gợi ý nhân vật. Vui lòng kiểm tra API key và thử lại.');
    }
  }

  // World Builder methods
  async generateCoreIdea(coreIdea: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `Phát triển ý tưởng "${coreIdea}" thành concept thế giới hoàn chỉnh. Viết văn xuôi tự nhiên, không dùng bullet/số thứ tự/ký hiệu đặc biệt. Chỉ xuống dòng tạo đoạn văn mới. 150-200 từ tiếng Việt.`;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      console.error('Lỗi khi tạo ý tưởng cốt lõi:', error);
      throw new Error('Không thể tạo ý tưởng cốt lõi. Vui lòng thử lại.');
    }
  }

  async generateGenreAndSetting(coreIdea: string): Promise<{genre: string, setting: string}> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `Bạn là AI hỗ trợ xây dựng thế giới game roleplay.
Nhiệm vụ: từ ý tưởng cốt lõi, hãy xác định thể loại và bối cảnh phù hợp.

Ý tưởng cốt lõi: "${coreIdea}"

Yêu cầu:
- Thể loại: Xác định các thể loại chính (Fantasy, Sci-fi, Horror, Steampunk, Cyberpunk, Post-apocalyptic, Historical, Modern, etc.)
- Bối cảnh: Mô tả địa điểm và thời gian xảy ra (ví dụ: "Thành phố cổ đại Hy Lạp năm 300 TCN", "Trạm không gian năm 2157", "Làng quê Việt Nam thập niên 1990")

Xuất ra JSON đúng SCHEMA, không thêm văn bản ngoài JSON:
{
  "genre": "tên thể loại",
  "setting": "mô tả bối cảnh địa điểm và thời gian"
}`;

    try {
      const response = await this.generateContent(prompt);
      
      // Parse JSON response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(response);
      } catch (parseError) {
        console.error('Lỗi parse JSON genre and setting:', parseError);
        throw new Error('Không thể phân tích thể loại và bối cảnh. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi khi tạo thể loại và bối cảnh:', error);
      throw new Error('Không thể tạo thể loại và bối cảnh. Vui lòng thử lại.');
    }
  }

  async generateCorePrinciples(coreIdea: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `Bạn là AI hỗ trợ xây dựng thế giới game roleplay.

Nhiệm vụ: từ bối cảnh sau, hãy tạo ra chính xác 5 nguyên tắc cốt lõi quan trọng nhất.
Mỗi nguyên tắc phải có:
- id: một chuỗi duy nhất
- name: tên nguyên tắc (ngắn gọn, dễ nhớ)
- description: mô tả súc tích 2-4 câu, giàu hình ảnh

Bối cảnh: "${coreIdea}"

Xuất ra JSON đúng schema sau, không thêm văn bản ngoài JSON:
[
  {
    "id": "string",
    "name": "string", 
    "description": "string"
  }
]`;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      console.error('Lỗi khi tạo nguyên tắc cốt lõi:', error);
      throw new Error('Không thể tạo nguyên tắc cốt lõi. Vui lòng thử lại.');
    }
  }

  async generateFoundationEntities(coreIdea: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `Bạn là AI hỗ trợ xây dựng thế giới game roleplay.

Nhiệm vụ: từ bối cảnh sau, hãy tạo ra chính xác 5 thực thể nền tảng quan trọng nhất.
Yêu cầu: mỗi loại phải có đúng 1 thực thể:
- 1 Nhân vật chủ chốt trong cốt truyện  (NPC - Non-Player Character, KHÔNG phải người chơi)
- 1 Địa điểm  
- 1 Phe phái
- 1 Vật phẩm
- 1 Truyền thuyết

Mỗi thực thể phải có:
- id: một chuỗi duy nhất
- name: tên thực thể (ngắn gọn, dễ nhớ)
- description: mô tả súc tích 2-4 câu, giàu hình ảnh
- type: chỉ chọn 1 trong các loại ["Nhân vật", "Địa điểm", "Phe phái", "Vật phẩm", "Truyền thuyết"]

Lưu ý quan trọng về "Nhân vật":
- Nhân vật ở đây là NPC (Non-Player Character) - nhân vật trong thế giới game
- KHÔNG phải người chơi (player character)
- Có thể là: thầy phù thủy, hiệp sĩ, thương nhân, lãnh chúa, phản diện, v.v.
- Là những nhân vật mà người chơi sẽ tương tác trong game

Bối cảnh: "${coreIdea}"

Xuất ra JSON đúng schema sau, không thêm văn bản ngoài JSON:
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "type": "Nhân vật | Địa điểm | Phe phái | Vật phẩm | Truyền thuyết"
  }
]`;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      console.error('Lỗi khi tạo thực thể nền tảng:', error);
      throw new Error('Không thể tạo thực thể nền tảng. Vui lòng thử lại.');
    }
  }

  // Character Creation methods
  async analyzeCharacterDescription(description: string, worldContext?: any): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    // Prepare world context information
    const worldInfo = worldContext ? `
THÔNG TIN THẾ GIỚI (để tham khảo khi suy luận):
- Tên thế giới: ${worldContext.worldTitle || 'Chưa có'}
- Tóm tắt: ${worldContext.summary || 'Chưa có'}
- Thể loại: ${Array.isArray(worldContext.genres) ? worldContext.genres.join(', ') : worldContext.genres || 'Chưa có'}
- Bối cảnh: ${Array.isArray(worldContext.settings) ? worldContext.settings.join(', ') : worldContext.settings || 'Chưa có'}
- Hệ thống sức mạnh: ${worldContext.system?.powerOrTech || 'Chưa có'}
- Phe phái chính: ${worldContext.factions?.map((f: any) => f.name).join(', ') || 'Chưa có'}
- Địa điểm quan trọng: ${worldContext.locations?.map((l: any) => l.name).join(', ') || 'Chưa có'}
- Xung đột chính: ${worldContext.dangerAndConflict?.join(', ') || 'Chưa có'}
` : '';

    const prompt = `Bạn là AI hỗ trợ tạo nhân vật cho game roleplay.
Nhiệm vụ: phân tích mô tả của người chơi, điền vào toàn bộ form nhân vật.
Nếu trường không có trong mô tả, hãy tự suy luận hợp lý DỰA TRÊN THÔNG TIN THẾ GIỚI.
Xuất ra JSON đúng SCHEMA, không thêm văn bản ngoài JSON.

${worldInfo}

Mô tả nhân vật của người chơi:
${description}

SCHEMA:
{
  "name": "",
  "gender": "",
  "appearance": "",
  "personalitySummary": "",
  "backstory": "",
  "traits": ["", ""],
  "skills": [
    {"name": "", "level": 1, "energyCost": 5, "description": ""}
  ],
  "coreStats": {
    "str": {"score": 10, "mod": 0, "reason": ""},
    "dex": {"score": 10, "mod": 0, "reason": ""},
    "int": {"score": 10, "mod": 0, "reason": ""},
    "con": {"score": 10, "mod": 0, "reason": ""},
    "wis": {"score": 10, "mod": 0, "reason": ""},
    "cha": {"score": 10, "mod": 0, "reason": ""}
  },
  "derived": {
    "hpMax": 10,
    "energyMax": 10
  },
  "customStats": [
    {"name": "", "value": 0}
  ]
}

Yêu cầu bổ sung:
- Tự tính "mod" = floor((score - 10)/2).
- "hpMax" = 100 + (coreStats.con.mod * 5)
- "energyMax" = 100 + (coreStats.int.mod + coreStats.wis.mod) * 5
- Nếu thiếu dữ liệu để quyết định, SUY LUẬN DỰA TRÊN THÔNG TIN THẾ GIỚI và ghi "reason".
- Traits: 3–5 đặc điểm tính cách của con người.
- Skills: chính xác 3 kỹ năng phù hợp với thế giới, mô tả và hệ thống sức mạnh.
- Description: mô tả ngắn gọn 1-2 câu về cách sử dụng và hiệu quả của kỹ năng.
- EnergyCost: tính dựa trên level skill (level 1: 5-10, level 2: 10-15, level 3: 15-25, level 4: 25-35, level 5: 35-50).
- Tên nhân vật: nếu không có, tạo tên phù hợp với thể loại và bối cảnh thế giới.
- Backstory: nếu thiếu, tạo câu chuyện phù hợp với thế giới và xung đột.
- Không xuất gì ngoài JSON.`;

    try {
      const responseText = await this.generateContent(prompt);
      
      // Try to parse JSON from response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
      }
      
      // Fallback if JSON parsing fails
      return {
        name: '',
        gender: '',
        appearance: '',
        personalitySummary: '',
        backstory: '',
        traits: [],
        skills: [],
        coreStats: {
          str: { score: 10, mod: 0, reason: 'Default value' },
          dex: { score: 10, mod: 0, reason: 'Default value' },
          int: { score: 10, mod: 0, reason: 'Default value' },
          con: { score: 10, mod: 0, reason: 'Default value' },
          wis: { score: 10, mod: 0, reason: 'Default value' },
          cha: { score: 10, mod: 0, reason: 'Default value' }
        },
        derived: {
          hpMax: 100,
          energyMax: 100
        },
        customStats: []
      };
    } catch (error) {
      console.error('Lỗi khi phân tích nhân vật:', error);
      throw new Error('Không thể phân tích nhân vật. Vui lòng thử lại.');
    }
  }

  async suggestCharacterStats(characterData: any, worldContext?: any): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    // Prepare world context information
    const worldInfo = worldContext ? `
THÔNG TIN THẾ GIỚI (để tham khảo khi đề xuất):
- Tên thế giới: ${worldContext.worldTitle || 'Chưa có'}
- Thể loại: ${Array.isArray(worldContext.genres) ? worldContext.genres.join(', ') : worldContext.genres || 'Chưa có'}
- Bối cảnh: ${Array.isArray(worldContext.settings) ? worldContext.settings.join(', ') : worldContext.settings || 'Chưa có'}
- Hệ thống sức mạnh: ${worldContext.system?.powerOrTech || 'Chưa có'}
- Phe phái chính: ${worldContext.factions?.map((f: any) => f.name).join(', ') || 'Chưa có'}
- Xung đột chính: ${worldContext.dangerAndConflict?.join(', ') || 'Chưa có'}
` : '';

    const prompt = `
Dựa trên thông tin nhân vật và thế giới sau, hãy đề xuất chỉ số phù hợp:

${worldInfo}

THÔNG TIN NHÂN VẬT:
Tên: ${characterData.name || 'Chưa có'}
Giới tính: ${characterData.gender || 'Chưa có'}
Ngoại hình: ${characterData.appearance || 'Chưa có'}
Tính cách: ${characterData.personality || 'Chưa có'}
Tiểu sử: ${characterData.backstory || 'Chưa có'}
Đặc điểm: ${characterData.personalityTraits?.join(', ') || 'Chưa có'}

Hãy đề xuất chỉ số từ 1-20 cho 6 thuộc tính cơ bản (Strength, Agility, Intelligence, Constitution, Wisdom, Charisma) và một số kỹ năng thành thạo phù hợp với THẾ GIỚI và nhân vật.

Trả về JSON theo format:
{
  "coreStats": {
    "strength": 10-20,
    "agility": 10-20,
    "intelligence": 10-20,
    "constitution": 10-20,
    "wisdom": 10-20,
    "charisma": 10-20
  },
  "customStats": [
    {"name": "Tên chỉ số", "value": 10-20}
  ],
  "proficiencies": [
    {"name": "Tên kỹ năng", "level": 1-10, "energyCost": 5-50, "description": "Mô tả kỹ năng"}
  ]
}

Chỉ trả về JSON, không có text khác.`;

    try {
      const responseText = await this.generateContent(prompt);
      
      // Try to parse JSON from response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
      }
      
      // Fallback
      return {
        coreStats: {
          strength: 12,
          agility: 12,
          intelligence: 12,
          constitution: 12,
          wisdom: 12,
          charisma: 12
        },
        customStats: [],
        proficiencies: []
      };
    } catch (error) {
      console.error('Lỗi khi đề xuất chỉ số:', error);
      throw new Error('Không thể đề xuất chỉ số. Vui lòng thử lại.');
    }
  }

  async rerollCharacterSkills(characterData: any, worldContext?: any): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    // Prepare world context information
    const worldInfo = worldContext ? `
THÔNG TIN THẾ GIỚI (để tham khảo khi tạo skills):
- Tên thế giới: ${worldContext.worldTitle || 'Chưa có'}
- Thể loại: ${Array.isArray(worldContext.genres) ? worldContext.genres.join(', ') : worldContext.genres || 'Chưa có'}
- Bối cảnh: ${Array.isArray(worldContext.settings) ? worldContext.settings.join(', ') : worldContext.settings || 'Chưa có'}
- Hệ thống sức mạnh: ${worldContext.system?.powerOrTech || 'Chưa có'}
- Phe phái chính: ${worldContext.factions?.map((f: any) => f.name).join(', ') || 'Chưa có'}
- Xung đột chính: ${worldContext.dangerAndConflict?.join(', ') || 'Chưa có'}
` : '';

    const prompt = `Tạo 3 kỹ năng mới cho nhân vật dựa trên thông tin:

${worldInfo}

THÔNG TIN NHÂN VẬT:
Tên: ${characterData.name || 'N/A'}
Giới tính: ${characterData.gender || 'N/A'}
Ngoại hình: ${characterData.appearance || 'N/A'}
Tính cách: ${characterData.personalitySummary || 'N/A'}
Tiểu sử: ${characterData.backstory || 'N/A'}
Đặc điểm: ${characterData.personalityTraits?.join(', ') || 'N/A'}

JSON:
{
  "skills": [
    {"name": "", "level": 1-5, "energyCost": 5-50, "description": ""},
    {"name": "", "level": 1-5, "energyCost": 5-50, "description": ""},
    {"name": "", "level": 1-5, "energyCost": 5-50, "description": ""}
  ]
}

Rules:
- Chính xác 3 skills
- Level random 1-5
- EnergyCost: level 1: 5-10, level 2: 10-15, level 3: 15-25, level 4: 25-35, level 5: 35-50
- Skills phù hợp với thế giới và nhân vật
- Description: mô tả ngắn gọn 1-2 câu về cách sử dụng và hiệu quả
- Chỉ xuất JSON.`;

    try {
      const responseText = await this.generateContent(prompt);
      
      // Try to parse JSON from response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
      }

      // Fallback if JSON parsing fails
      return {
        skills: [
          { name: 'Kỹ năng cơ bản', level: 1, energyCost: 5, description: 'Kỹ năng cơ bản có thể sử dụng trong nhiều tình huống' },
          { name: 'Kỹ năng trung bình', level: 2, energyCost: 12, description: 'Kỹ năng trung bình với hiệu quả tốt hơn' },
          { name: 'Kỹ năng nâng cao', level: 3, energyCost: 20, description: 'Kỹ năng nâng cao với sức mạnh đáng kể' }
        ]
      };
    } catch (error) {
      console.error('Lỗi khi reroll skills:', error);
      throw new Error('Không thể tạo skills mới. Vui lòng thử lại.');
    }
  }

  async generateCompleteWorld(worldData: any): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    // Thu thập dữ liệu từ form
    const coreIdea = worldData.coreIdea || '';
    const genres = Array.isArray(worldData.genres) ? worldData.genres.join(', ') : (worldData.genre || '');
    const settings = Array.isArray(worldData.settings) ? worldData.settings.join(', ') : (worldData.setting || '');
    const storyArc = worldData.storyTone || '';
    const rules = Array.isArray(worldData.corePrinciples) ? worldData.corePrinciples.map((p: any) => p.name || p).join(', ') : '';
    const baseEntities = Array.isArray(worldData.foundationEntities) ? worldData.foundationEntities.map((e: any) => `${e.name} (${e.classification || 'Nhân vật'})`).join(', ') : '';
    const currencies = Array.isArray(worldData.currencies) ? worldData.currencies.map((c: any) => c.name || c).join(', ') : '';
    const startYear = worldData.startYear || '';
    const difficulty = worldData.difficulty || '';
    const useLevel = worldData.useLevel || false;
    const pov = worldData.narration || '';

    const prompt = `Bạn là AI worldbuilder cho game roleplay. 
Từ dữ liệu người chơi nhập bên dưới, hãy tổng hợp thành một "hồ sơ thế giới" hoàn chỉnh và một đoạn mở đầu theo văn xuôi. 
Được phép SUY LUẬN HỢP LÝ để lấy từ các trường phù hợp và điền các trường trống, nhưng tránh mâu thuẫn với dữ liệu có sẵn. 
Ngôn ngữ: Tiếng Việt.

QUY TẮC ĐỊNH DẠNG:
- Chỉ xuất JSON đúng SCHEMA ở cuối; không thêm lời dẫn hay giải thích ngoài JSON.
- Trường narrativeOpening phải là văn xuôi liền mạch (không bullet, không emoji, không tiêu đề).
- Nội dung còn lại có cấu trúc theo schema.

DỮ LIỆU NGƯỜI CHƠI:
- Ý tưởng cốt lõi (coreIdea): ${coreIdea}
- Thể loại (genres): ${genres}
- Bối cảnh (settings): ${settings}
- Tổng truyện/Chủ đề (storyArc): ${storyArc}
- Ngôi kể (pov): ${pov}
- Nguyên tắc cốt lõi (rules): ${rules}
- Thực thể nền tảng ban đầu (baseEntities): ${baseEntities}
- Tiền tệ (currencies): ${currencies}
- Năm bắt đầu (startYear): ${startYear}
- Độ khó (difficulty): ${difficulty}
- Sử dụng cấp độ (useLevel): ${useLevel}

YÊU CẦU NỘI DUNG:
1) Tổng quan thế giới ngắn gọn, nhất quán với coreIdea/genres/settings.
2) Mô tả hệ thống cốt lõi: công nghệ/phép thuật/sức mạnh, quy tắc siêu nhiên (nếu có).
3) Ẩn hoạ & xung đột chủ đạo.

TỰ SUY LUẬN KHI THIẾU:
- Nếu trường trống, hãy chọn giá trị hợp lý dựa theo thể loại/bối cảnh.
- Tôn trọng tone/thể loại người chơi chọn (ví dụ bí ẩn siêu nhiên, cyberpunk…).

SCHEMA JSON (bắt buộc):
{
  "worldTitle": "string",
  "summary": "string",
  "genres": ["string"],
  "settings": ["string"],
  "rules": ["string"],
  "system": {
    "powerOrTech": "string",
    "limitations": ["string"]
  },
  "timeline": [
    {"year": "string", "event": "string"}
  ],
  "factions": [
    {"name": "string", "goal": "string", "methods": "string", "weakness": "string"}
  ],
  "locations": [
    {"name": "string", "description": "string", "role": "string"}
  ],
  "keyEntities": [
    {"name": "string", "type": "Nhân vật|Vật phẩm|Hiện tượng", "description": "string", "hook": "string"}
  ],
  "economy": {
    "currencies": ["string"],
    "notes": "string"
  },
  "dangerAndConflict": ["string"],
  "plotHooks": ["string"],
  "starterQuest": {
    "title": "string",
    "objective": "string",
    "steps": ["string"],
    "reward": "string"
  },
  "leveling": {
    "enabled": ${useLevel},
    "progression": "string",
    "caps": "string",
    "effects": ["string"]
  },
  "narrativeOpening": "string"
}`;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      console.error('Lỗi khi tạo thế giới hoàn chỉnh:', error);
      throw new Error('Không thể tạo thế giới. Vui lòng thử lại.');
    }
  }

  // Roleplay Methods
  async generateScenarioSkeleton(worldJson: string, characterJson: string): Promise<any> {
    try {
      const prompt = `Bạn là AI Worldbuilder & Narrative Designer cho game roleplay.
Từ WORLD và CHARACTER dưới đây, hãy tạo một KHUNG SƯỜN CỐT TRUYỆN hoàn chỉnh.
Cân bằng: bí ẩn-siêu nhiên + tự do người chơi + tính nhất quán thế giới.
Chỉ xuất JSON đúng SCHEMA, không thêm văn bản ngoài JSON.

WORLD:
${worldJson}

CHARACTER:
${characterJson}

SCHEMA:
{
  "title": "string",
  "logline": "string",
  "tone": ["mysterious","noir","supernatural"],
  "themes": ["string"],
  "continuityRules": ["quy tắc thế giới cần giữ nhất quán"],
  "mainThreads": ["luồng cốt truyện chính (gọn)"],
  "arcs": [
    {
      "act": 1,
      "goal": "mục tiêu của act",
      "keyBeats": ["3–6 tình tiết quan trọng"],
      "obstacles": ["trở ngại"],
      "twist": "plot twist (nếu có)",
      "outcomeHint": "gợi ý kết cục có/không thành"
    },
    { "act": 2, "goal": "mục tiêu của act", "keyBeats": ["3–6 tình tiết quan trọng"], "obstacles": ["trở ngại"], "twist": "plot twist (nếu có)", "outcomeHint": "gợi ý kết cục có/không thành" },
    { "act": 3, "goal": "mục tiêu của act", "keyBeats": ["3–6 tình tiết quan trọng"], "obstacles": ["trở ngại"], "twist": "plot twist (nếu có)", "outcomeHint": "gợi ý kết cục có/không thành" }
  ],
  "failStates": ["những tình huống dẫn tới thất bại (không chết cứng, cho phép cứu vãn)"],
  "endings": {
    "good": "mô tả kết thúc tích cực khả dĩ",
    "neutral": "mô tả kết thúc trung tính",
    "bad": "mô tả kết thúc tiêu cực khả dĩ"
  },
  "openingSeed": "tình huống mở đầu cô đọng để dùng cho lời mở đầu"
}`;

      const response = await this.generateContent(prompt);
      
      // Parse JSON response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(response);
      } catch (parseError) {
        console.error('Lỗi parse JSON scenario:', parseError);
        throw new Error('Không thể phân tích kịch bản. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi khi tạo scenario skeleton:', error);
      throw new Error('Không thể tạo kịch bản. Vui lòng thử lại.');
    }
  }

  async generateOpeningNarrative(worldJson: string, characterJson: string, scenarioJson: string): Promise<string> {
    try {
      const prompt = `Bạn là AI Storyteller. Hãy viết đoạn mở đầu cho phiên roleplay, dựa trên WORLD, CHARACTER, và SCENARIO_SKELETON.
Yêu cầu:
- Văn xuôi liền mạch 180–300 từ, góc nhìn theo "pov" của world/character (nếu có).
- Không bullet/emoji/tiêu đề; chỉ văn bản kể chuyện.
- Dùng "openingSeed" trong kịch bản làm mồi.
- Gợi không khí, đặt vấn đề, hé lộ nguy cơ, kết bằng một tình huống mời người chơi hành động.

WORLD:
${worldJson}

CHARACTER:
${characterJson}

SCENARIO_SKELETON:
${scenarioJson}

Chỉ xuất văn xuôi, không thêm lời dẫn.`;

      const response = await this.generateContent(prompt);
      return response.trim();
    } catch (error) {
      console.error('Lỗi khi tạo opening narrative:', error);
      throw new Error('Không thể tạo lời mở đầu. Vui lòng thử lại.');
    }
  }

  async summarizeChatContext(
    worldJson: string,
    characterJson: string,
    scenarioJson: string,
    summaryOld: SCCSummary,
    sceneState: SCCState,
    recentTurns: Array<{ role: string; content: string }>
  ): Promise<{ summary: SCCSummary; sceneState: SCCState }> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `Bạn là AI "Context Compressor" cho phiên roleplay. 
Nhiệm vụ: NÉN cuộc trò chuyện thành một bản tóm tắt ngắn gọn nhưng giữ tính liên tục và hook cốt truyện.

Đầu vào:
- WORLD (rút gọn): ${worldJson}
- CHARACTER: ${characterJson}
- SCENARIO_SKELETON: ${scenarioJson}
- SUMMARY_OLD (có thể rỗng): ${JSON.stringify(summaryOld)}
- SCENE_STATE (hiện tại): ${JSON.stringify(sceneState)}
- TURNS_RECENT (20–40 tin kể từ lần tóm tắt trước): ${JSON.stringify(recentTurns)}

Yêu cầu:
- Không viết lại toàn bộ truyện; chỉ nén những gì đã xảy ra và các mỏ neo cốt truyện.
- Nêu rõ các manh mối đang mở, rủi ro, mục tiêu hiện tại, các mốc thời gian/quãng đường đã đi.
- Tôn trọng continuityRules trong SCENARIO_SKELETON.
- Xuất đúng JSON theo SCHEMA, không thêm văn bản ngoài JSON.

SCHEMA:
{
  "summary": {
    "recap": "5–10 câu văn xuôi; không bullet, không emoji.",
    "timeline": [{"when":"string","what":"string"}],
    "clues": ["string"],
    "openThreads": ["string"],
    "relationships": [{"npc":"string","status":"string","notes":"string"}],
    "goals": [{"pcGoal":"string","actGoal":"string"}],
    "risks": ["string"]
  },
  "sceneState": {
    "location": "string",
    "npcs": [{"name":"string","state":"string"}],
    "inventory": [{"name":"string","qty":1}],
    "clocks": [{"name":"string","value":2,"max":6}],
    "flags": {"key": true}
  }
}`;

    try {
      const responseText = await this.generateContent(prompt);
      
      // Parse JSON response
      let result;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse summary JSON:', parseError);
        console.log('Raw response:', responseText);
        throw new Error('Không thể phân tích kết quả tóm tắt từ AI.');
      }

      return {
        summary: result.summary,
        sceneState: result.sceneState
      };
    } catch (error) {
      console.error('Error summarizing chat context:', error);
      throw error;
    }
  }

  async generateTurnResponse(
    chatHistory: Array<{role: string, content: string}>,
    playerAction: string,
    worldJson: string,
    characterJson: string,
    scenarioJson: string,
    sceneState: any = {}
  ): Promise<any> {
    try {
      const chatHistorySnippet = chatHistory.slice(-10).map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const prompt = `Bạn là AI Storyteller trong box chat roleplay. Nhiệm vụ:
- Đọc lịch sử chat gần đây, hành động mới của người chơi, world/character và scenarioSkeleton.
- Kể tiếp bằng văn xuôi (không bullet/emoji), mô tả hệ quả và cảm giác, đưa chi tiết cảm quan.
- GIỮ NHẤT QUÁN theo continuityRules, tone, mainThreads.
- Định hướng mềm (soft guidance) để tiến tới các keyBeats/twist/kết thúc, nhưng KHÔNG tước tự do người chơi.
- Nếu hành động của người chơi lệch xa kịch bản, hãy uốn nhẹ bằng cảnh vật, NPC, thông tin, rủi ro — không ép buộc.

Đầu vào:
- CHAT_HISTORY (tối đa 10 lượt gần nhất): 
${chatHistorySnippet}
- PLAYER_ACTION (câu người chơi vừa gửi): 
"${playerAction}"
- WORLD:
${worldJson}
- CHARACTER:
${characterJson}
- SCENARIO_SKELETON:
${scenarioJson}
- SCENE_STATE hiện tại (nếu có, có thể rỗng):
${JSON.stringify(sceneState)}

Đầu ra: JSON đúng SCHEMA sau, không thêm chữ khác:
{
  "narrative": "văn bản kể chuyện ~120–220 từ, không bullet/emoji",
  "softGuidance": "1–2 câu gợi hướng đi kín đáo (có thể rỗng)",
  "sceneState": { "keys/values cần cập nhật (vị trí, NPC, manh mối, nguy cơ, đồng hồ căng thẳng...)" },
  "storyProgress": { "act": 1, "beat": "mô tả nhịp truyện tiến lên" }
}

Quy tắc thêm:
- Mọi miêu tả phải phù hợp world + rules; nếu người chơi làm điều phá vỡ luật, mô tả hậu quả logic chứ không phủ nhận.
- Ưu tiên tiến độ: mỗi lượt nên hé mở một manh mối, tăng/giảm rủi ro, hoặc dịch chuyển sang beat tiếp theo.
- Không nhắc đến "prompt", "JSON", hay meta thông tin trong narrative.`;

      const response = await this.generateContent(prompt);
      
      // Parse JSON response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(response);
      } catch (parseError) {
        console.error('Lỗi parse JSON turn response:', parseError);
        throw new Error('Không thể phân tích phản hồi. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi khi tạo turn response:', error);
      throw new Error('Không thể tạo phản hồi. Vui lòng thử lại.');
    }
  }

  /**
   * Generate turn response using SCC Delta Context
   */
  async generateTurnResponseWithDelta(
    worldJson: string,
    characterJson: string,
    scenarioJson: string,
    summary: SCCSummary,
    sceneState: SCCState,
    chatDelta: Array<{ role: string; content: string; turn: number }>,
    playerAction: string
  ): Promise<{
    narrative: string;
    softGuidance: string;
    sceneState: SCCState;
    storyProgress: any;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `Bạn là AI Storyteller trong box chat roleplay. 
Hãy kể tiếp câu chuyện dựa trên:
- WORLD, CHARACTER, SCENARIO (khung sườn),
- SUMMARY (SCC snapshot gần nhất: recap, timeline, clues, openThreads, relationships, goals, risks),
- SCENE_STATE hiện tại (ưu tiên state này),
- CHAT_DELTA: chỉ các lượt chat kể từ snapshot tới trước hành động hiện tại,
- PLAYER_ACTION: hành động người chơi vừa nêu.

Quy tắc:
- Nếu có xung đột thông tin: ưu tiên SCENE_STATE, sau đó đến SUMMARY, cuối cùng mới tới CHAT_DELTA.
- Văn xuôi 120–220 từ, không bullet/emoji/markdown, mô tả hệ quả cụ thể, cảm quan, và tiến độ cốt truyện.
- Tôn trọng continuityRules, tone, mainThreads trong SCENARIO; định hướng mềm tới các keyBeats/twist/kết thúc, nhưng không ép buộc tự do người chơi.
- Không nhắc đến "prompt/JSON/meta".

ĐẦU VÀO:
- WORLD: ${worldJson}
- CHARACTER: ${characterJson}
- SCENARIO: ${scenarioJson}
- SUMMARY (SCC): ${JSON.stringify(summary)}
- SCENE_STATE: ${JSON.stringify(sceneState)}
- CHAT_DELTA (sau snapshot, ≤ ${chatDelta.length} lượt): ${JSON.stringify(chatDelta)}
- PLAYER_ACTION: "${playerAction}"

ĐẦU RA (JSON, không thêm chữ khác):
{
  "narrative": "văn xuôi 120–220 từ, liền mạch, không bullet/emoji",
  "softGuidance": "1–2 câu định hướng kín đáo (có thể rỗng)",
  "sceneState": { "các trường cần cập nhật (vị trí, NPC, manh mối, rủi ro, đồng hồ…)" },
  "storyProgress": { "act": 1, "beat": "mô tả nhịp truyện" }
}`;

    try {
      const responseText = await this.generateContent(prompt);
      
      // Parse JSON response
      let result;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse turn response JSON:', parseError);
        console.log('Raw response:', responseText);
        throw new Error('Không thể phân tích kết quả từ AI.');
      }

      return {
        narrative: result.narrative || '',
        softGuidance: result.softGuidance || '',
        sceneState: result.sceneState || {},
        storyProgress: result.storyProgress || {}
      };
    } catch (error) {
      console.error('Lỗi khi tạo turn response với delta context:', error);
      throw new Error('Không thể tạo phản hồi. Vui lòng thử lại.');
    }
  }
}

export const geminiService = new GeminiService();
