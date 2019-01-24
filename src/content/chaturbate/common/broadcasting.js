import * as Chat from './chat';

const url = window.location.href;

const broadcaster = (() => {
  const regexResult = /(testbed\.)?chaturbate.com\/b\/(.*?)\//.exec(url);

  return regexResult ? regexResult[2] : null;
})();

export function isActive() {
  return Boolean(broadcaster);
}

export function isReady() {
  return Chat.isReady();
}

export function getBroadcaster() {
  return broadcaster;
}
