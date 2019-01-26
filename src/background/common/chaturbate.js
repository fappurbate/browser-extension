import * as Storage from '../../common/storage-queue';

const eventHandlers = new EventTarget;
export { eventHandlers as events };

const ports = {};
function getPort(tabId) { return ports[tabId]; }
export { getPort as port };

const initInfo = {};
export function addInitInfo(info) {
  Object.keys(info).forEach(key => initInfo[key] = info[key]);
}

const removedInfo = {}; // resides here until is removed by deactivate event

chrome.runtime.onInstalled.addListener(async () => {
  await Storage.set({
    cbInfo: {},
    cbActiveTabId: null
  });
});

chrome.runtime.onConnect.addListener(async port => {
  if (port.name !== 'chaturbate') { return; }

  const tabId = port.sender.tab.id;
  const windowId = port.sender.tab.windowId;

  ports[tabId] = port;

  await Storage.set(['cbInfo'], ({ cbInfo }) => {
    const info = {
      ...initInfo,
      tabId,
      windowId,
      metaHistory: []
    };
    cbInfo[tabId] = info;
    return { cbInfo };
  });

  const { cbInfo } = await Storage.get(['cbInfo']);
  const info = cbInfo[tabId];

  // console.debug('open', port.sender.tab.id, info);
  eventHandlers.dispatchEvent(new CustomEvent('open', {
    detail: { tabId, port, info }
  }));

  port.onMessage.addListener(async msg => {
    if (msg.subject === 'meta') {
      await Storage.set(['cbInfo'], ({ cbInfo }) => {
        cbInfo[tabId].metaHistory.push(msg.data);
        return { cbInfo };
      });
    }
  });

  port.onDisconnect.addListener(async () => {
    delete ports[tabId];

    const { cbInfo } = await Storage.get(['cbInfo']);
    const info = cbInfo[tabId];

    removedInfo[tabId] = info;

    await Storage.set(['cbInfo'], ({ cbInfo }) => {
      delete cbInfo[tabId];
      return { cbInfo };
    });

    // console.debug('close', port.sender.tab.id, info);
    eventHandlers.dispatchEvent(new CustomEvent('close', {
      detail: { tabId, port, info }
    }));
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const { cbInfo, cbActiveTabId } = await Storage.get(['cbInfo', 'cbActiveTabId']);
  const info = cbInfo[tabId];

  if (cbActiveTabId) {
    await Storage.set({ cbActiveTabId: null });
    const info = removedInfo[cbActiveTabId] || cbInfo[cbActiveTabId];
    delete removedInfo[cbActiveTabId];

    // console.debug('deactivate', cbActiveTabId, cbInfo[cbActiveTabId]);
    eventHandlers.dispatchEvent(new CustomEvent('deactivate', {
      detail: {
        tabId: cbActiveTabId,
        port: getPort(cbActiveTabId),
        info: cbInfo[cbActiveTabId]
      }
    }));
  }

  if (info) {
    await Storage.set({ cbActiveTabId: tabId });
    // console.debug('activate', tabId, info);
    const port = getPort(tabId);
    eventHandlers.dispatchEvent(new CustomEvent('activate', {
      detail: { tabId, port, info }
    }));
  } else {
    await Storage.set({ cbActiveTabId: null });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const { cbInfo, cbActiveTabId } = await Storage.get(['cbInfo', 'cbActiveTabId']);
  const info = cbInfo[tabId];
  if (!info) { return; }

  const port = getPort(tabId);

  if (changeInfo.status === 'loading') {
    // console.debug('deactivate', tabId, info);
    eventHandlers.dispatchEvent(new CustomEvent('deactivate', {
      detail: { tabId, port, info }
    }));
  } else if (changeInfo.status === 'complete') {
    if (cbActiveTabId !== tabId) {
      await Storage.set({ cbActiveTabId: tabId });
    }
    // console.debug('activate', tabId, info);
    eventHandlers.dispatchEvent(new CustomEvent('activate', {
      detail: { tabId, port, info }
    }));
  }
});
