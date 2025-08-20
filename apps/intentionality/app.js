// Constants
const BATTERY_WIDTH = 28;
const BATTERY_HEIGHT = 14;
const BATTERY_MARGIN = 12;
const LIFE_MARGIN_BOTTOM = 12;
const HOURGLASS_MARGIN_BOTTOM = 8;
const HOURGLASS_SIZE = 24;
const FONT_SIZES = [30, 26, 22, 18, 14];
const DEFAULT_ACTION = "CURRENT ACTION";
const DEFAULT_CATEGORY = "Category";

// Time constants (milliseconds)
const DEFAULT_PROMPT_TIMEOUT = 10000;
const DEFAULT_REPROMPT_INTERVAL = 1800000;

// UI Layout constants (shared across functions)
const ACTION_Y_POSITION = 75;

// Drawing constants
const HOURGLASS_MARGIN = 3;
const HOURGLASS_INTERNAL_OFFSET = 6;
const BATTERY_TIP_WIDTH = 3;
const BATTERY_TIP_MARGIN = 4;
const LIFE_TEXT_OFFSET = 26;
const LIFE_LABEL_OFFSET = 12;
const BATTERY_TEXT_OFFSET = 26;
const BATTERY_TEXT_Y_PRIMARY = 12;
const BATTERY_TEXT_Y_SECONDARY = 20;
const BATTERY_TIP_HEIGHT_OFFSET = 8;
const BATTERY_FILL_OFFSET = 2;
const ACTION_TEXT_Y = 75;
const CATEGORY_TEXT_Y = 95;
const LIFE_TEXT_SIZE = 16;
const LIFE_LABEL_SIZE = 12;
const SCREEN_MARGIN = 10;

// Limits
const MAX_ACTION_TEXT_LENGTH = 12;
const BATTERY_UPDATE_INTERVAL = 300000;
const CLOCK_UPDATE_INTERVAL = 60000;

// Button constants
const BUTTON_WIDTH = 50;
const BUTTON_HEIGHT = 30;

// Error handling
function logError(operation, error) {
  console.log(operation + " failed:", error);
}

let currentAction = DEFAULT_ACTION;
let currentCategory = DEFAULT_CATEGORY;
let lifePercentage = 58.73;
let batteryDays = 23;
let showingOverlay = false;
let vibrationTimer = null;

let yesButton = {};
let noButton = {};

const Storage = require("Storage");
const defaultData = {
  lifePercentage: 58.73,
  promptTimeout: DEFAULT_PROMPT_TIMEOUT,
  repromptInterval: DEFAULT_REPROMPT_INTERVAL
};

function isValidTestData(data) {
  return data && data.actions && 
         data.actions.length > 0 && 
         data.actions[0].category === "test";
}

function allTestActionsExpired(data) {
  if (!data || !data.actions || data.actions.length === 0) {
    return false;
  }
  
  const currentTime = Date.now();
  return data.actions.every(action => currentTime > action.endTime);
}

function loadActionData() {
  try {
    // Try test file first - simplified logic
    const testData = Storage.readJSON("intentionality-test.json", true);
    if (testData) {
      return testData;
    }
    
    // Fall back to real data file
    const realData = Storage.readJSON("intentionality.json", true);
    if (realData) {
      return realData;
    }
  } catch (e) {
    logError("Storage read", e);
  }
  
  return defaultData;
}

function updateActionData() {
  let newData = loadActionData();
  
  // Auto-regenerate if we're using test file and all test actions are expired
  const usingTestFile = Storage.readJSON("intentionality-test.json", true) !== undefined;
  if (usingTestFile && isValidTestData(newData) && allTestActionsExpired(newData)) {
    try {
      eval(require("Storage").read("generate-test-data.js"));
      generateTestData();
      newData = loadActionData(); // Reload fresh data
    } catch (e) {
      logError("Test data auto-regeneration", e);
    }
  }
  
  const actionData = Object.assign({}, defaultData, newData);
  
  const currentTime = Date.now();
  const currentActionInfo = getCurrentAction(actionData.actions || [], currentTime);
  
  const actionChanged = (currentActionInfo.action !== currentAction);
  
  currentAction = currentActionInfo.action;
  currentCategory = currentActionInfo.category;
  lifePercentage = actionData.lifePercentage;
  
  if (actionChanged && currentAction !== DEFAULT_ACTION) {
    try {
      Bangle.buzz(300);
    } catch (e) {
      logError("Action change buzz", e);
    }
    
    // If overlay is already showing, hide it first to update with new action
    if (showingOverlay) {
      hideActionConfirmation(true); // Skip reprompt since we're showing new action
    }
    
    showActionConfirmation(currentActionInfo.action);
  }
  
  // Reschedule next check when action changes
  if (actionChanged) {
    scheduleNextActionCheck();
  }
  
  return actionData;
}

function getCurrentAction(actions, currentTime) {
  for (let action of actions) {
    if (currentTime >= action.startTime && currentTime <= action.endTime) {
      return {
        action: action.name,
        category: action.category
      };
    }
  }
  return {
    action: DEFAULT_ACTION,
    category: DEFAULT_CATEGORY
  };
}


function drawHourglassIcon(x, y, lifePercentage) {
  const w = HOURGLASS_SIZE;
  const h = HOURGLASS_SIZE;
  const centerX = x + w/2;
  const centerY = y + h/2;
  const halfHeight = (h - HOURGLASS_INTERNAL_OFFSET) / 2;
  
  g.setColor(0,0,0);
  
  g.drawLine(x + HOURGLASS_MARGIN, y + HOURGLASS_MARGIN, centerX, centerY);
  g.drawLine(x + w - HOURGLASS_MARGIN, y + HOURGLASS_MARGIN, centerX, centerY);
  g.drawLine(x + HOURGLASS_MARGIN, y + HOURGLASS_MARGIN, x + w - HOURGLASS_MARGIN, y + HOURGLASS_MARGIN);
  g.drawLine(x + HOURGLASS_MARGIN, y + h - HOURGLASS_MARGIN, centerX, centerY);
  g.drawLine(x + w - HOURGLASS_MARGIN, y + h - HOURGLASS_MARGIN, centerX, centerY);
  g.drawLine(x + HOURGLASS_MARGIN, y + h - HOURGLASS_MARGIN, x + w - HOURGLASS_MARGIN, y + h - HOURGLASS_MARGIN);
  
  const topFill = Math.ceil(halfHeight * Math.sqrt((100 - lifePercentage) / 100));
  const bottomFill = Math.floor(halfHeight * (1 - Math.sqrt(1 - lifePercentage / 100)));
  
  for (let i = 0; i < topFill; i++) {
    const fillY = centerY - 1 - i;
    const width = Math.max(1, Math.floor((w - HOURGLASS_INTERNAL_OFFSET) * (i + 1) / halfHeight));
    g.drawLine(centerX - width/2, fillY, centerX + width/2, fillY);
  }
  
  for (let i = 0; i < bottomFill; i++) {
    const fillY = y + h - HOURGLASS_MARGIN - i;
    const width = Math.floor((w - HOURGLASS_INTERNAL_OFFSET) * (halfHeight - i) / halfHeight);
    g.drawLine(centerX - width/2, fillY, centerX + width/2, fillY);
  }
}

function clearScreen() {
  g.clear();
  g.reset();
  g.setColor(1,1,1);
  g.fillRect(0, 0, g.getWidth(), g.getHeight());
  g.setColor(0,0,0);
}

function drawBatteryIndicator(screenWidth) {
  try {
    const batteryX = screenWidth - BATTERY_WIDTH - BATTERY_MARGIN;
    const batteryY = BATTERY_MARGIN;
    const batteryTextX = batteryX - BATTERY_TEXT_OFFSET;
    
    g.setFont("Vector", 10);
    const daysText = "~" + batteryDays + "d";
    g.drawString(daysText, batteryTextX, BATTERY_TEXT_Y_PRIMARY);
    
    const daysTextWidth = g.stringWidth(daysText);
    const batTextWidth = g.stringWidth("Bat");
    const batTextX = batteryTextX + (daysTextWidth - batTextWidth) / 2;
    g.drawString("Bat", batTextX, BATTERY_TEXT_Y_SECONDARY);
    
    g.drawRect(batteryX, batteryY, batteryX + BATTERY_WIDTH, batteryY + BATTERY_HEIGHT);
    
    const tipY = batteryY + BATTERY_TIP_MARGIN;
    const tipHeight = BATTERY_HEIGHT - BATTERY_TIP_HEIGHT_OFFSET;
    g.fillRect(batteryX + BATTERY_WIDTH, tipY, batteryX + BATTERY_WIDTH + BATTERY_TIP_WIDTH, tipY + tipHeight);
    
    const batteryLevel = E.getBattery() / 100;
    const fillWidth = Math.floor((BATTERY_WIDTH - BATTERY_TIP_MARGIN) * batteryLevel);
    g.fillRect(batteryX + BATTERY_FILL_OFFSET, batteryY + BATTERY_FILL_OFFSET, batteryX + BATTERY_FILL_OFFSET + fillWidth, batteryY + BATTERY_HEIGHT - BATTERY_FILL_OFFSET);
  } catch (e) {
    logError("Battery draw", e);
  }
}

function drawActionText(screenWidth, centerX) {
  g.setFontAlign(0, 0);
  let actionText = currentAction.toUpperCase();
  const maxTextWidth = screenWidth - SCREEN_MARGIN;
  
  for (let fontSize of FONT_SIZES) {
    g.setFont("Vector", fontSize);
    if (g.stringWidth(actionText) <= maxTextWidth) break;
    if (fontSize === 14) {
      actionText = actionText.substring(0, MAX_ACTION_TEXT_LENGTH) + "...";
    }
  }
  g.drawString(actionText, centerX, ACTION_TEXT_Y);
  
  g.setFont("Vector", 14);
  g.drawString(currentCategory.toUpperCase(), centerX, CATEGORY_TEXT_Y);
}

function drawLifeSection(screenHeight) {
  const lifeX = 8;
  const lifeY = screenHeight - LIFE_LABEL_SIZE - LIFE_MARGIN_BOTTOM;
  
  g.setFont("Vector", LIFE_TEXT_SIZE);
  g.setFontAlign(-1, 0);
  const lifeText = lifePercentage.toFixed(2) + "%";
  g.drawString(lifeText, lifeX + LIFE_TEXT_OFFSET, lifeY);
  
  g.setFont("Vector", LIFE_LABEL_SIZE);
  g.setFontAlign(0, 0);
  const lifeTextWidth = g.stringWidth(lifeText);
  const lifeTextCenterX = lifeX + LIFE_TEXT_OFFSET + (lifeTextWidth / 2);
  g.drawString("LIFE", lifeTextCenterX, lifeY + LIFE_LABEL_OFFSET);
  
  const hourglassY = screenHeight - HOURGLASS_SIZE - HOURGLASS_MARGIN_BOTTOM;
  drawHourglassIcon(lifeX, hourglassY, lifePercentage);
}

function drawWatchFace() {
  clearScreen();
  
  const screenWidth = g.getWidth();
  const screenHeight = g.getHeight();
  const centerX = screenWidth / 2;
  
  drawBatteryIndicator(screenWidth);
  drawActionText(screenWidth, centerX);
  drawLifeSection(screenHeight);
}

function drawOverlayBackground(centerX) {
  const OVERLAY_MARGIN = 12;
  const OVERLAY_HEIGHT = 85; // Increased from 60 to accommodate larger buttons + proper spacing
  const OVERLAY_Y_POSITION = 50;
  
  const screenWidth = g.getWidth();
  const overlayWidth = screenWidth - (OVERLAY_MARGIN * 2);
  const overlayHeight = OVERLAY_HEIGHT;
  const overlayX = OVERLAY_MARGIN;
  const overlayY = OVERLAY_Y_POSITION;
  
  g.setColor(0,0,0);
  g.fillRect(overlayX, overlayY, overlayX + overlayWidth, overlayY + overlayHeight);
  g.setColor(1,1,1);
  g.drawRect(overlayX, overlayY, overlayX + overlayWidth, overlayY + overlayHeight);
}

function drawQuestionText(centerX, actionName) {
  g.setColor(1,1,1);
  g.setFont("Vector", 10);
  g.setFontAlign(0, 0);
  const questionText = actionName + " started?";
  const QUESTION_TEXT_Y = 70; // Positioned above buttons with good spacing
  g.drawString(questionText, centerX, QUESTION_TEXT_Y);
}

function drawButton(x, y, width, height, text) {
  g.setFont("Vector", 10);
  g.setColor(0,0,0);
  g.drawRect(x, y, x + width, y + height);
  g.setColor(1,1,1);
  g.fillRect(x + 1, y + 1, x + width - 1, y + height - 1);
  g.setColor(0,0,0);
  g.setFontAlign(0, 0);
  g.drawString(text, x + width/2, y + height/2);
}

function drawButtonPressed(x, y, width, height, text) {
  g.setFont("Vector", 10);
  g.setColor(0,0,0);
  g.fillRect(x, y, x + width, y + height);
  g.setColor(1,1,1);
  g.setFontAlign(0, 0);
  g.drawString(text, x + width/2, y + height/2);
}

function drawConfirmationButtons(centerX) {
  const BUTTON_Y_POSITION = 85;
  const BUTTON_SPACING = 8;
  
  const buttonWidth = BUTTON_WIDTH;
  const buttonHeight = BUTTON_HEIGHT;
  const buttonY = BUTTON_Y_POSITION;
  const yesButtonX = centerX - buttonWidth - BUTTON_SPACING;
  const noButtonX = centerX + BUTTON_SPACING;
  
  yesButton = {x1: yesButtonX, y1: buttonY, x2: yesButtonX + buttonWidth, y2: buttonY + buttonHeight};
  noButton = {x1: noButtonX, y1: buttonY, x2: noButtonX + buttonWidth, y2: buttonY + buttonHeight};
  
  
  drawButton(yesButtonX, buttonY, buttonWidth, buttonHeight, "YES");
  drawButton(noButtonX, buttonY, buttonWidth, buttonHeight, "NO");
}

function showActionConfirmation(actionName) {
  if (showingOverlay) return;
  
  showingOverlay = true;
  
  // Unlock device to enable touch interaction
  try {
    Bangle.setLocked(false);
  } catch (e) {
    logError("Device unlock", e);
  }
  
  // Keep screen awake with periodic wakes instead of timeout changes
  Bangle.setLCDPower(true);
  
  const screenWidth = g.getWidth();
  const centerX = screenWidth / 2;
  
  drawOverlayBackground(centerX);
  drawQuestionText(centerX, actionName || currentAction);
  drawConfirmationButtons(centerX);
  
  if (vibrationTimer) clearTimeout(vibrationTimer);
  const actionData = loadActionData();
  const timeout = actionData.promptTimeout || defaultData.promptTimeout;
  
  // Start vibration reminder system and periodic screen wake
  function vibrationReminder() {
    if (showingOverlay) {
      try {
        Bangle.buzz(200); // Short vibration reminder
        Bangle.setLCDPower(true); // Wake screen again without changing timeout
        
        // Re-unlock device to ensure it stays unlocked during screen refresh
        Bangle.setLocked(false);
      } catch (e) {
        logError("Vibration reminder", e);
      }
      // Schedule next vibration and screen wake
      vibrationTimer = setTimeout(vibrationReminder, timeout);
    }
  }
  
  // Start first vibration reminder
  vibrationTimer = setTimeout(vibrationReminder, timeout);
}

function hideActionConfirmation(skipReprompt) {
  if (!showingOverlay) return;
  
  showingOverlay = false;
  if (vibrationTimer) {
    clearTimeout(vibrationTimer);
    vibrationTimer = null;
  }
  
  
  drawWatchFace();
  if (!skipReprompt) {
    scheduleReprompt();
  }
  
  // Re-lock device to return to normal watch behavior
  try {
    Bangle.setLocked(true);
  } catch (e) {
    logError("Device re-lock", e);
  }
}

const scheduleReprompt = (function() {
  let repromptTimer = null;
  
  return function() {
    if (repromptTimer) clearTimeout(repromptTimer);
    
    const actionData = updateActionData();
    repromptTimer = setTimeout(() => {
      if (!showingOverlay && currentAction !== DEFAULT_ACTION) {
        showActionConfirmation();
      }
    }, actionData.repromptInterval || defaultData.repromptInterval);
  };
})();

const scheduleNextActionCheck = (function() {
  let actionCheckTimer = null;
  
  return function() {
    // Clear any existing timer
    if (actionCheckTimer) {
      clearTimeout(actionCheckTimer);
      actionCheckTimer = null;
    }
    
    const now = Date.now();
    const data = loadActionData();
    
    if (!data.actions || data.actions.length === 0) {
      return; // No actions to schedule
    }
    
    // Find current active action
    const currentAction = data.actions.find(a => now >= a.startTime && now <= a.endTime);
    
    let nextCheckTime = null;
    
    if (currentAction) {
      // Case 1: Active action exists - check when it ends
      nextCheckTime = currentAction.endTime + 1000; // +1 sec buffer
    } else {
      // Case 2: No active action - find next upcoming action
      const nextAction = data.actions.find(a => a.startTime > now);
      if (nextAction) {
        nextCheckTime = nextAction.startTime + 1000; // +1 sec buffer
      }
    }
    
    if (nextCheckTime) {
      const delay = nextCheckTime - now;
      if (delay > 0 && delay < 3600000) { // Only schedule if within 1 hour
        actionCheckTimer = setTimeout(() => {
          updateActionData();
          if (!showingOverlay) drawWatchFace();
          scheduleNextActionCheck(); // Schedule the next check
        }, delay);
      }
    }
  };
})();

function handleTouch(_, xy) {
  if (!showingOverlay) {
    return;
  }
  
  // Process initial touch events (xy.type == 0) for immediate button response
  if (xy.type !== 0) {
    return;
  }
  
  // Validate touch coordinates are within screen bounds
  const screenWidth = g.getWidth();
  const screenHeight = g.getHeight();
  if (xy.x < 0 || xy.x >= screenWidth || xy.y < 0 || xy.y >= screenHeight) {
    return;
  }
  
  
  
  // Check YES button hit
  const yesHit = (xy.x >= yesButton.x1 && xy.x <= yesButton.x2 && xy.y >= yesButton.y1 && xy.y <= yesButton.y2);
  
  if (yesHit) {
    try {
      drawButtonPressed(yesButton.x1, yesButton.y1, BUTTON_WIDTH, BUTTON_HEIGHT, "YES");
      setTimeout(() => {
        hideActionConfirmation(true); // Skip reprompt on YES
      }, 150);
    } catch (e) {
      logError("Yes button press", e);
    }
    return;
  }
  
  // Check NO button hit
  const noHit = (xy.x >= noButton.x1 && xy.x <= noButton.x2 && xy.y >= noButton.y1 && xy.y <= noButton.y2);
  
  if (noHit) {
    try {
      drawButtonPressed(noButton.x1, noButton.y1, BUTTON_WIDTH, BUTTON_HEIGHT, "NO");
      setTimeout(() => {
        hideActionConfirmation(false);
      }, 150);
    } catch (e) {
      logError("No button press", e);
    }
    return;
  }
  
}

function init() {
  // Force test data generation if ANY test file exists (bypass complex validation)
  const testFileExists = Storage.readJSON("intentionality-test.json", true) !== undefined;
  
  if (testFileExists) {
    try {
      // Always regenerate test data with watch time when test file exists
      eval(require("Storage").read("generate-test-data.js"));
      generateTestData();
      
      // Verify test data was created with current time
      const newTestData = Storage.readJSON("intentionality-test.json", true);
      if (newTestData && newTestData.actions && newTestData.actions.length > 0) {
        const now = Date.now();
        const firstActionTime = newTestData.actions[0].startTime;
        // Test data should start within the next 10 minutes
        if (firstActionTime > now && firstActionTime < now + 600000) {
          // Success - test data is fresh
        }
      }
    } catch (e) {
      logError("Test data generation at launch", e);
    }
  }
  
  const actionData = updateActionData();
  g.clear();
  
  Bangle.setUI({
    mode: "custom",
    touch: handleTouch,
    clock: true
  });
  
  drawWatchFace();
  
  // Show overlay immediately if launching during an active test action
  if (isValidTestData(actionData) && currentAction !== DEFAULT_ACTION) {
    try {
      Bangle.buzz(300);
      showActionConfirmation(currentAction);
    } catch (e) {
      logError("Initial overlay show", e);
    }
  }
  
  // Schedule next action check for precise timing
  scheduleNextActionCheck();
  
  setInterval(() => {
    try {
      const battery = E.getBattery();
      const BATTERY_DAYS_MULTIPLIER = 27;
      batteryDays = Math.round((battery / 100) * BATTERY_DAYS_MULTIPLIER);
      if (!showingOverlay) drawWatchFace();
    } catch (e) {
      logError("Battery update", e);
    }
  }, BATTERY_UPDATE_INTERVAL);
  
  setInterval(() => {
    if (!showingOverlay) drawWatchFace();
  }, CLOCK_UPDATE_INTERVAL);
}

init();
