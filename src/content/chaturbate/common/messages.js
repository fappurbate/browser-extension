const chatBox = document.querySelector('.chat-box');
const publicChatList = document.querySelector('.chat-list');

export function isActive() {
  return Boolean(chatBox);
}

const eventHandlers = new EventTarget;
export { eventHandlers as events };

eventHandlers.addEventListener('message', ({ detail }) => {console.log(detail)})

function handleMessageNode(node, pm = false) {
  const content = node.innerText;
  const usernameNode = node.querySelector('.username');

  if (usernameNode) {
    const username = usernameNode.getAttribute('data-nick');

    if (content.startsWith(`${username}:`)) {
      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'user-message',
          data: {
            node,
            pm,
            username,
            content: content.substr(username.length + 1)
          }
        }
      }));
    } else if (content.includes('tipped')) {
      const i1 = content.indexOf('tipped') + 'tipped '.length;
      const i2 = content.indexOf(' token');
      const amount = Number(
        content.substr(i1, i2 - i1 + 1)
      );

      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'tip',
          data: { node, pm, username, amount }
        }
      }));
    } else if (content.includes('has joined')) {
      const isBroadcaster = content.startsWith('Broadcaster');

      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'join',
          data: { node, pm, username, isBroadcaster }
        }
      }));
    } else if (content.includes('has left')) {
      const isBroadcaster = content.startsWith('Broadcaster');

      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'leave',
          data: { node, pm, username, isBroadcaster }
        }
      }));
    } else {
      console.debug(`Couldn't find out the message type: ${content}.`);
    }
  } else {
    if (content.startsWith('Notice:')) {
      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'notice',
          data: { node, pm, content }
        }
      }));
    } else if (content.includes('start private show')) {
      const i = content.indexOf(' wants');
      const username = content.substr(0, i + 1);

      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'private-show-request',
          data: { node, pm, username }
        }
      }));
    } else if (content.startsWith('Private show has finished.')) {
      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'private-show-end',
          data: { node, pm }
        }
      }));
    } else if (content.startsWith('room subject changed')) {
      const i = content.indexOf('"');
      const subject = content.substr(i + 1, content.length - i - 1);

      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'subject-change',
          data: { node, pm, subject }
        }
      }));
    } else {
      eventHandlers.dispatchEvent(new CustomEvent('message', {
        detail: {
          type: 'system-message',
          data: { node, pm, content }
        }
      }));
    }
  }
}

if (isActive()) {
  new MutationObserver(mutations =>
    mutations.forEach(mutation =>
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches('.chat-list:nth-child(5)')) { // pm chat appeared
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
