import * as Storage from './storage';
import * as Chat from './common/chat';
import * as WS from './common/ws';

Chat.events.addEventListener('open', event => {
  const { tabId, port, info } = event.detail;

  port.onMessage.addListener(async msg => {
    const { subject, data } = msg;

    const { cbInfo } = await Storage.get(['cbInfo']);
    const info = cbInfo[tabId];

    if (subject === 'message') {
      const messageData = { ...data.data };
      delete messageData.node;

      WS.emit('message', {
        info: {
          broadcast: info.broadcast,
          chat: info.chat
        },
        type: data.type,
        timestamp: new Date(data.timestamp),
        data: messageData
      });
    }
  });
});
