import { Character, SkillTreeSkill, SkillBonuses } from '../types';

class SkillTreeService {
  private static instance: SkillTreeService;

  private constructor() {}

  public static getInstance(): SkillTreeService {
    if (!SkillTreeService.instance) {
      SkillTreeService.instance = new SkillTreeService();
    }
    return SkillTreeService.instance;
  }

  // Skill definitions - hard-coded, giống nhau mọi game mới
  private readonly skillDefinitions: SkillTreeSkill[] = [
    // COMBAT SKILLS
    // Tier 1 (Base)
    {
      id: 'fortified_defense',
      name: 'Fortified Defense',
      description: 'Tăng khả năng phòng thủ cơ bản',
      tier: 1,
      category: 'combat',
      cost: 1,
      bonuses: { armorClass: 2 },
      icon: '🛡️'
    },
    {
      id: 'precise_strike',
      name: 'Precise Strike',
      description: 'Tăng độ chính xác tấn công',
      tier: 1,
      category: 'combat',
      cost: 1,
      bonuses: { attackBonus: 1 },
      icon: '🎯'
    },
    {
      id: 'power_attack',
      name: 'Power Attack',
      description: 'Tăng sát thương cơ bản',
      tier: 1,
      category: 'combat',
      cost: 1,
      bonuses: { damageBonus: '1d4' },
      icon: '⚔️'
    },
    {
      id: 'quick_reflexes',
      name: 'Quick Reflexes',
      description: 'Tăng tốc độ phản ứng trong chiến đấu',
      tier: 1,
      category: 'combat',
      cost: 1,
      bonuses: { initiative: 1 },
      icon: '⚡'
    },

    // Tier 2 (Intermediate)
    {
      id: 'advanced_defense',
      name: 'Advanced Defense',
      description: 'Phòng thủ nâng cao',
      tier: 2,
      category: 'combat',
      cost: 2,
      bonuses: { armorClass: 3 },
      icon: '🛡️'
    },
    {
      id: 'deadly_precision',
      name: 'Deadly Precision',
      description: 'Độ chính xác chết người',
      tier: 2,
      category: 'combat',
      cost: 2,
      bonuses: { attackBonus: 2 },
      icon: '🎯'
    },
    {
      id: 'crushing_blow',
      name: 'Crushing Blow',
      description: 'Đòn tấn công nghiền nát',
      tier: 2,
      category: 'combat',
      cost: 2,
      bonuses: { damageBonus: '1d6' },
      icon: '⚔️'
    },
    {
      id: 'combat_expertise',
      name: 'Combat Expertise',
      description: 'Chuyên môn chiến đấu',
      tier: 2,
      category: 'combat',
      cost: 2,
      bonuses: { initiative: 2 },
      icon: '⚡'
    },

    // Tier 3 (Advanced)
    {
      id: 'master_guardian',
      name: 'Master Guardian',
      description: 'Bậc thầy phòng thủ',
      tier: 3,
      category: 'combat',
      cost: 3,
      bonuses: { armorClass: 5 },
      icon: '🛡️'
    },
    {
      id: 'perfect_aim',
      name: 'Perfect Aim',
      description: 'Mục tiêu hoàn hảo',
      tier: 3,
      category: 'combat',
      cost: 3,
      bonuses: { attackBonus: 3 },
      icon: '🎯'
    },
    {
      id: 'devastating_strike',
      name: 'Devastating Strike',
      description: 'Đòn tấn công tàn phá',
      tier: 3,
      category: 'combat',
      cost: 3,
      bonuses: { damageBonus: '2d4' },
      icon: '⚔️'
    },
    {
      id: 'lightning_reflexes',
      name: 'Lightning Reflexes',
      description: 'Phản xạ sét',
      tier: 3,
      category: 'combat',
      cost: 3,
      bonuses: { initiative: 3 },
      icon: '⚡'
    },

    // Special Combat Skills
    {
      id: 'second_wind',
      name: 'Second Wind',
      description: 'Hồi phục 25% máu tối đa một lần mỗi trận',
      tier: 'special',
      category: 'combat',
      cost: 2,
      bonuses: { specialAbilities: ['second_wind'] },
      icon: '💨'
    },
    {
      id: 'counterattack',
      name: 'Counterattack',
      description: '20% cơ hội phản công khi bị đánh',
      tier: 'special',
      category: 'combat',
      cost: 2,
      bonuses: { specialAbilities: ['counterattack'] },
      icon: '🔄'
    },
    {
      id: 'critical_master',
      name: 'Critical Master',
      description: 'Tăng 10% cơ hội đánh trúng yếu điểm',
      tier: 'special',
      category: 'combat',
      cost: 2,
      bonuses: { criticalChance: 10 },
      icon: '💥'
    },

    // SOCIAL SKILLS
    // Tier 1 (Base)
    {
      id: 'natural_charm',
      name: 'Natural Charm',
      description: 'Sức hút tự nhiên',
      tier: 1,
      category: 'social',
      cost: 1,
      bonuses: { statBonuses: { charisma: 1 } },
      icon: '😊'
    },
    {
      id: 'quick_wit',
      name: 'Quick Wit',
      description: 'Trí tuệ nhanh nhạy',
      tier: 1,
      category: 'social',
      cost: 1,
      bonuses: { statBonuses: { intelligence: 1 } },
      icon: '🧠'
    },
    {
      id: 'strong_presence',
      name: 'Strong Presence',
      description: 'Sự hiện diện mạnh mẽ',
      tier: 1,
      category: 'social',
      cost: 1,
      bonuses: { statBonuses: { strength: 1 } },
      icon: '💪'
    },
    {
      id: 'nimble_mind',
      name: 'Nimble Mind',
      description: 'Tâm trí nhanh nhẹn',
      tier: 1,
      category: 'social',
      cost: 1,
      bonuses: { statBonuses: { agility: 1 } },
      icon: '🏃'
    },

    // Tier 2 (Intermediate)
    {
      id: 'enhanced_charm',
      name: 'Enhanced Charm',
      description: 'Sức hút nâng cao',
      tier: 2,
      category: 'social',
      cost: 2,
      bonuses: { statBonuses: { charisma: 2 } },
      icon: '😊'
    },
    {
      id: 'sharp_intellect',
      name: 'Sharp Intellect',
      description: 'Trí tuệ sắc bén',
      tier: 2,
      category: 'social',
      cost: 2,
      bonuses: { statBonuses: { intelligence: 2 } },
      icon: '🧠'
    },
    {
      id: 'iron_constitution',
      name: 'Iron Constitution',
      description: 'Thể chất sắt thép',
      tier: 2,
      category: 'social',
      cost: 2,
      bonuses: { statBonuses: { constitution: 2 } },
      icon: '🛡️'
    },
    {
      id: 'keen_perception',
      name: 'Keen Perception',
      description: 'Nhận thức sắc bén',
      tier: 2,
      category: 'social',
      cost: 2,
      bonuses: { statBonuses: { wisdom: 2 } },
      icon: '👁️'
    },

    // Tier 3 (Advanced)
    {
      id: 'master_diplomat',
      name: 'Master Diplomat',
      description: 'Bậc thầy ngoại giao',
      tier: 3,
      category: 'social',
      cost: 3,
      bonuses: { statBonuses: { charisma: 3 } },
      icon: '😊'
    },
    {
      id: 'genius_mind',
      name: 'Genius Mind',
      description: 'Tâm trí thiên tài',
      tier: 3,
      category: 'social',
      cost: 3,
      bonuses: { statBonuses: { intelligence: 3 } },
      icon: '🧠'
    },
    {
      id: 'unbreakable_will',
      name: 'Unbreakable Will',
      description: 'Ý chí không thể phá vỡ',
      tier: 3,
      category: 'social',
      prerequisites: ['keen_perception'],
      cost: 3,
      bonuses: { statBonuses: { wisdom: 3 } },
      icon: '👁️'
    },
    {
      id: 'peak_condition',
      name: 'Peak Condition',
      description: 'Thể trạng đỉnh cao',
      tier: 3,
      category: 'social',
      prerequisites: ['iron_constitution'],
      cost: 3,
      bonuses: { statBonuses: { constitution: 3 } },
      icon: '🛡️'
    },

    // Special Social Skills
    {
      id: 'silver_tongue',
      name: 'Silver Tongue',
      description: 'Giảm 10% giá mua, tăng 20% giá bán',
      tier: 'special',
      category: 'social',
      cost: 2,
      bonuses: { shopPriceModifier: -10, sellPriceModifier: 20 },
      icon: '💰'
    },
    {
      id: 'inspiring_leader',
      name: 'Inspiring Leader',
      description: 'Tăng 15% danh tiếng phe phái',
      tier: 'special',
      category: 'social',
      cost: 2,
      bonuses: { reputationGainModifier: 15 },
      icon: '👑'
    },
    {
      id: 'master_negotiator',
      name: 'Master Negotiator',
      description: 'Nhận phần thưởng nhiệm vụ tốt hơn',
      tier: 'special',
      category: 'social',
      cost: 2,
      bonuses: { specialAbilities: ['master_negotiator'] },
      icon: '🤝'
    },
    {
      id: 'natural_leader',
      name: 'Natural Leader',
      description: 'NPCs bắt đầu với +10 quan hệ',
      tier: 'special',
      category: 'social',
      cost: 2,
      bonuses: { relationshipGainModifier: 10 },
      icon: '👥'
    }
  ];

  /**
   * Lấy tất cả skill definitions
   */
  public getSkillDefinitions(): SkillTreeSkill[] {
    return this.skillDefinitions;
  }

  /**
   * Kiểm tra xem có thể học skill không
   */
  public canLearnSkill(character: Character, skillId: string): boolean {
    const skill = this.skillDefinitions.find(s => s.id === skillId);
    if (!skill) return false;

    // Kiểm tra skill points
    const availablePoints = character.skillPoints?.[skill.category] || 0;
    if (availablePoints < skill.cost) return false;

    // Bỏ qua kiểm tra prerequisites cho tier 2 và 3 - cho phép học bất cứ khi nào đủ điểm
    const learnedSkills = character.skillTree?.[skill.category]?.learned || [];
    if (skill.prerequisites && skill.tier !== 2 && skill.tier !== 3) {
      for (const prereq of skill.prerequisites) {
        if (!learnedSkills.includes(prereq)) return false;
      }
    }

    // Kiểm tra đã học chưa
    const isAlreadyLearned = learnedSkills.includes(skillId);
    if (isAlreadyLearned) return false;

    return true;
  }

  /**
   * Học skill
   */
  public learnSkill(character: Character, skillId: string): boolean {
    if (!this.canLearnSkill(character, skillId)) return false;

    const skill = this.skillDefinitions.find(s => s.id === skillId);
    if (!skill) return false;

    // Khởi tạo skill tree nếu chưa có
    if (!character.skillTree) {
      character.skillTree = {
        combat: { learned: [], available: [] },
        social: { learned: [], available: [] }
      };
    }

    // Khởi tạo skill points nếu chưa có
    if (!character.skillPoints) {
      character.skillPoints = { combat: 0, social: 0 };
    }

    // Trừ skill points
    character.skillPoints[skill.category] -= skill.cost;

    // Thêm vào learned skills
    character.skillTree[skill.category].learned.push(skillId);

    // Áp dụng skill bonuses trực tiếp vào coreStats
    this.applySkillBonusesToCharacter(character, skill);

    // Cập nhật available skills
    this.updateAvailableSkills(character);

    // Lưu vào localStorage
    localStorage.setItem('currentCharacter', JSON.stringify(character));

    return true;
  }

  /**
   * Áp dụng skill bonuses trực tiếp vào character coreStats
   */
  private applySkillBonusesToCharacter(character: Character, skill: SkillTreeSkill): void {
    if (!character.coreStats) return;

    const bonuses = skill.bonuses;

    // Áp dụng stat bonuses
    if (bonuses.statBonuses) {
      if (bonuses.statBonuses.strength) {
        character.coreStats.strength += bonuses.statBonuses.strength;
      }
      if (bonuses.statBonuses.agility) {
        character.coreStats.agility += bonuses.statBonuses.agility;
      }
      if (bonuses.statBonuses.intelligence) {
        character.coreStats.intelligence += bonuses.statBonuses.intelligence;
      }
      if (bonuses.statBonuses.constitution) {
        character.coreStats.constitution += bonuses.statBonuses.constitution;
      }
      if (bonuses.statBonuses.wisdom) {
        character.coreStats.wisdom += bonuses.statBonuses.wisdom;
      }
      if (bonuses.statBonuses.charisma) {
        character.coreStats.charisma += bonuses.statBonuses.charisma;
      }
    }

    // Áp dụng AC bonus
    if (bonuses.armorClass) {
      character.coreStats.armorClass = (character.coreStats.armorClass || 10) + bonuses.armorClass;
    }

    // Cập nhật HP nếu có constitution bonus
    if (bonuses.statBonuses?.constitution && character.health) {
      this.recalculateHPFromConstitution(character);
    }
  }

  /**
   * Tính lại HP dựa trên Constitution mới
   */
  private recalculateHPFromConstitution(character: Character): void {
    if (!character.health || !character.coreStats) return;

    // Lưu HP cũ để tính tỷ lệ
    const oldMaxHp = character.health.max;
    const hpRatio = oldMaxHp > 0 ? character.health.current / oldMaxHp : 1;
    
    // Tính base HP từ character creation formula
    const constitutionModifier = Math.floor((character.coreStats.constitution - 10) / 2);
    const baseHp = constitutionModifier + 20; // Công thức từ character creation
    
    // Tính các bonus HP từ combat level
    const combatLevel = character.combatLevel || 1;
    
    // HP bonus từ combat level (mỗi 3 combat levels = +7 HP)
    const combatHpBonus = Math.floor((combatLevel - 1) / 3) * 7;
    
    // Tính HP mới (chỉ base HP + combat bonus)
    const newMaxHp = baseHp + combatHpBonus;
    
    // Cập nhật HP mới
    character.health.max = newMaxHp;
    character.health.current = Math.floor(newMaxHp * hpRatio);
    
    // Đảm bảo HP không âm và không vượt quá max
    if (character.health.current < 1) {
      character.health.current = 1;
    }
    if (character.health.current > character.health.max) {
      character.health.current = character.health.max;
    }
  }

  /**
   * Hoàn lại skill bonuses từ character coreStats
   */
  private removeSkillBonusesFromCharacter(character: Character, skill: SkillTreeSkill): void {
    if (!character.coreStats) return;

    const bonuses = skill.bonuses;

    // Hoàn lại stat bonuses
    if (bonuses.statBonuses) {
      if (bonuses.statBonuses.strength) {
        character.coreStats.strength -= bonuses.statBonuses.strength;
      }
      if (bonuses.statBonuses.agility) {
        character.coreStats.agility -= bonuses.statBonuses.agility;
      }
      if (bonuses.statBonuses.intelligence) {
        character.coreStats.intelligence -= bonuses.statBonuses.intelligence;
      }
      if (bonuses.statBonuses.constitution) {
        character.coreStats.constitution -= bonuses.statBonuses.constitution;
      }
      if (bonuses.statBonuses.wisdom) {
        character.coreStats.wisdom -= bonuses.statBonuses.wisdom;
      }
      if (bonuses.statBonuses.charisma) {
        character.coreStats.charisma -= bonuses.statBonuses.charisma;
      }
    }

    // Hoàn lại AC bonus
    if (bonuses.armorClass) {
      character.coreStats.armorClass = (character.coreStats.armorClass || 10) - bonuses.armorClass;
    }

    // Hoàn lại HP nếu có constitution bonus
    if (bonuses.statBonuses?.constitution && character.health) {
      this.recalculateHPFromConstitution(character);
    }
  }

  /**
   * Reset skill tree (tốn tiền)
   */
  public resetSkillTree(character: Character, cost: number): boolean {
    if (!character.skillTree || !character.currency) return false;
    if (character.currency < cost) return false;

    // Trừ tiền
    character.currency -= cost;

    // Hoàn lại skill points
    if (!character.skillPoints) {
      character.skillPoints = { combat: 0, social: 0 };
    }

    // Tính lại skill points dựa trên levels
    const calculatedPoints = this.calculateSkillPointsFromLevels(character);
    character.skillPoints = calculatedPoints;

    // Lưu lại learned skills trước khi reset
    const learnedSkills = [
      ...character.skillTree.combat.learned,
      ...character.skillTree.social.learned
    ];

    // Hoàn lại tất cả skill bonuses
    for (const skillId of learnedSkills) {
      const skill = this.skillDefinitions.find(s => s.id === skillId);
      if (skill) {
        this.removeSkillBonusesFromCharacter(character, skill);
      }
    }

    // Reset skill tree
    character.skillTree = {
      combat: { learned: [], available: [] },
      social: { learned: [], available: [] }
    };

    // Cập nhật available skills
    this.updateAvailableSkills(character);

    // Lưu vào localStorage
    localStorage.setItem('currentCharacter', JSON.stringify(character));

    return true;
  }

  /**
   * Lấy tất cả bonuses đang active
   */
  public getActiveBonuses(character: Character): SkillBonuses {
    if (!character.skillTree) {
      return {};
    }

    const allBonuses: SkillBonuses = {
      armorClass: 0,
      attackBonus: 0,
      damageBonus: '',
      initiative: 0,
      criticalChance: 0,
      shopPriceModifier: 0,
      sellPriceModifier: 0,
      reputationGainModifier: 0,
      relationshipGainModifier: 0,
      specialAbilities: []
    };

    // Tổng hợp bonuses từ tất cả learned skills
    const allLearnedSkills = [
      ...character.skillTree.combat.learned,
      ...character.skillTree.social.learned
    ];

    for (const skillId of allLearnedSkills) {
      const skill = this.skillDefinitions.find(s => s.id === skillId);
      if (!skill) continue;

      const bonuses = skill.bonuses;
      
      // Combat bonuses (không bao gồm stat bonuses vì đã áp dụng trực tiếp)
      if (bonuses.attackBonus) allBonuses.attackBonus! += bonuses.attackBonus;
      if (bonuses.damageBonus) {
        if (allBonuses.damageBonus) {
          allBonuses.damageBonus += ' + ' + bonuses.damageBonus;
        } else {
          allBonuses.damageBonus = '+' + bonuses.damageBonus;
        }
      }
      if (bonuses.initiative) allBonuses.initiative! += bonuses.initiative;
      if (bonuses.criticalChance) allBonuses.criticalChance! += bonuses.criticalChance;

      // Special bonuses
      if (bonuses.shopPriceModifier) allBonuses.shopPriceModifier! += bonuses.shopPriceModifier;
      if (bonuses.sellPriceModifier) allBonuses.sellPriceModifier! += bonuses.sellPriceModifier;
      if (bonuses.reputationGainModifier) allBonuses.reputationGainModifier! += bonuses.reputationGainModifier;
      if (bonuses.relationshipGainModifier) allBonuses.relationshipGainModifier! += bonuses.relationshipGainModifier;

      // Special abilities
      if (bonuses.specialAbilities) {
        allBonuses.specialAbilities!.push(...bonuses.specialAbilities);
      }
    }

    return allBonuses;
  }

  /**
   * Tính skill points dựa trên levels
   */
  public calculateSkillPointsFromLevels(character: Character): { combat: number; social: number } {
    const combatLevel = character.combatLevel || 1;
    const characterLevel = character.level || 1;

    // Mỗi 1 combat level = 1 combat skill point
    const combatPoints = combatLevel - 1;
    
    // Mỗi 1 character level = 1 social skill point
    const socialPoints = characterLevel - 1;

    return { combat: combatPoints, social: socialPoints };
  }

  /**
   * Cập nhật available skills dựa trên prerequisites
   */
  private updateAvailableSkills(character: Character): void {
    if (!character.skillTree) return;

    const combatAvailable: string[] = [];
    const socialAvailable: string[] = [];

    for (const skill of this.skillDefinitions) {
      // Bỏ qua nếu đã học
      if (character.skillTree[skill.category].learned.includes(skill.id)) continue;

      // Bỏ qua kiểm tra prerequisites cho tier 2 và 3 - luôn cho phép
      let canLearn = true;
      if (skill.prerequisites && skill.tier !== 2 && skill.tier !== 3) {
        const learnedSkills = character.skillTree[skill.category].learned;
        for (const prereq of skill.prerequisites) {
          if (!learnedSkills.includes(prereq)) {
            canLearn = false;
            break;
          }
        }
      }

      if (canLearn) {
        if (skill.category === 'combat') {
          combatAvailable.push(skill.id);
        } else {
          socialAvailable.push(skill.id);
        }
      }
    }

    character.skillTree.combat.available = combatAvailable;
    character.skillTree.social.available = socialAvailable;
  }

  /**
   * Khởi tạo skill tree cho character mới
   */
  public initializeCharacter(character: Character): void {
    // Khởi tạo skill points
    character.skillPoints = this.calculateSkillPointsFromLevels(character);

    // Khởi tạo skill tree
    character.skillTree = {
      combat: { learned: [], available: [] },
      social: { learned: [], available: [] }
    };

    // Cập nhật available skills
    this.updateAvailableSkills(character);
  }

  /**
   * Tính HP ban đầu cho character mới (sử dụng công thức từ character creation)
   */
  public calculateInitialHP(character: Character): number {
    if (!character.coreStats) return 20;
    
    // Công thức từ character creation: CON modifier + 20
    const constitutionModifier = Math.floor((character.coreStats.constitution - 10) / 2);
    return constitutionModifier + 20;
  }

  /**
   * Recalculate skill points for existing saves that were created with old formula
   * This adds missing skill points without resetting already learned skills
   */
  public recalculateSkillPointsForExistingSave(character: Character): { 
    combatPointsAdded: number; 
    socialPointsAdded: number;
  } {
    // Calculate what points SHOULD be with new formula
    const expectedPoints = this.calculateSkillPointsFromLevels(character);
    
    // Get current points
    const currentPoints = character.skillPoints || { combat: 0, social: 0 };
    
    // Add missing points (không reset skills đã học)
    const combatPointsAdded = Math.max(0, expectedPoints.combat - currentPoints.combat);
    const socialPointsAdded = Math.max(0, expectedPoints.social - currentPoints.social);
    
    // Update character skill points
    character.skillPoints = {
      combat: currentPoints.combat + combatPointsAdded,
      social: currentPoints.social + socialPointsAdded
    };
    
    // Save to localStorage
    localStorage.setItem('currentCharacter', JSON.stringify(character));
    
    return { combatPointsAdded, socialPointsAdded };
  }
}

export const skillTreeService = SkillTreeService.getInstance();
