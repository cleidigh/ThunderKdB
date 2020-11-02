FILES := \
	LICENSE \
	README.md \
	background-implementation.js \
	background.js \
	content/defaultPreferencesLoader.jsm \
	content/options-implementation.js \
	content/options.html \
	content/options.js \
	content/prefs.js \
	icon48.png \
	icon96.png \
	manifest.json \
	schema.json \
	$(nothing)

all: remote-content-by-folder.xpi

remote-content-by-folder.xpi: Makefile $(FILES)
	-rm -f $@.tmp
	zip -r $@.tmp $^
	mv -f $@.tmp $@

clean:
	-rm -f *.tmp *.xpi
