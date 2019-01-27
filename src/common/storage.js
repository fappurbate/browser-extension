import 'chrome-storage-promise';

const port = chrome.runtime.connect({ name: 'storage' });

const state = {
  id: null
};

export function init(options) {
  state.id = options.id;
}

const globalQueue = {
  push(method) {
    port.postMessage({
      subject: 'push',
      data: { id: state.id }
    });
  },
  complete() {
    port.postMessage({
      subject: 'complete'
    });
  }
};

port.onMessage.addListener(msg => {
  if (msg.subject === 'next') {
    const { id } = msg.data;

    onNext(id);
  }
});


const queue = [];

async function onNext(id) {
  if (id !== state.id) { return; }

  const { type, getVars, callback, resolve } = queue.shift();

  const vars = await chrome.storage.promise.local.get(getVars);

  if (type === 'set') {
    try {
      const setVars = await callback(vars);
      await chrome.storage.promise.local.set(setVars);
      globalQueue.complete();
      resolve();
    } catch (error) { }
  } else if (type === 'get') {
    globalQueue.complete();
    resolve(vars);
  }
}

export function set(arg1, arg2) {
  const getVars = arg2 && arg1;
  const callbackOrSetVars = arg2 || arg1;
  const callback = typeof callbackOrSetVars === 'function'
    ? callbackOrSetVars
    : () => callbackOrSetVars;

  return new Promise(resolve => {
    const method = {
      type: 'set',
      getVars,
      callback,
      resolve
    };

    queue.push(method);
    globalQueue.push(state.id);
  });
}

export function get(getVars) {
  return new Promise(resolve => {
    const method = {
      type: 'get',
      getVars,
      resolve
    };

    queue.push(method);
    globalQueue.push(state.id);
  });
}

// TODO: transactions
export const onChanged = {
  addListener(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }
      callback(changes);
    });
  }
};
