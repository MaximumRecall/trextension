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
function sendMessageWithRetry(tab, message, retries = 3) {
    console.log("Sending message to tab " + tab + ": " + tab.id)
    browser.tabs.sendMessage(tab.id, message)
        .catch(err => {
            if (retries > 0) {
                setTimeout(() => {
                    sendMessageWithRetry(tab, message, retries - 1);
                }, 100);
            } else {
                console.error("Unable to notify completion for " + tab.url + ": " + err);
            }
        });
}

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

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status == 'complete' && !isSpecialUrl(tab.url)) {
        sendMessageWithRetry(tab, {action: "TabUpdated"});
    }
});
