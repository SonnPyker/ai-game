import { QuestProgress, QuestObjectiveProgress, QuestObjectiveType } from '../types';

class QuestMigrationService {
  private static instance: QuestMigrationService;

  public static getInstance(): QuestMigrationService {
    if (!QuestMigrationService.instance) {
      QuestMigrationService.instance = new QuestMigrationService();
    }
    return QuestMigrationService.instance;
  }

  /**
   * Migrate all quests from old format to new format
   */
  async migrateAllQuests(): Promise<{
    migratedQuests: QuestProgress[];
    backupCreated: boolean;
    migrationLog: string[];
  }> {
    const migrationLog: string[] = [];
    const migratedQuests: QuestProgress[] = [];
    let backupCreated = false;

    try {
      // Create backup of current quests
      backupCreated = await this.createBackup();
      migrationLog.push(`✅ Backup created: ${backupCreated}`);

      // Load all quests from localStorage
      const questSystemData = localStorage.getItem('quest_system');
      if (!questSystemData) {
        migrationLog.push('❌ No quest system data found');
        return { migratedQuests, backupCreated, migrationLog };
      }

      const questSystem = JSON.parse(questSystemData);
      migrationLog.push(`📊 Found quest system with ${questSystem.mainQuests?.length || 0} main quests, ${questSystem.sideQuests?.length || 0} side quests, ${questSystem.factionQuests?.length || 0} faction quests`);

      // Migrate main quests
      if (questSystem.mainQuests) {
        for (const quest of questSystem.mainQuests) {
          const migratedQuest = this.migrateQuest(quest, 'main');
          if (migratedQuest) {
            migratedQuests.push(migratedQuest);
            migrationLog.push(`✅ Migrated main quest: ${quest.title}`);
          }
        }
      }

      // Migrate side quests
      if (questSystem.sideQuests) {
        for (const quest of questSystem.sideQuests) {
          const migratedQuest = this.migrateQuest(quest, 'side');
          if (migratedQuest) {
            migratedQuests.push(migratedQuest);
            migrationLog.push(`✅ Migrated side quest: ${quest.title}`);
          }
        }
      }

      // Migrate faction quests
      if (questSystem.factionQuests) {
        for (const quest of questSystem.factionQuests) {
          const migratedQuest = this.migrateQuest(quest, 'faction');
          if (migratedQuest) {
            migratedQuests.push(migratedQuest);
            migrationLog.push(`✅ Migrated faction quest: ${quest.title}`);
          }
        }
      }

      // Update quest system with migrated quests
      const newQuestSystem = {
        ...questSystem,
        mainQuests: migratedQuests.filter(q => q.type === 'main'),
        sideQuests: migratedQuests.filter(q => q.type === 'side'),
        factionQuests: migratedQuests.filter(q => q.type === 'faction')
      };

      // Save migrated quest system
      localStorage.setItem('quest_system', JSON.stringify(newQuestSystem));
      migrationLog.push('💾 Saved migrated quest system to localStorage');

      migrationLog.push(`🎉 Migration completed! Migrated ${migratedQuests.length} quests total`);

    } catch (error) {
      migrationLog.push(`❌ Migration error: ${error}`);
      console.error('Quest migration error:', error);
    }

    return { migratedQuests, backupCreated, migrationLog };
  }

  /**
   * Migrate a single quest
   */
  private migrateQuest(quest: QuestProgress, _questType: 'main' | 'side' | 'faction'): QuestProgress | null {
    try {
      const migratedObjectives: QuestObjectiveProgress[] = [];

      for (const objective of quest.objectives) {
        const migratedObjective = this.migrateObjective(objective);
        if (migratedObjective) {
          migratedObjectives.push(migratedObjective);
        }
      }

      return {
        ...quest,
        objectives: migratedObjectives
      };
    } catch (error) {
      console.error(`Error migrating quest ${quest.title}:`, error);
      return null;
    }
  }

  /**
   * Migrate a single objective
   */
  private migrateObjective(objective: QuestObjectiveProgress): QuestObjectiveProgress | null {
    try {
      // Determine objective type based on description and keywords
      const objectiveType = this.determineObjectiveType(objective);
      
      // Create new objective with type and tracking fields
      const migratedObjective: QuestObjectiveProgress = {
        ...objective,
        type: objectiveType,
        // Keep old aiKeywords for reference during migration
        aiKeywords: objective.aiKeywords || []
      };

      // Add specific tracking fields based on type
      this.addTrackingFields(migratedObjective, objective);

      return migratedObjective;
    } catch (error) {
      console.error(`Error migrating objective ${objective.id}:`, error);
      return null;
    }
  }

  /**
   * Determine objective type based on description and keywords
   */
  private determineObjectiveType(objective: QuestObjectiveProgress): QuestObjectiveType {
    const description = objective.description.toLowerCase();
    const keywords = (objective.aiKeywords || []).map(k => k.toLowerCase());

    // Check for delivery patterns
    if (this.matchesPattern(description, keywords, ['giao', 'mang đến', 'đưa cho', 'trao', 'chuyển'])) {
      return 'chain_delivery';
    }

    // Check for combat patterns
    if (this.matchesPattern(description, keywords, ['đánh bại', 'tiêu diệt', 'chiến đấu', 'hạ gục', 'giết', 'thắng'])) {
      return 'combat';
    }

    // Check for travel patterns
    if (this.matchesPattern(description, keywords, ['đến', 'di chuyển', 'tới', 'đi', 'thăm', 'khám phá'])) {
      return 'travel';
    }

    // Check for find_item patterns
    if (this.matchesPattern(description, keywords, ['tìm', 'thu thập', 'có được', 'lấy', 'nhặt', 'kiếm', 'tìm kiếm'])) {
      return 'find_item';
    }

    // Check for find_npc patterns
    if (this.matchesPattern(description, keywords, ['gặp', 'nói chuyện', 'tìm người', 'liên lạc', 'hỏi thăm'])) {
      return 'find_npc';
    }

    // Default to find_item if no clear pattern
    return 'find_item';
  }

  /**
   * Check if description or keywords match any of the patterns
   */
  private matchesPattern(description: string, keywords: string[], patterns: string[]): boolean {
    const allText = [description, ...keywords].join(' ');
    return patterns.some(pattern => allText.includes(pattern));
  }

  /**
   * Add specific tracking fields based on objective type
   */
  private addTrackingFields(objective: QuestObjectiveProgress, _originalObjective: QuestObjectiveProgress): void {
    const description = objective.description.toLowerCase();

    switch (objective.type) {
      case 'find_item':
        this.addFindItemFields(objective, description);
        break;
      case 'find_npc':
        this.addFindNPCFields(objective, description);
        break;
      case 'combat':
        this.addCombatFields(objective, description);
        break;
      case 'travel':
        this.addTravelFields(objective, description);
        break;
      case 'chain_delivery':
        this.addDeliveryFields(objective, description);
        break;
    }
  }

  /**
   * Add fields for find_item objectives
   */
  private addFindItemFields(objective: QuestObjectiveProgress, description: string): void {
    // Extract item name from description
    const itemName = this.extractItemName(description);
    if (itemName) {
      objective.targetItemName = itemName;
    }

    // Find item objectives chỉ cần 1 item (không có số lượng)
    // Bỏ requiredQuantity logic
  }

  /**
   * Add fields for find_npc objectives
   */
  private addFindNPCFields(objective: QuestObjectiveProgress, description: string): void {
    // Extract NPC name from description
    const npcName = this.extractNPCName(description);
    if (npcName) {
      objective.targetNPCName = npcName;
    }
  }

  /**
   * Add fields for combat objectives
   */
  private addCombatFields(objective: QuestObjectiveProgress, description: string): void {
    // Extract enemy name and type
    const enemyInfo = this.extractEnemyInfo(description);
    if (enemyInfo.name) {
      objective.targetEnemyName = enemyInfo.name;
    }
    if (enemyInfo.type) {
      objective.targetEnemyType = enemyInfo.type;
    }

    // Extract quantity
    const quantity = this.extractQuantity(description);
    if (quantity > 0) {
      objective.requiredKills = quantity;
    } else {
      objective.requiredKills = 1; // Default to 1 if not specified
    }

    objective.currentKills = 0; // Initialize current kills
  }

  /**
   * Add fields for travel objectives
   */
  private addTravelFields(objective: QuestObjectiveProgress, description: string): void {
    // Extract location name from description
    const locationName = this.extractLocationName(description);
    if (locationName) {
      objective.targetLocationName = locationName;
    }
  }

  /**
   * Add fields for delivery objectives
   */
  private addDeliveryFields(objective: QuestObjectiveProgress, description: string): void {
    // Extract item and NPC names
    const itemName = this.extractItemName(description);
    const npcName = this.extractNPCName(description);
    
    if (itemName) {
      objective.deliveryItemName = itemName;
    }
    if (npcName) {
      objective.deliveryNPCName = npcName;
    }
  }

  /**
   * Extract item name from description
   */
  private extractItemName(description: string): string | null {
    // Common patterns for item names
    const patterns = [
      /(?:tìm|thu thập|lấy|nhặt|kiếm)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/,
      /([^,.\s]+(?:\s+[^,.\s]+)*)\s+(?:cần|phải|được)/
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract NPC name from description
   */
  private extractNPCName(description: string): string | null {
    // Common patterns for NPC names
    const patterns = [
      /(?:gặp|nói chuyện|tìm|liên lạc)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/,
      /([^,.\s]+(?:\s+[^,.\s]+)*)\s+(?:nói|gặp|liên lạc)/
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract enemy information from description
   */
  private extractEnemyInfo(description: string): { name: string | null; type: string | null } {
    // Common enemy types
    const enemyTypes = ['goblin', 'orc', 'skeleton', 'zombie', 'dragon', 'troll', 'giant', 'demon', 'beast', 'monster'];
    
    let name: string | null = null;
    let type: string | null = null;

    // Look for enemy type first
    for (const enemyType of enemyTypes) {
      if (description.includes(enemyType)) {
        type = enemyType;
        break;
      }
    }

    // Look for specific enemy name patterns
    const patterns = [
      /(?:đánh bại|tiêu diệt|hạ gục|giết)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/,
      /([^,.\s]+(?:\s+[^,.\s]+)*)\s+(?:đã|bị|được)/
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        name = match[1].trim();
        break;
      }
    }

    return { name, type };
  }

  /**
   * Extract location name from description
   */
  private extractLocationName(description: string): string | null {
    const patterns = [
      /(?:đến|tới|di chuyển|thăm|khám phá)\s+([^,.\s]+(?:\s+[^,.\s]+)*)/,
      /([^,.\s]+(?:\s+[^,.\s]+)*)\s+(?:để|để tìm|để gặp)/
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract quantity from description
   */
  private extractQuantity(description: string): number {
    const patterns = [
      /(\d+)\s*(?:cái|chiếc|con|người|vật|món)/,
      /(?:cần|phải|được)\s*(\d+)/,
      /(\d+)\s*(?:lần|lượt)/
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }

    return 1; // Default to 1 if no quantity found
  }

  /**
   * Create backup of current quest system
   */
  private async createBackup(): Promise<boolean> {
    try {
      const questSystemData = localStorage.getItem('quest_system');
      if (questSystemData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        localStorage.setItem(`quest_system_backup_${timestamp}`, questSystemData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupKey: string): Promise<boolean> {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (backupData) {
        localStorage.setItem('quest_system', backupData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }

  /**
   * List available backups
   */
  listBackups(): string[] {
    const backups: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('quest_system_backup_')) {
        backups.push(key);
      }
    }
    return backups.sort().reverse(); // Most recent first
  }
}

export const questMigrationService = QuestMigrationService.getInstance();
