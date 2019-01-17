export function onHold(node, callback, options_ = {}) {
  const options = {
    duration: 500,
    maxDistance: 3,
    ...options_
  };

  let x1, y1, x2, y2;
  let timeoutId = null;

  node.addEventListener('mousedown', event => {
    x1 = x2 = event.clientX;
    y1 = y2 = event.clientY;

    timeoutId = setTimeout(callback, options.duration);
  }, false);

  node.addEventListener('mousemove', event => {
    x2 = event.clientX;
    y2 = event.clientY;

    const distance = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
    if (distance > options.maxDistance) {
      clearTimeout(timeoutId);
    }
  }, false);

  node.addEventListener('mouseup', event => {
    clearTimeout(timeoutId);
  }, false);
}