<template>
  <div>
    <span id="status">
      <span class="connected" v-if="activeTabId">Connected</span>
      <span class="disconnected" v-else>Disconnected</span>
    </span>
    <span id="broadcaster" v-if="broadcaster">as {{ broadcaster }}</span>
  </div>
</template>

<script>
export default {
  name: 'status',
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
}
</script>

<style scoped>
#status {
  font-weight: bold;
}

#status > .disconnected {
  color: red;
}

#status > .connected {
  color: green;
}
</style>
