/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals PropTypes, React, StringBundle, ActionButton */

/* exported MessageHeaderOptions */
class OptionsMoreMenu extends React.PureComponent {
  constructor(props) {
    super(props);
    this.strings = new StringBundle("chrome://conversations/locale/template.properties");
  }

  render() {
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

}

OptionsMoreMenu.propTypes = {
  multipleRecipients: PropTypes.bool.isRequired,
  recipientsIncludeLists: PropTypes.bool.isRequired,
  msgSendAction: PropTypes.func.isRequired
};

class MessageHeaderOptions extends React.PureComponent {
  constructor(props) {
    super(props);
    this.strings = new StringBundle("chrome://conversations/locale/template.properties");
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
    this.props.dispatch({ ...msg,
      msgUri: this.props.msgUri
    });
  }

  showDetails(event) {
    event.preventDefault();
    event.stopPropagation(); // Force a blur, so that the button looks correct after clicking.

    event.target.blur();
    this.props.dispatch({
      type: "MSG_SHOW_DETAILS",
      msgUri: this.props.msgUri,
      show: !this.props.detailsShowing
    });
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
    }, this.props.date)), this.props.expanded && React.createElement("span", {
      className: "mainActionButton"
    }, React.createElement(ActionButton, {
      callback: this.replyAction,
      className: "icon-link",
      type: actionButtonType
    })), this.props.expanded && React.createElement("span", {
      className: "details" + this.props.detailsShowing ? "details-hidden" : ""
    }, React.createElement("a", {
      className: "icon-link",
      onClick: this.showDetails,
      title: this.props.detailsShowing ? this.strings.get("hideDetails") : this.strings.get("details")
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: this.props.detailsShowing ? "chrome://conversations/skin/material-icons.svg#info" : "chrome://conversations/skin/material-icons.svg#info_outline"
    })))), this.props.expanded && React.createElement("span", {
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

}

MessageHeaderOptions.propTypes = {
  dispatch: PropTypes.func.isRequired,
  date: PropTypes.string.isRequired,
  detailsShowing: PropTypes.bool.isRequired,
  expanded: PropTypes.bool.isRequired,
  fullDate: PropTypes.string.isRequired,
  msgUri: PropTypes.string.isRequired,
  attachments: PropTypes.array.isRequired,
  multipleRecipients: PropTypes.bool.isRequired,
  recipientsIncludeLists: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired
};