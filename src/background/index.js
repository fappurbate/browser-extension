import 'babel-polyfill';
import * as WS from './ws';
import * as GTranslate from './gtranslate';
import './chaturbate';
import './account-activity';

const ports = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    activeTabId: null,
    broadcaster: null,
    oldSkipped: false,
    backend: 'ws://localhost:8889'
  }, () => {
    // ...
  });
});

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.webSocketFrameSent') {
    const payload = params.response.payloadData;

    if (payload[0] === '[') {
      const data = JSON.parse(JSON.parse(payload)[0]);

      if (data.method === 'connect') {
        chrome.storage.local.set({ broadcaster: data.data.user }, () => {
          // ...
        });
      }
    }
  }

  else if (method === 'Network.webSocketFrameReceived') {
    const payload = params.response.payloadData;

    if (payload[0] === 'a') {
      const data = JSON.parse(JSON.parse(payload.substr(1))[0]);

      chrome.storage.local.get(['oldSkipped'], ({ oldSkipped }) => {
        if (data.method === 'onRoomCountUpdate') {
          chrome.storage.local.set({ oldSkipped: true }, () => {
            // ...
          });
        } else if (data.method === 'onNotify') {
          if (oldSkipped === false) { return; }

          if (!data.args.length) { return; }
          const notification = JSON.parse(data.args[0]);

          if (notification.type === 'tip_alert') {
            onTip(notification.from_username, notification.amount);
          }
        }
      });
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  chrome.storage.local.get(['activeTabId'], ({ activeTabId }) => {
    if (tabId === activeTabId) {
      console.log('Disconnected from the broadcast page.');

      chrome.storage.local.set({
        activeTabId: null,
        broadcaster: null,
        oldSkipped: false
      }, () => {
        // ...
      });
    }
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(['activeTabId'], ({ activeTabId }) => {
      if (tab.url.indexOf('chaturbate.com/b/') === -1) {
        // Navigated away from broadcasting in the same tab
        if (tabId === activeTabId) {
          chrome.storage.local.set({
            activeTabId: null,
            broadcaster: null,
            oldSkipped: false
          }, () => {
            console.log(`Detaching debugger from the old broadcast page...`);
            chrome.debugger.detach({ tabId }, () => {
              // ...
            });
          });
        }

        return;
      }

      console.log(`Chaturbate broadcast open at ${tab.url}`);
      chrome.storage.local.set({
        activeTabId: null,
        broadcaster: null,
        oldSkipped: false
      }, async () => {
        // If the tab has changed
        if (tabId !== activeTabId) {
          const attach = () => new Promise(resolve => {
            console.log(`Attaching debugger to the new broadcast page...`);
            chrome.debugger.attach({ tabId }, '1.1', () => {
              if (chrome.runtime.lastError) {
                console.debug(`Couldn't attach debugger: ${chrome.runtime.lastError}`);
              } else {
                chrome.debugger.sendCommand({ tabId }, 'Network.enable');
                chrome.storage.local.set({ activeTabId: tabId }, resolve);
              }
            });
          });

          if (activeTabId !== null) {
            console.log(`Detaching debugger from the old broadcast page...`);
            chrome.debugger.detach({ tabId: activeTabId }, async () => {
              if (chrome.runtime.lastError) {
                console.debug(`Couldn't detach debugger from tab ${activeTabId}: ${$chrome.runtime.lastError}.`);
              }
              await attach();
            });

            return;
          }

          await attach();
        }
      });
    });
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'translator') { return; }

  ports[port.sender.tab.id] = port;

  port.onDisconnect.addListener(() => {
    delete ports[port.sender.tab.id];
  });

  port.onMessage.addListener(msg => {
    if (msg.subject === 'request-translation') {
      const { translator, msgId, content } = msg.data;
      onRequestTranslation(translator, port.sender.tab.id, msgId, content);
    } else if (msg.subject === 'request-cancel-translation') {
      const { msgId } = msg.data;
      onRequestCancelTranslation(port.sender.tab.id, msgId);
    }
  });
});

WS.events.addEventListener('translation', event => {
  const { tabId, msgId, content } = event.detail;

  const port = ports[tabId];
  if (!port) {
    console.debug(`Got translation, but there's no port to send it to.`);
    return;
  }

  port.postMessage({
    subject: 'translation',
    data: { msgId, content }
  });
});

function onTip(tipper, amount) {
  console.log(`Got ${amount} tokens from ${tipper}.`);

  chrome.storage.local.get(['broadcaster'], ({ broadcaster }) => {
    WS.sendTip(broadcaster, tipper, amount);
  });
}

async function onRequestTranslation(translator, tabId, msgId, content) {
  console.log(`Request translation to ${translator} (${tabId}, ${msgId}): ${content}`);

  if (translator === 'operator') {
    WS.sendTranslationRequest(tabId, msgId, content);
  } else if (translator === 'gtranslate') {
    const sendTranslation = translation => {
      const port = ports[tabId];
      if (port) {
        port.postMessage({
          subject: 'translation',
          data: { msgId, content: translation }
        });
      }
    };

    try {
      const translation = await GTranslate.translate(content);
      sendTranslation(translation);
    } catch (error) {
      sendTranslation(`Error: ${error}`);
    }
  }
}

function onRequestCancelTranslation(tabId, msgId) {
  console.log(`Request cancel translation (${tabId}, ${msgId}).`);

  WS.sendCancelTranslationRequest(tabId, msgId);
}
