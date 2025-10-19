import { Enemy } from '../types';
import { enemyDatabaseService } from './enemyDatabaseService';

class EnemyGenerationService {
  private static instance: EnemyGenerationService;

  private constructor() {}

  public static getInstance(): EnemyGenerationService {
    if (!EnemyGenerationService.instance) {
      EnemyGenerationService.instance = new EnemyGenerationService();
    }
    return EnemyGenerationService.instance;
  }






  // Create enemy from NPC data
  public createEnemyFromNPC(npcId: string, npcName: string, npcLevel: number = 1, npcType?: Enemy['type'], threatLevel?: 'low' | 'medium' | 'high' | 'extreme'): Enemy {
    const finalThreatLevel = threatLevel || this.determineThreatLevelByLevel(npcLevel);
    const combatStats = enemyDatabaseService.generateRandomEnemyStats(npcLevel, npcType, finalThreatLevel);
    const enemy = enemyDatabaseService.createEnemyFromNPC(npcId, npcName, combatStats);
    enemy.threatLevel = finalThreatLevel;
    return enemy;
  }

  // Generate multiple random enemies with variety
  public generateMultipleEnemies(count: number, level: number = 1, threatLevel?: 'low' | 'medium' | 'high' | 'extreme'): Enemy[] {
    const enemies: Enemy[] = [];
    const usedNames = new Set<string>();
    
    // Determine enemy types based on scene context or random
    const availableTypes: Enemy['type'][] = ['humanoid', 'beast', 'undead', 'demon', 'elemental', 'construct', 'other'];
    
    for (let i = 0; i < count; i++) {
      // Vary level slightly for each enemy
      const enemyLevel = Math.max(1, level + Math.floor(Math.random() * 3) - 1);
      
      // Select enemy type (prefer variety)
      let selectedType: Enemy['type'];
      if (i === 0 || Math.random() < 0.7) {
        // First enemy or 70% chance: random type
        selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      } else {
        // 30% chance: same type as previous (pack/group logic)
        selectedType = enemies[enemies.length - 1].type;
      }
      
      // Generate enemy with unique name
      let enemy = this.generateRandomEnemy(enemyLevel, selectedType, threatLevel);
      let attempts = 0;
      while (usedNames.has(enemy.name) && attempts < 10) {
        enemy = this.generateRandomEnemy(enemyLevel, selectedType, threatLevel);
        attempts++;
      }
      
      // If still duplicate after 10 attempts, add number suffix
      if (usedNames.has(enemy.name)) {
        enemy.name = `${enemy.name} ${i + 1}`;
      }
      
      usedNames.add(enemy.name);
      enemies.push(enemy);
    }
    
    return enemies;
  }

  // Generate random enemy for testing
  public generateRandomEnemy(level: number = 1, type?: Enemy['type'], threatLevel?: 'low' | 'medium' | 'high' | 'extreme'): Enemy {
    // Determine threat level based on level if not provided
    const finalThreatLevel = threatLevel || this.determineThreatLevelByLevel(level);
    
    const combatStats = enemyDatabaseService.generateRandomEnemyStats(level, type, finalThreatLevel);
    
    const enemyTypes = ['humanoid', 'beast', 'undead', 'demon', 'elemental', 'construct', 'other'];
    const selectedType = type || (enemyTypes[Math.floor(Math.random() * enemyTypes.length)] as Enemy['type']);
    
    const names: Record<Enemy['type'], string[]> = {
      humanoid: ['Bandit', 'Thief', 'Mercenary', 'Guard', 'Cultist'],
      beast: ['Wolf', 'Bear', 'Tiger', 'Lion', 'Eagle'],
      undead: ['Skeleton', 'Zombie', 'Wight', 'Wraith', 'Ghoul'],
      demon: ['Imp', 'Devil', 'Succubus', 'Balor', 'Pit Fiend'],
      elemental: ['Fire Spirit', 'Water Elemental', 'Earth Golem', 'Air Djinn'],
      construct: ['Golem', 'Automaton', 'Warforged', 'Clockwork'],
      other: ['Aberration', 'Outsider', 'Fey', 'Celestial']
    };

    const typeNames = names[selectedType];
    const randomName = typeNames[Math.floor(Math.random() * typeNames.length)];
    
    const enemy: Enemy = {
      id: this.generateEnemyId(randomName),
      name: randomName,
      description: `Một ${randomName.toLowerCase()} nguy hiểm.`,
      type: selectedType,
      threatLevel: finalThreatLevel,
      ...combatStats,
      experienceReward: level * 25
    };

    // Calculate and store difficulty rating
    const difficultyData = enemyDatabaseService.calculateEnemyDifficulty(enemy);
    (enemy as any).difficultyRating = difficultyData.rating;
    (enemy as any).difficultyScore = difficultyData.score;

    return enemy;
  }

  // Determine threat level based on enemy level
  private determineThreatLevelByLevel(level: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (level <= 2) return 'low';
    if (level <= 5) return 'medium';
    if (level <= 10) return 'high';
    return 'extreme';
  }

  // Generate unique enemy ID
  private generateEnemyId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `enemy_${cleanName}_${timestamp}_${random}`;
  }

}

// Export singleton instance
export const enemyGenerationService = EnemyGenerationService.getInstance();
