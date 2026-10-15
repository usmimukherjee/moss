const ALARM = "still-focus-complete";

chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }));
chrome.commands.onCommand.addListener(command => { if (command === "open-still") chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }); });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_FOCUS") {
    startFocus(message.sites || [], message.endAt).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "STOP_FOCUS") {
    stopFocus().then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) stopFocus(); });
chrome.runtime.onStartup.addListener(async () => {
  const { focusEndAt, blockedSites } = await chrome.storage.local.get(["focusEndAt", "blockedSites"]);
  if (focusEndAt > Date.now()) startFocus(blockedSites || [], focusEndAt); else stopFocus();
});

async function startFocus(sites, endAt) {
  const clean = [...new Set(sites.map(site => String(site).replace(/^www\./, "").toLowerCase()).filter(Boolean))].slice(0, 100);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const rules = clean.map((domain, index) => ({
    id: 1000 + index,
    priority: 1,
    action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
    condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame"] }
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map(rule => rule.id), addRules: rules });
  await chrome.storage.local.set({ focusEndAt: endAt, blockedSites: clean });
  await chrome.alarms.clear(ALARM);
  if (endAt > Date.now()) chrome.alarms.create(ALARM, { when: endAt });
}

async function stopFocus() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  if (existing.length) await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map(rule => rule.id) });
  await chrome.alarms.clear(ALARM);
  await chrome.storage.local.remove(["focusEndAt"]);
}
