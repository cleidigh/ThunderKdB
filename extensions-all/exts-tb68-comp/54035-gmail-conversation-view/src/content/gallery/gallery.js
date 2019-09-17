/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var _ChromeUtils$import = ChromeUtils["import"]("resource:///modules/StringBundle.js"),
    StringBundle = _ChromeUtils$import.StringBundle;

var _ChromeUtils$import2 = ChromeUtils["import"]("resource:///modules/gloda/mimemsg.js"),
    MsgHdrToMimeMessage = _ChromeUtils$import2.MsgHdrToMimeMessage;

var _ChromeUtils$import3 = ChromeUtils["import"]("resource://conversations/modules/stdlib/msgHdrUtils.js"),
    msgUriToMsgHdr = _ChromeUtils$import3.msgUriToMsgHdr;

var strings = new StringBundle("chrome://conversations/locale/message.properties");
/* globals React, ReactDOM, PropTypes */

var Photo =
/*#__PURE__*/
function (_React$Component) {
  _inherits(Photo, _React$Component);

  function Photo() {
    _classCallCheck(this, Photo);

    return _possibleConstructorReturn(this, _getPrototypeOf(Photo).apply(this, arguments));
  }

  _createClass(Photo, [{
    key: "render",
    value: function render() {
      return React.createElement("div", {
        className: "photoWrap"
      }, React.createElement("img", {
        src: this.props.src
      }), React.createElement("div", {
        className: "informationline"
      }, React.createElement("div", {
        className: "filename"
      }, this.props.name), React.createElement("div", {
        className: "size"
      }, this.props.size), React.createElement("div", {
        className: "count"
      }, this.props.index + " / " + this.props.length)));
    }
  }]);

  return Photo;
}(React.Component);

Photo.propTypes = {
  index: PropTypes.number.isRequired,
  length: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  src: PropTypes.string.isRequired
};

var MyComponent =
/*#__PURE__*/
function (_React$Component2) {
  _inherits(MyComponent, _React$Component2);

  function MyComponent(props) {
    var _this;

    _classCallCheck(this, MyComponent);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(MyComponent).call(this, props));
    _this.state = {
      images: []
    };
    return _this;
  }

  _createClass(MyComponent, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      // Parse URL components
      var param = "?uri="; // only one param

      var url = document.location.href;
      var uri = url.substr(url.indexOf(param) + param.length, url.length); // Create the Gallery object.

      var msgHdr = msgUriToMsgHdr(uri);

      if (msgHdr && msgHdr.messageId) {
        this.load(msgHdr);
      } else {
        document.getElementsByClassName("gallery")[0].textContent = strings.get("messageMovedOrDeletedGallery2");
      }
    }
    /**
     * This function takes care of obtaining a full representation of the message,
     *  and then taking all its attachments, to just keep track of the image ones.
     */

  }, {
    key: "load",
    value: function load(msgHdr) {
      var _this2 = this;

      MsgHdrToMimeMessage(msgHdr, this, function (mimeHdr, aMimeMsg) {
        var attachments = aMimeMsg.allAttachments;
        attachments = attachments.filter(function (x) {
          return x.contentType.indexOf("image/") === 0;
        });
        document.title = strings.get("galleryTitle").replace("#1", mimeHdr.mime2DecodedSubject);

        _this2.output(attachments);
      }, true, {
        partsOnDemand: true,
        examineEncryptedParts: true
      });
    }
    /**
     * This function is called once the message has been streamed and the relevant
     *  data has been extracted from it.
     * It runs the handlebars template and then appends the result to the root
     *  DOM node.
     */

  }, {
    key: "output",
    value: function output(attachments) {
      var messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
      var i = 1;
      this.setState({
        images: attachments.map(function (attachment) {
          return {
            index: i++,
            name: attachment.name,
            size: messenger.formatFileSize(attachment.size),
            src: attachment.url
          };
        })
      });
    }
  }, {
    key: "render",
    value: function render() {
      var _this3 = this;

      return this.state.images.map(function (image) {
        return React.createElement(Photo, {
          index: image.index,
          key: image.index,
          name: image.name,
          size: image.size,
          src: image.src,
          className: "gallery",
          length: _this3.state.images.length
        });
      });
    }
  }]);

  return MyComponent;
}(React.Component);

window.addEventListener("load", function () {
  var domContainer = document.getElementById("gallery");
  ReactDOM.render(React.createElement(MyComponent), domContainer);
}, {
  once: true
});