import { CombatAnimationType } from '../types/combat';

// Re-export for convenience
export { CombatAnimationType as AnimationType };

// Simple EventEmitter implementation for browser compatibility
class SimpleEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

// Animation Events
export enum AnimationEvent {
  START = 'animation:start',
  COMPLETE = 'animation:complete',
  DAMAGE_TEXT = 'animation:damage_text',
  COMBATANT_EFFECT = 'animation:combatant_effect',
  QUEUE_PROCESS = 'animation:queue_process'
}

// Animation Configuration
export interface AnimationConfig {
  duration: number;
  delay?: number;
  easing?: string;
  mobile?: {
    duration: number;
    simplified?: boolean;
  };
}

// Animation Data Interfaces
export interface DamageTextData {
  id: string;
  combatantId: string;
  value: number;
  type: CombatAnimationType.DAMAGE | CombatAnimationType.HEAL | CombatAnimationType.MISS | CombatAnimationType.CRITICAL;
  position: { x: number; y: number };
  timestamp: number;
}

export interface CombatantEffectData {
  combatantId: string;
  effectType: CombatAnimationType.SHAKE | CombatAnimationType.FLASH | CombatAnimationType.HIGHLIGHT | CombatAnimationType.PULSE;
  duration: number;
  intensity?: 'low' | 'medium' | 'high';
}

export interface AnimationQueueItem {
  id: string;
  type: AnimationEvent;
  data: DamageTextData | CombatantEffectData;
  priority: number;
  timestamp: number;
}

// Performance Monitoring
interface PerformanceMetrics {
  animationCount: number;
  averageDuration: number;
  slowAnimations: number;
  memoryUsage: number;
}

// Cooldown System
interface CooldownTracker {
  combatantId: string;
  lastDamageText: number;
  lastEffectTime: number;
  activeTexts: Set<string>;
}

interface CooldownConfig {
  damageTextCooldown: number; // ms between damage texts for same combatant
  effectCooldown: number; // ms between effects for same combatant
  maxConcurrentTexts: number; // max floating texts per combatant
  textLifetime: number; // how long text stays visible
}

class CombatAnimationService extends SimpleEventEmitter {
  private static instance: CombatAnimationService;
  private animationQueue: AnimationQueueItem[] = [];
  private isProcessing = false;
  private activeAnimations = new Set<string>();
  private maxConcurrentAnimations = 5;
  
  // Cooldown System
  private cooldownTrackers = new Map<string, CooldownTracker>();
  private cooldownConfig: CooldownConfig = {
    damageTextCooldown: 800, // 800ms between damage texts
    effectCooldown: 500, // 500ms between effects
    maxConcurrentTexts: 2, // max 2 floating texts per combatant
    textLifetime: 1500 // text disappears after 1.5s
  };
  private maxFloatingTexts = 3;
  private performanceMetrics: PerformanceMetrics = {
    animationCount: 0,
    averageDuration: 0,
    slowAnimations: 0,
    memoryUsage: 0
  };
  
  // Device detection
  private isMobile = false;
  private prefersReducedMotion = false;
  private isLowEndDevice = false;

  // Animation configurations
  private animationConfigs: Record<CombatAnimationType, AnimationConfig> = {
    [CombatAnimationType.DAMAGE]: {
      duration: 400,
      mobile: { duration: 250, simplified: false }
    },
    [CombatAnimationType.HEAL]: {
      duration: 350,
      mobile: { duration: 200, simplified: false }
    },
    [CombatAnimationType.MISS]: {
      duration: 300,
      mobile: { duration: 200, simplified: true }
    },
    [CombatAnimationType.CRITICAL]: {
      duration: 600,
      mobile: { duration: 400, simplified: false }
    },
    [CombatAnimationType.SHAKE]: {
      duration: 500,
      mobile: { duration: 300, simplified: true }
    },
    [CombatAnimationType.FLASH]: {
      duration: 200,
      mobile: { duration: 150, simplified: true }
    },
    [CombatAnimationType.HIGHLIGHT]: {
      duration: 300,
      mobile: { duration: 200, simplified: false }
    },
    [CombatAnimationType.PULSE]: {
      duration: 400,
      mobile: { duration: 250, simplified: true }
    },
    [CombatAnimationType.FADE_IN]: {
      duration: 300,
      mobile: { duration: 200, simplified: false }
    },
    [CombatAnimationType.FADE_OUT]: {
      duration: 200,
      mobile: { duration: 150, simplified: false }
    }
  };

  private constructor() {
    super();
    this.initializeDeviceDetection();
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): CombatAnimationService {
    if (!CombatAnimationService.instance) {
      CombatAnimationService.instance = new CombatAnimationService();
    }
    return CombatAnimationService.instance;
  }

  private initializeDeviceDetection(): void {
    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Detect reduced motion preference
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Detect low-end device (simple heuristic)
    this.isLowEndDevice = this.isMobile && (
      navigator.hardwareConcurrency <= 2 || 
      (navigator as any).deviceMemory <= 2 ||
      window.innerWidth < 400
    );

    // Listen for reduced motion changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
    });
  }

  private setupPerformanceMonitoring(): void {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.performanceMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      }, 5000);
    }
  }

  // Queue animation with priority
  public queueAnimation(
    type: AnimationEvent,
    data: DamageTextData | CombatantEffectData,
    priority: number = 0
  ): string {
    const id = `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem: AnimationQueueItem = {
      id,
      type,
      data,
      priority,
      timestamp: Date.now()
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.animationQueue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.animationQueue.push(queueItem);
    } else {
      this.animationQueue.splice(insertIndex, 0, queueItem);
    }

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  // Process animation queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.animationQueue.length === 0) return;
    
    this.isProcessing = true;
    this.emit(AnimationEvent.QUEUE_PROCESS, { queueLength: this.animationQueue.length });

    while (this.animationQueue.length > 0 && this.activeAnimations.size < this.maxConcurrentAnimations) {
      const item = this.animationQueue.shift();
      if (!item) break;

      await this.executeAnimation(item);
    }

    this.isProcessing = false;

    // Continue processing if there are more items
    if (this.animationQueue.length > 0) {
      setTimeout(() => this.processQueue(), 16); // Next frame
    }
  }

  // Execute individual animation
  private async executeAnimation(item: AnimationQueueItem): Promise<void> {
    const startTime = performance.now();
    this.activeAnimations.add(item.id);

    try {
      this.emit(AnimationEvent.START, item);

      switch (item.type) {
        case AnimationEvent.DAMAGE_TEXT:
          await this.executeDamageTextAnimation(item.data as DamageTextData);
          break;
        case AnimationEvent.COMBATANT_EFFECT:
          await this.executeCombatantEffectAnimation(item.data as CombatantEffectData);
          break;
      }

      const duration = performance.now() - startTime;
      this.updatePerformanceMetrics(duration);

      this.emit(AnimationEvent.COMPLETE, { ...item, duration });
    } catch (error) {
      console.error('Animation execution error:', error);
    } finally {
      this.activeAnimations.delete(item.id);
    }
  }

  // Execute damage text animation
  private async executeDamageTextAnimation(data: DamageTextData): Promise<void> {
    // Limit concurrent floating texts
    if (this.activeAnimations.size >= this.maxFloatingTexts) {
      return;
    }

    this.emit(AnimationEvent.DAMAGE_TEXT, data);
    
    const config = this.getAnimationConfig(this.getDamageTextType(data.type));
    const duration = this.getEffectiveDuration(config);
    
    await this.delay(duration);
  }

  // Execute combatant effect animation
  private async executeCombatantEffectAnimation(data: CombatantEffectData): Promise<void> {
    this.emit(AnimationEvent.COMBATANT_EFFECT, data);
    
    const config = this.getAnimationConfig(data.effectType);
    const duration = this.getEffectiveDuration(config);
    
    await this.delay(duration);
  }

  // Get animation configuration
  private getAnimationConfig(type: CombatAnimationType): AnimationConfig {
    return this.animationConfigs[type];
  }

  // Get effective duration based on device capabilities
  private getEffectiveDuration(config: AnimationConfig): number {
    if (this.prefersReducedMotion) {
      return 0; // Skip animations if user prefers reduced motion
    }

    if (this.isLowEndDevice && config.mobile?.simplified) {
      return config.mobile.duration * 0.5; // Even shorter for low-end devices
    }

    if (this.isMobile && config.mobile) {
      return config.mobile.duration;
    }

    return config.duration;
  }

  // Get damage text type from animation type
  private getDamageTextType(type: CombatAnimationType): CombatAnimationType {
    switch (type) {
      case CombatAnimationType.DAMAGE:
      case CombatAnimationType.HEAL:
      case CombatAnimationType.MISS:
      case CombatAnimationType.CRITICAL:
        return type;
      default:
        return CombatAnimationType.DAMAGE;
    }
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Update performance metrics
  private updatePerformanceMetrics(duration: number): void {
    this.performanceMetrics.animationCount++;
    
    // Update average duration
    const totalDuration = this.performanceMetrics.averageDuration * (this.performanceMetrics.animationCount - 1) + duration;
    this.performanceMetrics.averageDuration = totalDuration / this.performanceMetrics.animationCount;
    
    // Track slow animations (>16ms)
    if (duration > 16) {
      this.performanceMetrics.slowAnimations++;
    }
  }

  // Public API methods
  public triggerDamageText(combatantId: string, value: number, type: CombatAnimationType.DAMAGE | CombatAnimationType.HEAL | CombatAnimationType.MISS | CombatAnimationType.CRITICAL, position: { x: number; y: number }): string | null {
    // Check cooldown for damage text
    if (!this.canTriggerDamageText(combatantId)) {
      return null;
    }

    const data: DamageTextData = {
      id: `damage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      combatantId,
      value,
      type,
      position,
      timestamp: Date.now()
    };

    // Update cooldown tracker
    this.updateDamageTextCooldown(combatantId, data.id);
    
    return this.queueAnimation(AnimationEvent.DAMAGE_TEXT, data, 1);
  }

  public triggerCombatantEffect(combatantId: string, effectType: CombatAnimationType.SHAKE | CombatAnimationType.FLASH | CombatAnimationType.HIGHLIGHT | CombatAnimationType.PULSE, intensity: 'low' | 'medium' | 'high' = 'medium'): string {
    const data: CombatantEffectData = {
      combatantId,
      effectType,
      duration: this.getEffectiveDuration(this.getAnimationConfig(effectType)),
      intensity
    };

    return this.queueAnimation(AnimationEvent.COMBATANT_EFFECT, data, 0);
  }

  public clearQueue(): void {
    this.animationQueue = [];
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  public isDeviceLowEnd(): boolean {
    return this.isLowEndDevice;
  }

  public shouldReduceMotion(): boolean {
    return this.prefersReducedMotion;
  }

  public isMobileDevice(): boolean {
    return this.isMobile;
  }

  // Cooldown System Methods
  private canTriggerDamageText(combatantId: string): boolean {
    const tracker = this.cooldownTrackers.get(combatantId);
    if (!tracker) return true;

    const now = Date.now();
    const timeSinceLastText = now - tracker.lastDamageText;
    
    // Check cooldown
    if (timeSinceLastText < this.cooldownConfig.damageTextCooldown) {
      return false;
    }

    // Check max concurrent texts
    if (tracker.activeTexts.size >= this.cooldownConfig.maxConcurrentTexts) {
      return false;
    }

    return true;
  }

  private updateDamageTextCooldown(combatantId: string, textId: string): void {
    const now = Date.now();
    let tracker = this.cooldownTrackers.get(combatantId);
    
    if (!tracker) {
      tracker = {
        combatantId,
        lastDamageText: now,
        lastEffectTime: 0,
        activeTexts: new Set()
      };
      this.cooldownTrackers.set(combatantId, tracker);
    }

    tracker.lastDamageText = now;
    tracker.activeTexts.add(textId);

    // Auto-cleanup after text lifetime
    setTimeout(() => {
      tracker?.activeTexts.delete(textId);
      if (tracker?.activeTexts.size === 0) {
        // Clean up empty tracker after some time
        setTimeout(() => {
          if (tracker?.activeTexts.size === 0) {
            this.cooldownTrackers.delete(combatantId);
          }
        }, 5000); // 5s cleanup delay
      }
    }, this.cooldownConfig.textLifetime);
  }

  public cleanupCombatantTexts(combatantId: string): void {
    const tracker = this.cooldownTrackers.get(combatantId);
    if (tracker) {
      tracker.activeTexts.clear();
      // Don't delete tracker immediately, let it cleanup naturally
    }
  }

  public getCooldownStatus(combatantId: string): { canTriggerText: boolean; activeTexts: number; timeUntilNext: number } {
    const tracker = this.cooldownTrackers.get(combatantId);
    if (!tracker) {
      return { canTriggerText: true, activeTexts: 0, timeUntilNext: 0 };
    }

    const now = Date.now();
    const timeSinceLastText = now - tracker.lastDamageText;
    const timeUntilNext = Math.max(0, this.cooldownConfig.damageTextCooldown - timeSinceLastText);

    return {
      canTriggerText: this.canTriggerDamageText(combatantId),
      activeTexts: tracker.activeTexts.size,
      timeUntilNext
    };
  }

  public updateCooldownConfig(config: Partial<CooldownConfig>): void {
    this.cooldownConfig = { ...this.cooldownConfig, ...config };
  }

  // Cleanup
  public destroy(): void {
    this.clearQueue();
    this.activeAnimations.clear();
    this.cooldownTrackers.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const combatAnimationService = CombatAnimationService.getInstance();
