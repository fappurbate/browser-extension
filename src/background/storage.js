const globalQueue = [];

globalQueue.push = function push(id) {
  Array.prototype.push.call(this, id);
  if (this.length === 1) {
    onNext(id);
    ports.forEach(port => port.postMessage({
      subject: 'next',
      data: { id }
    }));
  }
}

globalQueue.complete = function complete() {
  if (this.length === 0) { return; }

  this.shift();
  if (this.length > 0) {
    const id = this[0];
    onNext(id);
    ports.forEach(port => port.postMessage({
      subject: 'next',
      data: { id }
    }));
  }
}


const ports = [];

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'storage') { return; }

  ports.push(port);

  port.onMessage.addListener(msg => {
    if (msg.subject === 'push') {
      const { id } = msg.data;

      globalQueue.push(id);
    } else if (msg.subject === 'complete') {
      globalQueue.complete();
    }
  });
});


const queue = [];

async function onNext(id) {
  if (id !== 'background') { return; }

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
    globalQueue.push('background');
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
    globalQueue.push('background');
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
