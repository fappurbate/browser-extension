import * as WS from './ws';

export const events = new EventTarget;

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
    broadcaster,
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
    const event = new CustomEvent(msg.subject, {
      detail: {
        data: msg.data,
        chaturbate
      }
    });
    events.dispatchEvent(event);
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
