import 'babel-polyfill';
import 'chrome-storage-promise';

import * as Storage from '../common/storage-queue';

import * as WS from './common/ws';
import * as CB from './common/chaturbate';
import * as Chat from './common/chat';
import * as Broadcast from './common/broadcast';
import * as GTranslate from './gtranslate';
import './account-activity';
import './tipper-info';

chrome.runtime.onInstalled.addListener(async () => {
  await Storage.set({ backend: 'ws://localhost:8889' });
});

const audio = document.createElement('audio');
audio.setAttribute('src', '/assets/audio/private-show-end.ogg');

Broadcast.events.addEventListener('open', event => {
  const { tabId, port } = event.detail;

  port.onMessage.addListener(async msg => {
    if (msg.subject === 'message') {
      const { cbInfo } = await Storage.get(['cbInfo']);
      const info = cbInfo[tabId];

      if (!info.chat.ready) { return; }

      const { type, data } = msg.data;

      if (type === 'tip') {
        const { node, pm, username: tipper, amount } = data;
        onTip(info.chat.owner, tipper, amount);
      } else if (type === 'private-show-end') {
          audio.play();
      }
    }
  });
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

function onTip(broadcaster, tipper, amount) {
  console.log(`Got ${amount} tokens from ${tipper}.`);
  WS.sendTip(broadcaster, tipper, amount);
}

async function onRequestTranslation(translator, tabId, msgId, content) {
  console.log(`Request translation to ${translator} (${tabId}, ${msgId}): ${content}`);

  if (translator === 'operator') {
    const { broadcastMainTabId } = await Storage.get(['broadcastMainTabId']);
    if (broadcastMainTabId) {
      const { cbInfo } = await Storage.get(['cbInfo']);
      const info = cbInfo[broadcastMainTabId];

      WS.sendTranslationRequest(info.chat.owner, tabId, msgId, content);
    } else {
      WS.sendTranslationRequest(null, tabId, msgId, content);
      return;
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

  WS.sendCancelTranslationRequest(tabId, msgId);
}
