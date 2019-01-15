# Chrome Extension Message Passing protocol

Port.postMessage:
```json
{
  "subject": "|string|",
  "data": "|any+optional|"
}
```

chrome.runtime.sendMessage, chrome.tabs.sendMessage request:
```json
{
  "subject": "|string|",
  "data": "|any+optional|"
}
```

chrome.runtime.sendMessage, chrome.tabs.sendMessage successful response:
```json
{
  "data": "|any+optional|"
}
```

chrome.runtime.sendMessage, chrome.tabs.sendMessage failing response:
```json
{
    "error": "|string|",
    "data": "|any+optional|"
}
```
