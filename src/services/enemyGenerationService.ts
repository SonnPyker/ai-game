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
  public createEnemyFromNPC(npcId: string, npcName: string, npcLevel: number = 1, npcType?: Enemy['type']): Enemy {
    const combatStats = enemyDatabaseService.generateRandomEnemyStats(npcLevel, npcType);
    return enemyDatabaseService.createEnemyFromNPC(npcId, npcName, combatStats);
  }

  // Generate multiple random enemies with variety
  public generateMultipleEnemies(count: number, level: number = 1): Enemy[] {
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
      let enemy = this.generateRandomEnemy(enemyLevel, selectedType);
      let attempts = 0;
      while (usedNames.has(enemy.name) && attempts < 10) {
        enemy = this.generateRandomEnemy(enemyLevel, selectedType);
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
  public generateRandomEnemy(level: number = 1, type?: Enemy['type']): Enemy {
    const combatStats = enemyDatabaseService.generateRandomEnemyStats(level, type);
    
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
      ...combatStats,
      experienceReward: level * 25
    };

    return enemy;
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
