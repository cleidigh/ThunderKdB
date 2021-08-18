(self["webpackChunkthunderbirdconversations"] = self["webpackChunkthunderbirdconversations"] || []).push([[859],{

/***/ 5908:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "k": () => (/* binding */ ConversationWrapper)
});

// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(7294);
// EXTERNAL MODULE: ./node_modules/react-redux/es/index.js
var es = __webpack_require__(533);
// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(5697);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);
// EXTERNAL MODULE: ./addon/content/reducer/reducer-summary.js
var reducer_summary = __webpack_require__(3850);
// EXTERNAL MODULE: ./addon/content/es-modules/thunderbird-compat.js
var thunderbird_compat = __webpack_require__(6141);
;// CONCATENATED MODULE: ./addon/content/components/conversation/conversationFooter.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */






class _ConversationFooter extends react.PureComponent {
  constructor(props) {
    super(props);
    this.forwardConversation = this.forwardConversation.bind(this);
    this.printConversation = this.printConversation.bind(this);
  }

  forwardConversation() {
    this.props.dispatch(reducer_summary/* summaryActions.forwardConversation */.vX.forwardConversation());
  }

  printConversation() {
    this.props.dispatch(reducer_summary/* summaryActions.printConversation */.vX.printConversation());
  }

  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: "bottom-links"
    }, /*#__PURE__*/react.createElement("a", {
      className: "link",
      onClick: this.forwardConversation
    }, thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.forwardConversation")), " "); // TODO: Get printing working again.
    // –{" "}
    // <a className="link" onClick={this.printConversation}>
    //   {browser.i18n.getMessage("message.printConversation")}
    // </a>
  }

}

_ConversationFooter.propTypes = {
  dispatch: (prop_types_default()).func.isRequired
};
const ConversationFooter = es/* connect */.$j()(_ConversationFooter);
// EXTERNAL MODULE: ./addon/content/reducer/reducer-messages.js
var reducer_messages = __webpack_require__(8901);
;// CONCATENATED MODULE: ./addon/content/components/svgIcon.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * A basic SVG icon rendered using the `xlinkHref` ability
 * of SVGs. You can specify the full path, or just the hash.
 *
 * @param {*} { fullPath, hash }
 * @returns {React.ReactNode}
 */

function SvgIcon({
  fullPath,
  hash
}) {
  fullPath = fullPath || `material-icons.svg#${hash}`;
  return /*#__PURE__*/react.createElement("svg", {
    className: "icon",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    xmlnsXlink: "http://www.w3.org/1999/xlink"
  }, /*#__PURE__*/react.createElement("use", {
    xlinkHref: `icons/${fullPath}`
  }));
}
SvgIcon.propTypes = {
  fullPath: (prop_types_default()).string,
  hash: (prop_types_default()).string
};
;// CONCATENATED MODULE: ./addon/content/components/conversation/conversationHeader.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */







const LINKS_REGEX = /((\w+):\/\/[^<>()'"\s]+|www(\.[-\w]+){2,})/;

class LinkifiedSubject extends react.PureComponent {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    this.props.dispatch(reducer_summary/* summaryActions.openLink */.vX.openLink({
      url: event.target.title
    }));
    event.preventDefault();
  }

  render() {
    let subject = this.props.subject;

    if (this.props.loading) {
      subject = thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.loading");
    } else if (!subject) {
      subject = thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.noSubject");
    }

    if (LINKS_REGEX.test(this.props.subject)) {
      let contents = [];
      let text = subject;

      while (text && LINKS_REGEX.test(text)) {
        let matches = LINKS_REGEX.exec(text);
        let [pre, ...post] = text.split(matches[1]);
        let link = /*#__PURE__*/react.createElement("a", {
          href: matches[1],
          title: matches[1],
          className: "link",
          onClick: this.handleClick
        }, matches[1]);

        if (pre) {
          contents.push(pre);
        }

        contents.push(link);
        text = post.join(matches[1]);
      }

      if (text) {
        contents.push(text);
      }

      return /*#__PURE__*/react.createElement("div", {
        className: "subject",
        title: this.props.subject
      }, /*#__PURE__*/react.createElement("span", null, contents));
    }

    return /*#__PURE__*/react.createElement("div", {
      className: "subject",
      title: this.props.subject
    }, this.props.subject);
  }

}

LinkifiedSubject.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  loading: (prop_types_default()).bool.isRequired,
  subject: (prop_types_default()).string.isRequired
};

class _ConversationHeader extends react.PureComponent {
  constructor(props) {
    super(props);
    this.archiveToolbar = this.archiveToolbar.bind(this);
    this.delete = this.delete.bind(this);
    this.detachTab = this.detachTab.bind(this);
    this.expandCollapse = this.expandCollapse.bind(this);
    this.junkConversation = this.junkConversation.bind(this);
    this.toggleRead = this.toggleRead.bind(this);
  }

  archiveToolbar(event) {
    this.props.dispatch(reducer_messages/* messageActions.archiveConversation */.od.archiveConversation());
  }

  delete(event) {
    this.props.dispatch(reducer_messages/* messageActions.deleteConversation */.od.deleteConversation());
  }
  /**
   * This function gathers various information, encodes it in a URL query
   * string, and then opens a regular chrome tab that contains our
   * conversation.
   */


  detachTab(event) {
    this.props.dispatch(reducer_messages/* messageActions.detachTab */.od.detachTab());
  }

  get areSomeMessagesCollapsed() {
    return !this.props.msgData?.some(msg => msg.expanded);
  }

  get areSomeMessagesUnread() {
    return this.props.msgData?.some(msg => !msg.read);
  }

  get canJunk() {
    // TODO: Disable if in just a new tab? (e.g. double-click)
    // as per old comment:
    // We can never junk a conversation in a new tab, because the junk
    // command only operates on selected messages, and we're not in a
    // 3pane context anymore.
    return this.props.msgData && this.props.msgData.length <= 1 && this.props.msgData.some(msg => !msg.isJunk);
  }

  expandCollapse(event) {
    this.props.dispatch(reducer_messages/* messageActions.toggleConversationExpanded */.od.toggleConversationExpanded({
      expand: this.areSomeMessagesCollapsed
    }));
  }

  junkConversation(event) {
    // This callback is only activated when the conversation is not a
    //  conversation in a tab AND there's only one message in the conversation,
    //  i.e. the currently selected message
    this.props.dispatch(reducer_messages/* messageActions.markAsJunk */.od.markAsJunk({
      id: this.props.msgData[0].id,
      isJunk: true
    }));
  } // Mark the current conversation as read/unread. The conversation driver
  //  takes care of setting the right class on us whenever the state
  //  changes...


  toggleRead(event) {
    this.props.dispatch(reducer_messages/* messageActions.toggleConversationRead */.od.toggleConversationRead({
      read: this.areSomeMessagesUnread
    }));
  }

  render() {
    document.title = this.props.subject;
    return /*#__PURE__*/react.createElement("div", {
      className: "conversationHeaderWrapper"
    }, /*#__PURE__*/react.createElement("div", {
      className: "conversationHeader"
    }, /*#__PURE__*/react.createElement(LinkifiedSubject, {
      dispatch: this.props.dispatch,
      loading: this.props.loading,
      subject: this.props.subject
    }), /*#__PURE__*/react.createElement("div", {
      className: "actions"
    }, /*#__PURE__*/react.createElement("button", {
      className: "button-flat",
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.trash.tooltip"),
      onClick: this.delete
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "delete"
    })), /*#__PURE__*/react.createElement("button", {
      className: "button-flat",
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.archive.tooltip"),
      onClick: this.archiveToolbar
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "archive"
    })), this.canJunk && /*#__PURE__*/react.createElement("button", {
      className: "button-flat junk-button",
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.junk.tooltip"),
      onClick: this.junkConversation
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "whatshot"
    })), /*#__PURE__*/react.createElement("button", {
      className: "button-flat",
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.expand.tooltip"),
      onClick: this.expandCollapse
    }, /*#__PURE__*/react.createElement("svg", {
      className: `icon expand ${this.areSomeMessagesCollapsed ? "" : "collapse"}`,
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, /*#__PURE__*/react.createElement("use", {
      className: "expand-more",
      xlinkHref: "icons/material-icons.svg#expand_more"
    }), /*#__PURE__*/react.createElement("use", {
      className: "expand-less",
      xlinkHref: "icons/material-icons.svg#expand_less"
    }))), /*#__PURE__*/react.createElement("button", {
      className: `button-flat ${this.areSomeMessagesUnread ? "unread" : ""}`,
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.read.tooltip"),
      onClick: this.toggleRead
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "new"
    })), /*#__PURE__*/react.createElement("button", {
      className: "button-flat",
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.detach.tooltip"),
      onClick: this.detachTab
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "open_in_new"
    })))));
  }

}

_ConversationHeader.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  loading: (prop_types_default()).bool.isRequired,
  subject: (prop_types_default()).string.isRequired,
  msgData: (prop_types_default()).array.isRequired
};
const ConversationHeader = es/* connect */.$j(state => {
  return {
    loading: state.summary.loading,
    subject: state.summary.subject,
    msgData: state.messages.msgData
  };
})(_ConversationHeader);
// EXTERNAL MODULE: ./addon/content/reducer/reducer-attachments.js
var reducer_attachments = __webpack_require__(3849);
;// CONCATENATED MODULE: ./addon/content/components/message/attachments.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




const ICON_MAPPING = new Map([["application/msword", "x-office-document"], ["application/vnd.ms-excel", "x-office-spreadsheet"], ["application/vnd.ms-powerpoint", "x-office-presentation"], ["application/rtf", "x-office-document"], ["application/zip", "package-x-generic"], ["application/bzip2", "package-x-generic"], ["application/x-gzip", "package-x-generic"], ["application/x-tar", "package-x-generic"], ["application/x-compressed", "package-x-generic"], // "message/": "email",
["text/x-vcalendar", "x-office-calendar"], ["text/x-vcard", "x-office-address-book"], ["text/html", "text-html"], ["application/pdf", "application-pdf"], ["application/x-pdf", "application-pdf"], ["application/x-bzpdf", "application-pdf"], ["application/x-gzpdf", "application-pdf"]]);
const FALLBACK_ICON_MAPPING = new Map([// Fallbacks, at the end.
["video/", "video-x-generic"], ["audio/", "audio-x-generic"], ["image/", "image-x-generic"], ["text/", "text-x-generic"]]);
const PDF_MIME_TYPES = ["application/pdf", "application/x-pdf", "application/x-bzpdf", "application/x-gzpdf"];
const RE_MSGKEY = /number=(\d+)/;

class Attachment extends react.PureComponent {
  constructor(props) {
    super(props);
    this.preview = this.preview.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
    this.openAttachment = this.openAttachment.bind(this);
    this.deleteAttachment = this.deleteAttachment.bind(this);
    this.detachAttachment = this.detachAttachment.bind(this);
  }

  isImage(contentType) {
    return contentType.startsWith("image/");
  }

  isViewable(contentType) {
    return this.isImage(contentType) || contentType.startsWith("text/");
  }

  isPdf(contentType) {
    return PDF_MIME_TYPES.includes(contentType);
  }

  preview() {
    // Keep similar capabilities as previous versions where the user
    // can click the attachment to open the pdf.
    if (this.isPdf(this.props.contentType) && this.props.hasBuiltInPdf) {
      this.openAttachment();
      return;
    }

    this.props.dispatch(reducer_attachments/* attachmentActions.previewAttachment */.m.previewAttachment({
      name: this.props.name,
      url: this.props.url,
      isPdf: this.isPdf(this.props.contentType),
      maybeViewable: this.isViewable(this.props.contentType),
      id: this.props.id,
      partName: this.props.partName
    }));
  }

  onDragStart(event) {
    let info;

    if (/(^file:|&filename=)/.test(this.props.url)) {
      info = this.props.url;
    } else {
      info = this.props.url + "&type=" + this.props.contentType + "&filename=" + encodeURIComponent(this.props.name);
    }

    event.dataTransfer.setData("text/x-moz-url", `${info}\n${this.props.name}\n${this.props.size}`);
    event.dataTransfer.setData("text/x-moz-url-data", this.props.url);
    event.dataTransfer.setData("text/x-moz-url-desc", this.props.name);
    event.dataTransfer.setData("application/x-moz-file-promise-url", this.props.url);
    event.dataTransfer.setData("application/x-moz-file-promise", null);
    event.stopPropagation();
  }

  downloadAttachment() {
    this.props.dispatch(reducer_attachments/* attachmentActions.downloadAttachment */.m.downloadAttachment({
      id: this.props.id,
      attachmentUrl: this.props.url
    }));
  }

  openAttachment() {
    this.props.dispatch(reducer_attachments/* attachmentActions.openAttachment */.m.openAttachment({
      id: this.props.id,
      attachmentUrl: this.props.url
    }));
  }

  detachAttachment() {
    this.props.dispatch(reducer_attachments/* attachmentActions.detachAttachment */.m.detachAttachment({
      id: this.props.id,
      attachmentUrl: this.props.url,
      shouldSave: true
    }));
  }

  deleteAttachment() {
    this.props.dispatch(reducer_attachments/* attachmentActions.detachAttachment */.m.detachAttachment({
      id: this.props.id,
      attachmentUrl: this.props.url,
      shouldSave: false
    }));
  }

  iconForMimeType(mimeType) {
    if (ICON_MAPPING.has(mimeType)) {
      return ICON_MAPPING.get(mimeType) + ".svg";
    }

    let split = mimeType.split("/");

    if (split.length && FALLBACK_ICON_MAPPING.has(split[0] + "/")) {
      return FALLBACK_ICON_MAPPING.get(split[0] + "/") + ".svg";
    }

    return "gtk-file.png";
  }

  render() {
    const isPdf = this.isPdf(this.props.contentType);
    const enablePreview = isPdf || this.isViewable(this.props.contentType);
    const imgTitle = enablePreview ? browser.i18n.getMessage("attachments.viewAttachment.tooltip") : "";
    let thumb;
    let imgClass;

    if (this.isImage(this.props.contentType)) {
      thumb = this.props.url.replace(RE_MSGKEY, "number=" + this.props.messageKey);
      imgClass = "resize-me";
    } else {
      thumb = "icons/" + this.iconForMimeType(this.props.contentType);
      imgClass = "mime-icon";
    } // TODO: Drag n drop
    // Note: contextmenu is only supported in Gecko, though React will complain
    // about it.
    // Hoping to turn this into WebExtension based context menus at some
    // stage: https://github.com/thunderbird-conversations/thunderbird-conversations/issues/1416

    /* eslint-disable react/no-unknown-property */


    return /*#__PURE__*/react.createElement("li", {
      className: "attachment",
      contextmenu: `attachmentMenu-${this.props.anchor}`
    }, /*#__PURE__*/react.createElement("div", {
      className: "attachmentThumb" + (enablePreview ? " view-attachment" : ""),
      draggable: "true",
      onClick: this.preview,
      onDragStart: this.onDragStart
    }, /*#__PURE__*/react.createElement("img", {
      className: imgClass,
      src: thumb,
      title: imgTitle
    })), /*#__PURE__*/react.createElement("div", {
      className: "attachmentInfo align"
    }, /*#__PURE__*/react.createElement("span", {
      className: "filename"
    }, this.props.name), /*#__PURE__*/react.createElement("span", {
      className: "filesize"
    }, this.props.formattedSize), /*#__PURE__*/react.createElement("div", {
      className: "attachActions"
    }, isPdf && !this.props.hasBuiltInPdf && /*#__PURE__*/react.createElement("a", {
      className: "icon-link preview-attachment",
      title: browser.i18n.getMessage("attachments.preview.tooltip"),
      onClick: this.preview
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "visibility"
    })), /*#__PURE__*/react.createElement("a", {
      className: "icon-link download-attachment",
      title: browser.i18n.getMessage("attachments.download.tooltip"),
      onClick: this.downloadAttachment
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "file_download"
    })), /*#__PURE__*/react.createElement("a", {
      className: "icon-link open-attachment",
      title: browser.i18n.getMessage("attachments.open.tooltip"),
      onClick: this.openAttachment
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "search"
    })))), /*#__PURE__*/react.createElement("menu", {
      id: `attachmentMenu-${this.props.anchor}`,
      type: "context"
    }, /*#__PURE__*/react.createElement("menuitem", {
      label: browser.i18n.getMessage("attachments.context.open"),
      onClick: this.openAttachment
    }), /*#__PURE__*/react.createElement("menuitem", {
      label: browser.i18n.getMessage("attachments.context.save"),
      onClick: this.downloadAttachment
    }), /*#__PURE__*/react.createElement("menuitem", {
      label: browser.i18n.getMessage("attachments.context.detach"),
      onClick: this.detachAttachment
    }), /*#__PURE__*/react.createElement("menuitem", {
      label: browser.i18n.getMessage("attachments.context.delete"),
      onClick: this.deleteAttachment
    })));
    /* eslint-enable react/no-unknown-property */
  }

}

Attachment.propTypes = {
  anchor: (prop_types_default()).string.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  contentType: (prop_types_default()).string.isRequired,
  formattedSize: (prop_types_default()).string.isRequired,
  hasBuiltInPdf: (prop_types_default()).bool.isRequired,
  messageKey: (prop_types_default()).number.isRequired,
  name: (prop_types_default()).string.isRequired,
  size: (prop_types_default()).number.isRequired,
  partName: (prop_types_default()).string.isRequired,
  url: (prop_types_default()).string.isRequired,
  id: (prop_types_default()).number.isRequired
};
class Attachments extends react.PureComponent {
  constructor() {
    super();
    this.showGalleryView = this.showGalleryView.bind(this);
    this.downloadAll = this.downloadAll.bind(this);
  }

  showGalleryView() {
    this.props.dispatch(reducer_attachments/* attachmentActions.showGalleryView */.m.showGalleryView({
      id: this.props.id
    }));
  }

  downloadAll() {
    this.props.dispatch(reducer_attachments/* attachmentActions.downloadAll */.m.downloadAll({
      id: this.props.id
    }));
  }

  render() {
    const showGalleryLink = this.props.attachments.some(a => a.contentType.startsWith("image/"));
    return /*#__PURE__*/react.createElement("ul", {
      className: "attachments"
    }, /*#__PURE__*/react.createElement("div", {
      className: "attachHeader"
    }, this.props.attachmentsPlural, /*#__PURE__*/react.createElement("a", {
      className: "icon-link download-all",
      onClick: this.downloadAll,
      title: browser.i18n.getMessage("attachments.downloadAll.tooltip")
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "file_download"
    })), showGalleryLink && /*#__PURE__*/react.createElement("a", {
      onClick: this.showGalleryView,
      className: "icon-link view-all",
      title: browser.i18n.getMessage("attachments.gallery.tooltip")
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "photo_library"
    }))), this.props.attachments.map(attachment => /*#__PURE__*/react.createElement(Attachment, {
      anchor: attachment.anchor,
      dispatch: this.props.dispatch,
      key: attachment.anchor,
      contentType: attachment.contentType,
      formattedSize: attachment.formattedSize,
      hasBuiltInPdf: this.props.hasBuiltInPdf,
      messageKey: this.props.messageKey,
      id: this.props.id,
      name: attachment.name,
      partName: attachment.partName,
      size: attachment.size,
      url: attachment.url
    })));
  }

}
Attachments.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  attachments: (prop_types_default()).array.isRequired,
  attachmentsPlural: (prop_types_default()).string.isRequired,
  hasBuiltInPdf: (prop_types_default()).bool.isRequired,
  messageKey: (prop_types_default()).number.isRequired,
  id: (prop_types_default()).number.isRequired
};
// EXTERNAL MODULE: ./node_modules/react-dom/index.js
var react_dom = __webpack_require__(3935);
;// CONCATENATED MODULE: ./addon/content/components/contactDetail.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */







function _ContactDetail({
  name,
  email,
  realEmail,
  avatar,
  contactId,
  dispatch
}) {
  function onGeneralClick(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  function addContact(event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch(reducer_summary/* summaryActions.addContact */.vX.addContact({
      name,
      email: realEmail
    }));
  }

  function createFilter(event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch(reducer_summary/* summaryActions.createFilter */.vX.createFilter({
      email: realEmail
    }));
  }

  function copyEmail(event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch(reducer_summary/* summaryActions.copyEmail */.vX.copyEmail({
      email: realEmail
    }));
  }

  function editContact(event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch(reducer_summary/* summaryActions.editContact */.vX.editContact({
      email: realEmail
    }));
  }

  function sendEmail(event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch(reducer_summary/* summaryActions.sendEmail */.vX.sendEmail({
      name,
      email: realEmail
    }));
  }

  function showInvolving(event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch(reducer_summary/* summaryActions.showMessagesInvolving */.vX.showMessagesInvolving({
      name,
      email: realEmail
    }));
  } // If there is a card for the contact, provide the option to
  // edit the card. Otherwise, provide an add button.


  const contactEdit = contactId ? /*#__PURE__*/react.createElement("button", {
    className: "editContact",
    title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("contact.editContactTooltip"),
    onClick: editContact
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    hash: "edit"
  })) : /*#__PURE__*/react.createElement("button", {
    className: "addContact",
    title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("contact.addContactTooltip"),
    onClick: addContact
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    hash: "add"
  }));
  let avatarURI = avatar ?? "chrome://messenger/skin/addressbook/icons/contact-generic.svg";
  return /*#__PURE__*/react.createElement("div", {
    className: "tooltip",
    onClick: onGeneralClick
  }, /*#__PURE__*/react.createElement("div", {
    className: "arrow"
  }), /*#__PURE__*/react.createElement("div", {
    className: "arrow inside"
  }), /*#__PURE__*/react.createElement("div", {
    className: "authorInfoContainer"
  }, /*#__PURE__*/react.createElement("div", {
    className: "authorInfo"
  }, /*#__PURE__*/react.createElement("span", {
    className: "name",
    title: name
  }, name), /*#__PURE__*/react.createElement("span", {
    className: "authorEmail"
  }, /*#__PURE__*/react.createElement("span", {
    className: "authorEmailAddress",
    title: realEmail
  }, realEmail), /*#__PURE__*/react.createElement("button", {
    className: "copyEmail",
    title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("contact.copyEmailTooltip"),
    onClick: copyEmail
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    hash: "content_copy"
  })))), /*#__PURE__*/react.createElement("div", {
    className: "authorPicture"
  }, /*#__PURE__*/react.createElement("img", {
    src: avatarURI
  }))), /*#__PURE__*/react.createElement("div", {
    className: "tipFooter"
  }, /*#__PURE__*/react.createElement("button", {
    className: "sendEmail",
    title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("contact.sendEmailTooltip"),
    onClick: sendEmail
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    hash: "mail"
  })), /*#__PURE__*/react.createElement("button", {
    className: "showInvolving",
    title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("contact.recentConversationsTooltip"),
    onClick: showInvolving
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    hash: "history"
  })), contactEdit, /*#__PURE__*/react.createElement("button", {
    className: "createFilter",
    onClick: createFilter
  }, thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("contact.createFilterTooltip"))));
}

_ContactDetail.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  name: (prop_types_default()).string.isRequired,
  email: (prop_types_default()).string.isRequired,
  realEmail: (prop_types_default()).string.isRequired,
  avatar: (prop_types_default()).string,
  contactId: (prop_types_default()).string
};
const ContactDetail = es/* connect */.$j()(_ContactDetail);
;// CONCATENATED MODULE: ./addon/content/components/message/messageActionButton.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




const ActionsToInfoMap = {
  draft: {
    title: "action.editDraft",
    icon: "edit"
  },
  editAsNew: {
    title: "action.editNew",
    icon: "edit"
  },
  reply: {
    title: "action.reply",
    icon: "reply"
  },
  replyAll: {
    title: "action.replyAll",
    icon: "reply_all"
  },
  replyList: {
    title: "action.replyList",
    icon: "list"
  },
  forward: {
    title: "action.forward",
    icon: "forward"
  },
  archive: {
    title: "action.archive",
    icon: "archive"
  },
  delete: {
    title: "action.delete",
    icon: "delete"
  },
  classic: {
    title: "action.viewClassic",
    icon: "open_in_new"
  },
  source: {
    title: "action.viewSource",
    icon: "code"
  }
};
function ActionButton({
  type,
  callback,
  className,
  showString
}) {
  const info = ActionsToInfoMap[type];
  const title = thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage(info.title);

  function action(event) {
    callback({
      type,
      shiftKey: event && event.shiftKey
    }, event);
  }

  return /*#__PURE__*/react.createElement("button", {
    className: className || "",
    title: title,
    onClick: action
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    hash: info.icon
  }), " ", !!showString && title);
}
ActionButton.propTypes = {
  callback: (prop_types_default()).func.isRequired,
  className: (prop_types_default()).string,
  showString: (prop_types_default()).bool,
  type: (prop_types_default()).string.isRequired
};
;// CONCATENATED MODULE: ./addon/content/components/message/messageHeaderOptions.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */







class OptionsMoreMenu extends react.PureComponent {
  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: "tooltip tooltip-menu menu"
    }, /*#__PURE__*/react.createElement("div", {
      className: "arrow"
    }), /*#__PURE__*/react.createElement("div", {
      className: "arrow inside"
    }), /*#__PURE__*/react.createElement("ul", null, /*#__PURE__*/react.createElement("li", {
      className: "action-reply"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "reply"
    })), this.props.multipleRecipients && /*#__PURE__*/react.createElement("li", {
      className: "action-replyAll"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "replyAll"
    })), this.props.recipientsIncludeLists && /*#__PURE__*/react.createElement("li", {
      className: "action-replyList"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "replyList"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-editNew"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "editAsNew"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-forward dropdown-sep"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "forward"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-archive"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "archive"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-delete"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "delete"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-classic"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "classic"
    })), /*#__PURE__*/react.createElement("li", {
      className: "action-source"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "source"
    }))));
  }

}

OptionsMoreMenu.propTypes = {
  multipleRecipients: (prop_types_default()).bool.isRequired,
  recipientsIncludeLists: (prop_types_default()).bool.isRequired,
  msgSendAction: (prop_types_default()).func.isRequired
};
class MessageHeaderOptions extends react.PureComponent {
  constructor(props) {
    super(props);
    this.replyAction = this.replyAction.bind(this);
    this.showDetails = this.showDetails.bind(this);
    this.displayMenu = this.displayMenu.bind(this);
    this.state = {
      expanded: false
    };
  }

  componentWillUnmount() {
    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener);
      document.removeEventListener("keypress", this.keyListener);
      document.removeEventListener("blur", this.keyListener);
      this.clickListener = null;
      this.keyListener = null;
    }
  }

  replyAction(msg, event) {
    event.stopPropagation();
    event.preventDefault();
    const payload = {
      id: this.props.id,
      shiftKey: msg.shiftKey
    };
    let action = null;

    switch (msg.type) {
      case "draft":
        action = reducer_messages/* messageActions.editDraft */.od.editDraft(payload);
        break;

      case "reply":
        action = reducer_messages/* messageActions.reply */.od.reply(payload);
        break;

      case "replyAll":
        action = reducer_messages/* messageActions.replyAll */.od.replyAll(payload);
        break;

      case "replyList":
        action = reducer_messages/* messageActions.replyList */.od.replyList(payload);
        break;

      case "forward":
        action = reducer_messages/* messageActions.forward */.od.forward(payload);
        break;

      case "editAsNew":
        action = reducer_messages/* messageActions.editAsNew */.od.editAsNew(payload);
        break;

      case "archive":
        action = reducer_messages/* messageActions.archive */.od.archive({
          id: this.props.id
        });
        break;

      case "delete":
        action = reducer_messages/* messageActions.delete */.od.delete({
          id: this.props.id
        });
        break;

      case "classic":
        action = reducer_messages/* messageActions.openClassic */.od.openClassic(payload);
        break;

      case "source":
        action = reducer_messages/* messageActions.openSource */.od.openSource(payload);
        break;

      default:
        console.error("Don't know how to create an action for", msg);
    }

    this.props.dispatch(action);
  }

  showDetails(event) {
    event.preventDefault();
    event.stopPropagation(); // Force a blur, so that the button looks correct after clicking.

    event.target.blur();
    this.props.dispatch(reducer_messages/* messageActions.showMsgDetails */.od.showMsgDetails({
      id: this.props.id,
      detailsShowing: !this.props.detailsShowing
    }));
  }

  displayMenu(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.clickListener) {
      this.clickListener = event => {
        this.clearMenu();
      };

      this.keyListener = event => {
        if (event.keyCode == KeyEvent.DOM_VK_ESCAPE) {
          this.clearMenu();
        }
      };

      this.onBlur = event => {
        this.clearMenu();
      };

      document.addEventListener("click", this.clickListener);
      document.addEventListener("keypress", this.keyListener);
      document.addEventListener("blur", this.onBlur);
    }

    this.setState(prevState => ({
      expanded: !prevState.expanded
    }));
  }

  clearMenu() {
    this.setState({
      expanded: false
    });

    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener);
      document.removeEventListener("keypress", this.keyListener);
      document.removeEventListener("blur", this.keyListener);
      this.clickListener = null;
      this.keyListener = null;
    }
  }

  render() {
    let actionButtonType = "reply";

    if (this.props.recipientsIncludeLists) {
      actionButtonType = "replyList";
    } else if (this.props.multipleRecipients) {
      actionButtonType = "replyAll";
    } else if (this.props.isDraft) {
      actionButtonType = "draft";
    }

    return /*#__PURE__*/react.createElement("div", {
      className: "options"
    }, !!this.props.attachments.length && /*#__PURE__*/react.createElement("span", {
      className: "attachmentIcon"
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "attachment"
    })), /*#__PURE__*/react.createElement("span", {
      className: "date"
    }, /*#__PURE__*/react.createElement("span", {
      title: this.props.fullDate
    }, this.props.date)), this.props.expanded && /*#__PURE__*/react.createElement("span", {
      className: "mainActionButton"
    }, /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.replyAction,
      className: "icon-link",
      type: actionButtonType
    })), this.props.expanded && /*#__PURE__*/react.createElement("span", {
      className: "details" + this.props.detailsShowing ? "details-hidden" : 0
    }, /*#__PURE__*/react.createElement("a", {
      className: "icon-link",
      onClick: this.showDetails,
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage(this.props.detailsShowing ? "message.hideDetails.tooltip" : "message.showDetails.tooltip")
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: this.props.detailsShowing ? "info" : "info_outline"
    }))), this.props.expanded && /*#__PURE__*/react.createElement("span", {
      className: "dropDown"
    }, /*#__PURE__*/react.createElement("button", {
      onClick: this.displayMenu,
      className: "icon-link top-right-more",
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("message.moreMenu.tooltip")
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: "more_vert"
    })), this.state.expanded && /*#__PURE__*/react.createElement(OptionsMoreMenu, {
      recipientsIncludeLists: this.props.recipientsIncludeLists,
      msgSendAction: this.replyAction,
      multipleRecipients: this.props.multipleRecipients
    })));
  }

}
MessageHeaderOptions.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  date: (prop_types_default()).string.isRequired,
  detailsShowing: (prop_types_default()).bool.isRequired,
  expanded: (prop_types_default()).bool.isRequired,
  fullDate: (prop_types_default()).string.isRequired,
  id: (prop_types_default()).number.isRequired,
  attachments: (prop_types_default()).array.isRequired,
  multipleRecipients: (prop_types_default()).bool.isRequired,
  recipientsIncludeLists: (prop_types_default()).bool.isRequired,
  isDraft: (prop_types_default()).bool.isRequired
};
;// CONCATENATED MODULE: ./addon/content/components/message/messageTags.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




/**
 * Determine if a background color is light enough to require dark text.
 *
 * @param {string} color
 * @returns {boolean}
 */

function isColorLight(color) {
  const rgb = color.substr(1) || "FFFFFF";
  const [, r, g, b] = rgb.match(/(..)(..)(..)/).map(x => parseInt(x, 16) / 255);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.8;
}

function MessageTag({
  onClickX,
  expanded,
  name,
  color
}) {
  const isLight = isColorLight(color);
  return /*#__PURE__*/react.createElement("li", {
    className: "tag" + (isLight ? " light-tag" : ""),
    style: {
      backgroundColor: color
    }
  }, name, expanded && /*#__PURE__*/react.createElement("span", {
    className: "tag-x",
    onClick: onClickX
  }, " ", "x"));
}
MessageTag.propTypes = {
  onClickX: (prop_types_default()).func.isRequired,
  expanded: (prop_types_default()).bool.isRequired,
  name: (prop_types_default()).string.isRequired,
  color: (prop_types_default()).string.isRequired
};
function MessageTags({
  expanded,
  tags = [],
  onTagsChange
}) {
  function removeTag(tagId) {
    const filtered = tags.filter(tag => tag.key !== tagId);

    if (filtered.length !== tags.length) {
      // Only trigger a change if we actually removed a tag
      onTagsChange(filtered);
    }
  }

  return /*#__PURE__*/react.createElement("ul", {
    className: "tags regular-tags"
  }, tags.map((tag, i) => /*#__PURE__*/react.createElement(MessageTag, {
    color: tag.color,
    expanded: expanded,
    key: i,
    name: tag.name,
    onClickX: () => {
      removeTag(tag.key);
    }
  })));
}
MessageTags.propTypes = {
  expanded: (prop_types_default()).bool.isRequired,
  tags: (prop_types_default()).array.isRequired,
  onTagsChange: (prop_types_default()).func.isRequired
};

function DkimTooltip({
  strings
}) {
  const [primaryString, secondaryStrings = []] = strings;
  const primaryTooltip = /*#__PURE__*/react.createElement("div", null, primaryString);
  const secondaryTooltip = secondaryStrings.length ? /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("hr", null), secondaryStrings.map((s, i) => /*#__PURE__*/react.createElement("div", {
    key: i
  }, s)), /*#__PURE__*/react.createElement("div", null)) : null;
  return /*#__PURE__*/react.createElement("span", null, primaryTooltip, secondaryTooltip);
}

DkimTooltip.propTypes = {
  strings: (prop_types_default()).array.isRequired
};
function SpecialMessageTag({
  icon,
  name,
  title = "",
  tooltip = {},
  onClick = null,
  classNames
}) {
  return /*#__PURE__*/react.createElement("li", {
    className: classNames + " special-tag" + (onClick ? " can-click" : ""),
    title: title,
    onClick: onClick
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    fullPath: icon
  }), name, tooltip.type === "dkim" && /*#__PURE__*/react.createElement(DkimTooltip, {
    strings: tooltip.strings
  }));
}
SpecialMessageTag.propTypes = {
  classNames: (prop_types_default()).string.isRequired,
  icon: (prop_types_default()).string.isRequired,
  name: (prop_types_default()).string.isRequired,
  title: (prop_types_default()).string,
  onClick: (prop_types_default()).func,
  tooltip: (prop_types_default()).object
};
function SpecialMessageTags({
  onTagClick,
  onFolderClick = null,
  specialTags,
  inView,
  folderName
}) {
  let folderItem = null;

  if (folderName && !inView) {
    folderItem = /*#__PURE__*/react.createElement("li", {
      className: "in-folder",
      onClick: onFolderClick,
      title: thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("tags.jumpToFolder.tooltip")
    }, thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("tags.inFolder", [folderName]));
  }

  return /*#__PURE__*/react.createElement("ul", {
    className: "tags special-tags"
  }, specialTags && specialTags.map((tag, i) => /*#__PURE__*/react.createElement(SpecialMessageTag, {
    classNames: tag.classNames,
    icon: tag.icon,
    key: i,
    name: tag.name,
    onClick: tag.details && (event => onTagClick(event, tag)),
    title: tag.title,
    tooltip: tag.tooltip
  })), folderItem);
}
SpecialMessageTags.propTypes = {
  onTagClick: (prop_types_default()).func.isRequired,
  onFolderClick: (prop_types_default()).func,
  folderName: (prop_types_default()).string.isRequired,
  inView: (prop_types_default()).bool.isRequired,
  specialTags: (prop_types_default()).array
};
;// CONCATENATED MODULE: ./addon/content/components/message/messageHeader.jsx
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */









/**
 * Normalize a contact into a string (used for i18n formatting).
 *
 * @param {*} contact
 * @returns
 */

function contactToString(contact) {
  return `${contact.name || ""} <${contact.displayEmail || contact.email}>`.trim();
}
/**
 * Opens `popup` when the child element(s) are hovered over,
 * or they are focused. The children are surrounded by a <span>.
 * Any additional props are passed to the surrounding <span>.
 * An element with `id=popup-container` is assumed to exist somewhere
 * near the root of the DOM. The children elements are rendered,
 * absolutely positions, inside the popup-container.
 *
 * @param {*} { children, popup, ...rest }
 * @returnType {React.Node}
 */


function HoverFade({
  children,
  popup,
  ...rest
}) {
  const [isHovering, setIsHovering] = react.useState(false);
  const [shouldShowPopup, setShouldShowPopup] = react.useState(false);
  const spanRef = react.useRef(null);
  const popupParentNode = document.querySelector("#popup-container") || spanRef.current;
  react.useEffect(() => {
    let timeoutId = null;

    if (isHovering) {
      // If we hover over the label, we delay showing the popup.
      timeoutId = window.setTimeout(() => {
        if (isHovering) {
          setShouldShowPopup(true);
        } else {
          setShouldShowPopup(false);
        }
      }, 400);
    } else {
      // If we're not hovering, we don't delay hiding the popup.
      setShouldShowPopup(false);
    }

    return () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isHovering, setShouldShowPopup]); // Calculate where to render the popup

  const pos = spanRef.current?.getBoundingClientRect() || {
    left: 0,
    top: 0,
    bottom: 0
  };
  const parentPos = popupParentNode?.getBoundingClientRect() || {
    left: 0,
    top: 0,
    bottom: 0
  };
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("span", _extends({
    ref: spanRef,
    className: "fade-parent"
  }, rest, {
    onMouseEnter: () => {
      setIsHovering(true);
    },
    onMouseLeave: () => {
      setIsHovering(false);
    }
  }), children), popupParentNode && /*#__PURE__*/react_dom.createPortal( /*#__PURE__*/react.createElement("div", {
    className: `fade-popup ${shouldShowPopup ? "hover" : ""}`,
    style: {
      left: pos.left - parentPos.left,
      top: pos.bottom - parentPos.top
    }
  }, popup), popupParentNode));
}

HoverFade.propTypes = {
  children: (prop_types_default()).node,
  popup: (prop_types_default()).node
};
/**
 * Display an email address wrapped in <...> braces.
 *
 * @param {*} { email }
 * @returnType {React.Node}
 */

function Email({
  email
}) {
  return `<${email.trim()}>`;
}

Email.propTypes = {
  email: (prop_types_default()).string.isRequired
};
function DetailedContactLabel({
  contact,
  className
}) {
  // This component conditionally renders.
  // In a detail view, there is a star at the start of the contact
  // info and a line break at the end.
  const star = contact.contactId && "\u2605 ";
  let emailLabel = contact.email && /*#__PURE__*/react.createElement("span", {
    className: "smallEmail"
  }, " ", /*#__PURE__*/react.createElement(Email, {
    email: contact.email
  }));
  return /*#__PURE__*/react.createElement(HoverFade, {
    popup: /*#__PURE__*/react.createElement(ContactDetail, {
      name: contact.name,
      email: contact.displayEmail,
      realEmail: contact.email,
      avatar: contact.avatar,
      contactId: contact.contactId
    }),
    style: {
      display: "inline-block"
    }
  }, /*#__PURE__*/react.createElement("span", {
    className: className
  }, /*#__PURE__*/react.createElement("span", {
    className: "contactName"
  }, star, contact.name.trim(), emailLabel)));
}
DetailedContactLabel.propTypes = {
  className: (prop_types_default()).string.isRequired,
  contact: (prop_types_default()).object.isRequired
};
function ContactLabel({
  contact,
  className
}) {
  // This component conditionally renders.
  let emailLabel = contact.displayEmail && /*#__PURE__*/react.createElement("span", {
    className: "smallEmail"
  }, " ", /*#__PURE__*/react.createElement(Email, {
    email: contact.displayEmail
  }));
  return /*#__PURE__*/react.createElement(HoverFade, {
    popup: /*#__PURE__*/react.createElement(ContactDetail, {
      name: contact.name,
      email: contact.displayEmail,
      realEmail: contact.email,
      avatar: contact.avatar,
      contactId: contact.contactId
    })
  }, /*#__PURE__*/react.createElement("span", {
    className: className
  }, /*#__PURE__*/react.createElement("span", {
    className: "contactName"
  }, contact.name.trim(), emailLabel)));
}
ContactLabel.propTypes = {
  className: (prop_types_default()).string.isRequired,
  contact: (prop_types_default()).object.isRequired
};

function Avatar({
  url,
  initials,
  isDefault,
  style
}) {
  if (!url) {
    return /*#__PURE__*/react.createElement("abbr", {
      className: "contactInitials",
      style: style
    }, initials);
  }

  return /*#__PURE__*/react.createElement("span", {
    className: "contactAvatar",
    style: {
      backgroundImage: `url('${url}')`
    }
  }, "\u00a0");
}

Avatar.propTypes = {
  url: (prop_types_default()).string,
  initials: (prop_types_default()).string,
  isDefault: (prop_types_default()).bool,
  style: (prop_types_default()).object
};
function MessageHeader({
  starred,
  expanded,
  from,
  msgUri,
  id,
  dispatch,
  bcc,
  cc,
  date,
  detailsShowing,
  fullDate,
  attachments,
  multipleRecipients,
  recipientsIncludeLists,
  inView,
  isDraft,
  shortFolderName,
  snippet,
  tags,
  to,
  specialTags
}) {
  function onClickHeader() {
    dispatch(reducer_messages/* messageActions.msgExpand */.od.msgExpand({
      expand: !expanded,
      msgUri
    }));

    if (!expanded) {
      dispatch(reducer_messages/* messageActions.markAsRead */.od.markAsRead({
        id
      }));
    }
  }

  function onClickStar(event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch(reducer_messages/* messageActions.setStarred */.od.setStarred({
      id,
      starred: !starred
    }));
  } // TODO: Maybe insert this after contacts but before snippet:
  // <span class="bzTo"> {{str "message.at"}} {{bugzillaUrl}}</span>


  let extraContacts = null;

  if (expanded && !detailsShowing) {
    const allTo = [...to, ...cc, ...bcc];
    const allToMap = new Map(allTo.map(contact => [contactToString(contact), contact]));
    const locale = thunderbird_compat/* browser.i18n.getUILanguage */.Xh.i18n.getUILanguage();
    extraContacts = /*#__PURE__*/react.createElement(react.Fragment, null, thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage("header.to"), " ", new Intl.ListFormat(locale, {
      style: "long",
      type: "conjunction"
    }).formatToParts(allToMap.keys()).map((item, i) => {
      if (item.type === "literal") {
        return /*#__PURE__*/react.createElement("span", {
          className: "to",
          key: i
        }, item.value);
      }

      const contact = allToMap.get(item.value);
      return /*#__PURE__*/react.createElement(ContactLabel, {
        className: "to",
        contact: contact,
        key: item.value
      });
    }), " ");
  }

  if (!expanded) {
    extraContacts = /*#__PURE__*/react.createElement(react.Fragment, null);
  }

  return /*#__PURE__*/react.createElement("div", {
    className: `messageHeader hbox ${expanded ? "expanded" : ""}`,
    onClick: onClickHeader
  }, /*#__PURE__*/react.createElement("div", {
    className: "shrink-box"
  }, /*#__PURE__*/react.createElement("div", {
    className: `star ${starred ? "starred" : ""}`,
    onClick: onClickStar
  }, /*#__PURE__*/react.createElement(SvgIcon, {
    hash: "star"
  })), /*#__PURE__*/react.createElement(Avatar, {
    url: from.avatar,
    style: from.colorStyle,
    initials: from.initials
  }), " ", /*#__PURE__*/react.createElement(ContactLabel, {
    className: "author",
    contact: from
  }), extraContacts, !expanded && /*#__PURE__*/react.createElement("span", {
    className: "snippet"
  }, /*#__PURE__*/react.createElement(MessageTags, {
    onTagsChange: tags => {
      dispatch(reducer_messages/* messageActions.setTags */.od.setTags({
        id,
        tags
      }));
    },
    expanded: false,
    tags: tags
  }), /*#__PURE__*/react.createElement(SpecialMessageTags, {
    onTagClick: (event, tag) => {
      dispatch(reducer_messages/* messageActions.tagClick */.od.tagClick({
        event,
        msgUri,
        details: tag.details
      }));
    },
    folderName: shortFolderName,
    inView: inView,
    specialTags: specialTags
  }), snippet)), /*#__PURE__*/react.createElement(MessageHeaderOptions, {
    dispatch: dispatch,
    date: date,
    detailsShowing: detailsShowing,
    expanded: expanded,
    fullDate: fullDate,
    id: id,
    attachments: attachments,
    multipleRecipients: multipleRecipients,
    recipientsIncludeLists: recipientsIncludeLists,
    isDraft: isDraft
  }));
}
MessageHeader.propTypes = {
  bcc: (prop_types_default()).array.isRequired,
  cc: (prop_types_default()).array.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  date: (prop_types_default()).string.isRequired,
  detailsShowing: (prop_types_default()).bool.isRequired,
  expanded: (prop_types_default()).bool.isRequired,
  from: (prop_types_default()).object.isRequired,
  fullDate: (prop_types_default()).string.isRequired,
  id: (prop_types_default()).number.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  attachments: (prop_types_default()).array.isRequired,
  multipleRecipients: (prop_types_default()).bool.isRequired,
  recipientsIncludeLists: (prop_types_default()).bool.isRequired,
  inView: (prop_types_default()).bool.isRequired,
  isDraft: (prop_types_default()).bool.isRequired,
  shortFolderName: (prop_types_default()).string.isRequired,
  snippet: (prop_types_default()).string.isRequired,
  starred: (prop_types_default()).bool.isRequired,
  tags: (prop_types_default()).array.isRequired,
  to: (prop_types_default()).array.isRequired,
  specialTags: (prop_types_default()).array
};
;// CONCATENATED MODULE: ./addon/content/components/message/messageDetails.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




function ContactList({
  label,
  contacts,
  className = ""
}) {
  if (contacts.length === 0) {
    return null;
  }

  return /*#__PURE__*/react.createElement("div", {
    className: className
  }, /*#__PURE__*/react.createElement("u", null, label), " ", contacts.map((contact, i) => /*#__PURE__*/react.createElement(react.Fragment, {
    key: i
  }, /*#__PURE__*/react.createElement(DetailedContactLabel, {
    className: "",
    contact: contact
  }), /*#__PURE__*/react.createElement("br", null))));
}

ContactList.propTypes = {
  label: (prop_types_default()).string.isRequired,
  contacts: (prop_types_default()).array.isRequired,
  className: (prop_types_default()).string
};
class MessageDetails extends react.PureComponent {
  render() {
    return /*#__PURE__*/react.createElement("div", null, !!this.props.from && /*#__PURE__*/react.createElement("div", {
      className: "detailsLine fromLine"
    }, /*#__PURE__*/react.createElement("u", null, browser.i18n.getMessage("message.fromHeader")), " ", /*#__PURE__*/react.createElement(DetailedContactLabel, {
      className: "",
      contact: this.props.from
    })), /*#__PURE__*/react.createElement(ContactList, {
      className: "detailsLine toLine",
      label: browser.i18n.getMessage("message.toHeader"),
      contacts: this.props.to
    }), /*#__PURE__*/react.createElement(ContactList, {
      className: "detailsLine ccLine",
      label: browser.i18n.getMessage("message.ccHeader"),
      contacts: this.props.cc
    }), /*#__PURE__*/react.createElement(ContactList, {
      className: "detailsLine bccLine",
      label: browser.i18n.getMessage("compose.fieldBcc"),
      contacts: this.props.bcc
    }), !!this.props.extraLines?.length && this.props.extraLines.map((line, i) => {
      return /*#__PURE__*/react.createElement("div", {
        className: "detailsLine",
        key: i
      }, /*#__PURE__*/react.createElement("u", null, line.key, ":"), " ", line.value);
    }));
  }

}
MessageDetails.propTypes = {
  bcc: (prop_types_default()).array.isRequired,
  cc: (prop_types_default()).array.isRequired,
  extraLines: (prop_types_default()).array,
  from: (prop_types_default()).object.isRequired,
  to: (prop_types_default()).array.isRequired
};
;// CONCATENATED MODULE: ./addon/content/components/message/messageFooter.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




class MessageFooter extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onActionButtonClick = this.onActionButtonClick.bind(this);
  }

  onActionButtonClick(msg) {
    const payload = {
      id: this.props.id,
      shiftKey: msg.shiftKey
    };
    let action = null;

    switch (msg.type) {
      case "draft":
        action = reducer_messages/* messageActions.editDraft */.od.editDraft(payload);
        break;

      case "reply":
        action = reducer_messages/* messageActions.reply */.od.reply(payload);
        break;

      case "replyAll":
        action = reducer_messages/* messageActions.replyAll */.od.replyAll(payload);
        break;

      case "replyList":
        action = reducer_messages/* messageActions.replyList */.od.replyList(payload);
        break;

      case "forward":
        action = reducer_messages/* messageActions.forward */.od.forward(payload);
        break;

      default:
        console.error("Don't know how to create an action for", msg);
    }

    this.props.dispatch(action);
  }

  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: "messageFooter"
    }, /*#__PURE__*/react.createElement("div", {
      className: "footerActions"
    }, this.props.isDraft && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "draft"
    }), !this.props.isDraft && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "reply"
    }), !this.props.isDraft && this.props.multipleRecipients && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "replyAll"
    }), !this.props.isDraft && this.props.recipientsIncludeLists && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "replyList"
    }), !this.props.isDraft && /*#__PURE__*/react.createElement(ActionButton, {
      callback: this.onActionButtonClick,
      type: "forward"
    })));
  }

}
MessageFooter.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  id: (prop_types_default()).number.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  multipleRecipients: (prop_types_default()).bool.isRequired,
  recipientsIncludeLists: (prop_types_default()).bool.isRequired,
  isDraft: (prop_types_default()).bool.isRequired
};
;// CONCATENATED MODULE: ./addon/content/utils/quoting.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* Below are hacks heuristics for finding quoted parts in a given email */
class _Quoting {
  _canInclude(aNode) {
    let v = aNode.tagName?.toLowerCase() == "br" || aNode.nodeType == aNode.TEXT_NODE && aNode.textContent.trim() === ""; // if (v) dump("Including "+aNode+"\n");

    return v;
  }

  _isBody(aNode) {
    if (aNode.tagName?.toLowerCase() == "body") {
      return true;
    }

    let count = 0;

    for (let node of aNode.parentNode.childNodes) {
      // dump(node+" "+node.nodeType+"\n");
      switch (node.nodeType) {
        case node.TEXT_NODE:
          if (node.textContent.trim().length) {
            count++;
          }

          break;

        case node.ELEMENT_NODE:
          count++;
          break;
      }
    } // dump(count+"\n");


    return count == 1 && this._isBody(aNode.parentNode);
  }

  _implies(a, b) {
    return !a || a && b;
  }
  /* Create a blockquote that encloses everything relevant, starting from marker.
   * Marker is included by default, remove it later if you need to. */


  _encloseInBlockquote(aDoc, marker) {
    if (marker.previousSibling && this._canInclude(marker.previousSibling)) {
      this._encloseInBlockquote(aDoc, marker.previousSibling);
    } else if (!marker.previousSibling && !this._isBody(marker.parentNode)) {
      this._encloseInBlockquote(aDoc, marker.parentNode);
    } else if (this._implies(marker == marker.parentNode.firstChild, !this._isBody(marker.parentNode))) {
      let blockquote = aDoc.createElement("blockquote");
      blockquote.setAttribute("type", "cite");
      marker.parentNode.insertBefore(blockquote, marker);

      while (blockquote.nextSibling) {
        blockquote.appendChild(blockquote.nextSibling);
      }
    }
  }

  _trySel(aDoc, sel, remove) {
    let marker = aDoc.querySelector(sel);

    if (marker) {
      this._encloseInBlockquote(aDoc, marker);

      if (remove) {
        marker.remove();
      }
    }

    return marker != null;
  }
  /* Hotmails use a <hr> to mark the start of the quoted part. */


  convertHotmailQuotingToBlockquote1(aDoc) {
    /* We make the assumption that no one uses a <hr> in their emails except for
     * separating a quoted message from the rest */
    this._trySel(aDoc, "body > hr, \
       body > div > hr, \
       body > pre > hr, \
       body > div > div > hr, \
       hr#stopSpelling", true);
  }

  convertMiscQuotingToBlockquote(aDoc) {
    this._trySel(aDoc, ".yahoo_quoted");
  }
  /* Stupid regexp that matches:
   * ----- Something that supposedly says the text below is quoted -----
   * Fails 9 times out of 10. */


  convertForwardedToBlockquote(aDoc) {
    const re = /^\s*(-{5,15})(?:\s*)(?:[^ \f\n\r\t\v\u00A0\u2028\u2029-]+\s+)*[^ \f\n\r\t\v\u00A0\u2028\u2029-]+(\s*)\1\s*/gm;

    const walk = aNode => {
      for (const child of aNode.childNodes) {
        const txt = child.textContent;
        const m = txt.match(re);

        if (child.nodeType == child.TEXT_NODE && !txt.includes("-----BEGIN PGP") && !txt.includes("----END PGP") && m && m.length) {
          const marker = m[0]; // dump("Found matching text "+marker+"\n");

          const i = txt.indexOf(marker);
          const t1 = txt.substring(0, i);
          const t2 = txt.substring(i + 1, child.textContent.length);
          const tn1 = aDoc.createTextNode(t1);
          const tn2 = aDoc.createTextNode(t2);
          child.parentNode.insertBefore(tn1, child);
          child.parentNode.insertBefore(tn2, child);
          child.remove();

          this._encloseInBlockquote(aDoc, tn2);

          let ex = new Error();
          ex.found = true;
          throw ex;
        } else if (m?.length) {
          // We only move on if we found the matching text in the parent's text
          // content, otherwise, there's no chance we'll find it in the child's
          // content.
          walk(child);
        }
      }
    };

    try {
      walk(aDoc.body);
    } catch (ex) {
      if (!ex.found) {
        throw ex;
      }
    }
  }
  /* If [b1] is a blockquote followed by [ns] whitespace nodes followed by [b2],
   * append [ns] to [b1], then append all the child nodes of [b2] to [b1],
   * effectively merging the two blockquotes together. */


  fusionBlockquotes(aDoc) {
    let blockquotes = new Set(aDoc.getElementsByTagName("blockquote"));

    for (let blockquote of blockquotes) {
      let isWhitespace = function (n) {
        return n && (n.tagName?.toLowerCase() == "br" || n.nodeType == n.TEXT_NODE && n.textContent.match(/^\s*$/));
      };

      let isBlockquote = function (b) {
        return b?.tagName?.toLowerCase() == "blockquote";
      };

      let blockquoteFollows = function (n) {
        return n && (isBlockquote(n) || isWhitespace(n) && blockquoteFollows(n.nextSibling));
      };

      while (blockquoteFollows(blockquote.nextSibling)) {
        while (isWhitespace(blockquote.nextSibling)) {
          blockquote.appendChild(blockquote.nextSibling);
        }

        if (isBlockquote(blockquote.nextSibling)) {
          let next = blockquote.nextSibling;

          while (next.firstChild) {
            blockquote.appendChild(next.firstChild);
          }

          blockquote.parentNode.removeChild(next);
          blockquotes.delete(next);
        } else {
          console.warn("What?!");
        }
      }
    }
  }
  /**
   * Use heuristics to find common types of email quotes and
   * wrap them in `<blockquote></blockquote>` tags.
   *
   * @param {HTMLDocument | string} doc
   * @returns {HTMLDocument | string}
   * @memberof _Quoting
   */


  normalizeBlockquotes(doc) {
    // We want to return the same type of object that was passed to us. We allow
    // both a string and an HTMLDom object.
    const origType = typeof doc;

    if (origType === "string") {
      const parser = new DOMParser();
      doc = parser.parseFromString(doc, "text/html");
    }

    try {
      // These operations mutate the Dom
      this.convertHotmailQuotingToBlockquote1(doc);
      this.convertForwardedToBlockquote(doc);
      this.convertMiscQuotingToBlockquote(doc);
      this.fusionBlockquotes(doc);
    } catch (e) {
      console.log(e);
    }

    if (origType === "string") {
      return doc.outerHTML;
    }

    return doc;
  }

}

var Quoting = new _Quoting();
;// CONCATENATED MODULE: ./addon/content/components/message/messageIFrame.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */






let index = 0; // From https://searchfox.org/mozilla-central/rev/ec806131cb7bcd1c26c254d25cd5ab8a61b2aeb6/parser/nsCharsetSource.h
// const kCharsetFromChannel = 11;

const kCharsetFromUserForced = 13;
const domParser = new DOMParser();
const TOGGLE_TEMPLATE = `<button
    class="link"
    style="cursor: pointer; user-select: none; background-color: inherit; border: inherit;"
    show-text=""
    hide-text=""
  >
    SHOW/HIDE
  </button>`;
/**
 * Create a DOM node that, when clicked, will hide or unhide `node`.
 * The returned DOM node is automatically attached to the DOM right before `node`.
 *
 * @param {*} node
 * @param {*} {
 *     showText,
 *     hideText,
 *     linkClass = "",
 *     smallSize = 11,
 *     linkColor = "orange",
 *     startHidden = true,
 *     onToggle = () => {},
 *   }
 * @returns
 */

function createToggleForNode(node, {
  showText,
  hideText,
  linkClass = "",
  smallSize = 11,
  linkColor = "orange",
  startHidden = true,
  onToggle = () => {}
}) {
  const toggle = domParser.parseFromString(TOGGLE_TEMPLATE, "text/html").body.childNodes[0];
  toggle.setAttribute("show-text", showText);
  toggle.setAttribute("hide-text", hideText);
  toggle.style.color = linkColor;
  toggle.style.fontSize = smallSize;
  toggle.classList.add(...linkClass.split(/\s/));

  function show() {
    toggle.textContent = `- ${toggle.getAttribute("hide-text")} -`;
    toggle.setAttribute("state", "visible");
    node.style.display = ""; // The callback may want to do something with the size of the revealed node, so call the callback after it's visible

    onToggle(true, node);
  }

  function hide() {
    toggle.textContent = `- ${toggle.getAttribute("show-text")} -`;
    toggle.setAttribute("state", "hidden"); // The callback may want to do something with the size of the revealed node, so call the callback before it's hidden

    onToggle(false, node);
    node.style.display = "none";
  }

  toggle.addEventListener("click", event => {
    if (toggle.getAttribute("state") === "visible") {
      hide();
    } else {
      show();
    }
  }, true);

  if (startHidden) {
    hide();
  } else {
    show();
  }

  node.insertAdjacentElement("beforebegin", toggle);
  return toggle;
}
/**
 * Generate a callback for the `onToggle` function of a toggle element.
 * The callback will automatically resize the supplied iframe to grow or
 * shrink depending on whether the toggle is in the open state or closed state.
 *
 * @param {*} iframe
 * @returns
 */


function toggleCallbackFactory(iframe) {
  return (visible, node) => {
    const cs = iframe.contentWindow.getComputedStyle(node);
    const h = node.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);

    if (visible) {
      iframe.style.height = parseFloat(iframe.style.height) + h + "px";
    } else {
      iframe.style.height = parseFloat(iframe.style.height) - h + "px";
    }
  };
}
/**
 * Sleep for the specified number of milliseconds
 *
 * @param {Number} ms - milliseconds to sleep
 * @returns
 */


async function sleep(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}
/**
 * Runs `func()` asynchronously until `validator(func())` is truthy.
 * Sets progressively longer timeouts between calls to `func()` until
 * eventually erroring.
 *
 * @param {Function} func
 * @param {Function} validator
 * @returns
 */


async function runUntilValid(func, validator) {
  const ret = func();

  if (validator(ret)) {
    return ret;
  }

  const TIMEOUTS = [0, 0, 10, 10, 10];

  for (const timeout of TIMEOUTS) {
    await sleep(timeout);
    const ret = func();

    if (validator(ret)) {
      return ret;
    }
  }

  throw new Error(`Waited for intervals of ${TIMEOUTS} milliseconds, but validator never passed`);
}
/**
 * This class exists because we need to manually manage the iframe - we don't
 * want it reloading every time a prop changes.
 *
 * We only load the iframe when we need to - when it is expanded. If it is
 * collapsed, we avoid it. This helps performance.
 *
 * The height mechanism is awkward - we generally set the height short when
 * we start to render it, then expand it to the correct height once loaded,
 * which attempts to avoid a sub-scroll.
 */


class MessageIFrame extends react.Component {
  constructor(props) {
    super(props);
    this.index = index++;
    this.currentUrl = null;
    this.loading = false;
    this.onClickIframe = this.onClickIframe.bind(this);
    this._waitingForDom = false;
  }

  componentDidUpdate(prevProps) {
    let startLoad = false; // dueToExpansion is used so that we can indicate if this load is happening
    // as a result of an expansion or not. If it is a user expansion, we don't
    // want to scroll the message to view, since the user may be viewing somewhere
    // else.

    this.dueToExpansion = undefined;

    if (prevProps.neckoUrl != this.props.neckoUrl && this.props.expanded) {
      // This is a hack which ensures that the iframe is a minimal height, so
      // that when the message loads, the scroll height is set correctly, rather
      // than to the potential height of the previously loaded message.
      // TODO: Could we use a client height somewhere along the line?
      this.iframe.classList.remove("hidden");
      this.iframe.style.height = "20px";
      startLoad = true;
      this.dueToExpansion = false;
    }

    if (this.props.expanded) {
      this.iframe.classList.remove("hidden");

      if (this.currentUrl != this.props.msgUri || prevProps.hasRemoteContent && !this.props.hasRemoteContent || !prevProps.smimeReload && this.props.smimeReload) {
        startLoad = true;

        if (this.dueToExpansion === undefined) {
          this.dueToExpansion = true;
        }

        this.iframe.style.height = "20px";
      }
    } else {
      // Never start a load if we're going to be hidden.
      startLoad = false; // If we're changing URL, then also force the iframe to be about:blank.
      // This ensures that if the message is subsequently expanded, the proper
      // notifications are sent.

      if (prevProps.neckoUrl != this.props.neckoUrl) {
        this.iframe.src = "about:blank";
        this.currentUrl = "about:blank";
      }

      this.iframe.classList.add("hidden");
    }

    if (startLoad && thunderbird_compat/* isWebextension */.sE) {
      const docShell = this.iframe.contentWindow.docShell;
      docShell.appType = Ci.nsIDocShell.APP_TYPE_MAIL;
      docShell.charset = "UTF-8";
      const cv = docShell.contentViewer; // Not needed after Gecko 90.

      if ("hintCharacterSet" in cv) {
        cv.hintCharacterSet = "UTF-8"; // This used to be kCharsetFromChannel = 11, however in 79/80 the code changed.
        // This still needs to be forced, because bug 829543 isn't fixed yet.

        cv.hintCharacterSetSource = kCharsetFromUserForced;
      }

      this.loading = true;
      this.currentUrl = this.props.msgUri;
      this.props.dispatch(reducer_summary/* summaryActions.msgStreamMsg */.vX.msgStreamMsg({
        docshell: this.iframe.contentWindow.docShell,
        dueToExpansion: this.dueToExpansion,
        msgUri: this.props.msgUri
      }));
    }
  }

  componentDidMount() {
    if (!thunderbird_compat/* isWebextension */.sE) {
      // If we are running in a test environment or in the browser, we cannot
      // create iframes in the XUL namespace.
      this.iframe = this.div.ownerDocument.createElement("iframe");
      return;
    } // TODO: Currently this must be an iframe created in the xul namespace,
    // otherwise remote content blocking doesn't work. Figure out why the normal
    // iframe has a originator location of `chrome://messenger/content/messenger.xul`
    // rather than imap://.... (or whatever).


    this.iframe = this.div.ownerDocument.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "iframe");
    this.iframe.setAttribute("style", "height: 20px; overflow-y: hidden");
    this.iframe.setAttribute("type", "content");
    this.iframe.addEventListener("click", this.onClickIframe);
    this.div.appendChild(this.iframe);
    const docShell = this.iframe.contentWindow.docShell;
    docShell.appType = Ci.nsIDocShell.APP_TYPE_MAIL;
    docShell.charset = "UTF-8";
    const cv = docShell.contentViewer; // Not needed after Gecko 90.

    if ("hintCharacterSet" in cv) {
      cv.hintCharacterSet = "UTF-8"; // This used to be kCharsetFromChannel = 11, however in 79/80 the code changed.
      // This still needs to be forced, because bug 829543 isn't fixed yet.

      cv.hintCharacterSetSource = kCharsetFromUserForced;
    }

    this.registerListeners();

    if (this.props.expanded) {
      this.currentUrl = this.props.msgUri;
      this.loading = true;
      this.dueToExpansion = false;
      this.props.dispatch(reducer_summary/* summaryActions.msgStreamMsg */.vX.msgStreamMsg({
        docshell: docShell,
        msgUri: this.props.msgUri
      }));
    } else {
      this.iframe.classList.add("hidden");
    }
  }

  componentWillUnmount() {
    if (this.loading) {
      this.props.dispatch(reducer_summary/* summaryActions.msgStreamLoadFinished */.vX.msgStreamLoadFinished({
        dueToExpansion: this.dueToExpansion
      }));
      this.loading = false;
    }

    if (!this._loadListener) {
      return;
    }

    this.iframe.removeEventListener("load", this._loadListener, {
      capture: true
    });
    delete this._loadListener;
    this.iframe.removeEventListener("DOMContentLoaded", this._domloadListener, {
      capture: true
    });
    delete this._domloadListener;
  }

  registerListeners() {
    if (!this._loadListener) {
      this._loadListener = this._onLoad.bind(this);
      this.iframe.addEventListener("load", this._loadListener, {
        capture: true
      });
      this._domloadListener = this._onDOMLoaded.bind(this);
      this.iframe.addEventListener("DOMContentLoaded", this._domloadListener, {
        capture: true
      });
    }
  }

  async adjustHeight() {
    const doAdjustment = () => {
      const iframeDoc = this.iframe.contentDocument; // The +1 here is due to having occasionally seen issues on Mac where
      // the frame just doesn't quite scroll properly. In this case,
      // getComputedStyle(body).height is .2px greater than the scrollHeight.
      // Hence we try to work around that here.
      // In #1517 made it +3 as occasional issues were still being seen with
      // some messages.

      const scrollHeight = iframeDoc.body.scrollHeight + 3;
      this.iframe.style.height = scrollHeight + "px"; // So now we might overflow horizontally, which causes a horizontal
      // scrollbar to appear, which narrows the vertical height available,
      // which causes a vertical scrollbar to appear.

      let iframeStyle = window.getComputedStyle(this.iframe);
      let iframeExternalWidth = parseInt(iframeStyle.width); // 20px is a completely arbitrary default value which I hope is
      // greater

      if (iframeDoc.body.scrollWidth > iframeExternalWidth) {
        this.iframe.style.height = iframeDoc.body.scrollHeight + 20 + "px";
      }
    };

    try {
      // When blockquotes are detected, an async function is run to compute
      // their height. We need to wait for this function to finish before we
      // adjust the height of the whole iframe. This is accomplished by waiting
      // for `this._waitingForDom` to be set to `false`.
      await runUntilValid(() => {}, () => !this._waitingForDom);
      doAdjustment();
    } catch (e) {
      console.warn("Possible race condition; timed out while trying to adjust iframe height", e);
      doAdjustment();
    }
  }

  _onLoad(event) {
    if (event.target.documentURI == "about:blank") {
      return;
    } // TODO: Handle BIDI


    this.adjustHeight();
    this.loading = false;
    this.props.dispatch(reducer_summary/* summaryActions.msgStreamLoadFinished */.vX.msgStreamLoadFinished({
      dueToExpansion: this.dueToExpansion,
      msgUri: this.props.msgUri,
      iframe: this.iframe
    }));
  }

  tweakFonts(iframeDoc) {
    if (!this.props.prefs.tweakBodies) {
      return [];
    }

    let textSize = Math.round(this.props.defaultFontSize * this.props.tenPxFactor * 1.2); // Assuming 16px is the default (like on, say, Linux), this gives
    //  18px and 12px, which is what Andy had in mind.
    // We're applying the style at the beginning of the <head> tag and
    //  on the body element so that it can be easily overridden by the
    //  html.
    // This is for HTML messages only.

    let styleRules = [];

    if (iframeDoc.querySelectorAll(":not(.mimemail-body) > .moz-text-html").length) {
      styleRules = ["body, table {", // "  line-height: 112.5%;",
      "  font-size: " + textSize + "px;", "}"];
    } // Do some reformatting + deal with people who have bad taste. All these
    // rules are important: some people just send messages with horrible colors,
    // which ruins the conversation view. Gecko tends to automatically add
    // padding/margin to html mails. We still want to honor these prefs but
    // usually they just black/white so this is pretty much what we want.


    let fg = this.props.browserForegroundColor;
    let bg = this.props.browserBackgroundColor;
    styleRules = styleRules.concat(["body {", "  margin: 0; padding: 0;", "  color: " + fg + "; background-color: " + bg + ";", "}"]);
    return styleRules;
  }

  async detectQuotes(iframe) {
    // Launch various crappy pieces of code heuristics to
    // convert most common quoting styles to real blockquotes. Spoiler:
    // most of them suck.
    Quoting.normalizeBlockquotes(iframe.contentDocument);

    const getQuoteLength = async node => {
      function heightFromStyle(style) {
        return parseInt(style.height) / (parseInt(style.fontSize) * 1.5);
      }

      try {
        const style = iframe.contentWindow.getComputedStyle(node); // If the computed height returned by `getQuoteLength` is NaN,
        // that means the DOM hasn't had a chance to render it, and so it's
        // size cannot be computed. In this case, we set a timeout to let
        // the DOM render before we measure the height

        this._waitingForDom = true;
        const height = await runUntilValid(() => heightFromStyle(style), val => val && !Number.isNaN(val));
        this._waitingForDom = false;
        return height;
      } catch (e) {// message arrived and window is not displayed, arg,
        // cannot get the computed style, BAD
      }

      return undefined;
    }; // If the first email contains quoted text, it was probably forwarded to us
    // and we don't have the previous email for reference. In this case, don't normalize
    // the quote. See:
    // https://github.com/thunderbird-conversations/thunderbird-conversations/issues/179


    if (this.props.initialPosition > 0) {
      const win = iframe.contentWindow; // We look for the first blockquote that is long enough to be hidden

      for (const blockquote of win.document.querySelectorAll("blockquote")) {
        const quoteLength = await getQuoteLength(blockquote);

        if (quoteLength > this.props.prefs.hideQuoteLength) {
          createToggleForNode(blockquote, {
            hideText: browser.i18n.getMessage("messageBody.hideQuotedText"),
            showText: browser.i18n.getMessage("messageBody.showQuotedText"),
            linkClass: "showhidequote",
            smallSize: this.props.prefs.tweakChrome ? this.props.defaultFontSize * this.props.tenPxFactor * 1.1 : Math.round(100 * this.props.defaultFontSize * 11 / 12) / 100,
            linkColor: "orange",
            onToggle: toggleCallbackFactory(iframe)
          }); // We only put a show/hide button on the first suitable quote,
          // so if we've made it thus far, we're done.

          break;
        }
      }
    }
  }

  detectSigs(iframe) {
    if (!this.props.prefs.hideSigs) {
      return;
    }

    const win = iframe.contentWindow;
    const sigNode = win.document.querySelector(".moz-txt-sig");

    if (sigNode) {
      createToggleForNode(sigNode, {
        hideText: browser.i18n.getMessage("messageBody.hideSigText"),
        showText: browser.i18n.getMessage("messageBody.showSigText"),
        linkClass: "showhidesig",
        smallSize: this.props.prefs.tweakChrome ? this.props.defaultFontSize * this.props.tenPxFactor * 1.1 : Math.round(100 * this.props.defaultFontSize * 11 / 12) / 100,
        linkColor: "rgb(56, 117, 215)",
        onToggle: toggleCallbackFactory(iframe)
      });
    }
  }

  injectCss(iframeDoc) {
    // !important because messageContents.css is appended after us when the html
    // is rendered
    return ['blockquote[type="cite"] {', "  border-right-width: 0px;", "  border-left: 1px #ccc solid;", "  color: #666 !important;", "}", "span.moz-txt-formfeed {", "  height: auto;", "}"];
  }

  async _onDOMLoaded(event) {
    if (event.target.documentURI == "about:blank") {
      return;
    }

    const iframeDoc = this.iframe.contentDocument;
    let styleRules = this.tweakFonts(iframeDoc);

    if (!(this.props.realFrom && this.props.realFrom.includes("bugzilla-daemon"))) {
      await this.detectQuotes(this.iframe);
    }

    this.detectSigs(this.iframe);
    styleRules = styleRules.concat(this.injectCss(iframeDoc)); // Ugly hack (once again) to get the style inside the
    // <iframe>. I don't think we can use a chrome:// url for
    // the stylesheet because the iframe has a type="content"

    let style = iframeDoc.createElement("style");
    style.appendChild(iframeDoc.createTextNode(styleRules.join("\n")));
    let head = iframeDoc.body.previousElementSibling;
    head.appendChild(style);
    this.adjustHeight();
  }

  onClickIframe(event) {
    this.props.dispatch(reducer_messages/* messageActions.clickIframe */.od.clickIframe({
      event
    }));
  }

  render() {
    // TODO: See comment in componentDidMount
    // <iframe className={`iframe${this.index}`} type="content" ref={f => this.iframe = f}/>
    return /*#__PURE__*/react.createElement("div", {
      className: `iframewrap${this.index}`,
      ref: d => this.div = d
    });
  }

}
MessageIFrame.propTypes = {
  browserBackgroundColor: (prop_types_default()).string.isRequired,
  browserForegroundColor: (prop_types_default()).string.isRequired,
  defaultFontSize: (prop_types_default()).number.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  expanded: (prop_types_default()).bool.isRequired,
  hasRemoteContent: (prop_types_default()).bool.isRequired,
  initialPosition: (prop_types_default()).number.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  neckoUrl: (prop_types_default()).string.isRequired,
  smimeReload: (prop_types_default()).bool.isRequired,
  tenPxFactor: (prop_types_default()).number.isRequired,
  prefs: (prop_types_default()).object.isRequired,
  realFrom: (prop_types_default()).string.isRequired
};
;// CONCATENATED MODULE: ./addon/content/components/message/messageNotification.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





class RemoteContentNotification extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onAlwaysShowRemote = this.onAlwaysShowRemote.bind(this);
    this.onShowRemote = this.onShowRemote.bind(this);
  }

  onShowRemote() {
    this.props.dispatch(reducer_messages/* messageActions.showRemoteContent */.od.showRemoteContent({
      id: this.props.id
    }));
  }

  onAlwaysShowRemote() {
    this.props.dispatch(reducer_messages/* messageActions.alwaysShowRemoteContent */.od.alwaysShowRemoteContent({
      id: this.props.id,
      realFrom: this.props.realFrom
    }));
  }

  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: "remoteContent notificationBar"
    }, browser.i18n.getMessage("notification.remoteContentBlockedMsg") + " ", /*#__PURE__*/react.createElement("span", {
      className: "show-remote-content"
    }, /*#__PURE__*/react.createElement("a", {
      className: "link",
      onClick: this.onShowRemote
    }, browser.i18n.getMessage("notification.showRemote")), " - "), /*#__PURE__*/react.createElement("span", {
      className: "always-display"
    }, /*#__PURE__*/react.createElement("a", {
      className: "link",
      onClick: this.onAlwaysShowRemote
    }, browser.i18n.getMessage("notification.alwaysShowRemote", [this.props.realFrom]))));
  }

}

RemoteContentNotification.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  id: (prop_types_default()).number.isRequired,
  realFrom: (prop_types_default()).string.isRequired
};

class GenericSingleButtonNotification extends react.PureComponent {
  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: this.props.barClassName + " notificationBar"
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: this.props.iconName
    }), this.props.notificationText, " ", /*#__PURE__*/react.createElement("span", {
      className: this.props.buttonClassName
    }, /*#__PURE__*/react.createElement("a", {
      onClick: this.props.onButtonClick
    }, this.props.buttonTitle)));
  }

}

GenericSingleButtonNotification.propTypes = {
  barClassName: (prop_types_default()).string.isRequired,
  buttonClassName: (prop_types_default()).string.isRequired,
  hideIcon: (prop_types_default()).bool,
  onButtonClick: (prop_types_default()).func.isRequired,
  buttonTitle: (prop_types_default()).string.isRequired,
  iconName: (prop_types_default()).string.isRequired,
  notificationText: (prop_types_default()).string.isRequired
};

class GenericMultiButtonNotification extends react.PureComponent {
  constructor(props) {
    super(props);
  }

  onClick(actionParams) {
    this.props.dispatch(reducer_messages/* messageActions.notificationClick */.od.notificationClick({
      msgUri: this.props.msgUri,
      notificationType: this.props.type,
      ...actionParams
    }));
  }

  render() {
    return /*#__PURE__*/react.createElement("div", {
      className: this.props.barClassName + " notificationBar"
    }, /*#__PURE__*/react.createElement(SvgIcon, {
      hash: this.props.iconName
    }), this.props.notificationText, " ", this.props.buttons.map((button, i) => /*#__PURE__*/react.createElement("button", {
      className: button.classNames,
      tooltiptext: button.tooltiptext,
      key: i,
      onClick: this.onClick.bind(this, button.actionParams)
    }, button.textContent)));
  }

}

GenericMultiButtonNotification.propTypes = {
  barClassName: (prop_types_default()).string.isRequired,
  buttons: (prop_types_default()).object.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  hideIcon: (prop_types_default()).bool,
  iconName: (prop_types_default()).string.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  notificationText: (prop_types_default()).string.isRequired,
  type: (prop_types_default()).string.isRequired
};

class JunkNotification extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.props.dispatch(reducer_messages/* messageActions.markAsJunk */.od.markAsJunk({
      isJunk: false,
      id: this.props.id
    }));
  }

  render() {
    return /*#__PURE__*/react.createElement(GenericSingleButtonNotification, {
      barClassName: "junkBar",
      buttonClassName: "notJunk",
      buttonTitle: browser.i18n.getMessage("notification.notJunk"),
      iconName: "whatshot",
      notificationText: browser.i18n.getMessage("notification.junkMsg"),
      onButtonClick: this.onClick
    });
  }

}

JunkNotification.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  id: (prop_types_default()).number.isRequired
};

class OutboxNotification extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.props.dispatch(reducer_messages/* messageActions.sendUnsent */.od.sendUnsent());
  }

  render() {
    return /*#__PURE__*/react.createElement(GenericSingleButtonNotification, {
      barClassName: "outboxBar",
      buttonClassName: "sendUnsent",
      buttonTitle: browser.i18n.getMessage("notification.sendUnsent"),
      iconName: "inbox",
      notificationText: browser.i18n.getMessage("notification.isOutboxMsg"),
      onButtonClick: this.onClick
    });
  }

}

OutboxNotification.propTypes = {
  dispatch: (prop_types_default()).func.isRequired
};

class PhishingNotification extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.props.dispatch(reducer_messages/* messageActions.ignorePhishing */.od.ignorePhishing({
      id: this.props.id
    }));
  }

  render() {
    return /*#__PURE__*/react.createElement(GenericSingleButtonNotification, {
      barClassName: "phishingBar",
      buttonClassName: "ignore-warning",
      buttonTitle: browser.i18n.getMessage("notification.ignoreScamWarning"),
      iconName: "warning",
      notificationText: browser.i18n.getMessage("notification.scamMsg"),
      onButtonClick: this.onClick
    });
  }

}

PhishingNotification.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  id: (prop_types_default()).number.isRequired
};
class MessageNotification extends react.PureComponent {
  render() {
    if (this.props.isPhishing) {
      return /*#__PURE__*/react.createElement(PhishingNotification, {
        dispatch: this.props.dispatch,
        id: this.props.id
      });
    }

    if (this.props.hasRemoteContent) {
      return /*#__PURE__*/react.createElement(RemoteContentNotification, {
        dispatch: this.props.dispatch,
        id: this.props.id,
        realFrom: this.props.realFrom
      });
    }

    if (this.props.canUnJunk) {
      return /*#__PURE__*/react.createElement(JunkNotification, {
        dispatch: this.props.dispatch,
        id: this.props.id
      });
    }

    if (this.props.isOutbox) {
      return /*#__PURE__*/react.createElement(OutboxNotification, {
        dispatch: this.props.dispatch
      });
    }

    if (this.props.extraNotifications && this.props.extraNotifications.length) {
      // Only display the first notification.
      const notification = this.props.extraNotifications[0];
      return /*#__PURE__*/react.createElement(GenericMultiButtonNotification, {
        barClassName: notification.type + "Bar",
        buttons: notification.buttons || [],
        iconName: notification.iconName,
        dispatch: this.props.dispatch,
        msgUri: this.props.msgUri,
        notificationText: notification.label,
        type: notification.type
      });
    }

    return null;
  }

}
MessageNotification.propTypes = {
  canUnJunk: (prop_types_default()).bool.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  extraNotifications: (prop_types_default()).array,
  hasRemoteContent: (prop_types_default()).bool.isRequired,
  isPhishing: (prop_types_default()).bool.isRequired,
  isOutbox: (prop_types_default()).bool.isRequired,
  id: (prop_types_default()).number.isRequired,
  msgUri: (prop_types_default()).string.isRequired,
  realFrom: (prop_types_default()).string.isRequired
};
// EXTERNAL MODULE: ./addon/content/reducer/reducer-compose.js
var reducer_compose = __webpack_require__(4978);
;// CONCATENATED MODULE: ./addon/content/components/compose/composeFields.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



const TextBox = /*#__PURE__*/react.forwardRef(({
  disabled = false,
  title,
  value = "",
  name,
  onChange = () => {}
}, ref) => {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("label", null, thunderbird_compat/* browser.i18n.getMessage */.Xh.i18n.getMessage(title))), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("input", {
    type: "text",
    ref: ref,
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    },
    disabled: disabled
  })));
});
TextBox.displayName = "TextBox";
TextBox.propTypes = {
  disabled: (prop_types_default()).bool,
  title: (prop_types_default()).string.isRequired,
  value: (prop_types_default()).string,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
const TextArea = /*#__PURE__*/react.forwardRef(({
  value = "",
  name,
  onChange = () => {}
}, ref) => {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("textarea", {
    ref: ref,
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    }
  })));
});
TextArea.displayName = "TextArea";
TextArea.propTypes = {
  value: (prop_types_default()).string,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
;// CONCATENATED MODULE: ./addon/content/components/compose/composeWidget.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




function ComposeWidget() {
  const dispatch = es/* useDispatch */.I0();
  const {
    composeState
  } = es/* useSelector */.v9(state => ({
    composeState: state.compose
  }));
  const bodyInput = /*#__PURE__*/react.createRef();
  const subjectInput = /*#__PURE__*/react.createRef();
  react.useEffect(() => {
    if (composeState.subject) {
      bodyInput.current.focus();
    } else {
      subjectInput.current.focus();
    }
  }, []);

  function onSend() {
    dispatch(reducer_compose/* composeActions.sendMessage */.rx.sendMessage());
  }

  function setValue(name, value) {
    dispatch(reducer_compose/* composeActions.setValue */.rx.setValue(name, value));
  } // Warn about unloading


  function checkBeforeUnload(event) {
    if (composeState.modified) {
      event.preventDefault();
    }
  }

  react.useEffect(() => {
    window.addEventListener("beforeunload", checkBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", checkBeforeUnload);
    };
  });
  return /*#__PURE__*/react.createElement("div", {
    className: "compose"
  }, /*#__PURE__*/react.createElement(TextBox, {
    name: "from",
    title: "message.fromHeader",
    disabled: true,
    value: composeState.from,
    sending: composeState.sending,
    onChange: setValue
  }), /*#__PURE__*/react.createElement(TextBox, {
    name: "to",
    title: "message.toHeader",
    value: composeState.to,
    sending: composeState.sending,
    onChange: setValue
  }), /*#__PURE__*/react.createElement(TextBox, {
    name: "subject",
    ref: subjectInput,
    title: "compose.fieldSubject",
    value: composeState.subject,
    sending: composeState.sending,
    onChange: setValue
  }), /*#__PURE__*/react.createElement(TextArea, {
    name: "body",
    ref: bodyInput,
    value: composeState.body,
    sending: composeState.sending,
    onChange: setValue
  }), /*#__PURE__*/react.createElement("div", null), /*#__PURE__*/react.createElement("div", {
    id: "sendStatus"
  }, composeState.sendingMsg), /*#__PURE__*/react.createElement("button", {
    id: "send",
    onClick: onSend,
    disabled: composeState.sending || !composeState.to || !composeState.subject
  }, browser.i18n.getMessage("compose.send")));
}
// EXTERNAL MODULE: ./addon/content/reducer/reducer-quickReply.js
var reducer_quickReply = __webpack_require__(5101);
;// CONCATENATED MODULE: ./addon/content/components/quickreply/quickReply.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





function QuickReply({
  id
}) {
  // Not ready to enable yet.
  if (true) {
    return /*#__PURE__*/react.createElement("div", {
      className: "quickReply disabled",
      dir: "ltr"
    }, /*#__PURE__*/react.createElement("small", null, /*#__PURE__*/react.createElement("i", null, "Quick Reply is temporarily disabled due to needing rewriting for Thunderbird 78+.")));
  }

  const dispatch = es/* useDispatch */.I0();
  const {
    quickReplyState
  } = es/* useSelector */.v9(state => ({
    quickReplyState: state.quickReply
  }));

  function expand() {
    return dispatch(reducer_quickReply/* quickReplyActions.expand */.LR.expand({
      id
    }));
  }

  function discard() {
    return dispatch(reducer_quickReply/* quickReplyActions.discard */.LR.discard());
  }

  let body = quickReplyState.expanded ? /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement(ComposeWidget, {
    dispatch: dispatch
  }), /*#__PURE__*/react.createElement("a", {
    className: "link",
    onClick: discard
  }, browser.i18n.getMessage("compose.discard"))) : /*#__PURE__*/react.createElement("textarea", {
    onClick: expand
  });
  return /*#__PURE__*/react.createElement("div", {
    className: "quickReply"
  }, body);
}
QuickReply.propTypes = {
  id: (prop_types_default()).number.isRequired
}; // These are the templates originally from stub.html for quickReply. Moved here
// to help tidy that up and prepare.
// The quick reply goes after the messaeFooter - if it is the last message
// in the list.

/*
 <!-- This should be in the quickReply if above -->
 <!-- {{tmpl "quickReply" this}} -->
 <script id="quickReplyTemplate" type="text/x-handlebars-template"><![CDATA[
   <div class="quickReply" ondragover="quickReplyCheckDrag(event);" ondrop="quickReplyDrop(event);">
     <div class="quickReplyContacts">
       <div class="quickReplyContactsHeader">
         {{str "mostFrequentContacts"}}
       </div>
       <div class="quickReplyContactsBox">
       </div>
       <div class="quickReplyContactsMore">
         <a class="quickReplyContactsMoreLink">
           {{str "showMore"}}
         </a>
       </div>
     </div>
     <div class="quickReplyBox">
       <div class="replyHeader">
         <div class="quickReplyRecipients">
           <ul class="fromField">
             {{str "fieldFrom"}}
             <li class="senderSwitcher"><a class="switchLeft" onclick="gComposeSession.cycleSender(-1)">◂</a> <a class="switchRight" onclick="gComposeSession.cycleSender(1)">▸</a></li>
             <li class="senderName"></li>,
             <li class="replyMethod">
               <input type="radio" name="reply-method" value="reply"
                 onchange="changeComposeFields('reply')" id="reply-radio"
               /><label for="reply-radio">{{str "reply"}}</label>
             </li>
             <li class="replyMethod replyMethod-replyAll">
               <input type="radio" name="reply-method" value="replyAll"
                 onchange="changeComposeFields('replyAll')" id="replyAll-radio"
               /><label for="replyAll-radio">{{str "replyAll"}}</label>
             </li>
             <li class="replyMethod replyMethod-replyList">
               <input type="radio" name="reply-method" value="replyList"
                 onchange="changeComposeFields('replyList')" id="replyList-radio"
               /><label for="replyList-radio">{{str "replyList"}}</label>
             </li>
             <li class="replyMethod">
               <input type="radio" name="reply-method" value="forward"
                 onchange="changeComposeFields('forward')" id="forward-radio"
               /><label for="forward-radio">{{str "forward"}}</label>
             </li>
             <li class="firstBar">|</li>
             <li class="showCc"><a onclick="showCc(); editFields('cc');" href="javascript:">{{str "addCc"}}</a> |</li>
             <li class="showBcc"><a onclick="showBcc(); editFields('bcc');" href="javascript:">{{str "addBcc"}}</a> |</li>
             <li class="addAttachment"><a onclick="addAttachment();" href="javascript:">{{str "addAttachment"}}</a></li>
           </ul>
           <div class="editRecipientList editToList">
             <div class="label">{{str "fieldTo"}}</div>
             <div class="editInput"><input type="text" id="to" /></div>
           </div>
           <div class="editRecipientList editCcList" style="display: none">
             <div class="label">{{str "fieldCc"}}</div>
             <div class="editInput"><input type="text" id="cc" /></div>
           </div>
           <div class="editRecipientList editBccList" style="display: none">
             <div class="label">{{str "fieldBcc"}}</div>
             <div class="editInput"><input type="text" id="bcc" /></div>
           </div>
           <div class="editRecipientList editSubject" style="display: none">
             <div class="label">{{str "fieldSubject"}}</div>
             <div class="editInput"><input type="text" id="subject" /></div>
           </div>
           <ul class="recipientList toList">
             {{str "fieldTo"}}
             <li>{{str "pleaseWait"}}</li>
             <li class="add-more">&#xa0;- <a href="javascript:" onclick="editFields('to');">{{str "compose.editField}}</a></li>
           </ul>
           <ul class="recipientList ccList" style="display: none;">
             {{str "fieldCc"}}
             <li>{{str "pleaseWait"}}</li>
             <li class="add-more">&#xa0;- <a href="javascript:" onclick="editFields('cc');">{{str "compose.editField"}}</a></li>
           </ul>
           <ul class="recipientList bccList" style="display: none;">
             {{str "fieldBcc"}}
             <li>{{str "pleaseWait"}}</li>
             <li class="add-more">&#xa0;- <a href="javascript:" onclick="editFields('bcc');">{{str "compose.editField"}}</a></li>
           </ul>
         </div>
         <ul class="enigmail" style="display: none;">
           <li class="replyEncrypt">
             <input type="checkbox" name="enigmail-reply-encrypt" id="enigmail-reply-encrypt"
             /><label for="enigmail-reply-encrypt">{{str "encrypt"}}</label>
           </li>
           <li class="replySign">
             <input type="checkbox" name="enigmail-reply-sign" id="enigmail-reply-sign"
             /><label for="enigmail-reply-sign">{{str "sign"}}</label>
           </li>
           <li class="replyPgpMime">
             <input type="checkbox" name="enigmail-reply-pgpmime" id="enigmail-reply-pgpmime"
             /><label for="enigmail-reply-pgpmime">PGP/MIME</label>
           </li>
         </ul>
         <div class="quickReplyAttachments">
         </div>
         <div class="quickReplyHeader" style="display: none; overflow: auto">
           <span class="statusMessage" style="float: left;"></span>
           <span class="statusPercentage" style="float: right;"></span>
           <span class="statusThrobber" style="float: right;">
             <span class="loader" style="vertical-align: middle;"></span>
           </span>
         </div>
       </div>

       <ul class="inputs">
         <li class="reply expand" ondragenter="quickReplyDragEnter(event);">
           <div class="textWrap">
             <div class="quickReplyIcon"><span>{{str "reply"}}</span> <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="material-icons.svg#reply"></use></svg></div>
             <iframe mozframetype="content" class="textarea sans"></iframe>
           </div>
         </li>

         <li class="replyAll expand" ondragenter="quickReplyDragEnter(event);">
           <div class="textWrap">
             <div class="quickReplyIcon"><span>{{str "replyAll"}}</span> <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="material-icons.svg#reply_all"></use></svg></div>
             <iframe mozframetype="content" class="textarea sans"></iframe>
           </div>
         </li>
       </ul>

       <div class="replyFooter" style="overflow: auto" tabindex="-1">
         <button id="send" style="float:right;margin-left:3px;" onclick="gComposeSession.send();">
           {{str "send"}}
         </button>
         <button id="sendArchive" style="float:right;margin-left:3px;"
             onclick="gComposeSession.send({ archive: true });">
           {{str "sendArchive"}}
         </button>
         <button id="save" style="float:right" onclick="onSave();">{{str "save"}}</button>
         <a class="discard" href="javascript:" id="discard"
           onclick="confirmDiscard()">{{str "discard"}}</a>
       </div>
     </div>
   </div>
   ]]>
 </script>
 <script id="quickReplyAttachmentTemplate" type="text/x-handlebars-template"><![CDATA[
   <ul class="quickReplyAttachment">
     {{str "attachment"}}:
     <li>{{name}}</li> ({{size}}) -
     <a href="javascript:" class="openAttachmentLink">{{str "open"}}</a> -
     <a href="javascript:" class="removeAttachmentLink">{{str "removeAttachment"}}</a>
   </ul>
   ]]>
 </script>
*/
// Old Message.js event handlers:
//
// this.register(".quickReply", function(event) {
//   event.stopPropagation();
// }, { action: "keyup" });
// this.register(".quickReply", function(event) {
//   event.stopPropagation();
// }, { action: "keypress" });
// this.register(".quickReply", function(event) {
//   // Ok, so it's actually convenient to register our event listener on the
//   //  .quickReply node because we can easily prevent it from bubbling
//   //  upwards, but the problem is, if a message is appended at the end of
//   //  the conversation view, this event listener is active and the one from
//   //  the new message is active too. So we check that the quick reply still
//   //  is inside our dom node.
//   if (!self._domNode.getElementsByClassName("quickReply").length)
//     return;
//
//   let window = self._conversation._htmlPane;
//
//   switch (event.keyCode) {
//     case mainWindow.KeyEvent.DOM_VK_RETURN:
//       if (isAccel(event)) {
//         if (event.shiftKey)
//           window.gComposeSession.send({ archive: true });
//         else
//           window.gComposeSession.send();
//       }
//       break;
//
//     case mainWindow.KeyEvent.DOM_VK_ESCAPE:
//       Log.debug("Escape from quickReply");
//       self._domNode.focus();
//       break;
//   }
//   event.stopPropagation();
// }, { action: "keydown" });
;// CONCATENATED MODULE: ./addon/content/components/message/message.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */












function isAccel(event) {
  if (window.navigator.platform.includes("Mac")) {
    return event.metaKey;
  }

  return event.ctrlKey;
}
/**
 * Trap any errors in child component displaying an error
 * message if any errors are encountered.
 *
 * Code taken from https://reactjs.org/blog/2017/07/26/error-handling-in-react-16.html
 *
 * @class ErrorBoundary
 * @extends {React.Component}
 */


class ErrorBoundary extends react.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.errorInfo) {
      // Error path
      return /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("h4", null, "Error encountered while rendering."), /*#__PURE__*/react.createElement("details", {
        style: {
          whiteSpace: "pre-wrap"
        }
      }, this.state.error && this.state.error.toString(), /*#__PURE__*/react.createElement("br", null), this.state.errorInfo.componentStack));
    } // Normally, just render children


    return this.props.children;
  }

}

ErrorBoundary.propTypes = {
  children: (prop_types_default()).any
};
class Message extends react.PureComponent {
  constructor(props) {
    super(props);
    this.onSelected = this.onSelected.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    if (this.lastScrolledMsgUri != this.props.message.msgUri && this.props.message.scrollTo) {
      this.lastScrolledMsgUri = this.props.message.msgUri; // The header is 44px high (yes, this is hard coded and ugly).

      window.requestAnimationFrame(() => {
        window.scrollTo(0, this.li.getBoundingClientRect().top + window.scrollY + 5 - 44);
        this.onSelected();
      }); // For any time we're mounting a new message, we're going to be loading
      // it as well. That means we don't need to clear the scrollTo flag here,
      // we can leave that to componentDidUpdate.
    }

    this.checkLateAttachments();
  }

  componentDidUpdate(prevProps) {
    if (this.props.message.expanded && !this.props.iframesLoading) {
      this.handleAutoMarkAsRead();
    } else if (!this.props.message.expanded || this.props.message.read) {
      this.removeScrollListener();
    }

    if (!this.props.message.scrollTo) {
      return;
    }

    if (this.lastScrolledMsgUri != this.props.message.msgUri || prevProps.iframesLoading && !this.props.iframesLoading) {
      this.lastScrolledMsgUri = this.props.message.msgUri; // The header is 44px high (yes, this is hardcoded and ugly).

      window.requestAnimationFrame(() => {
        window.scrollTo(500, this.li.getBoundingClientRect().top + window.scrollY + 5 - 44);
        this.onSelected(); // Only clear scrollTo if we're now not loading any iframes for
        // this message. This should generally mean we get to scroll to the
        // right place most of the time.

        if (!this.props.iframesLoading) {
          this.props.dispatch(reducer_messages/* messageActions.clearScrollto */.od.clearScrollto({
            id: this.props.message.id
          }));
        }
      });
    }

    this.checkLateAttachments();
  }

  componentWillUnmount() {
    this.removeScrollListener();
  }

  checkLateAttachments() {
    if (this.props.message.expanded && this.props.message.needsLateAttachments) {
      this.props.dispatch(reducer_messages/* messageActions.getLateAttachments */.od.getLateAttachments({
        id: this.props.message.id
      }));
    }
  }

  removeScrollListener() {
    if (this._scrollListener) {
      document.removeEventListener("scroll", this._scrollListener, true);
      delete this._scrollListener;
    }
  } // Handles setting up the listeners for if we should mark as read when scrolling.


  handleAutoMarkAsRead() {
    // If we're already read, not expanded or auto read is turned off, then we
    // don't need to add listeners.
    if (!this.props.autoMarkAsRead || !this.props.message.expanded || this.props.message.read) {
      this.removeScrollListener();
      return;
    }

    if (this._scrollListener) {
      return;
    }

    this._topInView = false;
    this._bottomInView = false;
    this._scrollListener = this.onScroll.bind(this);
    document.addEventListener("scroll", this._scrollListener, true);
  }

  onSelected() {
    this.props.dispatch(reducer_messages/* messageActions.selected */.od.selected({
      msgUri: this.props.message.msgUri
    }));
  }

  onKeyDown(event = {}) {
    const {
      key,
      shiftKey
    } = event;
    const shortcut = `${isAccel(event) ? "accel-" : ""}${key}`;

    function stopEvent() {
      event.stopPropagation();
      event.preventDefault();
    } // Handle the basic keyboard shortcuts


    switch (shortcut) {
      case "accel-r":
      case "accel-R":
        this.props.dispatch(reducer_messages/* messageActions.reply */.od.reply({
          msgUri: this.props.message.msgUri,
          shiftKey
        }));
        stopEvent();
        break;

      case "accel-l":
        this.props.dispatch(reducer_messages/* messageActions.forward */.od.forward({
          msgUri: this.props.message.msgUri
        }));
        break;

      case "accel-u":
        this.props.dispatch(reducer_messages/* messageActions.openSource */.od.openSource({
          msgUri: this.props.message.msgUri
        }));
        break;

      case "a":
        this.props.dispatch(reducer_messages/* messageActions.archive */.od.archive({
          id: this.props.message.id
        }));
        break;

      case "o":
        this.props.dispatch(reducer_messages/* messageActions.msgExpand */.od.msgExpand({
          msgUri: this.props.message.msgUri,
          expand: !this.props.message.expanded
        }));
        break;

      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        this.props.dispatch(reducer_messages/* messageActions.toggleTagByIndex */.od.toggleTagByIndex({
          id: this.props.message.id,
          tags: this.props.message.tags,
          // Tag indexes start at 0
          index: +shortcut - 1
        }));
        stopEvent();
        break;

      case "0":
        // Remove all tags
        this.props.dispatch(reducer_messages/* messageActions.setTags */.od.setTags({
          id: this.props.message.id,
          tags: []
        }));
        stopEvent();
        break;

      case "f":
        this.props.advanceMessage(1);
        stopEvent();
        break;

      case "b":
        this.props.advanceMessage(-1);
        stopEvent();
        break;

      default:
        break;
    }

    this.onSelected();
  }

  onScroll() {
    const rect = this.li.getBoundingClientRect();

    if (!this._topInView) {
      const top = rect.y;

      if (top > 0 && top < window.innerHeight) {
        this._topInView = true;
      }
    }

    if (!this._bottomInView) {
      const bottom = rect.y + rect.height;

      if (bottom > 0 && bottom < window.innerHeight) {
        this._bottomInView = true;
      }
    }

    if (this._topInView && this._bottomInView) {
      if (!this.props.message.read) {
        this.props.dispatch(reducer_messages/* messageActions.markAsRead */.od.markAsRead({
          id: this.props.message.id
        }));
      }

      this.removeScrollListener();
    }
  }

  render() {
    // TODO: For printing, we used to have a container in-between the iframe
    // and attachments container. Need to figure out how to get that back in
    // and working.
    // <div class="body-container"></div>
    return /*#__PURE__*/react.createElement("li", {
      className: "message",
      ref: li => {
        this.li = li;
        this.props.setRef(li);
      },
      tabIndex: this.props.index + 1,
      onFocusCapture: this.onSelected,
      onClickCapture: this.onSelected,
      onKeyDownCapture: this.onKeyDown
    }, /*#__PURE__*/react.createElement(MessageHeader, {
      dispatch: this.props.dispatch,
      bcc: this.props.message.bcc,
      cc: this.props.message.cc,
      date: this.props.message.date,
      detailsShowing: this.props.message.detailsShowing,
      expanded: this.props.message.expanded,
      from: this.props.message.from,
      to: this.props.message.to,
      fullDate: this.props.message.fullDate,
      id: this.props.message.id,
      msgUri: this.props.message.msgUri,
      attachments: this.props.message.attachments,
      multipleRecipients: this.props.message.multipleRecipients,
      recipientsIncludeLists: this.props.message.recipientsIncludeLists,
      inView: this.props.message.inView,
      isDraft: this.props.message.isDraft,
      shortFolderName: this.props.message.shortFolderName,
      snippet: this.props.message.snippet,
      starred: this.props.message.starred,
      tags: this.props.message.tags,
      specialTags: this.props.message.specialTags
    }), this.props.message.expanded && this.props.message.detailsShowing && /*#__PURE__*/react.createElement(MessageDetails, {
      bcc: this.props.message.bcc,
      cc: this.props.message.cc,
      extraLines: this.props.message.extraLines,
      from: this.props.message.from,
      to: this.props.message.to
    }), this.props.message.expanded && /*#__PURE__*/react.createElement(MessageNotification, {
      canUnJunk: this.props.message.isJunk && !this.props.displayingMultipleMsgs,
      dispatch: this.props.dispatch,
      extraNotifications: this.props.message.extraNotifications,
      hasRemoteContent: this.props.message.hasRemoteContent,
      isPhishing: this.props.message.isPhishing,
      isOutbox: this.props.message.isOutbox,
      id: this.props.message.id,
      msgUri: this.props.message.msgUri,
      realFrom: this.props.message.realFrom
    }), /*#__PURE__*/react.createElement("div", {
      className: "messageBody"
    }, this.props.message.expanded && /*#__PURE__*/react.createElement(SpecialMessageTags, {
      onFolderClick: () => {
        this.props.dispatch(reducer_messages/* messageActions.switchToFolderAndMsg */.od.switchToFolderAndMsg({
          id: this.props.message.id
        }));
      },
      onTagClick: (event, tag) => {
        this.props.dispatch(reducer_messages/* messageActions.tagClick */.od.tagClick({
          event,
          msgUri: this.props.message.msgUri,
          details: tag.details
        }));
      },
      folderName: this.props.message.folderName,
      inView: this.props.message.inView,
      specialTags: this.props.message.specialTags
    }), this.props.message.expanded && /*#__PURE__*/react.createElement(MessageTags, {
      onTagsChange: tags => {
        this.props.dispatch(reducer_messages/* messageActions.setTags */.od.setTags({
          id: this.props.message.id,
          tags
        }));
      },
      expanded: true,
      tags: this.props.message.tags
    }), /*#__PURE__*/react.createElement(ErrorBoundary, null, /*#__PURE__*/react.createElement(MessageIFrame, {
      browserBackgroundColor: this.props.browserBackgroundColor,
      browserForegroundColor: this.props.browserForegroundColor,
      defaultFontSize: this.props.defaultFontSize,
      dispatch: this.props.dispatch,
      expanded: this.props.message.expanded,
      hasRemoteContent: this.props.message.hasRemoteContent,
      smimeReload: this.props.message.smimeReload,
      initialPosition: this.props.message.initialPosition,
      msgUri: this.props.message.msgUri,
      neckoUrl: this.props.message.neckoUrl,
      tenPxFactor: this.props.tenPxFactor,
      prefs: this.props.prefs,
      realFrom: this.props.message.realFrom
    })), this.props.message.expanded && !!this.props.message.attachments.length && /*#__PURE__*/react.createElement(Attachments, {
      dispatch: this.props.dispatch,
      attachments: this.props.message.attachments,
      attachmentsPlural: this.props.message.attachmentsPlural,
      hasBuiltInPdf: this.props.hasBuiltInPdf,
      messageKey: this.props.message.messageKey,
      id: this.props.message.id
    })), this.props.message.expanded && /*#__PURE__*/react.createElement(MessageFooter, {
      dispatch: this.props.dispatch,
      id: this.props.message.id,
      msgUri: this.props.message.msgUri,
      multipleRecipients: this.props.message.multipleRecipients,
      recipientsIncludeLists: this.props.message.recipientsIncludeLists,
      isDraft: this.props.message.isDraft
    }), this.props.isLastMessage && this.props.message.expanded && !this.props.hideQuickReply && /*#__PURE__*/react.createElement(QuickReply, {
      id: this.props.message.id
    }));
  }

}
Message.propTypes = {
  autoMarkAsRead: (prop_types_default()).bool.isRequired,
  browserBackgroundColor: (prop_types_default()).string.isRequired,
  browserForegroundColor: (prop_types_default()).string.isRequired,
  defaultFontSize: (prop_types_default()).number.isRequired,
  dispatch: (prop_types_default()).func.isRequired,
  displayingMultipleMsgs: (prop_types_default()).bool.isRequired,
  iframesLoading: (prop_types_default()).number.isRequired,
  index: (prop_types_default()).number.isRequired,
  isLastMessage: (prop_types_default()).bool.isRequired,
  hasBuiltInPdf: (prop_types_default()).bool.isRequired,
  hideQuickReply: (prop_types_default()).bool.isRequired,
  message: (prop_types_default()).object.isRequired,
  tenPxFactor: (prop_types_default()).number.isRequired,
  prefs: (prop_types_default()).object.isRequired,
  setRef: (prop_types_default()).func.isRequired,
  advanceMessage: (prop_types_default()).func.isRequired
};
;// CONCATENATED MODULE: ./addon/content/components/message/messageList.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





function _MessageList(props) {
  // Keep a reference to child elements so `.focus()`
  // can be called on them in response to a `advanceMessage()`
  // call. The actual ref is stored in `React.useRef().current`
  const {
    current: childRefs
  } = react.useRef([]);

  function setRef(index, ref) {
    childRefs[index] = ref;
  }

  function advanceMessage(index, step) {
    const ref = childRefs[index + step];

    if (!ref) {
      return;
    }

    ref.focus();
  }

  return /*#__PURE__*/react.createElement("ul", {
    id: "messageList"
  }, !!props.messages.msgData && props.messages.msgData.map((message, index) => /*#__PURE__*/react.createElement(Message, {
    key: index,
    autoMarkAsRead: props.summary.autoMarkAsRead,
    browserBackgroundColor: props.summary.browserBackgroundColor,
    browserForegroundColor: props.summary.browserForegroundColor,
    defaultFontSize: props.summary.defaultFontSize,
    dispatch: props.dispatch,
    displayingMultipleMsgs: !!props.messages.length,
    hasBuiltInPdf: props.summary.hasBuiltInPdf,
    hideQuickReply: props.summary.hideQuickReply,
    iframesLoading: props.summary.iframesLoading,
    index: index,
    isLastMessage: index == props.messages.msgData.length - 1,
    message: message,
    tenPxFactor: props.summary.tenPxFactor,
    prefs: props.summary.prefs,
    advanceMessage: (step = 1) => {
      advanceMessage(index, step);
    },
    setRef: ref => {
      setRef(index, ref);
    }
  })));
}

_MessageList.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  messages: (prop_types_default()).object.isRequired,
  summary: (prop_types_default()).object.isRequired
};
const MessageList = es/* connect */.$j(state => {
  return {
    messages: state.messages,
    summary: state.summary
  };
})(_MessageList);
;// CONCATENATED MODULE: ./addon/content/components/conversation/conversationWrapper.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */









class _ConversationWrapper extends react.PureComponent {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this._setHTMLAttributes(); // When moving to a WebExtension page this can simply be moved to CSS (see
    // options.css).


    thunderbird_compat/* browser.conversations.getLocaleDirection */.Xh.conversations.getLocaleDirection().then(dir => {
      document.documentElement.setAttribute("dir", dir);
    });
    this.props.dispatch(reducer_messages/* messageActions.waitForStartup */.od.waitForStartup());
  }

  componentDidUpdate(prevProps) {
    this._setHTMLAttributes(prevProps);
  }

  _setHTMLAttributes(prevProps) {
    if (prevProps && this.props.OS == prevProps.OS && this.props.tweakChrome == prevProps.tweakChrome) {
      return;
    }

    const html = document.body.parentNode;

    if (this.props.tweakChrome && this.props.OS) {
      html.setAttribute("os", this.props.OS);
    } else {
      html.removeAttribute("os");
    }
  }

  render() {
    return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", {
      id: "popup-container"
    }), /*#__PURE__*/react.createElement(ConversationHeader, null), /*#__PURE__*/react.createElement(MessageList, null), /*#__PURE__*/react.createElement(ConversationFooter, null));
  }

}

_ConversationWrapper.propTypes = {
  dispatch: (prop_types_default()).func.isRequired,
  tweakChrome: (prop_types_default()).bool.isRequired,
  OS: (prop_types_default()).string
};
const ConversationWrapper = es/* connect */.$j(state => {
  return {
    tweakChrome: !!state.summary.prefs && state.summary.prefs.tweakChrome,
    OS: state.summary.OS
  };
})(_ConversationWrapper);

/***/ }),

/***/ 5363:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Q": () => (/* binding */ getInitials)
/* harmony export */ });
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Take a name and extract initials from it.
 * If `name` is an email address, get the part before the @.
 * Then, capitalize the first letter of the first and last word (or the first
 * two letters of the first word if only one exists).
 *
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  name = name.trim().split("@")[0];
  let words = name.split(/[ .\-_]/).filter(function (word) {
    return word;
  });
  let initials = "??";
  let n = words.length;

  if (n == 1) {
    initials = words[0].substr(0, 2);
  } else if (n > 1) {
    initials = fixedCharAt(words[0], 0) + fixedCharAt(words[n - 1], 0);
  }

  return initials.toUpperCase();
} // Taken from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt#Fixing_charAt()_to_support_non-Basic-Multilingual-Plane_(BMP)_characters

function fixedCharAt(str, idx) {
  var ret = "";
  str += "";
  var end = str.length;
  var surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

  while (surrogatePairs.exec(str) != null) {
    var li = surrogatePairs.lastIndex;

    if (li - 2 < idx) {
      idx++;
    } else {
      break;
    }
  }

  if (idx >= end || idx < 0) {
    return "";
  }

  ret += str.charAt(idx);

  if (/[\uD800-\uDBFF]/.test(ret) && /[\uDC00-\uDFFF]/.test(str.charAt(idx + 1))) {
    // Go one further, since one of the "characters" is part of a surrogate pair
    ret += str.charAt(idx + 1);
  }

  return ret;
}

/***/ }),

/***/ 4093:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "A": () => (/* binding */ mergeContactDetails)
/* harmony export */ });
/* harmony import */ var _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6141);
/* harmony import */ var _es_modules_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5363);
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * Adds necessary information for display contacts.
 *
 * @param {object} contact
 *   The contact details from the ContactManager.
 * @param {string} email
 *   The associated email for the contact.
 * @param {string} field
 *   The field of the email the contact is in, e.g. from, to, cc etc.
 * @param {string} nameFromEmail
 *   The name from the email address.
 * @param {boolean} showCondensed
 *   Whether or not to show condensed names.
 */

async function enrichWithDisplayData({
  contact,
  email,
  field,
  nameFromEmail,
  showCondensed
}) {
  // `name` is the only attribute that depend on `position`
  let name = contact.name || nameFromEmail || email;

  if (contact.identityId !== undefined) {
    name = field === "from" ? _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__/* .browser.i18n.getMessage */ .Xh.i18n.getMessage("message.meFromMeToSomeone") : _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__/* .browser.i18n.getMessage */ .Xh.i18n.getMessage("message.meFromSomeoneToMe");
  }

  const displayEmail = name != email ? email : "";
  const skipEmail = contact.contactId !== undefined && showCondensed;
  let data = {
    name,
    initials: (0,_es_modules_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getInitials */ .Q)(name),
    displayEmail: skipEmail ? "" : displayEmail,
    email,
    avatar: contact.photoURI,
    contactId: contact.contactId,
    colorStyle: {
      backgroundColor: contact.color
    }
  };
  return data;
}
/**
 * Walk through each message in `msgData` and fetch details about
 * each contact. When the details are fetched, merge them into the
 * message object itself.
 *
 * @export
 * @param {[object]} msgData
 */


async function mergeContactDetails(msgData) {
  let showCondensed = await _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__/* .browser.conversations.getCorePref */ .Xh.conversations.getCorePref("mail.showCondensedAddresses");

  for (const message of msgData) {
    // We want to fetch the detailed data about every contact in the `_contactsData` object.
    // So fetch all the data upfront.
    for (const [field, contacts] of Object.entries(message._contactsData)) {
      const contactData = await Promise.all(contacts.map(async contact => [await _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__/* .browser._background.request */ .Xh._background.request({
        type: "contactDetails",
        payload: contact
      }), // We need to keep the raw email around to format the data correctly
      contact.email, contact.name]));
      const formattedData = await Promise.all(contactData.map(([contact, email, name]) => enrichWithDisplayData({
        contact,
        email,
        field,
        nameFromEmail: name,
        showCondensed
      }))); // There is only ever one email in the `from` field. All the others are arrays.

      if (field === "from") {
        message[field] = formattedData[0];
      } else {
        message[field] = formattedData;
      }
    }
  }
}

/***/ }),

/***/ 3849:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "m": () => (/* binding */ attachmentActions)
/* harmony export */ });
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const attachmentActions = {
  previewAttachment({
    id,
    name,
    partName,
    url,
    isPdf,
    maybeViewable
  }) {
    return async (dispatch, getState) => {
      if (maybeViewable) {
        let msgUri = await browser.conversations.getMessageUriForId(id);
        let searchParams = new URLSearchParams({
          msgUri,
          partName
        });
        await browser.tabs.create({
          url: `/gallery/index.html?${searchParams.toString()}`,
          windowId: getState().summary.windowId
        });
      } else if (isPdf) {
        browser.conversations.createTab({
          url: "chrome://conversations/content/pdfviewer/wrapper.xhtml?uri=" + encodeURIComponent(url) + "&name=" + encodeURIComponent(name),
          type: "chromeTab",
          windowId: getState().summary.windowId
        });
      }
    };
  },

  downloadAll({
    id
  }) {
    return async () => {
      await browser.conversations.downloadAllAttachments(id);
    };
  },

  downloadAttachment({
    id,
    attachmentUrl
  }) {
    return async () => {
      await browser.conversations.downloadAttachment(id, attachmentUrl);
    };
  },

  openAttachment({
    id,
    attachmentUrl
  }) {
    return async () => {
      await browser.conversations.openAttachment(id, attachmentUrl);
    };
  },

  detachAttachment({
    id,
    attachmentUrl,
    shouldSave
  }) {
    return async () => {
      await browser.conversations.detachAttachment(id, attachmentUrl, shouldSave);
    };
  },

  showGalleryView({
    id
  }) {
    return async (dispatch, getState) => {
      let msgUri = await browser.conversations.getMessageUriForId(id);
      await browser.tabs.create({
        url: "/gallery/index.html?msgUri=" + encodeURIComponent(msgUri),
        windowId: getState().summary.windowId
      });
    };
  }

};

/***/ }),

/***/ 4978:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "jz": () => (/* binding */ composeSlice),
/* harmony export */   "rx": () => (/* binding */ composeActions)
/* harmony export */ });
/* unused harmony export initialCompose */
/* harmony import */ var _reduxjs_toolkit__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9829);
/* harmony import */ var _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6141);
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

 // Prefer the global browser object to the imported one.

window.browser = window.browser || _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__/* .browser */ .Xh;
const initialCompose = {
  modified: false,
  sending: false,
  sendingMsg: ""
};
const composeSlice = _reduxjs_toolkit__WEBPACK_IMPORTED_MODULE_1__/* .createSlice */ .oM({
  name: "compose",
  initialState: initialCompose,
  reducers: {
    setFromDetails(state, {
      payload
    }) {
      let userModified = payload.userModified;
      delete payload.userModified;

      if (!userModified || state.modified) {
        return { ...state,
          ...payload
        };
      }

      for (let [k, v] of Object.entries(payload)) {
        if (state[k] != v) {
          return { ...state,
            ...payload,
            modified: true
          };
        }
      } // If we get here, nothing changed.


      return state;
    },

    setSendStatus(state, {
      payload
    }) {
      let newState = { ...state
      };

      if ("sending" in payload) {
        newState.sending = payload.sending;
      }

      if ("modified" in payload) {
        newState.modified = payload.modified;
      }

      if ("sendingMsg" in payload) {
        newState.sendingMsg = payload.sendingMsg;
      }

      return newState;
    },

    resetStore() {
      return initialCompose;
    }

  }
});
const composeActions = {
  initCompose({
    accountId,
    identityId,
    to,
    subject
  }) {
    return async function (dispatch) {
      await dispatch(composeSlice.actions.resetStore()); // Set from to be the default account / identity.

      let accountDetail;

      if (!accountId) {
        let accounts = await browser.accounts.list();
        accountDetail = accounts[0];
      } else {
        accountDetail = await browser.accounts.get(accountId);
      }

      let identityDetail = identityId ? accountDetail.identities.find(i => i.id == identityId) : accountDetail.identities[0];
      await dispatch(composeSlice.actions.setFromDetails({
        userModified: false,
        from: identityDetail.email,
        identityId: identityDetail.id,
        email: identityDetail.email,
        to,
        subject
      }));
    };
  },

  setValue(name, value) {
    return async function (dispatch, getState) {
      let {
        from,
        to,
        subject,
        body
      } = getState().compose;
      await dispatch(composeSlice.actions.setFromDetails({
        from,
        to,
        subject,
        body,
        [name]: value,
        userModified: true
      }));
    };
  },

  resetStore() {
    return async dispatch => {
      await dispatch(composeSlice.actions.resetStore());
    };
  },

  sendMessage() {
    return async function (dispatch, getState) {
      let state = getState().compose;
      await dispatch(composeSlice.actions.setSendStatus({
        sending: true,
        sendingMsg: browser.i18n.getMessage("compose.sendingMessage")
      }));
      let success = true;

      try {
        await browser.convCompose.send({
          from: state.identityId,
          to: state.to,
          subject: state.subject,
          body: state.body || ""
        });
      } catch (ex) {
        console.error(ex);
        success = false;
      }

      await dispatch(composeSlice.actions.setSendStatus({
        sending: false,
        modified: false,
        sendingMsg: success ? "" : browser.i18n.getMessage("compose.couldntSendTheMessage")
      }));

      if (success) {
        await dispatch(composeActions.close());
      }
    };
  },

  /**
   * A generic close action that is designed to be overriden by compose in a
   * new tab, or by quick reply, so that it may be handled correctly.
   */
  close() {
    return async function (dispatch, getState) {};
  }

};
Object.assign(composeActions, composeSlice.actions);

/***/ }),

/***/ 5101:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PK": () => (/* binding */ quickReplySlice),
/* harmony export */   "LR": () => (/* binding */ quickReplyActions)
/* harmony export */ });
/* unused harmony export initialQuickReply */
/* harmony import */ var _reduxjs_toolkit__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9829);
/* harmony import */ var _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6141);
/* harmony import */ var _reducer_compose_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4978);
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


 // Prefer the global browser object to the imported one.

window.browser = window.browser || _es_modules_thunderbird_compat_js__WEBPACK_IMPORTED_MODULE_0__/* .browser */ .Xh;
const initialQuickReply = {
  expanded: false
};
const quickReplySlice = _reduxjs_toolkit__WEBPACK_IMPORTED_MODULE_2__/* .createSlice */ .oM({
  name: "quickReply",
  initialState: initialQuickReply,
  reducers: {
    setExpandedState(state, {
      payload
    }) {
      return { ...state,
        expanded: payload.expanded
      };
    }

  }
});
const quickReplyActions = {
  expand({
    id
  }) {
    return async function (dispatch, getState) {
      let msg = await browser.messages.get(id);
      let accountDetail = await browser.accounts.get(msg.folder.accountId);
      let accountId;
      let identityId;

      if (accountDetail && accountDetail.identities.length) {
        accountId = accountDetail.id;
        identityId = accountDetail.identities[0].id;
      }

      let to = msg.author;
      let subject = msg.subject;

      if (!subject.toLowerCase().includes("re:")) {
        subject = "Re: " + subject;
      } // Initialise the compose section first, to avoid flicker, and ensure
      // the compose widget has the correct information to set focus correctly
      // on first render.


      await dispatch(_reducer_compose_js__WEBPACK_IMPORTED_MODULE_1__/* .composeActions.initCompose */ .rx.initCompose({
        accountId,
        identityId,
        to,
        subject
      }));
      await dispatch(quickReplySlice.actions.setExpandedState({
        expanded: true
      }));
    };
  },

  discard() {
    return async function (dispatch) {
      await dispatch(quickReplySlice.actions.setExpandedState({
        expanded: false
      }));
    };
  }

};

_reducer_compose_js__WEBPACK_IMPORTED_MODULE_1__/* .composeActions.close */ .rx.close = () => {
  return async function (dispatch) {
    await dispatch(quickReplySlice.actions.setExpandedState({
      expanded: false
    }));
  };
};

Object.assign(quickReplyActions, quickReplySlice.actions);

/***/ }),

/***/ 4131:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "i": () => (/* binding */ kPrefDefaults)
/* harmony export */ });
/* unused harmony export Prefs */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const kCurrentLegacyMigration = 3;
const kPrefDefaults = {
  hide_quote_length: 5,
  expand_who: 4,
  // kExpandAuto
  no_friendly_date: false,
  uninstall_infos: "{}",
  logging_enabled: false,
  tweak_bodies: true,
  tweak_chrome: true,
  operate_on_conversations: false,
  extra_attachments: false,
  hide_quick_reply: false,
  compose_in_tab: true,
  unwanted_recipients: "{}",
  hide_sigs: false
};
class Prefs {
  async init() {
    try {
      await this._migrate();
    } catch (ex) {
      console.error(ex);
    } // Now we've done the migration, tell the backend about all our prefs.


    const results = await browser.storage.local.get("preferences");

    if (results.preferences) {
      let updatePrefs = false;

      for (const prefName of Object.getOwnPropertyNames(kPrefDefaults)) {
        // Ensure all preference values are defined.
        if (results.preferences[prefName] === "undefined") {
          updatePrefs = true;
          results.preferences[prefName] = kPrefDefaults[prefName];
        }

        await browser.conversations.setPref(prefName, results.preferences[prefName]);
      } // Set a special pref so bootstrap knows it can continue.


      await browser.conversations.setPref("finishedStartup", true);

      if (updatePrefs) {
        try {
          await browser.storage.local.set({
            preferences: results.preferences
          });
        } catch (ex) {
          console.error(ex);
        }
      }
    } else {
      console.error("Could not find the preferences to send to the API.");
    }

    this._addListener();
  }

  async _migrate() {
    const results = await browser.storage.local.get("preferences");
    const currentMigration = results.preferences && results.preferences.migratedLegacy ? results.preferences.migratedLegacy : 0;

    if (currentMigration >= kCurrentLegacyMigration) {
      return;
    }

    let prefs = results.preferences || {};

    if (currentMigration < 1) {
      for (const prefName of Object.getOwnPropertyNames(kPrefDefaults)) {
        prefs[prefName] = await browser.conversations.getPref(prefName);

        if (prefs[prefName] === undefined) {
          prefs[prefName] = kPrefDefaults[prefName];
        }
      }
    } // Version 2 was the migration from the legacy storage format for saved
    // quick reply drafts. It might be better just to drop these completely
    // now, but in case we decide to keep & use the old data:
    //
    // Stored in key/value format in draftsData (top-level).
    // The key is the gloda id. The value was generated from this:
    // {
    //   msgUri: msgHdrGetUri(gComposeSession.params.msgHdr),
    //   from: gComposeSession.params.identity.email,
    //   to: JSON.parse($("#to").val()).join(","),
    //   cc: JSON.parse($("#cc").val()).join(","),
    //   bcc: JSON.parse($("#bcc").val()).join(","),
    //   body: getActiveEditor().value,
    //   attachments: gComposeSession.attachmentList.save()
    // }


    if (currentMigration < 3) {
      prefs.hide_quick_reply = false;
    }

    prefs.migratedLegacy = kCurrentLegacyMigration;
    await browser.storage.local.set({
      preferences: prefs
    });
  }

  _addListener() {
    browser.storage.onChanged.addListener((changed, areaName) => {
      if (areaName != "local" || !("preferences" in changed) || !("newValue" in changed.preferences)) {
        return;
      }

      for (const prefName of Object.getOwnPropertyNames(changed.preferences.newValue)) {
        if (prefName == "migratedLegacy") {
          continue;
        }

        if (!changed.preferences.oldValue || changed.preferences.oldValue[prefName] != changed.preferences.newValue[prefName]) {
          browser.conversations.setPref(prefName, changed.preferences.newValue[prefName]);
        }
      }
    });
  }

}

/***/ })

}]);