'use strict';

const ports = {};

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({
    activeTabId: null,
    broadcaster: null,
    oldSkipped: false,
    backend: 'ws://localhost:8889'
  }, function () {
    // ...
  });
});

chrome.debugger.onEvent.addListener(function (source, method, params) {
  if (method === 'Network.webSocketFrameSent') {
    const payload = params.response.payloadData;

    if (payload[0] === '[') {
      const data = JSON.parse(JSON.parse(payload)[0]);

      if (data.method === 'connect') {
        chrome.storage.local.set({ broadcaster: data.data.user }, function () {
          // ...
        });
      }
    }
  }

  else if (method === 'Network.webSocketFrameReceived') {
    const payload = params.response.payloadData;

    if (payload[0] === 'a') {
      const data = JSON.parse(JSON.parse(payload.substr(1))[0]);

      chrome.storage.local.get(['oldSkipped'], function ({ oldSkipped }) {
        if (data.method === 'onRoomCountUpdate') {
          chrome.storage.local.set({ oldSkipped: true }, function () {
            // ...
          });
        } else if (data.method === 'onNotify') {
          if (oldSkipped === false) { return; }

          if (!data.args.length) { return; }
          const notification = JSON.parse(data.args[0]);

          if (notification.type === 'tip_alert') {
            onTip(notification.from_username, notification.amount);
          }
        }
      });
    }
  }
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  chrome.storage.local.get(['activeTabId'], function ({ activeTabId }) {
    if (tabId === activeTabId) {
      console.log('Disconnected from the broadcast page.');

      chrome.storage.local.set({
        activeTabId: null,
        broadcaster: null,
        oldSkipped: false
      }, function () {
        // ...
      });
    }
  });
});

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(['activeTabId'], function ({ activeTabId }) {
      if (tab.url.indexOf('chaturbate.com/b/') === -1) {
        // Navigated away from broadcasting in the same tab
        if (tabId === activeTabId) {
          chrome.storage.local.set({
            activeTabId: null,
            broadcaster: null,
            oldSkipped: false
          }, function () {
            console.log(`Detaching debugger from the old broadcast page...`);
            chrome.debugger.detach({ tabId }, function () {
              // ...
            });
          });
        }

        return;
      }

      console.log(`Chaturbate broadcast open at ${tab.url}`);
      chrome.storage.local.set({
        activeTabId: null,
        broadcaster: null,
        oldSkipped: false
      }, async function () {
        // If the tab has changed
        if (tabId !== activeTabId) {
          function attach() {
            return new Promise(function (resolve) {
              console.log(`Attaching debugger to the new broadcast page...`);
              chrome.debugger.attach({ tabId }, '1.1', function () {
                if (chrome.runtime.lastError) {
                  console.debug(`Couldn't attach debugger: ${chrome.runtime.lastError}`);
                } else {
                  chrome.debugger.sendCommand({ tabId }, 'Network.enable');
                  chrome.storage.local.set({ activeTabId: tabId }, resolve);
                }
              });
            });
          }

          if (activeTabId !== null) {
            console.log(`Detaching debugger from the old broadcast page...`);
            chrome.debugger.detach({ tabId: activeTabId }, async function () {
              if (chrome.runtime.lastError) {
                console.debug(`Couldn't detach debugger from tab ${activeTabId}: ${$chrome.runtime.lastError}.`);
              }
              await attach();
            });

            return;
          }

          await attach();
        }
      });
    });
  }
});

chrome.runtime.onConnect.addListener(function (port) {
  ports[port.sender.tab.id] = port;

  port.onDisconnect.addListener(function () {
    delete ports[port.sender.tab.id];
  });

  port.onMessage.addListener(function (msg) {
    const { msgId, content } = msg.data;

    if (msg.type === 'request-translation') {
      onRequestTranslation(port.sender.tab.id, msgId, content);
    } else if (msg.type === 'request-cancel-translation') {
      onRequestCancelTranslation(port.sender.tab.id, msgId);
    }
  });
});

wsHandlers['translation'] = function (data) {
  const { tabId, msgId, content } = data;

  const port = ports[tabId];
  if (!port) {
    console.error('No port found!');
    return;
  }

  port.postMessage({
    type: 'translation',
    data: { msgId, content }
  });
}

function onTip(tipper, amount) {
  console.log(`Got ${amount} tokens from ${tipper}.`);

  chrome.storage.local.get(['broadcaster'], function ({ broadcaster }) {
    sendTip(broadcaster, tipper, amount);
  });
}

function onRequestTranslation(tabId, msgId, content) {
  console.log(`Request translation (${tabId}, ${msgId}): ${content}`);

  sendTranslationRequest(tabId, msgId, content);
}

function onRequestCancelTranslation(tabId, msgId) {
  console.log(`Request cancel translation (${tabId}, ${msgId}).`);

  sendCancelTranslationRequest(tabId, msgId);
}
