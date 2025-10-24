import { Character, NPCRelationship } from '../types';
import { npcRelationshipService } from './npcRelationshipService';
import { combatPreparationService } from './combatPreparationService';

export interface RecruitResult {
  canRecruit: boolean;
  reason: string;
  acceptChance: number; // 0.0 to 1.0
}

export interface RecruitAttemptResult {
  success: boolean;
  message: string;
}

export class AllyManagementService {
  private static instance: AllyManagementService;

  public static getInstance(): AllyManagementService {
    if (!AllyManagementService.instance) {
      AllyManagementService.instance = new AllyManagementService();
    }
    return AllyManagementService.instance;
  }

  /**
   * Kiểm tra điều kiện chiêu mộ NPC
   */
  public canRecruitAlly(npcId: string): RecruitResult {
    const npc = npcRelationshipService.getRelationship(npcId);
    if (!npc) {
      return {
        canRecruit: false,
        reason: 'Không tìm thấy NPC',
        acceptChance: 0
      };
    }

    // Kiểm tra relationship level
    if (npc.relationshipLevel < 50) {
      return {
        canRecruit: false,
        reason: `Cần điểm quan hệ >= 50 (hiện tại: ${npc.relationshipLevel})`,
        acceptChance: 0
      };
    }

    // Kiểm tra số đồng minh hiện tại
    const currentAllies = this.getAllAllies();
    if (currentAllies.length >= 2) {
      return {
        canRecruit: false,
        reason: 'Đã có đủ 2 đồng minh (tối đa)',
        acceptChance: 0
      };
    }

    // Kiểm tra NPC đã là đồng minh chưa - kiểm tra cả isAlly và character.allies
    if (npc.isAlly) {
      return {
        canRecruit: false,
        reason: 'NPC này đã là đồng minh',
        acceptChance: 0
      };
    }

    // Kiểm tra thêm trong character.allies array để đảm bảo không có duplicate
    const characterData = this.getCurrentCharacter();
    if (characterData && characterData.allies && characterData.allies.includes(npcId)) {
      return {
        canRecruit: false,
        reason: 'NPC này đã là đồng minh (trong character.allies)',
        acceptChance: 0
      };
    }

    // Kiểm tra NPC có bị thương không
    if (npc.isInjured) {
      const currentTurn = this.getCurrentGameTurn();
      const turnsUntilHealed = (npc.injuredUntilTurn || 0) - currentTurn;
      return {
        canRecruit: false,
        reason: `NPC đang bị thương (hồi phục sau ${turnsUntilHealed} turn)`,
        acceptChance: 0
      };
    }

    // Tính tỷ lệ chấp nhận
    let acceptChance = 0.5; // 50% cho relationshipLevel 50-79
    if (npc.relationshipLevel >= 80) {
      acceptChance = 1.0; // 100% cho relationshipLevel >= 80
    }

    return {
      canRecruit: true,
      reason: 'Có thể chiêu mộ',
      acceptChance
    };
  }

  /**
   * Thực hiện chiêu mộ NPC
   */
  public async recruitAlly(npcId: string): Promise<RecruitAttemptResult> {
    const recruitStatus = this.canRecruitAlly(npcId);
    
    if (!recruitStatus.canRecruit) {
      return {
        success: false,
        message: recruitStatus.reason
      };
    }

    // Random check dựa trên acceptChance
    const randomValue = Math.random();
    if (randomValue > recruitStatus.acceptChance) {
      return {
        success: false,
        message: 'NPC từ chối lời mời làm đồng minh'
      };
    }

    try {
      // Lấy character hiện tại
      const characterData = this.getCurrentCharacter();
      if (!characterData) {
        return {
          success: false,
          message: 'Không tìm thấy dữ liệu nhân vật'
        };
      }

      // Cập nhật Character.allies - đảm bảo không có duplicate
      const currentAllies = characterData.allies || [];
      if (!currentAllies.includes(npcId)) {
        const updatedAllies = [...currentAllies, npcId];
        const updatedCharacter = {
          ...characterData,
          allies: updatedAllies
        };
        localStorage.setItem('currentCharacter', JSON.stringify(updatedCharacter));
      }

      // Cập nhật NPCRelationship
      const npc = npcRelationshipService.getRelationship(npcId);
      if (npc) {
        npc.isAlly = true;
        npcRelationshipService.addOrUpdateRelationship(npc);
      }

      // Prepare combat stats cho NPC
      try {
        await combatPreparationService.prepareNPCForCombat(npcId);
      } catch (error) {
        console.warn('Không thể prepare combat stats cho ally:', error);
        // Không fail recruitment vì combat stats có thể được tạo sau
      }

      return {
        success: true,
        message: `${npc?.name || 'NPC'} đã chấp nhận làm đồng minh!`
      };
    } catch (error) {
      console.error('Error recruiting ally:', error);
      return {
        success: false,
        message: 'Lỗi khi chiêu mộ đồng minh'
      };
    }
  }

  /**
   * Xóa đồng minh
   */
  public removeAlly(npcId: string): void {
    // Cập nhật Character.allies
    const characterData = this.getCurrentCharacter();
    if (characterData) {
      const updatedAllies = (characterData.allies || []).filter(id => id !== npcId);
      const updatedCharacter = {
        ...characterData,
        allies: updatedAllies
      };
      localStorage.setItem('currentCharacter', JSON.stringify(updatedCharacter));
    }

    // Cập nhật NPCRelationship
    const npc = npcRelationshipService.getRelationship(npcId);
    if (npc) {
      npc.isAlly = false;
      npcRelationshipService.addOrUpdateRelationship(npc);
    }
  }

  /**
   * Lấy danh sách đồng minh active (không bị injured)
   */
  public getActiveAllies(): NPCRelationship[] {
    return this.getAllAllies().filter(ally => !ally.isInjured);
  }

  /**
   * Lấy tất cả đồng minh
   */
  public getAllAllies(): NPCRelationship[] {
    // Đồng bộ hóa và loại bỏ duplicate trước khi lấy allies
    this.syncAndCleanAllies();
    
    const characterData = this.getCurrentCharacter();
    if (!characterData || !characterData.allies) {
      return [];
    }

    return characterData.allies
      .map(npcId => npcRelationshipService.getRelationship(npcId))
      .filter((npc): npc is NPCRelationship => npc !== undefined);
  }

  /**
   * Đánh dấu NPC bị thương
   */
  public injureAlly(npcId: string, currentGameTurn: number): void {
    const npc = npcRelationshipService.getRelationship(npcId);
    if (npc && npc.isAlly) {
      npc.isInjured = true;
      npc.injuredUntilTurn = currentGameTurn + 3; // Bị thương 3 turn
      npcRelationshipService.addOrUpdateRelationship(npc);
    }
  }

  /**
   * Kiểm tra và hồi phục NPC bị thương
   */
  public checkAndHealAllies(currentGameTurn: number): void {
    const allAllies = this.getAllAllies();
    
    allAllies.forEach(ally => {
      if (ally.isInjured && ally.injuredUntilTurn && currentGameTurn >= ally.injuredUntilTurn) {
        ally.isInjured = false;
        ally.injuredUntilTurn = undefined;
        npcRelationshipService.addOrUpdateRelationship(ally);
      }
    });
  }

  /**
   * Lấy character hiện tại từ localStorage
   */
  private getCurrentCharacter(): Character | null {
    try {
      const characterData = localStorage.getItem('currentCharacter');
      return characterData ? JSON.parse(characterData) : null;
    } catch (error) {
      console.error('Error loading character data:', error);
      return null;
    }
  }

  /**
   * Đồng bộ hóa và loại bỏ duplicate allies
   */
  public syncAndCleanAllies(): void {
    const characterData = this.getCurrentCharacter();
    if (!characterData) return;

    const currentAllies = characterData.allies || [];
    
    // Loại bỏ duplicate IDs
    const uniqueAllies = [...new Set(currentAllies)];
    
    // Kiểm tra từng ally có tồn tại và isAlly = true không
    const validAllies = uniqueAllies.filter(npcId => {
      const npc = npcRelationshipService.getRelationship(npcId);
      return npc && npc.isAlly === true;
    });

    // Cập nhật character.allies nếu có thay đổi
    if (validAllies.length !== currentAllies.length || 
        !validAllies.every((id, index) => currentAllies[index] === id)) {
      
      const updatedCharacter = {
        ...characterData,
        allies: validAllies
      };
      localStorage.setItem('currentCharacter', JSON.stringify(updatedCharacter));
      
    }
  }

  /**
   * Lấy current game turn từ localStorage
   */
  private getCurrentGameTurn(): number {
    try {
      const turnData = localStorage.getItem('gameTurnCounter');
      return turnData ? parseInt(turnData, 10) : 0;
    } catch (error) {
      console.error('Error loading game turn:', error);
      return 0;
    }
  }
}

export const allyManagementService = AllyManagementService.getInstance();
