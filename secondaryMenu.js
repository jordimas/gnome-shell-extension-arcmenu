/*
 * Zorin Menu: The official applications menu for Zorin OS.
 * Copyright (C) 2017 Zorin OS
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. 
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *
 * Credits:
 * This file is based on code from the Dash to Dock extension by micheleg.
 * Some code was adapted from Configurable Menu by lestcape.
 */


const AppDisplay = imports.ui.appDisplay;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;

/**
 * Extend AppIconMenu
 *
 * - set popup arrow side based on taskbar orientation
 * - Add close windows option based on quitfromdash extension
 *   (https://github.com/deuill/shell-extension-quitfromdash)
 */

const AppItemMenu = new Lang.Class({
    Name: 'AppItemMenu',
    Extends: AppDisplay.AppIconMenu,

    _init: function(source) {
        this.parent(source);
    },

    _addToDesktop: function() {
        try {
            let app = this._source.app;
            let file = Gio.file_new_for_path(app.get_app_info().get_filename());
            let path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
            let destFile = Gio.file_new_for_path(path + "/" + app.get_id());
            file.copy(destFile, 0, null, function(){});
            // Need to find a way to do that using the Gio library, but modifying the access::can-execute attribute on the file object seems unsupported
            Util.spawnCommandLine("chmod +x \"" + path + "/" + app.get_id() + "\"");
            return true;
        } catch(e) {
            global.log(e);
        }
        return false;
    },

    _redisplay: function() {
        this.parent();
        let app = this._source.app;
        let path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
        let file = Gio.file_new_for_path(path + "/" + app.get_id());
        if (!file.query_exists(null)){
            this._appendSeparator();
            this._addToDesktopItem = this._appendMenuItem("Add to Desktop");
            this._addToDesktopItem.connect('activate', Lang.bind(this, function() {
                this._addToDesktop();
            }));
        }
    }
});
