(() => {
  const DEFAULTS = {
    durations: { focus: 25, short: 5, long: 15 },
    mode: "focus",
    remaining: 25 * 60,
    running: false,
    endAt: null,
    intention: "",
    sites: ["youtube.com", "instagram.com", "reddit.com"],
    blocking: true,
    sessions: 0,
    sessionDate: new Date().toDateString(),
    volume: 35
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    timer: $("timer"), progress: $("progressBar"), start: $("startButton"), startLabel: $("startLabel"), startIcon: $("startIcon"), reset: $("resetButton"),
    intention: $("intention"), saved: $("savedNote"), blockToggle: $("blockToggle"), blockStatus: $("blockStatus"), siteList: $("siteList"), siteForm: $("siteForm"), siteInput: $("siteInput"),
    sound: $("soundButton"), soundState: $("soundState"), soundPlay: $("soundPlay"), volume: $("volume"), sessionCount: $("sessionCount"), rhythm: $("rhythmTrack"), rhythmMessage: $("rhythmMessage"),
    settings: $("settingsDialog"), setup: $("setupDialog"), toast: $("toast")
  };

  const isExtension = typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
  let state = loadState();
  let tickHandle = null;
  let audio = null;
  let saveTimer = null;

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem("stillState")) || {};
      const merged = { ...DEFAULTS, ...stored, durations: { ...DEFAULTS.durations, ...(stored.durations || {}) } };
      if (merged.sessionDate !== new Date().toDateString()) {
        merged.sessions = 0;
        merged.sessionDate = new Date().toDateString();
      }
      return merged;
    } catch { return { ...DEFAULTS, durations: { ...DEFAULTS.durations } }; }
  }

  function saveState() { localStorage.setItem("stillState", JSON.stringify(state)); }
  function durationSeconds(mode = state.mode) { return state.durations[mode] * 60; }
  function remainingSeconds() { return state.running && state.endAt ? Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000)) : state.remaining; }
  function formatTime(seconds) { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }

  function renderTimer() {
    const remaining = remainingSeconds();
    els.timer.textContent = formatTime(remaining);
    document.title = state.running ? `${formatTime(remaining)} · Still` : "Still — focus, softly";
    const total = durationSeconds();
    els.progress.style.width = `${Math.min(100, Math.max(0, ((total - remaining) / total) * 100))}%`;
    els.startLabel.textContent = state.running ? "pause" : state.remaining < total ? "continue" : state.mode === "focus" ? "begin focus" : "begin break";
    els.startIcon.textContent = state.running ? "Ⅱ" : "▶";
  }

  function setMode(mode) {
    if (state.running) pauseTimer();
    state.mode = mode;
    state.remaining = durationSeconds(mode);
    document.querySelectorAll(".mode").forEach(button => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    saveState(); renderTimer();
  }

  function toggleTimer() { state.running ? pauseTimer() : startTimer(); }

  function startTimer() {
    if (remainingSeconds() <= 0) state.remaining = durationSeconds();
    state.running = true;
    state.endAt = Date.now() + state.remaining * 1000;
    saveState();
    if (state.mode === "focus" && state.blocking) setExtensionFocus(true);
    tickHandle = setInterval(tick, 250);
    renderTimer();
    toast(state.mode === "focus" ? "Focus has begun. Just this one thing." : "Let your mind soften for a moment.");
  }

  function pauseTimer() {
    state.remaining = remainingSeconds();
    state.running = false;
    state.endAt = null;
    clearInterval(tickHandle);
    if (state.mode === "focus") setExtensionFocus(false);
    saveState(); renderTimer();
  }

  function resetTimer() {
    state.running = false;
    state.endAt = null;
    state.remaining = durationSeconds();
    clearInterval(tickHandle);
    if (state.mode === "focus") setExtensionFocus(false);
    saveState(); renderTimer(); toast("Reset. No guilt, just a fresh start.");
  }

  function tick() {
    renderTimer();
    if (remainingSeconds() <= 0) completeTimer();
  }

  function completeTimer() {
    const wasFocus = state.mode === "focus";
    state.running = false; state.endAt = null;
    clearInterval(tickHandle);
    if (wasFocus) {
      state.sessions += 1;
      setExtensionFocus(false);
      state.mode = "short";
    } else state.mode = "focus";
    state.remaining = durationSeconds(state.mode);
    saveState(); renderAll(); chime();
    toast(wasFocus ? "You did it. Time to exhale." : "Welcome back. Ready when you are.");
  }

  async function setExtensionFocus(active) {
    if (!isExtension) {
      els.blockStatus.textContent = state.blocking && state.running && state.mode === "focus" ? "Preview mode · add the extension for real blocking." : "Distracting sites pause when focus begins.";
      return;
    }
    try {
      await chrome.runtime.sendMessage({ type: active ? "START_FOCUS" : "STOP_FOCUS", endAt: state.endAt, sites: state.sites });
      els.blockStatus.textContent = active ? "Quiet mode is active across this browser." : "Distracting sites pause when focus begins.";
    } catch { els.blockStatus.textContent = "Quiet mode needs the extension to be reloaded."; }
  }

  function renderSites() {
    els.siteList.textContent = "";
    state.sites.forEach((site, index) => {
      const chip = document.createElement("span"); chip.className = "site-chip";
      const label = document.createElement("span"); label.textContent = site;
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", `Remove ${site}`);
      remove.addEventListener("click", () => { state.sites.splice(index, 1); saveState(); renderSites(); if (state.running && state.mode === "focus") setExtensionFocus(true); });
      chip.append(label, remove); els.siteList.append(chip);
    });
  }

  function cleanDomain(value) {
    try {
      const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      return new URL(withScheme).hostname.replace(/^www\./, "").toLowerCase();
    } catch { return ""; }
  }

  function renderRhythm() {
    els.sessionCount.textContent = state.sessions;
    els.rhythm.textContent = "";
    for (let i = 0; i < 8; i++) { const mark = document.createElement("span"); mark.classList.toggle("done", i < state.sessions); els.rhythm.append(mark); }
    els.rhythmMessage.textContent = state.sessions === 0 ? "A small start is still a start." : state.sessions < 4 ? "You’re finding your pace." : "Quiet progress adds up.";
  }

  function renderAll() {
    document.querySelectorAll(".mode").forEach(button => { const selected = button.dataset.mode === state.mode; button.classList.toggle("active", selected); button.setAttribute("aria-selected", String(selected)); });
    els.intention.value = state.intention; els.blockToggle.checked = state.blocking; els.volume.value = state.volume;
    $("focusMinutes").value = state.durations.focus; $("shortMinutes").value = state.durations.short; $("longMinutes").value = state.durations.long;
    renderTimer(); renderSites(); renderRhythm();
  }

  function toast(message) { els.toast.textContent = message; els.toast.classList.add("show"); setTimeout(() => els.toast.classList.remove("show"), 2500); }

  function createRain() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = context.createBuffer(2, context.sampleRate * 3, context.sampleRate);
    for (let c = 0; c < 2; c++) { const data = buffer.getChannelData(c); let last = 0; for (let i = 0; i < data.length; i++) { const white = Math.random() * 2 - 1; last = last * .985 + white * .015; data[i] = last * 3.4; } }
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1800;
    const gain = context.createGain(); gain.gain.value = state.volume / 100 * .42;
    source.connect(filter).connect(gain).connect(context.destination); source.start();
    return { context, source, gain, playing: true };
  }

  function toggleSound() {
    if (!audio) audio = createRain();
    else { audio.playing = !audio.playing; audio.gain.gain.setTargetAtTime(audio.playing ? state.volume / 100 * .42 : 0, audio.context.currentTime, .08); }
    els.sound.setAttribute("aria-pressed", String(audio.playing)); els.soundState.textContent = audio.playing ? "playing softly" : "paused"; els.soundPlay.textContent = audio.playing ? "Ⅱ" : "▶";
  }

  function chime() {
    try { const ctx = audio?.context || new (window.AudioContext || window.webkitAudioContext)(); [0, .18].forEach((delay, i) => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.frequency.value = i ? 523.25 : 392; gain.gain.setValueAtTime(.0001, ctx.currentTime + delay); gain.gain.exponentialRampToValueAtTime(.09, ctx.currentTime + delay + .02); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + .8); osc.connect(gain).connect(ctx.destination); osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + .85); }); } catch {}
  }

  document.querySelectorAll(".mode").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
  els.start.addEventListener("click", toggleTimer); els.reset.addEventListener("click", resetTimer);
  els.intention.addEventListener("input", () => { state.intention = els.intention.value; clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveState(); els.saved.classList.add("show"); setTimeout(() => els.saved.classList.remove("show"), 1200); }, 400); });
  els.blockToggle.addEventListener("change", () => { state.blocking = els.blockToggle.checked; saveState(); if (state.running && state.mode === "focus") setExtensionFocus(state.blocking); });
  els.siteForm.addEventListener("submit", (event) => { event.preventDefault(); const domain = cleanDomain(els.siteInput.value.trim()); if (!domain) return toast("Try a site like reddit.com"); if (!state.sites.includes(domain)) state.sites.push(domain); els.siteInput.value = ""; saveState(); renderSites(); if (state.running && state.mode === "focus") setExtensionFocus(true); });
  els.sound.addEventListener("click", toggleSound);
  els.volume.addEventListener("input", () => { state.volume = Number(els.volume.value); if (audio?.playing) audio.gain.gain.setTargetAtTime(state.volume / 100 * .42, audio.context.currentTime, .04); saveState(); });
  $("settingsButton").addEventListener("click", () => els.settings.showModal());
  $("saveSettings").addEventListener("click", (event) => { event.preventDefault(); state.durations = { focus: Math.max(1, Number($("focusMinutes").value) || 25), short: Math.max(1, Number($("shortMinutes").value) || 5), long: Math.max(1, Number($("longMinutes").value) || 15) }; resetTimer(); els.settings.close(); toast("Your rhythm is saved."); });
  $("extensionNote").addEventListener("click", () => els.setup.showModal()); $("closeSetup").addEventListener("click", () => els.setup.close()); $("gotIt").addEventListener("click", () => els.setup.close());
  document.addEventListener("keydown", (event) => { if (["INPUT","TEXTAREA"].includes(document.activeElement.tagName) || els.settings.open || els.setup.open) return; if (event.code === "Space") { event.preventDefault(); toggleTimer(); } if (event.key.toLowerCase() === "r") resetTimer(); });

  $("today").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  if (state.running && state.endAt) { if (state.endAt <= Date.now()) completeTimer(); else tickHandle = setInterval(tick, 250); }
  if (isExtension) { $("extensionNote").textContent = "quiet mode is installed ✓"; els.blockStatus.textContent = state.running && state.mode === "focus" ? "Quiet mode is active across this browser." : "Distracting sites pause when focus begins."; }
  renderAll();
})();
