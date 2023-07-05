document.getElementById('search-history').addEventListener('click', async function() {
    let data = await browser.storage.local.get('user');
    browser.windows.create({ url: service_url + "/search?user_id=" + data.user.id});
});

document.getElementById('index-history').addEventListener('click', function() {
    // Send a message to the background script to start the indexing
    browser.runtime.sendMessage({action: "indexHistory"});
});
