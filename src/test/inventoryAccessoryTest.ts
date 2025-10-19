// Test file để kiểm tra inventory service với accessories
import { inventoryService } from '../services/inventoryService';
import { Character, InventoryItem } from '../types';

export function testInventoryAccessorySystem() {
  console.log('🧪 Testing Inventory Accessory System...');

  // Test 1: Create test character
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

  // Set character in inventory service
  inventoryService.setCharacter(testCharacter);

  // Test 2: Create test accessories
  const testAccessory1: InventoryItem = {
    id: 'test_ring_strength',
    name: 'Nhẫn Sức Mạnh',
    description: 'Tăng sức mạnh',
    type: 'misc',
    rarity: 'common',
    quantity: 1,
    icon: '💍',
    slot: 'accessory1',
    effects: ['stat_buff:strength:+2:permanent']
  };

  const testAccessory2: InventoryItem = {
    id: 'test_ring_agility',
    name: 'Nhẫn Nhanh Nhẹn',
    description: 'Tăng nhanh nhẹn',
    type: 'misc',
    rarity: 'common',
    quantity: 1,
    icon: '💍',
    slot: 'accessory2',
    effects: ['stat_buff:agility:+1:permanent']
  };

  const testMiscItem: InventoryItem = {
    id: 'test_misc',
    name: 'Misc Item',
    description: 'Misc item without slot',
    type: 'misc',
    rarity: 'common',
    quantity: 1,
    icon: '📦'
    // No slot - should not be equipable
  };

  // Test 3: Add items to inventory
  console.log('\n1. Adding items to inventory...');
  inventoryService.addItem(testAccessory1);
  inventoryService.addItem(testAccessory2);
  inventoryService.addItem(testMiscItem);
  console.log('✅ Items added to inventory');

  // Test 4: Test slot determination
  console.log('\n2. Testing slot determination...');
  const slot1 = inventoryService.getItemsForSlot('accessory1');
  const slot2 = inventoryService.getItemsForSlot('accessory2');
  const slot3 = inventoryService.getItemsForSlot('accessory3');
  console.log('Accessory1 items:', slot1.length);
  console.log('Accessory2 items:', slot2.length);
  console.log('Accessory3 items:', slot3.length);

  // Test 5: Test equiping accessories
  console.log('\n3. Testing accessory equipping...');
  console.log('Before equip - Strength:', testCharacter.coreStats.strength);
  
  const equipResult1 = inventoryService.equipItem(testAccessory1.id);
  console.log('Equip accessory1 result:', equipResult1);
  console.log('After equip accessory1 - Strength:', testCharacter.coreStats.strength);

  const equipResult2 = inventoryService.equipItem(testAccessory2.id);
  console.log('Equip accessory2 result:', equipResult2);
  console.log('After equip accessory2 - Agility:', testCharacter.coreStats.agility);

  // Test 6: Test unequiping accessories
  console.log('\n4. Testing accessory unequiping...');
  const unequipResult = inventoryService.unequipItem(testAccessory1.id);
  console.log('Unequip accessory1 result:', unequipResult);
  console.log('After unequip accessory1 - Strength:', testCharacter.coreStats.strength);

  // Test 7: Test misc item cannot be equipped
  console.log('\n5. Testing misc item cannot be equipped...');
  const miscEquipResult = inventoryService.equipItem(testMiscItem.id);
  console.log('Equip misc item result (should be false):', miscEquipResult);

  console.log('\n🎉 All inventory accessory tests completed!');
  return true;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testInventoryAccessorySystem = testInventoryAccessorySystem;
}
