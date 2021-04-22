async function main() {
    // Menu items to add
    var items = [
        {
            id: "folderPaneContext-FFT-breakout",
            title: "FolderPaneContextBreakout.label",
            onclick: FlatFolderTree.onFolderBreakout
        },
        {
            id: "folderPaneContext-FFT-promote",
            title: "FolderPaneContextPromote.label",
            onclick: FlatFolderTree.onFolderPromote
        },
        {
            id: "folderPaneContext-FFT-restore",
            title: "FolderPaneContextRestore.label",
            onclick: FlatFolderTree.onFolderRestore,
            type: "normal"
        }
    ];

    // Create parent menu
    var parentMenu = messenger.menus.create({
            "contexts": [ "folder_pane" ],
            "title": browser.runtime.getManifest().name
        });

    // Add child menu items
    for (const item of items) {
        messenger.menus.create({
            "contexts": [ "folder_pane" ],
            "parentId": parentMenu,
            "id": item.id,
            "onclick": item.onclick,
            "title": messenger.i18n.getMessage(item.title),
            "type": item.type ? item.type : "checkbox"
        });
    }

    // Update menu item states when shown
    messenger.menus.onShown.addListener(FlatFolderTree.onFolderContextPopup);

    // Initialize tree view layout
    browser.FlatFolderTreeMode.__FlatFolderTree_init();
}


main();
