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
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

// Constants
const SUPER_L = 'Super_L'

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
        
        //~ let shortcutsSettingsPage = new ShortcutsSettingsPage(this.settings);
        //~ notebook.append_page(shortcutsSettingsPage, shortcutsSettingsPage.title);


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


        this.add(vbox);
    }
});


/*
 * TODO: Shortcuts Settings Page
 */
const ShortcutsSettingsPage = new Lang.Class({
    Name: 'ShortcutsSettingsPage',
    Extends: ArcMenuNotebookPage,

    _init: function(settings, params) {
        this.parent(_('Menu Shortcuts'), settings, params);

        // Container for all general settings boxes
        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });
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
