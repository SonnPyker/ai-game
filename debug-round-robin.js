// Debug script để kiểm tra round-robin
// Chạy trong browser console

console.log('🔍 Debug Round-Robin Distribution...');

// Kiểm tra API keys hiện tại
const apiKeys = geminiService.getApiKeys();
console.log('📋 Available API Keys:');
apiKeys.forEach((key, index) => {
  console.log(`  ${index}: ${key.accountName} (${key.name}) - Active: ${key.isActive}`);
});

// Test với 3 requests đơn giản
const testPrompts = [
  'Test A - Simple prompt 1',
  'Test B - Simple prompt 2', 
  'Test C - Simple prompt 3'
];

console.log('\n🚀 Starting 3 parallel requests...');

// Execute requests
const promises = testPrompts.map(async (prompt, index) => {
  console.log(`📤 Starting request ${index + 1}: ${prompt}`);
  const startTime = Date.now();
  
  try {
    const response = await geminiService.generateContent(prompt);
    const duration = Date.now() - startTime;
    console.log(`✅ Request ${index + 1} completed in ${duration}ms`);
    return { index, success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Request ${index + 1} failed in ${duration}ms:`, error.message);
    return { index, success: false, duration, error: error.message };
  }
});

// Wait for all to complete
Promise.allSettled(promises).then(results => {
  console.log('\n📊 Final Results:');
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`  Request ${index + 1}: ${result.value.success ? 'SUCCESS' : 'FAILED'} (${result.value.duration}ms)`);
    } else {
      console.log(`  Request ${index + 1}: REJECTED (${result.reason})`);
    }
  });
  
  console.log('\n🔍 Check console logs above for round-robin assignment details...');
});
