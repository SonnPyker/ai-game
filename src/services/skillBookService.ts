import { SkillBook, Character, CharacterSkill } from '../types';

class SkillBookService {
  private static instance: SkillBookService;

  private constructor() {}

  public static getInstance(): SkillBookService {
    if (!SkillBookService.instance) {
      SkillBookService.instance = new SkillBookService();
    }
    return SkillBookService.instance;
  }

  /**
   * Sử dụng skill book để học skill từ skillData
   */
  public useSkillBook(character: Character, skillBook: SkillBook): { success: boolean; skill?: CharacterSkill; message: string } {
    if (!character.skills) {
      character.skills = [];
    }

    // Sử dụng skill data từ skill book thay vì tạo mới
    if (!skillBook.skillData) {
      return {
        success: false,
        message: 'Skill book này không có dữ liệu kỹ năng hợp lệ.'
      };
    }

    // Tạo skill từ skillData với ID mới để tránh trùng lặp
    const newSkill: CharacterSkill = {
      ...skillBook.skillData,
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentCooldown: 0
    };

    // Kiểm tra xem character đã có skill này chưa (dựa trên tên và loại)
    const existingSkill = character.skills.find(s => 
      s.name === newSkill.name && s.skillType === newSkill.skillType
    );
    if (existingSkill) {
      return {
        success: false,
        message: 'Bạn đã học skill này rồi!'
      };
    }

    // Thêm skill vào character
    character.skills.push(newSkill);

    // Lưu character
    localStorage.setItem('currentCharacter', JSON.stringify(character));

    return {
      success: true,
      skill: newSkill,
      message: `Bạn đã học skill mới: ${newSkill.name}!`
    };
  }

  /**
   * Tạo skill ngẫu nhiên dựa trên type và level
   */
  public generateRandomSkill(skillType: 'damage' | 'healing' | 'social', skillLevel: 1 | 2 | 3): CharacterSkill | null {
    const skillTemplates = this.getSkillTemplates();
    const availableSkills = skillTemplates.filter(skill => 
      skill.skillType === skillType && skill.level === skillLevel
    );

    if (availableSkills.length === 0) {
      return null;
    }

    const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    
    return {
      ...randomSkill,
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentCooldown: 0
    };
  }

  /**
   * Lấy danh sách skill templates theo type và level
   */
  public getSkillTemplates(): CharacterSkill[] {
    return [
      // DAMAGE SKILLS - Level 1
      {
        id: 'damage_1_1',
        name: 'Đòn Tấn Công Mạnh',
        description: 'Tấn công với sức mạnh toàn bộ, gây sát thương tăng thêm.',
        level: 1,
        skillType: 'damage',
        effects: ['instant_damage:1d6+2', 'stat_buff:strength:+1:self:2turns'],
        cooldown: 2,
        currentCooldown: 0,
        icon: '⚔️',
        requiresTarget: true
      },
      {
        id: 'damage_1_2',
        name: 'Đòn Chí Mạng',
        description: 'Tấn công chính xác vào điểm yếu của kẻ thù.',
        level: 1,
        skillType: 'damage',
        effects: ['instant_damage:1d8+1', 'stat_buff:critical:+5:self:1turns'],
        cooldown: 3,
        currentCooldown: 0,
        icon: '💥',
        requiresTarget: true
      },
      {
        id: 'damage_1_3',
        name: 'Đòn Tấn Công Liên Hoàn',
        description: 'Thực hiện nhiều đòn tấn công nhanh chóng.',
        level: 1,
        skillType: 'damage',
        effects: ['instant_damage:1d4', 'instant_damage:1d4'],
        cooldown: 2,
        currentCooldown: 0,
        icon: '⚡',
        requiresTarget: true
      },

      // DAMAGE SKILLS - Level 2
      {
        id: 'damage_2_1',
        name: 'Đòn Tấn Công Hủy Diệt',
        description: 'Tấn công với sức mạnh hủy diệt, gây sát thương khổng lồ.',
        level: 2,
        skillType: 'damage',
        effects: ['instant_damage:2d6+3', 'stat_buff:strength:+2:self:3turns'],
        cooldown: 3,
        currentCooldown: 0,
        icon: '💀',
        requiresTarget: true
      },
      {
        id: 'damage_2_2',
        name: 'Đòn Tấn Công Bão Táp',
        description: 'Tấn công nhanh như bão táp, khó có thể né tránh.',
        level: 2,
        skillType: 'damage',
        effects: ['instant_damage:1d10+2', 'stat_buff:agility:+2:self:2turns'],
        cooldown: 2,
        currentCooldown: 0,
        icon: '🌪️',
        requiresTarget: true
      },
      {
        id: 'damage_2_3',
        name: 'Đòn Tấn Công Ma Thuật',
        description: 'Tấn công kết hợp sức mạnh vật lý và ma thuật.',
        level: 2,
        skillType: 'damage',
        effects: ['instant_damage:1d8+2', 'instant_damage:1d6:magical'],
        cooldown: 4,
        currentCooldown: 0,
        icon: '🔮',
        requiresTarget: true
      },

      // DAMAGE SKILLS - Level 3
      {
        id: 'damage_3_1',
        name: 'Đòn Tấn Công Tối Thượng',
        description: 'Tấn công với sức mạnh tối thượng, có thể hạ gục bất kỳ kẻ thù nào.',
        level: 3,
        skillType: 'damage',
        effects: ['instant_damage:3d6+4', 'stat_buff:strength:+3:self:4turns', 'stat_buff:critical:+10:self:2turns'],
        cooldown: 5,
        currentCooldown: 0,
        icon: '⚡',
        requiresTarget: true
      },
      {
        id: 'damage_3_2',
        name: 'Đòn Tấn Công Hỗn Loạn',
        description: 'Tấn công gây hỗn loạn, ảnh hưởng đến nhiều kẻ thù.',
        level: 3,
        skillType: 'damage',
        effects: ['instant_damage:2d8+3', 'instant_damage:1d6:area'],
        cooldown: 4,
        currentCooldown: 0,
        icon: '💥',
        requiresTarget: false
      },

      // HEALING SKILLS - Level 1
      {
        id: 'healing_1_1',
        name: 'Hồi Phục Cơ Bản',
        description: 'Hồi phục một lượng máu nhỏ.',
        level: 1,
        skillType: 'healing',
        effects: ['heal:1d6+2', 'stat_buff:constitution:+1:self:2turns'],
        cooldown: 2,
        currentCooldown: 0,
        icon: '💚',
        requiresTarget: false
      },
      {
        id: 'healing_1_2',
        name: 'Tăng Cường Sức Mạnh',
        description: 'Tăng cường sức mạnh tạm thời.',
        level: 1,
        skillType: 'healing',
        effects: ['heal:1d4+1', 'stat_buff:strength:+2:self:3turns', 'stat_buff:constitution:+1:self:3turns'],
        cooldown: 3,
        currentCooldown: 0,
        icon: '💪',
        requiresTarget: false
      },
      {
        id: 'healing_1_3',
        name: 'Bảo Vệ Tinh Thần',
        description: 'Tăng cường khả năng phòng thủ tinh thần.',
        level: 1,
        skillType: 'healing',
        effects: ['heal:1d4', 'heal:1d4', 'stat_buff:wisdom:+2:self:3turns'],
        cooldown: 2,
        currentCooldown: 0,
        icon: '🛡️',
        requiresTarget: false
      },

      // HEALING SKILLS - Level 2
      {
        id: 'healing_2_1',
        name: 'Hồi Phục Mạnh Mẽ',
        description: 'Hồi phục một lượng máu lớn và tăng cường sức khỏe.',
        level: 2,
        skillType: 'healing',
        effects: ['heal:2d6+3', 'stat_buff:constitution:+2:self:4turns'],
        cooldown: 3,
        currentCooldown: 0,
        icon: '💚',
        requiresTarget: false
      },
      {
        id: 'healing_2_2',
        name: 'Tăng Cường Toàn Diện',
        description: 'Tăng cường tất cả các chỉ số cơ bản.',
        level: 2,
        skillType: 'healing',
        effects: ['heal:1d8+2', 'stat_buff:all:+1:self:4turns'],
        cooldown: 4,
        currentCooldown: 0,
        icon: '🌟',
        requiresTarget: false
      },
      {
        id: 'healing_2_3',
        name: 'Giải Độc',
        description: 'Loại bỏ các hiệu ứng tiêu cực và hồi phục.',
        level: 2,
        skillType: 'healing',
        effects: ['heal:cure_all:instant', 'heal:1d6+1'],
        cooldown: 3,
        currentCooldown: 0,
        icon: '🧪',
        requiresTarget: false
      },

      // HEALING SKILLS - Level 3
      {
        id: 'healing_3_1',
        name: 'Hồi Phục Hoàn Toàn',
        description: 'Hồi phục hoàn toàn máu và tăng cường mạnh mẽ.',
        level: 3,
        skillType: 'healing',
        effects: ['heal:3d8+5', 'stat_buff:all:+2:self:5turns'],
        cooldown: 5,
        currentCooldown: 0,
        icon: '✨',
        requiresTarget: false
      },
      {
        id: 'healing_3_2',
        name: 'Tăng Cường Vĩnh Cửu',
        description: 'Tăng cường vĩnh viễn một số chỉ số.',
        level: 3,
        skillType: 'healing',
        effects: ['heal:2d6+3', 'stat_buff:strength:+1:permanent', 'stat_buff:constitution:+1:permanent'],
        cooldown: 6,
        currentCooldown: 0,
        icon: '🔮',
        requiresTarget: false
      },

      // SOCIAL SKILLS - Level 1
      {
        id: 'social_1_1',
        name: 'Thuyết Phục Cơ Bản',
        description: 'Tăng khả năng thuyết phục trong giao tiếp.',
        level: 1,
        skillType: 'social',
        effects: ['stat_buff:charisma:+2:self:3turns', 'stat_buff:wisdom:+1:self:3turns'],
        cooldown: 2,
        currentCooldown: 0,
        icon: '💬',
        requiresTarget: false
      },
      {
        id: 'social_1_2',
        name: 'Tăng Cường Trí Tuệ',
        description: 'Tăng cường trí tuệ và khả năng phân tích.',
        level: 1,
        skillType: 'social',
        effects: ['stat_buff:intelligence:+2:self:3turns', 'stat_buff:wisdom:+1:self:3turns'],
        cooldown: 2,
        currentCooldown: 0,
        icon: '🧠',
        requiresTarget: false
      },
      {
        id: 'social_1_3',
        name: 'Tăng Cường Sức Hút',
        description: 'Tăng sức hút cá nhân và khả năng lãnh đạo.',
        level: 1,
        skillType: 'social',
        effects: ['stat_buff:charisma:+3:self:4turns'],
        cooldown: 3,
        currentCooldown: 0,
        icon: '😊',
        requiresTarget: false
      },

      // SOCIAL SKILLS - Level 2
      {
        id: 'social_2_1',
        name: 'Thuyết Phục Nâng Cao',
        description: 'Thuyết phục mạnh mẽ, khó có thể từ chối.',
        level: 2,
        skillType: 'social',
        effects: ['stat_buff:charisma:+3:self:4turns', 'stat_buff:wisdom:+2:self:4turns'],
        cooldown: 3,
        currentCooldown: 0,
        icon: '🎭',
        requiresTarget: false
      },
      {
        id: 'social_2_2',
        name: 'Trí Tuệ Siêu Việt',
        description: 'Trí tuệ siêu việt, có thể giải quyết mọi vấn đề.',
        level: 2,
        skillType: 'social',
        effects: ['stat_buff:intelligence:+3:self:4turns', 'stat_buff:wisdom:+2:self:4turns'],
        cooldown: 3,
        currentCooldown: 0,
        icon: '🔮',
        requiresTarget: false
      },
      {
        id: 'social_2_3',
        name: 'Lãnh Đạo Thiên Bẩm',
        description: 'Khả năng lãnh đạo thiên bẩm, truyền cảm hứng cho người khác.',
        level: 2,
        skillType: 'social',
        effects: ['stat_buff:charisma:+4:self:5turns', 'stat_buff:all:+1:self:3turns'],
        cooldown: 4,
        currentCooldown: 0,
        icon: '👑',
        requiresTarget: false
      },

      // SOCIAL SKILLS - Level 3
      {
        id: 'social_3_1',
        name: 'Thuyết Phục Tối Thượng',
        description: 'Thuyết phục tối thượng, có thể thay đổi ý kiến của bất kỳ ai.',
        level: 3,
        skillType: 'social',
        effects: ['stat_buff:charisma:+4:self:5turns', 'stat_buff:wisdom:+3:self:5turns', 'stat_buff:intelligence:+2:self:5turns'],
        cooldown: 4,
        currentCooldown: 0,
        icon: '🎪',
        requiresTarget: false
      },
      {
        id: 'social_3_2',
        name: 'Trí Tuệ Bậc Thầy',
        description: 'Trí tuệ bậc thầy, hiểu biết sâu sắc về mọi thứ.',
        level: 3,
        skillType: 'social',
        effects: ['stat_buff:intelligence:+4:self:5turns', 'stat_buff:wisdom:+3:self:5turns', 'stat_buff:all:+1:self:4turns'],
        cooldown: 4,
        currentCooldown: 0,
        icon: '🧙',
        requiresTarget: false
      }
    ];
  }

  /**
   * Lấy skill templates theo type
   */
  public getSkillTemplatesByType(skillType: 'damage' | 'healing' | 'social'): CharacterSkill[] {
    return this.getSkillTemplates().filter(skill => skill.skillType === skillType);
  }

  /**
   * Lấy skill templates theo level
   */
  public getSkillTemplatesByLevel(level: 1 | 2 | 3): CharacterSkill[] {
    return this.getSkillTemplates().filter(skill => skill.level === level);
  }

  /**
   * Lấy skill templates theo type và level
   */
  public getSkillTemplatesByTypeAndLevel(skillType: 'damage' | 'healing' | 'social', level: 1 | 2 | 3): CharacterSkill[] {
    return this.getSkillTemplates().filter(skill => 
      skill.skillType === skillType && skill.level === level
    );
  }

  /**
   * Kiểm tra xem character có thể học skill từ skill book không
   */
  public canLearnFromSkillBook(character: Character, skillBook: SkillBook): boolean {
    if (!character.skills) {
      return true; // Character chưa có skills nào
    }

    const availableSkills = this.getSkillTemplatesByTypeAndLevel(skillBook.skillType, skillBook.skillLevel);
    
    // Kiểm tra xem còn skill nào chưa học không
    const learnedSkillIds = character.skills.map(s => s.id);
    const hasUnlearnedSkills = availableSkills.some(skill => !learnedSkillIds.includes(skill.id));
    
    return hasUnlearnedSkills;
  }

  /**
   * Lấy thông tin skill book
   */
  public getSkillBookInfo(skillBook: SkillBook): {
    skillTypeName: string;
    levelName: string;
    rarityName: string;
    description: string;
  } {
    const skillTypeNames = {
      damage: 'Tấn Công',
      healing: 'Hồi Phục',
      social: 'Xã Hội'
    };

    const levelNames = {
      1: 'Cơ Bản',
      2: 'Nâng Cao',
      3: 'Bậc Thầy'
    };

    const rarityNames = {
      common: 'Thường',
      uncommon: 'Hiếm',
      rare: 'Quý',
      epic: 'Huyền Thoại',
      legendary: 'Truyền Thuyết'
    };

    // Hỗ trợ cả format cũ và mới
    const skillType = skillBook.skillData?.skillType || skillBook.skillType || 'damage';
    const skillLevel = skillBook.skillData?.level || skillBook.skillLevel || 1;

    return {
      skillTypeName: skillTypeNames[skillType as keyof typeof skillTypeNames],
      levelName: levelNames[skillLevel as keyof typeof levelNames],
      rarityName: rarityNames[skillBook.rarity],
      description: `Học skill "${skillBook.skillData?.name || 'Kỹ năng'}" thuộc loại ${skillTypeNames[skillType as keyof typeof skillTypeNames]} với level ${skillLevel}.`
    };
  }
}

export const skillBookService = SkillBookService.getInstance();
