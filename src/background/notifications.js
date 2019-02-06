import * as Broadcast from './common/broadcast';
import * as Storage from './storage';
import { playAudio } from '../common/util';

Broadcast.events.addEventListener('open', event => {
  const { tabId, port } = event.detail;

  port.onMessage.addListener(async msg => {
    if (msg.subject === 'message') {
      const { cbInfo } = await Storage.get(['cbInfo']);
      const info = cbInfo[tabId];

      if (!info.chat.ready) { return; }

      if (msg.data.type === 'private-show-end') {
        playAudio('/assets/audio/private-show-end.ogg');
      }
    }
  });
});
