import * as CB from './common/chaturbate';
import * as WS from './common/ws';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ cbActiveTabExtractingAccountActivity: false }, () => {
    // ...
  });
});

CB.events.addEventListener('enter-page', event => {
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
