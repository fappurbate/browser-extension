const RECONNECT_INTERVAL = 2000;

const queue = [];

let ws = null;

export const events = new EventTarget;

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

  chrome.storage.local.get(['backend'], ({ backend }) => {
    console.log(`WS: (re)connecting to ${backend}.`);
    ws = new WebSocket(backend);

    ws.addEventListener('open', () => {
      console.log(`WS: connected to ${backend}.`);

      queue.forEach(msg => ws.send(msg));
      queue.length = 0;
    });

    ws.addEventListener('close', () => {
      console.log(`WS: connected closed.`);
      setTimeout(connect, RECONNECT_INTERVAL);
    });

    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'event') {
        const { subject, data } = msg;
        events.dispatchEvent(new CustomEvent(subject, { detail: data }));
      } else if (msg.type === 'request') {
        // TODO ...
      } else if (msg.type === 'response') {
        // TODO ...
      }
    });
  });
}

function reconnect() {
  if (ws && ws.readyState !== WebSocket.CLOSED || ws.readyState !== WebSocket.CLOSING) {
    ws.close();
  }
  connect();
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.backend) {
    console.log('WS: backend url has changed.');
    reconnect();
  }
});

chrome.storage.local.get(['backend'], ({ backend }) => {
  connect();
});

export function sendTip(broadcaster, tipper, amount) {
  const msg = {
    type: 'event',
    subject: 'tip',
    data: { broadcaster, tipper, amount }
  };

  sendMessage(JSON.stringify(msg));
};

export function sendTranslationRequest(tabId, msgId, content) {
  const msg = {
    type: 'event',
    subject: 'request-translation',
    data: {
      tabId,
      msgId,
      content: content.trim()
    }
  };

  sendMessage(JSON.stringify(msg));
};

export function sendCancelTranslationRequest(tabId, msgId) {
  const msg = {
    type: 'event',
    subject: 'request-cancel-translation',
    data: { tabId, msgId }
  };

  sendMessage(JSON.stringify(msg));
}
