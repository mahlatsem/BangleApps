# Intentionality Watch - Testing Files

## Test Data for Overlay Testing

### intentionality-test.json (Ready to Use)
**Automatically generated test data with GMT+2 timezone support.**

**Usage:**
1. Download `intentionality-test.json` from BangleApps repository
2. In Web IDE Storage, upload it and rename to `intentionality.json`
3. Install Intentionality app
4. Overlay will appear every minute for 30 minutes

*This file is automatically regenerated with current timestamps on every sync.*

### generate-test-data.js (Manual Generation)
Script to generate fresh test data - **automatically uploaded with the app**.

**Web IDE Console Usage:**
1. Install the Intentionality app (includes generator automatically)
2. In Web IDE console: `eval(require("Storage").read("generate-test-data.js")); generateTestData();`
3. Creates `intentionality.json` with GMT+2 timezone adjustment

**Hardware Terminal Usage:**
1. Access JavaScript console on hardware
2. Run: `eval(require("Storage").read("generate-test-data.js")); generateTestData();`
3. Verify: `require("Storage").readJSON("intentionality.json")`

### test-data-static.json (Backup)
Static test data with fixed timestamps (will need manual timestamp updates).

**Quick Testing with Web IDE Console:**
```javascript
// Generate test data starting in 1 minute:
var testData = {
  actions: [{
    name: "TEST NOW",
    category: "test", 
    startTime: Date.now() + 60000,  // 1 minute from now
    endTime: Date.now() + 120000    // 2 minutes from now
  }],
  lifePercentage: 58.73,
  promptTimeout: 10000,
  repromptInterval: 30000
};
require("Storage").writeJSON("intentionality.json", testData);
```

**Settings:**
- Prompt timeout: 10 seconds
- Reprompt interval: 30 seconds (for faster testing)
- Life percentage: 58.73%

## Installation via BangleApps

1. Go to https://banglejs.com/apps/
2. Connect your Bangle.js 2
3. Search for "Intentionality"
4. Install the app
5. Upload test-data.json as intentionality.json for testing