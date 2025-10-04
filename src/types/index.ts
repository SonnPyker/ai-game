export interface Character {
  id?: string;
  name: string;
  class: CharacterClass;
  race: CharacterRace;
  level?: number;
  stats?: CharacterStats;
  personality?: string;
  backstory: string;
  createdAt?: Date;
  // New fields for enhanced character creation
  gender: 'male' | 'female' | 'other';
  appearance?: string;
  personalityTraits?: string[];
  coreStats?: {
    strength: number;
    agility: number;
    intelligence: number;
    constitution: number;
    wisdom: number;
    charisma: number;
    // Modifiers được tính toán tự động từ base stats theo cơ chế DnD
    modifiers: {
      strength: number;
      agility: number;
      intelligence: number;
      constitution: number;
      wisdom: number;
      charisma: number;
    };
  };
  // Health
  health?: {
    current: number;
    max: number;
  };
  customStats?: { name: string; value: number }[];
  proficiencies?: { name: string; level: number; description?: string }[];
  hpMax?: number;
  energyMax?: number;
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  icon: string;
  primaryStats: string[];
  abilities: string[];
}

export interface CharacterRace {
  id: string;
  name: string;
  description: string;
  icon: string;
  racialBonuses: Record<string, number>;
  specialAbilities: string[];
}

export interface CharacterStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  health: number;
  experience: number;
}

export interface CharacterAppearance {
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number;
  weight: number;
  hairColor: string;
  eyeColor: string;
  skinColor: string;
  description: string;
}

export interface GameMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  characterId?: string;
}

export interface ChatMessage {
  role: 'player' | 'ai';
  content: string;
  timestamp: Date;
  turn?: number;
}

export interface GameState {
  currentCharacter: Character | null;
  messages: GameMessage[];
  currentScene: string;
  inventory: InventoryItem[];
  quests: Quest[];
  isGameActive: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  icon: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  objectives: QuestObjective[];
  rewards: QuestReward[];
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface QuestReward {
  type: 'experience' | 'item' | 'gold';
  amount: number;
  itemId?: string;
}

// Hệ thống Quest mới với progress tracking
export interface QuestProgress {
  id: string;
  type: 'main' | 'side' | 'faction';
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed' | 'locked' | 'available' | 'declined';
  act?: number; // Chỉ cho main quest
  factionName?: string; // Chỉ cho faction quest
  objectives: QuestObjectiveProgress[];
  rewards: QuestRewardProgress[];
  prerequisites?: string[]; // Quest cần hoàn thành trước
  unlockConditions?: {
    timeBased?: boolean;
    turnBased?: number;
    storyProgress?: string;
  };
  createdAt: Date;
  completedAt?: Date;
  turnCreated?: number; // Turn khi quest được tạo
  turnCompleted?: number; // Turn khi quest được hoàn thành
  turnStarted?: number; // Turn khi quest được bắt đầu
  // Lưu trữ toàn bộ objectives để tạo dần sau này (chỉ cho side quest)
  _allObjectives?: Array<{
    id: string;
    description: string;
    aiKeywords?: string[];
  }>;
}

export interface QuestObjectiveProgress {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  aiKeywords?: string[]; // Từ khóa AI cần nhận diện
  unlocked: boolean; // Objectives chỉ hiển thị khi đã unlock
}

export interface QuestRewardProgress {
  type: 'experience' | 'item' | 'gold' | 'story_progress';
  amount: number;
  itemId?: string;
  description: string;
  claimed: boolean;
  claimedAt?: Date;
}

export interface QuestSystem {
  mainQuests: QuestProgress[];
  sideQuests: QuestProgress[];
  factionQuests: QuestProgress[];
  currentAct: number;
  totalActs: number;
  unlockedActs: number[];
  questHistory: QuestProgress[];
  factionReputations: Array<{
    factionName: string;
    reputation: number;
  }>;
}

export interface WorldTime {
  hour: number;    // 0-23
  minute: number;  // 0-59
  day: number;     // 1-31
  month: number;   // 1-12
  year: number;    // Start year from world creation
  dayOfWeek: number; // 0-6 (0 = Sunday, 1 = Monday, etc.)
}

export interface WorldData {
  id: string;
  name: string;
  worldTitle?: string; // Tên thế giới hiển thị
  coreIdea: string;
  genre: string;
  setting: string;
  storyTone: string;
  narration: string;
  corePrinciples: Array<{
    name: string;
    description: string;
  }>;
  foundationEntities: Array<{
    name: string;
    description: string;
    classification?: string;
  }>;
  currencies: Array<{
    name: string;
    description: string;
    isMain: boolean;
  }>;
  startYear: number;
  difficulty: string;
  useLevels: boolean;
  description: string;
  createdAt: string;
  // Time system
  currentTime: WorldTime;
  // AI Generated Content
  factions?: Array<{
    name: string;
    goal: string;
    methods: string;
    weakness: string;
  }>;
  locations?: Array<{
    name: string;
    description: string;
    role: string;
  }>;
  keyEntities?: Array<{
    name: string;
    type: string;
    description: string;
    hook: string;
  }>;
  rules?: string[];
  starterQuest?: {
    title: string;
    objective: string;
    steps: string[];
    reward: string;
  };
}

// SCC (Summarize Chat Context) Types
export interface SCCSummary {
  recap: string;                // tóm tắt 5–10 câu, văn xuôi
  timeline: { when: string; what: string }[];
  clues: string[];              // manh mối đã/đang mở
  openThreads: string[];        // nút chưa giải quyết
  relationships: { npc: string; status: string; notes?: string }[];
  goals: { pcGoal: string; actGoal?: string }[];
  risks: string[];              // mối nguy hiện hữu
  sceneState?: SCCState;        // trạng thái hiện tại của scene
}

export interface SCCState {
  location?: string;
  npcs?: { name: string; state?: string }[];
  inventory?: { name: string; qty?: number }[];
  clocks?: { name: string; value: number; max: number }[];
  flags?: Record<string, boolean>;
}

// NPC Relationship System
export interface NPCRelationship {
  id: string;
  name: string;
  description?: string;
  relationshipLevel: number; // -100 to 100 (hate to love)
  reputation: number; // -100 to 100 (terrible to excellent)
  status: 'neutral' | 'friendly' | 'hostile' | 'rival' | 
          'acquaintance' | 'ally' | 'enemy' | 'suspicious' | 'admiring' | 'respectful' | 
          'disappointed' | 'cautious' | 'trusting' | 'competitive';
  lastInteraction: Date;
  totalInteractions: number;
  notes?: string[];
  tags?: string[]; // e.g., ['merchant', 'noble', 'criminal']
  location?: string; // where they were last seen
  faction?: string; // if they belong to a faction
  // Arousal system for 18+ content
  arousal?: {
    level: number; // 0 to 100 (not interested to very aroused)
    lastArousalChange: Date;
    arousalHistory: ArousalEvent[];
    personality: ArousalPersonality;
    preferences: ArousalPreferences;
  };
}

// Arousal system types
export interface ArousalEvent {
  id: string;
  timestamp: Date;
  change: number; // -50 to +50
  reason: string;
  context: string;
  intensity: 'low' | 'medium' | 'high';
}

export interface ArousalPersonality {
  responsiveness: number; // 0-100, how easily they get aroused
  inhibition: number; // 0-100, how much they hold back
  curiosity: number; // 0-100, how curious about sexual content
  experience: number; // 0-100, how experienced they are
  dominance: number; // 0-100, dominant vs submissive tendencies
  romanticism: number; // 0-100, prefers romantic vs purely sexual
}

export interface ArousalPreferences {
  genderPreference?: 'male' | 'female' | 'any' | 'none';
  agePreference?: 'younger' | 'same' | 'older' | 'any';
  personalityTypes: string[]; // e.g., ['confident', 'mysterious', 'caring']
  turnOns: string[]; // e.g., ['intelligence', 'humor', 'kindness']
  turnOffs: string[]; // e.g., ['rudeness', 'aggression', 'dishonesty']
  kinks: string[]; // e.g., ['romance', 'adventure', 'intimacy']
  boundaries: string[]; // e.g., ['no violence', 'no public', 'no drugs']
}

// Character Status System
export interface CharacterStatus {
  id: string;
  name: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  duration?: number; // in turns, null for permanent
  effects?: {
    healthModifier?: number; // -50 to 50
    manaModifier?: number; // -50 to 50
    statModifiers?: Record<string, number>; // e.g., { strength: -2, charisma: 1 }
  };
  source?: string; // what caused this status
  timestamp: Date;
}

// NPC Encounter System
export interface NPCEncounter {
  id: string;
  npcName: string;
  location: string;
  timestamp: Date;
  turn: number;
  interactionType: 'meeting' | 'conversation' | 'conflict' | 'trade' | 'quest' | 'romance';
  description: string;
  relationshipChange?: number; // how much relationship changed
  reputationChange?: number; // how much reputation changed
  itemsExchanged?: { given: string[]; received: string[] };
  questsOffered?: string[];
  questsCompleted?: string[];
}

export interface SCCContext {
  summary: SCCSummary;
  sceneState: SCCState;
  recentTurns: ChatMessage[];
  turnCounter: number;
}

// Content Flags for Adult Content Control
export interface ContentFlags {
  adult_enabled: boolean;
  adult_intensity: 'light' | 'fade' | 'direct_safe' | 'direct';
  first_time_setup?: boolean; // Để hiển thị age gate lần đầu
}

export interface StyleGuidance {
  whenOff: string;             // Hướng dẫn khi 18+ OFF
  whenOnSafe: string;          // Hướng dẫn khi 18+ ON an toàn
  whenOnDirect: string;        // Hướng dẫn khi 18+ ON tả thực
  rejectionMessage: string;    // Thông báo từ chối vi phạm
}
