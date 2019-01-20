import * as CB from './chaturbate';
import * as WS from './ws';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ cbActiveTabExtractingAccountActivity: false }, () => {
    // ...
  });
});

CB.events.addEventListener('enterPage', event => {
  const { chaturbate } = event.detail;

  chrome.storage.local.set({
    cbActiveTabExtractingAccountActivity: chaturbate.extractingAccountActivity
  }, () => {
    // ...
  });
});

CB.events.addEventListener('account-activity', event => {
  const { data: item, chaturbate } = event.detail;
  const { broadcaster } = chaturbate;

  if (item.type === 'tip') {
    const { tipper, amount } = item.data;

    WS.sendTip(broadcaster, tipper, amount);
  }
});

CB.events.addEventListener('extract-account-activity-start', event => {
  const { chaturbate } = event.detail;

  chaturbate.extractingAccountActivity = true;
  chrome.storage.local.set({
    cbActiveTabExtractingAccountActivity: true
  });
});

CB.events.addEventListener('extract-account-activity-stop', () => {
  const { chaturbate } = event.detail;

  chaturbate.extractingAccountActivity = false;
  chrome.storage.local.set({
    cbActiveTabExtractingAccountActivity: false
  });
});
