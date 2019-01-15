<template>
  <div>
    <template v-if="extracting">
      Extracting account activity...
      <a href="#" @click="stopExtractAccountActivity()">Stop</a>
    </template>
    <template v-else>
      <a href="#" @click="startExtractAccountActivity()">Extract account activity</a>
    </template>
    <div v-if="error" id="error">{{ error }}</div>
  </div>
</template>

<script>
export default {
  props: ['tabId'],
  data: () => ({
    extracting: false,
    error: null
  }),
  created () {
    chrome.storage.local.get(['cbActiveTabExtractingAccountActivity'], ({
      cbActiveTabExtractingAccountActivity
    }) => {
      this.extracting = cbActiveTabExtractingAccountActivity;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }

      if (changes.cbActiveTabExtractingAccountActivity) {
        this.extracting = changes.cbActiveTabExtractingAccountActivity.newValue;
      }
    });
  },
  methods: {
    startExtractAccountActivity() {
      chrome.tabs.sendMessage(this.tabId, {
        subject: 'start-extract-account-activity'
      }, response => {
        if (response.error) {
          this.error = response.error;
        } else {
          this.error = null;
        }
      });
    },
    stopExtractAccountActivity() {
      chrome.tabs.sendMessage(this.tabId, {
        subject: 'stop-extract-account-activity'
      }, response => {
        // ...
      });
    }
  }
}
</script>

<style scoped>
#error {
  font-weight: bold;
  color: red;
}
</style>
