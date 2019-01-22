import * as Messages from './common/messages';
import * as Broadcasting from './common/broadcasting';
import { delay } from '../../common/util';

if (Broadcasting.isActive()) {
  const broadcaster = Broadcasting.getBroadcaster();
  const tippers = {};

  function saveTipperInfo(username, amount) {
    const tipperInfo = tippers[username] || (tippers[username] = {
      username,
      amount: 0
    });
    tipperInfo.amount = amount;

    return tipperInfo;
  }

  function fetchAmount(tipper) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({
        subject: 'tipper-info',
        data: {
          broadcaster,
          tipper
        }
      }, response => {
        if (chrome.runtime.lastError) {
          console.error(`Couldn't get tipper info for ${tipper} (broadcaster: ${broadcaster}):`, chrome.runtime.lastError);
        } else if (response.error) {
          if (response.error === 'no tipper info found') {
            saveTipperInfo(tipper, 0);
            resolve(0);
          } else {
            console.error(
              `Couldn't get tippper info for ${tipper} (broadcaster: ${broadcaster}): ${response.error}`, response.data
            );
          }
        } else {
          const { amount } = response.data;

          saveTipperInfo(tipper, amount);
          resolve(amount);
        }
      });
    });
  }

  function updateAmount(tipper, amount) {
    document.querySelectorAll(`.amount-${tipper}`).forEach(node =>
      node.innerText = `${amount}`
    );
  }

  function insertAmountNode(node, username, amount = null) {
    const usernameNode = node.querySelector('.username');
    usernameNode.innerText = `${username}`;

    const space = document.createTextNode(' [');
    usernameNode.parentNode.insertBefore(space, usernameNode.nextSibling);

    const amountNode = document.createElement('span');
    amountNode.classList.add(`amount-${username}`);
    amountNode.style.fontWeight = 'bold';
    if (amount !== null) {
      amountNode.innerText = `${amount}`;
    }
    space.parentNode.insertBefore(amountNode, space.nextSibling);

    const colon = document.createTextNode(']: ');
    amountNode.parentNode.insertBefore(colon, amountNode.nextSibling);
  }

  Messages.events.addEventListener('message', async event => {
    const { type, data } = event.detail;
    const { node } = data;

    if (type === 'user-message') {
      const { username, content } = data;

      if (username !== broadcaster) {
        const tipperInfo = tippers[username];
        if (tipperInfo) {
          insertAmountNode(node, username, tipperInfo.amount);
        } else {
          const amount = await fetchAmount(username);
          insertAmountNode(node, username, amount);
        }
      }
    } else if (type === 'tip') {
      if (!Broadcasting.isReady()) { return; }

      const { username: tipper, amount } = data;

      const tipperInfo = tippers[tipper];
      if (tipperInfo) {
        tipperInfo.amount += amount;
        updateAmount(tipper, tipperInfo.amount);
      } else {
        await delay(1000);
        const amount = await fetchAmount(tipper);
        updateAmount(tipper, amount);
      }
    }
  });
}
