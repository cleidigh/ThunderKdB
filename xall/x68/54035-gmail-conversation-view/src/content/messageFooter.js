/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals PropTypes, React, ActionButton */

/* exported MessageFooter */
class MessageFooter extends React.PureComponent {
  constructor(props) {
    super(props);
    this.action = this.action.bind(this);
  }

  action(msg) {
    msg.msgUri = this.props.msgUri;
    this.props.dispatch(msg);
  }

  render() {
    return React.createElement("div", {
      className: "messageFooter"
    }, React.createElement("div", {
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
    })));
  }

}

MessageFooter.propTypes = {
  dispatch: PropTypes.func.isRequired,
  msgUri: PropTypes.string.isRequired,
  multipleRecipients: PropTypes.bool.isRequired,
  recipientsIncludeLists: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired
};