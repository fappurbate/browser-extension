'use strict'

let ws = null;
let sendTip = null;

(function () {
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

  chrome.storage.local.get(['backend'], function ({ backend }) {
    ws = new WebSocket(backend);

    ws.addEventListener('open', () => {
      console.log(`WS: connected to ${backend}.`);

      queue.forEach(msg => ws.send(msg));
      queue.length = 0;
    });

    ws.addEventListener('close', () => {
      console.log(`WS: connected closed.`);
    });

    ws.addEventListener('message', event => {
      const { type, data } = JSON.parse(event.data);

      // if (type === '' ...) {
    });
  });

  sendTip = function sendTip(broadcaster, tipper, amount) {
    const msg = {
      type: 'tip',
      data: { broadcaster, tipper, amount }
    };

    sendMessage(JSON.stringify(msg));
  }
})();
