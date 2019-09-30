"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals PropTypes, React, ReactRedux, StringBundle */

/* exported Attachments */
var _Attachment =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(_Attachment, _React$PureComponent);

  function _Attachment() {
    var _this;

    _classCallCheck(this, _Attachment);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(_Attachment).call(this));
    _this.preview = _this.preview.bind(_assertThisInitialized(_this));
    _this.downloadAttachment = _this.downloadAttachment.bind(_assertThisInitialized(_this));
    _this.openAttachment = _this.openAttachment.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(_Attachment, [{
    key: "preview",
    value: function preview() {
      this.props.dispatch({
        type: "PREVIEW_ATTACHMENT",
        name: this.props.name,
        url: this.props.url,
        isPdf: this.props.isPdf,
        maybeViewable: this.props.maybeViewable
      });
    }
  }, {
    key: "downloadAttachment",
    value: function downloadAttachment() {
      this.props.dispatch({
        type: "DOWNLOAD_ATTACHMENT",
        msgUri: this.props.msgUri,
        url: this.props.url
      });
    }
  }, {
    key: "openAttachment",
    value: function openAttachment() {
      this.props.dispatch({
        type: "OPEN_ATTACHMENT",
        msgUri: this.props.msgUri,
        url: this.props.url
      });
    }
  }, {
    key: "render",
    value: function render() {
      var enablePreview = this.props.isPdf || this.props.maybeViewable;
      var imgTitle = enablePreview ? this.props.strings.get("viewAttachment") : ""; // TODO: Drag n drop
      // Due to "contextmenu". We probably should change this to use
      // the newer "onContextMenu".

      /* eslint-disable react/no-unknown-property */

      return React.createElement("li", {
        className: "clearfix hbox attachment",
        contextmenu: "attachmentMenu",
        draggable: "true"
      }, React.createElement("div", {
        className: "attachmentThumb"
      }, React.createElement("img", {
        className: this.props.imgClass + (enablePreview ? " view-attachment" : ""),
        src: this.props.thumb,
        onClick: this.preview,
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
      }))))));
      /* eslint-enable react/no-unknown-property */
    }
  }]);

  return _Attachment;
}(React.PureComponent);

_Attachment.propTypes = {
  dispatch: PropTypes.func.isRequired,
  formattedSize: PropTypes.string.isRequired,
  imgClass: PropTypes.string.isRequired,
  isPdf: PropTypes.bool.isRequired,
  maybeViewable: PropTypes.bool.isRequired,
  msgUri: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  strings: PropTypes.object.isRequired,
  thumb: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
var Attachment = ReactRedux.connect()(_Attachment);

var _Attachments =
/*#__PURE__*/
function (_React$PureComponent2) {
  _inherits(_Attachments, _React$PureComponent2);

  function _Attachments() {
    var _this2;

    _classCallCheck(this, _Attachments);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(_Attachments).call(this));
    _this2.strings = new StringBundle("chrome://conversations/locale/template.properties");
    _this2.showGalleryView = _this2.showGalleryView.bind(_assertThisInitialized(_this2));
    _this2.downloadAll = _this2.downloadAll.bind(_assertThisInitialized(_this2));
    return _this2;
  }

  _createClass(_Attachments, [{
    key: "showGalleryView",
    value: function showGalleryView() {
      this.props.dispatch({
        type: "SHOW_GALLERY_VIEW",
        msgUri: this.props.msgUri
      });
    }
  }, {
    key: "downloadAll",
    value: function downloadAll() {
      this.props.dispatch({
        type: "DOWNLOAD_ALL",
        msgUri: this.props.msgUri
      });
    }
  }, {
    key: "render",
    value: function render() {
      var _this3 = this;

      return React.createElement("ul", {
        className: "attachments"
      }, React.createElement("div", {
        className: "attachHeader"
      }, this.props.attachmentsPlural, React.createElement("a", {
        className: "icon-link download-all",
        onClick: this.downloadAll,
        title: this.strings.get("downloadAll2")
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
        title: this.strings.get("galleryView")
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#photo_library"
      }))), this.props.attachments.map(function (attachment) {
        return React.createElement(Attachment, {
          dispatch: _this3.props.dispatch,
          key: attachment.anchor,
          isPdf: attachment.isPdf,
          formattedSize: attachment.formattedSize,
          imgClass: attachment.imgClass,
          msgUri: _this3.props.msgUri,
          name: attachment.name,
          strings: _this3.strings,
          thumb: attachment.thumb,
          maybeViewable: attachment.maybeViewable,
          url: attachment.url
        });
      })));
    }
  }]);

  return _Attachments;
}(React.PureComponent);

_Attachments.propTypes = {
  dispatch: PropTypes.func.isRequired,
  attachments: PropTypes.array.isRequired,
  attachmentsPlural: PropTypes.string.isRequired,
  msgUri: PropTypes.string.isRequired,
  gallery: PropTypes.bool.isRequired
};
var Attachments = ReactRedux.connect()(_Attachments);