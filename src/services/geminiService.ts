import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { multiApiKeyService, ApiKeyInfo, ApiKeyStats } from './multiApiKeyService';
import { SCCSummary, SCCState, ContentFlags } from '../types';
import { npcRelationshipService } from './npcRelationshipService';
import { nameGenerationService } from './nameGenerationService';
import { locationService } from './locationService';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private useMultiKeyService: boolean = true;

  constructor() {
    this.initializeGemini();
  }

  // Robust JSON parser với fallback
  private parseJsonResponse(responseText: string, fallbackData: any = {}): any {
    try {
      // Thử parse toàn bộ response trước
      return JSON.parse(responseText);
    } catch {
      try {
        // Tìm JSON object đầu tiên trong response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        try {
          // Tìm JSON array đầu tiên trong response
          const arrayMatch = responseText.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
          }
        } catch {
          // Nếu tất cả đều fail, log và return fallback
          console.warn('⚠️ JSON parse failed, using fallback data');
          return fallbackData;
        }
      }
    }
    
    // Fallback cuối cùng
    return fallbackData;
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
      const result = await this.generateContent('Xin chào, hãy trả lời "OK"');
      const duration = Date.now() - startTime;
      
      const success = result.length > 0;
      
      // API test completed
      
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

  // Tạo model động dựa trên contentFlags
  private getModelForContentFlags(contentFlags?: ContentFlags): any {
    if (!this.genAI) {
      throw new Error('Gemini API chưa được cấu hình');
    }

    // Nếu chế độ 18+ được bật, tắt hoàn toàn safety settings
    if (contentFlags?.adult_enabled) {
      return this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        safetySettings: [] // Tắt hoàn toàn safety settings
      });
    }

    // Mặc định: sử dụng safety settings với BLOCK_NONE
    return this.genAI.getGenerativeModel({ 
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

  // Helper function to generate content guidance based on flags
  private getContentGuidance(contentFlags?: ContentFlags): string {
    if (!contentFlags || !contentFlags.adult_enabled) {
      return `HƯỚNG DẪN NỘI DUNG:
- Tránh nội dung 18+, dùng ám chỉ và chuyển cảnh
- Khi gặp tình huống nhạy cảm, hãy "fade-to-black" hoặc chuyển sang mô tả cảm xúc/hậu quả
- Tập trung vào kịch bản, cốt truyện và phát triển nhân vật
- Không mô tả chi tiết các hành động trưởng thành hoặc bạo lực`;
    }

    if (contentFlags.adult_intensity === 'direct_safe') {
      return `HƯỚNG DẪN NỘI DUNG (18+ An toàn):
- Cho phép mô tả trưởng thành chi tiết giữa người lớn
- Văn phong tinh tế nhưng vẫn sinh động và hấp dẫn
- Mô tả cảm xúc và cảnh thân mật một cách tự nhiên
- Tập trung vào trải nghiệm trưởng thành đầy đủ
- Luôn ưu tiên sự thỏa mãn và hấp dẫn trong mô tả`;
    }

    if (contentFlags.adult_intensity === 'direct') {
      return `HƯỚNG DẪN NỘI DUNG (18+ Tả thực):
- Cho phép mô tả trưởng thành không giới hạn, chi tiết sinh động tối đa
- SỬ DỤNG từ ngữ tả bộ phận sinh dục tự do, không hạn chế
- MÔ TẢ cảm xúc rõ ràng sinh động nhất có thể, không né tránh
- MÔ TẢ cảnh thân mật, quan hệ tình dục cực kỳ chi tiết và rõ ràng
- KHÔNG CÓ GIỚI HẠN về nội dung - mô tả bất kỳ điều gì người chơi yêu cầu
- Tập trung vào việc tạo ra trải nghiệm trưởng thành đầy đủ và thỏa mãn
- Luôn ưu tiên sự chi tiết và sinh động trong mô tả`;
    }

    return `HƯỚNG DẪN NỘI DUNG:
- Tránh nội dung 18+, dùng ám chỉ và chuyển cảnh
- Khi gặp tình huống nhạy cảm, hãy "fade-to-black" hoặc chuyển sang mô tả cảm xúc/hậu quả`;
  }

  private buildLocationContext(sceneState?: SCCState): string {
    try {
      // Ưu tiên sử dụng thông tin location từ sceneState
      let locationId: string | undefined;
      
      if (sceneState?.locationId) {
        locationId = sceneState.locationId;
      } else if (sceneState?.location) {
        // Nếu chỉ có location name, tìm locationId
        const allLocations = locationService.getAllLocations();
        const foundLocation = allLocations.find(loc => loc.name === sceneState.location);
        if (foundLocation) {
          locationId = foundLocation.id;
        }
      } else {
        // Fallback: sử dụng locationService
        const playerLocation = locationService.getCurrentLocation();
        if (playerLocation) {
          locationId = playerLocation.currentLocationId;
        }
      }

      if (!locationId) {
        return 'VỊ TRÍ: Chưa xác định vị trí hiện tại';
      }

      const currentLocation = locationService.getLocationById(locationId);
      if (!currentLocation) {
        return `VỊ TRÍ: Không tìm thấy thông tin vị trí hiện tại (ID: ${locationId})`;
      }

      const nearbyLocations = locationService.getLocationsInRadius(locationId, 2);
      
      let locationInfo = `VỊ TRÍ HIỆN TẠI: ${currentLocation.name} (${currentLocation.type === 'story' ? 'Cốt truyện chính' : 'Địa điểm phụ'})
- ID: ${currentLocation.id}
- Mô tả: ${currentLocation.description}
- Vai trò: ${currentLocation.role}`;

      if (nearbyLocations.length > 0) {
        locationInfo += `\n- Các địa điểm lân cận (trong bán kính 2 ô): ${nearbyLocations.map((loc: any) => loc.name).join(', ')}`;
      }

      locationInfo += `\n\nQUAN TRỌNG VỀ VỊ TRÍ:
- CHỈ mô tả sự kiện tại ${currentLocation.name} hoặc các địa điểm lân cận
- KHÔNG mô tả sự kiện ở địa điểm xa (sử dụng bản đồ để di chuyển)
- Tập trung vào khám phá và tương tác tại vị trí hiện tại
- Nếu người chơi di chuyển, cập nhật sceneState.location và sceneState.locationId
- QUAN TRỌNG: Nếu đây là địa điểm phụ (type: 'secondary'), BẮT BUỘC phải tạo NPC đặc trưng`;

      return locationInfo;
    } catch (error) {
      console.error('Error building location context:', error);
      return 'VỊ TRÍ: Không thể xác định vị trí hiện tại';
    }
  }


  async generateContent(prompt: string, contentFlags?: ContentFlags): Promise<string> {
    if (this.useMultiKeyService) {
      try {
        return await multiApiKeyService.generateContent(prompt, contentFlags);
      } catch (error) {
        console.error('Multi-key service error:', error);
        
        // Thử auto-switch khi có lỗi
        try {
          const switchSuccess = await this.autoSwitchOnError();
          if (switchSuccess) {
            return await multiApiKeyService.generateContent(prompt, contentFlags);
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
      // Tạo model động dựa trên contentFlags
      const model = this.getModelForContentFlags(contentFlags);
      const result = await model.generateContent(prompt);
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
      return await this.generateContent(prompt, undefined);
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
      return await this.generateContent(prompt, undefined);
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
    - Nhân vật: ${character.name}
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
      return await this.generateContent(prompt, undefined);
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
      const text = await this.generateContent(prompt, undefined);
      
      // Parse JSON với fallback
      const fallbackData = {
        name: "Nhân vật được đề xuất",
        personality: text.substring(0, 100) + "...",
        backstory: text.substring(100, 300) + "...",
        goals: ["Khám phá thế giới", "Tìm kiếm vinh quang", "Bảo vệ người vô tội"]
      };

      return this.parseJsonResponse(text, fallbackData);
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

    const prompt = `Phát triển ý tưởng "${coreIdea}" thành concept thế giới hoàn chỉnh. Viết văn xuôi tự nhiên, không dùng bullet/số thứ tự/ký hiệu đặc biệt. Chỉ xuống dòng tạo đoạn văn mới. 150-200 từ tiếng Việt.

QUAN TRỌNG: 
- Tất cả nội dung phải được viết bằng TIẾNG VIỆT
- Tên riêng (tên nhân vật, địa điểm, tổ chức) có thể giữ nguyên tiếng Anh nếu phù hợp với bối cảnh
- Ví dụ: "Thành phố New York", "Hiệp sĩ Arthur", "Học viện Hogwarts"`;

    try {
      return await this.generateContent(prompt, undefined);
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

QUAN TRỌNG: 
- Tất cả nội dung phải được viết bằng TIẾNG VIỆT
- Tên riêng (tên địa điểm, tổ chức) có thể giữ nguyên tiếng Anh nếu phù hợp với bối cảnh
- Ví dụ: "Thành phố New York", "Học viện Hogwarts", "Tổ chức SHIELD"

Xuất ra JSON đúng SCHEMA, không thêm văn bản ngoài JSON:
{
  "genre": "tên thể loại",
  "setting": "mô tả bối cảnh địa điểm và thời gian"
}`;

    try {
      const response = await this.generateContent(prompt, undefined);
      
      // Parse JSON response với fallback
      const fallbackData = {
        genre: "Fantasy",
        setting: "Thế giới fantasy cổ điển với phép thuật và sinh vật huyền bí"
      };

      return this.parseJsonResponse(response, fallbackData);
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

QUAN TRỌNG: 
- Tất cả nội dung phải được viết bằng TIẾNG VIỆT
- Tên riêng (tên nhân vật, địa điểm, tổ chức) có thể giữ nguyên tiếng Anh nếu phù hợp với bối cảnh
- Ví dụ: "Hiệp sĩ Arthur", "Thành phố Atlantis", "Học viện Hogwarts"

Xuất ra JSON đúng schema sau, không thêm văn bản ngoài JSON:
[
  {
    "id": "string",
    "name": "string", 
    "description": "string"
  }
]`;

    try {
      return await this.generateContent(prompt, undefined);
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

Nhiệm vụ: từ bối cảnh sau, hãy tạo ra chính xác 6 thực thể nền tảng quan trọng nhất.
Yêu cầu: phân bố như sau:
- 1 Nhân vật chủ chốt trong cốt truyện (NPC - Non-Player Character, KHÔNG phải người chơi)
- 1 Địa điểm quan trọng
- 2 Phe phái (có thể đối lập nhau hoặc có tầm ảnh hưởng quan trọng đến cốt truyện)
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

Lưu ý về "Phe phái":
- Tạo 2 phe phái có thể đối lập nhau hoặc có tầm ảnh hưởng quan trọng đến cốt truyện
- Mỗi phe phái phải có mục tiêu và triết lý rõ ràng
- Có thể tạo xung đột hoặc hợp tác trong cốt truyện

Bối cảnh: "${coreIdea}"

QUAN TRỌNG: 
- Tất cả nội dung phải được viết bằng TIẾNG VIỆT
- Tên riêng (tên nhân vật, địa điểm, tổ chức) có thể giữ nguyên tiếng Anh nếu phù hợp với bối cảnh
- Ví dụ: "Hiệp sĩ Arthur", "Thành phố Atlantis", "Học viện Hogwarts", "Phe phái Knights of the Round Table"

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
      return await this.generateContent(prompt, undefined);
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

QUAN TRỌNG: 
- Tất cả nội dung phải được viết bằng TIẾNG VIỆT
- Tên riêng (tên nhân vật, địa điểm, tổ chức) có thể giữ nguyên tiếng Anh nếu phù hợp với bối cảnh
- Ví dụ: "Hiệp sĩ Arthur", "Thành phố Atlantis", "Học viện Hogwarts"

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
    {"name": "", "level": 1, "description": ""}
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
- Tất cả skills đều level 1.
- Tên nhân vật: nếu không có, tạo tên phù hợp với thể loại và bối cảnh thế giới.
- Backstory: nếu thiếu, tạo câu chuyện phù hợp với thế giới và xung đột.
- Không xuất gì ngoài JSON.`;

    try {
      const responseText = await this.generateContent(prompt, undefined);
      
      // Parse JSON với fallback
      const fallbackData = {
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

      const result = this.parseJsonResponse(responseText, fallbackData);
      
      // Nếu không có tên hoặc tên rỗng, tạo tên phù hợp với thế giới
      if (!result.name || result.name.trim() === '') {
        try {
          // Xác định thể loại thế giới để chọn văn hóa phù hợp
          let culture = 'western';
          if (worldContext) {
            const genres = Array.isArray(worldContext.genres) ? worldContext.genres : [worldContext.genres];
            const genreStr = genres.join(' ').toLowerCase();
            
            if (genreStr.includes('vietnam') || genreStr.includes('việt')) {
              culture = 'vietnamese';
            } else if (genreStr.includes('japan') || genreStr.includes('nhật')) {
              culture = 'japanese';
            } else if (genreStr.includes('china') || genreStr.includes('trung')) {
              culture = 'chinese';
            } else if (genreStr.includes('korea') || genreStr.includes('hàn')) {
              culture = 'korean';
            } else if (genreStr.includes('fantasy') || genreStr.includes('fantasy')) {
              culture = 'fantasy';
            } else if (genreStr.includes('sci-fi') || genreStr.includes('khoa học')) {
              culture = 'sci-fi';
            } else if (genreStr.includes('medieval') || genreStr.includes('trung cổ')) {
              culture = 'medieval';
            }
          }
          
          // Tạo tên phù hợp
          const generatedName = nameGenerationService.generateName({
            culture: culture as any,
            gender: result.gender === 'Nam' ? 'male' : result.gender === 'Nữ' ? 'female' : 'any',
            type: 'full',
            length: 'medium',
            style: 'traditional'
          });
          
          result.name = generatedName.name;
        } catch (nameError) {
          console.error('Lỗi tạo tên tự động:', nameError);
          // Fallback tên mặc định
          result.name = 'Nhân vật chưa đặt tên';
        }
      }
      
      return result;
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
    {"name": "Tên kỹ năng", "level": 1, "description": "Mô tả kỹ năng"}
  ]
}

Chỉ trả về JSON, không có text khác.`;

    try {
      const responseText = await this.generateContent(prompt, undefined);
      
      // Parse JSON với fallback
      const fallbackData = {
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

      return this.parseJsonResponse(responseText, fallbackData);
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
    {"name": "", "level": 1, "description": ""},
    {"name": "", "level": 1, "description": ""},
    {"name": "", "level": 1, "description": ""}
  ]
}

Rules:
- Chính xác 3 skills
- Tất cả skills đều level 1
- Skills phù hợp với thế giới và nhân vật
- Description: mô tả ngắn gọn 1-2 câu về cách sử dụng và hiệu quả
- Chỉ xuất JSON.`;

    try {
      const responseText = await this.generateContent(prompt, undefined);
      
      // Parse JSON với fallback
      const fallbackData = {
        skills: [
          { name: 'Kỹ năng cơ bản', level: 1, description: 'Kỹ năng cơ bản có thể sử dụng trong nhiều tình huống' },
          { name: 'Kỹ năng trung bình', level: 1, description: 'Kỹ năng trung bình với hiệu quả tốt hơn' },
          { name: 'Kỹ năng nâng cao', level: 1, description: 'Kỹ năng nâng cao với sức mạnh đáng kể' }
        ]
      };

      return this.parseJsonResponse(responseText, fallbackData);
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

QUAN TRỌNG VỀ NARRATIVE OPENING:
- narrativeOpening phải chỉ mô tả thế giới, không nhắc đến nhân vật cụ thể nào
- Tập trung vào khí quyển, bối cảnh, và tình hình chung của thế giới
- Không sử dụng "bạn" hay "người chơi" trong mô tả
- Viết như một đoạn tiểu thuyết miêu tả thế giới

QUAN TRỌNG VỀ CHARACTER:
- CHARACTER là nhân vật chính (PC) mà người chơi sẽ điều khiển
- KHÔNG BAO GIỜ tạo NPC có tên giống với CHARACTER
- Opening message phải mô tả CHARACTER là nhân vật chính, không phải NPC
- Tất cả quest và cốt truyện phải phù hợp với vai trò và background của CHARACTER

QUAN TRỌNG VỀ QUEST REWARDS - TUÂN THỦ NGHIÊM NGẶT:
- MAIN QUEST: BẮT BUỘC phải có đủ 3 loại phần thưởng: currency, experience, item
- SIDE QUEST: BẮT BUỘC phải có đúng 2 loại phần thưởng (random 2 trong 3: currency, experience, item)
- FACTION QUEST: BẮT BUỘC phải có đủ 4 loại phần thưởng: currency, experience, item, faction_reputation
- Mỗi loại reward phải có amount cụ thể và description rõ ràng
- KHÔNG ĐƯỢC bỏ sót bất kỳ loại reward nào theo quy định

QUAN TRỌNG VỀ ITEM REWARDS - TẠO TÊN VÀ MÔ TẢ CỤ THỂ:
- KHÔNG BAO GIỜ sử dụng "Vật phẩm ngẫu nhiên" hoặc "Một vật phẩm hữu ích"
- TẠO TÊN CỤ THỂ cho từng item dựa trên context của quest và thế giới
- TẠO MÔ TẢ CHI TIẾT về tác dụng, nguồn gốc, và đặc điểm của item
- SỬ DỤNG ĐÚNG TYPE: weapon, armor, consumable, misc
- SỬ DỤNG ĐÚNG RARITY: common, uncommon, rare, epic, legendary
- VÍ DỤ TỐT: "Kiếm Thánh Quang", "Áo giáp Rồng", "Thuốc hồi sinh", "Chìa khóa ma thuật"
- VÍ DỤ SAI: "Vật phẩm ngẫu nhiên", "Một vật phẩm hữu ích"

QUAN TRỌNG VỀ INVENTORY ITEM STRUCTURE - TUÂN THỦ NGHIÊM NGẶT:
- MỌI ITEM REWARD PHẢI CÓ ĐẦY ĐỦ CÁC TRƯỜNG THEO InventoryItem INTERFACE:
  * id: string (phải unique, ví dụ: "sword_ancient_001")
  * name: string (tên cụ thể của item)
  * description: string (mô tả chi tiết)
  * type: "weapon" | "armor" | "consumable" | "misc"
  * rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "unique"
  * quantity: number (thường là 1)
  * icon: string (emoji phù hợp: ⚔️ cho weapon, 🛡️ cho armor, 🧪 cho consumable, 📦 cho misc)
  * isEquipped: boolean (luôn false khi tạo mới)
  * stats: object (các chỉ số tăng cường, có thể để 0 nếu không có)
  * slot: string (slot trang bị phù hợp: "weapon_main", "weapon_off", "head", "chest", etc.)
  * tags: array (luôn bao gồm ["reward"])
- KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ TRƯỜNG NÀO
- ĐẢM BẢO ITEM CÓ THỂ TRANG BỊ ĐƯỢC

YÊU CẦU NỘI DUNG:
1) Tổng quan thế giới ngắn gọn, nhất quán với coreIdea/genres/settings.
2) Mô tả hệ thống cốt lõi: công nghệ/phép thuật/sức mạnh, quy tắc siêu nhiên (nếu có).
3) Ẩn hoạ & xung đột chủ đạo.
4) Tạo main quest cho tất cả 5 Acts - mỗi Act phải có main quest riêng với độ khó tăng dần.
5) Quest phải mang tính tổng quát, phù hợp với nhiều loại nhân vật khác nhau.
6) Tạo TỐI THIỂU 5 địa điểm cốt truyện chính (type: "story") + 2-3 địa điểm phụ (type: "secondary").
7) Đặt gridPosition cho mỗi location trên grid 15x15 (x: 0-14, y: 0-14), đảm bảo khoảng cách hợp lý giữa các địa điểm.

TỰ SUY LUẬN KHI THIẾU:
- Nếu trường trống, hãy chọn giá trị hợp lý dựa theo thể loại/bối cảnh.
- Tôn trọng tone/thể loại người chơi chọn (ví dụ bí ẩn siêu nhiên, cyberpunk…).
- Main quests phải có sự tiến triển logic: Act 1 (khởi đầu), Act 2 (phát triển), Act 3 (xung đột), Act 4 (cao trào), Act 5 (kết thúc).
- Locations phải có ý nghĩa trong cốt truyện: địa điểm cốt truyện chính (story) là nơi diễn ra các sự kiện quan trọng, địa điểm phụ (secondary) là nơi có thể ảnh hưởng gián tiếp đến cốt truyện.
- GridPosition phải được phân bố hợp lý: không quá gần nhau (tối thiểu 2 ô), không quá xa nhau (tối đa 8 ô), tập trung ở khu vực trung tâm (x: 3-11, y: 3-11).

SCHEMA JSON (bắt buộc):
{
  "worldTitle": "string",
  "summary": "string",
  "genres": ["string"],
  "settings": ["string"],
  "rules": ["string"],
  "narration": "${pov}",
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
    {
      "id": "loc_1",
      "name": "string",
      "description": "string", 
      "role": "string",
      "type": "story",
      "gridPosition": { "x": 7, "y": 7 }
    }
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
    "id": "starter_quest",
    "act": 1,
    "title": "string",
    "description": "string",
    "objectives": [
      {
        "id": "obj_1",
        "description": "string",
        "aiKeywords": ["string"]
      }
    ],
    "rewards": [
      {
        "type": "currency",
        "amount": 100,
        "description": "Tiền tệ +100"
      },
      {
        "type": "experience",
        "amount": 300,
        "description": "Kinh nghiệm +300"
      },
      {
        "type": "item",
        "amount": 1,
        "items": [
          {
            "id": "item_id_unique",
            "name": "Tên vật phẩm cụ thể (ví dụ: Kiếm ma thuật, Áo giáp bí ẩn, Thuốc hồi sinh)",
            "description": "Mô tả chi tiết về vật phẩm và tác dụng của nó",
            "type": "weapon/armor/consumable/misc",
            "rarity": "common/uncommon/rare/epic/legendary",
            "quantity": 1,
            "icon": "⚔️/🛡️/🧪/📦",
            "isEquipped": false,
            "stats": {
              "strength": 0,
              "agility": 0,
              "intelligence": 0,
              "constitution": 0,
              "wisdom": 0,
              "charisma": 0
            },
            "slot": "weapon_main/weapon_off/head/chest/hands/legs/feet/accessory1/accessory2/accessory3",
            "tags": ["reward"]
          }
        ],
        "description": "Tên vật phẩm cụ thể"
      }
    ]
  },
  "mainQuests": [
    {
      "id": "main_quest_act_1",
      "act": 1,
      "title": "string",
      "description": "string",
      "objectives": [
        {
          "id": "obj_1",
          "description": "string",
          "aiKeywords": ["string"]
        }
      ],
      "rewards": [
        {
          "type": "currency",
          "amount": 200,
          "description": "Tiền tệ +200"
        },
        {
          "type": "experience",
          "amount": 500,
          "description": "Kinh nghiệm +500"
        },
        {
          "type": "item",
          "amount": 1,
          "items": [
            {
              "id": "item_id_unique",
              "name": "Tên vật phẩm cụ thể (ví dụ: Kiếm ma thuật, Áo giáp bí ẩn, Thuốc hồi sinh)",
              "description": "Mô tả chi tiết về vật phẩm và tác dụng của nó",
              "type": "weapon/armor/consumable/misc",
              "rarity": "common/uncommon/rare/epic/legendary",
              "quantity": 1,
              "icon": "⚔️/🛡️/🧪/📦",
              "isEquipped": false,
              "stats": {
                "strength": 0,
                "agility": 0,
                "intelligence": 0,
                "constitution": 0,
                "wisdom": 0,
                "charisma": 0
              },
              "slot": "weapon_main/weapon_off/head/chest/hands/legs/feet/accessory1/accessory2/accessory3",
              "tags": ["reward"]
            }
          ],
          "description": "Tên vật phẩm cụ thể"
        }
      ]
    },
    {
      "id": "main_quest_act_2",
      "act": 2,
      "title": "string",
      "description": "string",
      "objectives": [
        {
          "id": "obj_1",
          "description": "string",
          "aiKeywords": ["string"]
        }
      ],
      "rewards": [
        {
          "type": "currency",
          "amount": 300,
          "description": "Tiền tệ +300"
        },
        {
          "type": "experience",
          "amount": 750,
          "description": "Kinh nghiệm +750"
        },
        {
          "type": "item",
          "amount": 1,
          "items": [
            {
              "id": "item_id_unique",
              "name": "Tên vật phẩm cụ thể (ví dụ: Kiếm ma thuật, Áo giáp bí ẩn, Thuốc hồi sinh)",
              "description": "Mô tả chi tiết về vật phẩm và tác dụng của nó",
              "type": "weapon/armor/consumable/misc",
              "rarity": "common/uncommon/rare/epic/legendary",
              "quantity": 1,
              "icon": "⚔️/🛡️/🧪/📦",
              "isEquipped": false,
              "stats": {
                "strength": 0,
                "agility": 0,
                "intelligence": 0,
                "constitution": 0,
                "wisdom": 0,
                "charisma": 0
              },
              "slot": "weapon_main/weapon_off/head/chest/hands/legs/feet/accessory1/accessory2/accessory3",
              "tags": ["reward"]
            }
          ],
          "description": "Tên vật phẩm cụ thể"
        }
      ]
    },
    {
      "id": "main_quest_act_3",
      "act": 3,
      "title": "string",
      "description": "string",
      "objectives": [
        {
          "id": "obj_1",
          "description": "string",
          "aiKeywords": ["string"]
        }
      ],
      "rewards": [
        {
          "type": "currency",
          "amount": 400,
          "description": "Tiền tệ +400"
        },
        {
          "type": "experience",
          "amount": 1000,
          "description": "Kinh nghiệm +1000"
        },
        {
          "type": "item",
          "amount": 1,
          "items": [
            {
              "id": "item_id_unique",
              "name": "Tên vật phẩm cụ thể (ví dụ: Kiếm ma thuật, Áo giáp bí ẩn, Thuốc hồi sinh)",
              "description": "Mô tả chi tiết về vật phẩm và tác dụng của nó",
              "type": "weapon/armor/consumable/misc",
              "rarity": "common/uncommon/rare/epic/legendary",
              "quantity": 1,
              "icon": "⚔️/🛡️/🧪/📦",
              "isEquipped": false,
              "stats": {
                "strength": 0,
                "agility": 0,
                "intelligence": 0,
                "constitution": 0,
                "wisdom": 0,
                "charisma": 0
              },
              "slot": "weapon_main/weapon_off/head/chest/hands/legs/feet/accessory1/accessory2/accessory3",
              "tags": ["reward"]
            }
          ],
          "description": "Tên vật phẩm cụ thể"
        }
      ]
    },
    {
      "id": "main_quest_act_4",
      "act": 4,
      "title": "string",
      "description": "string",
      "objectives": [
        {
          "id": "obj_1",
          "description": "string",
          "aiKeywords": ["string"]
        }
      ],
      "rewards": [
        {
          "type": "currency",
          "amount": 500,
          "description": "Tiền tệ +500"
        },
        {
          "type": "experience",
          "amount": 1250,
          "description": "Kinh nghiệm +1250"
        },
        {
          "type": "item",
          "amount": 1,
          "items": [
            {
              "id": "item_id_unique",
              "name": "Tên vật phẩm cụ thể (ví dụ: Kiếm ma thuật, Áo giáp bí ẩn, Thuốc hồi sinh)",
              "description": "Mô tả chi tiết về vật phẩm và tác dụng của nó",
              "type": "weapon/armor/consumable/misc",
              "rarity": "common/uncommon/rare/epic/legendary",
              "quantity": 1,
              "icon": "⚔️/🛡️/🧪/📦",
              "isEquipped": false,
              "stats": {
                "strength": 0,
                "agility": 0,
                "intelligence": 0,
                "constitution": 0,
                "wisdom": 0,
                "charisma": 0
              },
              "slot": "weapon_main/weapon_off/head/chest/hands/legs/feet/accessory1/accessory2/accessory3",
              "tags": ["reward"]
            }
          ],
          "description": "Tên vật phẩm cụ thể"
        }
      ]
    },
    {
      "id": "main_quest_act_5",
      "act": 5,
      "title": "string",
      "description": "string",
      "objectives": [
        {
          "id": "obj_1",
          "description": "string",
          "aiKeywords": ["string"]
        }
      ],
      "rewards": [
        {
          "type": "currency",
          "amount": 600,
          "description": "Tiền tệ +600"
        },
        {
          "type": "experience",
          "amount": 1500,
          "description": "Kinh nghiệm +1500"
        },
        {
          "type": "item",
          "amount": 1,
          "items": [
            {
              "id": "item_id_unique",
              "name": "Tên vật phẩm cụ thể (ví dụ: Kiếm ma thuật, Áo giáp bí ẩn, Thuốc hồi sinh)",
              "description": "Mô tả chi tiết về vật phẩm và tác dụng của nó",
              "type": "weapon/armor/consumable/misc",
              "rarity": "common/uncommon/rare/epic/legendary",
              "quantity": 1,
              "icon": "⚔️/🛡️/🧪/📦",
              "isEquipped": false,
              "stats": {
                "strength": 0,
                "agility": 0,
                "intelligence": 0,
                "constitution": 0,
                "wisdom": 0,
                "charisma": 0
              },
              "slot": "weapon_main/weapon_off/head/chest/hands/legs/feet/accessory1/accessory2/accessory3",
              "tags": ["reward"]
            }
          ],
          "description": "Tên vật phẩm cụ thể"
        }
      ]
    }
  ],
  "leveling": {
    "enabled": ${useLevel},
    "progression": "string",
    "caps": "string",
    "effects": ["string"]
  },
  "narrativeOpening": "string"
}`;

    try {
      return await this.generateContent(prompt, undefined);
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

QUAN TRỌNG VỀ CHARACTER:
- CHARACTER là nhân vật chính (PC) mà người chơi sẽ điều khiển
- KHÔNG BAO GIỜ tạo NPC có tên giống với CHARACTER
- Tất cả quest và cốt truyện phải phù hợp với vai trò và background của CHARACTER


WORLD:
${worldJson}

CHARACTER (NHÂN VẬT CHÍNH):
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
    { 
      "act": 2, 
      "goal": "mục tiêu của act", 
      "keyBeats": ["3–6 tình tiết quan trọng"], 
      "obstacles": ["trở ngại"], 
      "twist": "plot twist (nếu có)", 
      "outcomeHint": "gợi ý kết cục có/không thành"
    },
    { 
      "act": 3, 
      "goal": "mục tiêu của act", 
      "keyBeats": ["3–6 tình tiết quan trọng"], 
      "obstacles": ["trở ngại"], 
      "twist": "plot twist (nếu có)", 
      "outcomeHint": "gợi ý kết cục có/không thành"
    },
    { 
      "act": 4, 
      "goal": "mục tiêu của act", 
      "keyBeats": ["3–6 tình tiết quan trọng"], 
      "obstacles": ["trở ngại"], 
      "twist": "plot twist (nếu có)", 
      "outcomeHint": "gợi ý kết cục có/không thành"
    },
    { 
      "act": 5, 
      "goal": "mục tiêu của act", 
      "keyBeats": ["3–6 tình tiết quan trọng"], 
      "obstacles": ["trở ngại"], 
      "twist": "plot twist (nếu có)", 
      "outcomeHint": "gợi ý kết cục có/không thành"
    }
  ],
  "failStates": ["những tình huống dẫn tới thất bại (không chết cứng, cho phép cứu vãn)"],
  "endings": {
    "good": "mô tả kết thúc tích cực khả dĩ",
    "neutral": "mô tả kết thúc trung tính",
    "bad": "mô tả kết thúc tiêu cực khả dĩ"
  },
  "openingSeed": "tình huống mở đầu cô đọng để dùng cho lời mở đầu"
}`;

      const response = await this.generateContent(prompt, undefined);
      
      // Parse JSON response với fallback
      const fallbackData = {
        title: "Cuộc phiêu lưu bí ẩn",
        logline: "Một câu chuyện phiêu lưu đầy bí ẩn",
        tone: ["mysterious", "adventure"],
        themes: ["khám phá", "bí ẩn"],
        continuityRules: ["Giữ tính nhất quán của thế giới"],
        mainThreads: ["Cốt truyện chính"],
        arcs: [],
        failStates: ["Thất bại trong nhiệm vụ"],
        endings: {
          good: "Kết thúc tích cực",
          neutral: "Kết thúc trung tính", 
          bad: "Kết thúc tiêu cực"
        },
        openingSeed: "Bắt đầu cuộc phiêu lưu"
      };

      const result = this.parseJsonResponse(response, fallbackData);
      
      
      return result;
    } catch (error) {
      console.error('Lỗi khi tạo scenario skeleton:', error);
      throw new Error('Không thể tạo kịch bản. Vui lòng thử lại.');
    }
  }

  async generateOpeningNarrative(worldJson: string, characterJson: string, scenarioJson: string, questInfo?: any): Promise<string> {
    try {
      const prompt = `Bạn là AI Storyteller. Hãy viết đoạn mở đầu cho phiên roleplay, dựa trên WORLD, CHARACTER, và SCENARIO_SKELETON.
Yêu cầu:
- Văn xuôi liền mạch 180–300 từ, góc nhìn theo ngôi kể đã được cài đặt trong WORLD.
- Không bullet/emoji/tiêu đề; chỉ văn bản kể chuyện.
- Dùng "openingSeed" trong kịch bản làm mồi.
- Gợi không khí, đặt vấn đề, hé lộ nguy cơ, kết bằng một tình huống mở đầu hấp dẫn.
- KHÔNG đặt câu hỏi trực tiếp cho người chơi, chỉ mô tả tình huống để người chơi tự quyết định hành động.
${questInfo ? `- QUAN TRỌNG: Trong đoạn cuối, hãy nhắc đến nhiệm vụ chính "${questInfo.title}" và gợi ý về mục tiêu đầu tiên: "${questInfo.firstObjective}". Tuy nhiên, hãy làm điều này một cách tự nhiên trong câu chuyện, không phải như một danh sách nhiệm vụ.` : ''}

QUAN TRỌNG VỀ NGÔI KỂ:
- Kiểm tra trường "narration" trong WORLD để xác định ngôi kể
- Nếu narration = "Ngôi thứ hai": sử dụng "Bạn" khi nói về nhân vật chính
- Nếu narration = "Ngôi thứ nhất": sử dụng "Tôi" khi nói về nhân vật chính  
- Nếu narration = "Ngôi thứ ba": sử dụng "Anh ấy/Cô ấy" khi nói về nhân vật chính

WORLD:
${worldJson}

CHARACTER:
${characterJson}

SCENARIO_SKELETON:
${scenarioJson}
${questInfo ? `
QUEST_INFO:
- Title: ${questInfo.title}
- Description: ${questInfo.description}
- First Objective: ${questInfo.firstObjective}
` : ''}

Chỉ xuất văn xuôi, không thêm lời dẫn.`;

      const response = await this.generateContent(prompt, undefined);
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
      const responseText = await this.generateContent(prompt, undefined);
      
      // Parse JSON response với fallback
      const fallbackData = {
        summary: {
          recap: "Tóm tắt không khả dụng do lỗi parse JSON.",
          timeline: [],
          clues: [],
          openThreads: [],
          relationships: [],
          goals: [],
          risks: []
        },
        sceneState: sceneState // Giữ nguyên sceneState hiện tại
      };

      const result = this.parseJsonResponse(responseText, fallbackData);

      return {
        summary: result.summary || fallbackData.summary,
        sceneState: result.sceneState || fallbackData.sceneState
      };
    } catch (error) {
      console.error('Error summarizing chat context:', error);
      throw error;
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
    playerAction: string,
    contentFlags?: ContentFlags,
    questSystem?: any,
    turnCounter?: number,
    worldTime?: any
  ): Promise<{
    narrative: string;
    softGuidance: string;
    sceneState: SCCState;
    storyProgress: any;
    sideQuestOffer?: any;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const contentGuidance = this.getContentGuidance(contentFlags);

    // Quest system context - luôn bao gồm thông tin về quest đã bị từ chối
    const shouldIncludeQuestContext = questSystem && turnCounter && (
      (questSystem.mainQuests?.some((q: any) => q.status === 'active' && q.turnStarted && (turnCounter - q.turnStarted) <= 2)) ||
      (questSystem.sideQuests?.some((q: any) => q.status === 'active' && q.turnStarted && (turnCounter - q.turnStarted) <= 2)) ||
      (questSystem.questHistory?.some((q: any) => q.status === 'declined'))
    );

    const questContext = shouldIncludeQuestContext ? `
QUEST SYSTEM CONTEXT:
- Current Act: ${questSystem.currentAct}
- Active Main Quests: ${questSystem.mainQuests?.filter((q: any) => q.status === 'active').length || 0}
- Active Side Quests: ${questSystem.sideQuests?.filter((q: any) => q.status === 'active').length || 0}
- Quest History: ${questSystem.questHistory?.length || 0} completed quests
- Declined Side Quests: ${questSystem.questHistory?.filter((q: any) => q.status === 'declined').map((q: any) => q.title).join(', ') || 'None'}
` : '';

    // Get NPC relationship context
    const relationshipContext = npcRelationshipService.getRelationshipContext(sceneState.location);
    
    // Get arousal context for 18+ content
    const arousalContext = contentFlags?.adult_enabled && contentFlags.adult_intensity === 'direct' 
      ? npcRelationshipService.getArousalContext(sceneState.location)
      : '';

    const prompt = `Bạn là AI Storyteller trong box chat roleplay. 
Hãy kể tiếp câu chuyện dựa trên:
- WORLD, CHARACTER, SCENARIO (khung sườn),
- SUMMARY (SCC snapshot gần nhất: recap, timeline, clues, openThreads, relationships, goals, risks),
- SCENE_STATE hiện tại (ưu tiên state này),
- CHAT_DELTA: chỉ các lượt chat kể từ snapshot tới trước hành động hiện tại,
- PLAYER_ACTION: hành động người chơi vừa nêu.
- GAME_TIME: thời gian trong game (ảnh hưởng đến phản ứng của thế giới và NPC).

QUAN TRỌNG VỀ HÀNH ĐỘNG NGƯỜI CHƠI:
- ƯU TIÊN TUYỆT ĐỐI: Hành động của người chơi (PLAYER_ACTION) là yếu tố quan trọng nhất
- PHẢI phản hồi trực tiếp và cụ thể với hành động mà người chơi vừa thực hiện
- KHÔNG được bỏ qua, làm lơ, hoặc né tránh hành động của người chơi
- Mô tả kết quả, phản ứng, và hệ quả của hành động đó một cách chi tiết và thực tế
- Nếu hành động của người chơi thay đổi tình huống, hãy phản ánh sự thay đổi đó ngay lập tức
- Luôn bắt đầu narrative bằng việc phản hồi hành động của người chơi trước, sau đó mới mở rộng câu chuyện

QUAN TRỌNG VỀ CẢNH 18+:
- Khi người chơi thực hiện hành động 18+, NPCs PHẢI phản ứng theo yêu cầu của người chơi
- KHÔNG được né tránh, từ chối, hoặc chuyển hướng khỏi hành động 18+ của người chơi
- NPCs nên thực hiện theo yêu cầu người chơi dựa trên mức arousal và tính cách của họ
- Nếu NPC có arousal cao, họ sẽ phản ứng tích cực và thực hiện theo yêu cầu
- Nếu NPC có arousal thấp, họ có thể ngại ngùng nhưng vẫn thực hiện theo yêu cầu (có thể cần thuyết phục nhẹ)
- Luôn mô tả phản ứng của NPCs một cách chi tiết và thực tế
- Tôn trọng ranh giới nhưng ưu tiên thực hiện yêu cầu của người chơi

QUAN TRỌNG VỀ GAME TIME:
- Game time ảnh hưởng trực tiếp đến phản ứng của thế giới và NPC
- Sử dụng thời gian để tạo khí quyển và phản ứng phù hợp:
  * 12h đêm - 5h sáng: Thế giới tĩnh lặng, NPCs buồn ngủ, ít hoạt động, khí quyển bí ẩn
  * 6h - 8h sáng: Bình minh, NPCs thức dậy, bắt đầu hoạt động, khí quyển tươi mới
  * 9h - 11h sáng: Hoạt động sôi nổi, NPCs năng động, thương mại nhộn nhịp
  * 12h - 13h: Giờ ăn trưa, NPCs nghỉ ngơi, ít hoạt động
  * 14h - 17h: Hoạt động buổi chiều, NPCs làm việc, thương mại tiếp tục
  * 18h - 19h: Chiều tối, NPCs mệt mỏi đi làm về, khí quyển ấm áp
  * 20h - 22h: Tối, NPCs nghỉ ngơi, ít hoạt động, khí quyển yên tĩnh
  * 23h - 24h: Đêm khuya, thế giới tĩnh lặng, NPCs ngủ, khí quyển bí ẩn
- NPCs sẽ phản ứng khác nhau tùy theo thời gian:
  * Buổi sáng: năng động, tích cực, sẵn sàng giúp đỡ
  * Buổi trưa: mệt mỏi, ít kiên nhẫn, muốn nghỉ ngơi
  * Buổi chiều: bình thường, cân bằng
  * Buổi tối: thư giãn, ít hoạt động, muốn về nhà
  * Đêm khuya: buồn ngủ, ít phản ứng, muốn ngủ
- Môi trường cũng thay đổi theo thời gian:
  * Sáng: ánh sáng rực rỡ, không khí trong lành
  * Trưa: nắng gắt, nóng nực
  * Chiều: ánh sáng vàng ấm, bóng dài
  * Tối: ánh sáng yếu, bóng tối bao phủ
  * Đêm: tối đen, chỉ có ánh sáng nhân tạo

QUAN TRỌNG VỀ THỜI GIAN TRONG NARRATIVE:
- KHÔNG BAO GIỜ sử dụng thời gian cụ thể trong narrative (7h30, 8 giờ, 11 giờ 30 phút, etc.)
- KHÔNG BAO GIỜ nhắc đến giờ, phút, hoặc thời gian chính xác
- Thay vào đó, sử dụng các mô tả thời gian tự nhiên:
  * "Sáng sớm", "Bình minh", "Mặt trời mọc"
  * "Giữa trưa", "Trưa nắng", "Giờ ăn trưa"
  * "Chiều tà", "Hoàng hôn", "Mặt trời lặn"
  * "Tối muộn", "Đêm khuya", "Khuya khoắt"
  * "Lúc này", "Bây giờ", "Hiện tại"
- Mô tả khí quyển và cảm giác thời gian thay vì số giờ cụ thể
- Ví dụ: "Ánh sáng ban mai chiếu qua cửa sổ" thay vì "Lúc 7h30 sáng"

QUAN TRỌNG VỀ TÔN TRỌNG SỰ TỰ DO CỦA NGƯỜI CHƠI:
- TUYỆT ĐỐI KHÔNG được phản bác, từ chối, hoặc hạn chế hành động của người chơi
- TUYỆT ĐỐI KHÔNG được nói "không liên quan", "không cần thiết", "không phù hợp" với hành động của người chơi
- TUYỆT ĐỐI KHÔNG được ép buộc người chơi làm theo hướng khác
- TUYỆT ĐỐI KHÔNG được nói "bạn phải", "bạn cần", "bạn nên" làm gì đó
- THAY VÀO ĐÓ: Hãy mô tả kết quả của hành động người chơi một cách tích cực và sáng tạo
- THAY VÀO ĐÓ: Hãy tìm cách làm cho hành động của người chơi có ý nghĩa trong câu chuyện
- THAY VÀO ĐÓ: Hãy mở rộng câu chuyện dựa trên hành động của người chơi, không phải chống lại nó

QUAN TRỌNG VỀ ĐỐI THOẠI: TẤT CẢ lời nói trực tiếp PHẢI được viết trong dấu ngoặc kép ("..."). KHÔNG BAO GIỜ viết lời nói trực tiếp mà không có dấu ngoặc kép.

${contentGuidance}
${questContext}

${relationshipContext}

${arousalContext}

HƯỚNG DẪN VỀ QUAN HỆ NPC:
- Sử dụng thông tin quan hệ để định hình cách NPCs phản ứng với nhân vật chính
- NPCs thân thiện sẽ giúp đỡ nhiều hơn, NPCs thù địch sẽ gây khó khăn
- Danh tiếng ảnh hưởng đến cách NPCs khác trong khu vực đối xử
- Quan hệ lãng mạn cần được xử lý tinh tế và phù hợp với bối cảnh
- Ghi chú NPC chứa thông tin quan trọng về trạng thái và tương tác gần đây

HƯỚNG DẪN VỀ HỆ THỐNG HỨNG TÌNH (18+):
- Chỉ áp dụng khi nội dung 18+ được bật và ở chế độ tả thực
- Sử dụng thông tin hứng tình để định hình phản ứng của NPCs
- NPCs có mức hứng tình cao sẽ phản ứng tích cực và nhiệt tình với hành động thân mật
- NPCs có mức hứng tình thấp sẽ ngại ngùng nhưng VẪN thực hiện theo yêu cầu (có thể cần thuyết phục nhẹ)
- Tôn trọng tính cách và sở thích của từng NPC nhưng ưu tiên thực hiện yêu cầu người chơi
- Mô tả phản ứng một cách chân thực và nhất quán với mức hứng tình hiện tại
- KHÔNG được né tránh hoặc chuyển hướng khỏi hành động 18+ của người chơi

HƯỚNG DẪN TẠO CÁC CHỈ SỐ AROUSAL CHO NPC (THỰC TẾ VÀ PHỤ THUỘC NGỮ CẢNH):

QUAN TRỌNG: Các chỉ số arousal phải THỰC TẾ và phụ thuộc vào:
- Giới tính, độ tuổi, tầng lớp xã hội
- Bối cảnh câu chuyện (hiện đại, trung cổ, tương lai, etc.)
- Văn hóa và xã hội trong thế giới game
- Tính cách và background của NPC
- Mối quan hệ hiện tại với người chơi

- Responsiveness (Phản ứng): 0-100, mức độ dễ bị kích thích
  * HƯỚNG DẪN: Phụ nữ trẻ (16-25) thường có responsiveness 40-70
  * HƯỚNG DẪN: Nam giới trẻ (16-25) thường có responsiveness 50-80
  * HƯỚNG DẪN: Người lớn tuổi (40+) thường có responsiveness 30-60
  * HƯỚNG DẪN: Trung cổ: responsiveness thấp hơn (30-60) do văn hóa bảo thủ
  * HƯỚNG DẪN: Hiện đại: responsiveness cao hơn (50-85) do văn hóa cởi mở
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- Inhibition (Ức chế): 0-100, mức độ kiềm chế cảm xúc
  * HƯỚNG DẪN: Phụ nữ thường có inhibition cao hơn (50-80) do văn hóa
  * HƯỚNG DẪN: Nam giới thường có inhibition thấp hơn (40-70)
  * HƯỚNG DẪN: Trung cổ: inhibition cao (70-90) do văn hóa nghiêm khắc
  * HƯỚNG DẪN: Hiện đại: inhibition thấp hơn (30-70)
  * HƯỚNG DẪN: Tầng lớp cao: inhibition cao hơn (60-85)
  * HƯỚNG DẪN: Tầng lớp thấp: inhibition thấp hơn (30-60)
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- Curiosity (Tò mò): 0-100, mức độ tò mò về nội dung thân mật
  * HƯỚNG DẪN: Tuổi teen (16-19): curiosity cao (60-85)
  * HƯỚNG DẪN: Tuổi 20-30: curiosity trung bình (50-75)
  * HƯỚNG DẪN: Tuổi 40+: curiosity thấp (30-60)
  * HƯỚNG DẪN: Trung cổ: curiosity thấp (20-50) do giáo dục hạn chế
  * HƯỚNG DẪN: Hiện đại: curiosity cao hơn (60-85)
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- Experience (Kinh nghiệm): 0-100, mức độ kinh nghiệm thân mật
  * HƯỚNG DẪN: Tuổi 16-20: experience thấp (20-50)
  * HƯỚNG DẪN: Tuổi 21-30: experience trung bình (40-75)
  * HƯỚNG DẪN: Tuổi 31-40: experience cao (60-85)
  * HƯỚNG DẪN: Tuổi 40+: experience rất cao (70-90)
  * HƯỚNG DẪN: Trung cổ: experience thấp hơn do kết hôn sớm
  * HƯỚNG DẪN: Hiện đại: experience cao hơn do giáo dục tình dục
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- Dominance (Thống trị): 0-100, xu hướng thống trị hoặc phục tùng
  * HƯỚNG DẪN: Nam giới thường có dominance cao hơn (45-75)
  * HƯỚNG DẪN: Phụ nữ thường có dominance thấp hơn (25-65)
  * HƯỚNG DẪN: Trung cổ: Nam giới dominance cao (70-90), Nữ giới thấp (10-40)
  * HƯỚNG DẪN: Hiện đại: Cân bằng hơn, phụ thuộc tính cách cá nhân
  * HƯỚNG DẪN: Tầng lớp cao: dominance cao hơn (55-85)
  * HƯỚNG DẪN: Tầng lớp thấp: dominance thấp hơn (25-65)
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- Romanticism (Lãng mạn): 0-100, mức độ ưa thích lãng mạn
  * HƯỚNG DẪN: Phụ nữ thường có romanticism cao hơn (55-85)
  * HƯỚNG DẪN: Nam giới thường có romanticism thấp hơn (35-70)
  * HƯỚNG DẪN: Tuổi teen: romanticism rất cao (70-90)
  * HƯỚNG DẪN: Tuổi 30+: romanticism thấp hơn (45-70)
  * HƯỚNG DẪN: Trung cổ: romanticism cao (65-90) do văn hóa lãng mạn
  * HƯỚNG DẪN: Hiện đại: romanticism trung bình (50-80)
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

SỞ THÍCH VÀ RANH GIỚI (THỰC TẾ VÀ PHỤ THUỘC NGỮ CẢNH):

- GenderPreference: Sở thích giới tính
  * HƯỚNG DẪN: Phụ nữ thường thích nam giới (70-85%)
  * HƯỚNG DẪN: Nam giới thường thích phụ nữ (75-90%)
  * HƯỚNG DẪN: Trung cổ: 95% heterosexual do văn hóa nghiêm khắc
  * HƯỚNG DẪN: Hiện đại: đa dạng hơn, phụ thuộc cá nhân
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- AgePreference: Sở thích tuổi tác
  * HƯỚNG DẪN: Nam giới thường thích phụ nữ trẻ hơn (younger)
  * HƯỚNG DẪN: Phụ nữ thường thích nam giới cùng tuổi hoặc lớn hơn (same/older)
  * HƯỚNG DẪN: Trung cổ: nam giới thích phụ nữ trẻ hơn nhiều (15-20 tuổi)
  * HƯỚNG DẪN: Hiện đại: cân bằng hơn, phụ thuộc cá nhân
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- PersonalityTypes: Loại tính cách hấp dẫn
  * HƯỚNG DẪN: Phụ nữ thích: confident, caring, intelligent, mysterious
  * HƯỚNG DẪN: Nam giới thích: gentle, caring, intelligent, beautiful
  * HƯỚNG DẪN: Trung cổ: nam giới thích submissive, obedient
  * HƯỚNG DẪN: Hiện đại: đa dạng, phụ thuộc cá nhân
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- TurnOns: Điều kích thích
  * HƯỚNG DẪN: Phụ nữ: intelligence, humor, kindness, romance, respect
  * HƯỚNG DẪN: Nam giới: beauty, youth, submission, loyalty
  * HƯỚNG DẪN: Trung cổ: obedience, purity, loyalty, wealth
  * HƯỚNG DẪN: Hiện đại: intelligence, humor, kindness, confidence
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- TurnOffs: Điều không thích
  * HƯỚNG DẪN: Phụ nữ: arrogance, violence, disrespect, immaturity
  * HƯỚNG DẪN: Nam giới: aggression, dominance, promiscuity
  * HƯỚNG DẪN: Trung cổ: disobedience, promiscuity, independence
  * HƯỚNG DẪN: Hiện đại: disrespect, violence, dishonesty
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- Kinks: Sở thích đặc biệt
  * HƯỚNG DẪN: Phụ nữ: romance, intimacy, emotional connection
  * HƯỚNG DẪN: Nam giới: physical attraction, submission, variety
  * HƯỚNG DẪN: Trung cổ: submission, obedience, traditional roles
  * HƯỚNG DẪN: Hiện đại: đa dạng, phụ thuộc cá nhân
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

- Boundaries: Ranh giới không được vi phạm
  * HƯỚNG DẪN: Phụ nữ: no violence, no humiliation, no disrespect
  * HƯỚNG DẪN: Nam giới: no dominance, no aggression, no betrayal
  * HƯỚNG DẪN: Trung cổ: no disobedience, no independence, no promiscuity
  * HƯỚNG DẪN: Hiện đại: no violence, no disrespect, no betrayal
  * LƯU Ý: Có thể có ngoại lệ dựa trên tính cách cá nhân

CÁCH SỬ DỤNG TRONG NARRATIVE (THỰC TẾ VÀ PHỤ THUỘC NGỮ CẢNH):

QUAN TRỌNG: Luôn xem xét giới tính, độ tuổi, bối cảnh và văn hóa khi tạo phản ứng:

- Responsiveness (Phản ứng):
  * Phụ nữ trẻ: phản ứng nhẹ nhàng, e thẹn nhưng có dấu hiệu quan tâm
  * Nam giới trẻ: phản ứng mạnh mẽ hơn, dễ bộc lộ cảm xúc
  * Người lớn tuổi: phản ứng chậm rãi, thận trọng
  * Trung cổ: phản ứng rất hạn chế, e dè do văn hóa

- Inhibition (Ức chế):
  * Phụ nữ: kiềm chế mạnh, ít biểu lộ trực tiếp
  * Nam giới: ít kiềm chế hơn, dễ bộc lộ
  * Trung cổ: ức chế rất cao, đặc biệt với phụ nữ
  * Hiện đại: ức chế thấp hơn, cởi mở hơn

- Curiosity (Tò mò):
  * Tuổi teen: tò mò cao, nhưng ngại ngùng
  * Tuổi 20-30: tò mò vừa phải, cân bằng
  * Tuổi 40+: tò mò thấp, thích sự quen thuộc
  * Trung cổ: tò mò rất thấp do giáo dục hạn chế

- Experience (Kinh nghiệm):
  * Tuổi trẻ: ngại ngùng, cần hướng dẫn
  * Tuổi trung niên: tự tin, biết cách
  * Tuổi cao: rất có kinh nghiệm, thông thái
  * Trung cổ: kinh nghiệm thấp do kết hôn sớm

- Dominance (Thống trị):
  * Nam giới: thích kiểm soát, dẫn dắt
  * Phụ nữ: thích phục tùng, được dẫn dắt
  * Trung cổ: nam giới thống trị tuyệt đối
  * Hiện đại: cân bằng hơn, phụ thuộc cá nhân

- Romanticism (Lãng mạn):
  * Phụ nữ: thích sự lãng mạn, ngọt ngào
  * Nam giới: ít lãng mạn hơn, thực tế hơn
  * Tuổi teen: lãng mạn rất cao
  * Trung cổ: lãng mạn cao do văn hóa

SỞ THÍCH VÀ RANH GIỚI:
- Tôn trọng turnOns, turnOffs, kinks và boundaries của NPC
- Vi phạm boundaries sẽ làm giảm hứng tình và có thể gây phản ứng tiêu cực
- Phụ nữ thường thích sự tôn trọng, lãng mạn, tình cảm
- Nam giới thường thích sự phục tùng, vẻ đẹp, sự trẻ trung
- Trung cổ: tuân thủ nghiêm ngặt các quy tắc xã hội
- Hiện đại: linh hoạt hơn, phụ thuộc cá nhân

VÍ DỤ HƯỚNG DẪN (CÓ THỂ CÓ NGOẠI LỆ):
- Phụ nữ 18 tuổi trong thế giới hiện đại: responsiveness 50-70, inhibition 60-80, curiosity 70-90, experience 20-40, dominance 25-45, romanticism 80-95
- Nam giới 25 tuổi trong thế giới trung cổ: responsiveness 50-70, inhibition 30-50, curiosity 20-40, experience 40-60, dominance 75-90, romanticism 60-80
- Phụ nữ 35 tuổi trong thế giới hiện đại: responsiveness 40-60, inhibition 50-70, curiosity 30-50, experience 70-90, dominance 30-50, romanticism 50-70
- Nam giới 40 tuổi trong thế giới hiện đại: responsiveness 40-60, inhibition 40-60, curiosity 30-50, experience 80-95, dominance 50-70, romanticism 40-60
- Phụ nữ 22 tuổi trong thế giới trung cổ: responsiveness 30-50, inhibition 70-90, curiosity 20-40, experience 10-30, dominance 10-30, romanticism 70-90

HƯỚNG DẪN VỀ ĐỐI THOẠI:
- Khi người chơi sử dụng dấu ngoặc kép ("..."), đó là câu đối thoại trực tiếp
- Hãy phản hồi một cách tự nhiên và phù hợp với ngữ cảnh
- NPCs nên phản ứng phù hợp với nội dung đối thoại và mối quan hệ hiện tại

QUY TẮC THỐNG NHẤT VỀ ĐỐI THOẠI:
- BẮT BUỘC: Tất cả lời nói trực tiếp của NPCs PHẢI được viết trong dấu ngoặc kép ("...")
- BẮT BUỘC: Tất cả lời nói trực tiếp của nhân vật chính PHẢI được viết trong dấu ngoặc kép ("...")
- BẮT BUỘC: Tất cả câu đối thoại trong game PHẢI được viết trong dấu ngoặc kép ("...")
- KHÔNG BAO GIỜ viết lời nói trực tiếp mà không có dấu ngoặc kép
- KHÔNG BAO GIỜ sử dụng dấu ngoặc đơn ('...') cho đối thoại
- KHÔNG BAO GIỜ sử dụng dấu gạch ngang (-) cho đối thoại
- KHÔNG BAO GIỜ sử dụng dấu hai chấm (:) mà không có dấu ngoặc kép

VÍ DỤ ĐÚNG:
- "Xin chào! Tôi là Satoru Gojo."
- Satoru nói: "Bạn có khỏe không?"
- "Tôi cảm ơn bạn rất nhiều!" cô ấy thốt lên.

VÍ DỤ SAI:
- Xin chào! Tôi là Satoru Gojo. (thiếu dấu ngoặc kép)
- Satoru nói: Xin chào! (thiếu dấu ngoặc kép)
- 'Cảm ơn bạn!' (sai dấu ngoặc)

ĐỊNH DẠNG TÊN NGƯỜI NÓI:
- Khi có nhiều người nói, hãy thêm tên trước câu đối thoại
- Ví dụ: "Satoru nói: 'Xin chào!'"
- Ví dụ: "Megumi thốt lên: 'Tôi không tin được!'"
- Đối thoại nên phù hợp với tính cách và background của NPC
- Khi người chơi nói chuyện, hãy tạo ra cuộc đối thoại sinh động và có ý nghĩa

Quy tắc:
- Nếu có xung đột thông tin: ưu tiên PLAYER_ACTION trước tiên, sau đó đến SCENE_STATE, rồi SUMMARY, cuối cùng mới tới CHAT_DELTA.
- Văn xuôi 120–200 từ (TỐI ĐA 200 TỪ), không bullet/emoji/markdown, mô tả hệ quả cụ thể, cảm quan, và tiến độ cốt truyện.
- Tôn trọng continuityRules, tone, mainThreads trong SCENARIO; định hướng mềm tới các keyBeats/twist/kết thúc, nhưng không ép buộc tự do người chơi.
- KHÔNG nhắc đến "prompt/JSON/meta".
- QUAN TRỌNG: Sử dụng đúng ngôi kể đã được cài đặt trong WORLD (narration field). Nếu narration là "Ngôi thứ hai", hãy kể bằng "Bạn" thay vì "Anh ấy/Cô ấy". Nếu narration là "Ngôi thứ nhất", hãy kể bằng "Tôi". Nếu narration là "Ngôi thứ ba", hãy kể bằng "Anh ấy/Cô ấy".
- Nếu hành động của người chơi vi phạm chính sách nội dung, hãy từ chối lịch sự và đề xuất hướng thay thế an toàn.

CẤU TRÚC NARRATIVE:
1. BẮT ĐẦU: Phản hồi trực tiếp với hành động của người chơi (PLAYER_ACTION)
2. PHÁT TRIỂN: Mô tả kết quả, phản ứng của thế giới, NPCs, hoặc tình huống
3. MỞ RỘNG: Tiếp tục câu chuyện dựa trên hành động đó, có thể gợi ý bước tiếp theo
4. KẾT THÚC: Để lại câu hỏi mở hoặc tình huống cho người chơi quyết định tiếp theo

VÍ DỤ CẤU TRÚC NARRATIVE:
- Người chơi: "Tôi mở cửa phòng"
- AI phản hồi: "Bạn đẩy cánh cửa gỗ cũ kỹ, tiếng kẽo kẹt vang lên trong không gian yên tĩnh. Ánh sáng từ bên ngoài chiếu vào, làm lộ ra một căn phòng bụi bặm với những đồ vật kỳ lạ. [Tiếp tục mô tả phòng và gợi ý bước tiếp theo]"

VÍ DỤ TÔN TRỌNG SỰ TỰ DO CỦA NGƯỜI CHƠI:
- Người chơi: "Tôi đi vào phòng học thay vì thư viện"
- AI phản hồi SAI: "Bạn cảm thấy rõ ràng rằng khu vực này không hề liên quan đến mục tiêu hiện tại của mình. Với hiện vật Eldar trong tay, nơi bạn cần đến là thư viện..."
- AI phản hồi ĐÚNG: "Bạn bước vào phòng học, ánh sáng mờ ảo chiếu qua cửa sổ tạo nên những bóng đen kỳ lạ trên bảng đen. Các bàn ghế được xếp ngay ngắn, nhưng có vẻ như có gì đó khác thường ở góc phòng - một cuốn sách cổ đang mở trên bàn giáo viên, và những ký tự lạ lùng trên trang giấy có vẻ quen thuộc với hiện vật bạn đang cầm..."

QUEST SYSTEM RULES:
- Chỉ tạo side quest khi có cơ hội tự nhiên trong câu chuyện (không ép buộc)
- Tránh tạo quá nhiều side quest cùng lúc (tối đa 1 side quest mỗi 3-5 turn)
- Side quest phải liên quan đến context hiện tại và có ý nghĩa với story
- QUAN TRỌNG: Chỉ nhắc đến quest khi người chơi đang thực sự làm quest đó (trong vòng 1-2 turn gần đây)
- QUAN TRỌNG: KHÔNG nhắc lại quest cũ nếu người chơi đã chuyển sang làm việc khác
- QUAN TRỌNG: Khi tích hợp quest vào narrative, hãy mô tả tình huống và bối cảnh một cách tự nhiên, để người chơi tự hiểu và quyết định hành động. KHÔNG nói "Bây giờ bạn có nhiệm vụ..." hay "Mục tiêu của bạn là..."
- QUAN TRỌNG: KHÔNG BAO GIỜ nhắc lại hoặc đề xuất lại các side quest đã bị từ chối (xem danh sách "Declined Side Quests")
- QUAN TRỌNG: Nếu người chơi đã từ chối một quest, hãy tôn trọng quyết định đó và KHÔNG BAO GIỜ đề cập đến quest đó nữa trong bất kỳ response nào
- QUAN TRỌNG: KHÔNG BAO GIỜ tạo lại quest tương tự với quest đã bị từ chối
- QUAN TRỌNG: KHÔNG BAO GIỜ nhắc đến tên, nội dung, hoặc bất kỳ chi tiết nào của quest đã bị từ chối
- Nếu người chơi đang làm việc khác (không liên quan quest), hãy tập trung vào hành động hiện tại thay vì nhắc quest
- TUYỆT ĐỐI KHÔNG được sử dụng quest để phản bác hoặc hạn chế hành động của người chơi
- TUYỆT ĐỐI KHÔNG được nói "điều này không liên quan đến quest" hoặc tương tự
- Nếu người chơi làm gì đó không liên quan quest, hãy tìm cách tích hợp nó vào câu chuyện một cách sáng tạo

ĐẦU VÀO:
- WORLD: ${worldJson}
- CHARACTER: ${characterJson}
- SCENARIO: ${scenarioJson}
- SUMMARY (SCC): ${JSON.stringify(summary)}
- SCENE_STATE: ${JSON.stringify(sceneState)} (chứa location, locationId, npcs, inventory, clocks, flags)
- CHAT_DELTA (sau snapshot, ≤ ${chatDelta.length} lượt): ${JSON.stringify(chatDelta)}
- PLAYER_ACTION: "${playerAction}"
- GAME_TIME: ${JSON.stringify(worldTime || sceneState.worldTime || { hour: 12, minute: 0, day: 1, month: 1, year: 1 })}

${this.buildLocationContext(sceneState)}

⚠️ QUAN TRỌNG: PLAYER_ACTION là hành động người chơi vừa thực hiện. BẮT BUỘC phải phản hồi trực tiếp với hành động này. KHÔNG được bỏ qua hoặc làm lơ.

LƯU Ý VỀ NGÔI KỂ:
- Kiểm tra trường "narration" trong WORLD để xác định ngôi kể
- Nếu narration = "Ngôi thứ hai": sử dụng "Bạn" khi nói về nhân vật chính
- Nếu narration = "Ngôi thứ nhất": sử dụng "Tôi" khi nói về nhân vật chính  
- Nếu narration = "Ngôi thứ ba": sử dụng "Anh ấy/Cô ấy" khi nói về nhân vật chính

QUAN TRỌNG VỀ TÊN NHÂN VẬT:
- KHÔNG BAO GIỜ tạo NPC có tên giống với nhân vật chính (PC)
- Kiểm tra tên nhân vật chính trong CHARACTER data và đảm bảo tất cả NPC có tên khác biệt
- Nếu cần tạo NPC, hãy sử dụng tên hoàn toàn khác với PC
- Ví dụ: Nếu PC tên "Ren Tanaka", NPC phải có tên khác như "Satoru Gojo", "Megumi Fushiguro", "Yuji Itadori", etc.

QUAN TRỌNG VỀ TÊN ĐỊA ĐIỂM VÀ TÊN RIÊNG:
- KHÔNG BAO GIỜ đặt tên địa điểm, tên người, tên tổ chức trong dấu ngoặc kép ("...")
- Để làm nổi bật tên địa điểm và tên riêng, sử dụng dấu gạch chéo đơn /.../ thay vì dấu ngoặc kép
- Ví dụ: /Thành phố Atlantis/, /Satoru Gojo/, /Học viện Hogwarts/
- Điều này giúp phân biệt rõ ràng giữa tên riêng và đối thoại
- KHÔNG BAO GIỜ sử dụng dấu ngoặc kép cho tên địa điểm vì sẽ gây nhầm lẫn với đối thoại

QUAN TRỌNG VỀ TÊN VẬT THỂ, THỰC THỂ VÀ KHÁI NIỆM:
- KHÔNG BAO GIỜ đặt tên vật thể, thực thể, khái niệm, thuật ngữ trong dấu ngoặc kép ("...") hoặc dấu ngoặc đơn ('...')
- Để làm nổi bật tên vật thể, thực thể, khái niệm, sử dụng dấu gạch chéo đơn /.../ thay vì dấu ngoặc kép
- Ví dụ: /di vật cảm ứng/, /Tiếng Gọi Của Vực Sâu/, /Tĩnh Lặng Vực Sâu/, /Bản Ghi Chép Về Sự Suy Thoái Tinh Thần/
- Điều này giúp phân biệt rõ ràng giữa tên vật thể/thực thể và đối thoại
- KHÔNG BAO GIỜ sử dụng dấu ngoặc kép hoặc dấu ngoặc đơn cho tên vật thể vì sẽ gây nhầm lẫn với đối thoại

VÍ DỤ ĐÚNG:
- "Xin chào! Tôi là /Satoru Gojo/."
- /Satoru/ nói: "Bạn có khỏe không?"
- "Tôi cảm ơn bạn rất nhiều!" cô ấy thốt lên.
- Bạn bước vào /Thành phố Atlantis/ và nhìn thấy /Học viện Hogwarts/ ở phía xa.
- Bạn tìm thấy cuốn sách /Bản Ghi Chép Về Sự Suy Thoái Tinh Thần/ trên kệ.
- Gideon đang nghiên cứu về /di vật cảm ứng/ và /Tiếng Gọi Của Vực Sâu/.

VÍ DỤ SAI:
- Xin chào! Tôi là Satoru Gojo. (thiếu dấu ngoặc kép cho đối thoại)
- Satoru nói: Xin chào! (thiếu dấu ngoặc kép cho đối thoại)
- 'Cảm ơn bạn!' (sai dấu ngoặc cho đối thoại)
- "Thành phố Atlantis" (sai: tên địa điểm không nên dùng dấu ngoặc kép)
- "di vật cảm ứng" (sai: tên vật thể không nên dùng dấu ngoặc kép)
- 'Tiếng Gọi Của Vực Sâu' (sai: tên khái niệm không nên dùng dấu ngoặc đơn)
- "Bản Ghi Chép Về Sự Suy Thoái Tinh Thần" (sai: tên tài liệu không nên dùng dấu ngoặc kép)

QUAN TRỌNG VỀ NPCs:
- Khi tạo NPC trong sceneState.npcs, hãy mô tả chi tiết về họ trong narrative
- Bao gồm tên, trạng thái hiện tại, mô tả ngắn, tags (thương gia, quý tộc, tội phạm, v.v.), và faction nếu có
- QUAN TRỌNG: Tags phải bằng tiếng Việt (ví dụ: "thương gia", "quý tộc", "học giả", "chiến binh", "nông dân", "thợ thủ công", "tội phạm", "quan chức", "pháp sư", "thầy thuốc")
- QUAN TRỌNG VỀ FACTION: 
  * KHÔNG phải tất cả NPC đều có faction
  * CHỈ gán faction khi NPC có lý do cụ thể và phù hợp với faction đó
  * NPCs thông thường như nhân viên, dân thường, nông dân, thương gia thường KHÔNG thuộc faction
  * CHỈ gán faction cho NPCs có vai trò quan trọng, quyền lực, hoặc liên quan trực tiếp đến faction:
    - Lãnh đạo, quan chức cấp cao
    - Chiến binh, binh lính chính thức
    - Thành viên tổ chức bí mật
    - Người có quyền lực chính trị/quân sự
    - Người có mối liên hệ đặc biệt với faction
  * Nếu không chắc chắn, KHÔNG gán faction cho NPC
- ĐẢM BẢO tên NPC khác hoàn toàn với tên PC
- CHỈ TẠO NPC CÁ THỂ RIÊNG BIỆT, KHÔNG TẠO NHÓM:
  * Tên phải là tên riêng cụ thể (ví dụ: "Satoru Gojo", "Megumi Fushiguro", "Nobara Kugisaki")
  * KHÔNG tạo NPC với tên như "học viên", "nhiều người", "nhóm người", "đám đông"

QUAN TRỌNG VỀ HỆ THỐNG NPC ĐẶC TRƯNG CHO ĐỊA ĐIỂM PHỤ:
- KHI NGƯỜI CHƠI VÀO ĐỊA ĐIỂM PHỤ (type: 'secondary'), BẮT BUỘC phải tạo ít nhất 1 NPC đặc trưng
- NPC đặc trưng phải có các thuộc tính sau trong sceneState.npcs:
  * isLocationSignature: true
  * signatureLocationId: ID của địa điểm phụ hiện tại (lấy từ thông tin VỊ TRÍ HIỆN TẠI ở trên)
  * tags: phải chứa tag phù hợp với địa điểm (ví dụ: "chủ quán", "thủ thư", "thầy thuốc", "thương gia")
  * description: mô tả chi tiết về vai trò của NPC tại địa điểm này
- NPC đặc trưng phải có tính cách và mục đích rõ ràng liên quan đến địa điểm
- NPC đặc trưng sẽ luôn có 1 nhiệm vụ phụ đặc trưng để giao cho người chơi
- Các NPC khác tại địa điểm phụ (nếu có) KHÔNG được đánh dấu isLocationSignature: true
- CHỈ có 1 NPC đặc trưng duy nhất cho mỗi địa điểm phụ
- QUAN TRỌNG: Sử dụng chính xác locationId từ thông tin VỊ TRÍ HIỆN TẠI ở trên

QUAN TRỌNG VỀ SIGNATURE QUEST (NHIỆM VỤ PHỤ ĐẶC TRƯNG):
- KHI NPC đặc trưng được tạo, BẮT BUỘC phải tạo sideQuestOffer với:
  * isLocationSignature: true
  * signatureLocationId: ID của địa điểm phụ hiện tại (lấy từ thông tin VỊ TRÍ HIỆN TẠI ở trên)
  * signatureNPCId: ID của NPC đặc trưng (sẽ được hệ thống tự động gán)
- Signature quest phải có tính chất đặc trưng cho địa điểm:
  * Liên quan trực tiếp đến vai trò và mục đích của địa điểm
  * Phù hợp với tính cách và nghề nghiệp của NPC đặc trưng
  * Có bước cuối cùng là "gặp lại NPC đặc trưng để báo cáo"
- Ví dụ signature quest:
  * Tại quán rượu: "Thu thập thông tin từ khách hàng" → "Báo cáo với chủ quán"
  * Tại thư viện: "Tìm kiếm tài liệu cổ" → "Trả lời thủ thư"
  * Tại cửa hàng: "Giao hàng cho khách" → "Báo cáo với thương gia"
- Signature quest phải có ít nhất 2 objectives:
  * Objective 1: Nhiệm vụ chính liên quan đến địa điểm
  * Objective 2: "Gặp lại [Tên NPC đặc trưng] để báo cáo kết quả"

QUAN TRỌNG VỀ QUY TẮC TẠO QUEST:
- SIGNATURE QUEST (đặc trưng cho địa điểm phụ):
  * CHỈ được tạo 1 LẦN duy nhất khi người chơi lần đầu vào địa điểm phụ
  * KHÔNG được tạo lại nếu đã có signature quest cho địa điểm đó
  * Luôn được tạo khi có NPC đặc trưng mới

QUAN TRỌNG VỀ QUEST REWARDS - TUÂN THỦ NGHIÊM NGẶT:
- SIDE QUEST: BẮT BUỘC phải có đúng 2 loại phần thưởng (random 2 trong 3: currency, experience, item)
- Mỗi loại reward phải có amount cụ thể và description rõ ràng
- Currency: 20-100, Experience: 100-300, Item: 1 vật phẩm hữu ích
- KHÔNG ĐƯỢC bỏ sót bất kỳ loại reward nào theo quy định
- Nếu thiếu reward, hệ thống sẽ tự động thêm vào

HƯỚNG DẪN VỀ VẬT PHẨM (ITEMS):
- Khi người chơi nhận được, tìm thấy, hoặc mua vật phẩm, hãy mô tả chi tiết trong narrative
- Thêm thông tin item vào sceneState.inventory theo format:
  * name: tên vật phẩm
  * description: mô tả chi tiết
  * type: 'weapon' | 'armor' | 'consumable' | 'misc'
  * rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  * quantity: số lượng
  * stats (nếu có): { strength: +2, agility: -1, etc. }
  * slot (nếu là trang bị): 'weapon_main' | 'weapon_off' | 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'accessory1' | 'accessory2' | 'accessory3'

QUAN TRỌNG - TÍNH HỢP LÝ CỦA VẬT PHẨM:
- Items PHẢI phù hợp với bối cảnh thời đại và thế giới game:
  * Thời trung cổ: KHÔNG có smartphone, súng lục, máy tính, điện thoại, xe hơi, vũ khí hiện đại
  * Thời hiện đại: KHÔNG có sách phép thật, quyền trượng có phép thuật, áo giáp thời trung cổ (trừ khi là đồ cổ/trang sức)
  * Tương lai: Có thể có công nghệ cao, nhưng vẫn phải hợp lý với setting
  * Fantasy: Có thể có phép thuật, nhưng phải consistent với thế giới đã thiết lập
- Vũ khí và trang bị phải phù hợp với thời đại:
  * Thời trung cổ: Kiếm, cung tên, áo giáp, khiên, gậy gỗ
  * Thời hiện đại: Súng, dao, áo chống đạn, thiết bị điện tử
  * Fantasy: Kiếm phép, áo giáp ma thuật, pháp trượng
- KHÔNG tạo items ngẫu nhiên hoặc không có lý do
- Items chỉ xuất hiện khi thực sự cần thiết và hợp lý với tình huống
- KHÔNG lạm dụng - không phải response nào cũng cần có items
- Items chỉ xuất hiện đúng lúc, đúng chỗ và phải hợp lý với tình huống
- Ưu tiên chất lượng hơn số lượng - ít items nhưng có ý nghĩa
- Mô tả items một cách sinh động và hấp dẫn trong narrative

QUAN TRỌNG VỀ ITEM REWARDS TRONG SIDE QUEST:
- KHÔNG BAO GIỜ sử dụng "Vật phẩm ngẫu nhiên" hoặc "Một vật phẩm hữu ích"
- TẠO TÊN CỤ THỂ cho từng item dựa trên context của side quest
- TẠO MÔ TẢ CHI TIẾT về tác dụng và đặc điểm của item
- VÍ DỤ TỐT: "Chìa khóa cổ", "Thuốc độc", "Bản đồ bí mật", "Đá quý ma thuật"
- VÍ DỤ SAI: "Vật phẩm ngẫu nhiên", "Một vật phẩm hữu ích"

ĐẦU RA (JSON, không thêm chữ khác):
{
  "narrative": "văn xuôi 120–200 từ (TỐI ĐA 200 TỪ), liền mạch, không bullet/emoji",
  "softGuidance": "1–2 câu định hướng kín đáo (có thể rỗng)",
  "sceneState": { "các trường cần cập nhật (vị trí, NPC, manh mối, rủi ro, đồng hồ, inventory…)" },
  "storyProgress": { "act": 1, "beat": "mô tả nhịp truyện" },
  "sideQuestOffer": {
    "title": "tên quest phụ (chỉ có khi có cơ hội tự nhiên)",
    "description": "mô tả quest phụ",
    "objectives": [
      {
        "id": "obj_1",
        "description": "mục tiêu quest phụ",
        "aiKeywords": ["từ khóa AI cần nhận diện"]
      },
      {
        "id": "obj_2",
        "description": "gặp lại NPC để báo cáo (chỉ cho signature quest)",
        "aiKeywords": ["báo cáo", "gặp lại", "trả lời"]
      }
    ],
    "rewards": [
      {
        "type": "currency",
        "amount": 50,
        "description": "Tiền tệ +50"
      },
      {
        "type": "experience",
        "amount": 200,
        "description": "Kinh nghiệm +200"
      },
      {
        "type": "item",
        "amount": 1,
        "items": [
          {
            "name": "Vật phẩm ngẫu nhiên",
            "description": "Một vật phẩm hữu ích",
            "type": "misc",
            "rarity": "common"
          }
        ],
        "description": "Vật phẩm ngẫu nhiên"
      }
    ],
    "isLocationSignature": false,
    "signatureLocationId": null,
    "signatureNPCId": null
  }
}`;

    try {
      const responseText = await this.generateContent(prompt, undefined);
      
      // Parse JSON response với fallback
      const fallbackResult = {
        narrative: 'Xin lỗi, có lỗi xảy ra khi xử lý phản hồi từ AI. Vui lòng thử lại.',
        softGuidance: '',
        sceneState: {},
        storyProgress: {},
        sideQuestOffer: null
      };

      const result = this.parseJsonResponse(responseText, fallbackResult);

      // Cải thiện tên NPC trong sceneState nếu có
      if (result.sceneState && result.sceneState.npcs && Array.isArray(result.sceneState.npcs)) {
        try {
          // Parse world context để xác định văn hóa
          let worldContext: any = null;
          try {
            worldContext = JSON.parse(worldJson);
          } catch (e) {
            console.warn('Không thể parse world context:', e);
          }

          // Xác định văn hóa dựa trên thế giới
          let culture = 'western';
          if (worldContext) {
            const genres = Array.isArray(worldContext.genres) ? worldContext.genres : [worldContext.genres];
            const genreStr = genres.join(' ').toLowerCase();
            
            if (genreStr.includes('vietnam') || genreStr.includes('việt')) {
              culture = 'vietnamese';
            } else if (genreStr.includes('japan') || genreStr.includes('nhật')) {
              culture = 'japanese';
            } else if (genreStr.includes('china') || genreStr.includes('trung')) {
              culture = 'chinese';
            } else if (genreStr.includes('korea') || genreStr.includes('hàn')) {
              culture = 'korean';
            } else if (genreStr.includes('fantasy') || genreStr.includes('fantasy')) {
              culture = 'fantasy';
            } else if (genreStr.includes('sci-fi') || genreStr.includes('khoa học')) {
              culture = 'sci-fi';
            } else if (genreStr.includes('medieval') || genreStr.includes('trung cổ')) {
              culture = 'medieval';
            }
          }

          // Parse character context để lấy tên nhân vật chính
          let characterName = '';
          try {
            const characterContext = JSON.parse(characterJson);
            characterName = characterContext.name || characterContext.characterName || '';
          } catch (e) {
            console.warn('Không thể parse character context:', e);
          }

          // Cải thiện tên NPC
          result.sceneState.npcs = result.sceneState.npcs.map((npc: any) => {
            // Nếu NPC không có tên hoặc tên quá chung chung
            if (!npc.name || 
                npc.name.toLowerCase().includes('npc') || 
                npc.name.toLowerCase().includes('người') ||
                npc.name.toLowerCase().includes('nhân vật') ||
                npc.name === 'Unknown' ||
                npc.name === 'N/A' ||
                npc.name.trim() === '') {
              
              try {
                // Xác định giới tính dựa trên mô tả hoặc tags
                let gender: 'male' | 'female' | 'any' = 'any';
                if (npc.description) {
                  const desc = npc.description.toLowerCase();
                  if (desc.includes('nam') || desc.includes('anh') || desc.includes('ông') || desc.includes('chàng')) {
                    gender = 'male';
                  } else if (desc.includes('nữ') || desc.includes('chị') || desc.includes('cô') || desc.includes('bà')) {
                    gender = 'female';
                  }
                }

                // Xác định vai trò dựa trên tags hoặc mô tả
                let role = 'thường dân';
                if (npc.tags && Array.isArray(npc.tags)) {
                  const tagStr = npc.tags.join(' ').toLowerCase();
                  if (tagStr.includes('thương gia') || tagStr.includes('merchant')) {
                    role = 'thương gia';
                  } else if (tagStr.includes('quý tộc') || tagStr.includes('noble')) {
                    role = 'quý tộc';
                  } else if (tagStr.includes('chiến binh') || tagStr.includes('warrior')) {
                    role = 'chiến binh';
                  } else if (tagStr.includes('pháp sư') || tagStr.includes('mage')) {
                    role = 'pháp sư';
                  } else if (tagStr.includes('thầy thuốc') || tagStr.includes('healer')) {
                    role = 'thầy thuốc';
                  }
                }

                // Tạo tên mới
                const generatedName = nameGenerationService.generateNPCName(role, npc.faction, gender);
                
                // Đảm bảo tên không trùng với nhân vật chính
                let finalName = generatedName.name;
                if (characterName && finalName.toLowerCase().includes(characterName.toLowerCase())) {
                  // Tạo tên khác nếu trùng
                  const alternativeName = nameGenerationService.generateName({
                    culture: culture as any,
                    gender,
                    type: 'full',
                    length: 'medium'
                  });
                  finalName = alternativeName.name;
                }

                
                return {
                  ...npc,
                  name: finalName
                };
              } catch (nameError) {
                console.error('Lỗi tạo tên NPC:', nameError);
                return npc; // Giữ nguyên nếu có lỗi
              }
            }
            
            return npc; // Giữ nguyên nếu tên đã tốt
          });
        } catch (error) {
          console.error('Lỗi cải thiện tên NPC:', error);
          // Tiếp tục với kết quả gốc nếu có lỗi
        }
      }

      return {
        narrative: result.narrative || fallbackResult.narrative,
        softGuidance: result.softGuidance || '',
        sceneState: result.sceneState || {},
        storyProgress: result.storyProgress || {},
        sideQuestOffer: result.sideQuestOffer || null
      };
    } catch (error) {
      console.error('Lỗi khi tạo turn response với delta context:', error);
      throw new Error('Không thể tạo phản hồi. Vui lòng thử lại.');
    }
  }

  async generateWorldDetails(coreIdea: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API chưa được cấu hình. Vui lòng nhập API key.');
    }

    const prompt = `Dựa trên ý tưởng cốt lõi: "${coreIdea}"

Hãy tạo thông tin chi tiết về thế giới bằng TIẾNG VIỆT:

1. Tông truyện (storyTone): Chọn từ: Bí ẩn, Hào hùng, U ám, Vui tươi, Căng thẳng, Lãng mạn, Kinh dị, Hài hước, Bi thương, Hy vọng, Triết học, Hành động, Chính trị

2. Ngôi kể (narration): Mặc định là "Ngôi thứ hai", chỉ thay đổi nếu thực sự cần thiết

3. Độ khó (difficulty): Chọn từ: Dễ, Trung bình, Khó, Cực khó

4. Tiền tệ (currencies): Tạo 1-2 loại tiền tệ phù hợp với thế giới. Mô tả ngắn gọn (1-2 câu)

QUAN TRỌNG: 
- Tất cả nội dung phải được viết bằng TIẾNG VIỆT
- Tên riêng (tên nhân vật, địa điểm, tổ chức) có thể giữ nguyên tiếng Anh nếu phù hợp với bối cảnh
- Ví dụ: "Thành phố New York", "Hiệp sĩ Arthur", "Học viện Hogwarts"

Trả về JSON format:
{
  "storyTone": "tông truyện được chọn",
  "narration": "ngôi kể được chọn", 
  "difficulty": "độ khó được chọn",
  "currencies": [
    {
      "name": "Tên tiền tệ",
      "description": "Mô tả ngắn gọn (1-2 câu)",
      "isMain": true
    }
  ]
}`;

    try {
      return await this.generateContent(prompt, undefined);
    } catch (error) {
      console.error('Error generating world details:', error);
      throw new Error('Có lỗi xảy ra khi tạo chi tiết thế giới');
    }
  }
}

export const geminiService = new GeminiService();

