import { geminiService } from './geminiService';
import { CharacterAppearance } from '../types';

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

  // Extract visual elements from text using Gemini with enhanced features
  async extractVisualPrompt(
    text: string, 
    context: any, 
    style?: string, 
    customStyle?: string,
    qualityLevel: 'standard' | 'high' | 'ultra' = 'high',
    enableCharacterConsistency: boolean = true
  ): Promise<{ prompt: string; negativePrompt: string }> {
    try {
      // Create cache key from text and context
      const cacheKey = this.createCacheKey(text, context, style, qualityLevel);
      
      if (this.promptCache.has(cacheKey)) {
        return this.promptCache.get(cacheKey)!;
      }

      // Detect adult content
      const isAdultContent = this.detectAdultContent(text, context);
      
      // Build context description with character details
      const contextDescription = this.buildEnhancedContextDescription(context, enableCharacterConsistency);
      
      // Build style prompt
      const stylePrompt = this.buildStylePrompt(style, customStyle);
      
      // Build quality tags
      const qualityTags = this.buildQualityTags(qualityLevel);
      
      // Create enhanced prompt for Gemini
      const adultContentNote = isAdultContent ? 
        '\n- NỘI DUNG 18+: Phát hiện nội dung người lớn, tạo ảnh phù hợp với context (có thể bao gồm nudity, tình dục nếu cần thiết)' :
        '\n- NỘI DUNG GIA ĐÌNH: Tạo ảnh phù hợp cho mọi lứa tuổi, tránh nudity và nội dung người lớn';
      
      const extractionPrompt = `Bạn là AI chuyên gia tạo prompt cho Stable Diffusion. 
Từ đoạn văn bản game và context dưới đây, hãy tạo một prompt chi tiết (tối đa 300 từ) để tạo ảnh minh họa.

QUAN TRỌNG:
- Prompt phải bằng tiếng Anh
- Tập trung vào visual elements: địa điểm, nhân vật, khí quyển, ánh sáng
- Sử dụng quality tags: ${qualityTags}
- Style: ${stylePrompt}
- Đảm bảo tính nhất quán của nhân vật nếu có thông tin chi tiết
- KHÔNG bao gồm text, chữ viết, watermark, signature
- Sử dụng từ khóa chất lượng cao: masterpiece, best quality, ultra-detailed, high resolution, sharp focus, professional photography, cinematic lighting, perfect composition, detailed textures, realistic, photorealistic, DSLR, 85mm lens, shallow depth of field, bokeh, perfect anatomy, perfect proportions, perfect lighting, perfect shadows, perfect reflections, perfect materials, perfect textures, perfect details, perfect colors, perfect contrast, perfect saturation, perfect brightness, perfect exposure, perfect white balance, perfect focus, perfect sharpness, perfect clarity, perfect definition, perfect resolution, perfect quality, close-to-photoreal, lifelike skin texture, natural pores, subtle imperfections, DSLR look, cinematic lighting, calm atmosphere, highly detailed, extremely detailed, intricate details, fine details, crisp details, sharp details, clear details, well-defined details, precise details, accurate details, realistic details, photorealistic details, professional details, high-quality details, ultra-high-quality details, masterpiece details, best-quality details, ultra-detailed details, tack-sharp details, professional-photography details, cinematic-lighting details, perfect-composition details, detailed-textures details, realistic-textures details, photorealistic-textures details, DSLR details, 85mm-lens details, shallow-depth-of-field details, bokeh details, perfect-anatomy details, perfect-proportions details, perfect-lighting details, perfect-shadows details, perfect-reflections details, perfect-materials details, perfect-textures details, perfect-details details, perfect-colors details, perfect-contrast details, perfect-saturation details, perfect-brightness details, perfect-exposure details, perfect-white-balance details, perfect-focus details, perfect-sharpness details, perfect-clarity details, perfect-definition details, perfect-resolution details, perfect-quality details, close-to-photoreal details, lifelike-skin-texture details, natural-pores details, subtle-imperfections details, DSLR-look details, cinematic-lighting details, calm-atmosphere details
- Mô tả anatomy chính xác: tay, chân, khuôn mặt, tỷ lệ cơ thể
- Tránh các lỗi anatomy phổ biến: tay nhiều ngón, chân bị biến dạng, khuôn mặt không cân đối${adultContentNote}

CONTEXT:
${contextDescription}

VĂN BẢN GAME:
${text}

Hãy trả về JSON với format:
{
  "prompt": "prompt tiếng Anh chi tiết cho Stable Diffusion với các từ khóa chất lượng cao",
  "negativePrompt": "negative prompt tiếng Anh đầy đủ với focus vào anatomy errors và quality issues"
}

Chỉ trả về JSON, không có text khác.`;

      const response = await geminiService.generateContent(extractionPrompt);
      
      // Parse JSON response
      const result = this.parseJsonResponse(response);
      
      // Enhance with additional quality tags
      result.prompt = this.enhancePromptWithQualityTags(result.prompt, qualityLevel);
      result.negativePrompt = this.enhanceNegativePrompt(result.negativePrompt, qualityLevel, isAdultContent);
      
      // Cache the result
      this.promptCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error extracting visual prompt:', error);
      // Fallback to basic prompt
      return this.buildFallbackPrompt(text, context, style, customStyle, qualityLevel);
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
    prompt += 'detailed environment, high quality, digital art, concept art, dramatic lighting';
    
    return prompt;
  }

  // Build negative prompt (enhanced quality filters)
  private buildNegativePrompt(qualityLevel: 'standard' | 'high' | 'ultra' = 'high'): string {
    const baseNegative = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, text, watermark, signature, modern technology, cars, buildings, realistic photo, photograph';
    
    // Enhanced anatomy negative keywords
    const anatomyNegatives = 'bad anatomy, malformed, deformed, disfigured, mutated, extra limbs, missing limbs, extra fingers, missing fingers, extra arms, missing arms, extra legs, missing legs, malformed hands, malformed feet, malformed face, asymmetrical face, cross-eyed, wall-eyed, lazy eye, bad eyes, bad teeth, bad mouth, bad nose, bad ears, bad proportions, wrong proportions, disproportionate, twisted body, contorted body, broken body, unnatural pose, awkward pose, impossible pose, floating limbs, disconnected limbs, merged limbs, fused limbs, extra heads, missing head, multiple heads, headless, bad posture, slouching, hunched, twisted spine, broken spine, extra spine, missing spine, bad joints, dislocated joints, broken joints, extra joints, missing joints, malformed joints, twisted joints, bad bones, broken bones, extra bones, missing bones, malformed bones, twisted bones, bad muscles, malformed muscles, missing muscles, extra muscles, twisted muscles, bad skin, malformed skin, missing skin, extra skin, twisted skin, bad hair, malformed hair, missing hair, extra hair, twisted hair, bad clothing, malformed clothing, missing clothing, extra clothing, twisted clothing, bad accessories, malformed accessories, missing accessories, extra accessories, twisted accessories';
    
    const qualityNegatives = {
      standard: 'blurry, low resolution, pixelated, amateur, bad lighting, oversaturated, undersaturated, noise, artifacts, compression artifacts, jpeg artifacts, bad composition, distorted, deformed, ugly, bad anatomy, text, watermark, signature, modern technology, cars, buildings, realistic photo, photograph',
      high: 'blurry, low resolution, pixelated, amateur, bad lighting, oversaturated, undersaturated, noise, artifacts, compression artifacts, jpeg artifacts, bad composition, harsh lighting, overexposed, underexposed, bad shadows, bad reflections, bad materials, bad textures, bad details, bad colors, bad contrast, bad saturation, bad brightness, bad exposure, bad white balance, bad focus, bad sharpness, bad clarity, bad definition, bad resolution, bad quality, distorted, deformed, ugly, bad anatomy, text, watermark, signature, modern technology, cars, buildings, realistic photo, photograph, waxy skin, plastic texture, over-smoothed face, doll-like, CGI, cartoon, anime, western facial structure, mixed race features, glowing eyes',
      ultra: 'blurry, low resolution, pixelated, amateur, bad lighting, oversaturated, undersaturated, noise, artifacts, compression artifacts, jpeg artifacts, bad composition, harsh lighting, overexposed, underexposed, bad shadows, bad reflections, bad materials, bad textures, bad details, bad colors, bad contrast, bad saturation, bad brightness, bad exposure, bad white balance, bad focus, bad sharpness, bad clarity, bad definition, bad resolution, bad quality, waxy skin, plastic texture, over-smoothed face, doll-like, CGI, cartoon, anime, western facial structure, mixed race features, glowing eyes, vulgar exposure, pornographic pose, distorted hands, cluttered background, distorted, deformed, ugly, bad anatomy, text, watermark, signature, modern technology, cars, buildings, realistic photo, photograph, bad proportions, wrong proportions, disproportionate, twisted body, contorted body, broken body, unnatural pose, awkward pose, impossible pose, floating limbs, disconnected limbs, merged limbs, fused limbs, extra heads, missing head, multiple heads, headless, bad posture, slouching, hunched, twisted spine, broken spine, extra spine, missing spine, bad joints, dislocated joints, broken joints, extra joints, missing joints, malformed joints, twisted joints, bad bones, broken bones, extra bones, missing bones, malformed bones, twisted bones, bad muscles, malformed muscles, missing muscles, extra muscles, twisted muscles, bad skin, malformed skin, missing skin, extra skin, twisted skin, bad hair, malformed hair, missing hair, extra hair, twisted hair, bad clothing, malformed clothing, missing clothing, extra clothing, twisted clothing, bad accessories, malformed accessories, missing accessories, extra accessories, twisted accessories'
    };
    
    return `${baseNegative}, ${anatomyNegatives}, ${qualityNegatives[qualityLevel]}`;
  }

  // Build 18+ negative prompt for adult content
  private buildAdultNegativePrompt(): string {
    return 'clothed, dressed, covered, modest, conservative, innocent, pure, chaste, family-friendly, safe for work, sfw, censored, blurred, pixelated, hidden, concealed, covered up, fully dressed, completely clothed, wearing clothes, wearing clothing, dressed up, modest clothing, conservative clothing, innocent clothing, pure clothing, chaste clothing, family-friendly clothing, safe clothing, censored clothing, blurred clothing, pixelated clothing, hidden clothing, concealed clothing, covered up clothing, fully dressed clothing, completely clothed clothing, wearing full clothes, wearing full clothing, dressed up clothing, modest outfit, conservative outfit, innocent outfit, pure outfit, chaste outfit, family-friendly outfit, safe outfit, censored outfit, blurred outfit, pixelated outfit, hidden outfit, concealed outfit, covered up outfit, fully dressed outfit, completely clothed outfit, wearing full outfit, wearing full clothing outfit, dressed up outfit';
  }

  // Detect if content contains 18+ themes
  private detectAdultContent(text: string, context: any): boolean {
    const adultKeywords = [
      // Nudity and sexual content
      'nude', 'naked', 'nudity', 'bare', 'exposed', 'undressed', 'unclothed',
      'sex', 'sexual', 'intimate', 'erotic', 'sensual', 'seductive', 'provocative',
      'breast', 'chest', 'nipple', 'genital', 'penis', 'vagina', 'ass', 'butt',
      'orgasm', 'climax', 'arousal', 'lust', 'desire', 'passion', 'romance',
      'kiss', 'touch', 'caress', 'embrace', 'hug', 'cuddle', 'snuggle',
      'bedroom', 'bed', 'sleep', 'sleeping', 'night', 'nighttime',
      'bath', 'shower', 'bathroom', 'toilet', 'private', 'intimate',
      'underwear', 'lingerie', 'bra', 'panties', 'thong', 'bikini',
      'strip', 'stripping', 'undress', 'undressing', 'remove', 'removing',
      'expose', 'exposing', 'reveal', 'revealing', 'show', 'showing',
      'adult', 'mature', 'explicit', 'graphic', 'nsfw', '18+', 'adult content',
      'fetish', 'kink', 'bdsm', 'domination', 'submission', 'bondage',
      'prostitution', 'escort', 'hooker', 'whore', 'slut', 'bitch',
      'rape', 'forced', 'violence', 'abuse', 'torture', 'pain',
      'drug', 'alcohol', 'drunk', 'intoxicated', 'high', 'stoned',
      'suicide', 'death', 'murder', 'kill', 'blood', 'gore', 'violence'
    ];

    const textLower = text.toLowerCase();
    const contextText = JSON.stringify(context).toLowerCase();
    const combinedText = `${textLower} ${contextText}`;

    // Check for adult keywords
    const hasAdultKeywords = adultKeywords.some(keyword => 
      combinedText.includes(keyword.toLowerCase())
    );

    // Check for explicit content patterns
    const explicitPatterns = [
      /\b(sex|sexual|intimate|erotic|sensual|seductive|provocative)\b/i,
      /\b(nude|naked|nudity|bare|exposed|undressed|unclothed)\b/i,
      /\b(breast|chest|nipple|genital|penis|vagina|ass|butt)\b/i,
      /\b(orgasm|climax|arousal|lust|desire|passion|romance)\b/i,
      /\b(bedroom|bed|sleep|sleeping|night|nighttime)\b/i,
      /\b(bath|shower|bathroom|toilet|private|intimate)\b/i,
      /\b(underwear|lingerie|bra|panties|thong|bikini)\b/i,
      /\b(strip|stripping|undress|undressing|remove|removing)\b/i,
      /\b(expose|exposing|reveal|revealing|show|showing)\b/i,
      /\b(adult|mature|explicit|graphic|nsfw|18\+|adult content)\b/i,
      /\b(fetish|kink|bdsm|domination|submission|bondage)\b/i,
      /\b(prostitution|escort|hooker|whore|slut|bitch)\b/i,
      /\b(rape|forced|violence|abuse|torture|pain)\b/i,
      /\b(drug|alcohol|drunk|intoxicated|high|stoned)\b/i,
      /\b(suicide|death|murder|kill|blood|gore|violence)\b/i
    ];

    const hasExplicitPatterns = explicitPatterns.some(pattern => 
      pattern.test(combinedText)
    );

    return hasAdultKeywords || hasExplicitPatterns;
  }

  // Build style prompt based on selected style
  private buildStylePrompt(style?: string, customStyle?: string): string {
    if (customStyle && customStyle.trim()) {
      return customStyle.trim();
    }
    
    const styleMap: Record<string, string> = {
      'realistic': 'photorealistic, realistic, detailed, high resolution',
      'anime': 'anime style, manga style, cel shading, vibrant colors',
      'manga': 'manga style, black and white, detailed lineart',
      'cartoon': 'cartoon style, colorful, simplified, stylized',
      'oil_painting': 'oil painting style, classical art, brush strokes, artistic',
      'watercolor': 'watercolor painting, soft colors, artistic, painted',
      'digital_art': 'digital art, concept art, detailed, professional',
      'concept_art': 'concept art, digital painting, detailed, professional',
      'fantasy_art': 'fantasy art, magical, mystical, detailed',
      'sci_fi': 'sci-fi art, futuristic, cyberpunk, neon colors',
      'medieval': 'medieval art, historical, fantasy, detailed',
      'steampunk': 'steampunk art, Victorian, mechanical, brass and copper',
      'cyberpunk': 'cyberpunk art, neon, futuristic, dark, high tech'
    };
    
    return styleMap[style || 'digital_art'] || 'digital art, detailed, professional';
  }

  // Build quality tags based on quality level
  private buildQualityTags(qualityLevel: 'standard' | 'high' | 'ultra'): string {
    const qualityMap = {
      standard: 'detailed, high quality, digital art, sharp, clear, good composition, professional',
      high: 'masterpiece, best quality, ultra-detailed, high resolution, sharp focus, professional photography, cinematic lighting, perfect composition, detailed textures, realistic, photorealistic, DSLR, 85mm lens, shallow depth of field, bokeh, perfect anatomy, perfect proportions, perfect lighting, perfect shadows, perfect reflections, perfect materials, perfect textures, perfect details, perfect colors, perfect contrast, perfect saturation, perfect brightness, perfect exposure, perfect white balance, perfect focus, perfect sharpness, perfect clarity, perfect definition, perfect resolution, perfect quality, close-to-photoreal, lifelike skin texture, natural pores, subtle imperfections, DSLR look, cinematic lighting, calm atmosphere',
      ultra: 'masterpiece, best quality, ultra-detailed, ultra high resolution, tack sharp, professional photography, cinematic lighting, perfect composition, detailed textures, realistic, photorealistic, DSLR, 85mm lens, shallow depth of field, bokeh, perfect anatomy, perfect proportions, perfect lighting, perfect shadows, perfect reflections, perfect materials, perfect textures, perfect details, perfect colors, perfect contrast, perfect saturation, perfect brightness, perfect exposure, perfect white balance, perfect focus, perfect sharpness, perfect clarity, perfect definition, perfect resolution, perfect quality, close-to-photoreal, lifelike skin texture, natural pores, subtle imperfections, DSLR look, cinematic lighting, calm atmosphere, 8k, 16k, highly detailed, extremely detailed, intricate details, fine details, crisp details, sharp details, clear details, well-defined details, precise details, accurate details, realistic details, photorealistic details, professional details, high-quality details, ultra-high-quality details, masterpiece details, best-quality details, ultra-detailed details, tack-sharp details, professional-photography details, cinematic-lighting details, perfect-composition details, detailed-textures details, realistic-textures details, photorealistic-textures details, DSLR details, 85mm-lens details, shallow-depth-of-field details, bokeh details, perfect-anatomy details, perfect-proportions details, perfect-lighting details, perfect-shadows details, perfect-reflections details, perfect-materials details, perfect-textures details, perfect-details details, perfect-colors details, perfect-contrast details, perfect-saturation details, perfect-brightness details, perfect-exposure details, perfect-white-balance details, perfect-focus details, perfect-sharpness details, perfect-clarity details, perfect-definition details, perfect-resolution details, perfect-quality details, close-to-photoreal details, lifelike-skin-texture details, natural-pores details, subtle-imperfections details, DSLR-look details, cinematic-lighting details, calm-atmosphere details'
    };
    
    return qualityMap[qualityLevel];
  }

  // Enhance prompt with additional quality tags
  private enhancePromptWithQualityTags(prompt: string, qualityLevel: 'standard' | 'high' | 'ultra'): string {
    const qualityTags = this.buildQualityTags(qualityLevel);
    
    // Add quality tags if not already present
    if (!prompt.toLowerCase().includes('detailed')) {
      prompt = `${qualityTags}, ${prompt}`;
    }
    
    // Add specific enhancements based on quality level
    if (qualityLevel === 'ultra') {
      if (!prompt.toLowerCase().includes('masterpiece')) {
        prompt = `masterpiece, ${prompt}`;
      }
      if (!prompt.toLowerCase().includes('8k')) {
        prompt = `${prompt}, 8k, 16k`;
      }
    }
    
    return prompt;
  }

  // Enhance negative prompt with additional quality filters
  private enhanceNegativePrompt(negativePrompt: string, qualityLevel: 'standard' | 'high' | 'ultra', isAdultContent: boolean = false): string {
    const baseNegative = this.buildNegativePrompt(qualityLevel);
    
    // Add adult content negative prompt if needed
    const adultNegative = isAdultContent ? this.buildAdultNegativePrompt() : '';
    
    // Combine with existing negative prompt
    const combined = `${baseNegative}, ${adultNegative}, ${negativePrompt}`;
    
    // Remove duplicates and sort for better organization
    const uniqueTerms = [...new Set(combined.split(', '))];
    
    // Sort terms by category for better organization
    const sortedTerms = this.sortNegativeTerms(uniqueTerms);
    
    return sortedTerms.join(', ');
  }

  // Sort negative terms by category for better organization
  private sortNegativeTerms(terms: string[]): string[] {
    const categories = {
      anatomy: ['bad anatomy', 'malformed', 'deformed', 'disfigured', 'mutated', 'extra limbs', 'missing limbs', 'extra fingers', 'missing fingers', 'extra arms', 'missing arms', 'extra legs', 'missing legs', 'malformed hands', 'malformed feet', 'malformed face', 'asymmetrical face', 'cross-eyed', 'wall-eyed', 'lazy eye', 'bad eyes', 'bad teeth', 'bad mouth', 'bad nose', 'bad ears', 'bad proportions', 'wrong proportions', 'disproportionate', 'twisted body', 'contorted body', 'broken body', 'unnatural pose', 'awkward pose', 'impossible pose', 'floating limbs', 'disconnected limbs', 'merged limbs', 'fused limbs', 'extra heads', 'missing head', 'multiple heads', 'headless', 'bad posture', 'slouching', 'hunched', 'twisted spine', 'broken spine', 'extra spine', 'missing spine', 'bad joints', 'dislocated joints', 'broken joints', 'extra joints', 'missing joints', 'malformed joints', 'twisted joints', 'bad bones', 'broken bones', 'extra bones', 'missing bones', 'malformed bones', 'twisted bones', 'bad muscles', 'malformed muscles', 'missing muscles', 'extra muscles', 'twisted muscles', 'bad skin', 'malformed skin', 'missing skin', 'extra skin', 'twisted skin', 'bad hair', 'malformed hair', 'missing hair', 'extra hair', 'twisted hair', 'bad clothing', 'malformed clothing', 'missing clothing', 'extra clothing', 'twisted clothing', 'bad accessories', 'malformed accessories', 'missing accessories', 'extra accessories', 'twisted accessories'],
      quality: ['blurry', 'low quality', 'distorted', 'ugly', 'low resolution', 'pixelated', 'amateur', 'bad lighting', 'oversaturated', 'undersaturated', 'noise', 'artifacts', 'compression artifacts', 'jpeg artifacts', 'bad composition'],
      unwanted: ['text', 'watermark', 'signature', 'modern technology', 'cars', 'buildings', 'realistic photo', 'photograph']
    };

    const sorted: string[] = [];
    
    // Add anatomy terms first (most important)
    for (const term of terms) {
      if (categories.anatomy.includes(term)) {
        sorted.push(term);
      }
    }
    
    // Add quality terms
    for (const term of terms) {
      if (categories.quality.includes(term)) {
        sorted.push(term);
      }
    }
    
    // Add unwanted content terms
    for (const term of terms) {
      if (categories.unwanted.includes(term)) {
        sorted.push(term);
      }
    }
    
    // Add any remaining terms
    for (const term of terms) {
      if (!sorted.includes(term)) {
        sorted.push(term);
      }
    }
    
    return sorted;
  }

  // Build enhanced context description with character details
  private buildEnhancedContextDescription(context: any, enableCharacterConsistency: boolean): string {
    let description = '';
    
    if (context.location) {
      description += `Địa điểm: ${context.location.name || 'Unknown'} (${context.location.type || 'location'})\n`;
      if (context.location.description) {
        description += `Mô tả: ${context.location.description}\n`;
      }
      if (context.location.atmosphere) {
        description += `Khí quyển: ${context.location.atmosphere}\n`;
      }
      if (context.location.features?.length > 0) {
        description += `Đặc điểm: ${context.location.features.join(', ')}\n`;
      }
    }
    
    if (context.npcs?.length > 0) {
      description += `NPCs:\n`;
      context.npcs.forEach((npc: any) => {
        description += `- ${npc.name} (${npc.role})`;
        if (enableCharacterConsistency && npc.appearanceDetails) {
          description += ` - Ngoại hình: ${this.buildCharacterDescription(npc.appearanceDetails)}`;
        } else if (npc.appearance) {
          description += ` - Mô tả: ${npc.appearance}`;
        }
        description += `\n`;
      });
    }
    
    if (context.items?.length > 0) {
      description += `Vật phẩm: ${context.items.map((item: any) => item.name).join(', ')}\n`;
    }
    
    if (context.atmosphere) {
      description += `Khí quyển tổng thể: ${context.atmosphere}\n`;
    }
    
    return description;
  }

  // Build character description from appearance details
  private buildCharacterDescription(appearance: CharacterAppearance): string {
    let description = '';
    
    // Basic info
    description += `${appearance.gender}, ${appearance.age}`;
    
    // Hair
    if (appearance.hair) {
      description += `, ${appearance.hair.color} ${appearance.hair.length} ${appearance.hair.style} hair`;
    }
    
    // Eyes
    if (appearance.eyes) {
      description += `, ${appearance.eyes.color} ${appearance.eyes.shape} eyes`;
    }
    
    // Skin
    if (appearance.skin) {
      description += `, ${appearance.skin.tone} skin`;
    }
    
    // Body
    if (appearance.body) {
      description += `, ${appearance.body.build} build, ${appearance.body.height}`;
    }
    
    // Clothing
    if (appearance.clothing) {
      description += `, wearing ${appearance.clothing.style}`;
      if (appearance.clothing.colors?.length > 0) {
        description += ` in ${appearance.clothing.colors.join(' and ')}`;
      }
    }
    
    // Distinctive features
    if (appearance.distinctive_features?.length > 0) {
      description += `, ${appearance.distinctive_features.join(', ')}`;
    }
    
    return description;
  }


  // Create cache key
  private createCacheKey(text: string, context: any, style?: string, qualityLevel?: string): string {
    const contextStr = JSON.stringify(context);
    const styleStr = style || 'default';
    const qualityStr = qualityLevel || 'high';
    return `${text.substring(0, 100)}_${contextStr.substring(0, 100)}_${styleStr}_${qualityStr}`;
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
  private buildFallbackPrompt(
    _text: string, 
    context: any, 
    style?: string, 
    customStyle?: string, 
    qualityLevel: 'standard' | 'high' | 'ultra' = 'high'
  ): { prompt: string; negativePrompt: string } {
    const location = context.location;
    const npcs = context.npcs || [];
    const items = context.items || [];
    const atmosphere = location?.atmosphere || '';
    
    let prompt = this.buildPositivePrompt(location, npcs, items, atmosphere);
    
    // Add style
    const stylePrompt = this.buildStylePrompt(style, customStyle);
    prompt = `${stylePrompt}, ${prompt}`;
    
    // Add quality tags
    const qualityTags = this.buildQualityTags(qualityLevel);
    prompt = `${qualityTags}, ${prompt}`;
    
    const negativePrompt = this.buildNegativePrompt(qualityLevel);
    
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
