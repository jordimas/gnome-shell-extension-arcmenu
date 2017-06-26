/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2017 LinxGem33, lexruee 
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
const Lang = imports.lang;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Shell = imports.gi.Shell;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Constants
const SUPER_L = 'Super_L';
const EMPTY_STRING = '';
const MUTTER_SCHEMA = 'org.gnome.mutter';
const WM_KEYBINDINGS_SCHEMA = 'org.gnome.desktop.wm.keybindings';
const ARC_MENU_HOT_KEY = {
    0: EMPTY_STRING, // Note: an empty string is evaluated to false
    1: 'Super_L',
    2: 'Super_R'
};


/**
 * The Menu HotKeybinder class helps us to bind and unbind a menu hotkey
 * to the Arc Menu. Currently, valid hotkeys are Super_L and Super_R.
 */
const MenuHotKeybinder = new Lang.Class({
    Name: 'ArcMenu.MenuHotKeybinder',

    _init: function(settings, menuToggler) {
        this._settings = settings;
        this._menuToggler = menuToggler;
        this._mutterSettings = new Gio.Settings({ 'schema': MUTTER_SCHEMA });
        this._wmKeybindings = new Gio.Settings({ 'schema': WM_KEYBINDINGS_SCHEMA });
        this._keybindingHandlerId = Main.layoutManager.connect('startup-complete',
                                        Lang.bind(this, this._setKeybindingHandler));
        this._setKeybindingHandler();
    },

    // Enable the menu key binding
    enable: function() {
        let keybinding = this._getMenuHotKeybinding();
        if(keybinding == SUPER_L) {
            this._disableOverlayKey();
        } else {
            this._enableOverlayKey();
        }
        this._wmKeybindings.set_strv('panel-main-menu', [keybinding]);
    },

    // Disable the menu key binding
    disable: function() {
        // Restore the default settings
        if(this._isOverlayKeyDisabled()) {
            this._enableOverlayKey();
        }
        let defaultPanelMainMenu = this._wmKeybindings.get_default_value('panel-main-menu');
        this._wmKeybindings.set_value('panel-main-menu', defaultPanelMainMenu);
    },

    // Set the menu keybinding handler
    _setKeybindingHandler: function() {
        Main.wm.setCustomKeybindingHandler('panel-main-menu',
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
            Lang.bind(this, this._menuToggler));
    },

    // Get the menu key binding from the arc menu settings
    _getMenuHotKeybinding: function() {
        let pos = this._settings.get_enum('menu-hotkey');
        return ARC_MENU_HOT_KEY[pos];
    },

     // Check if the overlay keybinding is disabled in mutter
    _isOverlayKeyDisabled: function() {
        return this._mutterSettings.get_string('overlay-key') == EMPTY_STRING;
    },

    // Disable the overlay keybinding in mutter
    _disableOverlayKey: function() {
        // Simple hack to deactivate the overlay key by setting
        // the keybinding of the overlay key to an empty string
        this._mutterSettings.set_string('overlay-key', EMPTY_STRING);
    },

    // Enable and restore the default settings of the overlay key in mutter
    _enableOverlayKey: function() {
        this._mutterSettings.set_value('overlay-key', this._getDefaultOverlayKey());
    },

    // Get the default overelay keybinding from mutter
    _getDefaultOverlayKey: function() {
        return this._mutterSettings.get_default_value('overlay-key');
    },

    // Destroy this object
    destroy: function() {
        // Clean up and restore the default behaviour
        this.disable();
        if(this._keybindingHandlerId) {
            // Disconnect the keybinding handler
            Main.layoutManager.disconnect(this._keybindingHandlerId);
            this._keybindingHandlerId = null;
        }
    }
});

/**
 * The Keybinding Manager class allows us to bind and unbind keybindings
 * to a keybinding handler.
 */
const KeybindingManager = new Lang.Class({
    Name: 'ArcMenu.KeybindingManager',

    _init: function(settings) {
        this._settings = settings;
        this._keybindings = new Map();
    },

    // Bind a keybinding to a keybinding handler
    bind: function(keybindingNameKey, keybindingValueKey, keybindingHandler) {
        if(!this._keybindings.has(keybindingNameKey)) {
            this._keybindings.set(keybindingNameKey, keybindingValueKey);
            let keybinding = this._settings.get_string(keybindingNameKey);
            this._setKeybinding(keybindingNameKey, keybinding);

            Main.wm.addKeybinding(keybindingValueKey, this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
                Lang.bind(this, keybindingHandler));

            return true;
        }
        return false;
    },

    // Update all keybindings
    update: function() {
        let keybindings = this._keybindings.keys();
        keybindings.forEach(function(keybindingNameKey) {
            let keybinding = this._settings.get_string(keybindingNameKey);
            this._setKeybinding(keybindingNameKey, keybinding);
        });
    },

    // Set or update a keybinding in the Arc Menu settings
    _setKeybinding: function(keybindingNameKey, keybinding) {
        if(this._keybindings.has(keybindingNameKey)) {
            let keybindingValueKey = this._keybindings.get(keybindingNameKey);
            let [key, mods] = Gtk.accelerator_parse(keybinding);

            if (Gtk.accelerator_valid(key, mods)) {
                let shortcut = Gtk.accelerator_name(key, mods);
                this._settings.set_strv(keybindingValueKey, [shortcut]);
            } else {
                this._settings.set_strv(keybindingValueKey, []);
            }
        }
    },

    // Unbind a keybinding
    unbind: function(keybindingNameKey) {
        if(this._keybindings.has(keybindingNameKey)) {
            let keybindingValueKey = this._keybindings.get(keybindingNameKey);
            Main.wm.removeKeybinding(keybindingValueKey);
            this._keybindings.delete(keybindingNameKey);
            return true;
        }
        return false;
    },

    // Destroy this object
    destroy: function() {
        let keyIter = this._keybindings.keys();
        for(let i = 0; i < this._keybindings.size; i++) {
	        let keybindingNameKey = keyIter.next();
	        this.unbind(keybindingNameKey);
        }
    }
});

/**
 * The Hot Corner Manager class allows us to disable and enable
 * the gnome-shell hot corners.
 */
const HotCornerManager = new Lang.Class({
    Name: 'ArcMenu.HotCornerManager',

    _init: function() {
        this._hotCornersChangedId = null;
    },

    // Get all hot corners from the main layout manager
    getHotCorners: function() {
        return Main.layoutManager.hotCorners;
    },

    // Disable all hot corners
    disableHotCorners: function() {
        let hotCorners = this.getHotCorners();
        // Monkey patch each hot corner
        hotCorners.forEach(function(corner) {
            if(corner) {
                corner._toggleOverview = function() {};
                corner._pressureBarrier._trigger = function() {};
            }
        });
        if(!this._hotCornersChangedId) {
            this._hotCornersChangedId = Main.layoutManager.connect('hot-corners-changed',
                Lang.bind(this, function() {
                    this.disableHotcorners();
                }));
        }
    },

    // Enable all hot corners
    enableHotCorners: function() {
        if(this._hotCornersChangedId) { // Restore the default behaviour
            // Disconnect the callback and recreate the hot corners
            Main.layoutManager.disconnect(this._hotCornersChangedId);
            Main.layoutManager._updateHotCorners();
            this._hotCornersChangedId = null;
        }
    },
    
    // Destroy this object
    destroy: function() {
        // Clean up and restore the default behaviour
        if(this._hotCornersChangedId) {
            this.enableHotCorners();
        }
       this._hotCornersChangedId = null;
    }
});
