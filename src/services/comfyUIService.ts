import { ComfyUISettings, ComfyUIResolution } from '../types';

class ComfyUIService {
  private static instance: ComfyUIService;
  private baseUrl: string = 'http://localhost:5001';
  private imageCache: Map<string, string> = new Map();
  private settings: ComfyUISettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): ComfyUIService {
    if (!ComfyUIService.instance) {
      ComfyUIService.instance = new ComfyUIService();
    }
    return ComfyUIService.instance;
  }

  // Load settings from localStorage
  loadSettings(): ComfyUISettings {
    try {
      const saved = localStorage.getItem('comfyui_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          enabled: parsed.enabled || false,
          resolution: parsed.resolution || '1280x720',
          serverUrl: parsed.serverUrl || 'http://localhost:5001'
        };
      }
    } catch (error) {
      console.warn('Failed to load ComfyUI settings:', error);
    }

    // Default settings
    return {
      enabled: false,
      resolution: '1280x720',
      serverUrl: 'http://localhost:5000'
    };
  }

  // Save settings to localStorage
  saveSettings(settings: ComfyUISettings): void {
    try {
      this.settings = settings;
      this.baseUrl = settings.serverUrl;
      localStorage.setItem('comfyui_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save ComfyUI settings:', error);
    }
  }

  // Check ComfyUI server health
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      } as RequestInit);
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.warn('ComfyUI server health check failed:', error);
      return false;
    }
  }

  // Generate image from prompt
  async generateImage(prompt: string, negativePrompt: string, resolution: ComfyUIResolution): Promise<string> {
    const cacheKey = `${prompt}_${negativePrompt}_${resolution}`;
    
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    try {
      const { width, height } = this.parseResolution(resolution);
      
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          width,
          height,
          steps: 20,
          cfg_scale: 7,
          seed: -1
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const imageUrl = `data:image/png;base64,${data.image}`;
      this.imageCache.set(cacheKey, imageUrl);
      
      return imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Không thể tạo ảnh từ ComfyUI');
    }
  }

  // Extract prompt from opening message
  async extractPromptFromOpening(openingMessage: string): Promise<{ prompt: string; negativePrompt: string }> {
    // For opening message, create a general fantasy world prompt
    const prompt = `fantasy world opening scene, ${openingMessage.substring(0, 200)}..., detailed environment, high quality, digital art, concept art, wide shot, dramatic lighting, fantasy art style`;
    const negativePrompt = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, text, watermark, signature';
    
    return { prompt, negativePrompt };
  }

  // Extract prompt from AI response
  async extractPromptFromResponse(narrative: string, sceneState: any): Promise<{ prompt: string; negativePrompt: string }> {
    // Build prompt from narrative and scene context
    let prompt = 'fantasy scene, ';
    
    // Add location context
    if (sceneState?.location) {
      prompt += `${sceneState.location.type}, ${sceneState.location.atmosphere}, `;
      if (sceneState.location.features?.length > 0) {
        prompt += `${sceneState.location.features.join(', ')}, `;
      }
    }
    
    // Add NPCs context
    if (sceneState?.npcs?.length > 0) {
      const npcNames = sceneState.npcs.map((npc: any) => npc.name).join(', ');
      prompt += `characters: ${npcNames}, `;
    }
    
    // Add narrative context (first 300 chars)
    const narrativeContext = narrative.substring(0, 300).replace(/[^\w\s]/g, ' ').trim();
    prompt += `${narrativeContext}, `;
    
    // Add quality tags
    prompt += 'detailed environment, high quality, digital art, concept art, dramatic lighting, fantasy art style';
    
    const negativePrompt = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, text, watermark, signature, modern technology, cars, buildings';
    
    return { prompt, negativePrompt };
  }

  // Build ComfyUI workflow format (unused - workflow is built in Python server)
  // private buildWorkflow(prompt: string, negativePrompt: string, width: number, height: number): any {
  //   // This method is not used as workflow is built in the Python API server
  //   return {};
  // }

  // Parse resolution to width/height
  private parseResolution(resolution: ComfyUIResolution): { width: number; height: number } {
    const [width, height] = resolution.split('x').map(Number);
    return { width, height };
  }

  // Get current settings
  getSettings(): ComfyUISettings {
    return this.settings;
  }

  // Check if ComfyUI is enabled
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  // Clear image cache
  clearCache(): void {
    this.imageCache.clear();
  }
}

export const comfyUIService = ComfyUIService.getInstance();
