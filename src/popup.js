document.getElementById('search-history').addEventListener('click', async function() {
    let data = await browser.storage.local.get('user');
    browser.windows.create({ url: service_url + "/search?user_id=" + data.user.id});
});

document.getElementById('index-history').addEventListener('click', async function() {
    let historyItems = await browser.history.search({text: '', startTime: 0});
    console.log("Indexing history with " + historyItems.length + " items");

    // Create a queue to hold the history items
    let queue = Array.from(historyItems, item => item.url);

    // Open the first 5 tabs
    try {
        console.log("opening first 5 tabs");
        for (let i = 0; i < Math.min(5, queue.length); i++) {
            let url = queue.shift();
            console.log("opening " + url);
            openTab(url);
        }
    } catch (err) {
        console.error("Error opening tabs: " + err);
    }

    // Define the function for opening a tab and setting up the listener
    function openTab(url) {
        browser.tabs.create({ url: url }).then((tab) => {
            let listener = function (tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status == 'complete') {
                    browser.tabs.onUpdated.removeListener(listener);
                    // Close the tab
                    browser.tabs.remove(tabId);
                    // Open the next URL in queue
                    if (queue.length > 0) {
                        openTab(queue.shift());
                    }
                }
            };

            browser.tabs.onUpdated.addListener(listener);
        })
            .catch(err => console.error("Error creating tab: " + err));
    }
});


