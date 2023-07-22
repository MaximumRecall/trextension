document.getElementById('search-history').addEventListener('click', async function() {
    let data = await browser.storage.local.get('user');
    browser.windows.create({ url: service_url + "/search?user_id=" + data.user.id});
});

document.getElementById('index-history').addEventListener('click', function() {
    // Send a message to the background script to start the indexing
    browser.runtime.sendMessage({action: "indexHistory"});
});

document.getElementById('copy-uuid').addEventListener('click', copyUUID);
document.getElementById('set-uuid').addEventListener('click', setUUID);
document.getElementById('set-service-url').addEventListener('click', setServiceUrl);

// Function to copy the UUID to the clipboard
async function copyUUID() {
    let data = await browser.storage.local.get('user');
    if (data.user && data.user.id) {
        try {
            await navigator.clipboard.writeText(data.user.id);
            document.getElementById('message').innerText = 'Copied!';
            setTimeout(() => document.getElementById('message').innerText = '', 2000); // Remove the message after 2 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }
}

// Function to set a new UUID
async function setUUID() {
    let newUUID = prompt("Please enter a new UUID:");
    if (newUUID) {
        let user = { id: newUUID };
        await browser.storage.local.set({ user });
        document.getElementById('message').innerText = 'UUID Set!';
        setTimeout(() => document.getElementById('message').innerText = '', 2000); // Remove the message after 2 seconds
    }
}

// Function to set a new service_url
async function setServiceUrl() {
    let newUrl = document.getElementById('service-url').value;
    if (newUrl) {
        await browser.storage.local.set({ service_url: newUrl });
        document.getElementById('url-message').innerText = 'Service URL Set!';
        setTimeout(() => document.getElementById('url-message').innerText = '', 2000);
    }
}
