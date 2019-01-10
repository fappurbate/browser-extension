'use strict';

Vue.component('status', {
  template: `
    <div>
      <span id="status">
        <span class="connected" v-if="activeTabId">Connected</span>
        <span class="disconnected" v-else>Disconnected</span>
      </span>
      <span id="broadcaster" v-if="broadcaster">as {{ broadcaster }}</span>
    </div>
  `,
  data: () => ({
    activeTabId: null,
    broadcaster: null
  }),
  created: function () {
    chrome.storage.local.get(['activeTabId', 'broadcaster'], ({
      activeTabId, broadcaster
    }) => {
      this.activeTabId = activeTabId;
      this.broadcaster = broadcaster;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }

      if (changes.activeTabId) {
        this.activeTabId = changes.activeTabId.newValue;
      } else if (changes.broadcaster) {
        this.broadcaster = changes.broadcaster.newValue;
      }
    })
  }
});

Vue.component('settings', {
  template: `
    <div>
      <span class="label">Backend</span>
      <input v-model="backend" @change="onBackendChange()" type="text" />
    </div>
  `,
  data: () => ({
    backend: ''
  }),
  created: function () {
    chrome.storage.local.get(['backend'], ({
      backend
    }) => {
      this.backend = backend;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }

      if (changes.backend) {
        this.backend = changes.backend.newValue;
      }
    })
  },
  methods: {
    onBackendChange() {
      chrome.storage.local.set({ backend: this.backend });
    }
  }
});

new Vue({ el: '#app' });
