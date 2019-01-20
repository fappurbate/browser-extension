import 'babel-polyfill';
import { delay, downThenUp } from '../../common/util';

const port = chrome.runtime.connect({ name: 'gtranslate' });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.subject === 'translation') {
    const { content, from, to } = msg.data;

    translate(content, from, to)
    .then(translation => sendResponse({ data: translation }))
    .catch(error => sendResponse({ error: error.message, data: error.detail }));

    return true;
  }
});

const source = document.querySelector('textarea#source');
const clearSourceButton = document.querySelector('.clear');
const moreFrom = document.querySelector('.sl-more');
const moreTo = document.querySelector('.tl-more');
const closeLanguageListButton = document.querySelector('.tlid-language-list-back-button')

function clearSource() {
  downThenUp(clearSourceButton);
}

async function closeLanguageList() {
  downThenUp(closeLanguageListButton);
}

async function setLanguageFrom(language) {
  moreFrom.click();

  let button = document.querySelector(`.language_list_sl_list .language_list_item_wrapper-${language}`);
  button.click();
}

async function setLanguageTo(language) {
  moreTo.click();

  let button = document.querySelector(`.language_list_tl_list .language_list_item_wrapper-${language}`);
  button.click();
}

let resolveTranslation = null;

async function translate(text, from, to) {
  await closeLanguageList();

  await setLanguageFrom(from);
  await setLanguageTo(to);

  if (source.value === text) {
    clearSource();
  }

  const result = await new Promise(async resolve => {
    await delay(300);

    source.value = text;
    resolveTranslation = result => {
      resolve(result);
      resolveTranslation = null;
    };
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
