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
    console.log("Processing " + currentUrl)
    let data = await browser.storage.local.get([currentUrl, 'user']);
    if (data[currentUrl] !== undefined) {
        console.log("... already processed");
        return
    }
    const pageContent = document.documentElement.outerHTML;

    fetch(service_url + '/save_if_article', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: currentUrl,
            html_content: pageContent,
            user_id: data.user.id
        })
    })
        .then(response => response.json())
        .then(url_data => {
            console.assert(url_data && url_data.saved !== undefined,
                "Unexpected response " + url_data + " for url " + currentUrl);
            console.log(currentUrl + " -> " + url_data.saved);
            const saveObj = {};
            saveObj[currentUrl] = url_data.saved;
            browser.storage.local.set(saveObj);
        })
        .catch(err => console.error("Error saving " + currentUrl + ": " + err));
}
