<template>
  <div>
    <span class="label">Backend:</span>
    <input v-model="backend" @change="onBackendChange" type="text" />
  </div>
</template>

<script>
export default {
  data: () => ({
    backend: ''
  }),
  async created () {
    const { backend } = await this.$storage.get(['backend']);
    this.backend = backend;

    this.$storage.onChanged.addListener(changes => {
      if (changes.backend) {
        this.backend = changes.backend.newValue;
      }
    });
  },
  methods: {
    async onBackendChange() {
      await this.$storage.set({ backend: this.backend });
    }
  }
}
</script>

<style scoped>
.label {
  font-weight: bold;
}
</style>
