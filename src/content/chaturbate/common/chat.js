import port from './port';
import * as Messages from './messages';

const url = window.location.href;
let ready = false;

const broadcaster = (() => {
  if (!Messages.isActive()) { return null; }

  const regexResult = /(testbed\.)?chaturbate.com\/(b\/)?(.*?)\//.exec(url);
  if (!regexResult) { return null; }

  const str = regexResult[3];
  if (str === '') { return null; }

  // const notUsernames = [
  //   'p', 'affiliates', 'security', 'female-cams', 'male-cams', 'couple-cams',
  //   'trans-cams', 'tags', 'auth', 'accounts', 'billingsupport', 'terms',
  //   'privacy', 'law_enforcement', 'apps', 'contest', 'jobs', 'sitemap',
  //   ...[6, 12, 18, 30, 60, 90].map(tkn => `${tkn}-tokens-per-minute`),
  //   'exhibitionist-cams', 'hd-cams', 'spy-on-cams', 'new-cams',
  //   'north-american-cams', 'other-region-cams', 'euro-russian-cams',
  //   'asian-cams', 'south-american-cams', 'teen-cams', '18to21-cams',
  //   '20to30-cams', '30to50cams', 'mature-cams', 'external-link'
  // ];
  // if (notUsernames.includes(str)) { return null; }

  return str;
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

  if (type === 'subject-change') {
    ready = true;
    port.postMessage({
      subject: 'meta',
      data: {
        type: 'chat-ready'
      }
    });
  }
});

if (isActive()) {
  setTimeout(() => {
    port.postMessage({
      subject: 'meta',
      data: {
        type: 'chat-open',
        owner: broadcaster
      }
    });
  });
}
