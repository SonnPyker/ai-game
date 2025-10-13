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
