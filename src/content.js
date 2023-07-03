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
    let data = await browser.storage.local.get('user_id');

    if (!data.user_id) {
        let user_id = generateUUID();
        await browser.storage.local.set({ user_id });
    }
    console.log(ext_name + " User ID: " + data.user_id);
}

// On extension startup
browser.runtime.onStartup.addListener(checkUserId);

// On extension installation
browser.runtime.onInstalled.addListener(checkUserId);

//
// Save articles when background.js sends a TabUpdated message
//
browser.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "TabUpdated") {
            const currentUrl = window.location.href;
            maybe_save_url(currentUrl);
        }
    }
);

async function maybe_save_url(currentUrl) {
    let data = await browser.storage.local.get([currentUrl, 'user_id']);
    if (data[currentUrl] === undefined) {
        const pageContent = document.documentElement.outerHTML;

        fetch(service_url + '/save_if_article', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: currentUrl,
                html_content: pageContent,
                user_id: data.user_id
            })
        })
            .then(response => response.json())
            .then(url_data => {
                console.assert(url_data && url_data.saved !== undefined,
                    "Unexpected response " + url_data);
                const saveObj = {};
                saveObj[currentUrl] = url_data.saved;
                browser.storage.local.set(saveObj);
            });
    }
}
