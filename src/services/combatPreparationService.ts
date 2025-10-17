import { NPCRelationship } from '../types';
import { npcRelationshipService } from './npcRelationshipService';

export interface PreparationStatus {
  hasCombatStats: boolean;
  hasWeapon: boolean;
  hasValidLevel: boolean;
  isGenerating: boolean;
  errors: string[];
}

export class CombatPreparationService {
  private static instance: CombatPreparationService;

  public static getInstance(): CombatPreparationService {
    if (!CombatPreparationService.instance) {
      CombatPreparationService.instance = new CombatPreparationService();
    }
    return CombatPreparationService.instance;
  }

  /**
   * Kiểm tra và chuẩn bị NPC cho combat
   */
  public async prepareNPCForCombat(npcId: string): Promise<{
    npc: NPCRelationship;
    status: PreparationStatus;
  }> {
    const npc = npcRelationshipService.getRelationship(npcId);
    if (!npc) {
      throw new Error('Không tìm thấy NPC');
    }

    const status: PreparationStatus = {
      hasCombatStats: false,
      hasWeapon: false,
      hasValidLevel: false,
      isGenerating: false,
      errors: []
    };

    try {
      // Kiểm tra sơ bộ: nếu NPC đã sẵn sàng thì skip
      const isAlreadyReady = this.isNPCReadyForCombat(npc);
      if (isAlreadyReady) {
        status.hasCombatStats = true;
        status.hasWeapon = true;
        status.hasValidLevel = true;
        return { npc, status };
      }

      // Bước 1: Kiểm tra combat stats
      status.isGenerating = true;
      await this.checkAndGenerateCombatStats(npc, status);

      // Chỉ tiếp tục nếu có combat stats
      if (status.hasCombatStats) {
        // Bước 2: Kiểm tra vũ khí
        await this.checkAndGenerateWeapon(npc, status);

        // Bước 3: Kiểm tra level hợp lệ
        this.validateLevels(npc, status);

        // Bước 4: Lưu dữ liệu đã cập nhật
        npcRelationshipService.addOrUpdateRelationship(npc);
      }

    } catch (error) {
      console.error('Error preparing NPC for combat:', error);
      status.errors.push(`Lỗi chuẩn bị: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      status.isGenerating = false;
    }

    return { npc, status };
  }

  /**
   * Kiểm tra NPC đã sẵn sàng cho combat chưa
   */
  private isNPCReadyForCombat(npc: NPCRelationship): boolean {
    // Kiểm tra combat stats
    if (!npc.canBeCombatant || !this.isValidCombatStats(npc.combatStats)) {
      return false;
    }

    // Kiểm tra vũ khí
    if (!this.hasValidWeapon(npc.combatStats?.attacks)) {
      return false;
    }

    // Kiểm tra level
    const combatLevel = npc.combatStats?.combatLevel || npc.combatStats?.level;
    const characterLevel = npc.combatStats?.characterLevel || npc.level;
    
    if (!combatLevel || combatLevel < 1 || !characterLevel || characterLevel < 1) {
      return false;
    }

    return true;
  }

  /**
   * Kiểm tra và tạo combat stats nếu thiếu
   */
  private async checkAndGenerateCombatStats(npc: NPCRelationship, status: PreparationStatus): Promise<void> {
    // Kiểm tra kỹ hơn: chỉ tạo khi thực sự thiếu hoặc không hợp lệ
    const needsCombatStats = !npc.canBeCombatant || 
                           !npc.combatStats || 
                           !this.isValidCombatStats(npc.combatStats);
    
    if (needsCombatStats) {
      try {
        // Tạo combat stats mới với thông tin NPC đầy đủ
        const combatStats = npcRelationshipService.generateCombatStatsForNPC(npc.name, npc);
        
        // Cập nhật NPC
        npc.canBeCombatant = true;
        npc.combatStats = combatStats;
        
        status.hasCombatStats = true;
      } catch (error) {
        console.error('Error generating combat stats:', error);
        status.errors.push('Không thể tạo combat stats');
        status.hasCombatStats = false;
      }
    } else {
      status.hasCombatStats = true;
    }
  }

  /**
   * Kiểm tra combat stats có hợp lệ không
   */
  private isValidCombatStats(combatStats: any): boolean {
    if (!combatStats) return false;
    
    // Kiểm tra các field bắt buộc
    const hasValidLevel = (combatStats.combatLevel || combatStats.level) >= 1;
    const hasValidStats = combatStats.stats && 
                         combatStats.stats.strength && 
                         combatStats.stats.agility && 
                         combatStats.stats.constitution;
    const hasValidHealth = combatStats.health && 
                          combatStats.health.current > 0 && 
                          combatStats.health.max > 0;
    const hasValidAC = combatStats.armorClass && combatStats.armorClass > 0;
    
    return hasValidLevel && hasValidStats && hasValidHealth && hasValidAC;
  }

  /**
   * Kiểm tra và tạo vũ khí nếu thiếu
   */
  private async checkAndGenerateWeapon(npc: NPCRelationship, status: PreparationStatus): Promise<void> {
    // Kiểm tra kỹ hơn: chỉ tạo khi thực sự thiếu hoặc không hợp lệ
    const needsWeapon = !npc.combatStats?.attacks || 
                       !Array.isArray(npc.combatStats.attacks) ||
                       npc.combatStats.attacks.length === 0 || 
                       !this.hasValidWeapon(npc.combatStats.attacks);
    
    if (needsWeapon) {
      // Kiểm tra xem có nên dùng AI hay fallback ngay
      const shouldUseAI = this.shouldUseAIForWeapon(npc);
      
      if (shouldUseAI) {
        try {
          // Sử dụng AI để tạo vũ khí phù hợp
          const { geminiService } = await import('./geminiService');
          
          const prompt = this.buildWeaponGenerationPrompt(npc);
          const response = await geminiService.generateContent(prompt);
          
          if (response) {
            const weaponData = this.parseWeaponResponse(response);
            if (weaponData && npc.combatStats) {
              npc.combatStats.attacks = [weaponData];
              status.hasWeapon = true;
            } else {
              throw new Error('Không thể parse vũ khí từ AI');
            }
          } else {
            throw new Error('AI không phản hồi');
          }
        } catch (error) {
          console.error('Error generating AI weapon:', error);
          status.errors.push('Không thể tạo vũ khí AI');
          
          // Fallback: tạo vũ khí cơ bản
          this.createFallbackWeapon(npc, status);
        }
      } else {
        // Dùng fallback ngay nếu không cần AI
        this.createFallbackWeapon(npc, status);
      }
    } else {
      status.hasWeapon = true;
    }
  }

  /**
   * Kiểm tra vũ khí có hợp lệ không
   */
  private hasValidWeapon(attacks: any): boolean {
    // Kiểm tra attacks có phải là array không
    if (!Array.isArray(attacks) || attacks.length === 0) return false;
    
    return attacks.some(attack => 
      attack && 
      attack.name && 
      attack.attackBonus !== undefined && 
      attack.damage && 
      attack.damageType &&
      attack.attackBonus >= 0 &&
      attack.damage.length > 0
    );
  }

  /**
   * Quyết định có nên dùng AI cho vũ khí không
   */
  private shouldUseAIForWeapon(npc: NPCRelationship): boolean {
    // Chỉ dùng AI nếu NPC có đủ thông tin context
    const hasContext = npc.description || 
                      (npc as any).personalInfo?.occupation?.value || 
                      npc.faction || 
                      npc.location ||
                      (npc.tags && npc.tags.length > 0);
    
    // Chỉ dùng AI nếu combat level >= 2 (tránh AI cho NPC yếu)
    const combatLevel = npc.combatStats?.combatLevel || npc.combatStats?.level || 1;
    const isHighLevel = combatLevel >= 2;
    
    return hasContext && isHighLevel;
  }

  /**
   * Tạo vũ khí fallback cơ bản
   */
  private createFallbackWeapon(npc: NPCRelationship, status: PreparationStatus): void {
    if (!npc.combatStats) {
      status.errors.push('Không thể tạo vũ khí: thiếu combat stats');
      status.hasWeapon = false;
      return;
    }

    const stats = npc.combatStats.stats;
    const combatLevel = npc.combatStats.combatLevel || npc.combatStats.level || 1;
    
    // Tạo vũ khí cơ bản dựa trên stats
    const strengthMod = stats?.modifiers?.strength || 0;
    const agilityMod = stats?.modifiers?.agility || 0;
    const primaryMod = Math.max(strengthMod, agilityMod);
    
    npc.combatStats.attacks = [{
      name: "Tấn công cơ bản",
      attackBonus: 2 + primaryMod + Math.floor(combatLevel / 2),
      damage: `${Math.floor(combatLevel / 2) + 1}d4+${primaryMod}`,
      damageType: "bludgeoning" as const
    }];
    
    status.hasWeapon = true;
  }

  /**
   * Kiểm tra level hợp lệ
   */
  private validateLevels(npc: NPCRelationship, status: PreparationStatus): void {
    if (!npc.combatStats) {
      status.hasValidLevel = false;
      status.errors.push('Thiếu combat stats');
      return;
    }

    const combatLevel = npc.combatStats.combatLevel || npc.combatStats.level;
    const characterLevel = npc.combatStats.characterLevel || npc.level;

    if (!combatLevel || combatLevel < 1) {
      status.hasValidLevel = false;
      status.errors.push('Combat level không hợp lệ');
      return;
    }

    if (!characterLevel || characterLevel < 1) {
      status.hasValidLevel = false;
      status.errors.push('Character level không hợp lệ');
      return;
    }

    status.hasValidLevel = true;
  }

  /**
   * Tạo prompt AI cho vũ khí
   */
  private buildWeaponGenerationPrompt(npc: NPCRelationship): string {
    const description = npc.description || '';
    const occupation = (npc as any).personalInfo?.occupation?.value || '';
    const faction = npc.faction || '';
    const location = npc.location || '';
    const tags = npc.tags || [];
    const combatLevel = npc.combatStats?.combatLevel || npc.combatStats?.level || 1;
    const stats = npc.combatStats?.stats;
    
    return `Tạo vũ khí phù hợp cho NPC dựa trên thông tin sau:

THÔNG TIN NPC:
- Tên: "${npc.name}"
- Mô tả: "${description}"
- Nghề nghiệp: "${occupation}"
- Phe phái: "${faction}"
- Vị trí: "${location}"
- Tags: ${tags.join(', ')}
- Combat Level: ${combatLevel}
- Stats: STR ${stats?.strength || 10} (${stats?.modifiers?.strength || 0}), AGI ${stats?.agility || 10} (${stats?.modifiers?.agility || 0}), INT ${stats?.intelligence || 10} (${stats?.modifiers?.intelligence || 0})

QUY TẮC TẠO VŨ KHÍ PHÙ HỢP:

1. **Dựa trên nghề nghiệp:**
   - Quân sự/Guard: Kiếm, giáo, cung tên, khiên
   - Thương gia: Dao găm, gậy, vũ khí ẩn
   - Thầy tu/Clergy: Gậy thánh, vũ khí thiêng
   - Thợ thủ công: Búa, dao, công cụ
   - Nông dân: Liềm, cuốc, gậy
   - Thợ săn: Cung tên, dao, lao
   - Pháp sư: Gậy phép, quyển sách, pha lê
   - Kẻ trộm: Dao găm, phi tiêu, vũ khí nhỏ

2. **Dựa trên phe phái:**
   - Hội Tuần Đêm: Kiếm dài, cung tên, áo giáp
   - Thành phố: Vũ khí dân sự, gậy, dao
   - Bandit: Vũ khí cướp được, dao, cung
   - Noble: Kiếm đắt tiền, vũ khí trang trí

3. **Dựa trên vị trí:**
   - Rừng: Cung tên, dao, lao
   - Thành phố: Vũ khí dân sự, gậy
   - Núi: Búa, cuốc, vũ khí nặng
   - Biển: Dao, lao, vũ khí nhỏ

4. **Dựa trên level:**
   - Level 1-2: Vũ khí cơ bản, đơn giản
   - Level 3-4: Vũ khí chất lượng tốt
   - Level 5+: Vũ khí đặc biệt, ma thuật

5. **Dựa trên stats:**
   - STR cao: Vũ khí nặng (kiếm, búa, giáo)
   - AGI cao: Vũ khí nhanh (dao, cung, phi tiêu)
   - INT cao: Vũ khí ma thuật (gậy, quyển sách)

Hãy tạo 1 vũ khí phù hợp nhất theo format JSON:
{
  "name": "Tên vũ khí (tiếng Việt)",
  "attackBonus": ${2 + Math.max(stats?.modifiers?.strength || 0, stats?.modifiers?.agility || 0) + Math.floor(combatLevel / 2)},
  "damage": "${Math.floor(combatLevel / 2) + 1}d6+${Math.max(stats?.modifiers?.strength || 0, stats?.modifiers?.agility || 0)}",
  "damageType": "physical|magical|fire|cold|lightning|poison|psychic",
  "range": ${(stats?.modifiers?.agility || 0) > (stats?.modifiers?.strength || 0) ? 60 : undefined},
  "description": "Mô tả ngắn về vũ khí"
}

Chỉ trả về JSON, không có text khác.`;
  }

  /**
   * Parse response AI thành weapon data
   */
  private parseWeaponResponse(response: string): any | null {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      const weaponData = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!weaponData.name || !weaponData.attackBonus || !weaponData.damage || !weaponData.damageType) {
        return null;
      }
      
      return weaponData;
    } catch (error) {
      console.error('Error parsing weapon response:', error);
      return null;
    }
  }
}

export const combatPreparationService = CombatPreparationService.getInstance();
