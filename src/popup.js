document.getElementById('search-history').addEventListener('click', async function() {
    let data = await browser.storage.local.get('user');
    browser.windows.create({ url: service_url + "/search?user_id=" + data.user.id});
});

document.getElementById('index-history').addEventListener('click', function() {
    browser.history.search({text: '', startTime: 0}).then((historyItems) => {
        for (let item of historyItems) {
            let url = item.url;
            // Open a new tab and wait for it to load completely before moving on to the next URL
            browser.tabs.create({ url: url }).then((tab) => {
                browser.tabs.onUpdated.addListener(function listener (tabId, changeInfo) {
                    if (tabId === tab.id && changeInfo.status == 'complete') {
                        browser.tabs.onUpdated.removeListener(listener);
                        // Close the tab
                        browser.tabs.remove(tabId);
                        // Move on to the next URL in history
                    }
                });
            });
        }
    });
});
