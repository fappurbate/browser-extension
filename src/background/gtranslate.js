import * as Storage from './storage';
import { delay } from '../common/util';

const TRANSLATION_TIMEOUT = 5000;

const ports = {};
const queue = [];
let translating = false;

chrome.runtime.onInstalled.addListener(async () => {
  await Storage.set({ gTranslateConnected: false });
});

async function translateQueue() {
  if (translating) { return; }

  while (queue.length > 0) {
    const request = queue[0];

    const port = getSomePort();
    if (!port) { break; }

    try {
      const result = await requestTranslation(port, request.content, request.from, request.to);
      request.sendResult(result);
    } catch (error) {
      request.sendResult({ translation: `Error: ${error.error}` });
    }

    queue.shift();

    await delay(300);
  }
}

async function onPortsChange() {
  if (Object.keys(ports).length === 0) {
    await Storage.set({ gTranslateConnected: false });
  } else {
    await Storage.set({ gTranslateConnected: true });
    translateQueue();
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.subject === 'translation' && msg.data && msg.data.translator === 'gtranslate') {
    const { content, from, to } = msg.data;

    translate(content, from, to)
    .then(data => sendResponse({ data }))
    .catch(error => sendResponse({ error: error.message, data: error.data }));

    return true;
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'gtranslate') { return; }

  ports[port.sender.tab.id] = port;

  port.onDisconnect.addListener(() => {
    delete ports[port.sender.tab.id];
    onPortsChange();
  });

  port.onMessage.addListener(msg => {
    // ...
  });

  onPortsChange();
});

function getSomePort() {
  const tabIds = Object.keys(ports);

  if (tabIds.length === 0) {
    return null;
  }

  return ports[tabIds[0]];
}

function requestTranslation(port, content, from, to) {
  return new Promise((resolve, reject) => {
    translating = true;

    let timeoutId = setTimeout(() => {
      timeoutId = null;
      translating = false;
    }, TRANSLATION_TIMEOUT);

    chrome.tabs.sendMessage(port.sender.tab.id, {
      subject: 'translation',
      data: { content, from, to }
    }, response => {
      if (timeoutId === null) {
        reject({ error: 'Timeout.' });
      } else {
        clearTimeout(timeoutId);
        translating = false;

        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response.error) {
          reject(response);
        } else {
          resolve(response.data);
        }
      }
    });
  });
}

export function translate(content, from = 'en', to = 'ru') {
  return new Promise(resolve => {
    queue.push({
      content,
      from,
      to,
      sendResult: resolve
    });

    translateQueue();
  });
}
