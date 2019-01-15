import 'babel-polyfill';

const port = chrome.runtime.connect();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'request-translation') {
    const { content, from, to } = msg.data;

    translate(content, from, to).then(translation =>
      sendResponse({ data: translation })
    );

    return true;
  }
});

const source = document.querySelector('textarea#source');
const clearSourceButton = document.querySelector('.clear');
const moreFrom = document.querySelector('.sl-more');
const moreTo = document.querySelector('.tl-more');

function clearSource() {
  const events = [
    document.createEvent('MouseEvents'),
    document.createEvent('MouseEvents')
  ];
  events[0].initEvent('mousedown');
  events[1].initEvent('mouseup');

  events.forEach(event => clearSourceButton.dispatchEvent(event));
}

function setLanguageFrom(language) {
  const button = document.querySelector(`.language_list_sl_list .language_list_item_wrapper-${language}`);

  moreFrom.click();
  button.click();
}

function setLanguageTo(language) {
  const button = document.querySelector(`.language_list_tl_list .language_list_item_wrapper-${language}`);

  moreTo.click();
  button.click();
}

let resolveTranslation = null;

async function translate(text, from, to) {
  setLanguageFrom(from);
  setLanguageTo(to);

  if (source.value === text) {
    clearSource();
  }

  const result = await new Promise(resolve => {
    setTimeout(() => {
      source.value = text;
      resolveTranslation = result => {
        resolve(result);
        resolveTranslation = null;
      };
    }, 300);
  });

  return result;
}

const resultsContainer = document.querySelector('.results-container');
let throughTranslation = false;

const observer = new MutationObserver(mutations =>
  mutations.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.target.matches('.tlid-translation.translation')) {
      throughTranslation = true;
    } else if (mutation.target.matches('.tlid-results-container')) {
      if (!throughTranslation) { return; }

      const result = document.querySelector('.tlid-translation.translation').innerText;
      throughTranslation = false;
      if (resolveTranslation) {
        resolveTranslation(result);
      }
    }
  })
);
observer.observe(resultsContainer, { subtree: true, childList: true, attributes: true });
