import * as Storage from './storage';
import * as Chat from './common/chat';
import * as CB from './common/chaturbate';
import * as WS from './common/ws';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  setImmediate(async () => {
    const { cbInfo } = await Storage.get(['cbInfo']);
    const info = cbInfo[sender.tab.id];

    if (!info) { return; }

    if (msg.subject === 'message') {
      const { type, timestamp, info: msgInfo, data } = msg.data;

      const msgData = { ...data };
      delete msgData.node;

      try {
        const result = await WS.request('message', {
          info: {
            ...msgInfo,
            broadcast: info.broadcast,
            chat: info.chat
          },
          type,
          timestamp: new Date(timestamp),
          data: msgData
        });
        sendResponse(result || {});
      } catch (error) {
        console.error('Failed to get onMessage handler result.', error);
        sendResponse({});
      }
    }
  });

  return true;
});
