<template>
  <div>
    <div id="status">
      Chaturbate:
      <span id="open" v-if="tabId">open</span>
      <span id="closed" v-else>closed</span>
    </div>
    <account-activity v-if="tabId" :tabId="tabId"></account-activity>
  </div>
</template>

<script>
import AccountActivity from './AccountActivity.vue';

export default {
  components: {
    'account-activity': AccountActivity
  },
  data: () => ({
    tabId: null
  }),
  created () {
    chrome.storage.local.get(['cbActiveTabId'], ({
      cbActiveTabId
    }) => {
      this.tabId = cbActiveTabId;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }

      if (changes.cbActiveTabId) {
        this.tabId = changes.cbActiveTabId.newValue;
      }
    });
  }
}
</script>

<style scoped>
#status {
  font-weight: bold;
}

#status > #open {
  color: green;
}
</style>
