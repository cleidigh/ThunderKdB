'use strict';

const Cc = Components.classes;
const Ci = Components.interfaces;

var EXPORTED_SYMBOLS = ['mailmindrCommon'];

var { fixIterator } = ChromeUtils.import(
    'resource:///modules/iteratorUtils.jsm'
);

var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrI18n } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/i18n.jsm'
);

class mailmindrCommonBase {
    constructor() {
        this._name = 'mailmindrCommonBase';
        this._logger = new mailmindrLogger(this);

        this.initialize();

        // 
        // 
    }

    initialize() {
        this._logger.log('------ mailmindrCommon initialized -------');
    }

    clearChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.lastChild);
        }
    }

    indentor(indent) {
        var result = '';
        for (var idx = 0; idx < indent; idx++) {
            result += '  ';
        }
        return result;
    }

    /**
     * list all folders and add all folder items to given combobox (identified by elementId)
     * default list item is set by selectedUri
     */
    getAllFolders(listForAccount) {
        var _gFolders = new Array();
        const selectedAccount = listForAccount || '';

        /**
         * subFolders - list subfolders for a given folder object
         */
        const subFolders = (aFolder, indentLevel) => {
            let item = new Array(aFolder.name, aFolder.URI, indentLevel);
            _gFolders.push(item);

            if (aFolder.hasSubFolders) {
                for (let folder of fixIterator(
                    aFolder.subFolders,
                    Components.interfaces.nsIMsgFolder
                )) {
                    subFolders(folder, indentLevel + 1);
                }
            }
        };

        const gatherSubFolders = forAccount => {
            //self._logger.call('gatherSubFolders()');
            try {
                _gFolders = new Array();

                // 
                if (forAccount == '') {
                    // 
                    var acctMgr = Components.classes[
                        '@mozilla.org/messenger/account-manager;1'
                    ].getService(Components.interfaces.nsIMsgAccountManager);
                    var accounts = acctMgr.accounts;

                    for (let account of fixIterator(
                        accounts,
                        Components.interfaces.nsIMsgAccount
                    )) {
                        if (
                            account.incomingServer.type.indexOf('imap') == 0 ||
                            account.incomingServer.type.indexOf('pop') == 0 ||
                            account.incomingServer.type.indexOf('none') == 0
                        ) {
                            let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
                            subFolders(rootFolder, 0);
                        }
                    }
                } else {
                    let account = forAccount;
                    if (
                        account.incomingServer.type.indexOf('imap') == 0 ||
                        account.incomingServer.type.indexOf('pop') == 0 ||
                        account.incomingServer.type.indexOf('none') == 0
                    ) {
                        let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
                        subFolders(rootFolder, 0);
                    }
                }

                //self._logger.end();
                return _gFolders;
            } catch (exception) {
                dump(exception);
                // 
            }

            this._logger.warn('gatherSubFolders(): returns an empty array');
            //self._logger.end();
            return new Array();
        };

        //this._logger.log('call listAllFolders');

        /* init function-global array */
        _gFolders = gatherSubFolders(selectedAccount);

        return _gFolders;
    }

    listAllFolders(element, selectedUri, listForAccount) {
        let _gFolders = this.getAllFolders(listForAccount);

        /* store all items in picker */
        let selectedUriValue = selectedUri;
        let picker = element;

        /* third parameter is selected index in combobox, if present */
        var selectedIndex = arguments.length == 3 ? arguments[2] : -1;

        for (var idx = 0; idx < _gFolders.length; ++idx) {
            let pickerItem = picker.appendItem(
                this.indentor(_gFolders[idx][2]) + _gFolders[idx][0],
                _gFolders[idx][1]
            );

            /* check if we have an account (indention level 0) :: set disabled = true */
            if (_gFolders[idx][2] == 0) {
                pickerItem.setAttribute('disabled', true);

                /* if the selection index is the account item => select next item */
                if (selectedIndex == idx) {
                    selectedIndex += 1;
                }
            }

            /* check if a selection index is present we have to select */
            if (selectedIndex == idx) {
                selectedUriValue = _gFolders[idx][1];
            }
        }

        /* select given value */
        picker.value = selectedUriValue;
    }

    /**
     *
     */
    getAllTags() {
        let tagService = Components.classes[
            '@mozilla.org/messenger/tagservice;1'
        ].getService(Components.interfaces.nsIMsgTagService);
        return tagService.getAllTags({});
    }

    /**
     * get all tags and add them to given combo box
     */
    fillTags(element, selectedItemIndex, selectedValue) {
        if (typeof element !== 'object') {
            this._logger.error('element expected');
            return;
        }

        /* get all tags */
        let tagArray = this.getAllTags();

        var mmreTags = element;

        /* first: clean up all tags in listbox */
        mmreTags.removeAllItems();
        var toSelect = selectedItemIndex;

        /* add the empty key '-': add "select item" thing to combobox */
        let lblSelect = mailmindrI18n.getString(
            'mailmindr.utils.core.tag.doSelect'
        );
        let mmreSelectItem = mmreTags.appendItem(lblSelect, '-');

        /* second: add all items/tags with colors */
        for (let idx = 0; idx < tagArray.length; ++idx) {
            var currTag = tagArray[idx];
            var mmreNewItem = mmreTags.appendItem(currTag.tag, currTag.key);
            mmreNewItem.style.color = currTag.color;

            if (idx === 0) {
                toSelect = currTag.key;
            }
        }

        this._logger.log('will select: ' + selectedValue + '/' + toSelect);
        let selection = selectedValue || toSelect;
        this._logger.log('selection: ' + selection);
        mmreTags.value = selection;
    }

    fillTimespanComboBox(element, timeSpans) {
        element.removeAllItems();

        for (let timespan of timeSpans) {
            element.appendItem(timespan.text, timespan.serialize());
        }
    }

    fillActionComboBox(element, actions) {
        element.removeAllItems();
        for (let action of actions) {
            element.appendItem(action.text, action.toJson());
        }
    }

    getSelectedTreeCell(element, cellIndex) {
        if (typeof element !== 'object') {
            this._logger.error('element expected');
            return null;
        }

        let tree = element;
        return tree.view.getCellText(
            tree.currentIndex,
            tree.columns.getColumnAt(cellIndex)
        );
    }

    getWindow(windowType) {
        let windowMediator = Components.classes[
            '@mozilla.org/appshell/window-mediator;1'
        ].getService(Components.interfaces.nsIWindowMediator);
        return windowMediator.getMostRecentWindow(windowType);
    }

    // 
    /**
     * Safely parse an HTML fragment, removing any executable
     * JavaScript, and return a document fragment.
     *
     * @param {Document} doc The document in which to create the
     *     returned DOM tree.
     * @param {string} html The HTML fragment to parse.
     * @param {boolean} allowStyle If true, allow <style> nodes and
     *     style attributes in the parsed fragment. Gecko 14+ only.
     * @param {nsIURI} baseURI The base URI relative to which resource
     *     URLs should be processed. Note that this will not work for
     *     XML fragments.
     * @param {boolean} isXML If true, parse the fragment as XML.
     */
    parseHtml(doc, html, allowStyle, baseURI, isXML) {
        let PARSER_UTILS = '@mozilla.org/parserutils;1';

        // 
        if (PARSER_UTILS in Cc) {
            let parser = Cc[PARSER_UTILS].getService(Ci.nsIParserUtils);
            if ('parseFragment' in parser) {
                return parser.parseFragment(
                    html,
                    allowStyle ? parser.SanitizerAllowStyle : 0,
                    !!isXML,
                    baseURI,
                    doc.documentElement
                );
            }
        }

        return Cc['@mozilla.org/feed-unescapehtml;1']
            .getService(Ci.nsIScriptableUnescapeHTML)
            .parseFragment(html, !!isXML, baseURI, doc.documentElement);
    }

    // 
    jsonToDom(jsonTemplate, doc, nodes) {
        let jtd = {};
        jtd.namespaces = {
            html: 'http://www.w3.org/1999/xhtml',
            xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
        };
        jtd.defaultNamespace = jtd.namespaces.html;

        function namespace(name) {
            var reElemNameParts = /^(?:(.*):)?(.*)$/.exec(name);
            return {
                namespace: jtd.namespaces[reElemNameParts[1]],
                shortName: reElemNameParts[2]
            };
        }

        // 
        function tag(elemNameOrArray, elemAttr) {
            // 
            if (Array.isArray(elemNameOrArray)) {
                var frag = doc.createDocumentFragment();
                Array.forEach(arguments, function(thisElem) {
                    frag.appendChild(tag.apply(null, thisElem));
                });
                return frag;
            }

            // 
            var elemNs = namespace(elemNameOrArray);
            var elem = doc.createElementNS(
                elemNs.namespace || jtd.defaultNamespace,
                elemNs.shortName
            );

            // 
            for (var key in elemAttr) {
                var val = elemAttr[key];
                if (nodes && key == 'key') {
                    nodes[val] = elem;
                    continue;
                }

                var attrNs = namespace(key);
                if (typeof val == 'function') {
                    // 
                    elem.addEventListener(key.replace(/^on/, ''), val, false);
                } else {
                    // 
                    elem.setAttributeNS(
                        attrNs.namespace || '',
                        attrNs.shortName,
                        val
                    );
                }
            }

            // 
            var childElems = Array.slice(arguments, 2);
            childElems.forEach(function(childElem) {
                if (childElem != null) {
                    elem.appendChild(
                        childElem instanceof doc.defaultView.Node
                            ? childElem
                            : Array.isArray(childElem)
                            ? tag.apply(null, childElem)
                            : doc.createTextNode(childElem)
                    );
                }
            });

            return elem;
        }

        return tag.apply(null, jsonTemplate);
    }
}

var mailmindrCommon = mailmindrCommon || new mailmindrCommonBase();
