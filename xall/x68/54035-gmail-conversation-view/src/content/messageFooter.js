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

/* globals printConversation, PropTypes, React, ReactRedux, StringBundle,
           ActionButton */

/* exported MessageFooter */
var _MessageFooter =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(_MessageFooter, _React$PureComponent);

  function _MessageFooter() {
    var _this;

    _classCallCheck(this, _MessageFooter);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(_MessageFooter).call(this));
    _this.strings = new StringBundle("chrome://conversations/locale/template.properties");
    _this.action = _this.action.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(_MessageFooter, [{
    key: "action",
    value: function action(msg) {
      msg.msgUri = this.props.msgUri;
      this.props.dispatch(msg);
    }
  }, {
    key: "render",
    value: function render() {
      return React.createElement("div", {
        className: "footerActions"
      }, this.props.isDraft && React.createElement(ActionButton, {
        callback: this.action,
        type: "draft"
      }), !this.props.isDraft && React.createElement(ActionButton, {
        callback: this.action,
        type: "reply"
      }), !this.props.isDraft && this.props.multipleRecipients && React.createElement(ActionButton, {
        callback: this.action,
        type: "replyAll"
      }), !this.props.isDraft && this.props.recipientsIncludeLists && React.createElement(ActionButton, {
        callback: this.action,
        type: "replyList"
      }), !this.props.isDraft && React.createElement(ActionButton, {
        callback: this.action,
        type: "forward"
      }));
    }
  }]);

  return _MessageFooter;
}(React.PureComponent);

_MessageFooter.propTypes = {
  dispatch: PropTypes.func.isRequired,
  msgUri: PropTypes.string.isRequired,
  multipleRecipients: PropTypes.bool.isRequired,
  recipientsIncludeLists: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired
};
var MessageFooter = ReactRedux.connect()(_MessageFooter);