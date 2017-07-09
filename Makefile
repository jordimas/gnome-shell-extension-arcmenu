# Basic Makefile with bits inspired by dash-to-dock

UUID=arc-menu@linxgem33.com
DEST=~/.local/share/gnome-shell/extensions/$(UUID)
ZIP_FILE=$(UUID).zip
POT_FILE=./po/arc-menu.pot
TO_LOCALIZE=prefs.js menu.js

JS=*.js
CSS=*.css
MD=*.md
JSON=*.json
TXT=AUTHORS COPYING
DIRS=schemas locale media po
MSG_SRC=$(wildcard ./po/*.po)


clean:
	rm -f ./schemas/gschemas.compiled
	rm -rf ./build
	rm -f $(ZIP_FILE)

install: build
	mkdir -p $(DEST)
	cp -r ./build/* $(DEST)
	rm -rf ./build
	
uninstall:
	rm -rf $(DEST)

translations: $(POT_FILE)
	for l in $(MSG_SRC); do \
		msgmerge -U $$l $(POT_FILE); \
	done;

potfile: $(POT_FILE)

$(POT_FILE): $(TO_LOCALIZE)
	echo $(POT_FILE)
	xgettext --from-code=UTF-8 -k --keyword=_ --keyword=N_ --add-comments='Translators:' \
		-o $(POT_FILE) --package-name "Arc Menu" $(TO_LOCALIZE)

./po/%.mo: ./po/%.po
	msgfmt -c $< -o $@

compile:
	glib-compile-schemas ./schemas

build: translations compile
	mkdir -p ./build
	cp $(JS) $(CSS) $(JSON) $(MD) $(TXT) ./build
	cp -r $(DIRS) ./build

zip-file: build
	zip -qr $(ZIP_FILE) ./build
	rm -rf ./build
