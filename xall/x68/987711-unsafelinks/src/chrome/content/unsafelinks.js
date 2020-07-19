// Listen for the "window loaded" event and initialize.
window.addEventListener("load", function load(event) {
    window.removeEventListener("load", load, false);
    unsafelinks.init();
}, false);

var unsafelinks = {
    init: function() {
        // Listen for the "message loaded" event, if this is a message window.
        var messagepane = document.getElementById("messagepane");
        if (messagepane) {
            messagepane.addEventListener("load", unsafelinks.onMessageLoad, true);
        }
    },

    onMessageLoad: function(event) {
        // Replace each safelinks URL in the message body with the original URL.
        var body = event.originalTarget.body;
        unsafelinks.replaceInNode(event.originalTarget.body);
    },

    replaceInNode: function(node) {
        // Recursively replace URLs in this node and child nodes.
        if (node.childNodes.length > 0) {
            for (let i = 0; i < node.childNodes.length; i++) {
                unsafelinks.replaceInNode(node.childNodes[i]);
            }
        }

        // If this is a text node, replace URLs in the text.
        if (node.nodeType == Node.TEXT_NODE && node.nodeValue != '') {
            node.nodeValue = node.nodeValue.replace(unsafelinks.urlRegex, unsafelinks.replacer);
        }

        // Replace URLs in this node's attribute values.
        // We're expecting <a href> <img src> and similar, but can't
        // predict what other attrs may contain URLs. So check all of them.
        if (node.attributes) {
            for (let i = 0; i < node.attributes.length; i++) {
                if (node.attributes[i].specified) {
                    node.attributes[i].value = node.attributes[i].value.replace(unsafelinks.urlRegex, unsafelinks.replacer);
                }
            }
        }
    },

    // Regular expression matching a safelinks-encoded URL.
    urlRegex: /https?:\/\/(?:.+?\.)?safelinks\.protection\.outlook\.com\/(?:[^\?]+)?([A-Za-z0-9\-\._~:\/\?#\[\]@!$&'\(\)\*\+,;\=%]*)/gi,

    replacer: function(url, queryString){
        // Extract the "url" parameter from the URL, if it exists.
        var params = new URLSearchParams(queryString);
        if (params.has('url')) {
            return params.get('url');
        } else {
            return url;
        }
    },
};
