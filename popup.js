'use strict';

const tipList = document.getElementById('tipList');

const bg = chrome.extension.getBackgroundPage();

for (const tip of bg.kothique.tips) {
  const li = document.createElement('li');
  li.appendChild(document.createTextNode(tip.amount + ' tokens'));
  tipList.appendChild(li);
}
