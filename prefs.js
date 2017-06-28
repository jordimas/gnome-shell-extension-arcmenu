/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2017 LinxGem33, lexruee. 
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
 
// Import Libraries
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

// Constants
const SUPER_L = 'Super_L'
const MENU_POSITION = {
    Left: 0,
    Center: 1,
    Right: 2
};

/*
 * Arc Menu Preferences Widget
 */
const ArcMenuPreferencesWidget= new GObject.Class({
    Name: 'ArcMenu.ArcMenuPreferencesWidget',
    GTypeName: 'ArcMenuPreferencesWidget',
    Extends: Gtk.Box,

    _init: function(params) {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            border_width: 5
        });
        this.settings = Convenience.getSettings(Me.metadata['settings-schema']);
        
        let notebook = new ArcMenuNotebook();
        
        let generalSettingsPage = new GeneralSettingsPage(this.settings);
        notebook.append_page(generalSettingsPage, generalSettingsPage.title);

        let aboutPage = new AboutPage(this.settings);
        notebook.append_page(aboutPage, aboutPage.title);


        this.add(notebook);
    }
});

/*
 * Arc Menu Notebook
 */
const ArcMenuNotebook = new GObject.Class({
    Name: 'ArcMenu.ArcMenuNotebook',
    GTypeName: 'ArcMenuNotebook',
    Extends: Gtk.Notebook,

    _init: function(params) {
        this.parent(params);
    }
});

/*
 * Arc Menu Notebook Page
 */
const ArcMenuNotebookPage = new GObject.Class({
    Name: 'ArcMenu.ArcMenuNotebookPage',
    GTypeName: 'ArcMenuNotebookPage',
    Extends: Gtk.Box,

    _init: function(title, settings, params) {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL,
            margin_left: 10,
            margin_right: 10,
            margin_bottom: 20
        });
        this.settings = settings;

        this.title = new Gtk.Label({
            label: _("<b>" + title + "</b>"),
            use_markup: true,
            xalign: 0
        });
    }
});

/*
 * General Settings Page
 */
const GeneralSettingsPage = new Lang.Class({
    Name: 'GeneralSettingsPage',
    Extends: ArcMenuNotebookPage,
    
    _init: function(settings, params) {
        this.parent(_('General'), settings, params);
        
        // Container for all general settings boxes
        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });

        /*
         * Hot Corner Box
         */
        let disableHotCornerBox = new Gtk.Box({
            spacing: 20,
            orientation: Gtk.Orientation.HORIZONTAL,
            homogeneous: false,
            margin_left: 5,
            margin_top: 5,
            margin_bottom: 5,
            margin_right: 5
        });
        let disableHotCornerLabel = new Gtk.Label({
            label: _("Disable activities hot corner"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let disableHotCornerSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        disableHotCornerSwitch.set_active(this.settings.get_boolean('disable-activities-hotcorner'));
        disableHotCornerSwitch.connect('notify::active', Lang.bind(this, function(check) {
            this.settings.set_boolean('disable-activities-hotcorner', check.get_active());
        }));
        disableHotCornerBox.add(disableHotCornerLabel);
        disableHotCornerBox.add(disableHotCornerSwitch);
        vbox.add(disableHotCornerBox);

        /*
         * Menu Hotkey Box
         */
        let enableMenuHotkeyBox = new Gtk.Box({
            spacing: 20,
            orientation: Gtk.Orientation.HORIZONTAL,
            homogeneous: false,
            margin_left: 5,
            margin_top: 5,
            margin_bottom: 5,
            margin_right: 5
        });
        let enableMenuHotkeyLabel = new Gtk.Label({
            label: _("Set menu hotkey"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let menuHotkeyCombo = new Gtk.ComboBoxText({ halign:Gtk.Align.END });
        menuHotkeyCombo.append_text(_("Undefined"));
        menuHotkeyCombo.append_text(_("Left Super Key"));
        menuHotkeyCombo.append_text(_("Right Super Key"));
        menuHotkeyCombo.set_active(this.settings.get_enum('menu-hotkey'));
        menuHotkeyCombo.connect('changed', Lang.bind (this, function(widget) {
                this.settings.set_enum('menu-hotkey', widget.get_active());
        }));
        enableMenuHotkeyBox.add(enableMenuHotkeyLabel);
        enableMenuHotkeyBox.add(menuHotkeyCombo);
        vbox.add(enableMenuHotkeyBox);

        /*
         * Menu Keybinding Box
         */
        let menuKeybindingBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });
        let enableMenuKeybindingBox = new Gtk.Box({
            spacing: 20,
            orientation: Gtk.Orientation.HORIZONTAL,
            homogeneous: false,
            margin_left: 5,
            margin_top: 5,
            margin_right: 5
        });
        let enableMenuKeybindingLabel = new Gtk.Label({
            label: _("Enable custom menu keybinding"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let menuKeybindingDescriptionBox = new Gtk.Box({
            spacing: 20,
            orientation: Gtk.Orientation.HORIZONTAL,
            homogeneous: false,
            margin_left: 5,
            margin_bottom: 5,
            margin_right: 5
        });
        let menuKeybindingDescriptionLabel = new Gtk.Label({
            label: _("Syntax: <Shift>, <Ctrl>, <Alt>, <Super>")
        });

        let enableMenuKeybindingSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        enableMenuKeybindingSwitch.set_active(this.settings.get_boolean('enable-menu-keybinding'));
        enableMenuKeybindingSwitch.connect('notify::active', Lang.bind(this, function(check) {
        this.settings.set_boolean('enable-menu-keybinding', check.get_active());
        }));
        let menuKeybindingEntry = new Gtk.Entry({ halign: Gtk.Align.END });
        menuKeybindingEntry.set_width_chars(15);
        menuKeybindingEntry.set_text(this.settings.get_string('menu-keybinding-text'));
        menuKeybindingEntry.connect('changed', Lang.bind(this, function(entry) {
            let menuKeybinding = entry.get_text();
            //TODO: catch possible user mistakes
            this.settings.set_string('menu-keybinding-text', menuKeybinding);
            // Always deactivate the menu keybinding after it has been changed.
            // By that we avoid pssible "UX" or sync bugs.
            enableMenuKeybindingSwitch.set_active(false);
        }));
        enableMenuKeybindingBox.add(enableMenuKeybindingLabel);
        enableMenuKeybindingBox.add(menuKeybindingEntry);
        enableMenuKeybindingBox.add(enableMenuKeybindingSwitch);
        menuKeybindingBox.add(enableMenuKeybindingBox);
        menuKeybindingDescriptionBox.add(menuKeybindingDescriptionLabel);
        menuKeybindingBox.add(menuKeybindingDescriptionBox);
        vbox.add(menuKeybindingBox);

         /*
         * Menu Position Box
         */
         let menuPositionBox = new Gtk.Box({
            spacing: 20,
            orientation: Gtk.Orientation.HORIZONTAL,
            homogeneous: false,
            margin_left: 5,
            margin_top: 5,
            margin_bottom: 5,
            margin_right: 5
        });
        let menuPositionBoxLabel = new Gtk.Label({
            label: _("Menu position in panel"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });

        let menuPositionLeftButton = new Gtk.RadioButton({
        	label: _('Left')
        });
        let menuPositionCenterButton = new Gtk.RadioButton({
        label: _('Center'),
        group: menuPositionLeftButton
        });
        let menuPositionRightButton = new Gtk.RadioButton({
            label: _('Right'),
            group: menuPositionLeftButton
        });
        // callback handlers for the radio buttons
        menuPositionLeftButton.connect('clicked', Lang.bind(this, function() {
            this.settings.set_enum('position-in-panel', MENU_POSITION.Left);
        }));
        menuPositionCenterButton.connect('clicked', Lang.bind(this, function() {
            this.settings.set_enum('position-in-panel', MENU_POSITION.Center);
        }));
        menuPositionRightButton.connect('clicked', Lang.bind(this, function() {
            this.settings.set_enum('position-in-panel', MENU_POSITION.Right);
        }));

        switch(this.settings.get_enum('position-in-panel')) {
            case MENU_POSITION.Left:
                menuPositionLeftButton.set_active(true);
                break;
            case MENU_POSITION.Center:
                menuPositionCenterButton.set_active(true);
                break;
            case MENU_POSITION.Right:
                menuPositionRightButton.set_active(true);
                break;
		}

        menuPositionBox.add(menuPositionBoxLabel);
        menuPositionBox.add(menuPositionLeftButton);
        menuPositionBox.add(menuPositionCenterButton);
        menuPositionBox.add(menuPositionRightButton);
        vbox.add(menuPositionBox);

        this.add(vbox);
    }
});

/*
 * About Page
 */
const AboutPage = new Lang.Class({
    Name: 'AboutPage',
    Extends: ArcMenuNotebookPage,

    _init: function(settings, params) {
        this.parent(_('About'), settings, params);

        // Container for all GUI elements
        let vbox = new Gtk.VBox({
            margin_top: 24,
            margin_bottom: 24,
            spacing: 5,
            expand: false
        });

        // Use meta information from metadata.json
        let releaseVersion = Me.metadata['version'] || 'bleeding-edge ;-)';
        let projectName = Me.metadata['name'];
        let projectDescription = Me.metadata['description'];
        let projectUrl = Me.metadata['url'];

        // Create GUI elements
        // Create the image box
        let logoPath = Me.path + '/media/logo.png'; //TODO: path your logo
        let [imageWidth, imageHeight] = [216, 150]; //TODO: set correct image size
        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(logoPath, imageWidth, imageHeight);
        let arcMenuImage = new Gtk.Image({ pixbuf: pixbuf });
        let arcMenuImageBox = new Gtk.VBox({
            margin_top:5,
            margin_bottom: 5,
            expand: false
        });
        arcMenuImageBox.add(arcMenuImage);

        // Create the info box
        let arcMenuInfoBox = new Gtk.VBox({
            margin_top:5,
            margin_bottom: 5,
            expand: false
        });
        let arcMenuLabel = new Gtk.Label({
            label: '<b>' + _('Arc-Menu') + '</b>',
            use_markup: true,
            expand: false
        });
        let versionLabel = new Gtk.Label({
        	label:  _('version: ') + releaseVersion,
        	expand: false
        });
        let projectDescriptionLabel = new Gtk.Label({
        	label:  _(projectDescription),
        	expand: false
        });
        let projectLinkButton = new Gtk.LinkButton({
            label: _('Webpage'),
            uri: projectUrl,
            expand: false
        });
        arcMenuInfoBox.add(arcMenuLabel);
        arcMenuInfoBox.add(versionLabel);
        arcMenuInfoBox.add(projectDescriptionLabel);
        arcMenuInfoBox.add(projectLinkButton);

        // Create the GNU software box
        let gnuSofwareLabel = new Gtk.Label({
            label: '<span size="small">' + _('This program comes with absolutely no warranty.') + '\n' +
            ('See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">GNU General Public License, version 2 or later</a> for details.</span>'),
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            expand: true
        });
        let gnuSofwareLabelBox = new Gtk.VBox({});
        gnuSofwareLabelBox.pack_end(gnuSofwareLabel,false, false, 0);

        vbox.add(arcMenuImageBox);
        vbox.add(arcMenuInfoBox);
        vbox.add(gnuSofwareLabelBox);

        this.add(vbox);
    }
});

/*
 * TODO: Places Settings Page
 */
const PlacesSettingsPage = new Lang.Class({
    Name: 'PlacesSettingsPage',
    Extends: ArcMenuNotebookPage,

    _init: function(settings, params) {
        this.parent(_('Places'), settings, params);
        
        // Container for all general settings boxes
        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });
    }
});

// Initialize menu language translations
function init() {
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    let widget = new ArcMenuPreferencesWidget();
    widget.show_all();
    return widget;
}
