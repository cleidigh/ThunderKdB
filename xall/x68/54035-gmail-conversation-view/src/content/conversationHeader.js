/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals React, ReactRedux, PropTypes, SvgIcon, messageActions */

/* exported ConversationHeader */
const LINKS_REGEX = /((\w+):\/\/[^<>()'"\s]+|www(\.[-\w]+){2,})/;

class LinkifiedSubject extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    this.props.dispatch({
      type: "OPEN_LINK",
      url: event.target.title
    });
    event.preventDefault();
  }

  render() {
    let subject = this.props.subject;

    if (this.props.loading) {
      subject = browser.i18n.getMessage("message.loading");
    } else if (!subject) {
      subject = browser.i18n.getMessage("message.noSubject");
    }

    if (LINKS_REGEX.test(this.props.subject)) {
      let contents = [];
      let text = subject;

      while (text && LINKS_REGEX.test(text)) {
        let matches = LINKS_REGEX.exec(text);
        let [pre, ...post] = text.split(matches[1]);
        let link = /*#__PURE__*/React.createElement("a", {
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

      return /*#__PURE__*/React.createElement("div", {
        className: "subject boxFlex",
        title: this.props.subject
      }, /*#__PURE__*/React.createElement("span", null, contents));
    }

    return /*#__PURE__*/React.createElement("div", {
      className: "subject boxFlex",
      title: this.props.subject
    }, this.props.subject);
  }

}

LinkifiedSubject.propTypes = {
  dispatch: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  subject: PropTypes.string.isRequired
};

class _ConversationHeader extends React.PureComponent {
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
    this.props.dispatch(messageActions.archiveConversation());
  }

  delete(event) {
    this.props.dispatch(messageActions.deleteConversation());
  }
  /**
   * This function gathers various information, encodes it in a URL query
   * string, and then opens a regular chrome tab that contains our
   * conversation.
   */


  detachTab(event) {
    this.props.dispatch(messageActions.detachTab());
  }

  get areSomeMessagesCollapsed() {
    var _this$props$msgData;

    return !((_this$props$msgData = this.props.msgData) === null || _this$props$msgData === void 0 ? void 0 : _this$props$msgData.some(msg => msg.expanded));
  }

  get areSomeMessagesUnread() {
    var _this$props$msgData2;

    return !((_this$props$msgData2 = this.props.msgData) === null || _this$props$msgData2 === void 0 ? void 0 : _this$props$msgData2.some(msg => !msg.read));
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
    this.props.dispatch({
      type: "TOGGLE_CONVERSATION_EXPANDED",
      expand: this.areSomeMessagesCollapsed
    });
  }

  junkConversation(event) {
    // This callback is only activated when the conversation is not a
    //  conversation in a tab AND there's only one message in the conversation,
    //  i.e. the currently selected message
    this.props.dispatch({
      type: "MARK_AS_JUNK",
      id: this.props.msgData[0].id,
      isJunk: true
    });
  } // Mark the current conversation as read/unread. The conversation driver
  //  takes care of setting the right class on us whenever the state
  //  changes...


  toggleRead(event) {
    this.props.dispatch(messageActions.toggleConversationRead({
      read: this.areSomeMessagesUnread
    }));
  }

  render() {
    document.title = this.props.subject;
    return /*#__PURE__*/React.createElement("div", {
      className: "conversationHeaderWrapper"
    }, /*#__PURE__*/React.createElement("div", {
      className: "conversationHeader hbox"
    }, /*#__PURE__*/React.createElement(LinkifiedSubject, {
      dispatch: this.props.dispatch,
      loading: this.props.loading,
      subject: this.props.subject
    }), /*#__PURE__*/React.createElement("div", {
      className: "actions"
    }, /*#__PURE__*/React.createElement("button", {
      className: "button-flat",
      title: browser.i18n.getMessage("message.trash.tooltip"),
      onClick: this.delete
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "delete"
    })), /*#__PURE__*/React.createElement("button", {
      className: "button-flat",
      title: browser.i18n.getMessage("message.archive.tooltip"),
      onClick: this.archiveToolbar
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "archive"
    })), this.canJunk && /*#__PURE__*/React.createElement("button", {
      className: "button-flat junk-button",
      title: browser.i18n.getMessage("message.junk.tooltip"),
      onClick: this.junkConversation
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "whatshot"
    })), /*#__PURE__*/React.createElement("button", {
      className: "button-flat",
      title: browser.i18n.getMessage("message.expand.tooltip"),
      onClick: this.expandCollapse
    }, /*#__PURE__*/React.createElement("svg", {
      className: `icon expand ${this.areSomeMessagesCollapsed ? "" : "collapse"}`,
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, /*#__PURE__*/React.createElement("use", {
      className: "expand-more",
      xlinkHref: "material-icons.svg#expand_more"
    }), /*#__PURE__*/React.createElement("use", {
      className: "expand-less",
      xlinkHref: "material-icons.svg#expand_less"
    }))), /*#__PURE__*/React.createElement("button", {
      className: `button-flat ${this.areSomeMessagesUnread ? "unread" : ""}`,
      title: browser.i18n.getMessage("message.read.tooltip"),
      onClick: this.toggleRead
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "new"
    })), /*#__PURE__*/React.createElement("button", {
      className: "button-flat",
      title: browser.i18n.getMessage("message.detach.tooltip"),
      onClick: this.detachTab
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "open_in_new"
    })))));
  }

}

_ConversationHeader.propTypes = {
  dispatch: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  subject: PropTypes.string.isRequired,
  msgData: PropTypes.array.isRequired
};
const ConversationHeader = ReactRedux.connect(state => {
  return {
    loading: state.summary.loading,
    subject: state.summary.subject,
    msgData: state.messages.msgData
  };
})(_ConversationHeader);