'use strict';

const state = window.kothique = {};
window.kothique.backend = 'http://localhost:8887';
window.kothique.activeTabId = null;

chrome.runtime.onInstalled.addListener(function () {
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if (tabId === state.activeTabId) {
    console.log('Disconnected from the broadcast page.');
    state.activeTabId = null;
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    if (tab.url.indexOf('chaturbate.com/b/') === -1) { return; }

    console.log(`Chaturbate broadcast open at ${tab.url}`);

    if (state.activeTabId !== null) {
      console.log(`Detaching from the old broadcast page...`);
      chrome.debugger.detach({ tabId: state.activeTabId });
      state.activeTabId = null;
    }

    console.log(`Attaching debugger...`);
    chrome.debugger.attach({ tabId: tab.id }, '1.1', function () {
      state.activeTabId = tab.id;

      chrome.debugger.sendCommand({ tabId: tab.id }, 'Network.enable');

      chrome.debugger.onEvent.addListener(function (source, method, params) {
        if (method === 'Network.webSocketFrameSent') {
          const data = params.response.payloadData;
        }

        else if (method === 'Network.webSocketFrameReceived') {
          const payload = params.response.payloadData;

          if (payload[0] === 'a') {
            const data = JSON.parse(JSON.parse(payload.substr(1))[0]);

            if (data.method === 'onNotify') {
              if (!data.args.length) { return; }
              const notification = JSON.parse(data.args[0]);

              if (notification.type === 'tip_alert') {
                onTip(notification.from_username, notification.amount);
              }
            }
          }
        }
      });
    });
  }
});

function onTip(from, amount) {
  console.log(`Got ${amount} tokens from ${from}.`);

  fetch(`${state.backend}/api/tips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tipper: from,
      amount
    })
  })
  .catch(error => {
    console.error(`Failed to forward tip to backend.`, error);
  });
}
