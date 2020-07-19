// JavaScript

"use strict";

// Assuming that Cc, Ci and Cu are already loaded

const { OS } = ChromeUtils.import("resource://gre/modules/osfile.jsm", {});

//ChromeUtils.import("resource://gre/modules/osfile.jsm")

const oFileHandler = {
    // https://developer.mozilla.org/fr/docs/Mozilla/JavaScript_code_modules/OSFile.jsm/OS.File_for_the_main_thread

    xDataFolder: null,

    prepareDataFolder: function () {
        let xDirectoryService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
        // this is a reference to the profile dir (ProfD) now.
        let xExtFolder = xDirectoryService.get("ProfD", Ci.nsIFile);
        xExtFolder.append("grammalecte-data");
        if (!xExtFolder.exists() || !xExtFolder.isDirectory()) {
            // read and write permissions to owner and group, read-only for others.
            xExtFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 774);
        }
        this.xDataFolder = xExtFolder;
    },

    createPathFileName: function (sFilename) {
        let spfDest = this.xDataFolder.path;
        spfDest += (/^[A-Z]:/.test(this.xDataFolder.path)) ? "\\" + sFilename : "/" + sFilename;
        return spfDest;
    },

    loadFile: async function (sFilename) {
        if (!this.xDataFolder) {
            this.prepareDataFolder();
        }
        try {
            let array = await OS.File.read(this.createPathFileName(sFilename));
            let xDecoder = new TextDecoder();
            return xDecoder.decode(array);
        }
        catch (e) {
            console.error(e);
            return null;
        }
    },

    loadAs: function (callback) {
        let xFilePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        xFilePicker.init(window, "Charger fichier", Ci.nsIFilePicker.modeOpen);
        xFilePicker.appendFilters(Ci.nsIFilePicker.filterAll | Ci.nsIFilePicker.filterText);
        xFilePicker.open(async function (nReturnValue) {
            if (nReturnValue == Ci.nsIFilePicker.returnOK || nReturnValue == Ci.nsIFilePicker.returnReplace) {
                console.log(xFilePicker.file.path);
                try {
                    let array = await OS.File.read(xFilePicker.file.path);
                    let xDecoder = new TextDecoder();
                    callback(xDecoder.decode(array));
                }
                catch (e) {
                    console.error(e);
                    callback(null);
                }
            }
        });
    },

    saveFile: function (sFilename, sData) {
        if (!this.xDataFolder) {
            this.prepareDataFolder();
        }
        let xEncoder = new TextEncoder();
        let xEncodedRes = xEncoder.encode(sData);
        console.log("save dictionary: " + this.createPathFileName(sFilename));
        OS.File.writeAtomic(this.createPathFileName(sFilename), xEncodedRes);
        //OS.File.writeAtomic(this.createPathFileName(sFilename), xEncodedRes, {tmpPath: "file.txt.tmp"}); // error with a temporary file (can’t move it)
    },

    deleteFile: function (sFilename) {
        if (!this.xDataFolder) {
            this.prepareDataFolder();
        }
        OS.File.remove(this.createPathFileName(sFilename), {ignoreAbsent: true});
    },

    saveAs: function (sData) {
        // save anywhere with file picker
        let xFilePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        xFilePicker.init(window, "Enregistrer sous", Ci.nsIFilePicker.modeSave);
        xFilePicker.appendFilters(Ci.nsIFilePicker.filterAll | Ci.nsIFilePicker.filterText);
        xFilePicker.open(function (nReturnValue) {
            if (nReturnValue == Ci.nsIFilePicker.returnOK || nReturnValue == Ci.nsIFilePicker.returnReplace) {
                let xEncoder = new TextEncoder();
                let xEncodedRes = xEncoder.encode(sData);
                OS.File.writeAtomic(xFilePicker.file.path, xEncodedRes, {tmpPath: "file.txt.tmp"});
            }
        });
    }
}
