'use strict'

let ws = null;
let wsHandlers = {};
let sendTip = null;
let sendTranslationRequest = null;
let sendCancelTranslationRequest = null;

(function () {
  const RECONNECT_INTERVAL = 2000;

  const queue = [];

  function sendMessage(msg) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      queue.push(msg);
    } else {
      queue.forEach(msg => ws.send(msg));
      queue.length = 0;
      ws.send(msg);
    }
  }

  function connect(url) {
    ws = new WebSocket(url);

    ws.addEventListener('open', function () {
      console.log(`WS: connected to ${url}.`);

      queue.forEach(msg => ws.send(msg));
      queue.length = 0;
    });

    ws.addEventListener('close', function () {
      console.log(`WS: connected closed. Reconnecting to ${url}...`);
      setTimeout(function () {
        connect(url);
      }, RECONNECT_INTERVAL);
    });

    ws.addEventListener('message', function (event) {
      const { type, data } = JSON.parse(event.data);

      const handler = wsHandlers[type];
      handler && handler(data);
    });
  }

  function reconnect(url) {
    if (ws && ws.readyState !== WebSocket.CLOSE || ws.readyState !== WebSocket.CLOSING) {
      ws.close();
    }
    connect(url);
  }

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName === 'local' && changes.backend) {
      console.log('WS: backend url has changed. Reconnecting...');
      reconnect(changes.backend.newValue);
    }
  });

  chrome.storage.local.get(['backend'], function ({ backend }) {
    console.log(`WS: connecting to ${backend}.`);
    connect(backend);
  });

  sendTip = function sendTip(broadcaster, tipper, amount) {
    const msg = {
      type: 'tip',
      data: { broadcaster, tipper, amount }
    };

    sendMessage(JSON.stringify(msg));
  };

  sendTranslationRequest = function sendTranslationRequest(tabId, msgId, content) {
    const msg = {
      type: 'translation-request',
      data: {
        tabId,
        msgId,
        content: content.trim()
      }
    };

    sendMessage(JSON.stringify(msg));
  };

  sendCancelTranslationRequest = function sendCancelTranslationRequest(tabId, msgId) {
    const msg = {
      type: 'cancel-translation-request',
      data: { tabId, msgId }
    };

    sendMessage(JSON.stringify(msg));
  }
})();
