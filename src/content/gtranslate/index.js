import 'babel-polyfill';
import { delay, downThenUp } from '../../common/util';

const port = chrome.runtime.connect({ name: 'gtranslate' });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.subject === 'translation') {
    const { content, from, to } = msg.data;

    translate(content, from, to)
    .then(data => sendResponse({ data }))
    .catch(error => sendResponse({ error: error.message, data: error.detail }));

    return true;
  }
});

const source = document.querySelector('textarea#source');
const clearSourceButton = document.querySelector('.clear');
const moreFrom = document.querySelector('.sl-more');
const moreTo = document.querySelector('.tl-more');
const closeLanguageListButton = document.querySelector('.tlid-language-list-back-button')

async function reset() {
  let button = document.querySelector(`.language_list_item_wrapper-en`);
  button.click();

  clearSource();
}

function clearSource() {
  downThenUp(clearSourceButton);
  source.value = '';
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
let resolveCorrection = null;

async function translate(text, from, to) {
  await reset();

  await setLanguageFrom(from);
  await setLanguageTo(to);

  const translationPromise = new Promise(async resolve => {
    resolveTranslation = translation => {
      resolveTranslation = null;
      resolve(translation);
    };
  });

  const correctionPromise = new Promise(resolve => {
    resolveCorrection = correction => {
      resolveCorrection = null;
      resolve(correction);
    }
  });

  await delay(1000);
  source.value = text;

  const waitForCorrection = delay(1000);
  const translation = await translationPromise;
  const correction = await Promise.race([correctionPromise, waitForCorrection]);

  resolveTranslation = null;
  resolveCorrection = null;

  return { translation, correction };
}

const resultsContainer = document.querySelector('.results-container');
let throughTranslation = false;

new MutationObserver(mutations =>
  mutations.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.target.matches('.tlid-translation.translation')) {
      throughTranslation = true;
    } else if (mutation.target.matches('.tlid-results-container')) {
      if (!throughTranslation) { return; }

      const translationNode = document.querySelector('.tlid-translation.translation');
      if (!translationNode) {
        console.debug(`Strange, but there's no translation node .tlid-translation.translation.`);
        return;
      }

      const result = translationNode.innerText;
      throughTranslation = false;
      if (resolveTranslation) {
        resolveTranslation(result);
      }
    }
  })
).observe(resultsContainer, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeOldValue: true
});

const sourceWrap = document.querySelector('.source-wrap');

new MutationObserver(mutations =>
  mutations.forEach(mutation => {
    if (mutation.type === 'attributes') {
      if (mutation.target.id === 'spelling-correction' && mutation.attributeName === 'style'
        && mutation.oldValue === 'display: none;') {
          if (!resolveCorrection) { return; }

          const node = mutation.target;

          const firstMessage = node.firstChild.textContent;
          if (firstMessage === 'Showing translation for ') {
            const showingTranslationFor = node.querySelector('a').innerText;
            const translateInstead = node.querySelector('.gt-revert-correct-message > a').innerText;
            resolveCorrection({ showingTranslationFor, translateInstead });
          } else if (firstMessage === 'Translate from: ') {
            const translateFrom = node.querySelector('a').innerText;
            resolveCorrection({ translateFrom });
          } else if (firstMessage === 'Did you mean: ') {
            const didYouMean = node.querySelector('a').innerText;
            resolveCorrection({ didYouMean });
          }
      }
    }
  })
).observe(sourceWrap, {
  subtree: true,
  attributes: true,
  attributeOldValue: true
});
