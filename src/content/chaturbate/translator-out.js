import { onKeyPress } from '../../common/util';
import * as Chat from './common/chat';

const chatList = document.querySelector('.chat-list');
const usersList = document.querySelector('.users-list');
const chatHolder = document.querySelector('.chat-holder');
const section = document.querySelector('.content .section');

function getChatLeftMargin() {
  const computed = getComputedStyle(chatHolder);
  return chatHolder.style.marginLeft || computed.marginLeft;
}

if (chatList) {
  const chatForm = document.querySelector('#fake-chat-form');
  const input = chatForm.querySelector('.text');
  const sendMessageButton = chatForm.querySelector('.send_message_button');

  const container = document.createElement('div');

  const chatForm2 = chatForm.cloneNode({ deep: true });
  const emoticonButton2 = chatForm2.querySelector('.emoticon_button');
  const input2 = chatForm2.querySelector('.text');
  const sendMessageButton2 = chatForm2.querySelector('.send_message_button');

  const chatForm3 = chatForm.cloneNode({ deep: true });
  const emoticonButton3 = chatForm3.querySelector('.emoticon_button');
  const input3 = chatForm3.querySelector('.text');
  const sendMessageButton3 = chatForm3.querySelector('.send_message_button');

  const correctionContainer = document.createElement('div');
  const correctionTitle = document.createElement('span');
  const correction = document.createElement('span');

  let translating = false;

  let onCorrectionClick = null;
  correction.addEventListener('click', () => onCorrectionClick && onCorrectionClick());

  function clearCorrection() {
    correctionContainer.style.display = 'none';
    onCorrectionClick = null;
    correction.style.cursor = 'default';
  }

  // First form

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      setTimeout(() => input.focus());
    }
  });

  input.addEventListener('keyup', event => {
    if (event.key === 'Tab') {
      !event.shiftKey && input2.focus();
    }
  });

  // Container

  container.style.backgroundColor = 'white';
  container.style.padding = '5px 0';
  container.style.marginLeft = getChatLeftMargin();
  section.parentNode.insertBefore(container, section.nextSibling);

  // Second form

  chatForm2.style.display = 'block';

  chatForm2.setAttribute('id', 'source-form');

  input2.removeAttribute('id');

  input2.addEventListener('keydown', event => {
  	if (event.key === 'Enter') {
  	  event.preventDefault();

  	  sendMessageButton2.click();
    }
  });

  input2.addEventListener('keyup', event => {
  	if (event.key === 'Tab') {
      (event.shiftKey ? input : input3).focus();
    }
  });

  sendMessageButton2.innerText = 'TRANSLATE';

  sendMessageButton2.addEventListener('click', event => {
    event.preventDefault();

    if (translating) { return; }

    translating = true;
    chatForm2.classList.add('translating');
    input2.setAttribute('disabled', '');
    chatForm3.classList.add('translating');
    input3.setAttribute('disabled', '');

    chrome.runtime.sendMessage({
      subject: 'translation',
      data: {
  	    content: input2.value,
        from: 'ru',
        to: 'en',
  	    translator: 'gtranslate'
  	  }
    }, response => {
      translating = false;
      chatForm2.classList.remove('translating');
      input2.removeAttribute('disabled');
      chatForm3.classList.remove('translating');
      input3.removeAttribute('disabled');
      input2.focus();

      if (chrome.runtime.lastError) {
      	input3.value = `Error: ${chrome.runtime.lastError.message}.`;
      } else if (response.error) {
   	  	input3.value = `Error: ${response.error}.`;
   	  } else {
        const { translation, correction: correctionInfo } = response.data;

   	  	input3.value = translation;
        if (correctionInfo) {
          if (correctionInfo.didYouMean) {
            correctionTitle.innerText = 'Did you mean: ';
            correction.style.cursor = 'pointer';
            correction.innerText = correctionInfo.didYouMean;
            correctionContainer.style.display = 'initial';

            onCorrectionClick = () => {
              input2.value = correctionInfo.didYouMean;
              sendMessageButton2.click();
            };
          } else if (correctionInfo.showingTranslationFor) {
            correctionTitle.innerText = 'Showing translation for: ';
            correction.innerText = correctionInfo.showingTranslationFor;
            correctionContainer.style.display = 'initial';
          } else if (correctionInfo.translateFrom) {
            correctionTitle.innerText = 'Translate from ';
            correction.innerText = correctionInfo.translateFrom;
            correctionContainer.style.display = 'initial';
          } else {
            clearCorrection();
          }
        } else {
          clearCorrection();
        }
   	  }
    });
  });

  container.insertBefore(chatForm2, null);

  // Third form

  chatForm3.style.display = 'block';

  chatForm3.setAttribute('id', 'translation-form');

  input3.removeAttribute('id');

  input3.addEventListener('keydown', event => {
  	if (event.key === 'Enter') {
      event.preventDefault();

  	  sendMessageButton3.click();
    }
  });

  input3.addEventListener('keyup', event => {
  	if (event.key === 'Tab') {
      event.shiftKey && input2.focus();
  	}
  });

  sendMessageButton3.addEventListener('click', event => {
    event.preventDefault();

    if (translating) { return; }

    Chat.sendMessage(input3.value);
    input2.value = '';
    input3.value = '';
    correctionContainer.style.display = 'none';

    document.body.focus();
  });

  chatForm2.parentNode.insertBefore(chatForm3, chatForm2.nextSibling);

  document.addEventListener('keydown', event => {
    if (document.activeElement === document.body && event.key.length === 1) {
      input2.focus();
    }
  });

  // Correction

  correctionContainer.style.display = 'none';
  correctionContainer.style.marginLeft = '5px';
  correctionContainer.style.marginTop = '5px';
  correctionContainer.style.marginBottom = '3px';
  correctionContainer.style.fontSize = '9pt';
  correction.style.fontWeight = 'bold';
  correction.innerText = '';
  correctionContainer.appendChild(correctionTitle);
  correctionContainer.appendChild(correction);
  chatForm3.parentNode.insertBefore(correctionContainer, chatForm3.nextSibling);

  // Prevent switching tabs

  document.body.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.stopPropagation();
      event.preventDefault();
    }
  });

  // Update styles

  function updateStyles() {
    container.style.marginLeft = getChatLeftMargin();
  }

  new MutationObserver(mutations =>
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        updateStyles();
      }
    })
  ).observe(chatHolder, { attributes: true });
}
