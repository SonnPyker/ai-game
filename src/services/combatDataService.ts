import { CombatResultData } from '../types/combat';

class CombatDataService {
  private static instance: CombatDataService;
  private readonly STORAGE_KEY = 'combat_result';
  private readonly HISTORY_KEY = 'combat_history';

  public static getInstance(): CombatDataService {
    if (!CombatDataService.instance) {
      CombatDataService.instance = new CombatDataService();
    }
    return CombatDataService.instance;
  }

  // Save combat result
  public saveCombatResult(data: CombatResultData): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  // Get pending combat result
  public getPendingCombatResult(): CombatResultData | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  // Clear pending combat result
  public clearPendingCombatResult(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Add to combat history (for future use)
  public addToCombatHistory(data: CombatResultData): void {
    try {
      const history = this.getCombatHistory();
      if (Array.isArray(history)) {
        history.push(data);
        // Keep only last 50 combats
        if (history.length > 50) {
          history.shift();
        }
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
      } else {
        // If history is not an array, create new one
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify([data]));
      }
    } catch (error) {
      console.error('Error adding to combat history:', error);
    }
  }

  // Get combat history (for future use)
  public getCombatHistory(): CombatResultData[] {
    try {
      const data = localStorage.getItem(this.HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error parsing combat history:', error);
      return [];
    }
  }
}

export const combatDataService = CombatDataService.getInstance();
