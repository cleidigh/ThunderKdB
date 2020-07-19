

(function(verifrom) {
    verifrom.getLoadedLocale = function() {
        return browser.i18n.getMessage("language");
    };
    verifrom.localize = function(options, thisDocument) {
        void 0;
        let elements = (thisDocument || window.document).querySelectorAll('[data-verifromlocalize]');
        void 0;
        for (let element of elements) {
            try {
                let key = element.getAttribute("data-verifromlocalize");
                let value = browser.i18n.getMessage(key);
                if (value !== null) {
                    void 0;
                    element.innerHTML = value;
                } else void 0;
            } catch(e) {
                void 0;
            }
        }
        let switches = (thisDocument || window.document).querySelectorAll("span[yes][no]");
        for (let switchElement of switches) {
            switchElement.setAttribute("yes",browser.i18n.getMessage("options.yes"));
            switchElement.setAttribute("no",browser.i18n.getMessage("options.no"));
        }
    };
    verifrom.locales = {
        getMessage : function(token) {
            if (!token)
                throw new Error("verifrom.locales - missing token");
            let value = browser.i18n.getMessage(token);
            if (!value)
                throw new Error("verifrom.locales - no message for token"+token);
            return value;
        }
    }
})(verifrom);