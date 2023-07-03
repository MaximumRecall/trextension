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
let ports = {};

// content page will call connect when it loads
browser.runtime.onConnect.addListener((port) => {
    console.log("Connected to tab " + port.sender.tab.id)
    ports[port.sender.tab.id] = port;
    port.onDisconnect.addListener(() => {
        delete ports[port.sender.tab.id];
    });
});

function sendTabUpdatedMessage(tabId) {
    if (ports[tabId]) {
        ports[tabId].postMessage({action: "TabUpdated"});
        console.log("Message sent successfully")
    } else {
        // Wait a moment and try again
        console.log("Waiting for content script to load")
        setTimeout(() => sendTabUpdatedMessage(tabId), 100);
    }
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status == 'complete') {
        console.log("Tab " + tabId + " at " + tab.url + " complete")
        sendTabUpdatedMessage(tabId);
    }
});
