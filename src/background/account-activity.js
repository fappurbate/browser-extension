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
      const { type, data } = msg.data;

      WS.emit('account-activity', {
        username,
        type,
        data
      });

      if (type === 'tip') {
        const { tipper, amount } = data;

        WS.emit('tip', { broadcaster: username, tipper, amount });
      }
    } else if (msg.subject === 'extract-account-activity-start') {
      WS.emit('extract-account-activity-start', { username });

      await Storage.set(['cbInfo'], ({ cbInfo }) => {
        cbInfo[tabId].accountActivity.extracting = true;
        return { cbInfo };
      });
    } else if (msg.subject === 'extract-account-activity-stop') {
      WS.emit('extract-account-activity-stop', { username });

      await Storage.set(['cbInfo'], ({ cbInfo }) => {
        cbInfo[tabId].accountActivity.extracting = false;
        return { cbInfo };
      });
    }
  });
});

CB.events.addEventListener('close', async event => {
  const { tabId, port, info } = event.detail;

  const username = (() => {
    const regexResult = /(testbed\.)?chaturbate\.com\/(p\/)?(.*?)\//
      .exec(port.sender.tab.url);
    if (!regexResult) { return null; }

    return regexResult[3];
  })();

  if (!username) { return; }

  if (info.accountActivity.extracting) {
    WS.emit('extract-account-activity-stop', { username });
  }
});
