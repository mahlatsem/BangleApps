// Test data generator for Bangle.js intentionality app
// Generates test data with GMT+2 timezone offset

function generateTestData() {
  // Use current time (Date.now() is already in UTC, watch handles timezone display)
  const now = Date.now();
  const actions = [];
  
  // Generate 30 test actions, one every minute starting 1 minute from now
  for (let i = 1; i <= 30; i++) {
    const startTime = now + (i * 60000); // i minutes from current time
    const endTime = startTime + 60000;   // 1 minute duration
    
    actions.push({
      name: `TEST ${i}`,
      category: "test",
      startTime: startTime,
      endTime: endTime
    });
  }
  
  const testData = {
    actions: actions,
    lifePercentage: 58.73,
    promptTimeout: 10000,
    repromptInterval: 30000
  };
  
  // Save to test storage file
  require("Storage").writeJSON("intentionality-test.json", testData);
  
  
  return testData;
}

// For Node.js execution (used by sync script)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateTestData };
}

// Uncomment to run in Web IDE:
// generateTestData();