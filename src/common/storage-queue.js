const queue = [];
let processing = false;

async function processQueue() {
  if (processing) { return; }
  processing = true;

  while (queue.length > 0) {
    const { type, getVars, callback, resolve } = queue[0];

    const vars = await chrome.storage.promise.local.get(getVars);

    if (type === 'set') {
      try {
        const setVars = await callback(vars);
        await chrome.storage.promise.local.set(setVars);
        resolve();
      } catch (error) { }
    } else if (type === 'get') {
      resolve(vars);
    }

    queue.shift();
  }

  processing = false;
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
    processQueue();
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
    processQueue();
  });
}

export const onChanged = {
  addListener(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') { return; }
      callback(changes);
    });
  }
};
