const ports = {};

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
    }, () => {
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
    if (msg.type === 'translation-result') {
      // ...
    }
  });

  onPortsChange();
});
