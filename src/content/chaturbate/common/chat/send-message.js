const chatForm = document.querySelector('.chat-form');
const emoticonButton = chatForm.querySelector('.emoticon_button');
const input = chatForm.querySelector('.text');
const sendMessageButton = chatForm.querySelector('.send_message_button');
chatForm.style.display = 'none';

const queue = [];
let sending = false;

function sendFromQueue() {
  if (queue.length === 0) { return; }
  if (sending) { return; }

  sending = true;

  const message = queue[0];
  input.value = message;
  sendMessageButton.click();

  queue.shift();

  if (queue.length === 0) {
    sending = false;
  } else {
    setTimeout(sendFromQueue);
  }
}

export default function sendMessage(message) {
  queue.push(message);
  sendFromQueue();
}

const fakeChatForm = chatForm.cloneNode({ deep: true });
const fakeEmoticonButton = fakeChatForm.querySelector('.emoticon_button');
const fakeInput = fakeChatForm.querySelector('.text');
const fakeSendMessageButton = fakeChatForm.querySelector('.send_message_button');
fakeChatForm.style.display = 'block';

chatForm.parentNode.insertBefore(fakeChatForm, chatForm.nextSibling);

fakeChatForm.setAttribute('id', 'fake-chat-form');

fakeInput.removeAttribute('id');

fakeInput.addEventListener('keydown', event => {
	if (event.key === 'Enter') {
	  event.preventDefault();

	  fakeSendMessageButton.click();
  }
});

fakeSendMessageButton.addEventListener('click', () => {
  if (!fakeInput.value) { return; }

  sendMessage(fakeInput.value);
  fakeInput.value = '';
});
