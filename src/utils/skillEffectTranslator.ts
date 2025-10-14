// Utility function to translate skill effect format to human-readable text
export const translateEffectFormat = (effect: string | string[]): string => {
  if (!effect) return 'Chưa có effect';

  // Handle array of effects
  if (Array.isArray(effect)) {
    return effect.map(e => translateSingleEffect(e)).join(' • ');
  }

  return translateSingleEffect(effect);
};

const translateSingleEffect = (effect: string): string => {
  if (!effect) return 'Chưa có effect';

  try {
    const parts = effect.split(':');
    if (parts.length < 2) return effect;

    const effectType = parts[0];
    const effectValue = parts[1];
    const duration = parts[3] || 'instant';

    switch (effectType) {
      case 'instant_damage':
        return `Gây ${effectValue} sát thương ngay lập tức`;

      case 'instant_heal':
        return `Hồi phục ${effectValue} HP ngay lập tức`;

      case 'defend':
        return `Phòng thủ (giảm 50% sát thương nhận vào)`;

      case 'damage_buff':
        const damageValue = effectValue.replace('+', '');
        return `Tăng sát thương +${damageValue} trong ${duration === 'instant' ? 'ngay lập tức' : duration.replace('turns', ' lượt')}`;

      case 'heal':
        const healValue = effectValue.replace('+', '');
        return `Hồi phục ${healValue} HP ${duration === 'instant' ? 'ngay lập tức' : 'trong ' + duration.replace('turns', ' lượt')}`;

      case 'stat_buff':
        const statParts = effectValue.split('+');
        const statName = statParts[0];
        const statValue = statParts[1] || '1';
        const statNames: { [key: string]: string } = {
          'ac': 'AC (Phòng thủ)',
          'strength': 'Sức mạnh',
          'agility': 'Nhanh nhẹn',
          'constitution': 'Thể chất',
          'intelligence': 'Trí tuệ',
          'wisdom': 'Khôn ngoan',
          'charisma': 'Sức hút'
        };
        return `Tăng ${statNames[statName] || statName} +${statValue} trong ${duration.replace('turns', ' lượt')}`;

      case 'stat_debuff':
        const debuffParts = effectValue.split('+');
        const debuffName = debuffParts[0];
        const debuffValue = debuffParts[1] || '1';
        const debuffNames: { [key: string]: string } = {
          'ac': 'AC (Phòng thủ)',
          'strength': 'Sức mạnh',
          'agility': 'Nhanh nhẹn',
          'constitution': 'Thể chất',
          'intelligence': 'Trí tuệ',
          'wisdom': 'Khôn ngoan',
          'charisma': 'Sức hút'
        };
        return `Giảm ${debuffNames[debuffName] || debuffName} +${debuffValue} trong ${duration.replace('turns', ' lượt')}`;

      case 'social_buff':
        const socialParts = effectValue.split('+');
        const socialType = socialParts[0];
        const socialValue = socialParts[1] || '1';
        const socialNames: { [key: string]: string } = {
          'persuasion': 'Thuyết phục',
          'charm': 'Quyến rũ',
          'intimidation': 'Đe dọa',
          'deception': 'Lừa dối'
        };
        return `Tăng ${socialNames[socialType] || socialType} +${socialValue} trong ${duration.replace('turns', ' lượt')}`;

      default:
        return effect;
    }
  } catch (error) {
    return effect;
  }
};
