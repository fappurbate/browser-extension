import * as Storage from '.././storage';
import * as CB from './chaturbate';

const eventHandlers = new EventTarget;
export { eventHandlers as events };

chrome.runtime.onInstalled.addListener(async () => {
  await Storage.set({ chatActiveTabId: null });
});

CB.addInitInfo({
  chat: {
    active: false,
    owner: null,
    ready: false
  }
});

CB.events.addEventListener('activate', async event => {
  const { tabId, port, info } = event.detail;

  if (info.chat.active) {
    await Storage.set({ chatActiveTabId: tabId });
    // console.debug('activate', tabId, info);
    eventHandlers.dispatchEvent(new CustomEvent('activate', {
      detail: { tabId, port, info }
    }));
  }
});

CB.events.addEventListener('deactivate', async event => {
  const { tabId, port, info } = event.detail;

  if (info.chat.active) {
    await Storage.set({ chatActiveTabId: null });
    // console.debug('deactivate', tabId, info);
    eventHandlers.dispatchEvent(new CustomEvent('deactivate', {
      detail: { tabId, port, info }
    }));
  }
});

CB.events.addEventListener('open', async event => {
  const { tabId, port, info } = event.detail;

  async function handleMeta(data) {
    if (data.type === 'chat-open') {
      const { owner } = data;

      await Storage.set(['cbInfo'], ({ cbInfo }) => {
        const info = cbInfo[tabId];
        info.chat.active = true;
        info.chat.owner = owner;
        return { cbInfo };
      });

      const { cbInfo } = await Storage.get(['cbInfo']);
      const info = cbInfo[tabId];

      // console.debug('open', tabId, info);
      eventHandlers.dispatchEvent(new CustomEvent('open', {
        detail: { tabId, port, info }
      }));
    } else if (data.type === 'chat-ready') {
      await Storage.set(['cbInfo'], ({ cbInfo }) => {
        cbInfo[tabId].chat.ready = true;
        return { cbInfo };
      });

      const { cbInfo } = await Storage.get(['cbInfo']);
      const info = cbInfo[tabId];

      // console.debug('ready', tabId, info);
      eventHandlers.dispatchEvent(new CustomEvent('ready', {
        detail: { tabId, port, info }
      }));
    }
  }

  info.metaHistory.forEach(handleMeta);

  port.onMessage.addListener(async msg => {
    if (msg.subject === 'meta') {
      handleMeta(msg.data);
    }
  });
});

CB.events.addEventListener('close', async event => {
  const { tabId, port, info } = event.detail;

  if (info.chat.active) {
    // console.debug('close', tabId, info);
    eventHandlers.dispatchEvent(new CustomEvent('close', {
      detail: { tabId, port, info }
    }));
  }
});
