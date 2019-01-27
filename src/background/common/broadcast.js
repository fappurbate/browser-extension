import * as Storage from '.././storage';
import * as CB from './chaturbate';
import * as Chat from './chat';

const eventHandlers = new EventTarget;
export { eventHandlers as events };

const broadcasts = [];

chrome.runtime.onInstalled.addListener(async () => {
  await Storage.set({
    broadcastActiveTabId: null,
    broadcastMainTabId: null
  });
});

CB.addInitInfo({
  broadcast: {
    active: false
  }
});

Chat.events.addEventListener('activate', async event => {
  const { tabId, port, info } = event.detail;

  if (info.broadcast.active) {
    await Storage.set({ broadcastActiveTabId: tabId });
    eventHandlers.dispatchEvent(new CustomEvent('activate', {
      detail: { tabId, port, info }
    }));
  }
});

Chat.events.addEventListener('deactivate', async event => {
  const { tabId, port, info } = event.detail;

  if (info.broadcast.active) {
    await Storage.set({ broadcastActiveTabId: null });
    eventHandlers.dispatchEvent(new CustomEvent('deactivate', {
      detail: { tabId, port, info }
    }));
  }
});

export async function selectMain(tabId) {
  const { cbInfo } = await Storage.get(['cbInfo']);
  const info = cbInfo[tabId];
  if (!info || !info.broadcast.active) { return; }

  await Storage.set({ broadcastMainTabId: tabId });
}

export async function removeMain() {
  await Storage.set({ broadcastMainTabId: null });
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.subject === 'select-main') {
    const { tabId } = msg.data;
    await selectMain(tabId);
    sendResponse({});
  } else if (msg.subject === 'remove-main') {
    await removeMain();
    sendResponse({});
  }
});

Chat.events.addEventListener('open', async event => {
  const { tabId, port, info } = event.detail;

  async function handleMeta(data) {
    if (data.type === 'broadcast-open') {
      await Storage.set(['cbInfo'], ({ cbInfo }) => {
        cbInfo[tabId].broadcast.active = true;
        return { cbInfo };
      });
      const { cbInfo } = await Storage.get(['cbInfo']);
      const info = cbInfo[tabId];

      if (broadcasts.length === 0) {
        await selectMain(tabId);
      }
      broadcasts.push(tabId);

      eventHandlers.dispatchEvent(new CustomEvent('open', {
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

Chat.events.addEventListener('close', async event => {
  const { tabId, port, info } = event.detail;

  if (info.broadcast.active) {
    const { broadcastMainTabId } = await Storage.get(['broadcastMainTabId']);

    broadcasts.splice(broadcasts.indexOf(tabId), 1);
    if (broadcasts.length === 0) {
      await removeMain();
    } else if (tabId === broadcastMainTabId) {
      await selectMain(broadcasts[0]);
    }

    eventHandlers.dispatchEvent(new CustomEvent('close', {
      detail: { tabId, port, info }
    }));
  }
});
