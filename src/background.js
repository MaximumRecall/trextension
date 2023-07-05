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
        service_url
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
                console.log("TR " + tab.id + " path changed to " + newPath);
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
            saveText(pathContents[tabPaths[tab.id]]);
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
    console.log("TR saving " + content.url);
    let data = await browser.storage.local.get('user');

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
            console.log("TR save complete for " + content.url);
            delete pathContents[content.path];
            delete inactivityTimers[content.path];
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
