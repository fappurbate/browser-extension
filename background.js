'use strict';

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({
    activeTabId: null,
    broadcaster: null,
    oldSkipped: false,
    backend: 'http://localhost:8887'
  });
});

chrome.debugger.onEvent.addListener(function (source, method, params) {
  if (method === 'Network.webSocketFrameSent') {
    const payload = params.response.payloadData;

    if (payload[0] === '[') {
      const data = JSON.parse(JSON.parse(payload)[0]);

      if (data.method === 'joinRoom') {
        chrome.storage.local.set({ broadcaster: data.data.room }, function () {
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

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    if (tab.url.indexOf('chaturbate.com/b/') === -1) { return; }

    console.log(`Chaturbate broadcast open at ${tab.url}`);
    chrome.storage.local.get(['activeTabId'], function ({ activeTabId }) {
      chrome.storage.local.set({
        activeTabId: null,
        broadcaster: null,
        oldSkipped: false
      }, function () {
        // If the tab has changed
        if (tabId !== activeTabId) {
          if (activeTabId !== null) {
            console.log(`Detaching debugger from the old broadcast page...`);
            chrome.debugger.detach({ tabId: window.kothique.activeTabId });
          }

          console.log(`Attaching debugger to the new broadcast page...`);
          chrome.debugger.attach({ tabId }, '1.1', function () {
            chrome.debugger.sendCommand({ tabId }, 'Network.enable');
            chrome.storage.local.set({ activeTabId: tabId }, function () {
              // ...
            });
          });
        }
      });
    });
  }
});

function onTip(tipper, amount) {
  console.log(`Got ${amount} tokens from ${tipper}.`);

  chrome.storage.local.get(['backend', 'broadcaster'], function ({
    backend, broadcaster
  }) {
    fetch(`${backend}/api/tips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broadcaster,
        tipper,
        amount
      })
    }).catch(function (error) {
      console.error(`Failed to forward tip to backend:`, error);
    });
  });
}
