//
// Generate and save user_id
//
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function checkUserId() {
    let data = await browser.storage.local.get('user');

    if (!data.user || !data.user.id) {
        let user = { id: generateUUID() };
        await browser.storage.local.set({ user });
        data.user = user
    }
    console.log(ext_name + " User ID: " + data.user.id);
}

checkUserId().catch(err => console.error(err));

//
// Completion listener
//
function isSpecialUrl(url) {
    const specialProtocols = [
        'about:',
        'moz-extension:',
        'view-source:',
        'chrome:',
        'file:',
        'chrome-extension:',
        'chrome-devtools:',
        getServiceUrl()
    ];

    for (const protocol of specialProtocols) {
        if (url.startsWith(protocol)) {
            console.log("Ignoring special URL: " + url)
            return true;
        }
    }

    return false;
}

let tabPaths = {};
let pathContents = {};
let inactivityTimers = {};

function getTabTextWithRetry(tab, retries=3) {
    browser.tabs.executeScript(tab.id, {
        code: 'document.documentElement.innerText;'
    }).then((results) => {
        if (results[0] === undefined) {
            console.log("TR " + tab.url + " text is undefined");
            return;
        }
        if (results[0] !== "") {
            let urlObj = new URL(tab.url);
            let newPath = urlObj.host + urlObj.pathname;
            let newContent = {
                text: results[0],
                url: tab.url,
                title: tab.title,
                path: newPath
            };
            if (tabPaths[tab.id] !== undefined && tabPaths[tab.id] !== newPath) {
                console.log("TR " + tab.id + " path changed to " + newPath + " (saving old path " + tabPaths[tab.id] + ")");
                saveText(pathContents[tabPaths[tab.id]]);
            }
            console.log("TR " + tab.id + " text updated for " + newPath);
            tabPaths[tab.id] = newPath;
            pathContents[newPath] = newContent;
        }

        if (inactivityTimers[tab.id]) {
            clearTimeout(inactivityTimers[tab.id]);
        }
        inactivityTimers[tab.id] = setTimeout(() => {
            console.log("TR timer saving " + tab.id);
            let pathContent = pathContents[tabPaths[tab.id]];
            if (pathContent === undefined) {
                // already saved and cleared
                return;
            }
            saveText(pathContent);
        }, 60000);  // 1 minute
    }).catch(err => {
        if (retries > 0) {
            setTimeout(() => {
                getTabTextWithRetry(tab, retries - 1);
            }, 100);
        } else {
            console.error("TR unable to capture " + tab.url + ": " + err);
        }
    });
}

async function saveText(content) {
    if (content === undefined) {
        // already saved and cleared
        return;
    }

    console.log("TR saving " + content.url);
    let data = await browser.storage.local.get('user');

    let service_url = await getServiceUrl();
    return fetch(service_url + '/save_if_new', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: content.url,
            title: content.title,
            text_content: content.text,
            user_id: data.user.id
        })
    })
        .then(response => response.json())
        .then(url_data => {
            console.assert(url_data && url_data.saved !== undefined,
                "Unexpected response " + url_data + " for url " + content.url);
            console.log("TR " + content.url + " -> " + url_data.saved);
        })
        .catch(err => console.error("TR " + err))
        .finally(() => {
            delete pathContents[content.path];
        });
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || isSpecialUrl(tab.url)) {
        return;
    }
    getTabTextWithRetry(tab);
});

browser.tabs.onRemoved.addListener((tabId) => {
    console.log("TR tab " + tabId + " removed");
    if (tabPaths[tabId]) {
        saveText(pathContents[tabPaths[tabId]]);
    }
});

//
// History loading
//
let totalItems = 0;
let completedItems = 0;
let newWindowId = null;
let queue = [];

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "indexHistory") {
        indexHistory();
    }
});

async function indexHistory() {
    let historyItems = await browser.history.search({text: '', startTime: 0, maxResults: 9999});
    console.log("Indexing history with " + historyItems.length + " items");
    totalItems = historyItems.length;

    // Fill the queue with the history items
    queue = Array.from(historyItems, item => item.url);

    // Create a new window
    let newWindow = await browser.windows.create();
    newWindowId = newWindow.id;

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
}

function openTab(url) {
    browser.tabs.create({ windowId: newWindowId, url: url }).then((tab) => {
        let listener = function (tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status == 'complete') {
                browser.tabs.onUpdated.removeListener(listener);
                // Close the tab
                browser.tabs.remove(tabId);
                // Update the progress count
                completedItems++;
                updateBadgeText();
                // Open the next URL in queue or close the window if done
                if (queue.length > 0) {
                    openTab(queue.shift());
                } else {
                    cleanup();
                }
            }
        };

        browser.tabs.onUpdated.addListener(listener);
    })
        .catch(err => console.error("Error creating tab: " + err));
}

function updateBadgeText() {
    let progress = Math.round((completedItems / totalItems) * 100) + '%';
    browser.browserAction.setBadgeText({ text: progress });
    browser.browserAction.setBadgeBackgroundColor({ color: 'blue' });
}

async function cleanup() {
    // Remove the badge text
    browser.browserAction.setBadgeText({ text: "" });
    // Close the window
    if (newWindowId !== null) {
        await browser.windows.remove(newWindowId);
    }
}
