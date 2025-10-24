// Character Skill System
export interface CharacterSkill {
  id: string;
  name: string;
  description: string;
  level: number;
  skillType: 'damage' | 'healing' | 'social';
  effects: string[]; // Luôn có ít nhất 2 effects
  cooldown: number; // Số lượt cooldown
  currentCooldown: number; // Cooldown hiện tại
  icon: string; // Emoji icon
  requiresTarget?: boolean; // For damage skills that need target selection
}

export interface Character {
  id?: string;
  name: string;
  level?: number; // Character Level (tổng thể)
  combatLevel?: number; // Combat Level (chỉ cho chiến đấu)
  combatExperience?: number; // XP combat level (mỗi combat thắng = 1 XP)
  stats?: CharacterStats;
  personality?: string;
  backstory: string;
  createdAt?: Date;
  // New fields for enhanced character creation
  gender: 'male' | 'female' | 'other';
  appearance?: string; // Legacy text description
  appearanceDetails?: CharacterAppearance; // Detailed appearance for image generation
  personalityTraits?: string[];
  title?: string; // Danh hiệu đã được phân tích và lưu trữ
  coreStats?: {
    strength: number;
    agility: number;
    intelligence: number;
    constitution: number;
    wisdom: number;
    charisma: number;
    armorClass: number; // AC (Armor Class) - được tính từ agility modifier + equipment
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
  proficiencies?: { name: string; level: number; description?: string }[]; // Legacy - sẽ được migrate sang skills
  skills?: CharacterSkill[]; // New skill system
  hpMax?: number;
  energyMax?: number;
  // Inventory and Equipment system
  inventory?: InventoryItem[];
  equipment?: Equipment;
  // Currency and Experience system
  currency?: number; // Số tiền chính hiện tại
  secondaryCurrency?: number; // Số tiền phụ hiện tại
  experience?: number; // Kinh nghiệm hiện tại
  // Skill Tree system
  skillPoints?: { combat: number; social: number }; // Điểm kỹ năng chưa dùng
  skillTree?: SkillTree; // Skill tree đã học
  // Ally system
  allies?: string[]; // Mảng NPC IDs của đồng minh
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
  imageUrl?: string;
  imagePrompt?: string;
  isGeneratingImage?: boolean; // Trạng thái đang tạo ảnh
  hasImageGenerationFailed?: boolean; // Đánh dấu đã thử tạo ảnh nhưng thất bại
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
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'misc';
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
    // Combat stats
    attackBonus?: number;
    armorClass?: number;
  };
  
  // Consumable specific properties
  effect?: string; // Effect string using new format (type:target:value:duration)
  healing?: number; // Legacy healing value (deprecated, use effect instead)
  consumableType?: 'healing' | 'buff' | 'debuff' | 'cure' | 'special'; // Type of consumable effect
  duration?: number; // Duration in turns (0 = instant)
  targetType?: 'self' | 'enemy' | 'any'; // Who can use this consumable
  requiresTarget?: boolean; // Whether this consumable requires a target selection
  cooldown?: number; // Cooldown in turns before can be used again
  stackable?: boolean; // Whether multiple instances can be active at once
  maxStacks?: number; // Maximum number of stacks (if stackable)
  slot?: 'weapon' | 'armor' | 'accessory1' | 'accessory2' | 'accessory3';
  originalSlot?: 'weapon' | 'armor' | 'accessory1' | 'accessory2' | 'accessory3'; // Slot gốc của item (không thay đổi)
  equipped_at?: Date;
  // Tags system for quest rewards
  tags?: string[]; // Tags để phân loại items (type tags + 'reward' tag)
  // Equipment specific properties
  damage?: string; // For weapons: "1d6+1"
  damageType?: string; // For weapons: "slashing", "piercing", etc.
  attackBonus?: number; // For weapons: +1, +2, etc.
  armorClass?: number; // For armor: 12, 14, etc.
  weaponProperties?: WeaponProperties;
  saveDC?: number; // For elemental weapons: DC for saving throw
  
  // NEW: Delivery quest fields
  deliveryQuestId?: string; // Quest ID nếu item này dùng để giao
  deliveryNPCId?: string; // NPC cần giao cho
  // NEW: Trading fields
  value?: number; // Giá bán (50% của giá mua) - KHUYẾN NGHỊ
  buyPrice?: number; // Giá mua từ merchant
  
  // NEW: Accessory effects (tương tự skill tree effects)
  effects?: string[]; // Array các effects cho accessories: ["stat_buff:strength:+2:permanent"]
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
  weapon?: InventoryItem;           // Vũ khí
  armor?: InventoryItem;            // Áo giáp
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
  type: 'story' | 'secondary' | 'shop'; // story = cốt truyện chính, secondary = ít liên quan nhưng có ảnh hưởng, shop = cửa hàng
  gridPosition: { x: number; y: number }; // vị trí trên grid
  nearbyLocations?: string[]; // IDs của locations lân cận
  // Location signature system
  signatureNPCId?: string; // ID of the signature NPC for this location
  signatureQuestId?: string; // ID of the signature quest for this location
  hasSignatureContent?: boolean; // true if this location has signature NPC and quest
  // Merchant shop system
  locationType?: 'shop' | 'story' | 'secondary'; // Thêm type shop
  merchantShop?: MerchantShop; // Nếu là shop location
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
  worldDifficulty?: string; // Alias for difficulty for consistency
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
  // Location information
  location?: {
    name: string;
    description: string;
    type: string; // tavern, dungeon, forest, city, ruins, etc.
    atmosphere: string; // mysterious, dangerous, peaceful, bustling, etc.
    features: string[]; // tables, bar, fireplace, secret passages, etc.
  };
  locationId?: string; // ID của location hiện tại
  
  // NPCs present in the scene
  npcs?: Array<{
    id: string;
    name: string;
    description: string;
    role: string; // bartender, merchant, guard, traveler, etc.
    mood: string; // friendly, suspicious, angry, etc.
    dialogue: string; // Current dialogue or reaction
    position: string; // behind_bar, at_table, near_door, etc.
    status: string; // alive, unconscious, busy, available, etc.
  }>;
  
  // Items available in the scene
  availableItems?: Array<{
    id: string;
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'consumable' | 'misc';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    quantity: number;
    icon: string;
    location: string; // on_table, in_chest, behind_bar, etc.
    condition: string; // pristine, worn, broken, etc.
    value: number; // for trading
    // Consumable specific properties
    effect?: string; // Effect string using new format
    consumableType?: ConsumableEffectType;
    duration?: number; // Duration in turns
    targetType?: 'self' | 'enemy' | 'any';
    requiresTarget?: boolean;
    cooldown?: number; // Cooldown in turns
    stackable?: boolean;
    maxStacks?: number;
    level?: number; // Required level to use
    tags?: string[]; // Tags for categorization
    flavorText?: string; // Additional flavor text
    usageInstructions?: string; // How to use this consumable
    // Equipment specific properties
    damage?: string; // For weapons
    damageType?: string; // For weapons
    attackBonus?: number; // For weapons
    armorClass?: number; // For armor
    slot?: string; // Equipment slot
    effects?: string[]; // For accessories: stat buffs
  }>;
  
  // Time-based events (clocks)
  clocks?: Array<{
    id: string;
    name: string;
    description: string;
    progress: number; // 0-100
    maxProgress: number;
    timeRemaining: number; // turns or real-time
    consequences: string; // what happens when completed
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }>;
  
  // Scene state flags
  flags?: {
    discovered: boolean; // đã khám phá
    cleared: boolean; // đã dọn sạch
    locked: boolean; // bị khóa
    dangerous: boolean; // nguy hiểm
    peaceful: boolean; // hòa bình
    magical: boolean; // có ma thuật
    cursed: boolean; // bị nguyền rủa
    blessed: boolean; // được ban phước
  };
  
  // World time
  worldTime?: WorldTime;
  
  // Environment details
  environment?: {
    lighting: string; // bright, dim, dark, magical
    temperature: string; // hot, warm, cool, cold, freezing
    humidity: string; // dry, normal, humid, wet
    wind: string; // calm, breezy, windy, stormy
    sounds: string; // silent, quiet, normal, loud, chaotic
    smells: string; // fresh, musty, sweet, foul, magical
  };
  
  // Available interactions
  interactions?: {
    examine: string[]; // objects, areas, persons that can be examined
    search: string[]; // hidden_items, secrets, clues that can be searched
    talk: Array<{ npc_id: string; topics: string[] }>; // NPCs and conversation topics
    use: Array<{ item_id: string; targets: string[] }>; // items and their possible targets
    move: Array<{ direction: string; destination: string }>; // movement options
    rest: Array<{ duration: string; safety_level: string }>; // rest options
    craft: Array<{ recipe: string; materials: string[] }>; // crafting options
    trade: Array<{ npc_id: string; items: string[] }>; // trading options
  };
  
  // Dangers present
  dangers?: {
    traps: Array<{
      type: string;
      location: string;
      trigger: string;
      damage: string;
    }>;
    monsters: Array<{
      name: string;
      level: number;
      threat_level: string;
      location: string;
    }>;
    environmental: string[]; // poison_gas, falling_rocks, etc.
    social: string[]; // hostile_npcs, guards, etc.
  };
  
  // Secrets not yet discovered
  secrets?: {
    hidden_passages: string[]; // secret doors, hidden paths
    secret_items: string[]; // hidden treasures, concealed objects
    hidden_rooms: string[]; // secret chambers, concealed spaces
    coded_messages: string[]; // encrypted texts, coded communications
    ancient_knowledge: string[]; // lost lore, forgotten wisdom
  };
}

// Temporary Player Stats for Combat
export interface TemporaryPlayerStats {
  // Core stats (base + equipment + status effects)
  coreStats: {
    strength: number;
    agility: number;
    intelligence: number;
    constitution: number;
    wisdom: number;
    charisma: number;
    modifiers: {
      strength: number;
      agility: number;
      intelligence: number;
      constitution: number;
      wisdom: number;
      charisma: number;
    };
  };
  // Combat stats
  armorClass: number; // AC with equipment + status effects
  attackBonus: number; // From stats + equipment + status effects
  damageBonus: string; // Extra damage dice from buffs (e.g., "+2d4")
  // Equipment bonuses
  equipmentBonuses: {
    ac: number;
    attack: number;
    damage: string;
    stats: { [key: string]: number };
  };
  // Status effect modifiers
  statusEffectModifiers: {
    ac: number;
    attack: number;
    damage: string;
    stats: { [key: string]: number };
  };
}

// Status Effects for Combat
export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // 0 for instant, >0 for turns
  icon: string; // Icon để hiển thị
  effects: {
    healthModifier?: number;
    armorClassModifier?: number;
    attackModifier?: number;
    damageModifier?: string; // String for dice notation (e.g., "1d4", "+2")
    statModifiers?: { [key: string]: number };
  };
}

// Consumable Effect Types
export type ConsumableEffectType = 'heal' | 'stat_buff' | 'damage_buff' | 'debuff' | 'cure' | 'special';

// Parsed Consumable Effect
export interface ParsedConsumableEffect {
  type: ConsumableEffectType;
  target: string; // stat name, 'self', 'enemy', etc.
  value: string; // modifier value (e.g., "+2", "1d4", "2")
  duration: string; // duration (e.g., "5turns", "instant")
}

// Consumable Usage Context
export interface ConsumableUsageContext {
  user: string; // user ID
  target?: string; // target ID (if requires target)
  combatTurn: number; // current combat turn
  location: string; // where it's being used
  conditions?: string[]; // special conditions
}

// Consumable Effect Result
export interface ConsumableEffectResult {
  success: boolean;
  message: string;
  effects: StatusEffect[];
  healing?: number; // amount healed (if any)
  damage?: number; // amount of damage dealt (if any)
  statChanges?: { [key: string]: number }; // stat changes applied
  duration?: number; // effect duration
}

// Consumable Database Entry
export interface ConsumableDatabaseEntry {
  id: string;
  name: string;
  description: string;
  effect: string; // Effect string using new format
  consumableType: ConsumableEffectType;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value: number; // gold value
  icon: string;
  duration: number; // Duration in turns
  targetType: 'self' | 'enemy' | 'any';
  requiresTarget: boolean;
  cooldown: number; // Cooldown in turns
  stackable: boolean;
  maxStacks: number;
  level: number; // Required level to use
  tags: string[]; // Tags for categorization
  flavorText?: string; // Additional flavor text
  usageInstructions?: string; // How to use this consumable
}

// Consumable Category
export interface ConsumableCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string; // CSS color for UI
  effects: ConsumableEffectType[];
  sortOrder: number;
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
  skills?: CharacterSkill[]; // Character skills for combat
  equippedArmor?: InventoryItem; // Chest armor đang mặc
  statusEffects?: StatusEffect[]; // Active status effects
}

export interface Attack {
  name: string;
  attackBonus: number;
  damage: string; // dice notation (e.g., "1d8+2")
  damageType: 'physical' | 'magical' | 'fire' | 'cold' | 'lightning' | 'poison' | 'psychic' | 'radiant' | 'slashing' | 'piercing' | 'bludgeoning';
  range?: number; // range in feet, undefined for melee
  saveDC?: number; // DC for saving throw against elemental effects
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
  // Threat level for reward calculation
  threatLevel?: 'low' | 'medium' | 'high' | 'extreme';
  // Enemy skills (optional for backward compatibility)
  skills?: CharacterSkill[];
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
  // Merchant signature NPC system
  isMerchantSignature?: boolean; // true if this NPC is the merchant signature for a shop location
  merchantSignatureLocationId?: string; // ID of the shop location this NPC is merchant for
  merchantShopId?: string; // ID of the merchant shop this NPC manages
  // QUAN TRỌNG: 1 NPC không thể vừa isLocationSignature và isMerchantSignature
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
  // Ally system
  isAlly?: boolean; // true nếu NPC này là đồng minh của player
  isInjured?: boolean; // true nếu NPC bị thương (không thể combat)
  injuredUntilTurn?: number; // Turn game khi NPC hồi phục từ chấn thương
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

// Combat State for Combat System
export interface CombatState {
  id: string;
  isActive: boolean;
  isPlayerTurn: boolean;
  currentTurnCombatant: string | null;
  combatants: Combatant[];
  turnOrder: string[];
  currentTurn: number;
  turnLogs: TurnLog[];
  temporaryPlayerStats?: TemporaryPlayerStats;
  playerInventory?: InventoryItem[]; // Player's consumable inventory during combat
}

// Combatant interface for combat
export interface Combatant {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'npc' | 'ally';
  characterData?: Character; // For player and NPC combatants
  stats: CombatStats;
  statusEffects: StatusEffect[];
  equippedArmor?: InventoryItem;
  isAlive: boolean;
  initiative: number;
  allyNPCId?: string; // ID của NPC gốc nếu type === 'ally'
}

// Turn Log for combat history
export interface TurnLog {
  turn: number;
  combatantId: string;
  combatantName: string;
  isPlayerTurn: boolean;
  actions: CombatLogEntry[];
}

// Combat Log Entry
export interface CombatLogEntry {
  id: string;
  type: 'initiative' | 'attack' | 'damage' | 'heal' | 'status' | 'death' | 'victory' | 'defeat' | 'info';
  message: string;
  details?: string;
}

// Skill Tree System Types
export interface SkillTreeSkill {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3 | 'special';
  category: 'combat' | 'social';
  prerequisites?: string[]; // IDs của skills cần thiết
  cost: number; // Số skill points cần để học
  bonuses: SkillBonuses;
  icon?: string;
  isLearned?: boolean; // Trạng thái học của skill này
}

export interface SkillBonuses {
  // Combat bonuses
  armorClass?: number;
  attackBonus?: number;
  damageBonus?: string; // Dice notation như "+1d4", "+2d6"
  initiative?: number;
  criticalChance?: number; // Percentage
  // Social bonuses
  statBonuses?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    constitution?: number;
    wisdom?: number;
    charisma?: number;
  };
  // Special bonuses
  shopPriceModifier?: number; // Percentage, negative = cheaper
  sellPriceModifier?: number; // Percentage, positive = more money
  reputationGainModifier?: number; // Percentage
  relationshipGainModifier?: number; // Percentage
  // Special abilities
  specialAbilities?: string[]; // IDs của special abilities
}

export interface SkillTree {
  combat: {
    learned: string[]; // IDs của skills đã học
    available: string[]; // IDs của skills có thể học
  };
  social: {
    learned: string[]; // IDs của skills đã học
    available: string[]; // IDs của skills có thể học
  };
}

export interface SkillTreeService {
  getSkillDefinitions(): SkillTreeSkill[];
  canLearnSkill(character: Character, skillId: string): boolean;
  learnSkill(character: Character, skillId: string): boolean;
  resetSkillTree(character: Character, cost: number): boolean;
  getActiveBonuses(character: Character): SkillBonuses;
  calculateSkillPointsFromLevels(character: Character): { combat: number; social: number };
}

// ComfyUI Integration Types
export type ComfyUIResolution = '640x360' | '854x480' | '1280x720' | '1920x1080';

export type ComfyUISampler = 
  | 'euler'
  | 'euler_ancestral'
  | 'heun'
  | 'dpm_2'
  | 'dpm_2_ancestral'
  | 'lms'
  | 'dpm_fast'
  | 'dpm_adaptive'
  | 'dpmpp_2m'
  | 'dpmpp_2s_ancestral'
  | 'dpmpp_sde'
  | 'dpmpp_sde_gpu'
  | 'dpmpp_2m_sde'
  | 'dpmpp_2m_sde_gpu'
  | 'dpmpp_3m_sde'
  | 'dpmpp_3m_sde_gpu'
  | 'ddim'
  | 'lcm'
  | 'ipndm'
  | 'deis'
  | 'res_multistep'
  | 'res_multistep_ancestral'
  | 'gradient_estimation'
  | 'er_sde'
  | 'seeds_2'
  | 'seeds_3';

export interface LoRAConfig {
  name: string; // LoRA filename
  strength: number; // LoRA strength (0.0 - 2.0)
  enabled: boolean; // Whether this LoRA is active
  category: 'quality' | 'anatomy' | 'style' | 'detail' | 'lighting' | 'custom'; // LoRA category
  description?: string; // Human-readable description
}

export interface ComfyUISettings {
  enabled: boolean;
  resolution: ComfyUIResolution;
  serverUrl: string;
  checkpoint: string; // Selected checkpoint model
  loras: LoRAConfig[]; // Multiple LoRA configurations
  style: string; // Selected art style
  customStyle: string; // Custom style prompt
  qualityLevel: 'standard' | 'high' | 'ultra'; // Quality level
  enableCharacterConsistency: boolean; // Enable character appearance consistency
  sampler: ComfyUISampler; // Sampling method
  steps: number; // Number of sampling steps (1-150)
  cfgScale: number; // CFG Scale (1.0-30.0)
  maxLoras: number; // Maximum number of LoRAs to use simultaneously (default: 3)
}

// Art styles for image generation
export type ArtStyle = 
  | 'realistic' 
  | 'anime' 
  | 'manga' 
  | 'cartoon' 
  | 'oil_painting' 
  | 'watercolor' 
  | 'digital_art' 
  | 'concept_art' 
  | 'fantasy_art' 
  | 'sci_fi' 
  | 'medieval' 
  | 'steampunk' 
  | 'cyberpunk' 
  | 'custom';

// Character appearance for consistency
export interface CharacterAppearance {
  gender: 'male' | 'female' | 'other';
  age: 'child' | 'teen' | 'young_adult' | 'adult' | 'elderly';
  hair: {
    color: string;
    length: string;
    style: string;
  };
  eyes: {
    color: string;
    shape: string;
  };
  skin: {
    tone: string;
    texture: string;
  };
  body: {
    build: string;
    height: string;
  };
  clothing: {
    style: string;
    colors: string[];
    accessories: string[];
  };
  distinctive_features: string[]; // Scars, tattoos, etc.
}

// Merchant Shop System Types
export interface MerchantShop {
  locationId: string;
  merchantNPCId: string;
  lastRestockTime: WorldTime; // Thời gian reset lần cuối
  inventory: MerchantInventory;
  skillBookChance: number; // Tăng mỗi ngày, max 70%
  currency: number; // Tiền của merchant (vô hạn)
}

export interface MerchantInventory {
  weapons: InventoryItem[];
  armor: InventoryItem[];
  accessories: InventoryItem[];
  consumables: InventoryItem[];
  skillBooks: SkillBook[];
}

export interface SkillBook {
  id: string;
  name: string;
  description: string;
  type: 'skill_book';
  skillType: 'damage' | 'healing' | 'social';
  skillLevel: 1 | 2 | 3;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  price?: number; // Legacy field
  value: number; // Base value
  buyPrice: number; // Price to buy from shop
  icon?: string;
  quantity: number;
  // Skill data đầy đủ (tương tự character creation skills)
  skillData: CharacterSkill;
  effects: string[]; // Effects array
}
