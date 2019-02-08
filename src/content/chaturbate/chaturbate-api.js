import port from './common/port';
import * as Broadcast from './common/broadcast';
import * as Chat from './common/chat';

if (Broadcast.isActive()) {
  port.onMessage.addListener(msg => {
    if (msg.subject === 'send-message') {
      const { message } = msg.data;

      Chat.sendMessage(message);
    }
  });
}
