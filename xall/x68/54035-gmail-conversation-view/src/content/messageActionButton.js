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

/* globals printConversation, PropTypes, React, ReactRedux, StringBundle */

/* exported ActionButton */
var ActionsToInfoMap = {
  "draft": {
    actionType: "EDIT_DRAFT",
    title: "editDraft2",
    icon: "edit"
  },
  "editAsNew": {
    actionType: "EDIT_AS_NEW",
    title: "editNew",
    icon: "edit"
  },
  "reply": {
    actionType: "MSG_REPLY",
    title: "reply",
    icon: "reply"
  },
  "replyAll": {
    actionType: "MSG_REPLY_ALL",
    title: "replyAll",
    icon: "reply_all"
  },
  "replyList": {
    actionType: "MSG_REPLY_LIST",
    title: "replyList",
    icon: "list"
  },
  "forward": {
    actionType: "MSG_FORWARD",
    title: "forward",
    icon: "forward"
  },
  "archive": {
    actionType: "MSG_ARCHIVE",
    title: "archive",
    icon: "archive"
  },
  "delete": {
    actionType: "MSG_DELETE",
    title: "delete",
    icon: "delete"
  },
  "classic": {
    actionType: "MSG_OPEN_CLASSIC",
    title: "viewClassic",
    icon: "open_in_new"
  },
  "source": {
    actionType: "MSG_OPEN_SOURCE",
    title: "viewSource",
    icon: "code"
  }
};

var ActionButton =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(ActionButton, _React$PureComponent);

  function ActionButton() {
    var _this;

    _classCallCheck(this, ActionButton);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ActionButton).call(this));
    _this.strings = new StringBundle("chrome://conversations/locale/template.properties");
    _this.action = _this.action.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(ActionButton, [{
    key: "action",
    value: function action(event) {
      this.props.callback({
        type: ActionsToInfoMap[this.props.type].actionType,
        shiftKey: event && event.shiftKey
      }, event);
    }
  }, {
    key: "render",
    value: function render() {
      var info = ActionsToInfoMap[this.props.type];
      var title = this.strings.get(info.title);
      return React.createElement("button", {
        className: this.props.className || "",
        title: title,
        onClick: this.action
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#".concat(info.icon)
      })), " ", !!this.props.showString && title);
    }
  }]);

  return ActionButton;
}(React.PureComponent);

ActionButton.propTypes = {
  callback: PropTypes.func.isRequired,
  className: PropTypes.string,
  showString: PropTypes.bool,
  type: PropTypes.string.isRequired
};