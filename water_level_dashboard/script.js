const $ = (id) => document.getElementById(id);

const state = {
  level: 62,
  tankHeight: 30,
  lowThreshold: 30,
  highThreshold: 70,
  emptyThreshold: 3,
  fullThreshold: 97,
  lastBoundary: "normal",
  audioContext: null,
  audioEnabled: false,
  firstRender: true,
  mode: "simulation",
  endpoint: "",
  refreshMs: 2000,
  timer: null,
  history: [],
  requestInProgress: false
};

function getStatus(level) {
  if (level < state.lowThreshold) return "LOW";
  if (level < state.highThreshold) return "MEDIUM";
  return "HIGH";
}
function getColor(level) {
  if (level < state.lowThreshold) return "#ef6265";
  if (level < state.highThreshold) return "#e6b63b";
  return "#27b47d";
}
function enableLaptopAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  if (!state.audioContext) state.audioContext = new AudioContextClass();
  if (state.audioContext.state === "suspended") state.audioContext.resume();
  state.audioEnabled = true;
  return true;
}
function playLaptopAlert(boundary) {
  // Browsers require a user gesture before allowing audio. The first dashboard interaction enables it.
  if (!enableLaptopAudio()) return;
  const ctx = state.audioContext;
  const now = ctx.currentTime;
  const notes = boundary === "full" ? [880, 1175, 1480] : [660, 440, 330];
  notes.forEach((frequency, index) => {
    const start = now + index * 0.22;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.19);
  });
}
function render(level, distance, record = true) {
  level = Math.max(0, Math.min(100, Number(level)));
  state.level = level;
  const previousBoundary = state.lastBoundary;
  const boundary = level <= state.emptyThreshold ? "empty" : level >= state.fullThreshold ? "full" : "normal";
  state.lastBoundary = boundary;
  if (!state.firstRender && boundary !== previousBoundary && boundary !== "normal") {
    playLaptopAlert(boundary);
  }
  state.firstRender = false;
  const status = getStatus(level);
  const color = getColor(level);
  const waterHeight = (state.tankHeight * level / 100).toFixed(1);
  $("levelValue").textContent = Math.round(level);
  $("sliderValue").textContent = Math.round(level);
  $("levelSlider").value = level;
  $("progressFill").style.width = `${level}%`;
  $("progressFill").style.background = color;
  $("distanceValue").textContent = Number(distance).toFixed(1);
  $("statusValue").textContent = status;
  $("statusValue").style.color = color;
  $("statusDescription").textContent =
    status === "LOW" ? "Water level is low. Check the tank." :
    status === "HIGH" ? "Tank is at a high water level." :
    "Water level is in the normal range.";
  $("statusBadge").textContent = status === "LOW" ? "● Low-level warning" :
    status === "HIGH" ? "● High level detected" : "● System operating";
  $("tankWater").style.height = `${level}%`;
  $("tankWater").style.background = `linear-gradient(180deg, ${color}aa, ${color})`;
  $("tankStatus").textContent = `${status} LEVEL`;
  $("tankStatus").style.color = color;
  $("tankVolume").textContent = `${waterHeight} cm water height`;
  $("lowLed").classList.toggle("on", status === "LOW");
  $("mediumLed").classList.toggle("on", status === "MEDIUM");
  $("highLed").classList.toggle("on", status === "HIGH");
  setHardwareState("lowLedState", status === "LOW");
  setHardwareState("mediumLedState", status === "MEDIUM");
  setHardwareState("highLedState", status === "HIGH");
  const boundaryAlert = boundary !== "normal";
  $("soundIcon").classList.toggle("on", boundaryAlert);
  $("soundDescription").textContent = boundary === "empty" ? "EMPTY: laptop sound alert" : boundary === "full" ? "FULL: laptop sound alert" : "Sound plays when tank is empty or full";
  $("soundState").textContent = state.audioEnabled ? (boundaryAlert ? "ALERT" : "READY") : "CLICK TO ENABLE";
  $("soundState").classList.toggle("on", boundaryAlert && state.audioEnabled);
  const alert = $("alertBox");
  alert.className = "alert-box" + (boundaryAlert ? " danger" : status === "LOW" ? " warning" : "");
  $("alertTitle").textContent = boundary === "empty" ? "Tank is empty!" : boundary === "full" ? "Tank is full!" : status === "LOW" ? "Low water warning" : "All systems normal";
  $("alertText").textContent = boundaryAlert ? (state.audioEnabled ? "Laptop sound alert triggered." : "Click a dashboard control once to allow browser sound, then sound alerts will play at empty/full.") : status === "LOW" ? "Water level is below the configured low threshold." : "No critical water-level alert.";
  $("lastUpdated").textContent = new Date().toLocaleTimeString();
  if (record) {
    state.history.unshift({ time: new Date(), level: Math.round(level), distance: Number(distance).toFixed(1), status });
    state.history = state.history.slice(0, 30);
    renderHistory();
  }
}
function setHardwareState(id, on) {
  const el = $(id);
  el.textContent = on ? "ON" : "OFF";
  el.classList.toggle("on", on);
}
function renderHistory() {
  $("readingCount").textContent = `${state.history.length} readings`;
  const list = $("historyList");
  if (!state.history.length) {
    list.innerHTML = '<div class="empty-history">No readings yet. Change the demo water level to start collecting readings.</div>';
    return;
  }
  list.innerHTML = state.history.map(item => {
    const color = getColor(item.level);
    return `<div class="history-item">
      <span class="history-time">${item.time.toLocaleTimeString()}</span>
      <div class="history-bar"><span style="width:${item.level}%;background:${color}"></span></div>
      <span class="history-value" style="color:${color}">${item.level}%</span>
    </div>`;
  }).join("");
}
function simulate(level) {
  const distance = state.tankHeight * (1 - Number(level) / 100);
  render(level, distance);
}
function setMode(mode) {
  state.mode = mode;
  $("deviceStatus").textContent = mode === "live" ? "Connected to ESP32" : "Simulation mode";
  $("modePill").classList.toggle("live", mode === "live");
  $("modePill").innerHTML = `<i></i> ${mode === "live" ? "LIVE DATA" : "SIMULATION"}`;
  if (mode === "live") $("connectionMessage").textContent = "Connected: waiting for the next reading.";
  else $("connectionMessage").textContent = "Not connected. Dashboard is using simulated values.";
}
function stopPolling() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}
async function fetchReading() {
  if (state.requestInProgress || !state.endpoint) return;
  state.requestInProgress = true;
  try {
    const response = await fetch(state.endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // Expected keys: distance_cm and/or level_percent
    const distance = Number(data.distance_cm);
    let level = Number(data.level_percent);
    if (!Number.isFinite(level) && Number.isFinite(distance)) {
      level = 100 * (state.tankHeight - distance) / state.tankHeight;
    }
    if (!Number.isFinite(level)) throw new Error("JSON needs level_percent or distance_cm");
    const measuredDistance = Number.isFinite(distance) ? distance : state.tankHeight * (1 - level / 100);
    render(level, measuredDistance);
    $("connectionMessage").textContent = `Connected. Last successful reading: ${new Date().toLocaleTimeString()}`;
    setMode("live");
  } catch (error) {
    $("connectionMessage").textContent = `Connection error: ${error.message}. Check ESP32 IP, Wi-Fi, endpoint and CORS.`;
  } finally {
    state.requestInProgress = false;
  }
}

$("levelSlider").addEventListener("input", e => { enableLaptopAudio(); simulate(Number(e.target.value)); });
document.querySelectorAll("[data-level]").forEach(button => button.addEventListener("click", () => { enableLaptopAudio(); simulate(Number(button.dataset.level)); }));
$("randomButton").addEventListener("click", () => { enableLaptopAudio(); simulate(Math.floor(Math.random() * 101)); });
$("clearHistory").addEventListener("click", () => { state.history = []; renderHistory(); });
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b === button));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $(`${button.dataset.page}Page`).classList.add("active");
  $("pageTitle").textContent = ({ overview: "Water level overview", history: "Reading history", settings: "Device settings" })[button.dataset.page];
  $("crumb").textContent = button.dataset.page.toUpperCase();
}));
$("saveSettings").addEventListener("click", () => {
  const height = Number($("tankHeightInput").value);
  const low = Number($("lowThresholdInput").value);
  const high = Number($("highThresholdInput").value);
  const empty = Number($("emptyThresholdInput").value);
  const full = Number($("fullThresholdInput").value);
  if (!(height > 0) || low < 0 || high > 100 || low >= high || empty < 0 || empty > 10 || full < 90 || full > 100 || empty >= full) {
    $("settingsMessage").textContent = "Check values: tank height must be positive, and thresholds must be valid and ordered.";
    return;
  }
  state.tankHeight = height; state.lowThreshold = low; state.highThreshold = high; state.emptyThreshold = empty; state.fullThreshold = full;
  $("settingsMessage").textContent = "Settings saved for this browser session.";
  const distance = state.tankHeight * (1 - state.level / 100);
  render(state.level, distance, false);
});
$("simulationButton").addEventListener("click", () => {
  stopPolling(); setMode("simulation");
  $("connectionMessage").textContent = "Simulation mode enabled.";
  simulate(state.level);
});
$("connectButton").addEventListener("click", () => {
  enableLaptopAudio();
  const endpoint = $("endpointInput").value.trim();
  const refresh = Number($("refreshInput").value);
  if (!/^https?:\/\//i.test(endpoint)) {
    $("connectionMessage").textContent = "Enter a valid endpoint such as http://192.168.1.100/data";
    return;
  }
  if (!Number.isFinite(refresh) || refresh < 500) {
    $("connectionMessage").textContent = "Refresh interval must be at least 500 ms.";
    return;
  }
  stopPolling();
  state.endpoint = endpoint; state.refreshMs = refresh;
  setMode("live");
  $("connectionMessage").textContent = "Trying to reach ESP32...";
  fetchReading();
  state.timer = setInterval(fetchReading, state.refreshMs);
});
render(62, 11.4);
