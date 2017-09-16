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
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Signals = imports.signals;
const AccountsService = imports.gi.AccountsService;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

const DND = imports.ui.dnd;
const LoginManager = imports.misc.loginManager;

// Menu Size variables
const APPLICATION_ICON_SIZE = 32;

function setIconAsync(icon, gioFile, fallback_icon_name) {
    gioFile.load_contents_async(null, function(source, result) {
        try {
            let bytes = source.load_contents_finish(result)[1];
            icon.gicon = Gio.BytesIcon.new(bytes);
        } catch(err) {
            icon.icon_name = fallback_icon_name;
        }
    });
}

// Removing the default behaviour which selects a hovered item if the space key is pressed.
// This avoids issues when searching for an app with a space character in its name.
const BaseMenuItem = new Lang.Class({
    Name: 'BaseMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _onKeyPressEvent: function (actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            this.activate(event);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }
});

// Menu item to launch GNOME activities overview
const ActivitiesMenuItem = new Lang.Class({
    Name: 'ActivitiesMenuItem',
    Extends: BaseMenuItem,

    // Initialize the menu item
    _init: function(button) {
	    this.parent();
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'view-fullscreen-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 16
        });
        this.actor.add_child(this._icon);
        let label = new St.Label({
            text: _("Activities Overview"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(label);
    },

    // Activate the menu item (Open activities overview)
    activate: function(event) {
        this._button.menu.toggle();
        Main.overview.toggle();
	    this.parent(event);
    },
});

// Power Button
const PowerButton = new Lang.Class({
    Name: 'PowerButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Power Off"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'system-shutdown-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Shutdown)
    _onClick: function() {
        this._button.menu.toggle();
        this._button._session.ShutdownRemote(0);
    }
});

// Logout Button
const LogoutButton = new Lang.Class({
    Name: 'LogoutButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Log Out"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'application-exit-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Logout)
    _onClick: function() {
        this._button.menu.toggle();
        this._button._session.LogoutRemote(0);
    }
});

// Suspend Button
const SuspendButton = new Lang.Class({
    Name: 'SuspendButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Suspend"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'media-playback-pause-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Suspend the system)
    _onClick: function() {
        this._button.menu.toggle();
        let loginManager = LoginManager.getLoginManager();
        loginManager.canSuspend(Lang.bind(this, function(result) {
            if (result) {
                loginManager.suspend();
            }
        }));
    }
});

// Lock Screen Button
const LockButton = new Lang.Class({
    Name: 'LockButton',

    // Initialize the button
    _init: function(button) {
        this._button = button;
        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _("Lock"),
            style_class: 'system-menu-action'
        });
        this.actor.child = new St.Icon({ icon_name: 'changes-prevent-symbolic' });
        this.actor.connect('clicked', Lang.bind(this, this._onClick));
    },

    // Activate the button (Lock the screen)
    _onClick: function() {
        this._button.menu.toggle();
        Main.screenShield.lock(true);
    }
});

// Menu item to go back to category view
const BackMenuItem = new Lang.Class({
    Name: 'BackMenuItem',
    Extends: BaseMenuItem,

    // Initialize the button
    _init: function(button) {
	    this.parent();
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'go-previous-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: APPLICATION_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        let backLabel = new St.Label({
            text: _("Back"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(backLabel);
    },

    // Activate the button (go back to category view)
    activate: function(event) {
        this._button.selectCategory(null);
        if (this._button.searchActive) this._button.resetSearch();
	    this.parent(event);
    },
});

// Menu shortcut item class
const ShortcutMenuItem = new Lang.Class({
    Name: 'ShortcutMenuItem',
    Extends: BaseMenuItem,

    // Initialize the menu item
    _init: function(button, name, icon, command) {
        this.parent();
        this._button = button;
        this._command = command;
        this._icon = new St.Icon({
            icon_name: icon,
            style_class: 'popup-menu-icon',
            icon_size: 16
        });
        this.actor.add_child(this._icon);
        let label = new St.Label({
            text: name, y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(label);
    },

    // Activate the menu item (Launch the shortcut)
    activate: function(event) {
        Util.spawnCommandLine(this._command);
        this._button.menu.toggle();
	    this.parent(event);
    }
});

// Menu item which displays the current user
const UserMenuItem = new Lang.Class({
    Name: 'UserMenuItem',
    Extends: BaseMenuItem,

    // Initialize the menu item
    _init: function(button) {
	    this.parent();
        this._button = button;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this._userIcon = new St.Icon({
            style_class: 'popup-menu-icon',
            icon_size: APPLICATION_ICON_SIZE
        });
        this.actor.add_child(this._userIcon);
        this._userLabel = new St.Label({
            text: username,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this._userLabel);
        this._userLoadedId = this._user.connect('notify::is_loaded', Lang.bind(this, this._onUserChanged));
        this._userChangedId = this._user.connect('changed', Lang.bind(this, this._onUserChanged));
        this.actor.connect('destroy', Lang.bind(this, this._onDestroy));
        this._onUserChanged();
    },

    // Activate the menu item (Open user account settings)
    activate: function(event) {
        Util.spawnCommandLine("gnome-control-center user-accounts");
        this._button.menu.toggle();
	    this.parent(event);
    },

    // Handle changes to user information (redisplay new info)
    _onUserChanged: function() {
        if (this._user.is_loaded) {
            this._userLabel.set_text (this._user.get_real_name());
            if (this._userIcon) {
                let iconFileName = this._user.get_icon_file();
                let iconFile = Gio.file_new_for_path(iconFileName);
                setIconAsync(this._userIcon, iconFile, 'avatar-default');
            }
        }
    },

    // Destroy the menu item
    _onDestroy: function() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
});

// Menu application item class
const ApplicationMenuItem = new Lang.Class({
    Name: 'ApplicationMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    // Initialize menu item
    _init: function(button, app) {
	    this.parent();
	    this._app = app;
        this.app = app;
        this._button = button;
        this._iconBin = new St.Bin();
        this.actor.add_child(this._iconBin);

        let appLabel = new St.Label({
            text: app.get_name(),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(appLabel);
        this.actor.label_actor = appLabel;

        let textureCache = St.TextureCache.get_default();
        let iconThemeChangedId = textureCache.connect('icon-theme-changed',
                                                      Lang.bind(this, this._updateIcon));
        this.actor.connect('destroy', Lang.bind(this, function() {
                textureCache.disconnect(iconThemeChangedId);
        }));
        this._updateIcon();

        this._draggable = DND.makeDraggable(this.actor);
        this.isDraggableApp = true;
        this._draggable.connect('drag-begin', Lang.bind(this, this._onDragBegin));
        this._draggable.connect('drag-cancelled', Lang.bind(this, this._onDragCancelled));
        this._draggable.connect('drag-end', Lang.bind(this, this._onDragEnd));
    },

    _onDragBegin: function() {
        Main.overview.beginItemDrag(this);
    },

    _onDragCancelled: function() {
        Main.overview.cancelledItemDrag(this);
    },

    _onDragEnd: function() {
        Main.overview.endItemDrag(this);
    },

    _onKeyPressEvent: function (actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            this.activate(event);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    },

    get_app_id: function() {
        return this._app.get_id();
    },

    getDragActor: function() {
       return this._app.create_icon_texture(APPLICATION_ICON_SIZE);
    },

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource: function() {
        return this.actor;
    },

    // Activate menu item (Launch application)
    activate: function(event) {
        this._app.open_new_window(-1);
        this._button.menu.toggle();
        this.parent(event);
    },

    // Set button as active, scroll to the button
    setActive: function(active, params) {
        if (active && !this.actor.hover)
            this._button.scrollToButton(this);

        this.parent(active, params);
    },

    // Update the app icon in the menu
    _updateIcon: function() {
        this._iconBin.set_child(this._app.create_icon_texture(APPLICATION_ICON_SIZE));
    }
});

// Menu Category item class
const CategoryMenuItem = new Lang.Class({
    Name: 'CategoryMenuItem',
    Extends: BaseMenuItem,

    // Initialize menu item
    _init: function(button, category) {
	    this.parent();
	    this._category = category;
        this._button = button;
        let name;
        if (this._category) {
            name = this._category.get_name();
        } else {
            name = _("Favorites");
        }
        this._icon = new St.Icon({
            gicon: this._category.get_icon(),
            style_class: 'popup-menu-icon',
            icon_size: APPLICATION_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        let categoryLabel = new St.Label({
            text: name,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(categoryLabel);
        this.actor.label_actor = categoryLabel;
    },

    // Activate menu item (Display applications in category)
    activate: function(event) {
        this._button.selectCategory(this._category);
        this.parent(event);
    },

    // Set button as active, scroll to the button
    setActive: function(active, params) {
        if (active && !this.actor.hover) {
            this._button.scrollToButton(this);
        }
        this.parent(active, params);
    }
});

// Place Info class
const PlaceInfo = new Lang.Class({
    Name: 'PlaceInfo',

    // Initialize place info
    _init: function(file, name, icon) {
        this.file = file;
        this.name = name ? name : this._getFileName();
        this.icon = icon ? new Gio.ThemedIcon({ name: icon }) : this.getIcon();
    },

    // Launch place with appropriate application
    launch: function(timestamp) {
        let launchContext = global.create_app_launch_context(timestamp, -1);
        Gio.AppInfo.launch_default_for_uri(this.file.get_uri(), launchContext);
    },

    // Get Icon for place
    getIcon: function() {
        try {
            let info = this.file.query_info('standard::symbolic-icon', 0, null);
	        return info.get_symbolic_icon();
        } catch(e if e instanceof Gio.IOErrorEnum) {
            if (!this.file.is_native()) {
                return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
            } else {
                return new Gio.ThemedIcon({ name: 'folder-symbolic' });
            }
        }
    },

    // Get display name for place
    _getFileName: function() {
        try {
            let info = this.file.query_info('standard::display-name', 0, null);
            return info.get_display_name();
        } catch(e if e instanceof Gio.IOErrorEnum) {
            return this.file.get_basename();
        }
    },
});
Signals.addSignalMethods(PlaceInfo.prototype);

// Menu Place Shortcut item class
const PlaceMenuItem = new Lang.Class({
    Name: 'PlaceMenuItem',
    Extends: BaseMenuItem,

    // Initialize menu item
    _init: function(button, info) {
	    this.parent();
	    this._button = button;
	    this._info = info;
        this._icon = new St.Icon({
            gicon: info.icon,
            icon_size: 16
        });
	    this.actor.add_child(this._icon);
        this._label = new St.Label({
            text: info.name,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this._label);
        this._changedId = this._info.connect('changed',
                                       Lang.bind(this, this._propertiesChanged));
    },

    // Destroy menu item
    destroy: function() {
        if (this._changedId) {
            this._info.disconnect(this._changedId);
            this._changedId = 0;
        }
        this.parent();
    },

    // Activate (launch) the shortcut
    activate: function(event) {
	    this._info.launch(event.get_time());
        this._button.menu.toggle();
        this.parent(event);
    },

    // Handle changes in place info (redisplay new info)
    _propertiesChanged: function(info) {
        this._icon.gicon = info.icon;
        this._label.text = info.name;
    },
});
