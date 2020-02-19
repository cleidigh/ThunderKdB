/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals PropTypes, React */

/* exported Attachments */
class Attachment extends React.PureComponent {
  constructor(props) {
    super(props);
    this.preview = this.preview.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
    this.openAttachment = this.openAttachment.bind(this);
    this.deleteAttachment = this.deleteAttachment.bind(this);
    this.detachAttachment = this.detachAttachment.bind(this);
  }

  preview() {
    this.props.dispatch({
      type: "PREVIEW_ATTACHMENT",
      name: this.props.name,
      url: this.props.url,
      isPdf: this.props.isPdf,
      maybeViewable: this.props.maybeViewable
    });
  }

  downloadAttachment() {
    this.props.dispatch({
      type: "DOWNLOAD_ATTACHMENT",
      msgUri: this.props.msgUri,
      attachment: {
        contentType: this.props.contentType,
        isExternal: this.props.isExternal,
        name: this.props.name,
        size: this.props.size,
        url: this.props.url
      }
    });
  }

  openAttachment() {
    this.props.dispatch({
      type: "OPEN_ATTACHMENT",
      msgUri: this.props.msgUri,
      attachment: {
        contentType: this.props.contentType,
        isExternal: this.props.isExternal,
        name: this.props.name,
        size: this.props.size,
        url: this.props.url
      }
    });
  }

  detachAttachment() {
    this.props.dispatch({
      type: "DETACH_ATTACHMENT",
      msgUri: this.props.msgUri,
      shouldSave: true,
      attachment: {
        contentType: this.props.contentType,
        isExternal: this.props.isExternal,
        name: this.props.name,
        size: this.props.size,
        url: this.props.url
      }
    });
  }

  deleteAttachment() {
    this.props.dispatch({
      type: "DETACH_ATTACHMENT",
      msgUri: this.props.msgUri,
      shouldSave: false,
      attachment: {
        contentType: this.props.contentType,
        isExternal: this.props.isExternal,
        name: this.props.name,
        size: this.props.size,
        url: this.props.url
      }
    });
  }

  render() {
    const enablePreview = this.props.isPdf || this.props.maybeViewable;
    const imgTitle = enablePreview ? this.props.strings.get("viewAttachment") : ""; // TODO: Drag n drop
    // Disabled due to contextmenu which is only supported in Gecko.
    // Hoping to turn this into WebExtension based context menus at some
    // stage: https://github.com/protz/thunderbird-conversations/issues/1416

    /* eslint-disable react/no-unknown-property */

    return React.createElement("li", {
      className: "clearfix hbox attachment",
      contextmenu: `attachmentMenu-${this.props.anchor}`
    }, React.createElement("div", {
      className: "attachmentThumb" + (enablePreview ? " view-attachment" : ""),
      draggable: "true",
      onClick: this.preview
    }, React.createElement("img", {
      className: this.props.imgClass,
      src: this.props.thumb,
      title: imgTitle
    })), React.createElement("div", {
      className: "attachmentInfo align"
    }, React.createElement("span", {
      className: "filename"
    }, this.props.name), React.createElement("span", {
      className: "filesize"
    }, this.props.formattedSize), React.createElement("div", {
      className: "attachActions"
    }, this.props.isPdf && React.createElement("a", {
      className: "icon-link preview-attachment",
      title: this.props.strings.get("preview"),
      onClick: this.preview
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#visibility"
    }))), React.createElement("a", {
      className: "icon-link download-attachment",
      title: this.props.strings.get("download2"),
      onClick: this.downloadAttachment
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#file_download"
    }))), React.createElement("a", {
      className: "icon-link open-attachment",
      title: this.props.strings.get("open"),
      onClick: this.openAttachment
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#search"
    }))))), React.createElement("menu", {
      id: `attachmentMenu-${this.props.anchor}`,
      type: "context"
    }, React.createElement("menuitem", {
      label: this.props.strings.get("stub.context.open"),
      onClick: this.openAttachment
    }), React.createElement("menuitem", {
      label: this.props.strings.get("stub.context.save"),
      onClick: this.downloadAttachment
    }), React.createElement("menuitem", {
      label: this.props.strings.get("stub.context.detach"),
      onClick: this.detachAttachment
    }), React.createElement("menuitem", {
      label: this.props.strings.get("stub.context.delete"),
      onClick: this.deleteAttachment
    })));
    /* eslint-enable react/no-unknown-property */
  }

}

Attachment.propTypes = {
  anchor: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  contentType: PropTypes.string.isRequired,
  formattedSize: PropTypes.string.isRequired,
  imgClass: PropTypes.string.isRequired,
  isExternal: PropTypes.bool.isRequired,
  isPdf: PropTypes.bool.isRequired,
  maybeViewable: PropTypes.bool.isRequired,
  msgUri: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  strings: PropTypes.object.isRequired,
  thumb: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};

class Attachments extends React.PureComponent {
  constructor() {
    super();
    this.showGalleryView = this.showGalleryView.bind(this);
    this.downloadAll = this.downloadAll.bind(this);
  }

  showGalleryView() {
    this.props.dispatch({
      type: "SHOW_GALLERY_VIEW",
      msgUri: this.props.msgUri
    });
  }

  downloadAll() {
    this.props.dispatch({
      type: "DOWNLOAD_ALL",
      msgUri: this.props.msgUri,
      attachmentDetails: this.props.attachments.map(attachment => {
        return {
          contentType: attachment.contentType,
          isExternal: attachment.isExternal,
          name: attachment.name,
          size: attachment.size,
          url: attachment.url
        };
      })
    });
  }

  render() {
    return React.createElement("ul", {
      className: "attachments"
    }, React.createElement("div", {
      className: "attachHeader"
    }, this.props.attachmentsPlural, React.createElement("a", {
      className: "icon-link download-all",
      onClick: this.downloadAll,
      title: this.props.strings.get("downloadAll2")
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#file_download"
    }))), this.props.gallery && React.createElement("a", {
      onClick: this.showGalleryView,
      className: "icon-link view-all",
      title: this.props.strings.get("galleryView")
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#photo_library"
    }))), this.props.attachments.map(attachment => React.createElement(Attachment, {
      anchor: attachment.anchor,
      dispatch: this.props.dispatch,
      key: attachment.anchor,
      contentType: attachment.contentType,
      isExternal: attachment.isExternal,
      isPdf: attachment.isPdf,
      formattedSize: attachment.formattedSize,
      imgClass: attachment.imgClass,
      msgUri: this.props.msgUri,
      name: attachment.name,
      size: attachment.size,
      strings: this.props.strings,
      thumb: attachment.thumb,
      maybeViewable: attachment.maybeViewable,
      url: attachment.url
    }))));
  }

}

Attachments.propTypes = {
  dispatch: PropTypes.func.isRequired,
  attachments: PropTypes.array.isRequired,
  attachmentsPlural: PropTypes.string.isRequired,
  msgUri: PropTypes.string.isRequired,
  gallery: PropTypes.bool.isRequired,
  strings: PropTypes.object.isRequired
};