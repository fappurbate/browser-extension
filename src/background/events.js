import * as Broadcast from './common/broadcast';
import * as Storage from './storage';
import * as WS from './common/ws';
import { playAudio } from '../common/util';

const previousTabByBroadcaster = {};

WS.events.addEventListener('$connect', async event => {
  const { socket } = event.detail;

  const { cbInfo } = await Storage.get(['cbInfo']);
  Broadcast.tabIds().forEach(tabId => {
    const info = cbInfo[tabId];
    if (info) {
      WS.emit('broadcast-start', { broadcaster: info.chat.owner });
    }
  });
});

Broadcast.events.addEventListener('open', async event => {
  const { tabId, port, info  } = event.detail;

  const previousTab = previousTabByBroadcaster[info.chat.owner];
  if (previousTab) {
    await Storage.set(['cbInfo'], ({ cbInfo }) => {
      cbInfo[previousTab].broadcast.active = false;
      return { cbInfo };
    });
    delete previousTabByBroadcaster[info.chat.owner];
    WS.emit('broadcast-stop', { broadcaster: info.chat.owner });
  } else {
    WS.emit('broadcast-start', { broadcaster: info.chat.owner });
  }
  previousTabByBroadcaster[info.chat.owner] = tabId;

  port.onMessage.addListener(async msg => {
    if (msg.subject === 'message') {
      const { cbInfo } = await Storage.get(['cbInfo']);
      const info = cbInfo[tabId];

      if (!info.chat.ready) { return; }

      const { type, data } = msg.data;

      if (type === 'private-show-end') {
        playAudio('/assets/audio/private-show-end.ogg');
      }
    }
  });
});

Broadcast.events.addEventListener('close', event => {
  const { tabId, port, info } = event.detail;

  if (info.broadcast.active) {
    delete previousTabByBroadcaster[info.chat.owner];
    WS.emit('broadcast-stop', { broadcaster: info.chat.owner });
  }
});
