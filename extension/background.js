chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }));
chrome.commands.onCommand.addListener(command => { if (command === "open-still") chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }); });
