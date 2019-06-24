/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2017 Alexander Rüedlinger
 * Copyright (C) 2017-2018 LinxGem33
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
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Signals = imports.signals;
const AccountsService = imports.gi.AccountsService;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;
const DND = imports.ui.dnd;
const Dash = imports.ui.dash;
const LoginManager = imports.misc.loginManager;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
// Menu Size variables
const LARGE_ICON_SIZE = 34;
const MEDIUM_ICON_SIZE = 25;
const SMALL_ICON_SIZE = 16;
const TOOLTIP_LABEL_SHOW_TIME = 0.15;
const TOOLTIP_LABEL_HIDE_TIME = 0.1;

function setIconAsync(icon, gioFile, fallback_icon_name) {
    gioFile.load_contents_async(null, function (source, result) {
        try {
            let bytes = source.load_contents_finish(result)[1];
            icon.gicon = Gio.BytesIcon.new(bytes);
        } catch (err) {
            icon.icon_name = fallback_icon_name;
        }
    });
}

// Removing the default behaviour which selects a hovered item if the space key is pressed.
// This avoids issues when searching for an app with a space character in its name.
var BaseMenuItem = class extends PopupMenu.PopupBaseMenuItem {
    constructor(button){
        super();
            this.button = button;
    }    
    _onKeyPressEvent(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            this.activate(event);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }
    _onButtonPressEvent(actor, event) {
		
        return Clutter.EVENT_PROPAGATE;
    }

    _onButtonReleaseEvent(actor, event) {
        if(event.get_button()==1){
        	this.activate(event);
        }
  	if(event.get_button()==3){
	}
        return Clutter.EVENT_STOP;
    }

};

// Menu item to launch GNOME activities overview
var ActivitiesMenuItem = class extends BaseMenuItem {
    // Initialize the menu item
    constructor(button) {
        super(button);
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'view-fullscreen-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: SMALL_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        let label = new St.Label({
            text: _("Activities Overview"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(label);
    }

    // Activate the menu item (Open activities overview)
    activate(event) {
        this._button.leftClickMenu.toggle();
        Main.overview.toggle();
        super.activate(event);
    }
};

/**
 * A class representing a Tooltip.
 */
var Tooltip = class {
    constructor(sourceActor, text) {
        this.sourceActor = sourceActor;
        this.actor = new St.Label({
            style_class: 'tooltip-label',
            text: text,
            opacity: 0
        });
        global.stage.add_actor(this.actor);
        this.actor.show();
        this.actor.connect('destroy', this._onDestroy.bind(this));
    }

    show() {
        let [stageX, stageY] = this.sourceActor.get_transformed_position();
        let [width, height] = this.sourceActor.get_transformed_size();
        let y = stageY - height / 1.24;
        let x = stageX - Math.round((this.actor.get_width() - width) / 2);

        this.actor.show();
        this.actor.set_position(x, y);
        Tweener.addTween(this.actor, {
            opacity: 255,
            time: TOOLTIP_LABEL_SHOW_TIME,
            transition: 'easeOutQuad'
        });
    }

    hide() {
        Tweener.addTween(this.actor, {
            opacity: 0,
            time: TOOLTIP_LABEL_HIDE_TIME,
            transition: 'easeOutQuad',
            onComplete: () => {
                this.actor.hide();
            }
        });
    }

    _onDestroy() {
        global.stage.remove_actor(this.actor);
    }
};

/**
 * A base class for custom session buttons.
 */
var SessionButton = class {
    constructor(button, accessible_name, icon_name) {
        this._button = button;

        this.actor = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: accessible_name,
            style_class: 'system-menu-action'
        });
        this._useTooltips = true;
        this.tooltip = new Tooltip(this.actor, accessible_name);
        this.tooltip.hide();
        this.actor.child = new St.Icon({ 
            icon_name: icon_name,
            icon_size: SMALL_ICON_SIZE 
        });
        this.actor.connect('clicked', this._onClick.bind(this));
        this.actor.connect('notify::hover', this._onHover.bind(this));
    }

    useTooltips(useTooltips) {
        this._useTooltips = useTooltips;
    }

    _onClick() {
        this._button.leftClickMenu.toggle();
        this.activate();
    }

    activate() {
        // Button specific action
    }

    _onHover() {
        // TODO: implement tooltips
        if (!this._useTooltips)
            return;

        if (this.actor.hover) { // mouse pointer hovers over the button
            this.tooltip.show();
        } else { // mouse pointer leaves the button area
            this.tooltip.hide();
        }
    }
};

// Power Button
var PowerButton = class extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Power Off"), 'system-shutdown-symbolic');
    }

    // Activate the button (Shutdown)
    activate() {
        this._button._session.ShutdownRemote(0);
    }
};

// Logout Button
var LogoutButton = class extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Log Out"), 'application-exit-symbolic');
    }

    // Activate the button (Logout)
    activate() {
        this._button._session.LogoutRemote(0);
    }
};

// Suspend Button
var SuspendButton = class extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Suspend"), 'media-playback-pause-symbolic');
    }

    // Activate the button (Suspend the system)
    activate() {
        let loginManager = LoginManager.getLoginManager();
        loginManager.canSuspend(function (result) {
            if (result) {
                loginManager.suspend();
            }
        }.bind(this));
    }
};

// Lock Screen Button
var LockButton = class extends SessionButton {
    // Initialize the button
    constructor(button) {
        super(button, _("Lock"), 'changes-prevent-symbolic');
    }

    // Activate the button (Lock the screen)
    activate() {
        Main.screenShield.lock(true);
    }
};

// Menu item to go back to category view
var BackMenuItem = class extends BaseMenuItem {
    // Initialize the button
    constructor(button) {
        super(button);
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'go-previous-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 24
        });
        this.actor.add_child(this._icon);
        let backLabel = new St.Label({
            text: _("Back"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(backLabel);
    }

    // Activate the button (go back to category view)
    activate(event) {
        //this._button.selectCategory(null);
        this._button._clearApplicationsBox();
        if(this._button.currentMenu == Constants.CURRENT_MENU.SEARCH_RESULTS)
        { 
            this._button.currentMenu = Constants.CURRENT_MENU.FAVORITES;
            this._button.resetSearch();
            this._button._loadFavorites();
        }
        else if(this._button.currentMenu == Constants.CURRENT_MENU.ALL_APPS)
        { 
            this._button.currentMenu = Constants.CURRENT_MENU.FAVORITES;
            this._button._loadFavorites();
        }
        else if(this._button.currentMenu == Constants.CURRENT_MENU.APP_SUBGROUP)
        {
            this._button.currentMenu = Constants.CURRENT_MENU.ALL_APPS;
            this._button._displayCategories();
        }
        super.activate(event);
    }
};

// Menu item to view all apps
var ViewAllPrograms = class extends BaseMenuItem {
    // Initialize the button
    constructor(button) {
        super(button);
        this._button = button;
        this._icon = new St.Icon({
            icon_name: 'go-next-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 24,
             x_align: St.Align.START
        });
        this.actor.add_child(this._icon);
        let backLabel = new St.Label({
            text: _("All Programs"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(backLabel);
    }

    // Activate the button (go back to category view)
    activate(event) {
      this._button._clearApplicationsBox();
      this._button._displayCategories();
      this._button.currentMenu = Constants.CURRENT_MENU.ALL_APPS;
      super.activate(event);
    }
};

// Menu shortcut item class
var ShortcutMenuItem = class extends BaseMenuItem {
    // Initialize the menu item
    constructor(button, name, icon, command) {
        super(button);
        this._button = button;
        this._command = command;
        this._icon = new St.Icon({
            icon_name: icon,
            style_class: 'popup-menu-icon',
            icon_size: SMALL_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        let label = new St.Label({
            text: name, y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(label);
    }

    // Activate the menu item (Launch the shortcut)
    activate(event) {
        Util.spawnCommandLine(this._command);
        this._button.leftClickMenu.toggle();
        super.activate(event);
    }
};

// Menu item which displays the current user
var UserMenuItem = class extends BaseMenuItem {
    // Initialize the menu item
    constructor(button) {
        super(button);
        this._button = button;
        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);
        this._userIcon = new St.Icon({
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        });
        this.actor.add_child(this._userIcon);
        this._userLabel = new St.Label({
            text: GLib.get_real_name(),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this._userLabel);
        this._userLoadedId = this._user.connect('notify::is_loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._onUserChanged();
    }

    // Activate the menu item (Open user account settings)
    activate(event) {
        Util.spawnCommandLine("gnome-control-center user-accounts");
        this._button.leftClickMenu.toggle();
        super.activate(event);
    }

    // Handle changes to user information (redisplay new info)
    _onUserChanged() {
        if (this._user.is_loaded) {
            this._userLabel.set_text(this._user.get_real_name());
            if (this._userIcon) {
                let iconFileName = this._user.get_icon_file();
                let iconFile = Gio.file_new_for_path(iconFileName);
                setIconAsync(this._userIcon, iconFile, 'avatar-default-symbolic');
            }
        }
    }

    // Destroy the menu item
    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }
        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }
};
// Menu pinned apps/favorites item class
var FavoritesMenuItem = class extends BaseMenuItem {
    // Initialize the menu item
    constructor(button, name, icon, command) {
        super(button);
        this._button = button;
        this._command = command;
        this._iconPath = icon;
        this._name = name;
        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(icon),
            style_class: 'popup-menu-icon',
            icon_size: MEDIUM_ICON_SIZE
        })
        this.actor.add_child(this._icon);
 
        let label = new St.Label({
            text: name, y_expand: true, x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(label);
        this._draggable = DND.makeDraggable(this.actor);
        this.isDraggableApp = true;
	this._draggable.connect('drag-begin', this._onDragBegin.bind(this));
        this._draggable.connect('drag-cancelled', this._onDragCancelled.bind(this));
        this._draggable.connect('drag-end', this._onDragEnd.bind(this));
    }

   _onDragBegin() {   
        this._dragMonitor = {
            dragMotion: (this, this._onDragMotion.bind(this))
        };
        DND.addDragMonitor(this._dragMonitor); 
        DND.SNAP_BACK_ANIMATION_TIME = 0;
        this.dragStartY = (this._draggable._dragStartY); 
        this._emptyDropTarget = new Dash.EmptyDropTargetItem();
        this._emptyDropTarget.setChild(new St.Bin({ style_class: 'arc-empty-dash-drop-target' }));  
	this._button.applicationsBox.insert_child_at_index(this._emptyDropTarget, 0);
 	this._emptyDropTarget.show(false);
        let p = this._button.applicationsBox.get_transformed_position();
        this.posY= p[1];        
        this.rowHeight = this._button.applicationsBox.get_child_at_index(1).height;
        //global.log("Box Start Y: "+ p[1]);            
        //global.log("Row Height: "+ this.rowHeight);    
        //global.log("Drag Start Y: "+this.dragStartY); 

         this.startIndex=0;
         for(let i = 0; i< this._button.applicationsBox.get_children().length;i++)
         {
         	if(this.actor == this._button.applicationsBox.get_child_at_index(i))
         	  this.startIndex=i;
         }
         //global.log(this.startIndex);
         //global.log(this._draggable._dragStartY);
            
        Main.overview.beginItemDrag(this);  
        this._emptyDropTarget.show(true); 

    }
    _onDragMotion(dragEvent) {
    	let newIndex = Math.floor((this._draggable._dragY - this.posY) / (this.rowHeight));
    	if(newIndex > this._button.applicationsBox.get_children().length -1)
        	newIndex = this._button.applicationsBox.get_children().length -1;
        if(newIndex < 0)
        	newIndex = 0;	
    	if(this._button.applicationsBox.get_child_at_index(newIndex) != this._emptyDropTarget)
    	{
    		//global.log("not equal");
		this._button.applicationsBox.set_child_at_index(this._emptyDropTarget, newIndex);
	}

	return DND.DragMotionResult.CONTINUE;
    }
    _onDragCancelled() {
       Main.overview.cancelledItemDrag(this);
    }

    _onDragEnd() {    
 	this._button.applicationsBox.remove_child(this._emptyDropTarget); 
        let index = Math.floor((this._draggable._dragY - this.posY) / this.rowHeight);
        //global.log("NEW INDEX: "+index);
        if(index>=this.startIndex)
        	index--;
        if(index> this._button.applicationsBox.get_children().length -1)
        	index= this._button.applicationsBox.get_children().length -1;
         if(index < 0)
        	index = 0;		
    	this._button.applicationsBox.set_child_at_index(this.actor,index);    	
    	let temp = this._button.favoritesArray[this.startIndex-1];
    	this._button.favoritesArray.splice(this.startIndex-1,1);
    	this._button.favoritesArray.splice(index,0,temp);
        Main.overview.endItemDrag(this);
        DND.removeDragMonitor(this._dragMonitor);
        this.emit('saveSettings');	
    }
    
    getDragActor() {
        return new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconPath),
            style_class: 'popup-menu-icon',
            icon_size: 40
        });
    }

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource() {
        return this.actor;
    }

    // Activate the menu item (Launch the shortcut)
    activate(event) {
        Util.spawnCommandLine(this._command);
        this._button.leftClickMenu.toggle();
        super.activate(event);
    }
};
// Menu application item class
var ApplicationMenuItem = class extends PopupMenu.PopupBaseMenuItem {
    // Initialize menu item
    constructor(button, app) {
        super();
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
            this._updateIcon.bind(this));
        this.actor.connect('destroy', () => {
            textureCache.disconnect(iconThemeChangedId);
        });
        this._updateIcon();

        this._draggable = DND.makeDraggable(this.actor);
        this.isDraggableApp = true;
        this._draggable.connect('drag-begin', this._onDragBegin.bind(this));
        this._draggable.connect('drag-cancelled', this._onDragCancelled.bind(this));
        this._draggable.connect('drag-end', this._onDragEnd.bind(this));
    }

    _onDragBegin() {
        Main.overview.beginItemDrag(this);
    }

    _onDragCancelled() {
        Main.overview.cancelledItemDrag(this);
    }

    _onDragEnd() {
        Main.overview.endItemDrag(this);
    }

    _onKeyPressEvent(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            this.activate(event);
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    get_app_id() {
        return this._app.get_id();
    }

    getDragActor() {
        return this._app.create_icon_texture(MEDIUM_ICON_SIZE);
    }

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource() {
        return this.actor;
    }

    // Activate menu item (Launch application)
    activate(event) {
        this._app.open_new_window(-1);
        this._button.leftClickMenu.toggle();
        super.activate(event);
    }

    // Set button as active, scroll to the button
    setActive(active, params) {
        if (active && !this.actor.hover)
            this._button.scrollToButton(this);

        super.setActive(active, params);
    }

    setFakeActive(active) {
        if (active) {
            this._button.scrollToButton(this);
            this.actor.add_style_class_name('selected');
        } else {
            this.actor.remove_style_class_name('selected');
        }
    }

    // Grab the key focus
    grabKeyFocus() {
        this.actor.grab_key_focus();
    }

    // Update the app icon in the menu
    _updateIcon() {
        this._iconBin.set_child(this._app.create_icon_texture(SMALL_ICON_SIZE));
    }
};

// Menu Category item class
var CategoryMenuItem = class extends BaseMenuItem {
    // Initialize menu item
    constructor(button, category) {
        super(button);
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
            icon_size: MEDIUM_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        let categoryLabel = new St.Label({
            text: name,
            y_expand: true,
            x_expand:true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(categoryLabel);
        this._arrowIcon = new St.Icon({
            icon_name: 'go-next-symbolic',
            style_class: 'popup-menu-icon',
            x_align: St.Align.END,
            icon_size: 12,
        });
        this.actor.add_child(this._arrowIcon);
        this.actor.label_actor = categoryLabel;
    }

    // Activate menu item (Display applications in category)
    activate(event) {
        this._button.selectCategory(this._category);
        super.activate(event);
    }

    // Set button as active, scroll to the button
    setActive(active, params) {
        if (active && !this.actor.hover) {
            this._button.scrollToButton(this);
        }
        super.setActive(active, params);
    }
};

// Place Info class
var PlaceInfo = class {
    // Initialize place info
    constructor(file, name, icon) {
        this.file = file;
        this.name = name ? name : this._getFileName();
        this.icon = icon ? new Gio.ThemedIcon({ name: icon }) : this.getIcon();
    }

    // Launch place with appropriate application
    launch(timestamp) {
        let launchContext = global.create_app_launch_context(timestamp, -1);
        Gio.AppInfo.launch_default_for_uri(this.file.get_uri(), launchContext);
    }

    // Get Icon for place
    getIcon() {
        try {
            let info = this.file.query_info('standard::symbolic-icon', 0, null);
            return info.get_symbolic_icon();

        } catch (e) {
            if (e instanceof GioIOErrorEnum) {
                if (!this.file.is_native()) {
                    return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    return new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }
    }

    // Get display name for place
    _getFileName() {
        try {
            let info = this.file.query_info('standard::display-name', 0, null);
            return info.get_display_name();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                return this.file.get_basename();
            }
        }
    }
};
Signals.addSignalMethods(PlaceInfo.prototype);

// Menu Place Shortcut item class
var PlaceMenuItem = class extends BaseMenuItem {
    // Initialize menu item
    constructor(button, info) {
        super(button);
        this._button = button;
        this._info = info;
        this._icon = new St.Icon({
            gicon: info.icon,
            icon_size: SMALL_ICON_SIZE
        });
        this.actor.add_child(this._icon);
        this._label = new St.Label({
            text: info.name,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_child(this._label);
        this._changedId = this._info.connect('changed',
            this._propertiesChanged.bind(this));
    }

    // Destroy menu item
    destroy() {
        if (this._changedId) {
            this._info.disconnect(this._changedId);
            this._changedId = 0;
        }
        super.destroy();
    }

    // Activate (launch) the shortcut
    activate(event) {
        this._info.launch(event.get_time());
        this._button.leftClickMenu.toggle();
        super.activate(event);
    }

    // Handle changes in place info (redisplay new info)
    _propertiesChanged(info) {
        this._icon.gicon = info.icon;
        this._label.text = info.name;
    }
};

/**
 * This class represents a SearchBox.
 */
var SearchBox = class {
    constructor() {
        this.actor = new St.BoxLayout({
            style_class: 'search-box search-box-padding'
        });
        this._stEntry = new St.Entry({
            name: 'search-entry',
            hint_text: _("Type to search…"),
            track_hover: true,
            can_focus: true
        });
        this._findIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-find-symbolic',
            icon_size: 16
        });
        this._clearIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-clear-symbolic',
            icon_size: 16
        });
        this._stEntry.set_primary_icon(this._findIcon);
        this.actor.add(this._stEntry, {
            expand: true,
            x_align: St.Align.START,
            y_align: St.Align.START
        });

        this._text = this._stEntry.get_clutter_text();
        this._textChangedId = this._text.connect('text-changed', this._onTextChanged.bind(this));
        this._keyPressId = this._text.connect('key-press-event', this._onKeyPress.bind(this));
        this._keyFocusInId = this._text.connect('key-focus-in', this._onKeyFocusIn.bind(this));
        this._searchIconClickedId = 0;
        this._inputHistory = [];
        this._maxInputHistory = 5;

        this.actor.connect('destroy', this._onDestroy.bind(this));
    }

    _pushInput(searchString) {
        if (this._inputHistory.length == this._maxInputHistory) {
            this._inputHistory.shift();
        }
        this._inputHistory.push(searchString);
    }

    _lastInput() {
        if (this._inputHistory.length != 0) {
            return this._inputHistory[this._inputHistory.length - 1];
        }
        return '';
    }

    _previousInput() {
        if (this._inputHistory.length > 1) {
            return this._inputHistory[this._inputHistory.length - 2];
        }
        return '';
    }

    getText() {
        return this._stEntry.get_text();
    }

    setText(text) {
        this._stEntry.set_text(text);
    }

    // Grab the key focus
    grabKeyFocus() {
        this._stEntry.grab_key_focus();
    }

    hasKeyFocus() {
        return this._stEntry.contains(global.stage.get_key_focus());
    }
    // Clear the search box
    clear() {
        this._stEntry.set_text('');
        this.emit('cleared');
    }

    isEmpty() {
        return this._stEntry.get_text() == '';
    }

    _isActivated() {
        return this._stEntry.get_text() != '';
    }

    _setClearIcon() {
        this._stEntry.set_secondary_icon(this._clearIcon);
        if (this._searchIconClickedId == 0) {
            this._searchIconClickedId = this._stEntry.connect('secondary-icon-clicked',
                this.clear.bind(this));
        }
    }

    _unsetClearIcon() {
        if (this._searchIconClickedId > 0) {
            this._stEntry.disconnect(this._searchIconClickedId);
        }
        this._searchIconClickedId = 0;
        this._stEntry.set_secondary_icon(null);
    }

    _onTextChanged(entryText) {
        let searchString = this._stEntry.get_text();
        this._pushInput(searchString);
        if (this._isActivated()) {
            this._setClearIcon();
        } else {
            this._unsetClearIcon();
            if (searchString == '' && this._previousInput() != '') {
                this.emit('cleared');
            }
        }
        this.emit('changed', searchString);
    }

    _onKeyPress(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            if (!this.isEmpty()) {
                this.emit('activate');
            }
            return Clutter.EVENT_STOP;
        }
        this.emit('key-press-event', event);
        return Clutter.EVENT_PROPAGATE;
    }

    _onKeyFocusIn(actor) {
        this.emit('key-focus-in');
        return Clutter.EVENT_PROPAGATE;
    }

    _onDestroy() {
        if (this._textChangedId > 0) {
            this._text.disconnect(this._textChangedId);
            this._textChangedId = 0;
        }
        if (this._keyPressId > 0) {
            this._text.disconnect(this._keyPressId);
            this._keyPressId = 0;
        }
        if (this._keyFocusInId > 0) {
            this._text.disconnect(this._keyFocusInId);
            this._keyFocusInId = 0;
        }
    }
};
Signals.addSignalMethods(SearchBox.prototype);

/**
 * This class is responsible for the appearance of the menu button.
 */
var MenuButtonWidget = class {
    constructor() {
        this.actor = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
            pack_start: false
        });
        this._arrowIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);
        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'popup-menu-icon'
        });
        this._label = new St.Label({
            text: _("Applications"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.actor.add_child(this._icon);
        this.actor.add_child(this._label);
        this.actor.add_child(this._arrowIcon);
    }

    getPanelLabel() {
        return this._label;
    }

    getPanelIcon() {
        return this._icon;
    }

    showArrowIcon() {
        if (!this.actor.contains(this._arrowIcon)) {
            this.actor.add_child(this._arrowIcon);
        }
    }

    hideArrowIcon() {
        if (this.actor.contains(this._arrowIcon)) {
            this.actor.remove_child(this._arrowIcon);
        }
    }

    showPanelIcon() {
        if (!this.actor.contains(this._icon)) {
            this.actor.add_child(this._icon);
        }
    }

    hidePanelIcon() {
        if (this.actor.contains(this._icon)) {
            this.actor.remove_child(this._icon);
        }
    }

    showPanelText() {
        if (!this.actor.contains(this._label)) {
            this.actor.add_child(this._label);
        }
    }

    hidePanelText() {
        if (this.actor.contains(this._label)) {
            this.actor.remove_child(this._label);
        }
    }
};
