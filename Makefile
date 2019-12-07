# Basic Makefile

UUID = arc-menu@linxgem33.com
BASE_MODULES = extension.js stylesheet.css metadata.json README.md
EXTRA_MODULES = constants.js controller.js convenience.js helper.js menu.js menuWidgets.js placeDisplay.js prefs.js prefsWidgets.js search.js searchGrid.js utils.js 
MENU_LAYOUTS = menulayouts/arcmenu.js menulayouts/brisk.js menulayouts/elementary.js menulayouts/gnomedash.js menulayouts/gnomemenu.js menulayouts/mint.js menulayouts/redmond.js menulayouts/simple.js menulayouts/simple2.js menulayouts/ubuntudash.js menulayouts/whisker.js
MENU_TWEAKS = menulayouts/tweaks/tweaks.js
EXTRA_IMAGES = ArcMenu-logo.svg arc-menu-alt-symbolic.svg arc-menu-symbolic.svg color-preset.svg keyboard.svg
LAYOUT_IMAGES = layouts/arc-menu.svg layouts/brisk-menu.svg layouts/elementary-menu.svg layouts/gnome-dash-menu.svg layouts/gnome-menu.svg layouts/mint-menu.svg layouts/redmond-style-menu.svg layouts/simple-menu.svg layouts/simple-menu-2.svg layouts/ubuntu-dash-menu.svg layouts/whisker-menu.svg
TOLOCALIZE =  prefs.js menu.js menuWidgets.js search.js searchGrid.js placeDisplay.js controller.js menulayouts/arcmenu.js menulayouts/brisk.js menulayouts/elementary.js menulayouts/gnomedash.js menulayouts/gnomemenu.js menulayouts/mint.js menulayouts/redmond.js menulayouts/simple.js menulayouts/simple2.js menulayouts/ubuntudash.js menulayouts/whisker.js menulayouts/tweaks/tweaks.js
MSGSRC = $(wildcard po/*.po)
ifeq ($(strip $(DESTDIR)),)
	INSTALLBASE = $(HOME)/.local/share/gnome-shell/extensions
else
	INSTALLBASE = $(DESTDIR)/usr/share/gnome-shell/extensions
endif
INSTALLNAME = arc-menu@linxgem33.com

# The command line passed variable VERSION is used to set the version string
# in the metadata and in the generated zip-file. If no VERSION is passed, the
# version is pulled from the latest git tag and the current commit SHA1 is 
# added to the metadata
ifdef VERSION
	FILESUFFIX = _v$(VERSION)
else
	LATEST_TAG = $(shell git describe --match "v[0-9]*" --abbrev=0 --tags HEAD)
	VERSION = $(LATEST_TAG:v%=%)
	COMMIT = $(shell git rev-parse HEAD)
	FILESUFFIX =
endif

all: extension

clean:
	rm -f ./schemas/gschemas.compiled

extension: ./schemas/gschemas.compiled $(MSGSRC:.po=.mo)

./schemas/gschemas.compiled: ./schemas/org.gnome.shell.extensions.arc-menu.gschema.xml
	glib-compile-schemas ./schemas/

potfile: ./po/arc-menu.pot

mergepo: potfile
	for l in $(MSGSRC); do \
		msgmerge -U $$l ./po/arc-menu.pot; \
	done;

./po/arc-menu.pot: $(TOLOCALIZE) 
	mkdir -p po
	xgettext -k_ -kN_ -o po/arc-menu.pot --package-name "Arc Menu" $(TOLOCALIZE)

./po/%.mo: ./po/%.po
	msgfmt -c $< -o $@

install: install-local

install-local: _build
	rm -rf $(INSTALLBASE)/$(INSTALLNAME)
	mkdir -p $(INSTALLBASE)/$(INSTALLNAME)
	cp -r ./_build/* $(INSTALLBASE)/$(INSTALLNAME)/
	-rm -fR _build
	echo done

zip-file: _build
	cd _build ; \
	zip -qr "$(UUID)$(FILESUFFIX).zip" .
	mv _build/$(UUID)$(FILESUFFIX).zip ./
	-rm -fR _build

_build: all
	-rm -fR ./_build
	mkdir -p _build
	cp $(BASE_MODULES) $(EXTRA_MODULES) _build
	mkdir -p _build/menulayouts
	cp $(MENU_LAYOUTS) _build/menulayouts/
	mkdir -p _build/menulayouts/tweaks
	cp $(MENU_TWEAKS) _build/menulayouts/tweaks/
	mkdir -p _build/media
	cd media ; cp $(EXTRA_IMAGES) ../_build/media/
	mkdir -p _build/media/layouts
	cd media ; cp $(LAYOUT_IMAGES) ../_build/media/layouts
	mkdir -p _build/schemas
	cp schemas/*.xml _build/schemas/
	cp schemas/gschemas.compiled _build/schemas/
	mkdir -p _build/locale
	for l in $(MSGSRC:.po=.mo) ; do \
		lf=_build/locale/`basename $$l .mo`; \
		mkdir -p $$lf; \
		mkdir -p $$lf/LC_MESSAGES; \
		cp $$l $$lf/LC_MESSAGES/arc-menu.mo; \
	done;
ifneq ($(and $(COMMIT),$(VERSION)),)
	sed -i 's/"version": [[:digit:]][[:digit:]]*/"version": $(VERSION),\n"commit": "$(COMMIT)"/'  _build/metadata.json;
else ifneq ($(VERSION),)
	sed -i 's/"version": [[:digit:]][[:digit:]]*/"version": $(VERSION)/'  _build/metadata.json;
endif
