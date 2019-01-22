import * as Messages from './messages';

const url = window.location.href;
let ready = false;

const broadcaster = (() => {
  const regexResult = /(testbed\.)?chaturbate.com\/b\/(.*?)\//.exec(url);

  return regexResult ? regexResult[2] : null;
})();

export function isActive() {
  return Boolean(broadcaster);
}

export function isReady() {
  return ready;
}

export function getBroadcaster() {
  return broadcaster;
}

Messages.events.addEventListener('message', event => {
  const { type, data } = event.detail;

  if (type === 'system-message') {
    if (data.content.startsWith('room subject changed to')) {
      ready = true;
    }
  }
});
