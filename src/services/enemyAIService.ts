import { Combatant } from './combatService';
import { CombatAction, AIBehavior } from '../types/combat';

export class EnemyAIService {
  private static instance: EnemyAIService;

  public static getInstance(): EnemyAIService {
    if (!EnemyAIService.instance) {
      EnemyAIService.instance = new EnemyAIService();
    }
    return EnemyAIService.instance;
  }

  /**
   * Quyết định hành động cho enemy dựa trên difficulty
   */
  public decideAction(
    enemy: Combatant,
    allCombatants: Combatant[],
    difficulty: 'easy' | 'medium' | 'hard',
    worldDifficulty?: string
  ): CombatAction {
    // Map world difficulty to AI difficulty if not specified
    const aiDifficulty = this.mapWorldDifficultyToAI(difficulty, worldDifficulty);
    
    // Check if enemy should use skill first
    const skillAction = this.decideSkillUsage(enemy, allCombatants, aiDifficulty);
    if (skillAction) {
      return skillAction;
    }
    
    // Otherwise, decide main action (attack or defend)
    switch (aiDifficulty) {
      case 'easy':
        return this.easyAI(enemy, allCombatants);
      case 'medium':
        return this.mediumAI(enemy, allCombatants);
      case 'hard':
        return this.hardAI(enemy, allCombatants);
      default:
        return this.easyAI(enemy, allCombatants);
    }
  }

  /**
   * Decide if enemy should use a skill
   */
  public decideSkillUsage(
    enemy: Combatant,
    allCombatants: Combatant[],
    difficulty: 'easy' | 'medium' | 'hard'
  ): CombatAction | null {
    if (!enemy.skills || enemy.skills.length === 0) {
      return null;
    }

    // Get available skills (not on cooldown)
    const availableSkills = enemy.skills.filter(skill => skill.currentCooldown === 0);
    if (availableSkills.length === 0) {
      return null;
    }

    // Skill usage probability based on difficulty
    const skillProbabilities = {
      easy: 0.2,    // 20% chance
      medium: 0.4,  // 40% chance
      hard: 0.6     // 60% chance
    };

    const skillChance = skillProbabilities[difficulty];
    if (Math.random() > skillChance) {
      return null;
    }

    // Choose best skill for situation
    const bestSkill = this.chooseBestSkill(enemy, allCombatants, availableSkills, difficulty);
    if (!bestSkill) {
      return null;
    }

    // Determine target(s)
    const targets = this.chooseSkillTargets(enemy, allCombatants, bestSkill, difficulty);
    if (targets.length === 0) {
      return null;
    }

    return {
      type: 'skill',
      skillId: bestSkill.id,
      targetIds: targets,
      description: `${enemy.name} sử dụng ${bestSkill.name}${targets.length > 1 ? ' (AoE)' : ''}`,
      priority: 5 // High priority for skills
    };
  }

  /**
   * Choose the best skill for the current situation
   */
  private chooseBestSkill(
    enemy: Combatant,
    allCombatants: Combatant[],
    availableSkills: any[],
    _difficulty: 'easy' | 'medium' | 'hard'
  ): any | null {
    const player = allCombatants.find(c => c.id === 'player' && c.isAlive);
    if (!player) return null;

    const enemyHPPercent = enemy.health.current / enemy.health.max;
    const playerHPPercent = player.health.current / player.health.max;

    // Prioritize skills based on situation
    const skillPriorities = availableSkills.map(skill => {
      let priority = 0;
      
      // Healing skills when low HP
      if (skill.skillType === 'healing' && enemyHPPercent < 0.5) {
        priority += 50;
      }
      
      // Damage skills when player is low HP
      if (skill.skillType === 'damage' && playerHPPercent < 0.3) {
        priority += 40;
      }
      
      // Buff skills when not buffed
      if (skill.skillType === 'healing' && !this.hasRecentBuff(enemy)) {
        priority += 30;
      }
      
      // Debuff skills when player is strong
      if (skill.skillType === 'damage' && playerHPPercent > 0.7) {
        priority += 20;
      }
      
      // Random factor for variety
      priority += Math.random() * 20;
      
      return { skill, priority };
    });

    // Sort by priority and return best skill
    skillPriorities.sort((a, b) => b.priority - a.priority);
    return skillPriorities[0]?.skill || null;
  }

  /**
   * Choose targets for skill
   */
  private chooseSkillTargets(
    enemy: Combatant,
    allCombatants: Combatant[],
    skill: any,
    difficulty: 'easy' | 'medium' | 'hard'
  ): string[] {
    const targets: string[] = [];
    
    if (!skill.requiresTarget) {
      // Self-targeting skill
      return [enemy.id];
    }

    // Find valid targets
    const validTargets = allCombatants.filter(c => 
      c.isAlive && c.id !== enemy.id && c.type === 'player'
    );

    if (validTargets.length === 0) {
      return [];
    }

    // Choose target based on difficulty
    switch (difficulty) {
      case 'easy':
        // Random target
        const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
        targets.push(randomTarget.id);
        break;
        
      case 'medium':
        // Target weakest player
        const weakestTarget = validTargets.reduce((weakest, current) => 
          current.health.current < weakest.health.current ? current : weakest
        );
        targets.push(weakestTarget.id);
        break;
        
      case 'hard':
        // Target weakest player, or all players for AoE skills
        if (skill.effects.some((e: string) => e.includes('AoE'))) {
          targets.push(...validTargets.map(t => t.id));
        } else {
          const weakestTarget = validTargets.reduce((weakest, current) => 
            current.health.current < weakest.health.current ? current : weakest
          );
          targets.push(weakestTarget.id);
        }
        break;
    }

    return targets;
  }

  /**
   * Check if enemy has recent buff
   */
  private hasRecentBuff(enemy: Combatant): boolean {
    return enemy.statusEffects.some(effect => 
      effect.name.includes('buff') || effect.name.includes('tăng') || effect.name.includes('+')
    );
  }

  /**
   * Map world difficulty to AI difficulty
   */
  private mapWorldDifficultyToAI(
    combatDifficulty: 'easy' | 'medium' | 'hard',
    worldDifficulty?: string
  ): 'easy' | 'medium' | 'hard' {
    if (!worldDifficulty) return combatDifficulty;
    
    const worldDiff = worldDifficulty.toLowerCase();
    
    // Override based on world difficulty
    if (worldDiff.includes('dễ') || worldDiff.includes('easy')) {
      return 'easy';
    } else if (worldDiff.includes('khó') || worldDiff.includes('hard')) {
      return 'hard';
    }
    
    return combatDifficulty;
  }

  /**
   * Quyết định sử dụng consumable dựa trên AI difficulty
   */
  public decideConsumableUsage(
    enemy: Combatant,
    allCombatants: Combatant[],
    aiDifficulty: 'easy' | 'medium' | 'hard'
  ): CombatAction | null {
    // Check if enemy has inventory and consumables
    if (!enemy.inventory || enemy.inventory.length === 0) {
      return null;
    }

    const consumables = enemy.inventory.filter(item => item.type === 'consumable' && item.quantity > 0);
    if (consumables.length === 0) {
      return null;
    }

    const alivePlayers = allCombatants.filter(c => c.type === 'player' && c.isAlive);
    const aliveAllies = allCombatants.filter(c => c.type === 'ally' && c.isAlive);
    const aliveTargets = [...alivePlayers, ...aliveAllies];
    
    if (aliveTargets.length === 0) {
      return null;
    }

    // Calculate HP percentage
    const hpPercentage = (enemy.health.current / enemy.health.max) * 100;

    switch (aiDifficulty) {
      case 'easy':
        return this.easyConsumableAI(enemy, consumables, aliveTargets, hpPercentage);
      case 'medium':
        return this.mediumConsumableAI(enemy, consumables, aliveTargets, hpPercentage);
      case 'hard':
        return this.hardConsumableAI(enemy, consumables, aliveTargets, hpPercentage);
      default:
        return null;
    }
  }

  /**
   * Easy AI Consumable Logic - Chỉ dùng healing khi HP thấp
   */
  private easyConsumableAI(
    enemy: Combatant,
    consumables: any[],
    _aliveTargets: Combatant[],
    hpPercentage: number
  ): CombatAction | null {
    // Only use healing when HP < 30%
    if (hpPercentage < 30) {
      const healingItem = consumables.find(item => 
        item.stats?.effect?.startsWith('heal_') || 
        item.name.toLowerCase().includes('heal') ||
        item.name.toLowerCase().includes('potion')
      );
      
      if (healingItem) {
        return {
          type: 'use_item',
          targetId: enemy.id,
          itemId: healingItem.id,
          description: `${enemy.name} sử dụng ${healingItem.name} để hồi máu`,
          priority: 2
        };
      }
    }
    
    return null;
  }

  /**
   * Medium AI Consumable Logic - Dùng healing và buff cơ bản
   */
  private mediumConsumableAI(
    enemy: Combatant,
    consumables: any[],
    _aliveTargets: Combatant[],
    hpPercentage: number
  ): CombatAction | null {
    // Use healing when HP < 50%
    if (hpPercentage < 50) {
      const healingItem = consumables.find(item => 
        item.stats?.effect?.startsWith('heal_') || 
        item.name.toLowerCase().includes('heal') ||
        item.name.toLowerCase().includes('potion')
      );
      
      if (healingItem) {
        return {
          type: 'use_item',
          targetId: enemy.id,
          itemId: healingItem.id,
          description: `${enemy.name} sử dụng ${healingItem.name} để hồi máu`,
          priority: 2
        };
      }
    }

    // Use damage buff if available and HP > 50%
    if (hpPercentage > 50 && Math.random() < 0.3) {
      const buffItem = consumables.find(item => 
        item.stats?.effect?.startsWith('damage_buff_') ||
        item.name.toLowerCase().includes('strength') ||
        item.name.toLowerCase().includes('berserker')
      );
      
      if (buffItem) {
        return {
          type: 'use_item',
          targetId: enemy.id,
          itemId: buffItem.id,
          description: `${enemy.name} sử dụng ${buffItem.name} để tăng sức mạnh`,
          priority: 1
        };
      }
    }
    
    return null;
  }

  /**
   * Hard AI Consumable Logic - Chiến thuật thông minh
   */
  private hardConsumableAI(
    enemy: Combatant,
    consumables: any[],
    aliveTargets: Combatant[],
    hpPercentage: number
  ): CombatAction | null {
    // Use healing when HP < 60%
    if (hpPercentage < 60) {
      const healingItem = consumables.find(item => 
        item.stats?.effect?.startsWith('heal_') || 
        item.name.toLowerCase().includes('heal') ||
        item.name.toLowerCase().includes('potion')
      );
      
      if (healingItem) {
        return {
          type: 'use_item',
          targetId: enemy.id,
          itemId: healingItem.id,
          description: `${enemy.name} sử dụng ${healingItem.name} để hồi máu`,
          priority: 2
        };
      }
    }

    // Use damage buff if available and HP > 60%
    if (hpPercentage > 60 && Math.random() < 0.4) {
      const buffItem = consumables.find(item => 
        item.stats?.effect?.startsWith('damage_buff_') ||
        item.name.toLowerCase().includes('strength') ||
        item.name.toLowerCase().includes('berserker')
      );
      
      if (buffItem) {
        return {
          type: 'use_item',
          targetId: enemy.id,
          itemId: buffItem.id,
          description: `${enemy.name} sử dụng ${buffItem.name} để tăng sức mạnh`,
          priority: 1
        };
      }
    }

    // Use AC buff if available and HP > 70%
    if (hpPercentage > 70 && Math.random() < 0.3) {
      const acBuffItem = consumables.find(item => 
        item.stats?.effect?.startsWith('ac_buff_') ||
        item.name.toLowerCase().includes('shield') ||
        item.name.toLowerCase().includes('stone')
      );
      
      if (acBuffItem) {
        return {
          type: 'use_item',
          targetId: enemy.id,
          itemId: acBuffItem.id,
          description: `${enemy.name} sử dụng ${acBuffItem.name} để tăng phòng thủ`,
          priority: 1
        };
      }
    }

    // Use debuff on player if available
    if (Math.random() < 0.2) {
      const debuffItem = consumables.find(item => 
        item.stats?.effect?.startsWith('poison_') ||
        item.stats?.effect?.startsWith('weakness_') ||
        item.stats?.effect?.startsWith('slow_') ||
        item.name.toLowerCase().includes('poison') ||
        item.name.toLowerCase().includes('bomb')
      );
      
      if (debuffItem) {
        const target = this.selectRandomTarget(aliveTargets);
        return {
          type: 'use_item',
          targetId: target.id,
          itemId: debuffItem.id,
          description: `${enemy.name} sử dụng ${debuffItem.name} để làm yếu ${target.name}`,
          priority: 1
        };
      }
    }
    
    return null;
  }

  /**
   * Easy AI - Random và đơn giản
   */
  private easyAI(enemy: Combatant, allCombatants: Combatant[]): CombatAction {
    const alivePlayers = allCombatants.filter(c => c.type === 'player' && c.isAlive);
    const aliveAllies = allCombatants.filter(c => c.type === 'ally' && c.isAlive);
    const aliveTargets = [...alivePlayers, ...aliveAllies];
    
    if (aliveTargets.length === 0) {
      return this.createDefendAction();
    }

    // 80% chance to attack, 20% to defend
    if (Math.random() < 0.8) {
      const target = this.selectRandomTarget(aliveTargets);
      const attackIndex = this.selectRandomAttack(enemy);
      
      return {
        type: 'attack',
        targetId: target.id,
        attackIndex,
        description: `${enemy.name} tấn công ${target.name} một cách đơn giản`,
        priority: 1
      };
    } else {
      return this.createDefendAction();
    }
  }

  /**
   * Medium AI - Có tính toán cơ bản
   */
  private mediumAI(enemy: Combatant, allCombatants: Combatant[]): CombatAction {
    const alivePlayers = allCombatants.filter(c => c.type === 'player' && c.isAlive);
    const aliveAllies = allCombatants.filter(c => c.type === 'ally' && c.isAlive);
    const aliveTargets = [...alivePlayers, ...aliveAllies];
    
    if (aliveTargets.length === 0) {
      return this.createDefendAction();
    }

    // Check if should use healing item
    if (enemy.health.current / enemy.health.max < 0.3 && this.hasHealingItem(enemy)) {
      return this.createHealAction(enemy);
    }

    // 90% chance to attack, 10% to defend
    if (Math.random() < 0.9) {
      const target = this.selectOptimalTarget(enemy, aliveTargets);
      const attackIndex = this.selectBestAttack(enemy, target);
      
      return {
        type: 'attack',
        targetId: target.id,
        attackIndex,
        description: `${enemy.name} tấn công ${target.name} một cách thông minh`,
        priority: 2
      };
    } else {
      return this.createDefendAction();
    }
  }

  /**
   * Hard AI - Tính toán tối ưu và tactics
   */
  private hardAI(enemy: Combatant, allCombatants: Combatant[]): CombatAction {
    const alivePlayers = allCombatants.filter(c => c.type === 'player' && c.isAlive);
    const aliveAllies = allCombatants.filter(c => c.type === 'ally' && c.isAlive);
    const aliveEnemies = allCombatants.filter(c => c.type === 'enemy' && c.isAlive && c.id !== enemy.id);
    
    // Enemies tấn công cả player và allies
    const aliveTargets = [...alivePlayers, ...aliveAllies];
    
    if (aliveTargets.length === 0) {
      return this.createDefendAction();
    }

    // NEW: Enemy Coordination for multiple enemies (hard difficulty only)
    if (aliveEnemies.length > 0) {
            const coordinationAction = this.decideCoordinatedAction(enemy, aliveEnemies, aliveTargets);
      if (coordinationAction) {
        return coordinationAction;
      }
    }

    // Check if should use healing item (more aggressive healing)
    if (enemy.health.current / enemy.health.max < 0.5 && this.hasHealingItem(enemy)) {
      return this.createHealAction(enemy);
    }

    // Check if should use special ability
    if (enemy.abilities && enemy.abilities.length > 0 && Math.random() < 0.3) {
      const ability = this.selectBestAbility(enemy, aliveTargets);
      if (ability) {
        return {
          type: 'ability',
          abilityId: ability.id,
          targetId: ability.targetId,
          description: `${enemy.name} sử dụng ${ability.name} một cách chiến thuật`,
          priority: 4
        };
      }
    }

    // Focus fire on weakest target
    const target = this.selectWeakestTarget(enemy, aliveTargets);
    const attackIndex = this.selectBestAttack(enemy, target);
    
    return {
      type: 'attack',
      targetId: target.id,
      attackIndex,
      description: `${enemy.name} tập trung tấn công ${target.name} với chiến thuật`,
      priority: 3
    };
  }

  /**
   * Select random target
   */
  private selectRandomTarget(targets: Combatant[]): Combatant {
    return targets[Math.floor(Math.random() * targets.length)];
  }

  /**
   * Select optimal target based on HP and AC
   */
  private selectOptimalTarget(enemy: Combatant, targets: Combatant[]): Combatant {
    // Prioritize targets with lower HP and lower AC
    return targets.reduce((best, current) => {
      const bestScore = this.calculateTargetScore(enemy, best);
      const currentScore = this.calculateTargetScore(enemy, current);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Select weakest target (lowest HP percentage)
   */
  private selectWeakestTarget(_enemy: Combatant, targets: Combatant[]): Combatant {
    return targets.reduce((weakest, current) => {
      const weakestHpPercent = weakest.health.current / weakest.health.max;
      const currentHpPercent = current.health.current / current.health.max;
      return currentHpPercent < weakestHpPercent ? current : weakest;
    });
  }

  /**
   * Calculate target score for AI decision
   */
  private calculateTargetScore(_enemy: Combatant, target: Combatant): number {
    const hpPercent = target.health.current / target.health.max;
    const acScore = 20 - target.armorClass; // Lower AC = higher score
    const hpScore = (1 - hpPercent) * 10; // Lower HP = higher score
    
    return acScore + hpScore;
  }

  /**
   * Select random attack
   */
  private selectRandomAttack(enemy: Combatant): number {
    if (enemy.attacks.length === 0) return 0;
    return Math.floor(Math.random() * enemy.attacks.length);
  }

  /**
   * Select best attack based on target
   */
  private selectBestAttack(enemy: Combatant, _target: Combatant): number {
    if (enemy.attacks.length === 0) return 0;
    
    // For now, just return the first attack
    // In the future, could calculate based on damage vs AC
    return 0;
  }

  /**
   * Select best ability to use
   */
  private selectBestAbility(enemy: Combatant, targets: Combatant[]): any {
    if (!enemy.abilities || enemy.abilities.length === 0) return null;
    
    // For now, return first ability
    // In the future, could calculate based on situation
    return {
      id: enemy.abilities[0].id || 'ability_1',
      name: enemy.abilities[0].name || 'Special Ability',
      targetId: targets[0].id
    };
  }

  /**
   * Check if enemy has healing item
   */
  private hasHealingItem(_enemy: Combatant): boolean {
    // This would need to be implemented based on how items are stored
    // For now, return false
    return false;
  }

  /**
   * Create defend action
   */
  private createDefendAction(): CombatAction {
    return {
      type: 'defend',
      description: 'Phòng thủ',
      priority: 1
    };
  }

  /**
   * Create heal action
   */
  private createHealAction(enemy: Combatant): CombatAction {
    return {
      type: 'use_item',
      itemId: 'healing_potion',
      description: `${enemy.name} sử dụng thuốc hồi máu`,
      priority: 3
    };
  }

  /**
   * Get AI behavior configuration
   */
  public getAIBehavior(difficulty: 'easy' | 'medium' | 'hard'): AIBehavior {
    const behaviors: { [key: string]: AIBehavior } = {
      easy: {
        difficulty: 'easy',
        aggression: 0.8,
        intelligence: 0.2,
        tactics: 0.1,
        itemUsage: 0.1
      },
      medium: {
        difficulty: 'medium',
        aggression: 0.7,
        intelligence: 0.5,
        tactics: 0.3,
        itemUsage: 0.4
      },
      hard: {
        difficulty: 'hard',
        aggression: 0.6,
        intelligence: 0.8,
        tactics: 0.7,
        itemUsage: 0.6
      }
    };

    return behaviors[difficulty];
  }

  /**
   * Check if enemy should use AI service for complex decisions
   */
  public shouldUseAIService(enemy: Combatant, difficulty: 'easy' | 'medium' | 'hard'): boolean {
    // Use AI service for hard difficulty and high-level enemies
    return difficulty === 'hard' && (enemy.combatLevel || 1) >= 5;
  }

  /**
   * Decide action for ally (always uses hard AI targeting enemies)
   */
  public decideAllyAction(
    ally: Combatant,
    allCombatants: Combatant[],
    _difficulty: 'easy' | 'medium' | 'hard',
    _worldDifficulty?: string
  ): CombatAction {
    // Allies chỉ tấn công enemies, bảo vệ player và allies khác
    const aliveEnemies = allCombatants.filter(c => c.type === 'enemy' && c.isAlive);
    
    if (aliveEnemies.length === 0) {
      return this.createDefendAction();
    }
    
    // Logic tấn công enemies cho allies
    const hpPercentage = (ally.health.current / ally.health.max) * 100;
    
    // Nếu HP thấp (< 30%), ưu tiên heal hoặc defend
    if (hpPercentage < 30) {
      // Tìm healing item
      if (ally.inventory) {
        const healingItem = ally.inventory.find(item => 
          item.name.toLowerCase().includes('potion') ||
          item.name.toLowerCase().includes('heal') ||
          item.name.toLowerCase().includes('health')
        );
        
        if (healingItem) {
          return {
            type: 'use_item',
            targetId: ally.id, // Heal chính mình
            itemId: healingItem.id,
            description: `${ally.name} sử dụng ${healingItem.name} để hồi máu`,
            priority: 2
          };
        }
      }
      
      // Nếu không có healing item, defend
      if (Math.random() < 0.7) {
        return this.createDefendAction();
      }
    }
    
    // Chọn enemy target (ưu tiên enemy có HP thấp nhất)
    const targetEnemy = aliveEnemies.reduce((weakest, enemy) => 
      (enemy.health.current / enemy.health.max) < (weakest.health.current / weakest.health.max) 
        ? enemy : weakest
    );
    
    // Chọn attack tốt nhất (dựa trên attack bonus)
    if (ally.attacks && ally.attacks.length > 0) {
      const bestAttack = ally.attacks.reduce((best, attack) => 
        attack.attackBonus > best.attackBonus ? attack : best
      );
      
      return {
        type: 'attack',
        targetId: targetEnemy.id,
        attackIndex: ally.attacks.indexOf(bestAttack),
        description: `${ally.name} tấn công ${targetEnemy.name} với ${bestAttack.name}`,
        priority: 1
      };
    }
    
    // Fallback: defend nếu không có attack
    return this.createDefendAction();
  }

  /**
   * Generate AI decision using Gemini API (for complex enemies)
   */
  public async generateAICombatDecision(
    enemy: Combatant,
    allCombatants: Combatant[],
    combatContext: any
  ): Promise<CombatAction> {
    try {
      const { geminiService } = await import('./geminiService');
      
      const prompt = this.buildAIPrompt(enemy, allCombatants, combatContext);
      const response = await geminiService.generateContent(prompt);
      
      if (response) {
        return this.parseAIResponse(response, enemy);
      }
    } catch (error) {
      console.error('Error generating AI combat decision:', error);
    }
    
    // Fallback to hard AI
    return this.hardAI(enemy, allCombatants);
  }

  /**
   * Build AI prompt for combat decision
   */
  private buildAIPrompt(enemy: Combatant, allCombatants: Combatant[], context: any): string {
    const alivePlayers = allCombatants.filter(c => c.type === 'player' && c.isAlive);
    const aliveAllies = allCombatants.filter(c => c.type === 'ally' && c.isAlive);
    const aliveEnemies = allCombatants.filter(c => c.type === 'enemy' && c.isAlive);
    
    return `Bạn là AI điều khiển ${enemy.name} trong combat turn-based.

THÔNG TIN ENEMY:
- Tên: ${enemy.name}
- HP: ${enemy.health.current}/${enemy.health.max}
- AC: ${enemy.armorClass}
- Attacks: ${enemy.attacks.map(a => `${a.name} (+${a.attackBonus}, ${a.damage})`).join(', ')}
- Abilities: ${enemy.abilities?.map(a => a.name).join(', ') || 'Không có'}

MỤC TIÊU CÓ THỂ TẤN CÔNG:
${alivePlayers.map(p => `- ${p.name} (Player): HP ${p.health.current}/${p.health.max}, AC ${p.armorClass}`).join('\n')}
${aliveAllies.map(a => `- ${a.name} (Ally): HP ${a.health.current}/${a.health.max}, AC ${a.armorClass}`).join('\n')}

ĐỒNG MINH ENEMY:
${aliveEnemies.map(e => `- ${e.name}: HP ${e.health.current}/${e.health.max}`).join('\n')}

CONTEXT: ${JSON.stringify(context)}

Hãy quyết định hành động tối ưu cho ${enemy.name}. Trả về JSON:
{
  "action": "attack|defend|use_item|ability",
  "targetId": "id_of_target",
  "attackIndex": 0,
  "itemId": "item_id",
  "abilityId": "ability_id",
  "reasoning": "Lý do chọn hành động này"
}`;
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(response: string, enemy: Combatant): CombatAction {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const data = JSON.parse(jsonMatch[0]);
      
      return {
        type: data.action || 'attack',
        targetId: data.targetId,
        attackIndex: data.attackIndex || 0,
        itemId: data.itemId,
        abilityId: data.abilityId,
        description: `${enemy.name} ${data.reasoning || 'thực hiện hành động thông minh'}`,
        priority: 5
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.createDefendAction();
    }
  }

  /**
   * NEW: Decide coordinated action for multiple enemies (hard difficulty only)
   */
  private decideCoordinatedAction(
    enemy: Combatant,
    aliveEnemies: Combatant[],
    aliveTargets: Combatant[]
  ): CombatAction | null {
    // Strategy 1: Focus Fire on weakest target (player or ally)
    // Tất cả enemies tấn công cùng target
    const focusFireChance = 0.4; // 40% chance
    if (Math.random() < focusFireChance) {
      const weakestTarget = this.selectWeakestTarget(enemy, aliveTargets);
      const attackIndex = this.selectBestAttack(enemy, weakestTarget);
      return {
        type: 'attack',
        targetId: weakestTarget.id,
        attackIndex,
        description: `${enemy.name} phối hợp với đồng đội, tập trung tấn công ${weakestTarget.name}`,
        priority: 4
      };
    }

    // Strategy 2: Protect Healer/Support
    // Nếu có ally có healing items, defend để bảo vệ
    const protectHealerChance = 0.25; // 25% chance
    if (Math.random() < protectHealerChance) {
      const healerAlly = aliveEnemies.find(e => this.hasHealingItem(e));
      if (healerAlly && healerAlly.health.current / healerAlly.health.max < 0.6) {
        // This enemy defends to protect healer
        return {
          type: 'defend',
          description: `${enemy.name} phòng thủ để bảo vệ đồng đội`,
          priority: 3
        };
      }
    }

    // Strategy 3: Smart Item Usage
    // Ưu tiên heal ally có HP thấp nhất
    const smartItemChance = 0.20; // 20% chance
    if (Math.random() < smartItemChance) {
      const weakestAlly = [...aliveEnemies].sort((a, b) => 
        (a.health.current / a.health.max) - (b.health.current / b.health.max)
      )[0];
      
      if (weakestAlly && weakestAlly.health.current / weakestAlly.health.max < 0.3) {
        // Check if this enemy has healing item
        if (this.hasHealingItem(enemy)) {
          const healingItem = enemy.inventory?.find(item => 
            item.type === 'consumable' && 
            item.quantity > 0 &&
            (item.consumableType === 'healing' || item.effect?.includes('heal'))
          );
          
          if (healingItem) {
            return {
              type: 'use_item',
              itemId: healingItem.id,
              targetId: weakestAlly.id,
              description: `${enemy.name} hỗ trợ đồng đội bằng ${healingItem.name}`,
              priority: 5
            };
          }
        }
      }
    }

    // Strategy 4: Flanking
    // Một enemy defend, others attack
    const flankingChance = 0.15; // 15% chance
    if (Math.random() < flankingChance) {
      // Check if any ally is already defending
      const defendingAlly = aliveEnemies.some(e => e.isDefending);
      
      if (!defendingAlly && aliveEnemies.length >= 1) {
        // This enemy defends while others attack
        return {
          type: 'defend',
          description: `${enemy.name} phòng thủ trong khi đồng đội tấn công`,
          priority: 3
        };
      }
    }

    // No coordination strategy applied, return null to use default AI
    return null;
  }
}

export const enemyAIService = EnemyAIService.getInstance();
