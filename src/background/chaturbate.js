import * as WS from './ws';

export const events = new EventTarget;

const cbByTabId = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ cbActiveTabId: null }, () => {
    // ...
  });
});

events.addEventListener('leavePage', () => {
  chrome.storage.local.set({ cbActiveTabId: null }, () => {
    // ...
  });
});

events.addEventListener('enterPage', event => {
  const { data: tabId } = event.detail;

  chrome.storage.local.set({ cbActiveTabId: tabId }, () => {
    // ...
  });
});

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
        events.dispatchEvent(new CustomEvent('leavePage'));
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
    if (!tab) { return; }

    if (port.sender.tab.id === tab.id) {
      events.dispatchEvent(new CustomEvent('enterPage', {
        detail: {
          data: tab.id,
          chaturbate
        }
      }));
    }
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  events.dispatchEvent(new CustomEvent('leavePage'));

  const chaturbate = cbByTabId[tabId];
  if (chaturbate) {
    events.dispatchEvent(new CustomEvent('enterPage', {
      detail: {
        data: tabId,
        chaturbate
      }
    }));
  }
});
