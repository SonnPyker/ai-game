// Test script để verify round-robin hoạt động
// Chạy trong browser console sau khi load page

console.log('🧪 Testing Round-Robin Distribution...');

// Simulate multiple requests
const testPrompts = [
  'Test A - Prompt 1',
  'Test B - Prompt 2', 
  'Test C - Prompt 3',
  'Test D - Prompt 4',
  'Test E - Prompt 5'
];

// Track which key is used for each request
const keyUsage = {};

// Override console.log to capture round-robin logs
const originalLog = console.log;
const roundRobinLogs = [];

console.log = function(...args) {
  if (args[0] && args[0].includes('[Round-Robin]')) {
    roundRobinLogs.push(args);
  }
  originalLog.apply(console, args);
};

// Execute test
async function runTest() {
  console.log('🚀 Starting Round-Robin Test...');
  
  const promises = testPrompts.map(async (prompt, index) => {
    try {
      const response = await geminiService.generateContent(prompt);
      console.log(`✅ Request ${index + 1} completed`);
      return { index, prompt, success: true, response: response.substring(0, 50) };
    } catch (error) {
      console.log(`❌ Request ${index + 1} failed:`, error.message);
      return { index, prompt, success: false, error: error.message };
    }
  });
  
  const results = await Promise.allSettled(promises);
  
  console.log('\n📊 Round-Robin Test Results:');
  console.log('============================');
  
  roundRobinLogs.forEach(log => {
    console.log(log[0]);
  });
  
  console.log('\n📈 Summary:');
  console.log(`Total requests: ${testPrompts.length}`);
  console.log(`Round-robin assignments: ${roundRobinLogs.length}`);
  
  // Analyze key distribution
  const keyDistribution = {};
  roundRobinLogs.forEach(log => {
    const match = log[0].match(/to (\w+) \((\w+)\)/);
    if (match) {
      const accountName = match[1];
      const keyName = match[2];
      keyDistribution[accountName] = (keyDistribution[accountName] || 0) + 1;
    }
  });
  
  console.log('\n🎯 Key Distribution:');
  Object.entries(keyDistribution).forEach(([account, count]) => {
    console.log(`${account}: ${count} requests`);
  });
  
  // Check if distribution is balanced
  const counts = Object.values(keyDistribution);
  const isBalanced = counts.every(count => Math.abs(count - counts[0]) <= 1);
  
  console.log(`\n${isBalanced ? '✅' : '❌'} Distribution is ${isBalanced ? 'BALANCED' : 'UNBALANCED'}`);
  
  // Restore original console.log
  console.log = originalLog;
}

// Run test
runTest().catch(console.error);
