var FlatFolderTree = {
    onFolderContextPopup: async function(info, tab) {
        var msgFolder = info.selectedFolder;

        if (!msgFolder) {
            return;
        }

        // Disable breakout and promote if there's no subfolders
        messenger.menus.update("folderPaneContext-FFT-breakout", { enabled: msgFolder.subFolders.length != 0 });
        messenger.menus.update("folderPaneContext-FFT-promote", { enabled: msgFolder.subFolders.length != 0 });

        var parentFolder = await browser.FolderUtils.getParent(msgFolder);

        // Update checkbox states
        messenger.menus.update("folderPaneContext-FFT-restore", { enabled: (parentFolder && ((await browser.FlatFolderTreeMode.getFolderProperty(parentFolder) == 'Broken') || (await browser.FlatFolderTreeMode.getFolderProperty(parentFolder) == 'Promoted'))) });

        messenger.menus.update("folderPaneContext-FFT-breakout", { checked: await browser.FlatFolderTreeMode.getFolderProperty(msgFolder) == 'Broken' });

        messenger.menus.update("folderPaneContext-FFT-promote", { checked: await browser.FlatFolderTreeMode.getFolderProperty(msgFolder) == 'Promoted' });

        messenger.menus.refresh();
    },
    onFolderBreakout: async function(info) {
        if (info["selectedFolder"]) {
            browser.FlatFolderTreeMode.setFolderProperty(info["selectedFolder"], await browser.FlatFolderTreeMode.getFolderProperty(info["selectedFolder"]) == "Broken" ? "false" : "Broken");
        }
    },
    onFolderPromote: async function(info) {
        if (info["selectedFolder"]) {
            browser.FlatFolderTreeMode.setFolderProperty(info["selectedFolder"], await browser.FlatFolderTreeMode.getFolderProperty(info["selectedFolder"]) == "Promoted" ? "false" : "Promoted");
        }
    },
    onFolderRestore: function(info) {
        if (info["selectedFolder"]) {
            browser.FlatFolderTreeMode.setParentProperty(info["selectedFolder"], "false");
        }
    }
};
