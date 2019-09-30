"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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

/* globals React, ReactRedux, PropTypes, StringBundle */

/* exported ConversationHeader */
var LINKS_REGEX = /((\w+):\/\/[^<>()'"\s]+|www(\.[-\w]+){2,})/;

var LinkifiedSubject =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(LinkifiedSubject, _React$PureComponent);

  function LinkifiedSubject(props) {
    var _this;

    _classCallCheck(this, LinkifiedSubject);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(LinkifiedSubject).call(this, props));
    _this.handleClick = _this.handleClick.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(LinkifiedSubject, [{
    key: "handleClick",
    value: function handleClick(event) {
      this.props.dispatch({
        type: "OPEN_LINK",
        url: event.target.title
      });
      event.preventDefault();
    }
  }, {
    key: "render",
    value: function render() {
      var subject = this.props.subject;

      if (this.props.loading) {
        subject = this.props.strings.get("stub.loading");
      } else if (!subject) {
        subject = this.props.strings.get("stub.no.subject");
      }

      if (LINKS_REGEX.test(this.props.subject)) {
        var contents = [];
        var text = subject;

        while (text && LINKS_REGEX.test(text)) {
          var matches = LINKS_REGEX.exec(text);

          var _text$split = text.split(matches[1]),
              _text$split2 = _toArray(_text$split),
              pre = _text$split2[0],
              post = _text$split2.slice(1);

          var link = React.createElement("a", {
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

        return React.createElement("div", {
          className: "subject boxFlex",
          title: this.props.subject
        }, React.createElement("span", null, contents));
      }

      return React.createElement("div", {
        className: "subject boxFlex",
        title: this.props.subject
      }, this.props.subject);
    }
  }]);

  return LinkifiedSubject;
}(React.PureComponent);

LinkifiedSubject.propTypes = {
  dispatch: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  strings: PropTypes.object.isRequired,
  subject: PropTypes.string.isRequired
};

var _ConversationHeader =
/*#__PURE__*/
function (_React$PureComponent2) {
  _inherits(_ConversationHeader, _React$PureComponent2);

  function _ConversationHeader(props) {
    var _this2;

    _classCallCheck(this, _ConversationHeader);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(_ConversationHeader).call(this, props));
    _this2.strings = new StringBundle("chrome://conversations/locale/pages.properties");
    _this2.archiveToolbar = _this2.archiveToolbar.bind(_assertThisInitialized(_this2));
    _this2["delete"] = _this2["delete"].bind(_assertThisInitialized(_this2));
    _this2.detachTab = _this2.detachTab.bind(_assertThisInitialized(_this2));
    _this2.expandCollapse = _this2.expandCollapse.bind(_assertThisInitialized(_this2));
    _this2.junkConversation = _this2.junkConversation.bind(_assertThisInitialized(_this2));
    _this2.toggleRead = _this2.toggleRead.bind(_assertThisInitialized(_this2));
    return _this2;
  }

  _createClass(_ConversationHeader, [{
    key: "archiveToolbar",
    value: function archiveToolbar(event) {
      this.props.dispatch({
        type: "ARCHIVE_CONVERSATION"
      });
    }
  }, {
    key: "delete",
    value: function _delete(event) {
      this.props.dispatch({
        type: "DELETE_CONVERSATION"
      });
    }
    /**
     * This function gathers various information, encodes it in a URL query
     * string, and then opens a regular chrome tab that contains our
     * conversation.
     */

  }, {
    key: "detachTab",
    value: function detachTab(event) {
      this.props.dispatch({
        type: "DETACH_TAB"
      });
    }
  }, {
    key: "expandCollapse",
    value: function expandCollapse(event) {
      this.props.dispatch({
        type: "TOGGLE_CONVERSATION_EXPANDED",
        expanded: !this.props.expanded
      });
    }
  }, {
    key: "junkConversation",
    value: function junkConversation(event) {
      // This callback is only activated when the conversation is not a
      //  conversation in a tab AND there's only one message in the conversation,
      //  i.e. the currently selected message
      this.props.dispatch({
        type: "MARK_AS_JUNK"
      });
    } // Mark the current conversation as read/unread. The conversation driver
    //  takes care of setting the right class on us whenever the state
    //  changes...

  }, {
    key: "toggleRead",
    value: function toggleRead(event) {
      this.props.dispatch({
        type: "TOGGLE_CONVERSATION_READ",
        read: !this.props.read
      });
    }
  }, {
    key: "render",
    value: function render() {
      return React.createElement("div", {
        className: "conversationHeaderWrapper"
      }, React.createElement("div", {
        className: "conversationHeader hbox"
      }, React.createElement(LinkifiedSubject, {
        dispatch: this.props.dispatch,
        loading: this.props.loading,
        strings: this.strings,
        subject: this.props.subject
      }), React.createElement("div", {
        className: "actions"
      }, React.createElement("button", {
        className: "button-flat",
        title: this.strings.get("stub.trash.tooltip"),
        onClick: this["delete"]
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#delete"
      }))), React.createElement("button", {
        className: "button-flat",
        title: this.strings.get("stub.archive.tooltip"),
        onClick: this.archiveToolbar
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#archive"
      }))), this.props.canJunk && React.createElement("button", {
        className: "button-flat junk-button",
        title: this.strings.get("stub.junk.tooltip"),
        onClick: this.junkConversation
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#whatshot"
      }))), React.createElement("button", {
        className: "button-flat",
        title: this.strings.get("stub.expand.tooltip"),
        onClick: this.expandCollapse
      }, React.createElement("svg", {
        className: "icon expand ".concat(this.props.expanded ? "collapse" : ""),
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        className: "expand-more",
        xlinkHref: "chrome://conversations/skin/material-icons.svg#expand_more"
      }), React.createElement("use", {
        className: "expand-less",
        xlinkHref: "chrome://conversations/skin/material-icons.svg#expand_less"
      }))), React.createElement("button", {
        className: "button-flat",
        title: this.strings.get("stub.read.tooltip"),
        onClick: this.toggleRead
      }, React.createElement("svg", {
        className: "icon read ".concat(this.props.read ? "" : "unread"),
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#new"
      }))), React.createElement("button", {
        className: "button-flat",
        title: this.strings.get("stub.detach.tooltip2"),
        onClick: this.detachTab
      }, React.createElement("svg", {
        className: "icon",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink"
      }, React.createElement("use", {
        xlinkHref: "chrome://conversations/skin/material-icons.svg#open_in_new"
      }))))));
    }
  }]);

  return _ConversationHeader;
}(React.PureComponent);

_ConversationHeader.propTypes = {
  canJunk: PropTypes.bool.isRequired,
  dispatch: PropTypes.func.isRequired,
  expanded: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  read: PropTypes.bool.isRequired,
  subject: PropTypes.string.isRequired
};
var ConversationHeader = ReactRedux.connect(function (state) {
  return state.summary;
})(_ConversationHeader);