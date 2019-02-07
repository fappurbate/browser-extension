import port from './common/port';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.subject === 'start-extract-account-activity') {
    try {
      startExtract();
      sendResponse({});
    } catch (error) {
      sendResponse({ error: error.message });
    }
  } else if (msg.subject === 'stop-extract-account-activity') {
    stopExtract();
    sendResponse({});
  }
});

function rowToItem(timestamp, action, tokens) {
	if (action.startsWith('Tip from ')) {
		const newline = action.indexOf('\n');
		const tipper = newline === -1
			? action.substr(9)
			: action.substr(9, newline - 9);

		return {
			type: 'tip',
      timestamp,
      data: {
    		tipper,
    		amount: tokens
      }
		};
	} else if (action.startsWith('Spy Show: ')) {
		const viewer = action.substr(10);

		return {
			type: 'spy-show',
      timestamp,
      data: {
  			viewer,
  			tokens
      }
		};
	} else if (action.startsWith('Private Show: ')) {
		const viewer = action.substr(14);

		return {
			type: 'private-show',
      timestamp,
      data: {
  			viewer,
  			tokens
      }
		};
	}

  console.log(`Unknown type of account activity history item: ${action}.`);

	return null;
}

function parseRow(node) {
	const timestamp = parseDate(node.querySelector('td:nth-child(1)').innerText);
	const action = node.querySelector('td:nth-child(2)').innerText;
	const tokens = Number(node.querySelector('td:nth-child(3)').innerText);

	return rowToItem(timestamp, action, tokens);
}

function parseDate(str) {
  const result = /(.*?)\. (\d+), (\d+), (\d+)(:(\d+))? (a|p)\.m\./.exec(str);
  if (result) {
    const [match, month, day, year, hour12, _, minutesOrNone, ap] = result;

    const hour = (hour12 => {
      if (ap === 'a') {
        return hour12 === 12 ? 0 : hour12;
      } else {
        return hour12 === 12 ? 12 : hour12 + 12;
      }
    })(+hour12);

    const minutes = minutesOrNone || 0;

    return new Date(`${year}-${day}-${month}T${hour}:${minutes}:00.000Z`);
  } else {
    console.warn(`Failed to parse date in account activity: ${str}.`);
    return null;
  }
}

function sendItem(item) {
  port.postMessage({
    subject: 'account-activity',
    data: item
  });
}

let observer = null;

function startExtract() {
	const table = document.querySelector('.account_activity');

  if (!table) {
    throw new Error('Account activity not found.');
  }

  port.postMessage({ subject: 'extract-account-activity-start' });

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
    port.postMessage({ subject: 'extract-account-activity-stop' });
	}
}
