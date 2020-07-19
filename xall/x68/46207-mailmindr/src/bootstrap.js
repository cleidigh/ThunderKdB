var { ExtensionSupport } = ChromeUtils.import(
    'resource:///modules/ExtensionSupport.jsm'
);

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

function install() {}

function uninstall() {}

function startup(data, reason) {
    // 
    // 
    // 
    ExtensionSupport.registerWindowListener('mailmindr', {
        chromeURLs: [
            'chrome://messenger/content/messengercompose/messengercompose.xul',
            'chrome://messenger/content/messageWindow.xul',
            'chrome://messenger/content/messenger.xul',
            // 
            'chrome://messenger/content/messageWindow.xhtml',
            'chrome://messenger/content/messenger.xhtml'
        ],
        onLoadWindow: setupUI,
        onUnloadWindow: tearDownUI
    });
}

function shutdown(data, reason) {
    ExtensionSupport.unregisterWindowListener('mailmindr');
    for (let window of ExtensionSupport.openWindows) {
        tearDownUI(window);
    }
}

function tearDownUI(window) {
    if (window.mailmindr && window.mailmindr.teardown) {
        window.mailmindr.teardown();
    }
}

function loadScript(url, window) {
    Services.scriptloader.loadSubScript(url, window);
    window.mailmindr.registerTeardownStep(() => {
        delete window.mailmindr;
    });
}

function loadCSS(window) {
    const document = window.document;
    let link = document.createElementNS('http://www.w3.org/1999/xhtml', 'link');

    link.setAttribute('id', 'mailmindr-styles');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute(
        'href',
        'chrome://mailmindr/content/content/mailmindr.css'
    );

    document.documentElement.appendChild(link);

    window.mailmindr.registerTeardownStep(() => {
        const styleElement = window.document.getElementById('mailmindr-styles');
        if (styleElement) {
            styleElement.remove();
        }
    });
}

function setupUI(window) {
    loadScript('chrome://mailmindr/content/content/mailmindrUI.js', window);
    loadCSS(window);

    // 
    const contextMenu = window.MozXULElement.parseXULToFragment(
        `<menupopup id="mailmindrPendingListContextMenu">
            <menuitem id="mailmindrContextMenuEdit" label="- Edit"/>
            <menuitem id="mailmindrContextMenuPostpone" label="- Postpone 24 hours"/>
            <menuseparator/>
            <menuitem id="mailmindrContextMenuOpenMessage" label="- Open message"/>
            <menuitem id="mailmindrContextMenuSelectMessage" label="- Select message"/>
        </menupopup>`,
        ['chrome://mailmindr/locale/mailmindr.overlay.dtd']
    );

    const xulSplitter = window.MozXULElement.parseXULToFragment(
        `<splitter id="mailmindrPendingListSplitter" collapse="after" state="open" oncommand='mailmindr.onMailmindrReplyHeightResized()'><grippy/></splitter>`,
        ['chrome://mailmindr/locale/mailmindr.overlay.dtd']
    );

    const xul = window.MozXULElement.parseXULToFragment(`
        <vbox id="mailmindrPendingListWrapper" hidden="true" flex="0">
            <richlistbox id="mailmindrPendingList" flex="1" context="mailmindrPendingListContextMenu">
                <!--
                <richlistitem class="mailmindr-overviewlist-item">
                    <hbox>
                        <label class="subject">
                            This is a very long Subject
                        </label>
                        <label class="sender">
                            This is a sender
                        </label>
                        <label class="due">
                            in 5 minutes
                        </label>
                    </hbox>
                </richlistitem>
                <richlistitem class="mailmindr-overviewlist-item">
                    <hbox>
                        <label class="subject">
                            This is a very long Subject really really
                        </label>
                        <label class="sender">
                            This is a sender &lt;jabsckjasb@me.com&gt;
                        </label>
                        <label class="due">
                            Tomorrow
                        </label>
                    </hbox>
                </richlistitem>
                -->
            </richlistbox>
        </vbox>
    `);

    const folderPane = window.document.getElementById('folderPaneBox');
    const folderTree = window.document.getElementById('folderTree');

    if (folderPane && folderTree) {
        const wnd = window.document.getElementsByTagName('window');
        wnd && wnd[0] && wnd[0].appendChild(contextMenu);

        folderPane.append(xulSplitter, xul);

        window.mailmindr.registerTeardownStep(() => {
            const splitter = window.document.getElementById(
                'mailmindrPendingListSplitter'
            );
            splitter && splitter.remove();

            const mindrList = window.document.getElementById(
                'mailmindrPendingList'
            );
            mindrList && mindrList.remove();

            const mindrListWrapper = window.document.getElementById(
                'mailmindrPendingListWrapper'
            );
            mindrListWrapper && mindrListWrapper.remove();

            const mailmindrContextMenu = window.document.getElementById(
                'mailmindrPendingListContextMenu'
            );
            mailmindrContextMenu && mailmindrContextMenu.remove();
        });
    }
}
