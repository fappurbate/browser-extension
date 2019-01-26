import port from './common/port';
import * as Messages from './common/messages';
import * as Chat from './common/chat';
import * as Broadcast from './common/broadcast';

if (Broadcast.isActive()) {
  Messages.events.on('message', async event => {
    const { type, data } = event.detail;

    if (type === 'tip') {
      const { node, pm, username, amount } = data;

      port.postMessage({
        subject: 'tip',
        data: {
          broadcaster: Chat.getBroadcaster(),
          tipper: username,
          amount
        }
      });
    }
  });
}
