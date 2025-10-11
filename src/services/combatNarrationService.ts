import { Combatant } from './combatService';
import { CombatNarrationTemplate } from '../types/combat';

export class CombatNarrationService {
  private static instance: CombatNarrationService;

  public static getInstance(): CombatNarrationService {
    if (!CombatNarrationService.instance) {
      CombatNarrationService.instance = new CombatNarrationService();
    }
    return CombatNarrationService.instance;
  }

  private templates: CombatNarrationTemplate = {
    hit: [
      "{attacker} vung {weapon} chém xuống {defender}",
      "{attacker} đâm {weapon} vào {defender}",
      "{attacker} tung đòn {weapon} chí mạng vào {defender}",
      "{attacker} tấn công {defender} bằng {weapon}",
      "{attacker} lao tới và đánh {defender}",
      "{attacker} nhắm vào {defender} và tấn công",
      "{attacker} sử dụng {weapon} tấn công {defender}",
      "{attacker} ra đòn {weapon} mạnh mẽ vào {defender}",
      "{attacker} chém {weapon} qua không khí về phía {defender}",
      "{attacker} đâm {weapon} thẳng vào {defender}"
    ],
    miss: [
      "{attacker} tấn công {defender} nhưng trượt",
      "{defender} né tránh cú {weapon} của {attacker}",
      "{attacker} đánh {weapon} nhưng {defender} tránh được",
      "{defender} nhanh chóng lùi lại tránh {weapon}",
      "{attacker} ra đòn {weapon} nhưng {defender} phản xạ nhanh",
      "{defender} xoay người tránh cú tấn công của {attacker}",
      "{attacker} đâm {weapon} nhưng {defender} nhảy sang bên",
      "{defender} dùng {weapon} chặn đòn của {attacker}",
      "{attacker} tấn công nhưng {defender} phòng thủ tốt",
      "{defender} né tránh khéo léo cú {weapon} của {attacker}"
    ],
    critical: [
      "{attacker} tìm được khe hở và đâm {weapon} xuyên giáp {defender}!",
      "{attacker} ra đòn {weapon} chí mạng trúng tim {defender}!",
      "{attacker} tung {weapon} với sức mạnh tối đa vào {defender}!",
      "{attacker} tấn công {defender} với độ chính xác hoàn hảo!",
      "{attacker} sử dụng {weapon} tạo ra vết thương sâu trên {defender}!",
      "{attacker} đánh {weapon} trúng điểm yếu của {defender}!",
      "{attacker} ra đòn {weapon} với kỹ thuật điêu luyện!",
      "{attacker} tấn công {defender} với sức mạnh vượt trội!",
      "{attacker} sử dụng {weapon} tạo ra cú đánh hủy diệt!",
      "{attacker} tung {weapon} với tốc độ ánh sáng vào {defender}!"
    ],
    defend: [
      "{defender} nâng {weapon} phòng thủ",
      "{defender} chuẩn bị tư thế phòng thủ",
      "{defender} tập trung vào việc phòng thủ",
      "{defender} nâng khiên bảo vệ bản thân",
      "{defender} đứng vững trong tư thế phòng thủ",
      "{defender} chuẩn bị đón nhận tấn công",
      "{defender} tập trung năng lượng phòng thủ",
      "{defender} nâng {weapon} che chắn",
      "{defender} đứng trong tư thế phòng thủ vững chắc",
      "{defender} chuẩn bị chặn mọi tấn công"
    ],
    useItem: [
      "{user} sử dụng {item}",
      "{user} lấy ra {item} và sử dụng",
      "{user} nhanh chóng sử dụng {item}",
      "{user} dùng {item} để hỗ trợ bản thân",
      "{user} kích hoạt {item}",
      "{user} sử dụng {item} một cách khéo léo",
      "{user} lấy {item} ra và dùng ngay",
      "{user} sử dụng {item} với hiệu quả tối đa",
      "{user} dùng {item} để tăng cường sức mạnh",
      "{user} kích hoạt {item} với sự tập trung cao độ"
    ],
    ability: [
      "{user} sử dụng {ability}",
      "{user} kích hoạt khả năng đặc biệt {ability}",
      "{user} tập trung năng lượng và sử dụng {ability}",
      "{user} dùng {ability} với sức mạnh tối đa",
      "{user} kích hoạt {ability} một cách điêu luyện",
      "{user} sử dụng {ability} với độ chính xác cao",
      "{user} dùng {ability} để tạo lợi thế",
      "{user} kích hoạt {ability} với sự tập trung",
      "{user} sử dụng {ability} một cách thông minh",
      "{user} dùng {ability} để thay đổi cục diện"
    ],
    death: [
      "{defender} gục ngã và không thể tiếp tục chiến đấu",
      "{defender} bị đánh bại và ngã xuống",
      "{defender} mất ý thức và thua cuộc",
      "{defender} không thể đứng dậy sau cú đánh cuối",
      "{defender} bị hạ gục hoàn toàn",
      "{defender} thua cuộc và ngã xuống đất",
      "{defender} bị đánh bại và không còn khả năng chiến đấu",
      "{defender} gục ngã sau trận chiến ác liệt",
      "{defender} bị hạ gục và thua cuộc",
      "{defender} không thể tiếp tục và bị đánh bại"
    ],
    victory: [
      "Chiến thắng vang dội!",
      "Thắng lợi hoàn toàn!",
      "Chiến đấu kết thúc với thắng lợi!",
      "Đã đánh bại tất cả kẻ thù!",
      "Chiến thắng vẻ vang!",
      "Thắng cuộc một cách xuất sắc!",
      "Đã hoàn thành nhiệm vụ chiến đấu!",
      "Chiến thắng với sự dũng cảm!",
      "Đánh bại kẻ thù một cách vẻ vang!",
      "Thắng lợi với kỹ năng điêu luyện!"
    ],
    defeat: [
      "Bị đánh bại và thua cuộc",
      "Không thể tiếp tục chiến đấu",
      "Thua cuộc trong trận chiến",
      "Bị hạ gục và thất bại",
      "Không thể đứng dậy sau trận chiến",
      "Thua cuộc một cách đáng tiếc",
      "Bị đánh bại và mất ý thức",
      "Không thể hoàn thành nhiệm vụ",
      "Thua cuộc sau trận chiến ác liệt",
      "Bị hạ gục và thất bại hoàn toàn"
    ]
  };

  private adjectives = [
    "mạnh mẽ", "nhanh nhẹn", "chính xác", "khéo léo", "dũng cảm", "thông minh",
    "điêu luyện", "tinh tế", "quyết liệt", "mạnh mẽ", "nhanh chóng", "chính xác",
    "khéo léo", "dũng cảm", "thông minh", "điêu luyện", "tinh tế", "quyết liệt"
  ];

  // private verbs = [
  //   "vung", "đâm", "tung", "lao", "nhắm", "ra đòn", "chém", "đánh", "tấn công", "sử dụng"
  // ];

  /**
   * Tạo mô tả cho lượt chơi
   */
  public generateTurnDescription(
    combatant: Combatant,
    actions: any[],
    _isPlayerTurn: boolean = false
  ): string {
    if (actions.length === 0) {
      return `${combatant.name} đang suy nghĩ...`;
    }

    // Tạo mô tả tổng quan cho lượt chơi
    const mainAction = actions[0];
    let description = '';

    switch (mainAction.type) {
      case 'attack':
        description = this.generateAttackDescription(combatant, mainAction);
        break;
      case 'defend':
        description = this.generateDefendDescription(combatant);
        break;
      case 'heal':
        description = this.generateHealDescription(combatant, mainAction);
        break;
      case 'ability':
        description = this.generateAbilityDescription(combatant, mainAction);
        break;
      default:
        description = `${combatant.name} thực hiện hành động`;
    }

    // Thêm chi tiết nếu có nhiều hành động
    if (actions.length > 1) {
      const additionalActions = actions.slice(1);
      const additionalDesc = additionalActions.map(action => {
        switch (action.type) {
          case 'damage':
            return `gây ${action.damage} sát thương`;
          case 'heal':
            return `hồi ${action.heal} HP`;
          case 'status':
            return `áp dụng ${action.statusEffect}`;
          default:
            return action.message;
        }
      }).join(', ');
      
      if (additionalDesc) {
        description += ` và ${additionalDesc}`;
      }
    }

    return description;
  }

  /**
   * Tạo mô tả tấn công
   */
  private generateAttackDescription(combatant: Combatant, action: any): string {
    const weapon = action.weapon || 'vũ khí';
    const target = action.target || 'mục tiêu';
    const isHit = action.hit !== false;
    const isCritical = action.critical === true;

    let template: string;
    if (isCritical) {
      template = this.getRandomTemplate(this.templates.critical);
    } else if (isHit) {
      template = this.getRandomTemplate(this.templates.hit);
    } else {
      template = this.getRandomTemplate(this.templates.miss);
    }

    return this.replacePlaceholders(template, {
      attacker: combatant.name,
      defender: target,
      weapon: weapon
    });
  }

  /**
   * Tạo mô tả phòng thủ
   */
  private generateDefendDescription(combatant: Combatant): string {
    const template = this.getRandomTemplate(this.templates.defend);
    const weapon = combatant.attacks[0]?.name || 'vũ khí';
    
    return this.replacePlaceholders(template, {
      defender: combatant.name,
      weapon: weapon
    });
  }

  /**
   * Tạo mô tả hồi máu
   */
  private generateHealDescription(combatant: Combatant, action: any): string {
    const template = this.getRandomTemplate(this.templates.useItem);
    const item = action.item || 'thuốc hồi máu';
    
    return this.replacePlaceholders(template, {
      user: combatant.name,
      item: item
    });
  }

  /**
   * Tạo mô tả khả năng đặc biệt
   */
  private generateAbilityDescription(combatant: Combatant, action: any): string {
    const template = this.getRandomTemplate(this.templates.ability);
    const ability = action.ability || 'khả năng đặc biệt';
    
    return this.replacePlaceholders(template, {
      user: combatant.name,
      ability: ability
    });
  }

  /**
   * Tạo mô tả cái chết
   */
  public generateDeathDescription(combatant: Combatant): string {
    const template = this.getRandomTemplate(this.templates.death);
    return this.replacePlaceholders(template, {
      defender: combatant.name
    });
  }

  /**
   * Tạo mô tả chiến thắng
   */
  public generateVictoryDescription(): string {
    return this.getRandomTemplate(this.templates.victory);
  }

  /**
   * Tạo mô tả thất bại
   */
  public generateDefeatDescription(): string {
    return this.getRandomTemplate(this.templates.defeat);
  }

  /**
   * Lấy template ngẫu nhiên
   */
  private getRandomTemplate(templates: string[]): string {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Thay thế placeholders trong template
   */
  private replacePlaceholders(template: string, replacements: { [key: string]: string }): string {
    let result = template;
    
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    
    return result;
  }

  /**
   * Thêm tính từ ngẫu nhiên
   */
  public addRandomAdjective(text: string): string {
    const adjective = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
    return text.replace(/(vung|đâm|tung|lao|nhắm|ra đòn|chém|đánh|tấn công|sử dụng)/, 
      `$1 ${adjective}`);
  }

  /**
   * Tạo mô tả chi tiết cho hành động
   */
  public generateDetailedActionDescription(
    combatant: Combatant,
    action: any,
    target?: Combatant
  ): string {
    let description = this.generateTurnDescription(combatant, [action]);
    
    // Thêm chi tiết về kết quả
    if (action.hit && action.damage) {
      description += `, gây ${action.damage} sát thương`;
    }
    
    if (target && action.hit) {
      const hpPercent = (target.health.current / target.health.max) * 100;
      if (hpPercent < 25) {
        description += `, ${target.name} đang trong tình trạng nguy hiểm`;
      } else if (hpPercent < 50) {
        description += `, ${target.name} bị thương nặng`;
      }
    }
    
    return description;
  }

  /**
   * Tạo mô tả cho trạng thái
   */
  public generateStatusDescription(
    combatant: Combatant,
    statusEffect: string,
    isApplied: boolean = true
  ): string {
    const action = isApplied ? 'bị' : 'hết';
    return `${combatant.name} ${action} ${statusEffect}`;
  }

  /**
   * Tạo mô tả cho môi trường
   */
  public generateEnvironmentalDescription(
    effect: string,
    impact: string
  ): string {
    return `Môi trường ${effect} ${impact}`;
  }
}

export const combatNarrationService = CombatNarrationService.getInstance();
