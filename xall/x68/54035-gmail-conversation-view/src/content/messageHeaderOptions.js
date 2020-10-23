/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals PropTypes, React, ActionButton, SvgIcon, messageActions */

/* exported MessageHeaderOptions */
class OptionsMoreMenu extends React.PureComponent {
  render() {
    return /*#__PURE__*/React.createElement("div", {
      className: "tooltip tooltip-menu menu"
    }, /*#__PURE__*/React.createElement("div", {
      className: "arrow"
    }), /*#__PURE__*/React.createElement("div", {
      className: "arrow inside"
    }), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", {
      className: "action-reply"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "reply"
    })), this.props.multipleRecipients && /*#__PURE__*/React.createElement("li", {
      className: "action-replyAll"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "replyAll"
    })), this.props.recipientsIncludeLists && /*#__PURE__*/React.createElement("li", {
      className: "action-replyList"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "replyList"
    })), /*#__PURE__*/React.createElement("li", {
      className: "action-editNew"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "editAsNew"
    })), /*#__PURE__*/React.createElement("li", {
      className: "action-forward dropdown-sep"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "forward"
    })), /*#__PURE__*/React.createElement("li", {
      className: "action-archive"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "archive"
    })), /*#__PURE__*/React.createElement("li", {
      className: "action-delete"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "delete"
    })), /*#__PURE__*/React.createElement("li", {
      className: "action-classic"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "classic"
    })), /*#__PURE__*/React.createElement("li", {
      className: "action-source"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.props.msgSendAction,
      className: "optionsButton",
      showString: true,
      type: "source"
    }))));
  }

}

OptionsMoreMenu.propTypes = {
  multipleRecipients: PropTypes.bool.isRequired,
  recipientsIncludeLists: PropTypes.bool.isRequired,
  msgSendAction: PropTypes.func.isRequired
};

class MessageHeaderOptions extends React.PureComponent {
  constructor(props) {
    super(props);
    this.replyAction = this.replyAction.bind(this);
    this.showDetails = this.showDetails.bind(this);
    this.displayMenu = this.displayMenu.bind(this);
    this.state = {
      expanded: false
    };
  }

  componentWillUnmount() {
    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener);
      document.removeEventListener("keypress", this.keyListener);
      document.removeEventListener("blur", this.keyListener);
      this.clickListener = null;
      this.keyListener = null;
    }
  }

  replyAction(msg, event) {
    event.stopPropagation();
    event.preventDefault();
    const payload = {
      id: this.props.id,
      shiftKey: msg.shiftKey
    };
    let action = null;

    switch (msg.type) {
      case "draft":
        action = messageActions.editDraft(payload);
        break;

      case "reply":
        action = messageActions.reply(payload);
        break;

      case "replyAll":
        action = messageActions.replyAll(payload);
        break;

      case "replyList":
        action = messageActions.replyList(payload);
        break;

      case "forward":
        action = messageActions.forward(payload);
        break;

      case "editAsNew":
        action = messageActions.editAsNew(payload);
        break;

      case "archive":
        action = messageActions.archive({
          id: this.props.id
        });
        break;

      case "delete":
        action = messageActions.delete({
          id: this.props.id
        });
        break;

      case "classic":
        action = messageActions.openClassic(payload);
        break;

      case "source":
        action = messageActions.openSource(payload);
        break;

      default:
        console.error("Don't know how to create an action for", msg);
    }

    this.props.dispatch(action);
  }

  showDetails(event) {
    event.preventDefault();
    event.stopPropagation(); // Force a blur, so that the button looks correct after clicking.

    event.target.blur();
    this.props.dispatch(messageActions.showMsgDetails({
      id: this.props.id,
      detailsShowing: !this.props.detailsShowing
    }));
  }

  displayMenu(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.clickListener) {
      this.clickListener = event => {
        this.clearMenu();
      };

      this.keyListener = event => {
        if (event.keyCode == KeyEvent.DOM_VK_ESCAPE) {
          this.clearMenu();
        }
      };

      this.onBlur = event => {
        this.clearMenu();
      };

      document.addEventListener("click", this.clickListener);
      document.addEventListener("keypress", this.keyListener);
      document.addEventListener("blur", this.onBlur);
    }

    this.setState(prevState => ({
      expanded: !prevState.expanded
    }));
  }

  clearMenu() {
    this.setState({
      expanded: false
    });

    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener);
      document.removeEventListener("keypress", this.keyListener);
      document.removeEventListener("blur", this.keyListener);
      this.clickListener = null;
      this.keyListener = null;
    }
  }

  render() {
    let actionButtonType = "reply";

    if (this.props.recipientsIncludeLists) {
      actionButtonType = "replyList";
    } else if (this.props.multipleRecipients) {
      actionButtonType = "replyAll";
    } else if (this.props.isDraft) {
      actionButtonType = "draft";
    }

    return /*#__PURE__*/React.createElement("div", {
      className: "options"
    }, !!this.props.attachments.length && /*#__PURE__*/React.createElement("span", {
      className: "attachmentIcon"
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "attachment"
    })), /*#__PURE__*/React.createElement("span", {
      className: "date"
    }, /*#__PURE__*/React.createElement("span", {
      title: this.props.fullDate
    }, this.props.date)), this.props.expanded && /*#__PURE__*/React.createElement("span", {
      className: "mainActionButton"
    }, /*#__PURE__*/React.createElement(ActionButton, {
      callback: this.replyAction,
      className: "icon-link",
      type: actionButtonType
    })), this.props.expanded && /*#__PURE__*/React.createElement("span", {
      className: "details" + this.props.detailsShowing ? "details-hidden" : ""
    }, /*#__PURE__*/React.createElement("a", {
      className: "icon-link",
      onClick: this.showDetails,
      title: browser.i18n.getMessage(this.props.detailsShowing ? "message.hideDetails.tooltip" : "message.showDetails.tooltip")
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: this.props.detailsShowing ? "info" : "info_outline"
    }))), this.props.expanded && /*#__PURE__*/React.createElement("span", {
      className: "dropDown"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: this.displayMenu,
      className: "icon-link top-right-more",
      title: browser.i18n.getMessage("message.moreMenu.tooltip")
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "more_vert"
    })), this.state.expanded && /*#__PURE__*/React.createElement(OptionsMoreMenu, {
      recipientsIncludeLists: this.props.recipientsIncludeLists,
      msgSendAction: this.replyAction,
      multipleRecipients: this.props.multipleRecipients
    })));
  }

}

MessageHeaderOptions.propTypes = {
  dispatch: PropTypes.func.isRequired,
  date: PropTypes.string.isRequired,
  detailsShowing: PropTypes.bool.isRequired,
  expanded: PropTypes.bool.isRequired,
  fullDate: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  attachments: PropTypes.array.isRequired,
  multipleRecipients: PropTypes.bool.isRequired,
  recipientsIncludeLists: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired
};