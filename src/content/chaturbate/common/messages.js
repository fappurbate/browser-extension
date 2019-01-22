const chatBox = document.querySelector('.chat-box');

export function isActive() {
  return Boolean(chatBox);
}

const eventHandlers = new EventTarget;
export { eventHandlers as events };

if (isActive()) {
  new MutationObserver(mutations =>
    mutations.forEach(mutation =>
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches('div.text')) {
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
                  data: { node, username, amount }
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
                  data: { node, content }
                }
              }));
            } else {
              eventHandlers.dispatchEvent(new CustomEvent('message', {
                detail: {
                  type: 'system-message',
                  data: { node, content }
                }
              }));
            }
          }
        }
      })
    )
  ).observe(chatBox, { childList: true, subtree: true });
}
