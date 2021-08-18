/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Import any needed modules.
var { Services } = ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
);


window.addEventListener('load', function() {
  //aedump('load\n');

  var t;
  if ((t=document.getElementById('attachmentListContext'))) t.addEventListener('popupshowing',attachmentextractor.onShowAttachmentContextMenu,false);

}, true);


// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_listener_menus.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_listener_toolbarButton.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_js_common.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_js_attachmentextractor.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_js_progresstracker.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_js_messenger.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_js_window.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_js_attachmentFileMaker.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_js_overlay_commandsets.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://attachmentextractor_cont/content/aec_js_overlay_debugOnStart.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
  
  WL.injectCSS("resource://attachmentextractor_cont/skin/aec_buttons.css");

  WL.injectElements(`
  <commandset id="mailCommands">
    <commandset id="aec_commandset">

      <commandset id="aec_commandset_msg">
        <command id="cmd_aec_extractToDefault" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'default',false);" 
          observes="aec_commandset_msg"/>
        <command id="cmd_aec_extractToBrowse" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'browse',false);" 
          observes="aec_commandset_msg" />
        <command id="cmd_aec_extractToSuggest" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'suggest',false);" 
          observes="aec_commandset_msg"/>
        <command id="cmd_aec_justDeleteAttachments" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'deleteAtt',false);" 
          observes="aec_commandset_msg"/>
      </commandset>

      <commandset id="aec_commandset_folder">
        <command id="cmd_aec_extractAllToDefault" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'default',1);" 
          observes="aec_commandset_folder"/>
        <command id="cmd_aec_extractDeepToDefault" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'default',2);" 
          observes="aec_commandset_folder"/>
        <command id="cmd_aec_extractAllToBrowse" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'browse',1);" 
          observes="aec_commandset_folder"/>
        <command id="cmd_aec_extractDeepToBrowse" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'browse',2);" 
          observes="aec_commandset_folder"/>
        <command id="cmd_aec_extractAllToSuggest" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'suggest',1);" 
          observes="aec_commandset_folder"/>
        <command id="cmd_aec_extractDeepToSuggest" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'suggest',2);" 
          observes="aec_commandset_folder"/>

        <command id="cmd_aec_justDeleteAllAttachments" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'deleteAtt',1);" 
          observes="aec_commandset_folder"/>
        <command id="cmd_aec_justDeleteDeepAttachments" 
          oncommand="attachmentextractor.doAttachmentextraction(event,'deleteAtt',2);" 
          observes="aec_commandset_folder"/>
      </commandset>

      <commandset id="aec_commandset_ind">
        <command id="cmd_aec_extractIndToDefault" 
          oncommand="attachmentextractor.doIndividualAttachmentextraction('default','selected');" 
          observes="aec_commandset_ind"/>
        <command id="cmd_aec_extractIndToBrowse" 
          oncommand="attachmentextractor.doIndividualAttachmentextraction('browse','selected');" 
          observes="aec_commandset_ind"/>
        <command id="cmd_aec_extractIndToSuggest" 
          oncommand="attachmentextractor.doIndividualAttachmentextraction('suggest','selected');"/>

        <command id="cmd_aec_extractIndAllToDefault" 
          oncommand="attachmentextractor.doIndividualAttachmentextraction('default','all');"/>
        <command id="cmd_aec_extractIndAllToBrowse" 
          oncommand="attachmentextractor.doIndividualAttachmentextraction('browse','all');"/>
        <command id="cmd_aec_extractIndAllToSuggest" 
          oncommand="attachmentextractor.doIndividualAttachmentextraction('suggest','all');"/>
      </commandset>

    </commandset>
  </commandset>

  <toolbarpalette id="MailToolbarPalette">

    <toolbarbutton id="aec-toolbarButton" 
      class="toolbarbutton-1" 
      type="menu-button" 
      is="toolbarbutton-menu-button" 
      label="&attachmentextractor.toolbarbutton.label;" 
      tooltiptext="&attachmentextractor.toolbarbutton.tooltip2;" 
      command="cmd_aec_extractToDefault">

      <menupopup id="aec-toolbarButtonPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()" >

        <menuitem id="menu_aec_extractToBrowse_toolbar" 
          label="&attachmentextractor.browse.label;" 
          accesskey="&attachmentextractor.browse.accesskey;" 
          command="cmd_aec_extractToBrowse" />

        <menu id="menu_aec_extractToFavorite_toolbar" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractFavoritefolder_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="false" />
        </menu>

        <menu id="menu_aec_extractToMRU_toolbar" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="false" />
        </menu>

        <menuitem id="menu_aec_extractToSuggest_toolbar" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractToSuggest" />

        <menuseparator/>

        <menuitem id="menu_aec_justDeleteAttachments_toolbar" 
          label="&attachmentextractor.justDeleteAttachments.label;" 
          accesskey="&attachmentextractor.justDeleteAttachments.accesskey;" 
          command="cmd_aec_justDeleteAttachments" />

      </menupopup>
    </toolbarbutton>
  </toolbarpalette>

  <hbox id="header-view-toolbar">
    <toolbarbutton id="aeHdrButton" 
      class="hdrAEButton toolbarbutton-1 msgHeaderView-button customize-header-toolbar-button" 
      label="&attachmentextractor.headerbutton.label;" 
      tooltiptext="&attachmentextractor.headerbutton.tooltip;" 
      command="cmd_aec_extractToDefault">
    </toolbarbutton>
  </hbox>

  <!-- Menu 'Message' -->
  <menupopup id="messageMenuPopup">

    <menuseparator id="aec-messageMenuPopup-separator" 
      insertafter="msgAttachmentMenu" />
    <menu id="aec-messageMenuPopup-menu" 
      label="&attachmentextractor.extractMessagesTo.label;" 
      accesskey="&attachmentextractor.extractTo.accesskey;" 
      insertafter="aec-messageMenuPopup-separator">
      <menupopup id="aec-messageMenuPopup-extractToPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()">

        <menuitem id="menu_aec_extractToBrowse_messageMenu" 
          label="&attachmentextractor.extractToBrowse.label;" 
          accesskey="&attachmentextractor.extractToBrowse.accesskey;" 
          command="cmd_aec_extractToBrowse" />

        <menuseparator/>

        <menuitem id="menu_aec_extractToDefault_messageMenu" 
          label="&attachmentextractor.extractToDefault.label;" 
          accesskey="&attachmentextractor.extractToDefault.accesskey;" 
          command="cmd_aec_extractToDefault" />

        <menu id="menu_aec_extractToFavorite_messageMenu" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractFavoritefolder_messageMenu-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="false" />
        </menu>

        <menu id="menu_aec_extractToMRU_messageMenu" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="false" />
        </menu>

        <menuitem id="menu_aec_extractToSuggest_messageMenu" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractToSuggest" />

        <menuseparator/>

        <menuitem id="menu_aec_justDeleteAttachments_messageMenu" 
          label="&attachmentextractor.justDeleteAttachments.label;" 
          accesskey="&attachmentextractor.justDeleteAttachments.accesskey;" 
          command="cmd_aec_justDeleteAttachments" />

      </menupopup>
    </menu>

  </menupopup>

  <!-- context Menu in threadpane and previewpane -->
  <!-- mailContext -->
  <menupopup id="mailContext">

    <menuseparator id="aec-mailContextPopup-separator" 
      insertafter="mailContext-delete">
      <observes element="mailContext-delete" 
        attribute="hidden"/>
    </menuseparator>

    <menu id="aec-mailContextPopup-menu" 
      label="&attachmentextractor.extractMessagesTo.label;" 
      accesskey="&attachmentextractor.extractTo.accesskey;" 
      insertafter="aec-mailContextPopup-separator">
      <observes element="mailContext-delete" 
        attribute="hidden"/>
      <menupopup id="aec-mailContextPopup-extractToPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()">

        <menuitem id="menu_aec_extractToBrowse_mailContext" 
          label="&attachmentextractor.extractToBrowse.label;" 
          accesskey="&attachmentextractor.extractToBrowse.accesskey;" 
          command="cmd_aec_extractToBrowse" />

        <menuseparator/>

        <menuitem id="menu_aec_extractToDefault_mailContext" 
          label="&attachmentextractor.extractToDefault.label;" 
          accesskey="&attachmentextractor.extractToDefault.accesskey;" 
          command="cmd_aec_extractToDefault" />

        <menu id="menu_aec_extractToFavorite_mailContext" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractFavoritefolder_mailContext-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="false" />
        </menu>

        <menu id="menu_aec_extractToMRU_mailContext" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="false" />
        </menu>

        <menuitem id="menu_aec_extractToSuggest_mailContext" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractToSuggest" />

        <menuseparator/>

        <menuitem id="menu_aec_justDeleteAttachments_mailContext" 
          label="&attachmentextractor.justDeleteAttachments.label;" 
          accesskey="&attachmentextractor.justDeleteAttachments.accesskey;" 
          command="cmd_aec_justDeleteAttachments" />

      </menupopup>
    </menu>

  </menupopup>

  <!-- Menu 'File' -->
  <menupopup id="menu_FilePopup">

    <menuseparator id="aec-fileMenuPopup-separator" 
      insertafter="menu_saveAs" />
    <menu id="aec-fileMenuPopup-menu" 
      label="&attachmentextractor.extractFoldersTo.label;" 
      accesskey="&attachmentextractor.extractTo.accesskey;" 
      insertafter="aec-fileMenuPopup-separator">
      <menupopup id="aec-fileMenuPopup-extractToPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()">

        <menuitem id="menu_aec_extractAllToBrowse_fileMenu" 
          label="&attachmentextractor.extractToBrowse.label;" 
          accesskey="&attachmentextractor.extractToBrowse.accesskey;" 
          command="cmd_aec_extractAllToBrowse" />
        <menuitem id="menu_aec_extractDeepToBrowse_fileMenu" 
          label="&attachmentextractor.extractWithSubToBrowse.label;" 
          accesskey="&attachmentextractor.extractWithSubToBrowse.accesskey;" 
          command="cmd_aec_extractDeepToBrowse" />

        <menuseparator/>

        <menuitem id="menu_aec_extractAllToDefault_fileMenu" 
          label="&attachmentextractor.extractToDefault.label;" 
          accesskey="&attachmentextractor.extractToDefault.accesskey;" 
          command="cmd_aec_extractAllToDefault" />
        <menuitem id="menu_aec_extractDeepToDefault_fileMenu" 
          label="&attachmentextractor.extractWithSubToDefault.label;" 
          accesskey="&attachmentextractor.extractWithSubToDefault.accesskey;" 
          command="cmd_aec_extractDeepToDefault" />

        <menu id="menu_aec_extractAllToFavorite_fileMenu" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractAllFavoritefolder_fileMenu-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="true" />
        </menu>
        <menu id="menu_aec_extractDeepToFavorite_fileMenu" 
          label="&attachmentextractor.extractWithSubToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractWithSubToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractDeepFavoritefolder_fileMenu-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="2" />
        </menu>

        <menu id="menu_aec_extractAllToMRU_fileMenu" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractAllMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="true" />
        </menu>
        <menu id="menu_aec_extractDeepToMRU_fileMenu" 
          label="&attachmentextractor.extractWithSubToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractWithSubToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractDeepMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="2" />
        </menu>

        <menuitem id="menu_aec_extractAllToSuggest_fileMenu" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractAllToSuggest" />
        <menuitem id="menu_aec_extractDeepToSuggest_fileMenu" 
          label="&attachmentextractor.extractWithSubToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractWithSubToSuggestfolders.accesskey;" 
          command="cmd_aec_extractDeepToSuggest" />

      </menupopup>
    </menu>

  </menupopup>

  <!-- context menu in folder pane -->
  <popup id="folderPaneContext">

    <menuseparator id="aec-folderPaneContextPopup-separator" 
      insertafter="folderPaneContext-rename" />
    <menu id="aec-folderPaneContextPopup-menu" 
      label="&attachmentextractor.extractFoldersTo.label;" 
      accesskey="&attachmentextractor.extractTo.accesskey;" 
      insertafter="aec-folderPaneContextPopup-separator">
      <menupopup id="aec-folderPaneContextPopup-extractToPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()">

        <menuitem id="menu_aec_extractAllToBrowse_folderPaneContext" 
          label="&attachmentextractor.extractToBrowse.label;" 
          accesskey="&attachmentextractor.extractToBrowse.accesskey;" 
          command="cmd_aec_extractAllToBrowse" />
        <menuitem id="menu_aec_extractDeepToBrowse_folderPaneContext" 
          label="&attachmentextractor.extractWithSubToBrowse.label;" 
          accesskey="&attachmentextractor.extractWithSubToBrowse.accesskey;" 
          command="cmd_aec_extractDeepToBrowse" />

        <menuseparator/>

        <menuitem id="menu_aec_extractAllToDefault_folderPaneContext" 
          label="&attachmentextractor.extractToDefault.label;" 
          accesskey="&attachmentextractor.extractToDefault.accesskey;" 
          command="cmd_aec_extractAllToDefault" />
        <menuitem id="menu_aec_extractDeepToDefault_folderPaneContext" 
          label="&attachmentextractor.extractWithSubToDefault.label;" 
          accesskey="&attachmentextractor.extractWithSubToDefault.accesskey;" 
          command="cmd_aec_extractDeepToDefault" />

        <menu id="menu_aec_extractAllToFavorite_folderPaneContext" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractAllFavoritefolder_folderPaneContext-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="true" />
        </menu>
        <menu id="menu_aec_extractDeepToFavorite_folderPaneContext" 
          label="&attachmentextractor.extractWithSubToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractWithSubToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractDeepFavoritefolder_folderPaneContext-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="2" />
        </menu>

        <menu id="menu_aec_extractAllToMRU_folderPaneContext" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractAllMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="true" />
        </menu>
        <menu id="menu_aec_extractDeepToMRU_folderPaneContext" 
          label="&attachmentextractor.extractWithSubToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractWithSubToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractDeepMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="2" />
        </menu>

        <menuitem id="menu_aec_extractAllToSuggest_folderPaneContext" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractAllToSuggest" />
        <menuitem id="menu_aec_extractDeepToSuggest_folderPaneContext" 
          label="&attachmentextractor.extractWithSubToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractWithSubToSuggestfolders.accesskey;" 
          command="cmd_aec_extractDeepToSuggest" />

      </menupopup>
    </menu>
  </popup>

  <!-- Button on the right in case of multiple attachment items -->
  <menupopup id="attachmentSaveAllMultipleMenu">

    <menuseparator id="aec-attachmentSaveAllMultiplePopup-separator" 
      insertafter="button-deleteAllAttachments">
    </menuseparator>

    <menu id="aec-attachmentSaveAllMultiplePopup-menu" 
      label="&attachmentextractor.extractMultipleAttTo.label;" 
      accesskey="&attachmentextractor.extractTo.accesskey;" 
      insertafter="aec-attachmentSaveAllMultiplePopup-separator">
      <menupopup id="aec-attachmentSaveAllMultiplePopup-extractToPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()">

        <menuitem id="menu_aec_extractToBrowse_attachmentSaveAllMultiple" 
          label="&attachmentextractor.extractToBrowse.label;" 
          accesskey="&attachmentextractor.extractToBrowse.accesskey;" 
          command="cmd_aec_extractIndAllToBrowse" />

        <menuseparator/>

        <menuitem id="menu_aec_extractToDefault_attachmentSaveAllMultiple" 
          label="&attachmentextractor.extractToDefault.label;" 
          accesskey="&attachmentextractor.extractToDefault.accesskey;" 
          command="cmd_aec_extractIndAllToDefault" />

        <menu id="menu_aec_extractToFavorite_attachmentSaveAllMultiple" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractFavoritefolder_attachmentSaveAllMultiple-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="'all'" 
            paramIndividual="true" />
        </menu>

        <menu id="menu_aec_extractToMRU_attachmentSaveAllMultiple" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="'all'" 
            paramIndividual="true" />
        </menu>

        <menuitem id="menu_aec_extractToSuggest_attachmentSaveAllMultiple" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractIndAllToSuggest" />

      </menupopup>
    </menu>

  </menupopup>

  <!-- Button on the right in case of 1 attachment item -->
  <menupopup id="attachmentSaveAllSingleMenu">

    <menuseparator id="aec-attachmentSaveAllSinglePopup-separator" 
      insertafter="button-deleteAllAttachments">
    </menuseparator>

    <menu id="aec-attachmentSaveAllSinglePopup-menu" 
      label="&attachmentextractor.extractSingleAttTo.label;" 
      accesskey="&attachmentextractor.extractTo.accesskey;" 
      insertafter="aec-attachmentSaveAllSinglePopup-separator">
      <menupopup id="aec-attachmentSaveAllSinglePopup-extractToPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()">

        <menuitem id="menu_aec_extractToBrowse_attachmentSaveAllSingle" 
          label="&attachmentextractor.extractToBrowse.label;" 
          accesskey="&attachmentextractor.extractToBrowse.accesskey;" 
          command="cmd_aec_extractIndToBrowse" />

        <menuseparator/>

        <menuitem id="menu_aec_extractToDefault_attachmentSaveAllSingle" 
          label="&attachmentextractor.extractToDefault.label;" 
          accesskey="&attachmentextractor.extractToDefault.accesskey;" 
          command="cmd_aec_extractIndToDefault" />

        <menu id="menu_aec_extractToFavorite_attachmentSaveAllSingle" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractFavoritefolder_attachmentSaveAllSingle-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="'selected'" 
            paramIndividual="true" />
        </menu>

        <menu id="menu_aec_extractToMRU_attachmentSaveAllSingle" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="'selected'" 
            paramIndividual="true" />
        </menu>

        <menuitem id="menu_aec_extractToSuggest_attachmentSaveAllSingle" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractIndToSuggest" />

      </menupopup>
    </menu>

  </menupopup>

  <!-- Context menu by rightclick on the attachment bar in case of multiple attachments -->
  <menupopup id="attachmentListContext">

    <menuseparator id="aec-attachmentListContextPopup-separator" 
      insertafter="context-deleteAllAttachments">
    </menuseparator>

    <menu id="aec-attachmentListContextPopup-menu" 
      label="&attachmentextractor.extractMultipleAttTo.label;" 
      accesskey="&attachmentextractor.extractTo.accesskey;" 
      insertafter="aec-attachmentListContextPopup-separator">
      <observes element="attachmentSaveAllMultiple" 
          attribute="disabled"/>
      <menupopup id="aec-attachmentListContextPopup-extractToPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()">

        <menuitem id="menu_aec_extractToBrowse_attachmentListContext" 
          label="&attachmentextractor.extractToBrowse.label;" 
          accesskey="&attachmentextractor.extractToBrowse.accesskey;" 
          command="cmd_aec_extractIndAllToBrowse" />

        <menuseparator/>

        <menuitem id="menu_aec_extractToDefault_attachmentListContext" 
          label="&attachmentextractor.extractToDefault.label;" 
          accesskey="&attachmentextractor.extractToDefault.accesskey;" 
          command="cmd_aec_extractIndAllToDefault" />

        <menu id="menu_aec_extractToFavorite_attachmentListContext" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractFavoritefolder_attachmentListContext-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="'all'" 
            paramIndividual="true" />
        </menu>

        <menu id="menu_aec_extractToMRU_attachmentListContext" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="'all'" 
            paramIndividual="true" />
        </menu>

        <menuitem id="menu_aec_extractToSuggest_attachmentListContext" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractIndAllToSuggest" />

      </menupopup>
    </menu>

  </menupopup>

  <!-- Context menu by rightclick on an item in the attachment bar and in case of a single attachment by rightclick on the attachmentbar -->
  <menupopup id="attachmentItemContext">

    <menuseparator id="aec-attachmentItemContextPopup-separator" 
      insertafter="context-deleteAttachment">
    </menuseparator>

    <menu id="aec-attachmentItemContextPopup-menu" 
      label="&attachmentextractor.extractSingleAttTo.label;" 
      accesskey="&attachmentextractor.extractTo.accesskey;" 
      insertafter="aec-attachmentItemContextPopup-separator">
      <observes element="attachmentSaveAllMultiple" 
          attribute="disabled"/>
      <menupopup id="aec-attachmentItemContextPopup-extractToPopup"
        onpopupshowing="attachmentextractor.updatePopupMenus()">

        <menuitem id="menu_aec_extractToBrowse_attachmentItemContext" 
          label="&attachmentextractor.extractToBrowse.label;" 
          accesskey="&attachmentextractor.extractToBrowse.accesskey;" 
          command="cmd_aec_extractIndToBrowse" />

        <menuseparator/>

        <menuitem id="menu_aec_extractToDefault_attachmentItemContext" 
          label="&attachmentextractor.extractToDefault.label;" 
          accesskey="&attachmentextractor.extractToDefault.accesskey;" 
          command="cmd_aec_extractIndToDefault" />

        <menu id="menu_aec_extractToFavorite_attachmentItemContext" 
          label="&attachmentextractor.extractToFavoritefolders.label;" 
          accesskey="&attachmentextractor.extractToFavoritefolders.accesskey;">
          <menupopup id="menu_aec_extractFavoritefolder_attachmentItemContext-Popup" 
            onpopupshowing="attachmentextractor.updateFavoriteMenuItems(this)" 
            paramAll="'selected'" 
            paramIndividual="true" />
        </menu>

        <menu id="menu_aec_extractToMRU_attachmentItemContext" 
          label="&attachmentextractor.extractToMRUfolders.label;" 
          accesskey="&attachmentextractor.extractToMRUfolders.accesskey;">
          <menupopup id="menu_aec_extractMRU_toolbar-Popup" 
            onpopupshowing="attachmentextractor.updateMRUMenuItems(this)" 
            paramAll="'selected'" 
            paramIndividual="true" />
        </menu>

        <menuitem id="menu_aec_extractToSuggest_attachmentItemContext" 
          label="&attachmentextractor.extractToSuggestfolders.label;" 
          accesskey="&attachmentextractor.extractToSuggestfolders.accesskey;" 
          command="cmd_aec_extractIndToSuggest" />

      </menupopup>
    </menu>

  </menupopup>
  `,
  ["chrome://attachmentextractor_cont/locale/attachmentextractor.dtd","chrome://messenger/locale/messenger.dtd"]);

  window.attachmentextractor.init();
  window.aecButtonStatus.startup();
  window.aecMenuItemStatus.startup();

}

function onUnload(deactivatedWhileWindowOpen) {

  window.aecButtonStatus.shutdown();
  window.aecMenuItemStatus.shutdown();

}
