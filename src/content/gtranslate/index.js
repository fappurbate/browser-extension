import 'babel-polyfill';

const port = chrome.runtime.connect();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'request-translation') {
    const { content, from, to } = msg.data;

    translate(content, from, to).then(translation =>
      sendResponse({ translation })
    );

    return true;
  }
});

const source = document.querySelector('textarea#source');
const moreFrom = document.querySelector('.sl-more');
const moreTo = document.querySelector('.tl-more');

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

  source.value = text;

  const result = await new Promise(resolve => {
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
