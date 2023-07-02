browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status == 'complete' && tab.active) {
        browser.tabs.sendMessage(tabId, {action: "TabUpdated"});
    }
});
