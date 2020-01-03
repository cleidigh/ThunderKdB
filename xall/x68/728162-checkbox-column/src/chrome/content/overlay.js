var checkboxColumn = (function () {
    var my = {};

    var columnHandler = {
        iEditable: function (row, col) {
            return false;
        },
        getCellProperties: function (row, col, props) {
            return "selectCol";
        },
        getImageSrc: function (row, col) {
            return null;
        },
        getCellText: function (row, col) {
            return "";
        },
        cycleCell: function (row, col) {
            var selection = col.columns.tree.view.selection;
            selection.toggleSelect(row);
        },
        isString: function () {
            return false;
        },
        getSortLongForRow: function (hdr) {
            return 0;
        }
    }

    var prefObserver = {
        register: function () {
            // First we'll need the preference services to look for preferences.
            var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService);

            // For this.branch we ask for the preferences for extensions.myextension. and children
            this.branch = prefService.getBranch("extensions.checkbox.");

            // Now we queue the interface called nsIPrefBranch2. This interface is described as:  
            // "nsIPrefBranch2 allows clients to observe changes to pref values."
            // This is only necessary prior to Gecko 13
            if (!("addObserver" in this.branch))
                this.branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

            // Finally add the observer.
            this.branch.addObserver("", this, false);
        },
        unregister: function () {
            this.branch.removeObserver("", this);
        },
        observe: function (subject, topic, data) {
            if (data === "largeFont") {
                this.setLargeFont();
            }
            else if (data === "activeHead") {
                this.setActiveHead();
            }
        },
        setLargeFont: function () {
            var largeFont = this.branch.getBoolPref("largeFont");
            var threadTree = document.getElementById("threadTree");
            var selectCol = document.getElementById("selectCol");
            if (largeFont) {
                threadTree.classList.add("largeFont");
                selectCol.width = "48";
            }
            else {
                threadTree.classList.remove("largeFont");
                selectCol.width = "32";
            }

            // force repaint
            var display = threadTree.style.display;
            threadTree.style.display = "none";
            threadTree.style.display = display;
        },
        setActiveHead: function() {
            var activeHead = this.branch.getBoolPref("activeHead");
            var selectCol = document.getElementById("selectCol");
            if (activeHead) {
                selectCol.removeAttribute("disabled");
            } else {
                selectCol.setAttribute("disabled", "");
            }
        }
    }

    window.addEventListener("load", doOnceLoaded, false);
    window.addEventListener("unload", function () {
        prefObserver.unregister();
    }, false);

    function doOnceLoaded() {
        prefObserver.register();
        prefObserver.setLargeFont();
        prefObserver.setActiveHead();
        var ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        ObserverService.addObserver(CreateDbObserver, "MsgCreateDBView", false);
        CreateDbObserver.observe(msgWindow.openFolder, null, null);
        CreateDbObserver.observe(msgWindow.openFolder, null, null);
    }

    var CreateDbObserver = {
        // Components.interfaces.nsIObserver
        observe: function (aMsgFolder, aTopic, aData) {
            addCustomColumnHandler();
        }
    }

    function columnHeaderClick(e) {
        var disabled = this.hasAttribute("disabled");
        if (!disabled) {
            var treeView = this.parentElement.parentElement.boxObject.element.view;
            var selection = treeView.selection;
            if (treeView.rowCount === selection.count) {
                selection.clearSelection();
            } else {
                selection.selectAll();
            }
        }
    }

    function treeSelect(e) {
        var treeView = this.boxObject.element.view;
        var selection = treeView.selection;
        var selectCol = document.getElementById("selectCol");
        if (treeView.rowCount === selection.count) {
            selectCol.classList.remove("some");
            selectCol.classList.add("all");
        } else if (selection.count > 0) {
            selectCol.classList.remove("all");
            selectCol.classList.add("some");
        } else {
            selectCol.classList.remove("all");
            selectCol.classList.remove("some");
        }
    }

    function addCustomColumnHandler() {
        gDBView.addColumnHandler("selectCol", columnHandler);
        if ("COLUMNS_MAP_NOSORT" in gFolderDisplay) {
            gFolderDisplay.COLUMNS_MAP_NOSORT.add("selectCol");
        }
        document.getElementById("selectCol").addEventListener("click", columnHeaderClick);
        document.getElementById("threadTree").addEventListener("select", treeSelect);
    }

    return my;
} ());