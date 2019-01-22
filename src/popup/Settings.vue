<template>
  <div>
    <span class="label">Backend</span>
    <input v-model="backend" @change="onBackendChange" type="text" />
  </div>
</template>

<script>
export default {
  data: () => ({
    backend: ''
  }),
  created () {
    chrome.storage.local.get(['backend'], ({ backend }) => {
      this.backend = backend;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }

      if (changes.backend) {
        this.backend = changes.backend.newValue;
      }
    });
  },
  methods: {
    onBackendChange() {
      chrome.storage.local.set({ backend: this.backend });
    }
  }
}
</script>

<style scoped>
</style>
