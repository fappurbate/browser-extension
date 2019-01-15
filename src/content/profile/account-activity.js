import port from './port';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'start-extract-account-activity') {
    try {
      startExtract();
      port.postMessage({ type: 'on-start-extract-account-activity' });
      sendResponse({});
    } catch (error) {
      sendResponse({ error: error.message });
    }
  } else if (msg.type === 'stop-extract-account-activity') {
    stopExtract();
    port.postMessage({ type: 'on-stop-extract-account-activity' });
    sendResponse({});
  }
});

function rowToItem(date, action, tokens) {
	if (action.startsWith('Tip from ')) {
		const newline = action.indexOf('\n');
		const tipper = newline === -1
			? action.substr(9)
			: action.substr(9, newline - 9);

		return {
			type: 'tip',
      data: {
    		tipper,
    		amount: tokens
      }
		};
	} else if (action.startsWith('Spy Show: ')) {
		const viewer = action.substr(10);

		return {
			type: 'spy-show',
      data: {
  			viewer,
  			tokens
      }
		};
	} else if (action.startsWith('Private Show: ')) {
		const viewer = action.substr(14);

		return {
			type: 'private-show',
      data: {
  			viewer,
  			tokens
      }
		};
	}

	return null;
}

function parseRow(node) {
	const date = Date(node.querySelector('td:nth-child(1)').innerText);
	const action = node.querySelector('td:nth-child(2)').innerText;
	const tokens = Number(node.querySelector('td:nth-child(3)').innerText);

	return rowToItem(date, action, tokens);
}

function sendItem(item) {
  port.postMessage({
    type: 'account-activity',
    data: item
  });
}

let observer = null;

function startExtract(port) {
	const table = document.querySelector('.account_activity');

  if (!table) {
    throw new Error('Account activity not found.');
  }

	const rows = table.querySelectorAll('tr:not(:first-child):not(:last-child)');
	rows.forEach(row => {
		const item = parseRow(row);
    item && sendItem(item);
	});

	observer = new MutationObserver(mutations =>
		mutations.forEach(mutation =>
			mutation.addedNodes.forEach(node => {
				if (node.nodeType === Node.ELEMENT_NODE && node.matches('tr:not(:first-child):not(:last-child)')) {
					const item = parseRow(node);
          item && sendItem(item);
				}
			})
		)
	);
	observer.observe(table, { childList: true, subtree: true });
}

function stopExtract() {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
}
