'use strict';

chrome.storage.local.get(['activeTabId', 'broadcaster', 'backend'], function ({
  activeTabId, broadcaster, backend
}) {
  // Status
  const status = document.getElementById('status');
  status.innerHTML = activeTabId === null
    ? `<span class="disconnected">Disconnected</span>`
    : `<span class="connected">
        Connected${broadcaster ? ` as ${broadcaster}` : ''}
      </span>`;

  // Backend address setting
  const backendInput = document.getElementById('backend');
  backendInput.setAttribute('value', backend);

  backendInput.addEventListener('change', function (event) {
    chrome.storage.local.set({ backend: event.target.value }, function () {
      // ...
    });
  });
});
