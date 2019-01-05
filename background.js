'use strict';

window.kothique = {};
window.kothique.backend = 'http://localhost:8887';

chrome.runtime.onInstalled.addListener(function () {
});

let first = true;
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    if (tab.url.indexOf('chaturbate.com/b/') === -1) { return; }

    if (!first) { return; }
    first = false;

    chrome.debugger.attach({ tabId: tab.id }, '1.1', function () {
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
  console.log('got ' + amount + ' tokens from ' + from);
  window.kothique.tips.push({ amount });
}
