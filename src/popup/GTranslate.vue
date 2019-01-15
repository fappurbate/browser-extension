<template>
  <div>
    <span id="status">
      GTranslate:
      <span v-if="connected" id="connected">
        connected
      </span>
      <span v-else id="disconnected">
        disconnected
      </span>
    </span>
  </div>
</template>

<script>
export default {
  data: () => ({
    connected: false
  }),
  created () {
    chrome.storage.local.get(['gTranslateConnected'], ({
      gTranslateConnected
    }) => {
      this.connected = gTranslateConnected;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }

      if (changes.gTranslateConnected) {
        this.connected = changes.gTranslateConnected.newValue;
      }
    });
  }
}
</script>

<style scoped>
#status > #connected {
  color: green;
}

#status > #disconnected {
  color: red;
}

#status {
  font-weight: bold;
}
</style>
