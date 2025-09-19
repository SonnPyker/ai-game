import { CharacterClass, CharacterRace } from '@/types';

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: 'warrior',
    name: 'Chiến Binh',
    description: 'Một chiến binh dũng cảm với sức mạnh và khả năng chiến đấu vượt trội.',
    icon: '⚔️',
    primaryStats: ['strength', 'constitution'],
    abilities: ['Chiến đấu tay đôi', 'Phòng thủ', 'Lãnh đạo']
  },
  {
    id: 'mage',
    name: 'Pháp Sư',
    description: 'Bậc thầy về ma thuật với trí tuệ và khả năng phép thuật mạnh mẽ.',
    icon: '🔮',
    primaryStats: ['intelligence', 'wisdom'],
    abilities: ['Phép thuật tấn công', 'Phép thuật phòng thủ', 'Chữa lành']
  },
  {
    id: 'rogue',
    name: 'Lén Lút',
    description: 'Kẻ lén lút nhanh nhẹn với kỹ năng ẩn nấp và tấn công bất ngờ.',
    icon: '🗡️',
    primaryStats: ['dexterity', 'intelligence'],
    abilities: ['Ẩn nấp', 'Tấn công bất ngờ', 'Mở khóa']
  },
  {
    id: 'cleric',
    name: 'Tu Sĩ',
    description: 'Người thánh thiện với khả năng chữa lành và bảo vệ đồng minh.',
    icon: '⛪',
    primaryStats: ['wisdom', 'charisma'],
    abilities: ['Chữa lành', 'Bảo vệ', 'Trừ tà']
  },
  {
    id: 'ranger',
    name: 'Thợ Săn',
    description: 'Thợ săn thiện xạ với khả năng sống sót trong thiên nhiên hoang dã.',
    icon: '🏹',
    primaryStats: ['dexterity', 'wisdom'],
    abilities: ['Bắn cung', 'Theo dõi', 'Sống sót']
  },
  {
    id: 'bard',
    name: 'Nghệ Sĩ',
    description: 'Nghệ sĩ tài năng với khả năng truyền cảm hứng và ma thuật âm nhạc.',
    icon: '🎵',
    primaryStats: ['charisma', 'intelligence'],
    abilities: ['Truyền cảm hứng', 'Ma thuật âm nhạc', 'Thuyết phục']
  }
];

export const CHARACTER_RACES: CharacterRace[] = [
  {
    id: 'human',
    name: 'Con Người',
    description: 'Chủng tộc đa dạng và thích nghi tốt với mọi môi trường.',
    icon: '👤',
    racialBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    specialAbilities: ['Thích nghi nhanh', 'Kỹ năng đa dạng']
  },
  {
    id: 'elf',
    name: 'Tiên',
    description: 'Chủng tộc cổ xưa với trí tuệ và khả năng ma thuật tự nhiên.',
    icon: '🧝',
    racialBonuses: { dexterity: 2, intelligence: 1 },
    specialAbilities: ['Tầm nhìn ban đêm', 'Kháng ma thuật', 'Tuổi thọ cao']
  },
  {
    id: 'dwarf',
    name: 'Người Lùn',
    description: 'Chủng tộc mạnh mẽ và kiên cường với khả năng chế tạo vượt trội.',
    icon: '🧙',
    racialBonuses: { constitution: 2, strength: 1 },
    specialAbilities: ['Kháng độc', 'Chế tạo vũ khí', 'Tầm nhìn ban đêm']
  },
  {
    id: 'orc',
    name: 'Orc',
    description: 'Chủng tộc chiến binh với sức mạnh và khả năng chiến đấu vượt trội.',
    icon: '👹',
    racialBonuses: { strength: 2, constitution: 1 },
    specialAbilities: ['Sức mạnh tăng cường', 'Kháng sợ hãi', 'Tấn công dữ dội']
  },
  {
    id: 'halfling',
    name: 'Người Tí Hon',
    description: 'Chủng tộc nhỏ bé nhưng nhanh nhẹn và may mắn.',
    icon: '🧚',
    racialBonuses: { dexterity: 2, charisma: 1 },
    specialAbilities: ['May mắn', 'Ẩn nấp', 'Kháng sợ hãi']
  },
  {
    id: 'dragonborn',
    name: 'Rồng Sinh',
    description: 'Hậu duệ của rồng với khả năng thở lửa và sức mạnh khủng khiếp.',
    icon: '🐉',
    racialBonuses: { strength: 2, charisma: 1 },
    specialAbilities: ['Thở lửa', 'Kháng nguyên tố', 'Sức mạnh rồng']
  }
];

export const GAME_SCENES = [
  {
    id: 'tavern',
    name: 'Quán Rượu',
    description: 'Một quán rượu ấm cúng nơi các phiêu lưu gia tụ tập.',
    background: '🏠',
    atmosphere: 'warm'
  },
  {
    id: 'forest',
    name: 'Rừng Bí Ẩn',
    description: 'Một khu rừng cổ xưa đầy bí ẩn và nguy hiểm.',
    background: '🌲',
    atmosphere: 'mysterious'
  },
  {
    id: 'dungeon',
    name: 'Hầm Ngục',
    description: 'Một hầm ngục tối tăm với những bí mật cổ xưa.',
    background: '🏰',
    atmosphere: 'dark'
  },
  {
    id: 'city',
    name: 'Thành Phố',
    description: 'Một thành phố sầm uất với nhiều cơ hội và thử thách.',
    background: '🏙️',
    atmosphere: 'busy'
  }
];
