// Test script để kiểm tra việc sinh accessories với effects
console.log('🧪 Testing Accessory Generation...\n');

// Test data mẫu
const testAccessories = [
  {
    id: "accessory_ring_strength",
    name: "Nhẫn Sức Mạnh",
    description: "Tăng sức mạnh cho người đeo",
    type: "misc",
    rarity: "common",
    quantity: 1,
    icon: "💍",
    slot: "accessory1",
    effects: ["stat_buff:strength:+1:permanent"],
    value: 30,
    tags: ["accessory", "magical"]
  },
  {
    id: "accessory_bracelet_intelligence",
    name: "Vòng Tay Thông Minh",
    description: "Tăng trí tuệ và nhanh nhẹn",
    type: "misc",
    rarity: "uncommon",
    quantity: 1,
    icon: "⌚",
    slot: "accessory2",
    effects: ["stat_buff:intelligence:+2:permanent", "stat_buff:agility:+2:permanent"],
    value: 80,
    tags: ["accessory", "magical"]
  },
  {
    id: "accessory_necklace_epic",
    name: "Vòng Cổ Huyền Thoại",
    description: "Phụ kiện huyền thoại với nhiều hiệu ứng",
    type: "misc",
    rarity: "epic",
    quantity: 1,
    icon: "🔮",
    slot: "accessory3",
    effects: [
      "stat_buff:strength:+4:permanent",
      "stat_buff:agility:+4:permanent",
      "stat_buff:intelligence:+4:permanent"
    ],
    value: 500,
    tags: ["accessory", "magical", "legendary"]
  }
];

// Test validation
console.log('📋 Testing Accessory Validation:');
testAccessories.forEach((accessory, index) => {
  console.log(`\n${index + 1}. ${accessory.name} (${accessory.rarity})`);
  
  // Check required fields
  const hasSlot = accessory.slot && ['accessory1', 'accessory2', 'accessory3'].includes(accessory.slot);
  const hasEffects = accessory.effects && accessory.effects.length > 0;
  const hasType = accessory.type === 'misc';
  const hasNoWeaponStats = !accessory.damage && !accessory.attackBonus && !accessory.armorClass;
  
  console.log(`   ✅ Slot: ${hasSlot ? '✓' : '✗'} (${accessory.slot})`);
  console.log(`   ✅ Effects: ${hasEffects ? '✓' : '✗'} (${accessory.effects?.length || 0} effects)`);
  console.log(`   ✅ Type: ${hasType ? '✓' : '✗'} (${accessory.type})`);
  console.log(`   ✅ No Weapon Stats: ${hasNoWeaponStats ? '✓' : '✗'}`);
  
  // Check effects format
  if (hasEffects) {
    console.log(`   📊 Effects Details:`);
    accessory.effects.forEach((effect, i) => {
      const parts = effect.split(':');
      const isValidFormat = parts.length === 4 && 
                           parts[0] === 'stat_buff' && 
                           parts[3] === 'permanent' &&
                           parts[2].startsWith('+');
      
      console.log(`      ${i + 1}. ${effect} ${isValidFormat ? '✓' : '✗'}`);
    });
  }
  
  // Check rarity vs effects count
  const expectedEffects = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 3,
    legendary: 4
  };
  
  const actualEffects = accessory.effects?.length || 0;
  const expected = expectedEffects[accessory.rarity] || 1;
  const rarityMatch = actualEffects >= expected;
  
  console.log(`   🎯 Rarity Match: ${rarityMatch ? '✓' : '✗'} (Expected: ${expected}, Got: ${actualEffects})`);
});

console.log('\n🎉 Test completed!');
