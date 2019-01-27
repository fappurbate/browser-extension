import * as Storage from './storage';
import * as CB from './common/chaturbate';
import * as WS from './common/ws';

CB.addInitInfo({
  accountActivity: {
    extracting: false
  }
});

CB.events.addEventListener('open', async event => {
  const { tabId, port, info } = event.detail;

  const username = (() => {
    const regexResult = /(testbed\.)?chaturbate\.com\/(p\/)?(.*?)\//
      .exec(port.sender.tab.url);
    if (!regexResult) { return null; }

    return regexResult[3];
  })();

  if (!username) { return; }

  port.onMessage.addListener(async msg => {
    if (msg.subject === 'account-activity') {
      const { data: item } = msg;

      if (item.type === 'tip') {
        const { tipper, amount } = item.data;

        WS.sendTip(username, tipper, amount);
      }
    } else if (msg.subject === 'extract-account-activity-start') {
      await Storage.set(['cbInfo'], ({ cbInfo }) => {
        cbInfo[tabId].accountActivity.extracting = true;
        return { cbInfo };
      });
    } else if (msg.subject === 'extract-account-activity-stop') {
      await Storage.set(['cbInfo'], ({ cbInfo }) => {
        cbInfo[tabId].accountActivity.extracting = false;
        return { cbInfo };
      });
    }
  });
});
