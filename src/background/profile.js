import * as WS from './ws';

const profileByTabId = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    currentProfileTabId: null,
    currentProfileExtractingAccountActivity: false
  }, () => {
    // ...
  });
});

function onLeaveProfile() {
  return new Promise(resolve => chrome.storage.local.set({
    currentProfileTabId: null,
    currentProfileExtractingAccountActivity: false
  }, resolve));
}

function onEnterProfile(tabId) {
  return new Promise(resolve => chrome.storage.local.set({
    currentProfileTabId: tabId,
    currentProfileExtractingAccountActivity: profileByTabId[tabId].extractingAccountActivity
  }, resolve));
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'profile') { return; }

  const regexResult = /chaturbate.com\/(.*?)\//.exec(port.sender.url);
  if (!regexResult) { return; }

  const broadcaster = regexResult[1];

  const profile = profileByTabId[port.sender.tab.id] = {
    extractingAccountActivity: false,
    port
  };

  port.onDisconnect.addListener(async () => {
    delete profileByTabId[port];

    chrome.tabs.query({ active: true, currentWindow: true }, async  ([tab]) => {
      if (port.sender.tab.id === tab.id) {
        await onLeaveProfile();
      }
    });
  });

  port.onMessage.addListener(msg => {
    if (msg.type === 'account-activity') {
      const item = msg.data;

      if (item.type === 'tip') {
        const { tipper, amount } = item.data;

        WS.sendTip(broadcaster, tipper, amount);
      }
    } else if (msg.type === 'on-start-extract-account-activity') {
      profile.extractingAccountActivity = true;
      chrome.storage.local.set({
        currentProfileExtractingAccountActivity: true
      });
    } else if (msg.type === 'on-stop-extract-account-activity') {
      profile.extractingAccountActivity = false;
      chrome.storage.local.set({
        currentProfileExtractingAccountActivity: false
      });
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (port.sender.tab.id === tab.id) {
      await onEnterProfile(tab.id);
    }
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await onLeaveProfile();
  profileByTabId[tabId] && await onEnterProfile(tabId);
});
