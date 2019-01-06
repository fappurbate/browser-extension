'use strict';

const state = window.kothique = {};
state.backend = 'http://localhost:8887';
state.activeTabId = null;
state.broadcaster = null;

chrome.runtime.onInstalled.addListener(function () {
});

let oldSkipped = false;

function refresh() {
  oldSkipped = false;
}

chrome.debugger.onEvent.addListener(function (source, method, params) {
  if (method === 'Network.webSocketFrameSent') {
    const payload = params.response.payloadData;

    if (payload[0] === '[') {
      const data = JSON.parse(JSON.parse(payload)[0]);

      if (data.method === 'joinRoom') {
        state.broadcaster = data.data.room;
      }
    }
  }

  else if (method === 'Network.webSocketFrameReceived') {
    const payload = params.response.payloadData;

    if (payload[0] === 'a') {
      const data = JSON.parse(JSON.parse(payload.substr(1))[0]);

      if (data.method === 'onRoomCountUpdate') {
        oldSkipped = true;
      }

      if (oldSkipped === false) { return; }

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

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if (tabId === state.activeTabId) {
    console.log('Disconnected from the broadcast page.');
    state.activeTabId = null;
    state.broadcaster = null;
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    if (tab.url.indexOf('chaturbate.com/b/') === -1) { return; }

    console.log(`Chaturbate broadcast open at ${tab.url}`);
    state.broadcaster = null;
    refresh();

    if (tabId !== state.activeTabId) {
      if (state.activeTabId !== null) {
        console.log(`Detaching debugger from the old broadcast page...`);
        chrome.debugger.detach({ tabId: state.activeTabId });
        state.activeTabId = null;
      }

      console.log(`Attaching debugger...`);
      chrome.debugger.attach({ tabId }, '1.1', function () {
        state.activeTabId = tabId;
        chrome.debugger.sendCommand({ tabId }, 'Network.enable');
      });
    }
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
      broadcaster: state.broadcaster,
      tipper: from,
      amount
    })
  })
  .catch(error => {
    console.error(`Failed to forward tip to backend:`, error);
  });
}
