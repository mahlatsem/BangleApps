// Intentionality Watch - Bangle.js 2 Clock App
// Focus on what matters, not what time it is

// App state
let currentActivity = "CURRENT ACTIVITY";
let currentCategory = "Category";
let lifePercentage = 58;
let batteryDays = 23;
let showingOverlay = false;
let overlayTimeout = null;

// Activity detection state
let lastActivityCheck = 0;
let activityHistory = [];

// Storage helper
const Storage = require("Storage");

// Load user settings and life data
function loadUserData() {
  const userData = Storage.readJSON("intentionality.json", true) || {};
  
  if (userData.birthYear && userData.country) {
    // Calculate life expectancy based on user data
    const age = new Date().getFullYear() - userData.birthYear;
    const lifeExpectancy = userData.country === "US" ? 78 : 80; // Simplified
    lifePercentage = Math.max(0, Math.min(100, Math.round((age / lifeExpectancy) * 100)));
  }
  
  currentActivity = userData.lastActivity || "CURRENT ACTIVITY";
  currentCategory = userData.lastCategory || "Category";
}

// Save user data
function saveUserData() {
  const userData = Storage.readJSON("intentionality.json", true) || {};
  userData.lastActivity = currentActivity;
  userData.lastCategory = currentCategory;
  userData.lastUpdate = Date.now();
  Storage.writeJSON("intentionality.json", userData);
}

// Simple activity detection based on movement
function detectActivity() {
  const now = Date.now();
  if (now - lastActivityCheck < 30000) return; // Check every 30 seconds
  
  lastActivityCheck = now;
  
  try {
    const accel = Bangle.getAccel();
    const movement = Math.sqrt(accel.x*accel.x + accel.y*accel.y + accel.z*accel.z);
    
    // Add to history (keep last 10 readings)
    activityHistory.push(movement);
    if (activityHistory.length > 10) activityHistory.shift();
    
    if (activityHistory.length < 3) return;
    
    const avgMovement = activityHistory.reduce((a,b) => a+b, 0) / activityHistory.length;
    
    let newActivity = currentActivity;
    let newCategory = currentCategory;
    
    // Simple classification
    if (avgMovement < 0.1) {
      newActivity = "SLEEP";
      newCategory = "health";
    } else if (avgMovement < 0.3) {
      newActivity = "SEDENTARY";
      newCategory = "work";
    } else if (avgMovement < 0.7) {
      newActivity = "WALKING";
      newCategory = "movement";
    } else {
      newActivity = "EXERCISE";
      newCategory = "health";
    }
    
    // Activity changed - show confirmation overlay
    if (newActivity !== currentActivity) {
      currentActivity = newActivity;
      currentCategory = newCategory;
      showActivityConfirmation();
    }
    
  } catch (e) {
    // Ignore accelerometer errors
  }
}

// Create hourglass icon as string (simplified for 3-bit display)
function drawHourglass(x, y) {
  // Simple hourglass shape using basic graphics
  g.setColor(1,1,1); // White
  g.drawRect(x, y, x+10, y+13);
  g.drawRect(x+2, y+2, x+8, y+5);
  g.drawRect(x+2, y+8, x+8, y+11);
  g.drawRect(x+4, y+6, x+6, y+7);
}

// Draw the main watch interface
function drawWatchFace() {
  // Clear screen
  g.reset();
  g.clearRect(0, 0, 175, 175);
  g.setColor(1,1,1); // White text
  g.setFont("Vector", 12);
  
  // Battery days indicator (top right area)
  g.setFont("Vector", 6);
  g.setColor(0.5,0.5,0.5); // Dimmed
  g.drawString(batteryDays + "d", 120, 12);
  g.drawString("Bat", 120, 20);
  
  // Battery level indicator (top right)
  g.setColor(0.3,0.3,0.3);
  g.drawRect(152, 12, 170, 20);
  g.setColor(0.6,0.6,0.6);
  g.fillRect(153, 13, 168, 19); // 87% fill
  g.setColor(0.3,0.3,0.3);
  g.fillRect(170, 15, 171, 17); // Battery tip
  
  // Main activity text (center)
  g.setColor(1,1,1);
  g.setFont("Vector", 18);
  const activityWidth = g.stringWidth(currentActivity);
  g.drawString(currentActivity, (176 - activityWidth) / 2, 75);
  
  // Category text (below activity, closer spacing)
  g.setFont("Vector", 9);
  g.setColor(0.4,0.4,0.4);
  const categoryWidth = g.stringWidth(currentCategory);
  g.drawString(currentCategory, (176 - categoryWidth) / 2, 95);
  
  // Life percentage (bottom left)
  g.setColor(1,1,1);
  g.setFont("Vector", 10);
  g.drawString(lifePercentage + "%", 37, 135);
  g.drawString("Life", 37, 148);
  
  // Hourglass icon (bottom left, aligned with life text)
  drawHourglass(20, 135);
}

// Show activity confirmation overlay
function showActivityConfirmation() {
  if (showingOverlay) return;
  
  showingOverlay = true;
  
  // Create simple overlay bitmap (black background, white text)
  // For simplicity, we'll use screen drawing instead of actual bitmap overlay
  g.setColor(0,0,0);
  g.fillRect(38, 65, 138, 110); // Black background
  g.setColor(1,1,1);
  g.drawRect(38, 65, 138, 110); // White border
  
  // Question text
  g.setFont("Vector", 10);
  const questionText = "Started " + currentActivity.toLowerCase() + "?";
  const questionWidth = g.stringWidth(questionText);
  g.drawString(questionText, (176 - questionWidth) / 2, 75);
  
  // Yes/No buttons
  g.setFont("Vector", 9);
  g.drawRect(48, 90, 78, 105);
  g.drawString("YES", 58, 95);
  g.drawRect(98, 90, 128, 105);
  g.drawString("NO", 108, 95);
  
  // Auto-dismiss after 10 seconds
  if (overlayTimeout) clearTimeout(overlayTimeout);
  overlayTimeout = setTimeout(() => {
    hideActivityConfirmation();
  }, 10000);
}

// Hide activity confirmation overlay
function hideActivityConfirmation() {
  if (!showingOverlay) return;
  
  showingOverlay = false;
  if (overlayTimeout) {
    clearTimeout(overlayTimeout);
    overlayTimeout = null;
  }
  
  // Redraw the main interface
  drawWatchFace();
  saveUserData();
}

// Handle touch events
function handleTouch(button, xy) {
  if (!showingOverlay) return;
  
  // Check if touch is in YES button area
  if (xy.x >= 48 && xy.x <= 78 && xy.y >= 90 && xy.y <= 105) {
    // User confirmed activity start
    hideActivityConfirmation();
    return;
  }
  
  // Check if touch is in NO button area
  if (xy.x >= 98 && xy.x <= 128 && xy.y >= 90 && xy.y <= 105) {
    // User rejected activity - revert to previous
    currentActivity = "CURRENT ACTIVITY";
    currentCategory = "Category";
    hideActivityConfirmation();
    return;
  }
}

// Initialize the app
function init() {
  // Load user data
  loadUserData();
  
  // Set up clock UI
  Bangle.setUI("clock");
  
  // Set up touch handling
  Bangle.setUI({
    mode: "custom",
    touch: handleTouch
  });
  
  // Draw initial interface
  drawWatchFace();
  
  // Start activity detection
  setInterval(detectActivity, 30000);
  
  // Update battery info periodically
  setInterval(() => {
    const battery = E.getBattery();
    // Rough estimation: 87% battery ≈ 23 days (adjust based on actual usage)
    batteryDays = Math.round((battery / 100) * 27);
    if (!showingOverlay) drawWatchFace();
  }, 300000); // Every 5 minutes
  
  // Redraw every minute (minimal updates)
  setInterval(() => {
    if (!showingOverlay) drawWatchFace();
  }, 60000);
}

// Start the app
init();
