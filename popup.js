'use strict';

const bg = chrome.extension.getBackgroundPage();
const state = bg.kothique;

// Status
const status = document.getElementById('status');
status.innerHTML = state.activeTabId === null
  ? 'Disconnected'
  : 'Connected';

// Backend address setting
const backendInput = document.getElementById('backend');
backendInput.setAttribute('value', state.backend);

backendInput.addEventListener('change', function (event) {
  state.backend = event.target.value;
});
