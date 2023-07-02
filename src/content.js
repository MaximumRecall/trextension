browser.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "TabUpdated") {
            const currentUrl = window.location.href;
            browser.storage.local.get([currentUrl], function(result) {
                if (result[currentUrl] === undefined) {
                    const pageContent = document.documentElement.outerHTML;

                    fetch('http://real_url/save_if_article', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({url: currentUrl, html_content: pageContent, user_id: "a451bc74-0d5f-4177-baa1-95168aa9dfac"})
                    })
                    .then(response => {
                        if(response.status === 200) {
                            const saveObj = {};
                            saveObj[currentUrl] = true;
                            browser.storage.local.set(saveObj);
                        }
                    })
                }
            });
        }
    }
);
