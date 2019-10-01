UseBccInsteadC.extendedRecipientsColumnHandler =
{
  getCellText: function(row, col)
  {
    // get the message's header so that we can extract the TO, CC, and BCC fields
    var hdr = gDBView.getMsgHdrAt(row);

    //UseBccInsteadC.extendedReipientsColumn.enumProperties(hdr);
    return UseBccInsteadC.extendedReipientsColumn.buildCellResultString(hdr);
  },

  getSortStringForRow: function(hdr)
  {
    return UseBccInsteadC.extendedReipientsColumn.buildCellResultString(hdr);
  },

  isString: function()
  {
    return true;
  },

  getCellProperties: function(row, col)
  {
    return "";
  },

  getRowProperties: function(row)
  {
    return "";
  },

  getImageSrc: function(row, col)
  {
    return null;
  },

  getSortLongForRow: function(hdr)
  {
    return 0;
  }
}

