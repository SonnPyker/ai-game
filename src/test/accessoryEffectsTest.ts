// Test file để kiểm tra accessory effects system
import { accessoryEffectService } from '../services/accessoryEffectService';
import { inventoryService } from '../services/inventoryService';
import { Character, InventoryItem } from '../types';

export function testAccessoryEffectsSystem() {
  console.log('🧪 Testing Accessory Effects System...');

  // Test 1: Parse accessory effect
  console.log('\n1. Testing effect parsing:');
  const testEffect = "stat_buff:strength:+2:permanent";
  const parsed = accessoryEffectService.parseAccessoryEffect(testEffect);
  console.log('✅ Parsed effect:', parsed);

  // Test 2: Format effects for UI
  console.log('\n2. Testing effect formatting:');
  const testItem: InventoryItem = {
    id: 'test_ring',
    name: 'Test Ring',
    description: 'A test ring',
    type: 'misc',
    rarity: 'common',
    quantity: 1,
    icon: '💍',
    slot: 'accessory1',
    effects: [
      'stat_buff:strength:+2:permanent',
      'stat_buff:agility:+1:permanent'
    ]
  };

  const formatted = accessoryEffectService.getFormattedEffects(testItem);
  console.log('✅ Formatted effects:', formatted);

  // Test 3: Validate effects
  console.log('\n3. Testing effect validation:');
  const validation = accessoryEffectService.validateAccessoryEffects(testItem);
  console.log('✅ Validation result:', validation);

  // Test 4: Character stats application
  console.log('\n4. Testing character stats application:');
  const testCharacter: Character = {
    name: 'Test Character',
    backstory: 'Test',
    gender: 'male',
    coreStats: {
      strength: 10,
      agility: 10,
      intelligence: 10,
      constitution: 10,
      wisdom: 10,
      charisma: 10,
      armorClass: 10,
      modifiers: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        constitution: 0,
        wisdom: 0,
        charisma: 0
      }
    },
    health: {
      current: 10,
      max: 10
    }
  };

  console.log('Before applying effects:', testCharacter.coreStats);
  const applied = accessoryEffectService.applyAccessoryEffectsToCharacter(testCharacter, testItem);
  console.log('After applying effects:', testCharacter.coreStats);
  console.log('✅ Effects applied:', applied);

  // Test 5: Remove effects
  console.log('\n5. Testing effect removal:');
  const removed = accessoryEffectService.removeAccessoryEffectsFromCharacter(testCharacter, testItem);
  console.log('After removing effects:', testCharacter.coreStats);
  console.log('✅ Effects removed:', removed);

  console.log('\n🎉 All accessory effects tests completed!');
  return true;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testAccessoryEffectsSystem = testAccessoryEffectsSystem;
}
