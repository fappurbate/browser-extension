import 'babel-polyfill';

import Drop from 'tether-drop';
import Tether from 'tether';

import { onHold } from '../../common/util';
import port from './common/port';
import * as Messages from './common/messages';
import * as Chat from './common/chat';

const CURSOR_OFFSET = 3;
const HOLD_DURATION = 500;
const HIGHLIGHT_RECENT_TRANSLATION_DURATION = 2000;

if (Chat.isActive()) {
  const messageById = {};
  const dropByMessage = {};
  let currMessageId = 1;

  port.onMessage.addListener(msg => {
    if (msg.subject === 'translation') {
      const { msgId, translation, correction } = msg.data;

      const msgNode = document.querySelector(`.text[data-msg-id="${msgId}"]`);
      msgNode.setAttribute('data-msg-state', 'translated');
      msgNode.removeAttribute('data-loading');
      msgNode.classList.add('fb-recent');

      const translationNode = document.createElement('div');
      translationNode.classList.add('fb-translation');
      translationNode.classList.add('fb-recent');
      msgNode.parentNode.insertBefore(translationNode, msgNode.nextSibling);

      {
        const contentNode = document.createElement('div');
        contentNode.classList.add('fb-content');
        contentNode.innerText = translation;
        translationNode.appendChild(contentNode);
      }

      if (correction && correction.didYouMean) {
        const correctionNode = document.createElement('div');
        correctionNode.classList.add('fb-correction');
        translationNode.appendChild(correctionNode);

        correctionNode.appendChild(document.createTextNode('Did you mean: '));

        const contentNode = document.createElement('span');
        contentNode.classList.add('fb-content');
        contentNode.innerText = correction.didYouMean;

        contentNode.addEventListener('click', () => {
          translationNode.remove();

          msgNode.setAttribute('data-loading', '');

          const attr = msgNode.getAttribute('data-msg-id');
          const msgId = attr ? Number(attr) : (() => {
            const msgId = currMessageId++;
            msgNode.setAttribute('data-msg-id', msgId);
            messageById[msgId] = msgNode;

            return msgId;
          })();

          requestTranslation('gtranslate', msgId, correction.didYouMean);
        });

        correctionNode.appendChild(contentNode);
      }

      setTimeout(() => {
        msgNode.classList.remove('fb-recent');
        translationNode.classList.remove('fb-recent');
      }, HIGHLIGHT_RECENT_TRANSLATION_DURATION);
    }
  });

  Messages.events.addEventListener('message', event => {
    const { type, data } = event.detail;
    const { node } = data;

    node.setAttribute('title', 'Hold to open menu.');
    node.setAttribute('data-msg-state', 'normal');
    onHold(node, () => onMessageAction(node));
  });

  const dropOverlay = document.createElement('div');
  dropOverlay.classList.add('fb-drop-overlay');
  document.body.insertBefore(dropOverlay, document.body.firstChild);

  function onMessageAction(node) {
    const state = node.getAttribute('data-msg-state');
    const loading = node.getAttribute('data-loading') !== null;

    const menu = document.createElement('div');
    menu.classList.add('fb-msg-menu');

    [
      {
        text: 'Ask Kothique',
        show: !loading,
        action: () => {
          node.setAttribute('data-loading', '');

          const attr = node.getAttribute('data-msg-id');
          const msgId = attr ? Number(attr) : (() => {
            const msgId = currMessageId++;
            node.setAttribute('data-msg-id', msgId);
            messageById[msgId] = node;

            return msgId;
          })();

          requestTranslation('operator', msgId, node.innerText);
        }
      },
      {
        text: 'Ask GTranslate',
        show: !loading,
        action: () => {
          node.setAttribute('data-loading', '');

          const attr = node.getAttribute('data-msg-id');
          const msgId = attr ? Number(attr) : (() => {
            const msgId = currMessageId++;
            node.setAttribute('data-msg-id', msgId);
            messageById[msgId] = node;

            return msgId;
          })();

          requestTranslation('gtranslate', msgId, node.innerText);
        }
      },
      {
        text: 'Cancel translation request',
        show: loading,
        action: () => {
          node.removeAttribute('data-loading');

          const msgId = Number(node.getAttribute('data-msg-id'));
          requestCancelTranslation(msgId);
        }
      }
    ].forEach(({ text, show, action }) => {
      if (!show) { return; }

      const item = document.createElement('div');
      item.classList.add('fb-msg-menu-item');
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
      classes: 'fb-msg-menu-drop',
      position: 'bottom left',
      openOn: 'click'
    });
    drop.finish = () => {
      dropOverlay.style.display = 'none';
      dropOverlay.removeEventListener('click', drop.finish);

      node.classList.remove('fb-active');

      drop.destroy();
      delete dropByMessage[node];
    };

    dropOverlay.style.display = 'initial';
    dropOverlay.addEventListener('click', drop.finish);

    node.classList.add('fb-active');

    drop.open();
  }

  function requestTranslation(translator, msgId, content) {
    port.postMessage({
      subject: 'request-translation',
      data: {
        translator,
        msgId,
        content
      }
    });
  }

  function requestCancelTranslation(msgId) {
    port.postMessage({
      subject: 'request-cancel-translation',
      data: { msgId }
    });
  }
}
