<template>
  <div>
    <span class="title">Broadcasting:</span>
    <ul>
      <li v-for="info of broadcasts" :key="info.tabId" @click="onOpen(info)">
        <span class="broadcaster" :class="{ active: isActive(info), main: isMain(info) }">
          {{ info.chat.owner }}
        </span>
        <template v-if="!isMain(info)">
          (<span class="action" @click.stop="onSelect(info)">me?</span>)
        </template>
        <template v-else>
          (<span class="action" @click.stop="onDeselectAll()">not me?</span>)
        </template>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data: () => ({
    cbInfo: {},
    broadcastActiveTabId: null,
    broadcastMainTabId: null
  }),
  async created () {
    const { cbInfo, broadcastActiveTabId, broadcastMainTabId } = await this.$storage.get([
      'cbInfo', 'broadcastActiveTabId', 'broadcastMainTabId'
    ]);

    this.cbInfo = cbInfo;
    this.broadcastActiveTabId = broadcastActiveTabId;
    this.broadcastMainTabId = broadcastMainTabId;

    this.$storage.onChanged.addListener(changes => {
      if (changes.cbInfo) {
        this.cbInfo = changes.cbInfo.newValue;
      } else if (changes.broadcastActiveTabId) {
        this.broadcastActiveTabId = changes.broadcastActiveTabId.newValue;
      } else if (changes.broadcastMainTabId) {
        this.broadcastMainTabId = changes.broadcastMainTabId.newValue;
      }
    });
  },
  computed: {
    broadcasts() {
      return Object.values(this.cbInfo).filter(info => info.broadcast.active);
    }
  },
  methods: {
    onOpen(info) {
      const { tabId, windowId } = info;

      chrome.tabs.update(tabId, { active: true });
      chrome.windows.update(windowId, { focused: true });
    },
    async onActivate(info) {
      await Storage.set({ activeBroadcastTabId: info.tabId });
    },
    isActive(info) {
      return info.tabId === this.broadcastActiveTabId;
    },
    isMain(info) {
      return info.tabId === this.broadcastMainTabId;
    },
    onSelect(info) {
      chrome.runtime.sendMessage({
        subject: 'select-main',
        data: {
          tabId: info.tabId
        }
      }, () => {
        // ...
      });
    },
    onDeselectAll() {
      chrome.runtime.sendMessage({
        subject: 'remove-main'
      }, () => {
        // ...
      });
    }
  }
}
</script>

<style scoped>
.title {
  font-weight: bold;
}

.broadcaster {
  cursor: pointer;
}

.broadcaster.active {
  font-weight: bold;
}

.broadcaster.main {
  color: green;
}

.action {
  cursor: pointer;
}

ul {
  margin-top: 0;
  margin-bottom: 0;
}
</style>
