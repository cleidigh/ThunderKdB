/* globals Components, NodesMapping, IsDocumentEditable, IsInHTMLSourceMode,
GetComposerCommandTable, GetCurrentEditor */

if ("undefined" == typeof(grammarchecker)) {
    let Cc = Components.classes;
    let Ci = Components.interfaces;
    var grammarchecker = {
        onLoad: function() {
            this._overlayCss = "chrome://grammarchecker/skin/overlay.css";
            this._strings = document.getElementById("grammarchecker-strings");
            this._nodesMapping = new NodesMapping();
            this._ranges = [];

            let that = this;
            let nsGrammarCommand = {
                isCommandEnabled: function() {
                    return IsDocumentEditable() && !IsInHTMLSourceMode();
                },
                getCommandStateParams: function() {},
                doCommandParams: function() {},
                doCommand: function(aCommand) {
                    that.onMenuItemCommand(aCommand);
                }
            };
            let commandTable = GetComposerCommandTable();
            commandTable.registerCommand("cmd_grammar", nsGrammarCommand);
            this.addBtnByDefault();
        },
        addBtnByDefault: function() {
            var myId = "grammarchecker-toolbar-button"; // ID of button to add
            var afterId = "spellingButton"; // ID of element to insert after
            var navBar  = document.getElementById("composeToolbar2");
            var curSet  = navBar.currentSet.split(",");

            if (curSet.indexOf(myId) == -1) {
                var pos = curSet.indexOf(afterId) + 1 || curSet.length;
                var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));

                navBar.setAttribute("currentset", set.join(","));
                navBar.currentSet = set.join(",");
                document.persist(navBar.id, "currentset");
            }
        },
        clearPreview: function() {
            let preview = document.getElementById("grammarchecker-preview");
            while (preview.firstChild) {
                //The list is LIVE so it will re-index each call
                preview.removeChild(preview.firstChild);
            }
            this._ranges = [];
            let editor = GetCurrentEditor();
            if (editor != null) {
                this._prepareEditor(editor);
            }
        },
        _prepareEditor: function(editor) {
            editor.QueryInterface(Ci.nsIEditorStyleSheets);
            editor.addOverrideStyleSheet(this._overlayCss);
            let doc = editor.document;
            var matches = doc.querySelectorAll("span[class='grammarchecker-highlight']");
            for (var i = matches.length - 1; i >= 0; i--) {
                matches[i].removeAttribute('class');
            }
        },
        _isInRanges: function(fromx, tox, y) {
            let index = fromx + "," + tox + "," + y;
            if (this._ranges.indexOf(index) == -1) {
                this._ranges.push(index);
                return false;
            }
            return true;
        },
        _prepareSelection: function() {
            let editor = GetCurrentEditor();
            let s = editor.selection;
            if (s.rangeCount > 0) {
                s.removeAllRanges();
            }
            return s;
        },
        _createDescription: function(item, li) {
            this._nodesMapping.init();
            let editor = GetCurrentEditor();

            let contextItem = item.context;
            let offset = parseInt(contextItem.offset);
            let len = parseInt(contextItem.length);
            var context = contextItem.text;

            let fromx = parseInt(item.fromx);
            let fromy = parseInt(item.fromy);
            let tox = parseInt(item.tox) - 1;

            if (!this._isInRanges(fromx, tox, fromy)) {
                let startItem = this._nodesMapping.findNode(fromx, fromy);
                let endItem = this._nodesMapping.findNode(tox, fromy);

                if (startItem != null && endItem != null) {
                    let range = document.createRange();
                    range.setStart(startItem.node, startItem.offset);
                    range.setEnd(endItem.node, endItem.offset);
                    let s = this._prepareSelection();
                    s.addRange(range);
                    let atomS = "@mozilla.org/atom-service;1";
                    let atomService = Cc[atomS].getService(Ci.nsIAtomService);
                    let span = atomService.getAtom("span");
                    editor.QueryInterface(Ci.nsIHTMLEditor);
                    editor.setInlineProperty(span, "class", "grammarchecker-highlight");
                }
            }

            let contextLen = context.length;
            let overall = offset + len;

            let left = String(context).substring(0, offset);
            let middle = String(context).substring(offset, overall);
            let right = String(context).substring(overall, contextLen);
            if (left.length > 0) {
                li.appendChild(document.createTextNode(left));
            }
            if (middle.length > 0) {
                let bold = document.createElement("b");
                bold.appendChild(document.createTextNode(middle));
                li.appendChild(bold);
            }
            if (right.length > 0) {
                li.appendChild(document.createTextNode(right));
            }
        },
        _addRule: function(item, ul) {
            let that = this;
            let msg = item.message;
            let replacementsList = item.replacements;
            var replacements = "", first = true;
            for (var i = replacementsList.length - 1; i >= 0; i--) {
                if (first) {
                    first = false;
                } else {
                    replacements += ', ';
                }
                replacements += replacementsList[i].value;
            }
            let append = function(labelId, text) {
                let li = document.createElement("li");
                let label = that._strings.getString(labelId);
                li.appendChild(document.createTextNode(label + ": " + text));
                ul.appendChild(li);
            };
            append("ruleMessage", msg);
            append("replacementsMessage", replacements);
        },
        _showNodes: function(nodes) {
            this.clearPreview();
            let preview=document.getElementById("grammarchecker-preview");
            let ul = document.createElement("ul");
            preview.appendChild(ul);
            for (let i = 0; i < nodes.length; i++) {
                let item = nodes[i];
                let li = document.createElement("li");
                this._createDescription(item, li);
                ul.appendChild(li);
                let innerUl = document.createElement("ul");
                this._addRule(item, innerUl);
                ul.appendChild(innerUl);
            }
            this._prepareSelection();
        },
        _showResult: function(json) {
            let nodes = JSON.parse(json).matches;

            if (nodes.length > 0) {
                this._showNodes(nodes);
            } else {
                this._showText("noErrorsMessage", null);
            }
        },
        _showText: function(textId, appendix) {
            this.clearPreview();
            let preview = document.getElementById("grammarchecker-preview");
            let text = this._strings.getString(textId);
            if (appendix != null) {
                text += appendix;
            }
            let textNode = document.createTextNode(text);
            preview.appendChild(textNode);
        },
        _showError: function(errorId) {
            this.clearPreview();
            let preview = document.getElementById("grammarchecker-preview");
            let text = this._strings.getString(errorId);
            let errorMsg = document.createTextNode(text);
            let errorDiv = document.createElement("div");
            errorDiv.setAttribute("id", "grammarchecker-error");
            errorDiv.appendChild(errorMsg);
            preview.appendChild(errorDiv);
        },
        _getLangFromSpellChecker: function(prefs) {
            let editor = GetCurrentEditor();
            try {
                let gSpellChecker = editor.getInlineSpellChecker(true);
                let lang = gSpellChecker.spellChecker.GetCurrentDictionary();
                return lang.substr(0, 2);
            } catch (ex) {
                return prefs.getCharPref("langpref");
            }
        },
        _checkGrammar: function(server, lang, mothertongue, errorHandler) {
            let that = this;
            this._showText("processingMessage"," "+server+" ["+lang+"] ...");

            //Get the html Source message document
            const htmlSource = encodeURIComponent(this._nodesMapping.init());
            let body = "language=" + lang + "&text=" + htmlSource;
            if (mothertongue.lenght > 0) {
                body = "motherTongue=" + mothertongue + body;
            }
            const promise = new Promise(function(resolve, reject) {
                const req = new XMLHttpRequest();
                const url = server + "/v2/check";
                req.open('POST', url, true);
                req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                req.setRequestHeader('Accept', 'application/json');
                req.onload = function() {
                    let result = req.responseText;
                    if (result) {
                        resolve(result);
                    } else {
                        reject(req.statusText);
                    }
                };
                req.onerror = function() {
                    reject(req.statusText);
                };
                req.send(body);
            });
            promise
                .then(function(result) {
                    that._showResult(result);
                })
                .catch(function(error) {
                    that._showError("errorMessage");
                    errorHandler(error);
                });
        },
        onMenuItemCommand: function() {
            let that = this;
            var prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("extensions.grammarchecker.");
            let server1 = prefs.getCharPref("urlpref1");
            let server2 = prefs.getCharPref("urlpref2");
            let lang = this._getLangFromSpellChecker(prefs);
            let mothertongue = prefs.getCharPref("mothertongue");
            this._checkGrammar(server1, lang, mothertongue, function() {
                that._checkGrammar(server2, lang, mothertongue, null);
            });
        }
    };
}
window.addEventListener(
    "load",function(e) { grammarchecker.onLoad(e); }, false);
window.addEventListener(
    "compose-window-init", function() { grammarchecker.clearPreview(); }, true);
