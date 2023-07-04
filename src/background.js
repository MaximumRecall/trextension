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

let tabContent = {};
let inactivityTimers = {};

function getTabTextWithRetry(tab, retries=3) {
    browser.tabs.executeScript(tab.id, {
        code: 'document.documentElement.innerText;'
    }).then((results) => {
        // results is an array of tab HTML content strings
        if (results[0] === undefined) {
            console.log("TR " + tab.url + " text is undefined");
            return;
        }
        if (results[0] !== "") {
            tabContent[tab.id] = {
                text: results[0],
                url: tab.url,
                title: tab.title
            };
        }

        if (inactivityTimers[tab.id]) {
            clearTimeout(inactivityTimers[tab.id]);
        }
        inactivityTimers[tab.id] = setTimeout(() => {
            console.log("TR timer saving " + tab.id)
            saveTextFrom(tab.id);
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

async function saveTextFrom(tabId) {
    console.log("TR saving " + tabId);
    let data = await browser.storage.local.get('user');
    if (tabContent[tabId] === undefined) {
        return;
    }

    await fetch(service_url + '/save_if_article', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: tabContent[tabId].url,
            title: tabContent[tabId].title,
            text_content: tabContent[tabId].text,
            user_id: data.user.id
        })
    })
        .then(response => response.json())
        .then(url_data => {
            console.assert(url_data && url_data.saved !== undefined,
                "Unexpected response " + url_data + " for url " + tabContent[tabId].url);
            console.log("TR " + tabContent[tabId].url + " -> " + url_data.saved);
        })
        .catch(err => console.error("TR " + err));

    console.log("TR save complete for " + tabId);
    delete tabContent[tabId];
    delete inactivityTimers[tabId];
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && !isSpecialUrl(tab.url)) {
        console.log("TR tab " + tabId + " complete")
        getTabTextWithRetry(tab);
    }
});

browser.tabs.onRemoved.addListener((tabId) => {
    console.log("TR tab " + tabId + " removed")
    saveTextFrom(tabId);
});