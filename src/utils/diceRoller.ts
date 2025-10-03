/**
 * Dice Roller Utility for D&D
 * Hỗ trợ các loại dice chuẩn D&D: d2, d3, d4, d6, d8, d10, d12, d20, d100
 */

export interface DiceRoll {
  dice: string; // e.g., "d20", "2d6"
  result: number;
  rolls: number[]; // Individual dice results
  total: number;
  modifier?: number; // Optional modifier
  description?: string; // Optional description
}

export interface DiceRollResult {
  rolls: DiceRoll[];
  total: number;
  description?: string;
}

export class DiceRoller {
  /**
   * Roll a single die
   * @param sides Number of sides on the die
   * @returns Random number between 1 and sides
   */
  private static rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Parse dice notation (e.g., "2d6+3", "d20", "1d100")
   * @param notation Dice notation string
   * @returns Object with count, sides, and modifier
   */
  private static parseDiceNotation(notation: string): { count: number; sides: number; modifier: number } {
    const cleanNotation = notation.toLowerCase().replace(/\s/g, '');
    
    // Match patterns like "2d6+3", "d20", "1d100-2", etc.
    const match = cleanNotation.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    
    if (!match) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }
    
    const count = match[1] ? parseInt(match[1]) : 1;
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;
    
    if (count < 1 || count > 100) {
      throw new Error(`Invalid dice count: ${count}. Must be between 1 and 100.`);
    }
    
    if (sides < 2 || sides > 1000) {
      throw new Error(`Invalid dice sides: ${sides}. Must be between 2 and 1000.`);
    }
    
    return { count, sides, modifier };
  }

  /**
   * Roll dice based on notation
   * @param notation Dice notation (e.g., "2d6+3", "d20", "1d100")
   * @param description Optional description
   * @returns DiceRoll object
   */
  static roll(notation: string, description?: string): DiceRoll {
    const { count, sides, modifier } = this.parseDiceNotation(notation);
    
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(this.rollDie(sides));
    }
    
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
    
    return {
      dice: notation,
      result: total,
      rolls,
      total,
      modifier: modifier !== 0 ? modifier : undefined,
      description
    };
  }

  /**
   * Roll multiple dice notations
   * @param notations Array of dice notations
   * @param description Optional description for the entire roll
   * @returns DiceRollResult object
   */
  static rollMultiple(notations: string[], description?: string): DiceRollResult {
    const rolls = notations.map(notation => this.roll(notation));
    const total = rolls.reduce((sum, roll) => sum + roll.total, 0);
    
    return {
      rolls,
      total,
      description
    };
  }

  /**
   * Roll with advantage (roll twice, take higher)
   * @param notation Dice notation
   * @param description Optional description
   * @returns DiceRoll object with advantage result
   */
  static rollWithAdvantage(notation: string, description?: string): DiceRoll {
    const firstRoll = this.roll(notation);
    const secondRoll = this.roll(notation);
    
    const higherRoll = firstRoll.total >= secondRoll.total ? firstRoll : secondRoll;
    
    return {
      ...higherRoll,
      dice: `${notation} (Advantage)`,
      description: description ? `${description} (Advantage)` : 'Advantage'
    };
  }

  /**
   * Roll with disadvantage (roll twice, take lower)
   * @param notation Dice notation
   * @param description Optional description
   * @returns DiceRoll object with disadvantage result
   */
  static rollWithDisadvantage(notation: string, description?: string): DiceRoll {
    const firstRoll = this.roll(notation);
    const secondRoll = this.roll(notation);
    
    const lowerRoll = firstRoll.total <= secondRoll.total ? firstRoll : secondRoll;
    
    return {
      ...lowerRoll,
      dice: `${notation} (Disadvantage)`,
      description: description ? `${description} (Disadvantage)` : 'Disadvantage'
    };
  }

  /**
   * Roll for ability check with modifier
   * @param abilityModifier Ability modifier
   * @param description Optional description
   * @returns DiceRoll object
   */
  static abilityCheck(abilityModifier: number, description?: string): DiceRoll {
    const notation = `d20${abilityModifier >= 0 ? '+' : ''}${abilityModifier}`;
    return this.roll(notation, description || 'Ability Check');
  }

  /**
   * Roll for saving throw with modifier
   * @param saveModifier Saving throw modifier
   * @param description Optional description
   * @returns DiceRoll object
   */
  static savingThrow(saveModifier: number, description?: string): DiceRoll {
    const notation = `d20${saveModifier >= 0 ? '+' : ''}${saveModifier}`;
    return this.roll(notation, description || 'Saving Throw');
  }

  /**
   * Roll for attack with modifier
   * @param attackModifier Attack modifier
   * @param damageNotation Damage dice notation (e.g., "1d8+3")
   * @param description Optional description
   * @returns DiceRollResult with attack and damage rolls
   */
  static attack(attackModifier: number, damageNotation: string, description?: string): DiceRollResult {
    const attackRoll = this.roll(`d20${attackModifier >= 0 ? '+' : ''}${attackModifier}`, 'Attack Roll');
    const damageRoll = this.roll(damageNotation, 'Damage');
    
    return {
      rolls: [attackRoll, damageRoll],
      total: attackRoll.total + damageRoll.total,
      description: description || 'Attack'
    };
  }

  /**
   * Get available dice types
   * @returns Array of available dice types
   */
  static getAvailableDice(): string[] {
    return ['d2', 'd3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
  }

  /**
   * Get dice notation examples
   * @returns Array of dice notation examples
   */
  static getDiceExamples(): string[] {
    return [
      'd20',      // Single d20
      '2d6',      // Two d6s
      '1d8+3',    // One d8 plus 3
      '3d4-1',    // Three d4s minus 1
      '1d100',    // Percentile die
      '4d6',      // Four d6s (for ability scores)
      '2d6+2',    // Two d6s plus 2
      '1d12+5'    // One d12 plus 5
    ];
  }
}

// Export convenience functions
export const rollDice = DiceRoller.roll;
export const rollMultiple = DiceRoller.rollMultiple;
export const rollWithAdvantage = DiceRoller.rollWithAdvantage;
export const rollWithDisadvantage = DiceRoller.rollWithDisadvantage;
export const abilityCheck = DiceRoller.abilityCheck;
export const savingThrow = DiceRoller.savingThrow;
export const attack = DiceRoller.attack;
