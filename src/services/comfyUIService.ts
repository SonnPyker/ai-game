import { ComfyUISettings, ComfyUIResolution, LoRAConfig } from '../types';

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
          serverUrl: parsed.serverUrl || 'http://localhost:5001',
          checkpoint: parsed.checkpoint || 'novaAnimeXL_ilV120.safetensors',
          loras: parsed.loras || this.getDefaultLoras(),
          style: parsed.style || 'digital_art',
          customStyle: parsed.customStyle || '',
          qualityLevel: parsed.qualityLevel || 'high',
          enableCharacterConsistency: true, // Always enabled
          sampler: parsed.sampler || 'dpmpp_2m_sde',
          steps: parsed.steps || 30,
          cfgScale: parsed.cfgScale || 8.0,
          maxLoras: parsed.maxLoras || 3
        };
      }
    } catch (error) {
      console.warn('Failed to load ComfyUI settings:', error);
    }

    // Default settings
    return {
      enabled: false,
      resolution: '1280x720',
      serverUrl: 'http://localhost:5001',
      checkpoint: 'novaAnimeXL_ilV120.safetensors',
      loras: this.getDefaultLoras(),
      style: 'digital_art',
      customStyle: '',
      qualityLevel: 'high',
      enableCharacterConsistency: true, // Always enabled
      sampler: 'dpmpp_2m_sde',
      steps: 30,
      cfgScale: 8.0,
      maxLoras: 3
    };
  }

  // Save settings to localStorage
  saveSettings(settings: ComfyUISettings): void {
    try {
      // Always ensure character consistency is enabled
      const settingsToSave = {
        ...settings,
        enableCharacterConsistency: true
      };
      
      this.settings = settingsToSave;
      this.baseUrl = settingsToSave.serverUrl;
      localStorage.setItem('comfyui_settings', JSON.stringify(settingsToSave));
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
    const cacheKey = `${prompt}_${negativePrompt}_${resolution}_${this.settings.sampler}_${this.settings.steps}_${this.settings.cfgScale}`;
    
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    try {
      const { width, height } = this.parseResolution(resolution);
      
      // Get available checkpoints and validate current checkpoint
      const availableCheckpoints = await this.getAvailableCheckpoints();
      let checkpointToUse = this.settings.checkpoint;
      
      // If current checkpoint is not available, use the first available one
      if (!availableCheckpoints.includes(checkpointToUse)) {
        if (availableCheckpoints.length > 0) {
          checkpointToUse = availableCheckpoints[0];
          console.warn(`Checkpoint '${this.settings.checkpoint}' not available. Using '${checkpointToUse}' instead.`);
        } else {
          throw new Error('No checkpoints available in ComfyUI');
        }
      }
      
      // Get available LoRAs and validate current LoRA
      const availableLoras = await this.getAvailableLoras();
      // Validate LoRAs
      const validLoras = this.settings.loras.filter(lora => 
        availableLoras.includes(lora.name) || lora.name === 'None'
      );
      
      // Update settings if any changes were made
      if (checkpointToUse !== this.settings.checkpoint || validLoras.length !== this.settings.loras.length) {
        const updatedSettings = { 
          ...this.settings, 
          checkpoint: checkpointToUse,
          loras: validLoras
        };
        this.saveSettings(updatedSettings);
      }
      
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
          steps: this.settings.steps,
          cfg_scale: this.settings.cfgScale,
          sampler: this.settings.sampler,
          checkpoint: checkpointToUse,
          loras: this.getActiveLoras(),
          style: this.settings.style,
          custom_style: this.settings.customStyle,
          quality_level: this.settings.qualityLevel,
          enable_character_consistency: this.settings.enableCharacterConsistency,
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

  // Get available checkpoints from ComfyUI server
  async getAvailableCheckpoints(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/checkpoints`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.checkpoints || [];
    } catch (error) {
      console.error('Failed to get checkpoints:', error);
      // Return default checkpoint if API fails
      return ['novaAnimeXL_ilV120.safetensors'];
    }
  }

  // Get available LoRA models from ComfyUI server
  // Get default LoRA configurations
  private getDefaultLoras(): LoRAConfig[] {
    return [
      {
        name: 'None',
        strength: 1.0,
        enabled: false,
        category: 'custom',
        description: 'No LoRA'
      }
    ];
  }

  async getAvailableLoras(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/loras`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.loras || ['None'];
    } catch (error) {
      console.error('Failed to get LoRAs:', error);
      // Return default LoRA if API fails
      return ['None'];
    }
  }

  // Get recommended LoRAs based on prompt content
  getRecommendedLoras(prompt: string, availableLoras: string[]): LoRAConfig[] {
    const lowerPrompt = prompt.toLowerCase();
    const recommendations: LoRAConfig[] = [];

    // Quality enhancement LoRAs
    if (lowerPrompt.includes('detailed') || lowerPrompt.includes('high quality') || lowerPrompt.includes('ultra detailed')) {
      const detailLora = availableLoras.find(lora => 
        lora.toLowerCase().includes('detail') || 
        lora.toLowerCase().includes('enhance') ||
        lora.toLowerCase().includes('quality')
      );
      if (detailLora) {
        recommendations.push({
          name: detailLora,
          strength: 0.7,
          enabled: true,
          category: 'quality',
          description: 'Enhances detail and quality'
        });
      }
    }

    // Anatomy improvement LoRAs
    if (lowerPrompt.includes('hand') || lowerPrompt.includes('finger') || lowerPrompt.includes('anatomy')) {
      const anatomyLora = availableLoras.find(lora => 
        lora.toLowerCase().includes('hand') || 
        lora.toLowerCase().includes('anatomy') ||
        lora.toLowerCase().includes('fix')
      );
      if (anatomyLora) {
        recommendations.push({
          name: anatomyLora,
          strength: 0.8,
          enabled: true,
          category: 'anatomy',
          description: 'Improves anatomy and fixes hand issues'
        });
      }
    }

    // Lighting LoRAs
    if (lowerPrompt.includes('lighting') || lowerPrompt.includes('cinematic') || lowerPrompt.includes('dramatic')) {
      const lightingLora = availableLoras.find(lora => 
        lora.toLowerCase().includes('lighting') || 
        lora.toLowerCase().includes('cinematic') ||
        lora.toLowerCase().includes('dramatic')
      );
      if (lightingLora) {
        recommendations.push({
          name: lightingLora,
          strength: 0.6,
          enabled: true,
          category: 'lighting',
          description: 'Enhances lighting and atmosphere'
        });
      }
    }

    // Realistic style LoRAs
    if (lowerPrompt.includes('realistic') || lowerPrompt.includes('photorealistic') || lowerPrompt.includes('photography')) {
      const realisticLora = availableLoras.find(lora => 
        lora.toLowerCase().includes('realistic') || 
        lora.toLowerCase().includes('photo') ||
        lora.toLowerCase().includes('real')
      );
      if (realisticLora) {
        recommendations.push({
          name: realisticLora,
          strength: 0.5,
          enabled: true,
          category: 'style',
          description: 'Enhances realistic appearance'
        });
      }
    }

    return recommendations.slice(0, this.settings.maxLoras);
  }

  // Add LoRA to settings
  addLora(loraConfig: LoRAConfig): void {
    const settings = this.getSettings();
    const existingIndex = settings.loras.findIndex(lora => lora.name === loraConfig.name);
    
    if (existingIndex >= 0) {
      // Update existing LoRA
      settings.loras[existingIndex] = loraConfig;
    } else {
      // Add new LoRA
      settings.loras.push(loraConfig);
    }
    
    this.saveSettings(settings);
  }

  // Remove LoRA from settings
  removeLora(loraName: string): void {
    const settings = this.getSettings();
    settings.loras = settings.loras.filter(lora => lora.name !== loraName);
    this.saveSettings(settings);
  }

  // Update LoRA strength
  updateLoraStrength(loraName: string, strength: number): void {
    const settings = this.getSettings();
    const lora = settings.loras.find(l => l.name === loraName);
    if (lora) {
      lora.strength = strength;
      this.saveSettings(settings);
    }
  }

  // Toggle LoRA enabled state
  toggleLoraEnabled(loraName: string): void {
    const settings = this.getSettings();
    const lora = settings.loras.find(l => l.name === loraName);
    if (lora) {
      lora.enabled = !lora.enabled;
      this.saveSettings(settings);
    }
  }

  // Get active LoRAs (enabled and within max limit)
  getActiveLoras(): LoRAConfig[] {
    const settings = this.getSettings();
    return settings.loras
      .filter(lora => lora.enabled && lora.name !== 'None')
      .slice(0, settings.maxLoras);
  }

  // Auto-update settings with available models from server
  async autoUpdateSettings(): Promise<void> {
    try {
      const [checkpoints, loras] = await Promise.all([
        this.getAvailableCheckpoints(),
        this.getAvailableLoras()
      ]);

      let needsUpdate = false;
      const updatedSettings = { ...this.settings };

      // Update checkpoint if current one is not available
      if (checkpoints.length > 0 && !checkpoints.includes(this.settings.checkpoint)) {
        updatedSettings.checkpoint = checkpoints[0];
        needsUpdate = true;
        console.log(`Auto-updated checkpoint to: ${checkpoints[0]}`);
      }

      // Validate LoRAs
      const validLoras = this.settings.loras.filter(lora => 
        loras.includes(lora.name) || lora.name === 'None'
      );
      if (validLoras.length !== this.settings.loras.length) {
        updatedSettings.loras = validLoras;
        needsUpdate = true;
        console.log(`Auto-updated LoRAs, removed unavailable ones`);
      }

      if (needsUpdate) {
        this.saveSettings(updatedSettings);
        console.log('ComfyUI settings auto-updated with available models');
      }
    } catch (error) {
      console.warn('Failed to auto-update ComfyUI settings:', error);
    }
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
