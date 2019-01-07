const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    mutation.addedNodes.forEach(function (node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.matches('.text')) {
        node.setAttribute('title', 'Click to send to Kothique');

        let moved = false;
        node.addEventListener('mousedown', () => {
          moved = false;
        }, false);
        node.addEventListener('mousemove', () => {
          moved = true;
        }, false);
        node.addEventListener('mouseup', () => {
          if (!moved) {
            alert('Sent haha');
          }
        }, false);
      }
    });
  });
});
observer.observe(document.body, { childList: true });
