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
  };
  customStats?: { name: string; value: number }[];
  proficiencies?: { name: string; level: number; energyCost?: number; description?: string }[];
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
  mana: number;
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

export interface WorldTime {
  hour: number;    // 0-23
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
}

export interface SCCState {
  location?: string;
  npcs?: { name: string; state?: string }[];
  inventory?: { name: string; qty?: number }[];
  clocks?: { name: string; value: number; max: number }[];
  flags?: Record<string, boolean>;
}

export interface SCCContext {
  summary: SCCSummary;
  sceneState: SCCState;
  recentTurns: ChatMessage[];
  turnCounter: number;
}
