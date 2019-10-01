UseBccInsteadC.CustomizeToolbarWindowOverlay =
{
  onUnloadNeeded: false,

  onLoad: function()
  {
    // remove to avoid duplicate initialization
    removeEventListener("load", UseBccInsteadC.CustomizeToolbarWindowOverlay.onLoad, true);

    // if the opening window exposes a function we need to call on close, note it
    if(window.opener.UseBccInsteadCOnCustomizeClose)
    {
      UseBccInsteadC.CustomizeToolbarWindowOverlay.onUnloadNeeded = true;
    }
  },

  onUnload: function()
  {
    // remove to avoid duplicate initialization
    removeEventListener("unload", UseBccInsteadC.CustomizeToolbarWindowOverlay.onUnload, true);

    // if we need to do something, do it now
    if(UseBccInsteadC.CustomizeToolbarWindowOverlay.onUnloadNeeded)
    {
      window.opener.UseBccInsteadCOnCustomizeClose();
    }
  }
}

// this overlay's work is needed only on TB 3.2 and below
if(!UseBccInsteadC.UseBccInsteadCUtil.isTB3_3())
{
  window.addEventListener("load", UseBccInsteadC.CustomizeToolbarWindowOverlay.onLoad, true);
  window.addEventListener("unload", UseBccInsteadC.CustomizeToolbarWindowOverlay.onUnload, true);
}

