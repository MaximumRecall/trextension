This is the [Total Recall](https://totalrecall.click) Firefox extension.

It submits the text content of every page you visit to the Total Recall server to be indexed.

Click on the extension button, then "Search" to search your history.

When installing for the first time, you may also want to click "Index History" to index pages from your saved browser history.

To install it from source, go to `about:debug`, click on This Firefox, then "Load temporary add-on" and select the manifest.json from the src/ directory.
If you do this, your data will only last as long as that add-on, because Total Recall generates a new UUID when it is installed.
(You can save the UUID from the search page and access it that way, but you won't be able to save new pages to that UUID.)

To use a different server, edit the `server` variable in `config.js`.
