import 'babel-polyfill';
import 'chrome-storage-promise';

import Vue from 'vue';
import './index.css';

import * as Storage from '../common/storage-queue';

import GTranslate from './GTranslate.vue';
import Chaturbate from './Chaturbate.vue';
import Broadcasting from './Broadcasting.vue';
import Settings from './Settings.vue';

Vue.use({
  install(Vue, options) {
    Object.defineProperty(Vue.prototype, '$storage', {
      get() { return Storage; }
    });
  }
});

new Vue({
  el: '#app',
  components: {
    'g-translate': GTranslate,
    chaturbate: Chaturbate,
    broadcasting: Broadcasting,
    settings: Settings
  },
  plugins: [
  ]
});
