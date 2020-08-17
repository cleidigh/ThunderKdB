/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var TypicalReplyButtons = {
  get utils() {
    delete this.utils;
    let { TypicalReply } = Components.utils.import('resource://typical-reply-modules/TypicalReply.jsm', {});
    return this.utils = TypicalReply;
  },

  onCommand(aEvent) {
    const target = aEvent.target;
    const type = target.getAttribute('data-type');

    const definition = this.utils.getDefinition(type);

    if (definition.quoteType)
      this.utils.quoteType = definition.quoteType;
    else
      this.utils.quoteType = target.getAttribute('data-quote-type');

    this.utils.type = type;

    const forwardType = definition.forwardType || target.getAttribute('data-forward-type');
    if (forwardType == 'attachment') {
      MsgForwardAsAttachment(aEvent);
    }
    else if (forwardType == 'inline') {
      MsgForwardAsInline(aEvent);
    }
    else {
      if (definition.recipients == this.utils.RECIPIENTS_ALL ||
          definition.recipients == this.utils.RECIPIENTS_FORWARD)
        MsgReplyToAllMessage(aEvent);
      else
        MsgReplySender(aEvent);
    }
  },

  get bundle() {
    return document.getElementById('typicalReply-bundle');
  },

  get toolbar() {
    return document.getElementById('header-view-toolbar');
  },
  get palette() {
    return document.getElementById('header-view-toolbar-palette') || this.toolbar.parentNode.palette;
  },

  get container() {
    return document.getElementById('typicalReply-buttons-container') || this.palette.querySelector('#typicalReply-buttons-container');
  },
  get actionsButton() {
    return document.getElementById('typicalReply-actions-button') || this.palette.querySelector('#typicalReply-actions-button');
  },
  get menupopup() {
    return document.getElementById('typicalReply-menupopup') || this.palette.querySelector('#typicalReply-menupopup');
  },

  get contextMenuItem() {
    return document.getElementById('typicalReply-actions-contextMenuItem');
  },
  get contextMenuItemMenupopup() {
    return document.getElementById('typicalReply-contextMenuItem-menupopup');
  },

  toolbarItemIDs: [],

  buildUI() {
    this.buildContextMenuItems();
    this.buildButtons();
    this.toolbarItemIDs.push(this.container.getAttribute('id'));
  },

  buildContextMenuItems() {
    const items = document.createDocumentFragment();
    this.utils.definitions.forEach(function(aDefinition) {
      if (!aDefinition.separate)
        return;

      const item = this.buildMenuItem(aDefinition);
      items.appendChild(item);
    }, this);
    this.contextMenuItem.parentNode.insertBefore(items, this.contextMenuItem);

    const menupopupChildren = document.createDocumentFragment();
    this.utils.definitions.forEach(function(aDefinition, aIndex) {
      if (aDefinition.separate)
        return;

      if (aIndex > 0)
        menupopupChildren.appendChild(document.createElement('menuseparator'));

      menupopupChildren.appendChild(this.buildActionItems(aDefinition));
    }, this);
    this.contextMenuItemMenupopup.appendChild(menupopupChildren);
    if (!this.contextMenuItemMenupopup.hasChildNodes())
      this.contextMenuItem.setAttribute('hidden', true);
  },
  buildMenuItem(aDefinition) {
    const item = document.createElement(aDefinition.quoteType ? 'menuitem' : 'menu');
    item.setAttribute('id', 'typicalReply-menuitem-' + aDefinition.type);
    if (aDefinition.icon) {
      item.setAttribute('class', 'menu-iconic');
      item.setAttribute('image', aDefinition.icon);
    }
    item.setAttribute('label', aDefinition.label);
    item.setAttribute('accesskey', aDefinition.accesskey);
    item.setAttribute('tooltiptext', aDefinition.label);
    item.setAttribute('data-type', aDefinition.type);
    item.setAttribute('oncommand', 'TypicalReplyButtons.onCommand(event);');
    if (aDefinition.quoteType) {
      item.setAttribute('data-quote-type', aDefinition.quoteType);
    }
    else {
      let menupopup = document.createElement('menupopup');
      menupopup.appendChild(this.buildActionItems(aDefinition));
      item.appendChild(menupopup);
    }
    return item;
  },

  buildButtons() {
    const container = document.createXULElement('toolbaritem');
    container.setAttribute('id', 'typicalReply-buttons-container');
    container.setAttribute('label', this.bundle.getString('buttons.label'));
    container.setAttribute('tooltiptext', this.bundle.getString('buttons.tooltiptext'));
    container.setAttribute('removable', 'true');
    const button = container.appendChild(document.createXULElement('toolbarbutton'));
    button.setAttribute('id', 'typicalReply-actions-button');
    button.setAttribute('type', 'menu');
    button.setAttribute('class', 'toolbarbutton-1 msgHeaderView-button hdrReplyButton');
    button.setAttribute('label', this.bundle.getString('button.actions.label'));
    button.setAttribute('tooltiptext', this.bundle.getString('button.actions.tooltiptext'));
    button.setAttribute('removable', 'true');
    const popup = button.appendChild(document.createXULElement('menupopup'));
    popup.setAttribute('id', 'typicalReply-menupopup');
    popup.setAttribute('oncommand', 'TypicalReplyButtons.onCommand(event);');
    this.palette.appendChild(container);

    const buttons = document.createDocumentFragment();
    this.utils.definitions.forEach(function(aDefinition) {
      if (!aDefinition.separate)
        return;

      const button = this.buildActionButton(aDefinition);
      this.toolbarItemIDs.push(button.getAttribute('id'));
      button.setAttribute('removable', true);
      buttons.appendChild(button);
    }, this);
    this.palette.insertBefore(buttons, this.container);

    const menupopupChildren = document.createDocumentFragment();
    this.utils.definitions.forEach(function(aDefinition, aIndex) {
      if (aDefinition.separate)
        return;

      if (aIndex > 0)
        menupopupChildren.appendChild(document.createXULElement('menuseparator'));

      menupopupChildren.appendChild(this.buildActionItems(aDefinition));
    }, this);
    this.menupopup.appendChild(menupopupChildren);
    if (!this.menupopup.hasChildNodes())
      this.actionsButton.setAttribute('hidden', true);
  },
  buildActionButton(aDefinition) {
    const button = document.createXULElement('toolbarbutton');
    button.setAttribute('id', 'typicalReply-button-' + aDefinition.type);
    if (aDefinition.icon) {
      button.setAttribute('class', 'toolbarbutton-1 msgHeaderView-button');
      button.setAttribute('image', aDefinition.icon);
    } else {
      button.setAttribute('class', 'toolbarbutton-1 msgHeaderView-button hdrReplyButton');
    }
    button.setAttribute('label', aDefinition.label);
    button.setAttribute('tooltiptext', aDefinition.label);
    button.setAttribute('data-type', aDefinition.type);
    button.setAttribute('oncommand', 'TypicalReplyButtons.onCommand(event);');
    if (aDefinition.quoteType) {
      button.setAttribute('data-quote-type', aDefinition.quoteType);
    }
    else {
      button.setAttribute('type', 'menu-button');
      let menupopup = document.createXULElement('menupopup');
      menupopup.appendChild(this.buildActionItems(aDefinition));
      button.appendChild(menupopup);
    }
    return button;
  },
  buildActionItems(aDefinition) {
    const fragment = document.createDocumentFragment();
    const item = document.createXULElement('menuitem');
    if (aDefinition.icon) {
      item.setAttribute('class', 'menuitem-iconic');
      item.setAttribute('image', aDefinition.icon);
    }
    item.setAttribute('label', aDefinition.label);
    item.setAttribute('accesskey', aDefinition.accesskey);
    item.setAttribute('data-type', aDefinition.type);
    if (aDefinition.forwardType)
      item.setAttribute('data-forward-type', aDefinition.forwardType);
    if (aDefinition.quoteType) {
      item.setAttribute('data-quote-type', aDefinition.quoteType);
      fragment.appendChild(item);
    }
    else {
      item.setAttribute('data-quote-type', 'no');
      fragment.appendChild(item);
      let withQuote = item.cloneNode(true);
      withQuote.setAttribute('label', aDefinition.labelQuote);
      withQuote.setAttribute('data-quote-type', 'yes');
      if (aDefinition.forwardType)
        withQuote.setAttribute('data-forward-type', aDefinition.forwardType);
      fragment.appendChild(withQuote);
    }
    return fragment;
  },

  installToolbarButtons() {
    const extraItems = this.toolbarItemIDs.join(',');
    const toolbar = this.toolbar;
    const matcher = /\b(hdrReplyToSenderButton,hdrSmartReplyButton|hdrReplyToSenderButton|hdrSmartReplyButton|hdrForwardButton)\b/;
    let defaultset = toolbar.getAttribute('defaultset');
    if (matcher.test(defaultset))
      defaultset = defaultset.replace(matcher, '$1,' + extraItems);
    else
      defaultset = defaultset + ',' + extraItems;
    toolbar.setAttribute('defaultset', defaultset);

    const currentItems = (toolbar.currentSet || '').split(',');
    if (Services.prefs.getBoolPref('extensions.typical-reply@clear-code.com.buttons.installed') ||
        this.toolbarItemIDs.some(id => currentItems.includes(id)))
      return;

    let currentSet = toolbar.currentSet;
    if (!currentSet || currentSet == '__empty') {
      currentSet = defaultset;
    }
    else {
      if (matcher.test(currentSet))
        currentSet = currentSet.replace(matcher, '$1,' + extraItems);
      else
        currentSet = currentSet + ',' + extraItems;
    }
    toolbar.setAttribute('currentset',  toolbar.currentSet = currentSet);
    Services.prefs.setBoolPref('extensions.typical-reply@clear-code.com.buttons.installed', true);
  },

  migrate() {
    const version = this.utils.lastConfigVersion;
    if (version >= this.utils.CONFIG_VERSION)
      return;

    const toolbar = this.toolbar;
    if (version == 0) {
      let currentSet = toolbar.currentSet;
      let itemInserted = false;
      if (currentSet && currentSet != '__empty') {
        currentSet = currentSet.split(',');
        let nextItemIndex = currentSet.indexOf('typicalReply-buttons-container');
        this.toolbarItemIDs.forEach(function(aID) {
          if (currentSet.indexOf(aID) > -1)
            return;

          currentSet.splice(nextItemIndex, 0, aID);
          itemInserted = true;
        });
        if (itemInserted)
          toolbar.currentSet = currentSet.join(',');
      }
    }

    this.utils.lastConfigVersion = this.utils.CONFIG_VERSION;
  }
};

window.addEventListener('DOMContentLoaded', function TypicalReplyButtonsSetup() {
  window.removeEventListener('DOMContentLoaded', TypicalReplyButtonsSetup, false);

  TypicalReplyButtons.buildUI();
  TypicalReplyButtons.installToolbarButtons();
  window.addEventListener('load', function TypicalReplyButtonsSetupWithDelay() {
    window.removeEventListener('load', TypicalReplyButtonsSetupWithDelay, false);
    TypicalReplyButtons.migrate();
  }, false);
}, false);
