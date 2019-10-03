var dwSetting = {
  onOK: function() {
    dwWriteSettingChkbox('dwmailcopy_sender');
    dwWriteSettingChkbox('dwmailcopy_subject');
    dwWriteSettingChkbox('dwmailcopy_to');
    dwWriteSettingChkbox('dwmailcopy_cc');
    dwWriteSettingChkbox('dwmailcopy_bcc');
    dwWriteSettingChkbox('dwmailcopy_replyto');
    dwWriteSettingChkbox('dwmailcopy_message');
    dwWriteSettingChkbox('dwmailcopy_reverse');
  },
  onCancel: function() {
  },
  onLoad: function() {
    dwReadSetting('dwmailcopy_sender', true);
    dwReadSetting('dwmailcopy_subject', true);
    dwReadSetting('dwmailcopy_to', true);
    dwReadSetting('dwmailcopy_cc', true);
    dwReadSetting('dwmailcopy_bcc', true);
    dwReadSetting('dwmailcopy_replyto', true);
    dwReadSetting('dwmailcopy_message', true);
    dwReadSetting('dwmailcopy_reverse', false);
  }
};

