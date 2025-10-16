import { NPCRelationship } from '../types';
import { npcRelationshipService } from './npcRelationshipService';

interface ChallengeData {
  npcId: string;
  npcName: string;
  challengeReason: string;
  combatStats: any;
  difficulty: 'easy' | 'medium' | 'hard';
}

class NPCChallengeService {
  private static instance: NPCChallengeService;
  private challengeCooldowns: Map<string, number> = new Map();
  private readonly CHALLENGE_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  public static getInstance(): NPCChallengeService {
    if (!NPCChallengeService.instance) {
      NPCChallengeService.instance = new NPCChallengeService();
    }
    return NPCChallengeService.instance;
  }

  /**
   * Check if NPC should challenge player based on relationship and context
   */
  public shouldChallengePlayer(
    npcName: string, 
    sceneState?: any, 
    isInDialogue: boolean = false
  ): ChallengeData | null {
    try {
      // Get NPC relationship data
      const npc = npcRelationshipService.getRelationship(npcName);
      if (!npc) return null;

      // Check if NPC is in challenging relationship status
      if (!this.isChallengingStatus(npc.status)) return null;

      // Check cooldown
      if (this.isOnCooldown(npc.id)) return null;

      // Check if NPC is present in scene or in dialogue
      if (!this.isNPCInContext(npcName, sceneState, isInDialogue)) return null;

      // Calculate challenge probability based on relationship level
      const challengeProbability = this.calculateChallengeProbability(npc);
      if (Math.random() > challengeProbability) return null;

      // Generate challenge data
      const challengeData = this.generateChallengeData(npc);
      if (!challengeData) return null;

      // Set cooldown
      this.setCooldown(npc.id);

      return challengeData;
    } catch (error) {
      console.error('Error checking NPC challenge:', error);
      return null;
    }
  }

  /**
   * Check if NPC status is challenging (rival or worse)
   */
  private isChallengingStatus(status: string): boolean {
    const challengingStatuses = ['rival', 'enemy', 'hostile', 'suspicious', 'disappointed'];
    return challengingStatuses.includes(status);
  }

  /**
   * Check if NPC is in current context (scene or dialogue)
   */
  private isNPCInContext(npcName: string, sceneState?: any, isInDialogue: boolean = false): boolean {
    // If in dialogue, always consider challenging
    if (isInDialogue) return true;

    // Check if NPC is in scene state
    if (sceneState?.npcs) {
      return sceneState.npcs.some((npc: any) => 
        npc.name && npc.name.toLowerCase().includes(npcName.toLowerCase())
      );
    }

    return false;
  }

  /**
   * Calculate challenge probability based on relationship
   */
  private calculateChallengeProbability(npc: NPCRelationship): number {
    const relationshipLevel = npc.relationshipLevel;
    
    // Base probabilities by status
    const statusProbabilities: Record<string, number> = {
      'rival': 0.15,        // 15% chance
      'enemy': 0.25,        // 25% chance  
      'hostile': 0.30,      // 30% chance
      'suspicious': 0.10,   // 10% chance
      'disappointed': 0.05  // 5% chance
    };

    let baseProbability = statusProbabilities[npc.status] || 0;

    // Adjust based on relationship level (more negative = higher chance)
    if (relationshipLevel < -50) {
      baseProbability *= 1.5;
    } else if (relationshipLevel < -30) {
      baseProbability *= 1.2;
    }

    // Adjust based on total interactions (more interactions = higher chance)
    if (npc.totalInteractions > 10) {
      baseProbability *= 1.3;
    } else if (npc.totalInteractions > 5) {
      baseProbability *= 1.1;
    }

    return Math.min(baseProbability, 0.5); // Cap at 50%
  }

  /**
   * Generate challenge data for NPC
   */
  private generateChallengeData(npc: NPCRelationship): ChallengeData | null {
    try {
      // Determine difficulty based on relationship and NPC level
      const difficulty = this.determineDifficulty(npc);
      
      // Generate combat stats based on NPC data
      const combatStats = this.generateNPCCombatStats(npc, difficulty);
      
      // Generate challenge reason
      const challengeReason = this.generateChallengeReason(npc);

      return {
        npcId: npc.id,
        npcName: npc.name,
        challengeReason,
        combatStats,
        difficulty
      };
    } catch (error) {
      console.error('Error generating challenge data:', error);
      return null;
    }
  }

  /**
   * Determine challenge difficulty using enhanced calculation
   */
  private determineDifficulty(npc: NPCRelationship): 'easy' | 'medium' | 'hard' {
    const relationshipLevel = npc.relationshipLevel;
    const npcLevel = npc.level || 1;

    // Calculate difficulty score based on multiple factors
    let difficultyScore = 0;
    
    // Relationship factor (0-40 points)
    if (relationshipLevel < -70) difficultyScore += 40;
    else if (relationshipLevel < -50) difficultyScore += 30;
    else if (relationshipLevel < -30) difficultyScore += 20;
    else if (relationshipLevel < -10) difficultyScore += 10;
    
    // Level factor (0-30 points)
    if (npcLevel > 10) difficultyScore += 30;
    else if (npcLevel > 7) difficultyScore += 20;
    else if (npcLevel > 4) difficultyScore += 10;
    
    // Interaction history factor (0-20 points)
    if (npc.totalInteractions > 20) difficultyScore += 20;
    else if (npc.totalInteractions > 10) difficultyScore += 10;
    else if (npc.totalInteractions > 5) difficultyScore += 5;
    
    // Status factor (0-10 points)
    const statusBonuses: Record<string, number> = {
      'enemy': 10,
      'hostile': 8,
      'rival': 6,
      'suspicious': 3,
      'disappointed': 1,
      'neutral': 0,
      'friendly': -2,
      'acquaintance': 0,
      'ally': -3,
      'admiring': -1,
      'respectful': 0,
      'cautious': 2,
      'trusting': -1,
      'competitive': 4
    };
    difficultyScore += statusBonuses[npc.status] || 0;
    
    // Determine difficulty based on total score
    if (difficultyScore >= 60) return 'hard';
    else if (difficultyScore >= 30) return 'medium';
    else return 'easy';
  }

  /**
   * Generate combat stats for NPC challenger
   */
  private generateNPCCombatStats(npc: NPCRelationship, difficulty: 'easy' | 'medium' | 'hard'): any {
    const baseLevel = npc.level || 1;
    
    // Difficulty multipliers
    const difficultyMultipliers = {
      'easy': { hp: 0.8, damage: 0.8, ac: 0.9 },
      'medium': { hp: 1.0, damage: 1.0, ac: 1.0 },
      'hard': { hp: 1.3, damage: 1.2, ac: 1.1 }
    };

    const multiplier = difficultyMultipliers[difficulty];
    
    // Base stats
    const baseHP = Math.max(8, baseLevel * 4);
    const baseAC = Math.max(10, 8 + Math.floor(baseLevel / 2));
    const baseDamage = Math.max(4, baseLevel * 2);

    return {
      level: baseLevel,
      health: {
        max: Math.floor(baseHP * multiplier.hp),
        current: Math.floor(baseHP * multiplier.hp)
      },
      armorClass: Math.floor(baseAC * multiplier.ac),
      attacks: [{
        name: npc.combatStats?.attacks?.[0]?.name || this.generateWeaponName(npc),
        attackBonus: Math.floor(2 + baseLevel / 2),
        damage: `${Math.floor(baseDamage * multiplier.damage / 2)}d4+${Math.floor(baseDamage * multiplier.damage / 4)}`,
        damageType: 'physical'
      }],
      experienceReward: Math.floor(baseLevel * 15 * (difficulty === 'hard' ? 2.5 : difficulty === 'medium' ? 1.8 : 1.2)),
      type: 'npc_challenger',
      npcId: npc.id,
      npcName: npc.name
    };
  }

  /**
   * Generate weapon name based on NPC
   */
  private generateWeaponName(npc: NPCRelationship): string {
    const weapons = [
      'Cú đấm', 'Cú đá', 'Vũ khí cầm tay', 'Vũ khí tạm thời',
      'Vũ khí tự vệ', 'Cú tấn công', 'Đòn tay không'
    ];
    
    // Use NPC's combat stats if available
    if (npc.combatStats?.attacks?.[0]?.name) {
      return npc.combatStats.attacks[0].name;
    }

    return weapons[Math.floor(Math.random() * weapons.length)];
  }

  /**
   * Generate challenge reason based on NPC and relationship
   */
  private generateChallengeReason(npc: NPCRelationship): string {
    const reasons = {
      'rival': [
        `${npc.name} muốn chứng minh mình mạnh hơn bạn!`,
        `${npc.name} thách đấu bạn để giải quyết mâu thuẫn!`,
        `${npc.name} muốn thử sức với bạn!`
      ],
      'enemy': [
        `${npc.name} tấn công bạn vì thù hận!`,
        `${npc.name} muốn trả thù!`,
        `${npc.name} quyết định tiêu diệt bạn!`
      ],
      'hostile': [
        `${npc.name} tấn công bạn vì căm ghét!`,
        `${npc.name} muốn làm hại bạn!`,
        `${npc.name} quyết định đánh bạn!`
      ],
      'suspicious': [
        `${npc.name} nghi ngờ bạn và muốn kiểm tra!`,
        `${npc.name} muốn thử thách bạn!`,
        `${npc.name} quyết định thử sức!`
      ],
      'disappointed': [
        `${npc.name} thất vọng và muốn dạy bạn một bài học!`,
        `${npc.name} muốn chứng minh bạn sai!`,
        `${npc.name} quyết định thử thách bạn!`
      ]
    };

    const statusReasons = reasons[npc.status as keyof typeof reasons] || reasons['rival'];
    return statusReasons[Math.floor(Math.random() * statusReasons.length)];
  }

  /**
   * Check if NPC is on cooldown
   */
  private isOnCooldown(npcId: string): boolean {
    const lastChallenge = this.challengeCooldowns.get(npcId);
    if (!lastChallenge) return false;
    
    return Date.now() - lastChallenge < this.CHALLENGE_COOLDOWN;
  }

  /**
   * Set cooldown for NPC
   */
  private setCooldown(npcId: string): void {
    this.challengeCooldowns.set(npcId, Date.now());
  }

  /**
   * Clear cooldown for NPC (for testing)
   */
  public clearCooldown(npcId: string): void {
    this.challengeCooldowns.delete(npcId);
  }

  /**
   * Get all NPCs on cooldown
   */
  public getCooldownStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    this.challengeCooldowns.forEach((timestamp, npcId) => {
      const remaining = this.CHALLENGE_COOLDOWN - (Date.now() - timestamp);
      if (remaining > 0) {
        status[npcId] = remaining;
      }
    });
    return status;
  }
}

export const npcChallengeService = NPCChallengeService.getInstance();
