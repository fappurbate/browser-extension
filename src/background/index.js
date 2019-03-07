import 'babel-polyfill';
import 'chrome-storage-promise';

import * as Storage from './storage';
import * as WS from './common/ws';
import * as CB from './common/chaturbate';
import * as Chat from './common/chat';
import * as Broadcast from './common/broadcast';
import * as GTranslate from './gtranslate';
import './audio';
import './account-activity';
import './chaturbate-api';
import './tipper-info';
import './events';
import './messages';

chrome.runtime.onInstalled.addListener(async () => {
  await Storage.set({ backend: 'http://localhost:3000' });
});

Chat.events.addEventListener('open', event => {
  const { tabId, port, info } = event.detail;

  port.onMessage.addListener(async msg => {
    const { subject, data } = msg;

    if (subject === 'request-translation') {
      const { translator, msgId, content } = data;
      onRequestTranslation(translator, tabId, msgId, content);
    } else if (subject === 'request-cancel-translation') {
      const { msgId } = data;
      onRequestCancelTranslation(tabId, msgId);
    }
  });
});

WS.events.addEventListener('translation', async event => {
  const { tabId, msgId, content } = event.detail;

  const port = CB.port(tabId);
  if (!port) {
    console.debug(`Got translation, but there's no tab to send it to.`);
    return;
  }

  port.postMessage({
    subject: 'translation',
    data: { msgId, translation: content }
  });
});

async function onRequestTranslation(translator, tabId, msgId, content) {
  console.log(`Request translation to ${translator} (${tabId}, ${msgId}): ${content}`);

  if (translator === 'operator') {
    const { broadcastMainTabId } = await Storage.get(['broadcastMainTabId']);
    if (broadcastMainTabId) {
      const { cbInfo } = await Storage.get(['cbInfo']);
      const info = cbInfo[broadcastMainTabId];

      WS.emit('request-translation', {
        broadcaster: info.chat.owner,
        tabId,
        msgId,
        content: content.trim()
      });
    } else {
      WS.emit('request-translation', {
        broadcaster: null,
        tabId,
        msgId,
        content: content.trim()
      });
    }
  } else if (translator === 'gtranslate') {
    const sendTranslation = async ({ translation, correction }) => {
      const port = CB.port(tabId);

      if (port) {
        port.postMessage({
          subject: 'translation',
          data: { msgId, translation, correction }
        });
      }
    };

    try {
      const result = await GTranslate.translate(content);
      sendTranslation(result);
    } catch (error) {
      sendTranslation({ error: `Error: ${error}` });
    }
  }
}

function onRequestCancelTranslation(tabId, msgId) {
  console.log(`Request cancel translation (${tabId}, ${msgId}).`);

  WS.emit('request-cancel-translation', { tabId, msgId });
}
