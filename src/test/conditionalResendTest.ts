/**
 * Test file for conditional resend button functionality
 * Tests the logic for showing/hiding resend button based on action type
 */

import { ActionLogEntry } from '../services/actionSuggestionService';

// Mock data for testing
const mockActionLog: ActionLogEntry[] = [
  {
    id: 'action_1',
    actionId: 'suggestion_1',
    text: 'Khám phá khu vực xung quanh',
    summary: 'Khám phá khu vực xung quanh',
    durationMinutes: 30,
    startedAt: { hour: 10, minute: 0, day: 1, month: 1, year: 1, dayOfWeek: 1 },
    endedAt: { hour: 10, minute: 30, day: 1, month: 1, year: 1, dayOfWeek: 1 },
    turn: 1,
    impactTags: ['story'],
    source: 'suggestion'
  },
  {
    id: 'action_2',
    text: 'Tôi sẽ đi đến quán rượu',
    summary: 'Di chuyển đến quán rượu',
    durationMinutes: 15,
    startedAt: { hour: 10, minute: 30, day: 1, month: 1, year: 1, dayOfWeek: 1 },
    endedAt: { hour: 10, minute: 45, day: 1, month: 1, year: 1, dayOfWeek: 1 },
    turn: 2,
    impactTags: ['travel'],
    source: 'travel'
  },
  {
    id: 'action_3',
    text: 'Tôi sẽ nói chuyện với người dân địa phương',
    summary: 'Nói chuyện với người dân địa phương',
    durationMinutes: 20,
    startedAt: { hour: 10, minute: 45, day: 1, month: 1, year: 1, dayOfWeek: 1 },
    endedAt: { hour: 11, minute: 5, day: 1, month: 1, year: 1, dayOfWeek: 1 },
    turn: 3,
    impactTags: ['relationship'],
    source: 'manual'
  }
];

// Mock chat history
const mockChatHistory = [
  {
    role: 'player' as const,
    content: 'Khám phá khu vực xung quanh',
    timestamp: new Date(),
    turn: 1
  },
  {
    role: 'ai' as const,
    content: 'Bạn bắt đầu khám phá khu vực xung quanh...',
    timestamp: new Date(),
    turn: 1
  },
  {
    role: 'player' as const,
    content: 'Tôi sẽ đi đến quán rượu',
    timestamp: new Date(),
    turn: 2
  },
  {
    role: 'ai' as const,
    content: 'Bạn di chuyển đến quán rượu...',
    timestamp: new Date(),
    turn: 2
  },
  {
    role: 'player' as const,
    content: 'Tôi sẽ nói chuyện với người dân địa phương',
    timestamp: new Date(),
    turn: 3
  },
  {
    role: 'ai' as const,
    content: 'Bạn bắt đầu nói chuyện với người dân địa phương...',
    timestamp: new Date(),
    turn: 3
  }
];

// Test function for shouldShowResendButton logic
function shouldShowResendButton(messageIndex: number, actionLog: ActionLogEntry[], chatHistory: any[]): boolean {
  const message = chatHistory[messageIndex];
  if (!message || message.role !== 'player') return false;
  
  // Kiểm tra loại hành động của tin nhắn này
  const messageTurn = message.turn;
  if (messageTurn) {
    // Tìm action log entry tương ứng với turn này
    const actionEntry = actionLog.find(entry => entry.turn === messageTurn);
    
    if (actionEntry) {
      // Chỉ hiển thị nút gửi lại cho hành động manual (thủ công/chat)
      return actionEntry.source === 'manual';
    }
  }
  
  // Mặc định hiển thị nút gửi lại cho tin nhắn player (backward compatibility)
  return true;
}

// Test cases
function runTests() {
  console.log('🧪 Testing conditional resend button functionality...\n');
  
  // Test case 1: Suggestion action (should NOT show resend button)
  const test1 = shouldShowResendButton(0, mockActionLog, mockChatHistory);
  console.log(`Test 1 - Suggestion action (turn 1): ${test1 ? '❌ FAIL' : '✅ PASS'} (Expected: false, Got: ${test1})`);
  
  // Test case 2: Travel action (should NOT show resend button)
  const test2 = shouldShowResendButton(2, mockActionLog, mockChatHistory);
  console.log(`Test 2 - Travel action (turn 2): ${test2 ? '❌ FAIL' : '✅ PASS'} (Expected: false, Got: ${test2})`);
  
  // Test case 3: Manual action (should show resend button)
  const test3 = shouldShowResendButton(4, mockActionLog, mockChatHistory);
  console.log(`Test 3 - Manual action (turn 3): ${test3 ? '✅ PASS' : '❌ FAIL'} (Expected: true, Got: ${test3})`);
  
  // Test case 4: AI message (should NOT show resend button)
  const test4 = shouldShowResendButton(1, mockActionLog, mockChatHistory);
  console.log(`Test 4 - AI message: ${test4 ? '❌ FAIL' : '✅ PASS'} (Expected: false, Got: ${test4})`);
  
  // Test case 5: Message without action log entry (should show resend button for backward compatibility)
  const test5 = shouldShowResendButton(5, [], mockChatHistory);
  console.log(`Test 5 - No action log entry: ${test5 ? '✅ PASS' : '❌ FAIL'} (Expected: true, Got: ${test5})`);
  
  console.log('\n📊 Test Summary:');
  const results = [test1, test2, test3, test4, test5];
  const expectedResults = [false, false, true, false, true];
  const passedTests = results.filter((result, index) => result === expectedResults[index]).length;
  console.log(`Passed: ${passedTests}/${results.length} tests`);
  
  if (passedTests === results.length) {
    console.log('🎉 All tests passed! Conditional resend button logic is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }
}

// Run tests
runTests();

export { shouldShowResendButton, mockActionLog, mockChatHistory };
