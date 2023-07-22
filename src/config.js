// update this in manifest.json as well if it changes
default_service_url = "https://totalrecall.click"

async function getServiceUrl() {
    let data = await browser.storage.local.get('service_url');
    // Use a hardcoded default url when none is saved in storage
    return data.service_url ? data.service_url : default_service_url;
}

ext_name = "Total Recall"
