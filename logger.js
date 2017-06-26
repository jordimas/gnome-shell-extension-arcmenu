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

// Logging levels.
const Level = {
    Off: 0x00,
    Log: 0x01,
    Debug: 0x02,
    Info: 0x04,
    Warn: 0x08,
    All: 0x0F
};

/**
 * A basic Logger class that supports multiple logging levels.
 */
const Logger = new Lang.Class({
    Name: 'ArcMenu.Logger',

    _init: function(params) {
        this._level = params['level'] | Level.All;
    },

    setLevel: function(level) {
        this._level = level;
    },

    debug: function(msg) {
        if(this._level & Level.Debug)
            global.log("DEBUG: " + msg);
    },

    info: function(msg) {
        if(this._level & Level.Info)
            global.log("INFO: " + msg);
    },

    log: function(msg) {
        if(this._level & Level.Log)
            global.log("LOG: " + msg);
    }
});

const logger = new Logger({ level: Level.All });

