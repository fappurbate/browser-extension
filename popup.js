'use strict';

const bg = chrome.extension.getBackgroundPage();

const backendInput = document.getElementById('backend');
backendInput.setAttribute('value', bg.kothique.backend);

backendInput.addEventListener('change', function (event) {
  bg.kothique.backend = event.target.value;
});
