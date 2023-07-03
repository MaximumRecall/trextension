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
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status == 'complete' && tab.active) {
        browser.tabs.sendMessage(tabId, {action: "TabUpdated"});
    }
});
