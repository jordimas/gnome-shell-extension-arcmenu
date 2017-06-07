JS=*.js
CSS=*.css
MD=*.md
JSON=*.json
TXT=AUTHORS COPYING
IMG=*.svg
DIRS=schemas locale

DEST=~/.local/share/gnome-shell/extensions/arc-menu@linxgem33.com


install:
	mkdir -p $(DEST)
	cp $(JS) $(CSS) $(JSON) $(MD) $(TXT) $(IMG) $(DEST)
	cp -r $(DIRS) $(DEST)
	
uninstall:
	rm -rfi $(DEST)
