import { SCCSummary, SCCState, ChatMessage } from '../types';

export interface IndexedSummary {
  summary: SCCSummary;
  sceneState: SCCState;
  turn: number;
  createdAt: string;
}

export interface ContextForAI {
  summary: SCCSummary;
  sceneState: SCCState;
  recentTurns: ChatMessage[];
  deltaWindow: number;
}

/**
 * Build context for AI based on turn number and delta window
 * @param turn Current turn number
 * @param deltaWindow Number of recent turns to include (default: 4)
 * @returns Context object for AI
 */
export function buildContextForAI(turn: number, deltaWindow: number = 4): ContextForAI {
  // Load indexed summaries
  const indexedSummaries = JSON.parse(localStorage.getItem('rp_summary_indexed') || '{}');
  
  // Load current scene state
  const currentSceneState = JSON.parse(localStorage.getItem('rp_scene_state') || '{}');
  
  // Load chat history
  const chatHistory = JSON.parse(localStorage.getItem('rp_chat') || '[]');
  
  // Find the most recent summary snapshot
  const summaryKeys = Object.keys(indexedSummaries)
    .map(Number)
    .filter(key => key <= turn)
    .sort((a, b) => b - a); // Sort descending to get most recent
  
  let summary: SCCSummary;
  let summaryTurn: number;
  let recentTurns: ChatMessage[] = [];
  
  if (summaryKeys.length > 0) {
    // Use most recent summary
    summaryTurn = summaryKeys[0];
    const indexedSummary = indexedSummaries[summaryTurn];
    summary = indexedSummary.summary;
    
    // Get delta turns (turns after the summary)
    const deltaStartTurn = summaryTurn + 1;
    recentTurns = chatHistory.filter((msg: ChatMessage) => 
      msg.turn && msg.turn >= deltaStartTurn && msg.turn < turn
    );
    
    // Limit to delta window
    recentTurns = takeLast(recentTurns, deltaWindow);
  } else {
    // Fallback: no summary yet, use recent turns
    summary = {
      recap: '',
      timeline: [],
      clues: [],
      openThreads: [],
      relationships: [],
      goals: [],
      risks: []
    };
    
    // Use last 20 turns as fallback
    recentTurns = takeLast(chatHistory, 20);
  }
  
  return {
    summary,
    sceneState: currentSceneState,
    recentTurns,
    deltaWindow
  };
}

/**
 * Deep merge two objects, with arrays merged by name if objects have 'name' property
 * @param target Target object
 * @param source Source object
 * @returns Merged object
 */
export function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else if (Array.isArray(source[key])) {
        if (Array.isArray(target[key])) {
          // Merge arrays by 'name' if objects, otherwise concatenate
          if (source[key].length > 0 && typeof source[key][0] === 'object' && 'name' in source[key][0]) {
            const mergedArray = [...target[key]];
            source[key].forEach((sItem: any) => {
              const tIndex = mergedArray.findIndex((tItem: any) => tItem.name === sItem.name);
              if (tIndex > -1) {
                mergedArray[tIndex] = deepMerge(mergedArray[tIndex], sItem);
              } else {
                mergedArray.push(sItem);
              }
            });
            output[key] = mergedArray;
          } else {
            output[key] = [...new Set([...target[key], ...source[key]])]; // Simple concatenation and unique
          }
        } else {
          output[key] = source[key];
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

/**
 * Take last N elements from array
 * @param arr Array to take from
 * @param n Number of elements to take
 * @returns Last N elements
 */
export function takeLast<T>(arr: T[], n: number): T[] {
  return arr.slice(-n);
}

/**
 * Save indexed summary to localStorage
 * @param turn Turn number (should be multiple of 20)
 * @param summary SCC summary
 * @param sceneState Scene state
 */
export function saveIndexedSummary(turn: number, summary: SCCSummary, sceneState: SCCState): void {
  const indexedSummaries = JSON.parse(localStorage.getItem('rp_summary_indexed') || '{}');
  
  indexedSummaries[turn] = {
    summary,
    sceneState,
    turn,
    createdAt: new Date().toISOString()
  };
  
  localStorage.setItem('rp_summary_indexed', JSON.stringify(indexedSummaries));
}

/**
 * Clean up old chat history to save memory
 * @param currentTurn Current turn number
 * @param keepBeforeTurn Keep turns before this number
 */
export function cleanupOldChatHistory(currentTurn: number, keepBeforeTurn: number = 10): void {
  const chatHistory = JSON.parse(localStorage.getItem('rp_chat') || '[]');
  
  // Keep turns that are either recent or before the cleanup threshold
  const filteredHistory = chatHistory.filter((msg: ChatMessage) => 
    !msg.turn || msg.turn >= (currentTurn - keepBeforeTurn)
  );
  
  localStorage.setItem('rp_chat', JSON.stringify(filteredHistory));
}

/**
 * Get the most recent summary turn
 * @returns Most recent summary turn number, or 0 if none
 */
export function getMostRecentSummaryTurn(): number {
  const indexedSummaries = JSON.parse(localStorage.getItem('rp_summary_indexed') || '{}');
  const summaryKeys = Object.keys(indexedSummaries).map(Number).sort((a, b) => b - a);
  return summaryKeys.length > 0 ? summaryKeys[0] : 0;
}
