import 'babel-polyfill';

const CURSOR_OFFSET = 3;
const HOLD_DURATION = 700;

const port = chrome.runtime.connect();
port.onMessage.addListener(msg => {
  if (msg.type === 'translation') {
    const { msgId, content } = msg.data;

    const msgNode = document.querySelector(`.text[data-msg-id="${msgId}"]`);
    msgNode.setAttribute('data-msg-state', 'translated');

    const translationNode = document.createElement('div');
    translationNode.classList.add('translation');
    translationNode.innerText = content;
    msgNode.parentNode.insertBefore(translationNode, msgNode.nextSibling);
  }
});

const messageById = {};
let currMessageId = 0;

const observer = new MutationObserver(mutations =>
  mutations.forEach(mutation =>
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.matches('div.text')) {
        node.setAttribute('title', 'Click to send to Kothique');
        node.setAttribute('data-msg-state', 'normal');

        let timeoutId = null;
        node.addEventListener('mousedown', () => {
          timeoutId = setTimeout(() => {
            const state = node.getAttribute('data-msg-state');

            if (state === 'normal') {
              node.setAttribute('data-msg-state', 'await-translation');

              const msgId = currMessageId++;
              node.setAttribute('data-msg-id', msgId);
              messageById[msgId] = node;

              requestTranslation(msgId, node.innerText);
            }

            else if (state === 'await-translation') {
              node.setAttribute('data-msg-state', 'normal');

              const msgId = Number(node.getAttribute('data-msg-id'));
              requestCancelTranslation(msgId);
            }
          }, HOLD_DURATION);
        }, false);
        node.addEventListener('mousemove', () => {
          clearTimeout(timeoutId);
          timeoutId = null;
        }, false);
        node.addEventListener('mouseup', async () => {
          clearTimeout(timeoutId);
          timeoutId = null;
        }, false);
      }
    })
  )
);
observer.observe(document.body, { childList: true, subtree: true });

function requestTranslation(msgId, content) {
  port.postMessage({
    type: 'request-translation',
    data: { msgId, content }
  });
}

function requestCancelTranslation(msgId) {
  port.postMessage({
    type: 'request-cancel-translation',
    data: { msgId }
  });
}
