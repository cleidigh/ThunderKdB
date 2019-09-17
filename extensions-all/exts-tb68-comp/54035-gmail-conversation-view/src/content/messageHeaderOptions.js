"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals PropTypes, React, ReactRedux, StringBundle, ActionButton */

/* exported MessageHeaderOptions */
var OptionsMoreMenu =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(OptionsMoreMenu, _React$PureComponent);

  function OptionsMoreMenu() {
    var _this;

    _classCallCheck(this, OptionsMoreMenu);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(OptionsMoreMenu).call(this));
    _this.strings = new StringBundle("chrome://conversations/locale/template.properties");
    return _this;
  }

  _createClass(OptionsMoreMenu, [{
    key: "render",
    value: function render() {
      return React.createElement("div", {
        className: "tooltip tooltip-menu menu"
      }, React.createElement("div", {
        className: "arrow"
      }), React.createElement("div", {
        className: "arrow inside"
      }), React.createElement("ul", null, React.createElement("li", {
        className: "action-reply"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "reply"
      })), this.props.multipleRecipients && React.createElement("li", {
        className: "action-replyAll"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "replyAll"
      })), this.props.recipientsIncludeLists && React.createElement("li", {
        className: "action-replyList"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "replyList"
      })), React.createElement("li", {
        className: "action-editNew"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "editAsNew"
      })), React.createElement("li", {
        className: "action-forward dropdown-sep"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "forward"
      })), React.createElement("li", {
        className: "action-archive"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "archive"
      })), React.createElement("li", {
        className: "action-delete"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "delete"
      })), React.createElement("li", {
        className: "action-classic"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "classic"
      })), React.createElement("li", {
        className: "action-source"
      }, React.createElement(ActionButton, {
        callback: this.props.msgSendAction,
        className: "optionsButton",
        showString: true,
        type: "source"
      }))));
    }
  }]);

  return OptionsMoreMenu;
}(React.PureComponent);

OptionsMoreMenu.propTypes = {
  multipleRecipients: PropTypes.bool.isRequired,
  recipientsIncludeLists: PropTypes.bool.isRequired,
  msgSendAction: PropTypes.func.isRequired
};

var _MessageHeaderOptions =
/*#__PURE__*/
function (_React$PureComponent2) {
  _inherits(_MessageHeaderOptions, _React$PureComponent2);

  function _MessageHeaderOptions() {
    var _this2;

    _classCallCheck(this, _MessageHeaderOptions);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(_MessageHeaderOptions).call(this));
    _this2.strings = new StringBundle("chrome://conversations/locale/template.properties");
    _this2.replyAction = _this2.replyAction.bind(_assertThisInitialized(_this2));
    _this2.displayMenu = _this2.displayMenu.bind(_assertThisInitialized(_this2));
    _this2.state = {
      expanded: false
    };
    return _this2;
  }

  _createClass(_MessageHeaderOptions, [{
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      if (this.clickListener) {
        document.removeEventListener("click", this.clickListener);
        document.removeEventListener("keypress", this.keyListener);
        this.clickListener = null;
        this.keyListener = null;
      }
    }
  }, {
    key: "replyAction",
    value: function replyAction(msg, event) {
      event.stopPropagation();
      event.preventDefault();
      this.props.dispatch(_objectSpread({}, msg, {
        msgUri: this.props.msgUri
      }));
    }
  }, {
    key: "displayMenu",
    value: function displayMenu(event) {
      var _this3 = this;

      if (!this.clickListener) {
        this.clickListener = function (event) {
          _this3.clearMenu();
        };

        this.keyListener = function (event) {
          if (event.keyCode == KeyEvent.DOM_VK_ESCAPE) {
            _this3.clearMenu();
          }
        };

        document.addEventListener("click", this.clickListener);
        document.addEventListener("keypress", this.keyListener);
      }

      this.setState({
        expanded: !this.state.expanded
      });
    }
  }, {
    key: "clearMenu",
    value: function clearMenu() {
      this.setState({
        expanded: false
      });

      if (this.clickListener) {
        document.removeEventListener("click", this.clickListener);
        document.removeEventListener("keypress", this.keyListener);
        this.clickListener = null;
        this.keyListener = null;
      }
    }
  }, {
    key: "render",
    value: function render() {
      var actionButtonType = "reply";

      if (this.props.recipientsIncludeLists) {
        actionButtonType = "replyList";
      } else if (this.props.multipleRecipients) {
        actionButtonType = "replyAll";
      } else if (this.props.isDraft) {
        actionButtonType = "draft";
      } // TODO: Hide and show details buttons should have all control merged into here
      // once we've got more of the actual message display into react.


      return React.createElement("div", {
        className: "options"
      }, !!this.props.attachments.length && React.createElement("span", {
        className: "attachmentIcon"
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#attachment"
      }))), React.createElement("span", {
        className: "date"
      }, React.createElement("span", {
        title: this.props.fullDate
      }, this.props.date)), React.createElement("span", {
        className: "mainActionButton"
      }, React.createElement(ActionButton, {
        callback: this.replyAction,
        className: "icon-link",
        type: actionButtonType
      })), React.createElement("span", {
        className: "details hide-with-details"
      }, React.createElement("a", {
        href: "javascript:",
        className: "icon-link",
        title: this.strings.get("details")
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#info_outline"
      })))), React.createElement("span", {
        className: "hide-details show-with-details"
      }, React.createElement("a", {
        href: "javascript:",
        className: "icon-link",
        title: this.strings.get("hideDetails")
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#info"
      })))), React.createElement("span", {
        className: "dropDown"
      }, React.createElement("button", {
        onClick: this.displayMenu,
        className: "icon-link top-right-more",
        title: this.strings.get("more")
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#more_vert"
      }))), this.state.expanded && React.createElement(OptionsMoreMenu, {
        recipientsIncludeLists: this.props.recipientsIncludeLists,
        msgSendAction: this.replyAction,
        multipleRecipients: this.props.multipleRecipients
      })));
    }
  }]);

  return _MessageHeaderOptions;
}(React.PureComponent);

_MessageHeaderOptions.propTypes = {
  dispatch: PropTypes.func.isRequired,
  date: PropTypes.string.isRequired,
  fullDate: PropTypes.string.isRequired,
  msgUri: PropTypes.string.isRequired,
  attachments: PropTypes.array.isRequired,
  multipleRecipients: PropTypes.bool.isRequired,
  recipientsIncludeLists: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired
};
var MessageHeaderOptions = ReactRedux.connect()(_MessageHeaderOptions);