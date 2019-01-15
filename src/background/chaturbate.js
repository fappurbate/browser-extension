import * as WS from './ws';

const cbByTabId = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    cbActiveTabId: null,
    cbActiveTabExtractingAccountActivity: false
  }, () => {
    // ...
  });
});

function onLeaveCB() {
  return new Promise(resolve => chrome.storage.local.set({
    cbActiveTabId: null,
    cbActiveTabExtractingAccountActivity: false
  }, resolve));
}

function onEnterCB(tabId) {
  return new Promise(resolve => chrome.storage.local.set({
    cbActiveTabId: tabId,
    cbActiveTabExtractingAccountActivity: cbByTabId[tabId].extractingAccountActivity
  }, resolve));
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'chaturbate') { return; }

  const broadcaster = (() => {
    const regexResult = /chaturbate.com\/p\/(.*?)\//.exec(port.sender.url);
    if (!regexResult) {
      const regexResult = /chaturbate.com\/(.*?)\//.exec(port.sender.url);
      if (!regexResult) { return null; }

      return regexResult[1];
    }

    return regexResult[1];
  })();

  const chaturbate = cbByTabId[port.sender.tab.id] = {
    extractingAccountActivity: false,
    port
  };

  port.onDisconnect.addListener(async () => {
    delete cbByTabId[port];

    chrome.tabs.query({ active: true, currentWindow: true }, async  ([tab]) => {
      if (port.sender.tab.id === tab.id) {
        await onLeaveCB();
      }
    });
  });

  port.onMessage.addListener(msg => {
    if (msg.subject === 'account-activity') {
      const item = msg.data;

      if (item.type === 'tip') {
        const { tipper, amount } = item.data;

        WS.sendTip(broadcaster, tipper, amount);
      }
    } else if (msg.subject === 'on-start-extract-account-activity') {
      chaturbate.extractingAccountActivity = true;
      chrome.storage.local.set({
        cbActiveTabExtractingAccountActivity: true
      });
    } else if (msg.subject === 'on-stop-extract-account-activity') {
      chaturbate.extractingAccountActivity = false;
      chrome.storage.local.set({
        cbActiveTabExtractingAccountActivity: false
      });
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (port.sender.tab.id === tab.id) {
      await onEnterCB(tab.id);
    }
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await onLeaveCB();
  cbByTabId[tabId] && await onEnterCB(tabId);
});
