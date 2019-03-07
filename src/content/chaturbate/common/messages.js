const chatBox = document.querySelector('.chat-box');
const publicChatList = document.querySelector('.chat-list');

export function isActive() {
  return Boolean(chatBox);
}

const eventHandlers = new EventTarget;
export { eventHandlers as events };

function handleMessage(payload) {
  const { type, timestamp, data } = payload;

  const { node, pm } = data;
  node.style.display = 'none';

  chrome.runtime.sendMessage({
    subject: 'message',
    data: {
      type,
      info: {},
      timestamp: timestamp.toString(),
      data
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.log(response);
      console.log(chrome.runtime.lastError);
      console.error(`Failed to get message extra info from backend.`, chrome.runtime.lastError);
      return;
    }

    const hidden = typeof response.hidden === 'boolean' ? response.hidden : false;

    if (!hidden) { node.style.display = 'block'; }

    const info = { hidden };
    eventHandlers.dispatchEvent(new CustomEvent('message', {
      detail: {
        type,
        timestamp,
        info,
        data
      }
    }));
  });
}

function handleMessageNode(node, pm = false) {
  const content = node.textContent;
  const usernameNode = node.querySelector('.username');

  const timestamp = new Date;

  if (usernameNode) {
    const username = usernameNode.getAttribute('data-nick');

    if (content.startsWith(`${username}:`)) {
      handleMessage({
        type: 'user-message',
        timestamp,
        data: {
          node,
          pm,
          username,
          content: content.substr(username.length + 1)
        }
      });
    } else if (content.includes('tipped')) {
      const i1 = content.indexOf('tipped') + 'tipped '.length;
      const i2 = content.indexOf(' token');
      const amount = Number(
        content.substr(i1, i2 - i1 + 1)
      );

      handleMessage({
        type: 'tip',
        timestamp,
        data: { node, pm, username, amount }
      });
    } else if (content.includes('has joined')) {
      const isBroadcaster = content.startsWith('Broadcaster');

      handleMessage({
        type: 'join',
        timestamp,
        data: { node, pm, username, isBroadcaster }
      });
    } else if (content.includes('has left')) {
      const isBroadcaster = content.startsWith('Broadcaster');

      handleMessage({
        type: 'leave',
        timestamp,
        data: { node, pm, username, isBroadcaster }
      });
    } else if (content.startsWith('New private conversation')) {
      handleMessage({
        type: 'new-pm',
        timestamp,
        data: { node, username }
      });
    } else {
      console.debug(`Couldn't find out the message type: ${content}.`);
    }
  } else { // No username node.
    if (content.startsWith('Notice:')) {
      handleMessage({
        type: 'notice',
        timestamp,
        data: { node, pm, content: content.substr('Notice: '.length) }
      });
    } else if (content.includes('start private show')) {
      const i = content.indexOf(' wants');
      const username = content.substr(0, i + 1);

      handleMessage({
        type: 'private-show-request',
        timestamp,
        data: { node, pm, username }
      });
    } else if (content.startsWith('Private show has started.')) {
      handleMessage({
        type: 'private-show-start',
        timestamp,
        data: { node, pm }
      });
    } else if (content.startsWith('Private show has finished.')) {
      handleMessage({
        type: 'private-show-end',
        timestamp,
        data: { node, pm }
      });
    } else if (content.startsWith('room subject changed')) {
      const i = content.indexOf('"');
      const subject = content.substr(i + 1, content.length - i - 1);

      handleMessage({
        type: 'subject-change',
        timestamp,
        data: { node, pm, subject }
      });
    } else {
      handleMessage({
        type: 'system-message',
        timestamp,
        data: { node, pm, content }
      });
    }
  }
}

if (isActive()) {
  new MutationObserver(mutations =>
    mutations.forEach(mutation =>
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches('.chat-list:not(:nth-child(3))')) { // pm chat appeared
            node.querySelectorAll('div.text').forEach(node => handleMessageNode(node, true));
            observeMessages(node, true);
          }
        }
      })
    )
  ).observe(chatBox, { childList: true, subtree: true });

  observeMessages(publicChatList);

  function observeMessages(chatList, pm = false) {
    new MutationObserver(mutations =>
      mutations.forEach(mutation =>
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches('div.text')) {
            handleMessageNode(node, pm);
          }
        })
      )
    ).observe(chatList, { childList: true, subtree: true });
  }
}
