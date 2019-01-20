const chatList = document.querySelector('.chat-list');
const usersList = document.querySelector('.users-list');
const chatHolder = document.querySelector('.chat-holder');
const section = document.querySelector('.content .section');

function getChatLeftMargin() {
  const computed = getComputedStyle(chatHolder);
  return chatHolder.style.marginLeft || computed.marginLeft;
}

if (chatList) {
  // First form
  const chatForm = document.querySelector('.chat-form');
  const input = chatForm.querySelector('.text');
  const sendMessageButton = chatForm.querySelector('.send_message_button');

  // Separator

  const container = document.createElement('div');
  container.style.backgroundColor = 'white';
  container.style.padding = '5px 0';
  container.style.marginLeft = getChatLeftMargin();
  section.parentNode.insertBefore(container, section.nextSibling);

  // Second form

  const chatForm2 = chatForm.cloneNode({ deep: true });
  const emoticonButton2 = chatForm2.querySelector('.emoticon_button');
  const input2 = chatForm2.querySelector('.text');
  const sendMessageButton2 = chatForm2.querySelector('.send_message_button');

  input2.addEventListener('keypress', event => {
  	if (event.key === 'Enter') {
  	  event.preventDefault();

  	  sendMessageButton2.click();
  	}
  });

  sendMessageButton2.innerText = 'TRANSLATE';

  sendMessageButton2.addEventListener('click', event => {
    event.preventDefault();

    chrome.runtime.sendMessage({
      subject: 'translation',
      data: {
  	    content: input2.value,
        from: 'ru',
        to: 'en',
  	    translator: 'gtranslate'
  	  }
    }, response => {
      if (chrome.runtime.lastError) {
      	input3.value = `Error: ${chrome.runtime.lastError.message}.`;
      } else if (response.error) {
   	  	input3.value = `Error: ${response.error}.`;
   	  } else {
   	  	input3.value = response.data;
   	  }
    });
  });

  container.insertBefore(chatForm2, null);

  // Third form

  const chatForm3 = chatForm.cloneNode({ deep: true });
  const emoticonButton3 = chatForm3.querySelector('.emoticon_button');
  const input3 = chatForm3.querySelector('.text');
  const sendMessageButton3 = chatForm3.querySelector('.send_message_button');

  input3.addEventListener('keypress', event => {
  	if (event.key === 'Enter') {
  	  event.preventDefault();

  	  sendMessageButton3.click();
  	}
  });

  sendMessageButton3.addEventListener('click', event => {
    event.preventDefault();

    const tmpInput = input.value;
    input.value = input3.value;
    sendMessageButton.click();
    input.value = tmpInput;
    input2.value = '';
    input3.value = '';

    input2.focus();
  });

  chatForm2.parentNode.insertBefore(chatForm3, chatForm2.nextSibling);

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
