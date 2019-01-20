import RequestTarget from '../common/request-target';

const RECONNECT_INTERVAL = 2000;

const queue = [];

let ws = null;

const eventHandlers = new EventTarget;
export { eventHandlers as events };

const requestHandlers = new RequestTarget;
export { requestHandlers as requests };

const requests = {};

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

    let nextRequestId = 0;
    const requests = {};

    ws.request = async function (subject, data) {
      const requestId = nextRequestId++;
      const msg = {
        type: 'request',
        requestId,
        subject,
        ...data && { data }
      };

      ws.send(JSON.stringify(msg));

      return new Promise((resolve, reject) => {
        requests[requestId] = {
          succeed: resolve,
          fail: reject
        };
      });
    };

    ws.addEventListener('open', () => {
      console.log(`WS: connected to ${backend}.`);

      queue.forEach(msg => ws.send(msg));
      queue.length = 0;
    });

    ws.addEventListener('close', () => {
      console.log(`WS: connection closed.`);
      setTimeout(connect, RECONNECT_INTERVAL);
    });

    ws.addEventListener('message', async event => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'event') {
        const { subject, data } = msg;
        eventHandlers.dispatchEvent(new CustomEvent(subject, { detail: data }));
      } else if (msg.type === 'request') {
        const { subject, requestId, data } = msg;

        try {
          const result = await requestHandlers.request(subject, data);
          const msg = {
            type: 'response',
            requestId,
            ...result && { data: result }
          };

          ws.send(JSON.stringify(msg));
        } catch (error) {
          const msg = {
            type: 'response',
            requestId,
            error: error.message,
            ...error.data && { data: error.data }
          };

          ws.send(JSON.stringify(msg));
        }
      } else if (msg.type === 'response') {
        const { subject, requestId } = msg;

        const callbacks = requests[requestId];
        if (!callbacks) {
          console.warn(`Got response to unknown request: ${requestId}.`);
          return;
        } else {
          delete requests[requestId];
        }
        const { succeed, fail } = callbacks;

        if (msg.error) {
          const { error, data } = msg;
          fail(new CustomError(error, data));
        } else {
          const { data } = msg;
          succeed(data);
        }
      }
    });
  });
}

function reconnect() {
  if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
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
  if (backend) {
    connect();
  }
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
