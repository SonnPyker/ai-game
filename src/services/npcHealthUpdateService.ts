import { npcRelationshipService } from './npcRelationshipService';

class NPCHealthUpdateService {
  private static instance: NPCHealthUpdateService;

  public static getInstance(): NPCHealthUpdateService {
    if (!NPCHealthUpdateService.instance) {
      NPCHealthUpdateService.instance = new NPCHealthUpdateService();
    }
    return NPCHealthUpdateService.instance;
  }

  /**
   * Update NPC health after combat
   */
  public updateNPCHealthAfterCombat(combatResult: any): void {
    try {
      if (!combatResult?.enemiesDefeated) return;

      // Get all NPCs from relationship service
      const allNPCs = npcRelationshipService.getAllRelationships();
      
      combatResult.enemiesDefeated.forEach((defeatedEnemy: any) => {
        // Find NPC by ID first, then by name (case insensitive)
        let npc = null;
        
        if (defeatedEnemy.npcId) {
          npc = npcRelationshipService.getRelationship(defeatedEnemy.npcId);
        }
        
        if (!npc) {
          npc = allNPCs.find(npc => 
            npc.name.toLowerCase().trim() === defeatedEnemy.name.toLowerCase().trim()
          );
        }

        if (npc && npc.combatStats) {
          // Update NPC health to 0 (defeated)
          npc.combatStats.health = {
            current: 0,
            max: npc.combatStats.health?.max || npc.combatStats.health?.current || 24
          };

          // Add note about being defeated
          if (!npc.notes) npc.notes = [];
          const defeatNote = `Bị đánh bại trong combat (${new Date().toLocaleDateString()})`;
          
          // Check if note already exists
          const hasDefeatNote = npc.notes.some(note => note.includes('Bị đánh bại trong combat'));
          if (!hasDefeatNote) {
            npc.notes.push(defeatNote);
            
            // Keep only last 5 notes
            if (npc.notes.length > 5) {
              npc.notes = npc.notes.slice(-5);
            }
          }

          // Update relationship level (defeated NPC becomes more hostile)
          npc.relationshipLevel = Math.max(npc.relationshipLevel - 20, -100);
          
          // Update status to hostile if not already
          if (npc.relationshipLevel <= -60 && npc.status !== 'hostile') {
            npc.status = 'hostile';
          }

          console.log(`Updated NPC ${npc.name} health to 0 after combat defeat`);
        }
      });

      // Save updated NPCs
      npcRelationshipService.saveData();
      
    } catch (error) {
      console.error('Error updating NPC health after combat:', error);
    }
  }

  /**
   * Restore NPC health (for healing or new encounters)
   */
  public restoreNPCHealth(npcId: string, healthPercentage: number = 1.0): void {
    try {
      const npc = npcRelationshipService.getRelationship(npcId);
      
      if (npc && npc.combatStats) {
        const maxHealth = npc.combatStats.health?.max || 24;
        const newHealth = Math.floor(maxHealth * healthPercentage);
        
        npc.combatStats.health = {
          current: newHealth,
          max: maxHealth
        };

        // Add note about healing
        if (!npc.notes) npc.notes = [];
        const healNote = `Hồi phục sức khỏe (${new Date().toLocaleDateString()})`;
        
        // Check if note already exists
        const hasHealNote = npc.notes.some(note => note.includes('Hồi phục sức khỏe'));
        if (!hasHealNote) {
          npc.notes.push(healNote);
          
          // Keep only last 5 notes
          if (npc.notes.length > 5) {
            npc.notes = npc.notes.slice(-5);
          }
        }

        npcRelationshipService.saveData();
        console.log(`Restored NPC ${npc.name} health to ${newHealth}/${maxHealth}`);
      }
    } catch (error) {
      console.error('Error restoring NPC health:', error);
    }
  }

  /**
   * Get NPC health status
   */
  public getNPCHealthStatus(npcId: string): { current: number; max: number; percentage: number } | null {
    try {
      const npc = npcRelationshipService.getRelationship(npcId);
      
      if (npc && npc.combatStats?.health) {
        const { current, max } = npc.combatStats.health;
        return {
          current,
          max,
          percentage: max > 0 ? (current / max) * 100 : 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting NPC health status:', error);
      return null;
    }
  }
}

export const npcHealthUpdateService = NPCHealthUpdateService.getInstance();
