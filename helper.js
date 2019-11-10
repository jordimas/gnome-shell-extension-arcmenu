/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2017 LinxGem33
 * Copyright (C) 2017 Alexander Rüedlinger
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
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Gio, Gtk, Meta, Shell} = imports.gi;
const Constants = Me.imports.constants;
const Main = imports.ui.main;


// Local constants
const MUTTER_SCHEMA = 'org.gnome.mutter';

/**
 * The Menu HotKeybinder class helps us to bind and unbind a menu hotkey
 * to the Arc Menu. Currently, valid hotkeys are Super_L and Super_R.
 */
var MenuHotKeybinder = class {

    constructor(menuToggler) {
        this._menuToggler = menuToggler;
        this.hotKeyEnabled = false;
        this._mutterSettings = new Gio.Settings({ 'schema': MUTTER_SCHEMA });
        this.oldOverviewToggle = Main.overview.toggle;
        this._hotkeyMenuToggleId = Main.layoutManager.connect('startup-complete',
            this._updateHotkeyMenuToggle.bind(this));
        this._updateHotkeyMenuToggle();
    }

    // Set Main.overview.toggle to toggle Arc Menu instead
    enableHotKey(hotkey) {
        this._mutterSettings.set_string('overlay-key', hotkey);
        Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL |
            Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP);
        Main.overview.toggle = this._menuToggler.bind(this);
        this.hotKeyEnabled =  true;
    }

    // Set Main.overview.toggle to default function and default hotkey
    disableHotKey() {
        this._mutterSettings.set_value('overlay-key', this._getDefaultOverlayKey());
        Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL |
            Shell.ActionMode.OVERVIEW);
        Main.overview.toggle = this.oldOverviewToggle;
        this.hotKeyEnabled = false;
    }

    // Update hotkey menu toggle function
    _updateHotkeyMenuToggle() {
        if(this.hotKeyEnabled){
            Main.wm.allowKeybinding('overlay-key', Shell.ActionMode.NORMAL |
                Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP);
            Main.overview.toggle = this._menuToggler.bind(this);
        }
    }
    _getDefaultOverlayKey() {
        return this._mutterSettings.get_default_value('overlay-key');
    }
    // Destroy this object
    destroy() {
        // Clean up and restore the default behaviour
        this.disableHotKey();
        if (this._hotkeyMenuToggleId) {
            // Disconnect the keybinding handler
            Main.layoutManager.disconnect(this._hotkeyMenuToggleId);
            this._hotkeyMenuToggleId = null;
        }
    }
};

/**
 * The Keybinding Manager class allows us to bind and unbind keybindings
 * to a keybinding handler.
 */
var KeybindingManager = class {
    constructor(settings) {
        this._settings = settings;
        this._keybindings = new Map();
    }

    // Bind a keybinding to a keybinding handler
    bind(keybindingNameKey, keybindingValueKey, keybindingHandler) {
        if (!this._keybindings.has(keybindingNameKey)) {
            this._keybindings.set(keybindingNameKey, keybindingValueKey);
            let keybinding = this._settings.get_string(keybindingNameKey);
            this._setKeybinding(keybindingNameKey, keybinding);

            Main.wm.addKeybinding(keybindingValueKey, this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
                keybindingHandler.bind(this));

            return true;
        }
        return false;
    }

    // Set or update a keybinding in the Arc Menu settings
    _setKeybinding(keybindingNameKey, keybinding) {
        if (this._keybindings.has(keybindingNameKey)) {
            let keybindingValueKey = this._keybindings.get(keybindingNameKey);
            let [key, mods] = Gtk.accelerator_parse(keybinding);

            if (Gtk.accelerator_valid(key, mods)) {
                let shortcut = Gtk.accelerator_name(key, mods);
                this._settings.set_strv(keybindingValueKey, [shortcut]);
            } else {
                this._settings.set_strv(keybindingValueKey, []);
            }
        }
    }

    // Unbind a keybinding
    unbind(keybindingNameKey) {
        if (this._keybindings.has(keybindingNameKey)) {
            let keybindingValueKey = this._keybindings.get(keybindingNameKey);
            Main.wm.removeKeybinding(keybindingValueKey);
            this._keybindings.delete(keybindingNameKey);
            return true;
        }
        return false;
    }

    // Destroy this object
    destroy() {
        let keyIter = this._keybindings.keys();
        for (let i = 0; i < this._keybindings.size; i++) {
            let keybindingNameKey = keyIter.next().value;
            this.unbind(keybindingNameKey);
        }
    }
};

/**
 * The Hot Corner Manager class allows us to disable and enable
 * the gnome-shell hot corners.
 */
var HotCornerManager = class {
    constructor(settings) {
        this._settings = settings;
        this._hotCornersChangedId = Main.layoutManager.connect('hot-corners-changed', this._redisableHotCorners.bind(this));
    }

    _redisableHotCorners() {
        if (this._settings.get_boolean('disable-activities-hotcorner')) {
            this.disableHotCorners();
        }
    }

    // Get all hot corners from the main layout manager
    _getHotCorners() {
        return Main.layoutManager.hotCorners;
    }

    // Enable all hot corners
    enableHotCorners() {
        // Restore the default behaviour and recreate the hot corners
        Main.layoutManager._updateHotCorners();
    }

    // Disable all hot corners
    disableHotCorners() {
        let hotCorners = this._getHotCorners();
        // Monkey patch each hot corner
        hotCorners.forEach(function (corner) {
            if (corner) {
                corner._toggleOverview = () => { };
                corner._pressureBarrier._trigger = () => { };
            }
        });
    }

    // Destroy this object
    destroy() {
        if (this._hotCornersChangedId>0) {
            Main.layoutManager.disconnect(this._hotCornersChangedId);
            this._hotCornersChangedId = 0;
        }

        // Clean up and restore the default behaviour
        this.enableHotCorners();
    }
};
