import * as WS from './common/ws';
import * as Broadcast from './common/broadcast';

const portsByBroadcaster = {};

Broadcast.events.addEventListener('open', event => {
  const { tabId, port, info } = event.detail;

  if (!portsByBroadcaster[info.chat.owner]) {
    portsByBroadcaster[info.chat.owner] = new Set([port]);
  } else {
    portsByBroadcaster[info.chat.owner].add(port);
  }
});

Broadcast.events.addEventListener('close', event => {
  const { tabId, port, info } = event.detail;

  const ports = portsByBroadcaster[info.chat.owner];
  ports.delete(port);
  if (ports.size === 0) {
    delete portsByBroadcaster[info.chat.owner];
  }
});

WS.events.addEventListener('send-message', event => {
  const { broadcaster, message } = event.detail;

  const ports = portsByBroadcaster[broadcaster];
  if (ports) {
    ports.forEach(port => port.postMessage({
      subject: 'send-message',
      data: { message }
    }));
  }
});
