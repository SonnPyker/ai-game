import { TurnLog, CombatLogEntry } from '../types/combat';

interface DialogueSequence {
  combatantName: string;
  combatantType: 'player' | 'enemy' | 'npc';
  sequence: Array<{
    message: string;
    messageType: 'description' | 'attack_roll' | 'damage_roll' | 'status' | 'death';
    delay?: number;
  }>;
}

class CombatDialogueService {
  private static instance: CombatDialogueService;

  public static getInstance(): CombatDialogueService {
    if (!CombatDialogueService.instance) {
      CombatDialogueService.instance = new CombatDialogueService();
    }
    return CombatDialogueService.instance;
  }

  /**
   * Convert turn log to dialogue sequence
   */
  public convertTurnLogToDialogue(turnLog: TurnLog): DialogueSequence {
    const sequence: Array<{
      message: string;
      messageType: 'description' | 'attack_roll' | 'damage_roll' | 'status' | 'death';
      delay?: number;
    }> = [];

    // Add turn description first
    if (turnLog.description) {
      sequence.push({
        message: turnLog.description,
        messageType: 'description',
        delay: 4000
      });
    }

    // Process individual actions
    turnLog.actions.forEach(action => {
      const dialogueItem = this.convertActionToDialogue(action);
      if (dialogueItem) {
        sequence.push(dialogueItem);
      }
    });

    return {
      combatantName: turnLog.combatantName,
      combatantType: turnLog.isPlayerTurn ? 'player' : 'enemy',
      sequence
    };
  }

  /**
   * Convert individual action to dialogue item
   */
  private convertActionToDialogue(action: CombatLogEntry): {
    message: string;
    messageType: 'description' | 'attack_roll' | 'damage_roll' | 'status' | 'death';
    delay?: number;
  } | null {
    switch (action.type) {
      case 'attack':
        return {
          message: action.message,
          messageType: 'attack_roll',
          delay: 3000
        };
      case 'damage':
        return {
          message: action.message,
          messageType: 'damage_roll',
          delay: 3000
        };
      case 'status':
        return {
          message: action.message,
          messageType: 'status',
          delay: 2500
        };
      case 'death':
        return {
          message: action.message,
          messageType: 'death',
          delay: 4000
        };
      default:
        return {
          message: action.message,
          messageType: 'description',
          delay: 2000
        };
    }
  }

  /**
   * Create dialogue sequence from combat log entries
   */
  public createDialogueFromLogEntries(
    combatantName: string,
    combatantType: 'player' | 'enemy' | 'npc',
    entries: CombatLogEntry[]
  ): DialogueSequence {
    const sequence: Array<{
      message: string;
      messageType: 'description' | 'attack_roll' | 'damage_roll' | 'status' | 'death';
      delay?: number;
    }> = [];

    entries.forEach(entry => {
      const dialogueItem = this.convertActionToDialogue(entry);
      if (dialogueItem) {
        sequence.push(dialogueItem);
      }
    });

    return {
      combatantName,
      combatantType,
      sequence
    };
  }

  /**
   * Extract dialogue sequence from latest turn log
   */
  public extractLatestTurnDialogue(turnLogs: TurnLog[]): DialogueSequence | null {
    if (turnLogs.length === 0) return null;
    
    const latestTurn = turnLogs[turnLogs.length - 1];
    return this.convertTurnLogToDialogue(latestTurn);
  }

  /**
   * Create simplified dialogue for quick actions
   */
  public createQuickDialogue(
    combatantName: string,
    combatantType: 'player' | 'enemy' | 'npc',
    message: string,
    messageType: 'description' | 'attack_roll' | 'damage_roll' | 'status' | 'death' = 'description'
  ): DialogueSequence {
    return {
      combatantName,
      combatantType,
      sequence: [{
        message,
        messageType,
        delay: 2000
      }]
    };
  }
}

export const combatDialogueService = CombatDialogueService.getInstance();
