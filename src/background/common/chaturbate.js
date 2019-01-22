import * as WS from './ws';

const eventHandlers = new EventTarget;
export { eventHandlers as events };

const cbByTabId = {};
export const byTabId = tabId => cbByTabId[tabId];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ cbActiveTabId: null }, () => {
    // ...
  });
});

eventHandlers.addEventListener('leavePage', () => {
  chrome.storage.local.set({ cbActiveTabId: null }, () => {
    // ...
  });
});

eventHandlers.addEventListener('enterPage', event => {
  const { data: tabId } = event.detail;

  chrome.storage.local.set({ cbActiveTabId: tabId }, () => {
    // ...
  });
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'chaturbate') { return; }

  const broadcaster = (() => {
    const regexResult = /(testbed\.)?chaturbate.com\/(p|b)\/(.*?)\//.exec(port.sender.url);
    if (!regexResult) {
      const regexResult = /(testbed\.)?chaturbate.com\/(.*?)\//.exec(port.sender.url);
      if (!regexResult) { return null; }

      return regexResult[2];
    }

    return regexResult[3];
  })();

  const chaturbate = cbByTabId[port.sender.tab.id] = {
    extractingAccountActivity: false,
    broadcaster,
    port
  };

  port.onDisconnect.addListener(async () => {
    delete cbByTabId[port.sender.tab.id];

    chrome.tabs.query({ active: true, currentWindow: true }, async  ([tab]) => {
      if (port.sender.tab.id === tab.id) {
        eventHandlers.dispatchEvent(new CustomEvent('leavePage'));
      }
    });
  });

  port.onMessage.addListener(msg => {
    const event = new CustomEvent('port-event', {
      detail: {
        subject: msg.subject,
        info: chaturbate,
        port,
        data: msg.data
      }
    });
    eventHandlers.dispatchEvent(event);
  });

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab) { return; }

    if (port.sender.tab.id === tab.id) {
      eventHandlers.dispatchEvent(new CustomEvent('enterPage', {
        detail: {
          data: tab.id,
          chaturbate
        }
      }));
    }
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  eventHandlers.dispatchEvent(new CustomEvent('leavePage'));

  const chaturbate = cbByTabId[tabId];
  if (chaturbate) {
    eventHandlers.dispatchEvent(new CustomEvent('enterPage', {
      detail: {
        data: tabId,
        chaturbate
      }
    }));
  }
});
