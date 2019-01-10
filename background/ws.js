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

  function connect() {
    if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) { return; }

    chrome.storage.local.get(['backend'], function ({ backend }) {
      console.log(`WS: (re)connecting to ${backend}.`);
      ws = new WebSocket(backend);

      ws.addEventListener('open', function () {
        console.log(`WS: connected to ${backend}.`);

        queue.forEach(msg => ws.send(msg));
        queue.length = 0;
      });

      ws.addEventListener('close', function () {
        console.log(`WS: connected closed.`);
        setTimeout(connect, RECONNECT_INTERVAL);
      });

      ws.addEventListener('message', function (event) {
        const { type, data } = JSON.parse(event.data);

        const handler = wsHandlers[type];
        handler && handler(data);
      });
    });
  }

  function reconnect() {
    if (ws && ws.readyState !== WebSocket.CLOSED || ws.readyState !== WebSocket.CLOSING) {
      ws.close();
    }
    connect();
  }

  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'local' && changes.backend) {
      console.log('WS: backend url has changed.');
      reconnect();
    }
  });

  chrome.storage.local.get(['backend'], function ({ backend }) {
    connect();
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
