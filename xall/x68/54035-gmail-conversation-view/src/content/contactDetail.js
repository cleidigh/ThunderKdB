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

/* exported ContactDetail */
var _ContactDetail =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(_ContactDetail, _React$PureComponent);

  function _ContactDetail(props) {
    var _this;

    _classCallCheck(this, _ContactDetail);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(_ContactDetail).call(this, props));
    _this.strings = new StringBundle("chrome://conversations/locale/template.properties");
    _this.state = {
      expanded: false
    };
    _this.addContact = _this.addContact.bind(_assertThisInitialized(_this));
    _this.editContact = _this.editContact.bind(_assertThisInitialized(_this));
    _this.expandFooter = _this.expandFooter.bind(_assertThisInitialized(_this));
    _this.createFilter = _this.createFilter.bind(_assertThisInitialized(_this));
    _this.copyEmail = _this.copyEmail.bind(_assertThisInitialized(_this));
    _this.sendEmail = _this.sendEmail.bind(_assertThisInitialized(_this));
    _this.showInvolving = _this.showInvolving.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(_ContactDetail, [{
    key: "addContact",
    value: function addContact() {
      this.props.dispatch({
        type: "ADD_CONTACT",
        name: this.props.name,
        email: this.props.realEmail
      });
    }
  }, {
    key: "createFilter",
    value: function createFilter() {
      this.props.dispatch({
        type: "CREATE_FILTER",
        email: this.props.realEmail
      });
    }
  }, {
    key: "copyEmail",
    value: function copyEmail() {
      this.props.dispatch({
        type: "COPY_EMAIL",
        email: this.props.realEmail
      });
    }
  }, {
    key: "editContact",
    value: function editContact() {
      this.props.dispatch({
        type: "EDIT_CONTACT",
        name: this.props.name,
        email: this.props.realEmail
      });
    }
  }, {
    key: "expandFooter",
    value: function expandFooter() {
      this.setState({
        expanded: true
      });
    }
  }, {
    key: "sendEmail",
    value: function sendEmail() {
      this.props.dispatch({
        type: "SEND_EMAIL",
        name: this.props.name,
        email: this.props.realEmail
      });
    }
  }, {
    key: "showInvolving",
    value: function showInvolving() {
      this.props.dispatch({
        type: "SHOW_MESSAGES_INVOLVING",
        name: this.props.name,
        email: this.props.realEmail
      });
    }
  }, {
    key: "render",
    value: function render() {
      var name = this.props.name; // TODO: Show monospace?

      return React.createElement("div", {
        className: "tooltip",
        style: {
          left: this.props.left,
          top: this.props.top
        },
        fadein: this.props.fadeIn
      }, React.createElement("div", {
        className: "arrow"
      }), React.createElement("div", {
        className: "arrow inside"
      }), React.createElement("div", {
        className: "authorInfoContainer"
      }, React.createElement("div", {
        className: "authorInfo"
      }, React.createElement("span", {
        className: "name",
        title: name
      }, name), React.createElement("span", {
        className: "authorEmail"
      }, React.createElement("span", {
        className: "authorEmailAddress",
        title: this.props.realEmail
      }, this.props.realEmail), React.createElement("button", {
        className: "copyEmail",
        title: this.strings.get("copyEmail"),
        onClick: this.copyEmail
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#content_copy"
      }))))), React.createElement("div", {
        className: "authorPicture"
      }, React.createElement("img", {
        src: this.props.avatar
      }))), this.state.expanded && React.createElement("div", {
        className: "tipFooter hiddenFooter"
      }, React.createElement("button", {
        className: "createFilter",
        onClick: this.createFilter
      }, this.strings.get("createFilter")), this.props.hasCard == "false" ? React.createElement("button", {
        className: "addContact",
        title: this.strings.get("addToAb"),
        onClick: this.addContact
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#add"
      }))) : React.createElement("button", {
        className: "editContact",
        title: this.strings.get("editCardAb"),
        onClick: this.editContact
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#edit"
      })))), React.createElement("div", {
        className: "tipFooter"
      }, React.createElement("button", {
        className: "sendEmail",
        title: this.strings.get("sendEmail"),
        onClick: this.sendEmail
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#mail"
      }))), React.createElement("button", {
        className: "showInvolving",
        title: this.strings.get("recentConversations"),
        onClick: this.showInvolving
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#history"
      }))), !this.state.expanded && React.createElement("button", {
        className: "moreExpander",
        title: this.strings.get("more"),
        onClick: this.expandFooter
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#expand_more"
      })))));
    }
  }]);

  return _ContactDetail;
}(React.PureComponent);

_ContactDetail.propTypes = {
  dispatch: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  realEmail: PropTypes.string.isRequired,
  avatar: PropTypes.string.isRequired,
  hasCard: PropTypes.string.isRequired,
  left: PropTypes.number.isRequired,
  top: PropTypes.number.isRequired,
  fadeIn: PropTypes.string.isRequired
};
var ContactDetail = ReactRedux.connect()(_ContactDetail);