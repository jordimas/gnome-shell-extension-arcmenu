/*
 * Arc Menu - A traditional application menu for GNOME 3
 *
 * Arc Menu Lead Developer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 *
 * Arc Menu Founder/Maintainer/Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33
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

const Me = imports.misc.extensionUtils.getCurrentExtension();

const {Clutter, GLib, Gio, Gtk, Shell, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(mainButton) {
        super(mainButton,{
            Search: true,
            SearchType: Constants.SearchType.LIST_VIEW,
            VerticalMainBox: true
        });
    }

    createLayout(){
        //subMainBox stores left and right box
        this.subMainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL
        });
        this.mainBox.add(this.subMainBox);

        // The "Left Box"
        // Contains the app list and the searchbar
        this.appBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            vertical: true,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'left-box'
        });

        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = this._createScrollBox({
            x_fill: true,
            y_fill: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'apps-menu vfade left-scroll-area',
            overlay_scrollbars: true,
            reactive:true
        });
        this.appBox.add(this.applicationsScrollBox);
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);

        this.backButton = new MW.BackMenuItem(this);
        this.appBox.add(this.backButton.actor);

        // Search Box
        this.searchBox = new MW.SearchBox(this);
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        this.searchBox._stEntry.style = "min-height: 0px; border-radius: 18px; padding: 7px 12px;"; // Make it round
        this.searchBox.actor.style = "padding-top: 0.75em; padding-bottom: 0.25em; padding-left: 1em; padding-right: 0.25em; margin-right: .5em;";
        this.appBox.add(this.searchBox.actor);

        // The "Right Box"
        // Contains some useful shortcuts
        this.quickBox = new St.BoxLayout({
            vertical: true
        });

        this.subMainBox.add(this.quickBox);
        this.subMainBox.add(this.appBox);

        this.placesShortcuts= this._settings.get_value('directory-shortcuts-list').deep_unpack().length>0;
        this.softwareShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack().length>0;

        if(!this._settings.get_boolean('disable-user-avatar')){
          this.user = new MW.CurrentUserButton(this);
          this.quickBox.add(this.user.actor);
          if (this.placesShortcuts || this.softwareShortcuts)
            this.quickBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT));
        }

        this.shortcutsBox = new St.BoxLayout({
            vertical: true
        });

        this.shortcutsScrollBox = this._createScrollBox({
            x_fill: true,
            y_fill: false,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });    

        this.shortcutsScrollBox.add_actor(this.shortcutsBox);
        this.quickBox.add(this.shortcutsScrollBox);

        // Add place shortcuts to menu (Home,Documents,Downloads,Music,Pictures,Videos)
        this._displayPlaces();

        //check to see if should draw separator
        if(this.placesShortcuts && this.softwareShortcuts)
            this.shortcutsBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT));
        

        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("Arc Menu Settings")];
        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];
            let shortcutButtonItem = new MW.ShortcutButtonItem(this, _(applicationName), applicationShortcuts[i][1], applicationShortcuts[i][2]);
            if(shortcutButtonItem.shouldShow)
                this.shortcutsBox.add(shortcutButtonItem.actor);
        }
        
        // Bottom Section for Power etc...
        this.actionsScrollBox = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.END,
            x_align: Clutter.ActorAlign.CENTER,
            x_fill: true,
            y_fill: true
        });
        this.actionsScrollBox.set_policy(Gtk.PolicyType.EXTERNAL, Gtk.PolicyType.NEVER);
        this.actionsScrollBox.clip_to_allocation = true;

        //create new section for Power, Lock, Logout, Suspend Buttons
        this.actionsBox = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.actionsScrollBox.add_actor(this.actionsBox);  

        if(this._settings.get_boolean('show-logout-button')){
            let logout = new MW.LogoutButton(this);
            this.actionsBox.add(logout.actor);
        }  
        if(this._settings.get_boolean('show-lock-button')){
            let lock = new MW.LockButton(this);
            this.actionsBox.add(lock.actor);
        }
        if(this._settings.get_boolean('show-suspend-button')){
            let suspend = new MW.SuspendButton(this);
            this.actionsBox.add(suspend.actor);
        }
        if(this._settings.get_boolean('show-power-button')){
            let power = new MW.PowerButton(this);
            this.actionsBox.add(power.actor);
        }      
        this.quickBox.add(this.actionsScrollBox);

        this.loadFavorites();
        this.loadCategories();
        this.setDefaultMenuView();
    }

    _displayPlaces() {
        var SHORTCUT_TRANSLATIONS = [_("Home"), _("Documents"), _("Downloads"), _("Music"), _("Pictures"), _("Videos"), _("Computer"), _("Network")];
        let directoryShortcuts = this._settings.get_value('directory-shortcuts-list').deep_unpack();
        for (let i = 0; i < directoryShortcuts.length; i++) {
            let directory = directoryShortcuts[i];
            let placeInfo, placeButtonItem;
            if(directory[2]=="ArcMenu_Home"){
                let homePath = GLib.get_home_dir();
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(homePath), _("Home"));
                placeButtonItem = new MW.PlaceButtonItem(this, placeInfo);
            }
            else if(directory[2]=="ArcMenu_Computer"){
                placeInfo = new PlaceDisplay.RootInfo();
                placeButtonItem = new PlaceDisplay.PlaceButtonItem(this, placeInfo);
            }
            else if(directory[2]=="ArcMenu_Network"){
                placeInfo = new PlaceDisplay.PlaceInfo('network',Gio.File.new_for_uri('network:///'), _('Network'),'network-workgroup-symbolic');
                placeButtonItem = new PlaceDisplay.PlaceButtonItem(this, placeInfo);
            }
            else if(directory[2].startsWith("ArcMenu_")){
                let path = directory[2].replace("ArcMenu_",'');

                if(path === "Documents")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS;
                else if(path === "Downloads")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_DOWNLOAD;
                else if(path === "Music")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_MUSIC;
                else if(path === "Pictures")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_PICTURES;
                else if(path === "Videos")
                    path = imports.gi.GLib.UserDirectory.DIRECTORY_VIDEOS;

                path = GLib.get_user_special_dir(path);
                if (path != null){
                    placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(directory[0]));
                    placeButtonItem = new MW.PlaceButtonItem(this, placeInfo)
                }
            }
            else{
                let path = directory[2];
                placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(directory[0]), (directory[1] !== "ArcMenu_Folder") ? directory[1] : null);
                placeButtonItem = new MW.PlaceButtonItem(this, placeInfo);
            }

            this.shortcutsBox.add_actor(placeButtonItem.actor);
        }
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        super.loadCategories();
    }

    displayFavorites(){
        super.displayFavorites();
        this.activeCategoryType = Constants.CategoryType.PINNED_APPS;
        this.backButton.actor.show();
    }

    displayAllApps(){
        super.displayAllApps();
        this.backButton.actor.show();
    }

    displayCategories(){
        super.displayCategories();
        this.activeCategoryType = Constants.CategoryType.CATEGORIES_LIST;
        this.backButton.actor.hide();
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.displayCategories();
    }

    displayCategoryAppList(appList){
        super.displayCategoryAppList(appList);
        this.activeCategoryType = Constants.CategoryType.CATEGORY_APP_LIST;
        this.backButton.actor.show();
    }
    
    displayFrequentApps(){
        this._clearActorsFromBox();
        this.backButton.actor.hide();
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        let appList = [];
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                let item = new MW.ApplicationMenuItem(this, mostUsed[i]);
                item.forceLargeIcon();
                appList.push(item);
            }
        }
        let activeMenuItemSet = false;
        for (let i = 0; i < appList.length; i++) {
            let item = appList[i];
            if(item.actor.get_parent())
                item.actor.get_parent().remove_actor(item.actor);
            if (!item.actor.get_parent()) 
                this.applicationsBox.add_actor(item.actor);
            if(!activeMenuItemSet){
                activeMenuItemSet = true;  
                this.activeMenuItem = item;
                if(this.leftClickMenu.isOpen){
                    this.mainBox.grab_key_focus();
                }
            }    
        }
    }
}
