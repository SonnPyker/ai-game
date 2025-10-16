/**
 * Test file for enemyFromContextService
 * This is a simple test to verify the implementation works correctly
 */

import { enemyFromContextService } from '../services/enemyFromContextService';
import { SCCState } from '../types';

// Mock data for testing
const mockSceneState: SCCState = {
  location: {
    name: 'Dark Forest',
    description: 'A mysterious forest filled with dangerous creatures',
    type: 'forest',
    atmosphere: 'dangerous',
    features: ['trees', 'shadows', 'strange sounds']
  },
  npcs: [
    {
      id: 'npc_1',
      name: 'Tinh Linh Lá',
      description: 'A leaf spirit with glowing green eyes and ethereal form',
      role: 'spirit',
      mood: 'hostile',
      dialogue: 'You dare to attack me!',
      position: 'floating',
      status: 'alive'
    },
    {
      id: 'npc_2', 
      name: 'Linh Hầu thủ vệ',
      description: 'A guardian monkey spirit with red eyes and sharp claws',
      role: 'guardian',
      mood: 'angry',
      dialogue: 'I will protect this place!',
      position: 'on_branch',
      status: 'alive'
    }
  ],
  environment: {
    lighting: 'dim',
    temperature: 'cool',
    humidity: 'humid',
    wind: 'calm',
    sounds: 'mysterious',
    smells: 'earthy'
  }
};

// Test cases
const testCases = [
  {
    name: 'Specific enemy name (should save)',
    enemyName: 'Tinh Linh Lá',
    expectedSave: true,
    description: 'Should save to relationships because it\'s a specific named entity'
  },
  {
    name: 'Generic enemy name (should not save)',
    enemyName: 'con sói',
    expectedSave: false,
    description: 'Should not save because it\'s a generic enemy name'
  },
  {
    name: 'Enemy from scene NPCs',
    enemyName: 'Linh Hầu thủ vệ',
    expectedSave: true,
    description: 'Should save because it\'s a specific named entity from scene'
  },
  {
    name: 'New enemy not in scene',
    enemyName: 'Thành Phố Lá',
    expectedSave: true,
    description: 'Should save because it\'s a specific named entity (not generic)'
  },
  {
    name: 'Generic group enemy',
    enemyName: 'những người',
    expectedSave: false,
    description: 'Should not save because it\'s a generic group name'
  }
];

// Test function
async function runTests() {
  console.log('🧪 Testing enemyFromContextService...\n');
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`Enemy name: "${testCase.enemyName}"`);
    
    try {
      const result = await enemyFromContextService.createEnemyFromContext(
        testCase.enemyName,
        mockSceneState,
        5 // player level
      );
      
      if (result.enemy) {
        console.log(`✅ Enemy created successfully`);
        console.log(`   - Name: ${result.enemy.name}`);
        console.log(`   - Level: ${result.enemy.combatStats?.combatLevel || 'N/A'}`);
        console.log(`   - Health: ${result.enemy.combatStats?.health?.max || 'N/A'}`);
        console.log(`   - AC: ${result.enemy.combatStats?.armorClass || 'N/A'}`);
        console.log(`   - Should save: ${result.shouldSaveToRelationships}`);
        
        // Check if save decision matches expectation
        if (result.shouldSaveToRelationships === testCase.expectedSave) {
          console.log(`✅ Save decision correct`);
        } else {
          console.log(`❌ Save decision incorrect. Expected: ${testCase.expectedSave}, Got: ${result.shouldSaveToRelationships}`);
        }
      } else {
        console.log(`❌ Failed to create enemy`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
    
    console.log('---\n');
  }
  
  console.log('🏁 Testing completed!');
}

// Export for potential use in other test files
export { runTests, testCases, mockSceneState };

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runTests().catch(console.error);
} else {
  // Browser environment - expose for manual testing
  (window as any).testEnemyFromContextService = runTests;
  console.log('Test function available as window.testEnemyFromContextService()');
}
