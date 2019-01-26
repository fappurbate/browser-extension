<template>
  <div>
    <span class="title">Chaturbate:</span>
    <ul>
      <li v-for="info of cbInfo" :key="info.tabId" @click="onOpen(info)">
        <span class="tab" :class="{ active: isActive(info) }">
          tab {{ info.tabId }}
        </span>
        <template v-if="!info.accountActivity.extracting">
          (<span class="action" @click.stop="onStartExtract(info)">extract</span>)
        </template>
        <template v-else>
          (<span class="action" @click.stop="onStopExtract(info)">extracting...</span>)
        </template>
        <div v-if="errors[info.tabId]" class="error">{{ errors[info.tabId] }}</div>
      </li>
    </ul>
  </div>
</template>

<script>
import Vue from 'vue';

export default {
  data: () => ({
    cbInfo: {},
    cbActiveTabId: null,
    errors: {}
  }),
  async created () {
    const { cbInfo, cbActiveTabId } = await this.$storage.get(['cbInfo', 'cbActiveTabId']);
    this.cbInfo = cbInfo;
    this.cbActiveTabId = cbActiveTabId;

    this.$storage.onChanged.addListener(changes => {
      if (changes.cbInfo) {
        this.cbInfo = changes.cbInfo.newValue;
      } else if (changes.cbActiveTabId) {
        this.cbActiveTabId = changes.cbActiveTabId.newValue;
      }
    });
  },
  methods: {
    onOpen(info) {
      const { tabId, windowId } = info;

      chrome.tabs.update(tabId, { active: true });
      chrome.windows.update(windowId, { focused: true });
    },
    isActive(info) {
      return info.tabId === this.cbActiveTabId;
    },
    onStartExtract(info) {
      const { tabId } = info;

      chrome.tabs.sendMessage(tabId, {
        subject: 'start-extract-account-activity'
      }, response => {
        if (response.error) {
          Vue.set(this.errors, tabId, response.error);
        } else {
          Vue.delete(this.errors, tabId);
        }
      });
    },
    onStopExtract(info) {
      const { tabId } = info;

      chrome.tabs.sendMessage(tabId, {
        subject: 'stop-extract-account-activity'
      }, response => {
        if (response.error) {
          Vue.set(this.errors, tabId, response.error);
        } else {
          Vue.delete(this.errors, tabId);
        }
      });
    }
  }
}
</script>

<style scoped>
.title {
  font-weight: bold;
}

.tab {
  cursor: pointer;
}

.tab.active {
  font-weight: bold;
}

.action {
  cursor: pointer;
}

.error {
  font-weight: bold;
  color: red;
}

ul {
  margin-top: 0;
  margin-bottom: 0;
}
</style>
