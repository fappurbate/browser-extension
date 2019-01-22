import * as WS from './common/ws';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.subject === 'tipper-info') {
    const { broadcaster, tipper } = msg.data;

    WS.requestTipperInfo(broadcaster, tipper)
      .then(tipperInfo => sendResponse({ data: tipperInfo }))
      .catch(error => sendResponse({ error: error.message, data: error.data }));

    return true;
  }
});
