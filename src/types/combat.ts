// import { Combatant } from '../services/combatService';
import { InventoryItem } from './index';

export interface CombatAction {
  type: 'attack' | 'defend' | 'use_item' | 'ability' | 'move';
  targetId?: string;
  attackIndex?: number;
  itemId?: string;
  abilityId?: string;
  description: string;
  priority: number; // Higher number = higher priority
}

export interface AIBehavior {
  difficulty: 'easy' | 'medium' | 'hard';
  aggression: number; // 0-1, how likely to attack vs defend
  intelligence: number; // 0-1, how well it calculates optimal actions
  tactics: number; // 0-1, how likely to use advanced tactics
  itemUsage: number; // 0-1, how likely to use items
}

export interface CombatNarrationTemplate {
  hit: string[];
  miss: string[];
  critical: string[];
  defend: string[];
  useItem: string[];
  ability: string[];
  death: string[];
  victory: string[];
  defeat: string[];
}

export interface CombatLogEntry {
  type: 'attack' | 'damage' | 'status' | 'death' | 'victory' | 'defeat' | 'info' | 'heal' | 'initiative';
  message: string;
  timestamp: Date;
  combatantId?: string;
  targetId?: string;
  id?: string;
  details?: string;
}

export interface TurnLog {
  turn: number;
  combatantId: string;
  combatantName: string;
  actions: CombatLogEntry[];
  description: string; // Mô tả tổng quan lượt chơi
  timestamp: Date;
  isPlayerTurn: boolean;
}

export interface CombatStatistics {
  totalCombats: number;
  victories: number;
  defeats: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  criticalHits: number;
  perfectVictories: number;
  favoriteWeapon: string;
  longestCombat: number;
  fastestVictory: number;
  averageCombatLength: number;
  totalTurns: number;
  enemiesDefeated: number;
  itemsUsed: number;
  abilitiesUsed: number;
}

export interface QuestCombatData {
  questId: string;
  questTitle: string;
  objectiveDescription: string;
  enemies: any[]; // Enemy[]
  recommendedLevel: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  rewards: {
    experience: number;
    items: any[];
    currency: number;
  };
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // turns remaining
  effects: {
    healthModifier?: number;
    armorClassModifier?: number;
    attackModifier?: number;
    damageModifier?: number;
    statModifiers?: { [key: string]: number };
    skipTurn?: boolean;
    damagePerTurn?: number;
    damageType?: string;
  };
  icon: string;
  color: string;
}

export interface EnvironmentalEffect {
  type: 'weather' | 'terrain' | 'hazard' | 'time';
  name: string;
  description: string;
  effects: {
    visibilityModifier?: number;
    movementModifier?: number;
    attackModifier?: number;
    damageModifier?: number;
    statusEffects?: StatusEffect[];
  };
  duration?: number; // turns, undefined = permanent
}

export interface CombatReplay {
  id: string;
  combatId: string;
  timestamp: Date;
  duration: number; // seconds
  turns: TurnLog[];
  winner: 'player' | 'enemies';
  statistics: CombatStatistics;
  highlights: {
    criticalHits: number[];
    perfectTurns: number[];
    dramaticMoments: number[];
  };
}

// Animation Types for Combat Visual Effects
export enum CombatAnimationType {
  DAMAGE = 'damage',
  HEAL = 'heal',
  MISS = 'miss',
  CRITICAL = 'critical',
  SHAKE = 'shake',
  FLASH = 'flash',
  HIGHLIGHT = 'highlight',
  PULSE = 'pulse',
  FADE_IN = 'fade_in',
  FADE_OUT = 'fade_out'
}

// Animation Events
export enum CombatAnimationEvent {
  START = 'animation:start',
  COMPLETE = 'animation:complete',
  DAMAGE_TEXT = 'animation:damage_text',
  COMBATANT_EFFECT = 'animation:combatant_effect',
  QUEUE_PROCESS = 'animation:queue_process'
}

// Animation Data Interfaces
export interface CombatDamageTextData {
  id: string;
  combatantId: string;
  value: number;
  type: CombatAnimationType.DAMAGE | CombatAnimationType.HEAL | CombatAnimationType.MISS | CombatAnimationType.CRITICAL;
  position: { x: number; y: number };
  timestamp: number;
}

export interface CombatEffectData {
  combatantId: string;
  effectType: CombatAnimationType.SHAKE | CombatAnimationType.FLASH | CombatAnimationType.HIGHLIGHT | CombatAnimationType.PULSE;
  duration: number;
  intensity?: 'low' | 'medium' | 'high';
}

// Combat Turn State
export interface CombatTurnState {
  hasPerformedAction: boolean;
  canEndTurn: boolean;
  actionType?: 'attack' | 'defend' | 'item' | 'ability';
  actionTarget?: string;
  timestamp: number;
}

export interface CombatResultData {
  // Combat metadata
  combatId: string;
  timestamp: Date;
  duration: number; // in seconds
  
  // Combat outcome
  victory: boolean;
  playerFled?: boolean; // True if player fled from combat
  enemyNames: string[]; // Array of all enemy names for easy access
  enemiesDefeated: Array<{
    name: string;
    type: string;
    level: number;
    npcId?: string; // NPC ID if enemy is an NPC
    finalHealth: number; // Final health when defeated
  }>;
  
  // Character changes
  characterUpdates: {
    // Health changes
    healthBefore: number;
    healthAfter: number;
    healthLost: number;
    
    // Experience and levels
    experienceGained: number;
    combatLevelBefore: number;
    combatLevelAfter: number;
    leveledUp: boolean;
    
    // Combat stats
    totalDamageDealt: number;
    totalDamageTaken: number;
    turnsPlayed: number;
    attacksLanded: number;
    attacksMissed: number;
  };
  
  // Rewards
  rewards: {
    experience: number;
    items: InventoryItem[];
    currency?: number;
  };
  
  // Extensible fields for future features
  metadata?: {
    location?: string;
    questRelated?: boolean;
    questId?: string;
    npcChallengeId?: string;
    [key: string]: any; // Allow future extensions
  };
}
