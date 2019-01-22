import 'babel-polyfill';

import Drop from 'tether-drop';
import Tether from 'tether';

import { onHold } from '../../common/util';
import port from './common/port';
import * as Messages from './common/messages';

const CURSOR_OFFSET = 3;
const HOLD_DURATION = 500;
const HIGHLIGHT_RECENT_TRANSLATION_DURATION = 2000;

port.onMessage.addListener(msg => {
  if (msg.subject === 'translation') {
    const { msgId, translation, correction } = msg.data;

    const msgNode = document.querySelector(`.text[data-msg-id="${msgId}"]`);
    msgNode.setAttribute('data-msg-state', 'translated');
    msgNode.classList.add('recent');

    const translationNode = document.createElement('div');
    translationNode.classList.add('translation');
    translationNode.classList.add('recent');
    translationNode.innerText = translation;
    msgNode.parentNode.insertBefore(translationNode, msgNode.nextSibling);

    setTimeout(() => {
      msgNode.classList.remove('recent');
      translationNode.classList.remove('recent');
    }, HIGHLIGHT_RECENT_TRANSLATION_DURATION);
  }
});

if (Messages.isActive()) {
  const messageById = {};
  const dropByMessage = {};
  let currMessageId = 0;

  Messages.events.addEventListener('message', event => {
    const { type, data } = event.detail;
    const { node } = data;

    node.setAttribute('title', 'Hold to open menu.');
    node.setAttribute('data-msg-state', 'normal');
    onHold(node, () => onMessageAction(node));
  });

  const dropOverlay = document.createElement('div');
  dropOverlay.id = 'drop-overlay';
  document.body.insertBefore(dropOverlay, document.body.firstChild);

  function onMessageAction(node) {
    const state = node.getAttribute('data-msg-state');

    const menu = document.createElement('div');
    menu.classList.add('msg-menu');

    [
      {
        text: 'Ask Kothique',
        show: state === 'normal' || state === 'translated',
        action: () => {
          node.setAttribute('data-msg-state', 'await-translation');

          const msgId = currMessageId++;
          node.setAttribute('data-msg-id', msgId);
          messageById[msgId] = node;

          requestTranslation('operator', msgId, node.innerText);
        }
      },
      {
        text: 'Ask GTranslate',
        show: state === 'normal' || state === 'translated',
        action: () => {
          node.setAttribute('data-msg-state', 'await-translation');

          const msgId = currMessageId++;
          node.setAttribute('data-msg-id', msgId);
          messageById[msgId] = node;

          requestTranslation('gtranslate', msgId, node.innerText);
        }
      },
      {
        text: 'Cancel translation request',
        show: state === 'await-translation',
        action: () => {
          node.setAttribute('data-msg-state', 'normal');

          const msgId = Number(node.getAttribute('data-msg-id'));
          requestCancelTranslation(msgId);
        }
      }
    ].forEach(({ text, show, action }) => {
      if (!show) { return; }

      const item = document.createElement('div');
      item.classList.add('msg-menu-item');
      item.innerText = text;
      item.addEventListener('click', () => {
        action();
        drop.finish();
      });
      menu.appendChild(item);
    });

    const drop = dropByMessage[node] = new Drop({
      target: node,
      content: menu,
      classes: 'msg-menu-drop',
      position: 'bottom left',
      openOn: 'click'
    });
    drop.finish = () => {
      dropOverlay.style.display = 'none';
      dropOverlay.removeEventListener('click', drop.finish);

      node.classList.remove('active');

      drop.destroy();
      delete dropByMessage[node];
    };

    dropOverlay.style.display = 'initial';
    dropOverlay.addEventListener('click', drop.finish);

    node.classList.add('active');

    drop.open();
  }

  function requestTranslation(translator, msgId, content) {
    port.postMessage({
      subject: 'request-translation',
      data: { translator, msgId, content }
    });
  }

  function requestCancelTranslation(msgId) {
    port.postMessage({
      subject: 'request-cancel-translation',
      data: { msgId }
    });
  }
}
