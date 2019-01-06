'use strict';

const bg = chrome.extension.getBackgroundPage();
const state = bg.kothique;

// Status
const status = document.getElementById('status');
status.innerHTML = state.activeTabId === null
  ? `<span class="disconnected">Disconnected</span>`
  : `<span class="connected">
      Connected${state.broadcaster ? ` as ${state.broadcaster}` : ''}
    </span>`;

// Backend address setting
const backendInput = document.getElementById('backend');
backendInput.setAttribute('value', state.backend);

backendInput.addEventListener('change', function (event) {
  state.backend = event.target.value;
});
