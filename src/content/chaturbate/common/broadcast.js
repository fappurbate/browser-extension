import port from './port';
import * as Chat from './chat';

const url = window.location.href;

const active = (() => {
  if (!Chat.isActive()) { return false; }

  return /(testbed\.)?chaturbate.com\/b\//.test(url);
})();

export function isActive() {
  return active;
}

if (isActive()) {
  setTimeout(() => {
    port.postMessage({
      subject: 'meta',
      data: {
        type: 'broadcast-open'
      }
    });
  });
}
