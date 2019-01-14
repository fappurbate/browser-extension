<template>
  <div>
    {{ tabId }} | {{ extracting }}
  </div>
</template>

<script>
export default {
  name: 'account-activity',
  data: () => ({
    tabId: null,
    extracting: false
  }),
  created: function () {
    chrome.storage.local.get([
      'currentProfileTabId', 'currentProfileExtractingAccountActivity'
    ], ({
      currentProfileTabId, currentProfileExtractingAccountActivity
    }) => {
      this.tabId = currentProfileTabId;
      this.extracting = currentProfileExtractingAccountActivity;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }

      if (changes.currentProfileTabId) {
        this.tabId = changes.currentProfileTabId.newValue;
      } else if (changes.currentProfileExtractingAccountActivity) {
        this.extracting = changes.currentProfileExtractingAccountActivity.newValue;
      }
    });
  },
}
</script>

<style scoped>

</style>
