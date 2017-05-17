/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Original work: Copyright (C) 2015 Giovanni Campagna
 * Modified work: Copyright (C) 2016-2017 Zorin OS Technologies Ltd.
 * Modified work: Copyright (C) 2017 LinxGem33. 
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
 *
 *
 * Credits:
 * This file is based on code from the Gnome Applications Menu Extension by Giovanni Campagna.
 * Some code was also referenced from the Gnome Places Status Indicator by Giovanni Campagna
 * and Gno-Menu by The Panacea Projects.
 * These extensions can be found at the following URLs:
 * http://git.gnome.org/browse/gnome-shell-extensions/
 * https://github.com/The-Panacea-Projects/Gnomenu
 */


// Import Libraries
const Main = imports.ui.main;
const Dash = imports.ui.dash;
const AppDisplay = imports.ui.appDisplay;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Menu = Me.imports.menu;
const Convenience = Me.imports.convenience;

// Initialize panel button variables
let settings;
let appsMenuButton;
let activitiesButton;
let oldGetAppFromSource;

// Initialize menu language translations
function init(metadata) {
    Convenience.initTranslations();
}

// Enable the extension
function enable() {
    settings = Convenience.getSettings('org.gnome.shell.extensions.zorin-menu');
    activitiesButton = Main.panel.statusArea['activities'];
    Main.panel._leftBox.remove_child(activitiesButton.container);
    appsMenuButton = new Menu.ApplicationsButton(settings);
    Main.panel.addToStatusArea('zorin-menu', appsMenuButton, 0, 'left');
    bindSettingsChanges();
    oldGetAppFromSource = Dash.getAppFromSource;
    Dash.getAppFromSource = getAppFromSource;
}

// Disable the extension
function disable() {
    Main.panel.menuManager.removeMenu(appsMenuButton.menu);
    appsMenuButton.destroy();
    settings.run_dispose();
    Main.panel._leftBox.add_child(activitiesButton.container);

    settings = null;
    appsMenuButton = null;
    activitiesButton = null;
    Dash.getAppFromSource = oldGetAppFromSource;
    oldGetAppFromSource = null;
}

function getAppFromSource(source) {
    if (source instanceof AppDisplay.AppIcon) {
        return source.app;
    } else if (source instanceof Menu.ApplicationMenuItem) {
        return source._app;
    } else {
        return null;
    }
}

function bindSettingsChanges() {
    settings.connect('changed::visible-menus', function(){
        disable();
        enable();
    });
}
