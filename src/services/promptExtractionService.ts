import { geminiService } from './geminiService';

class PromptExtractionService {
  private static instance: PromptExtractionService;
  private promptCache: Map<string, { prompt: string; negativePrompt: string }> = new Map();

  private constructor() {}

  public static getInstance(): PromptExtractionService {
    if (!PromptExtractionService.instance) {
      PromptExtractionService.instance = new PromptExtractionService();
    }
    return PromptExtractionService.instance;
  }

  // Extract visual elements from text using Gemini
  async extractVisualPrompt(text: string, context: any): Promise<{ prompt: string; negativePrompt: string }> {
    try {
      // Create cache key from text and context
      const cacheKey = this.createCacheKey(text, context);
      
      if (this.promptCache.has(cacheKey)) {
        return this.promptCache.get(cacheKey)!;
      }

      // Build context description
      const contextDescription = this.buildContextDescription(context);
      
      // Create prompt for Gemini to extract visual elements
      const extractionPrompt = `Bạn là AI chuyên gia tạo prompt cho Stable Diffusion. 
Từ đoạn văn bản game và context dưới đây, hãy tạo một prompt ngắn gọn (tối đa 200 từ) để tạo ảnh minh họa.

QUAN TRỌNG:
- Prompt phải bằng tiếng Anh
- Tập trung vào visual elements: địa điểm, nhân vật, khí quyển, ánh sáng
- Sử dụng từ khóa chất lượng: "detailed", "high quality", "digital art", "concept art"
- Thêm style: "fantasy art style", "dramatic lighting"
- KHÔNG bao gồm text, chữ viết, watermark

CONTEXT:
${contextDescription}

VĂN BẢN GAME:
${text}

Hãy trả về JSON với format:
{
  "prompt": "prompt tiếng Anh cho Stable Diffusion",
  "negativePrompt": "negative prompt tiếng Anh"
}

Chỉ trả về JSON, không có text khác.`;

      const response = await geminiService.generateContent(extractionPrompt);
      
      // Parse JSON response
      const result = this.parseJsonResponse(response);
      
      // Cache the result
      this.promptCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error extracting visual prompt:', error);
      // Fallback to basic prompt
      return this.buildFallbackPrompt(text, context);
    }
  }

  // Build positive prompt from context
  private buildPositivePrompt(location: any, npcs: any[], items: any[], atmosphere: string): string {
    let prompt = 'fantasy scene, ';
    
    // Add location
    if (location) {
      prompt += `${location.type || 'location'}, `;
      if (atmosphere) {
        prompt += `${atmosphere}, `;
      }
      if (location.features?.length > 0) {
        prompt += `${location.features.join(', ')}, `;
      }
    }
    
    // Add NPCs
    if (npcs?.length > 0) {
      const npcDescriptions = npcs.map(npc => `${npc.name} (${npc.role})`).join(', ');
      prompt += `characters: ${npcDescriptions}, `;
    }
    
    // Add items
    if (items?.length > 0) {
      const itemNames = items.map(item => item.name).join(', ');
      prompt += `items: ${itemNames}, `;
    }
    
    // Add quality tags
    prompt += 'detailed environment, high quality, digital art, concept art, dramatic lighting, fantasy art style';
    
    return prompt;
  }

  // Build negative prompt (standard quality filters)
  private buildNegativePrompt(): string {
    return 'blurry, low quality, distorted, deformed, ugly, bad anatomy, text, watermark, signature, modern technology, cars, buildings, realistic photo, photograph';
  }

  // Build context description for Gemini
  private buildContextDescription(context: any): string {
    let description = '';
    
    if (context.location) {
      description += `Địa điểm: ${context.location.name || 'Unknown'} (${context.location.type || 'location'})\n`;
      if (context.location.atmosphere) {
        description += `Khí quyển: ${context.location.atmosphere}\n`;
      }
      if (context.location.features?.length > 0) {
        description += `Đặc điểm: ${context.location.features.join(', ')}\n`;
      }
    }
    
    if (context.npcs?.length > 0) {
      description += `NPCs: ${context.npcs.map((npc: any) => `${npc.name} (${npc.role})`).join(', ')}\n`;
    }
    
    if (context.items?.length > 0) {
      description += `Vật phẩm: ${context.items.map((item: any) => item.name).join(', ')}\n`;
    }
    
    return description;
  }

  // Create cache key
  private createCacheKey(text: string, context: any): string {
    const contextStr = JSON.stringify(context);
    return `${text.substring(0, 100)}_${contextStr.substring(0, 100)}`;
  }

  // Parse JSON response from Gemini
  private parseJsonResponse(response: string): { prompt: string; negativePrompt: string } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        return {
          prompt: parsed.prompt || 'fantasy scene, detailed, high quality',
          negativePrompt: parsed.negativePrompt || this.buildNegativePrompt()
        };
      }
    } catch (error) {
      console.warn('Failed to parse JSON response:', error);
    }
    
    // Fallback
    return {
      prompt: 'fantasy scene, detailed, high quality, digital art, concept art',
      negativePrompt: this.buildNegativePrompt()
    };
  }

  // Build fallback prompt when Gemini fails
  private buildFallbackPrompt(_text: string, context: any): { prompt: string; negativePrompt: string } {
    const location = context.location;
    const npcs = context.npcs || [];
    const items = context.items || [];
    const atmosphere = location?.atmosphere || '';
    
    const prompt = this.buildPositivePrompt(location, npcs, items, atmosphere);
    const negativePrompt = this.buildNegativePrompt();
    
    return { prompt, negativePrompt };
  }

  // Clear prompt cache
  clearCache(): void {
    this.promptCache.clear();
  }

  // Get cache size
  getCacheSize(): number {
    return this.promptCache.size;
  }
}

export const promptExtractionService = PromptExtractionService.getInstance();
