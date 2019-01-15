const ports = {};
const queue = [];
let translating = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    gTranslateConnected: false
  }, () => {
    // ...
  });
});

async function translateQueue() {
  while (queue.length > 0) {
    const request = queue[0];

    const port = getSomePort();
    if (!port) { break; }

    const translation = await requestTranslation(port, request.content);
    request.sendResult(translation);

    queue.shift();
  }
}

function onPortsChange() {
  if (Object.keys(ports).length === 0) {
    chrome.storage.local.set({
      gTranslateConnected: false
    });
  } else {
    chrome.storage.local.set({
      gTranslateConnected: true
    }, () => translateQueue());
  }
}

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

function requestTranslation(port, content) {
  return new Promise((resolve, reject) => {
    translating = true;

    chrome.tabs.sendMessage(port.sender.tab.id, {
      type: 'request-translation',
      data: {
        content,
        from: 'en',
        to: 'ru'
      }
    }, response => {
      translating = false;

      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response.data);
      }

      translateQueue();
    });
  });
}

export function translate(content) {
  if (translating || Object.keys(ports).length === 0) {
    return new Promise(resolve => queue.push({
      content,
      sendResult: resolve
    }));
  } else {
    return requestTranslation(getSomePort(), content);
  }
}
