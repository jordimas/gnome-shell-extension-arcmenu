/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2017 LinxGem33, 
 * 
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

// Imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Common constants that are used in this extension
var EMPTY_STRING = '';
var SUPER_L = 'Super_L';
var SUPER_R = 'Super_R';
var HOT_KEY = { // See: org.gnome.shell.extensions.arc-menu.menu-hotkey
    Undefined: 0,
    Super_L: 1,
    Super_R: 2,
    // Inverse mapping
    0: EMPTY_STRING,  // Note: an empty string is evaluated to false
    1: SUPER_L,
    2: SUPER_R
};
var MENU_POSITION = { // See: org.gnome.shell.extensions.arc-menu.menu-position
    Left: 0,
    Center: 1,
    Right: 2
};
var MENU_APPEARANCE = { // See: org.gnome.shell.extensions.arc-menu.menu-button-icon
    Icon: 0,
    Text: 1,
    Icon_Text: 2,
    Text_Icon: 3
};
var MENU_BUTTON_TEXT = { // See: org.gnome.shell.extensions.arc-menu.menu-button-text
    System: 0,
    Custom: 1
};
var MENU_BUTTON_ICON = { // See: org.gnome.shell.extensions.arc-menu.menu-button-icon
    Arc_Menu: 0,
    System: 1,
    Custom: 2
};
var MENU_ICON_PATH = {
    Arc_Menu: '/media/arc-menu-symbolic.svg'
};
var ICON_SIZES = [ 16, 24, 32, 40, 48 ];
var DEFAULT_ICON_SIZE = 22;
var ARC_MENU_LOGO = {
    Path: '/media/logo.png',
    Size: [216, 229] // width, height
};
var GNU_SOFTWARE = '<span size="small">' +
    'This program comes with absolutely no warranty.\n' +
    'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
	'GNU General Public License, version 2 or later</a> for details.' +
	'</span>';
var MENU_STYLE_CHOOSER = {
    ThumbnailHeight: 200,
    ThumbnailWidth: 200,
    WindowHeight: 480,
    WindowWidth: 660,
    MaxColumns: 6,
    Styles: [
        {
            thumbnail: Me.path + '/media/styles/arc-menu.svg',
            name: 'Arc Menu'
        },
        {
            thumbnail: Me.path + '/media/styles/whisker-menu.svg',
            name: 'Whisker Style'
        },
        {
            thumbnail: Me.path + '/media/styles/simple-menu.svg',
            name: 'Simple Style'
        },
        {
            thumbnail: Me.path + '/media/styles/elementary-menu.svg',
            name: 'Elementary Style'
        },
        {
            thumbnail: Me.path + '/media/styles/gnome-menu.svg',
            name: 'Gnome Style'
        },
        {
            thumbnail: Me.path + '/media/styles/brisk-menu.svg',
            name: 'Brisk Style'
        },
        {
            thumbnail: Me.path + '/media/styles/mint-menu.svg',
            name: 'Mint Style'
        },
        {
            thumbnail: Me.path + '/media/styles/windows-10-style-menu.svg',
            name: 'Windows 10 Style'
        },
        {
            thumbnail: Me.path + '/media/styles/gnome-dash-menu.svg',
            name: 'GNOME dash Style'
        }
    ]
};
