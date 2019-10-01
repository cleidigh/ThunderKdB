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

/* exported ConversationFooter */
var _ConversationFooter =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(_ConversationFooter, _React$PureComponent);

  function _ConversationFooter() {
    var _this;

    _classCallCheck(this, _ConversationFooter);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(_ConversationFooter).call(this));
    _this.strings = new StringBundle("chrome://conversations/locale/pages.properties");
    _this.forwardConversation = _this.forwardConversation.bind(_assertThisInitialized(_this));
    _this.printConversation = _this.printConversation.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(_ConversationFooter, [{
    key: "forwardConversation",
    value: function forwardConversation() {
      this.props.dispatch({
        type: "FORWARD_CONVERSATION"
      });
    }
  }, {
    key: "printConversation",
    value: function printConversation() {
      this.props.dispatch({
        type: "PRINT_CONVERSATION"
      });
    }
  }, {
    key: "render",
    value: function render() {
      return React.createElement("div", {
        className: "bottom-links"
      }, React.createElement("a", {
        className: "link",
        href: "javascript:",
        onClick: this.forwardConversation
      }, this.strings.get("stub.forward.tooltip")), " \u2013 ", React.createElement("a", {
        className: "link",
        href: "javascript:",
        onClick: this.printConversation
      }, this.strings.get("stub.print.tooltip")));
    }
  }]);

  return _ConversationFooter;
}(React.PureComponent);

_ConversationFooter.propTypes = {
  dispatch: PropTypes.func.isRequired
};
var ConversationFooter = ReactRedux.connect()(_ConversationFooter);