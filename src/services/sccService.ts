import { SCCSummary, SCCState, SCCContext, ChatMessage } from '../types';
import { saveIndexedSummary, cleanupOldChatHistory } from '../lib/context';

class SCCService {
  private static instance: SCCService;
  private readonly MAX_RECENT_TURNS = 20;
  private readonly SUMMARY_THRESHOLD = 20;

  private constructor() {}

  static getInstance(): SCCService {
    if (!SCCService.instance) {
      SCCService.instance = new SCCService();
    }
    return SCCService.instance;
  }

  /**
   * Initialize SCC context
   */
  initializeSCCContext(): SCCContext {
    return {
      summary: {
        recap: '',
        timeline: [],
        clues: [],
        openThreads: [],
        relationships: [],
        goals: [],
        risks: []
      },
      sceneState: {},
      recentTurns: [],
      turnCounter: 0
    };
  }

  /**
   * Load SCC context from localStorage
   */
  loadSCCContext(): SCCContext {
    const summary = this.loadSummary();
    const sceneState = this.loadSceneState();
    const recentTurns = this.loadRecentTurns();
    const turnCounter = this.loadTurnCounter();

    return {
      summary,
      sceneState,
      recentTurns,
      turnCounter
    };
  }

  /**
   * Save SCC context to localStorage
   */
  saveSCCContext(context: SCCContext): void {
    this.saveSummary(context.summary);
    this.saveSceneState(context.sceneState);
    this.saveRecentTurns(context.recentTurns);
    this.saveTurnCounter(context.turnCounter);
  }

  /**
   * Add a new turn to the context
   */
  addTurn(context: SCCContext, message: ChatMessage): SCCContext {
    const newContext = { ...context };
    
    // Add message to recent turns
    newContext.recentTurns.push(message);
    
    // Keep only the most recent turns
    if (newContext.recentTurns.length > this.MAX_RECENT_TURNS) {
      newContext.recentTurns = newContext.recentTurns.slice(-this.MAX_RECENT_TURNS);
    }
    
    // Increment turn counter
    newContext.turnCounter++;
    
    return newContext;
  }

  /**
   * Check if it's time to summarize
   */
  shouldSummarize(context: SCCContext): boolean {
    const shouldSum = context.turnCounter % this.SUMMARY_THRESHOLD === 0 && context.turnCounter > 0;
    
    // Debug log for SCC
    console.log(`🔍 SCC Check - Turn: ${context.turnCounter}, Threshold: ${this.SUMMARY_THRESHOLD}, Modulo: ${context.turnCounter % this.SUMMARY_THRESHOLD}, Should Summarize: ${shouldSum}`);
    
    return shouldSum;
  }


  /**
   * Get context for AI prompt (optimized)
   */
  getOptimizedContext(context: SCCContext): {
    summary: SCCSummary;
    sceneState: SCCState;
    recentTurns: ChatMessage[];
  } {
    return {
      summary: context.summary,
      sceneState: context.sceneState,
      recentTurns: context.recentTurns.slice(-10) // Only last 10 turns for AI
    };
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else if (Array.isArray(source[key])) {
        // Handle arrays with name-based merging
        if (source[key].length > 0 && source[key][0]?.name) {
          result[key] = this.mergeNamedArrays(result[key] || [], source[key]);
        } else {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Merge arrays based on name property
   */
  private mergeNamedArrays(target: any[], source: any[]): any[] {
    const result = [...target];
    
    for (const sourceItem of source) {
      const existingIndex = result.findIndex(item => item.name === sourceItem.name);
      if (existingIndex >= 0) {
        result[existingIndex] = { ...result[existingIndex], ...sourceItem };
      } else {
        result.push(sourceItem);
      }
    }
    
    return result;
  }

  /**
   * Update context after summarization
   */
  updateContextAfterSummary(
    context: SCCContext, 
    newSummary: SCCSummary, 
    newSceneState: SCCState
  ): SCCContext {
    const updatedContext = { ...context };
    
    // Update summary (overwrite)
    updatedContext.summary = newSummary;
    
    // Deep merge scene state
    updatedContext.sceneState = this.deepMerge(context.sceneState, newSceneState);
    
    // Keep only recent turns (10-15 most recent)
    updatedContext.recentTurns = context.recentTurns.slice(-15);
    
    return updatedContext;
  }

  /**
   * Create backup of current summary
   */
  createSummaryBackup(summary: SCCSummary): void {
    localStorage.setItem('rp_summary_backup', JSON.stringify(summary));
  }

  /**
   * Restore summary from backup
   */
  restoreSummaryFromBackup(): SCCSummary | null {
    const backup = localStorage.getItem('rp_summary_backup');
    return backup ? JSON.parse(backup) : null;
  }

  /**
   * Clear all SCC data
   */
  clearSCCData(): void {
    localStorage.removeItem('rp_summary');
    localStorage.removeItem('rp_scene_state');
    localStorage.removeItem('rp_chat');
    localStorage.removeItem('game_turn_counter');
    localStorage.removeItem('rp_summary_backup');
    localStorage.removeItem('action_suggestions');
    localStorage.removeItem('action_log');
    localStorage.removeItem('selectedNPCForDialogue');
    localStorage.removeItem('combat_history');
    localStorage.removeItem('combat_result');
  }

  // Private helper methods for localStorage
  private loadSummary(): SCCSummary {
    const saved = localStorage.getItem('rp_summary');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      recap: '',
      timeline: [],
      clues: [],
      openThreads: [],
      relationships: [],
      goals: [],
      risks: []
    };
  }

  private saveSummary(summary: SCCSummary): void {
    localStorage.setItem('rp_summary', JSON.stringify(summary));
  }

  private loadSceneState(): SCCState {
    const saved = localStorage.getItem('rp_scene_state');
    return saved ? JSON.parse(saved) : {};
  }

  private saveSceneState(sceneState: SCCState): void {
    localStorage.setItem('rp_scene_state', JSON.stringify(sceneState));
  }

  /**
   * Save indexed summary for delta context system
   */
  saveIndexedSummary(turn: number, summary: SCCSummary, sceneState: SCCState): void {
    saveIndexedSummary(turn, summary, sceneState);
  }

  /**
   * Clean up old chat history to save memory
   */
  cleanupOldChatHistory(currentTurn: number): void {
    cleanupOldChatHistory(currentTurn);
  }

  private loadRecentTurns(): ChatMessage[] {
    const saved = localStorage.getItem('rp_chat');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
    return [];
  }

  private saveRecentTurns(recentTurns: ChatMessage[]): void {
    localStorage.setItem('rp_chat', JSON.stringify(recentTurns));
  }

  private loadTurnCounter(): number {
    const saved = localStorage.getItem('game_turn_counter');
    return saved ? parseInt(saved) : 0;
  }

  private saveTurnCounter(turnCounter: number): void {
    localStorage.setItem('game_turn_counter', turnCounter.toString());
  }
}

export const sccService = SCCService.getInstance();
