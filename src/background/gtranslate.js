const ports = {};
const queue = [];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    gTranslateConnected: false
  }, () => {
    // ...
  });
});

function onPortsChange() {
  if (Object.keys(ports).length === 0) {
    chrome.storage.local.set({
      gTranslateConnected: false
    });
  } else {
    chrome.storage.local.set({
      gTranslateConnected: true
    }, async () => {
      for (const request of queue) {
        const translation = await requestTranslation(getSomePort(), request.content);
        request.sendResult(translation);
      }
      queue = [];
    });
  }
}

chrome.runtime.onConnect.addListener(port => {
  if (!/translate\.google\.com/.test(port.sender.url)) { return; }

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
  return new Promise(resolve => {
    chrome.tabs.sendMessage(port.sender.tab.id, {
      type: 'request-translation',
      data: {
        content,
        from: 'en',
        to: 'ru'
      }
    }, response => resolve(response.translation));
  });
}

export function translate(content) {
  if (Object.keys(ports).length === 0) {
    return new Promise(resolve => queue.push({
      content,
      sendResult: resolve
    }));
  } else {
    return requestTranslation(getSomePort(), content);
  }
}
