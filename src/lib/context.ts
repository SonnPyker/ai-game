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
 * Build context for AI based on turn number
 * @param turn Current turn number
 * @returns Context object for AI
 */
export function buildContextForAI(turn: number): ContextForAI {
  // Load indexed summaries
  const indexedSummaries = JSON.parse(localStorage.getItem('rp_summary_indexed') || '{}');
  
  // Load current scene state
  const currentSceneState = JSON.parse(localStorage.getItem('rp_scene_state') || '{}');
  
  // Load chat history
  const chatHistory = JSON.parse(localStorage.getItem('rp_chat') || '[]');
  
  // Find the most recent summary snapshot (SCC turn)
  const summaryKeys = Object.keys(indexedSummaries)
    .map(Number)
    .filter(key => key < turn) // Chỉ lấy summary trước turn hiện tại
    .sort((a, b) => b - a); // Sort descending to get most recent
  
  let summary: SCCSummary;
  let summaryTurn: number;
  let recentTurns: ChatMessage[] = [];
  
  if (summaryKeys.length > 0) {
    // Use most recent summary (SCC turn)
    summaryTurn = summaryKeys[0];
    const indexedSummary = indexedSummaries[summaryTurn];
    summary = indexedSummary.summary;
    
    // Calculate delta: turns từ sau SCC turn đến trước turn hiện tại
    // Ví dụ: SCC ở turn 40, turn hiện tại 47 → delta = turns 41-46
    const deltaStartTurn = summaryTurn + 1;
    const deltaEndTurn = turn - 1; // Trừ 1 vì turn hiện tại chưa được tạo
    
    recentTurns = chatHistory.filter((msg: ChatMessage) => 
      msg.turn && msg.turn >= deltaStartTurn && msg.turn <= deltaEndTurn
    );
    
    // Không giới hạn delta window - lấy tất cả turns từ SCC đến hiện tại
    // recentTurns đã được filter đúng phạm vi, không cần giới hạn thêm
    
    console.log(`→ Delta Context for turn ${turn}:`);
    console.log(`   SCC Turn: ${summaryTurn}`);
    console.log(`   Delta Range: ${deltaStartTurn}-${deltaEndTurn}`);
    console.log(`   Delta Turns: ${recentTurns.length} turns`);
    console.log(`   Delta Window: Unlimited (all turns from SCC to current)`);
  } else {
    // Fallback: no summary yet, use recent turns from beginning
    // Ví dụ: turn 9, chưa có SCC → lấy turns 1-8
    summary = {
      recap: '',
      timeline: [],
      clues: [],
      openThreads: [],
      relationships: [],
      goals: [],
      risks: []
    };
    
    // Lấy tất cả turns từ đầu đến trước turn hiện tại
    recentTurns = chatHistory.filter((msg: ChatMessage) => 
      msg.turn && msg.turn < turn
    );
    
    // Không giới hạn cho fallback - lấy tất cả turns từ đầu đến hiện tại
    // recentTurns đã được filter đúng phạm vi, không cần giới hạn thêm
    
    console.log(`→ Fallback Context for turn ${turn}:`);
    console.log(`   No SCC found, using turns 1-${turn-1}`);
    console.log(`   Recent Turns: ${recentTurns.length} turns`);
  }
  
  return {
    summary,
    sceneState: currentSceneState,
    recentTurns,
    deltaWindow: recentTurns.length // Số lượng turns thực tế thay vì giới hạn cố định
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

/**
 * Debug function to show delta calculation details
 * @param turn Current turn number
 */
export function debugDeltaContext(turn: number): void {
  const indexedSummaries = JSON.parse(localStorage.getItem('rp_summary_indexed') || '{}');
  const chatHistory = JSON.parse(localStorage.getItem('rp_chat') || '[]');
  
  console.log(`→ Debug Delta Context for Turn ${turn}:`);
  console.log(`   Available SCC Turns:`, Object.keys(indexedSummaries).map(Number).sort((a, b) => a - b));
  
  const summaryKeys = Object.keys(indexedSummaries)
    .map(Number)
    .filter(key => key < turn)
    .sort((a, b) => b - a);
  
  if (summaryKeys.length > 0) {
    const summaryTurn = summaryKeys[0];
    const deltaStartTurn = summaryTurn + 1;
    const deltaEndTurn = turn - 1;
    
    const deltaTurns = chatHistory.filter((msg: ChatMessage) => 
      msg.turn && msg.turn >= deltaStartTurn && msg.turn <= deltaEndTurn
    );
    
    console.log(`   ✓ Using SCC Turn: ${summaryTurn}`);
    console.log(`   → Delta Range: ${deltaStartTurn}-${deltaEndTurn} (${deltaEndTurn - deltaStartTurn + 1} turns)`);
    console.log(`   ○ Delta Turns Found: ${deltaTurns.length}`);
    console.log(`   ◎ Delta Window: Unlimited (all turns from SCC to current)`);
    console.log(`   ○ Final Delta:`, deltaTurns.map((t: ChatMessage) => `Turn ${t.turn}`));
  } else {
    const allTurns = chatHistory.filter((msg: ChatMessage) => 
      msg.turn && msg.turn < turn
    );
    console.log(`   ✗ No SCC found, using fallback`);
    console.log(`   → Fallback Range: 1-${turn-1} (${turn-1} turns)`);
    console.log(`   ○ All Turns Found: ${allTurns.length}`);
    console.log(`   ○ Final Turns:`, allTurns.map((t: ChatMessage) => `Turn ${t.turn}`));
  }
}
