var tidybirdPane = `
    <splitter
	  id="tidybirdSplitter"
	  collapse="after"
	  orient="horizontal"
	  persist="state hidden"
    x-tidybird="added"
	/>
    <vbox
	  id="tidybirdPane"
	  height="300"
	  width="200"
	  persist="width height hidden"
    x-tidybird="added"
	>
	  <!--label>Move selected message(s) to:</label-->
	  <vbox id="tidybirdButtonList" x-tidybird="added">
		<!-- folder move buttons will be dynamically added here -->
	  </vbox>
    </vbox> 
`
