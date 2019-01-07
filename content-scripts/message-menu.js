const port = chrome.runtime.connect();
port.onMessage.addListener(function (msg) {
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

const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    mutation.addedNodes.forEach(function (node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.matches('div.text')) {
        node.setAttribute('title', 'Click to send to Kothique');
        node.setAttribute('data-msg-state', 'normal');

        let moved = false;
        node.addEventListener('mousedown', function () {
          moved = false;
        }, false);
        node.addEventListener('mousemove', function () {
          moved = true;
        }, false);
        node.addEventListener('mouseup', async function () {
          if (!moved) {
            if (node.getAttribute('data-msg-state') === 'normal') {
              node.setAttribute('data-msg-state', 'await-translation');

              const msgId = currMessageId++;
              node.setAttribute('data-msg-id', msgId);
              messageById[msgId] = node;

              await requestTranslation(msgId, node.innerText);
            }
          }
        }, false);
      }
    });
  });
});
observer.observe(document.body, { childList: true, subtree: true });

async function requestTranslation(msgId, content) {
  return new Promise(function (resolve) {
    port.postMessage({
      type: 'request-translation',
      data: { msgId, content }
    });
  });
}
