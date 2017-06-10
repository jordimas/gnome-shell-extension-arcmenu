JS=*.js
CSS=*.css
MD=*.md
JSON=*.json
TXT=AUTHORS COPYING
DIRS=schemas locale

DEST=~/.local/share/gnome-shell/extensions/arc-menu@linxgem33.com


compile:
	glib-compile-schemas ./schemas

install: compile
	mkdir -p $(DEST)
	cp $(JS) $(CSS) $(JSON) $(MD) $(TXT) $(DEST)
	cp -r $(DIRS) $(DEST)
	
uninstall:
	rm -rf $(DEST)
