import * as Storage from '.././storage';

import RequestTarget from '../../common/request-target';
import { CustomError } from './errors';

const RECONNECT_INTERVAL = 2000;

const queue = [];

let ws = null;

const eventHandlers = new EventTarget;
export { eventHandlers as events };

const requestHandlers = new RequestTarget;
export { requestHandlers as requests };

function sendMessage(msg) {
  queue.push(msg);
  sendQueue();
}

function sendQueue() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    queue.forEach(msg => ws.send(msg));
    queue.length = 0;
  }
}

function emit(subject, data) {
  const msg = {
    type: 'event',
    subject,
    ...data && { data }
  };

  sendMessage(JSON.stringify(msg));
}

let nextRequestId = 0;
const requests = {};

async function request(subject, data) {
  const requestId = nextRequestId++;
  const msg = {
    type: 'request',
    requestId,
    subject,
    ...data && { data }
  };

  sendMessage(JSON.stringify(msg));

  return new Promise((resolve, reject) => {
    requests[requestId] = {
      succeed: resolve,
      fail: reject
    };
  });
}

function respond(requestId, arg2 = null, arg3 = null) {
  const error = arg3 && arg2;
  const data = arg3 || arg2;

  const msg = {
    type: 'response',
    requestId,
    ...error && { error },
    ...data && { data }
  };

  sendMessage(msg);
}

async function connect() {
  if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) { return; }

  const { backend } = await Storage.get(['backend']);

  console.log(`WS: (re)connecting to ${backend}.`);
  ws = new WebSocket(backend);

  ws.addEventListener('open', () => {
    console.log(`WS: connected to ${backend}.`);
    sendQueue();
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
        respond(requestId, result);
      } catch (error) {
        respond(requestId, error.message, error.data);
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
}

function reconnect() {
  if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
    ws.close();
  }
  connect();
}

Storage.onChanged.addListener(changes => {
  if (changes.backend) {
    console.log('WS: backend url has changed.');
    reconnect();
  }
});

Storage.get(['backend']).then(({ backend }) => backend && connect());

export function requestTipperInfo(broadcaster, tipper) {
  return request('tipper-info', { broadcaster, tipper });
}

export function onTip(broadcaster, tipper, amount) {
  emit('tip', { broadcaster, tipper, amount });
}

export function sendTranslationRequest(broadcaster, tabId, msgId, content) {
  emit('request-translation', {
    broadcaster,
    tabId,
    msgId,
    content: content.trim()
  });
}

export function sendCancelTranslationRequest(tabId, msgId) {
  emit('request-cancel-translation', { tabId, msgId });
}
