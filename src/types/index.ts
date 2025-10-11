export interface Character {
  id?: string;
  name: string;
  level?: number; // Character Level (tổng thể)
  combatLevel?: number; // Combat Level (chỉ cho chiến đấu)
  combatExperience?: number; // Số lần tham gia chiến đấu
  stats?: CharacterStats;
  personality?: string;
  backstory: string;
  createdAt?: Date;
  // New fields for enhanced character creation
  gender: 'male' | 'female' | 'other';
  appearance?: string;
  personalityTraits?: string[];
  title?: string; // Danh hiệu đã được phân tích và lưu trữ
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
  // Inventory and Equipment system
  inventory?: InventoryItem[];
  equipment?: Equipment;
  equipped_stats_bonuses?: {
    strength: number;
    agility: number;
    intelligence: number;
    constitution: number;
    wisdom: number;
    charisma: number;
  };
  // Currency and Experience system
  currency?: number; // Số tiền chính hiện tại
  secondaryCurrency?: number; // Số tiền phụ hiện tại
  experience?: number; // Kinh nghiệm hiện tại
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
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unique';
  quantity: number;
  icon: string;
  // New fields for equipment system
  isEquipped?: boolean;
  stats?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    constitution?: number;
    wisdom?: number;
    charisma?: number;
  };
  slot?: 'weapon_main' | 'weapon_off' | 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'accessory1' | 'accessory2' | 'accessory3';
  equipped_at?: Date;
  // Tags system for quest rewards
  tags?: string[]; // Tags để phân loại items (type tags + 'reward' tag)
  
  // NEW: Combat stats for weapons and damaging items
  damage?: string; // dice notation (e.g., "1d8+2", "2d6")
  attackBonus?: number; // modifier for attack rolls
  damageType?: 'physical' | 'magical' | 'fire' | 'cold' | 'lightning' | 'poison' | 'psychic';
  weaponProperties?: WeaponProperties;
  
  // NEW: Delivery quest fields
  deliveryQuestId?: string; // Quest ID nếu item này dùng để giao
  deliveryNPCId?: string; // NPC cần giao cho
}

export interface WeaponProperties {
  range?: number; // range in feet, undefined for melee
  twoHanded?: boolean; // requires two hands
  finesse?: boolean; // can use agility instead of strength
  light?: boolean; // light weapon for dual wielding
  heavy?: boolean; // heavy weapon
  reach?: boolean; // has reach (10ft range)
  thrown?: boolean; // can be thrown
  versatile?: string; // damage when used two-handed (e.g., "1d10")
  ammunition?: boolean; // requires ammunition
  loading?: boolean; // requires loading action
}

export interface Equipment {
  weapon_main?: InventoryItem;      // Vũ khí chính
  weapon_off?: InventoryItem;       // Vũ khí phụ
  head?: InventoryItem;             // Mũ
  chest?: InventoryItem;            // Áo giáp
  hands?: InventoryItem;            // Găng tay
  legs?: InventoryItem;             // Quần
  feet?: InventoryItem;             // Giày
  accessory1?: InventoryItem;       // Phụ kiện 1
  accessory2?: InventoryItem;       // Phụ kiện 2
  accessory3?: InventoryItem;       // Phụ kiện 3
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
  // Location signature quest system
  isLocationSignature?: boolean; // true if this is a signature quest for a location
  signatureLocationId?: string; // ID of the location this quest is signature for
  signatureNPCId?: string; // ID of the NPC who offers this signature quest
  // Lưu trữ toàn bộ objectives để tạo dần sau này (chỉ cho side quest)
  _allObjectives?: Array<{
    id: string;
    description: string;
    aiKeywords?: string[];
  }>;
}

// Quest Objective Types
export type QuestObjectiveType = 'find_item' | 'find_npc' | 'combat' | 'travel' | 'chain_delivery';

export interface QuestObjectiveProgress {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  unlocked: boolean; // Objectives chỉ hiển thị khi đã unlock
  
  // NEW: Objective type và tracking data
  type: QuestObjectiveType;
  
  // For find_item objectives
  targetItemId?: string;
  targetItemName?: string;
  requiredQuantity?: number;
  currentQuantity?: number;
  
  // For find_npc objectives  
  targetNPCId?: string;
  targetNPCName?: string;
  
  // For combat objectives
  targetEnemyName?: string;
  targetEnemyType?: string; // 'beast', 'humanoid', etc.
  targetEnemyId?: string; // for specific NPC enemies
  requiredKills?: number;
  currentKills?: number;
  
  // For travel objectives
  targetLocationId?: string;
  targetLocationName?: string;
  targetPosition?: { x: number; y: number };
  
  // For delivery objectives
  deliveryItemId?: string;
  deliveryItemName?: string;
  deliveryNPCId?: string;
  deliveryNPCName?: string;
  
  // For quest chain objectives
  isChainObjective?: boolean; // true if this is part of a quest chain
  chainId?: string; // ID to group related objectives
  prerequisiteObjectiveId?: string; // ID of the objective that must be completed first
  itemToReceive?: { // Item that will be given to player when this objective is completed
    id: string;
    name: string;
    quantity: number;
    type: 'weapon' | 'armor' | 'consumable' | 'misc';
    description?: string;
    value?: number;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    tags?: string[];
  };
  
  // DEPRECATED: Old AI-based fields (keep for migration)
  aiKeywords?: string[]; // Từ khóa AI cần nhận diện
}

export interface QuestRewardProgress {
  type: 'currency' | 'item' | 'experience' | 'faction_reputation' | 'story_progress';
  amount: number;
  items?: InventoryItem[]; // Mảng items cho loại reward item
  factionName?: string; // Tên phe phái cho faction reputation
  description: string;
  claimed: boolean;
  claimedAt?: Date;
}

export interface QuestSystem {
  starterQuest?: QuestProgress;
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

// Combat History for Quest Tracking
export interface CombatHistory {
  defeatedEnemies: Array<{
    name: string;
    type: string;
    enemyId?: string; // for NPC enemies
    defeatedAt: Date;
    turn: number;
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

export interface Location {
  id: string;
  name: string;
  description: string;
  role: string;
  type: 'story' | 'secondary'; // story = cốt truyện chính, secondary = ít liên quan nhưng có ảnh hưởng
  gridPosition: { x: number; y: number }; // vị trí trên grid
  nearbyLocations?: string[]; // IDs của locations lân cận
  // Location signature system
  signatureNPCId?: string; // ID of the signature NPC for this location
  signatureQuestId?: string; // ID of the signature quest for this location
  hasSignatureContent?: boolean; // true if this location has signature NPC and quest
}

export interface PlayerLocation {
  currentLocationId: string;
  locationHistory: Array<{
    locationId: string;
    arrivedAt: WorldTime;
    turn: number;
  }>;
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
  economy?: {
    currencies: string[];
    notes?: string;
  };
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
  locations?: Location[]; // thay vì Array<{name, description, role}>
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
  locationId?: string; // ID của location hiện tại
  npcs?: { name: string; state?: string }[];
  inventory?: InventoryItem[]; // Updated to use structured inventory
  clocks?: { name: string; value: number; max: number }[];
  flags?: Record<string, boolean>;
  worldTime?: WorldTime;
}

// Combat Stats System
export interface CombatStats {
  combatLevel?: number; // Combat Level (chỉ cho chiến đấu) - optional for backward compatibility
  characterLevel?: number; // Character Level (tổng thể) - optional
  level?: number; // Legacy level field for backward compatibility
  stats: {
    strength: number;
    agility: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    modifiers: {
      strength: number;
      agility: number;
      intelligence: number;
      constitution: number;
      wisdom: number;
      charisma: number;
    }
  };
  health: { current: number; max: number };
  armorClass: number; // AC trong DnD
  attacks: Attack[];
  abilities?: SpecialAbility[];
}

export interface Attack {
  name: string;
  attackBonus: number;
  damage: string; // dice notation (e.g., "1d8+2")
  damageType: 'physical' | 'magical' | 'fire' | 'cold' | 'lightning' | 'poison' | 'psychic';
  range?: number; // range in feet, undefined for melee
}

export interface SpecialAbility {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active' | 'reaction';
  cooldown?: number; // số turn
  effect: string; // mô tả effect
}

// Enemy interface - kế thừa combat stats
export interface Enemy extends CombatStats {
  id: string;
  name: string;
  description: string;
  type: 'beast' | 'humanoid' | 'undead' | 'demon' | 'elemental' | 'construct' | 'other';
  loot?: InventoryItem[];
  experienceReward: number;
  // Optional: NPC reference nếu enemy này là NPC
  npcId?: string;
  // Legacy level field for backward compatibility
  level?: number;
}

// NPC Relationship System
export interface NPCRelationship {
  id: string;
  name: string;
  description?: string;
  level?: number; // Character Level (tổng thể)
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
  // Location-specific NPC system
  isLocationSignature?: boolean; // true if this NPC is the signature NPC for a location
  signatureLocationId?: string; // ID of the location this NPC is signature for
  signatureQuestId?: string; // ID of the signature quest this NPC offers
  // Arousal system for 18+ content
  arousal?: {
    level: number; // 0 to 100 (not interested to very aroused)
    lastArousalChange: Date;
    arousalHistory: ArousalEvent[];
    personality: ArousalPersonality;
    preferences: ArousalPreferences;
  };
  
  // NEW: Combat stats for NPCs
  combatStats?: CombatStats; // Optional, chỉ có khi NPC có thể combat
  canBeCombatant?: boolean; // true nếu NPC này có thể tham gia combat
  combatBehavior?: {
    aggression: number; // 0-100, độ hung hăng
    cowardice: number; // 0-100, độ nhút nhát (chạy sớm)
    strategy: 'aggressive' | 'defensive' | 'balanced' | 'tactical';
    preferredRange: 'melee' | 'ranged' | 'mixed';
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
