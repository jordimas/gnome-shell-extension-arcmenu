/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Original work: Copyright (C) 2015 Giovanni Campagna
 * Modified work: Copyright (C) 2016-2017 Zorin OS Technologies Ltd.
 * Modified work: Copyright (C) 2017 Alexander Rüedlinger
 * Modified work: Copyright (C) 2017-2019 LinxGem33
 * Modified work: Copyright (C) 2019 Andrew Zaech
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
const Signals = imports.signals;
const Atk = imports.gi.Atk;
const GMenu = imports.gi.GMenu;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const AppFavorites = imports.ui.appFavorites;
const Util = imports.misc.util;
const GnomeSession = imports.misc.gnomeSession;
const ExtensionUtils = imports.misc.extensionUtils;
const ExtensionSystem = imports.ui.extensionSystem;
const Me = ExtensionUtils.getCurrentExtension();
const PlaceDisplay = Me.imports.placeDisplay;
const MW = Me.imports.menuWidgets;

const MenuLayouts = Me.imports.menulayouts;

const ArcSearch = Me.imports.search;
const Constants = Me.imports.constants;

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;
const Utils =  Me.imports.utils;
const appSys = Shell.AppSystem.get_default();
const PanelMenu = imports.ui.panelMenu;
let modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';

// Application Menu Button class (most of the menu logic is here)
var createMenu = class {
    constructor(mainButton) {
        this.button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this.leftClickMenu  = mainButton.leftClickMenu;
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this._applicationsButtons = mainButton._applicationsButtons;
        this._session = new GnomeSession.SessionManager();
        this.newSearch = new ArcSearch.SearchResults(this);      
        this.mainBox._delegate = this.mainBox;
        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));


        //LAYOUT------------------------------------------------------------------------------------------------
        this.mainBox.vertical = true;
        //TOP BAR
        this.topBox= new St.BoxLayout({
            vertical: false
        });
        this.topBox.style ="margin: 0px 10px;spacing: 5px;";
        this.mainBox.add(this.topBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });
        this.user = new MW.UserMenuItem(this);
        this.topBox.add(this.user.actor, {
            expand: true,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });
        //create new section for Power, Lock, Logout, Suspend Buttons
        this.actionsBox = new St.BoxLayout({
            vertical: false
        });
        
        this.actionsBox.style ="spacing: 10px; margin-right:10px;";
        //check if custom arc menu is enabled
        if( this._settings.get_boolean('enable-custom-arc-menu'))
            this.actionsBox.add_style_class_name('arc-menu');
        
        //SettingsButton  
        let settingsButton= new MW.SettingsButton( this);
        this.actionsBox.add(settingsButton.actor, {
            expand: false,
            x_fill: true,
            x_align: St.Align.END,
            margin:5,
        });
        //UserButton  
        let userButton= new MW.UserButton( this);
        this.actionsBox.add(userButton.actor, {
            expand: false,
            x_fill: true,
            x_align: St.Align.END,
            margin:5,
        });
        //LockButton
        let lock = new MW.LockButton( this);
        this.actionsBox.add(lock.actor, {
            expand: false,
            x_fill: true,
            x_align: St.Align.END,
            margin:5,
        });
        //Logout Button
        let logout = new MW.LogoutButton( this);
        this.actionsBox.add(logout.actor, {
            expand: false,
            x_fill: true,
            x_align: St.Align.END,
            margin:5,
        });

  

        
        
        //add actionsbox to leftbox             
        this.topBox.add( this.actionsBox, {
            expand: false,
            x_fill: false,
            y_fill: false,
            y_align: St.Align.START,
            x_align: St.Align.END
        });
        this.mainBox.add(this.topBox, {
            expand: false,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START,
            x_align: St.Align.END,
        });

        //Top Search Bar
        // Create search box
        this.searchBox = new MW.SearchBox();
        this.searchBox.actor.style ="margin: 10px;";
        this._firstAppItem = null;
        this._firstApp = null;
        this._tabbedOnce = false;
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxActivateId = this.searchBox.connect('activate', this._onSearchBoxActive.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        //Add search box to menu
        this.mainBox.add(this.searchBox.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });

        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            vertical: false
        });
        this.mainBox.add(this.subMainBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });

        //Right Box
        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box'
        });
        this.shorcutsBox = new St.BoxLayout({
            vertical: true
        });
        this.shortcutsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            overlay_scrollbars: true
        });   
        this.shortcutsScrollBox.set_width(250);  
        this.shortcutsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        let vscroll2 =  this.shortcutsScrollBox.get_vscroll_bar();
        vscroll2.connect('scroll-start', () => {
            this.leftClickMenu.passEvents = true;
        });
        vscroll2.connect('scroll-stop', () => {
            this.leftClickMenu.passEvents = false;
        }); 
        this.shortcutsScrollBox.add_actor( this.shorcutsBox);
        this.rightBox.add( this.shortcutsScrollBox);
        // Left Box
        //Menus Left Box container
        this.leftBox = new St.BoxLayout({
            vertical: true,
            style_class: 'left-box'
        });
        this.subMainBox.add( this.leftBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });
                //Add Vert Separator to Main Box
                this.subMainBox.add( this._createVertSeparator(), {
                    expand: true,
                    x_fill: true,
                    y_fill: true
                });
        this._createLeftBox();
        this.subMainBox.add( this.rightBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });

        this._loadCategories();

        this._display(); 
    }
    _onMainBoxKeyPress(mainBox, event) {
        if (!this.searchBox) {
            return Clutter.EVENT_PROPAGATE;
        }
        if (event.has_control_modifier()) {
            if(this.searchBox)
                this.searchBox.grabKeyFocus();
            return Clutter.EVENT_PROPAGATE;
        }

        let symbol = event.get_key_symbol();
        let key = event.get_key_unicode();

        switch (symbol) {
            case Clutter.KEY_BackSpace:
                if(this.searchBox){
                    if (!this.searchBox.hasKeyFocus()) {
                        this.searchBox.grabKeyFocus();
                        let newText = this.searchBox.getText().slice(0, -1);
                        this.searchBox.setText(newText);
                    }
                }
                return Clutter.EVENT_PROPAGATE;
            case Clutter.KEY_Tab:
            case Clutter.KEY_KP_Tab:
            case Clutter.Up:
            case Clutter.KP_Up:
            case Clutter.Down:
            case Clutter.KP_Down:
            case Clutter.Left:
            case Clutter.KP_Left:
            case Clutter.Right:
            case Clutter.KP_Right:
                return Clutter.EVENT_PROPAGATE;
            default:
                if (key.length != 0) {
                    if(this.searchBox){
                        this.searchBox.grabKeyFocus();
                        let newText = this.searchBox.getText() + key;
                        this.searchBox.setText(newText);
                    }
                }
        }
        return Clutter.EVENT_PROPAGATE;
    }
    setCurrentMenu(menu){
        this.currentMenu = menu;
    }
    getCurrentMenu(){
        return this.currentMenu;
    } 
    resetSearch(){ //used by back button to clear results
        this.searchBox.clear();
        this.setDefaultMenuView();  
    }
    _redisplayRightSide(){
        this.leftBox.destroy_all_children();
        this._createLeftBox();
        this._displayCategories();
        this.updateStyle();
    }
        // Redisplay the menu
        _redisplay() {
            if (this.applicationsBox)
                this._clearApplicationsBox();
            this._display();
        }
        updateStyle(){
            let addStyle=this._settings.get_boolean('enable-custom-arc-menu');
  
            if(addStyle){
                if(this.newSearch){
                    this.newSearch.setStyle('arc-menu-status-text');
                    this.searchBox._stEntry.set_name('arc-search-entry');
                }
                if(this.actionsBox){
                    this.actionsBox.get_children().forEach(function (actor) {
                        if(actor instanceof St.Button){
                            actor.add_style_class_name('arc-menu-action');
                        }
                    }.bind(this));
                }
            }
            else
            {       
                if(this.newSearch){ 
                    this.newSearch.setStyle('search-statustext');            
                    this.searchBox._stEntry.set_name('search-entry');
                }
                if(this.actionsBox){
                    this.actionsBox.get_children().forEach(function (actor) {
                        if(actor instanceof St.Button){
                            actor.remove_style_class_name('arc-menu-action');
                        }
                    }.bind(this));
                }
            }
        }
        // Display the menu
        _display() {
            //this.mainBox.hide();
            this._applicationsButtons.clear();
            this._displayCategories();
            this._displayAllApps();
            
            if(this.vertSep!=null)
                this.vertSep.queue_repaint(); 
            
        }
        // Load menu category data for a single category
        _loadCategory(categoryId, dir) {
            let iter = dir.iter();
            let nextType;
            while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
                if (nextType == GMenu.TreeItemType.ENTRY) {
                    let entry = iter.get_entry();
                    let id;
                    try {
                        id = entry.get_desktop_file_id();
                    } catch (e) {
                        continue;
                    }
                    let app = appSys.lookup_app(id);
                    if (app && app.get_app_info().should_show())
                        this.applicationsByCategory[categoryId].push(app);
                } else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                    let subdir = iter.get_directory();
                    if (!subdir.get_is_nodisplay())
                        this._loadCategory(categoryId, subdir);
                }
            }
        }

        // Load data for all menu categories
        _loadCategories() {
            this.applicationsByCategory = {};
            this.categoryDirectories=[];
            
            this.categoryDirectories.push("");
            this.applicationsByCategory["Frequent Apps"] = [];
    
            this._usage = Shell.AppUsage.get_default();
            let mostUsed =  modernGnome ?  this._usage.get_most_used() : this._usage.get_most_used("");
            for (let i = 0; i < mostUsed.length; i++) {
                if (mostUsed[i] && mostUsed[i].get_app_info().should_show())
                    this.applicationsByCategory["Frequent Apps"].push(mostUsed[i]);
            }
            
            let tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
            tree.load_sync();
            let root = tree.get_root_directory();
            let iter = root.iter();
            let nextType;
            while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
                if (nextType == GMenu.TreeItemType.DIRECTORY) {
                    let dir = iter.get_directory();                  
                    if (!dir.get_is_nodisplay()) {
                        let categoryId = dir.get_menu_id();
                        this.applicationsByCategory[categoryId] = [];
                        this._loadCategory(categoryId, dir);
                        this.categoryDirectories.push(dir);  
                    }
                }
            }
        }
        _displayCategories(){

         	this._clearApplicationsBox();
            this.categoryMenuItemArray=[];
            
                let categoryMenuItem = new MW.CategoryMenuItem(this, "","All Programs");
                this.categoryMenuItemArray.push(categoryMenuItem);
                this.applicationsBox.add_actor(categoryMenuItem.actor);	
                categoryMenuItem.setFakeActive(true);
                categoryMenuItem = new MW.CategoryMenuItem(this, "","Favorites");
                this.categoryMenuItemArray.push(categoryMenuItem);
                this.applicationsBox.add_actor(categoryMenuItem.actor);	
    		for(var categoryDir of this.categoryDirectories){
                if(!categoryDir){
                    
                }
                else{
                    let categoryMenuItem = new MW.CategoryMenuItem(this, categoryDir);
                    this.categoryMenuItemArray.push(categoryMenuItem);
                    this.applicationsBox.add_actor(categoryMenuItem.actor);	
                }
            }

            
            this.updateStyle();
        }
        _displayGnomeFavorites(){
            let appList = AppFavorites.getAppFavorites().getFavorites();

            appList.sort(function (a, b) {
                return a.get_name().toLowerCase() > b.get_name().toLowerCase();
            });

            this._displayButtons(appList);
            this.updateStyle(); 


        }
        // Load menu place shortcuts
        _displayPlaces() {
            let homePath = GLib.get_home_dir();
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(homePath), _("Home"));
            let addToMenu = this._settings.get_boolean('show-home-shortcut');
            if(addToMenu){
                let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
                this.shorcutsBox.add_actor(placeMenuItem.actor);
            }    
            let dirs = Constants.DEFAULT_DIRECTORIES.slice();
            var SHORTCUT_TRANSLATIONS = [_("Documents"),_("Downloads"), _("Music"),_("Pictures"),_("Videos")];
            for (let i = 0; i < dirs.length; i++) {
                let path = GLib.get_user_special_dir(dirs[i]);
                if (path == null || path == homePath)
                    continue;
                let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _(SHORTCUT_TRANSLATIONS[i]));
                addToMenu = this.getShouldShowShortcut(Constants.RIGHT_SIDE_SHORTCUTS[i+1]);
                if(addToMenu){
                    let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
                    this.shorcutsBox.add_actor(placeMenuItem.actor);
                }
            }
        }
        _loadFavorites() {
         
        }
        _displayFavorites() {
            
        }
        // Create the menu layout

        _createLeftBox(){
            //Applications Box - Contains Favorites, Categories or programs
            this.applicationsScrollBox = new St.ScrollView({
                x_fill: true,
                y_fill: true,
                y_align: St.Align.START,
                style_class: 'apps-menu vfade left-scroll-area',
                overlay_scrollbars: true
            });
            this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            let vscroll =  this.applicationsScrollBox.get_vscroll_bar();
            vscroll.connect('scroll-start', () => {
                this.leftClickMenu.passEvents = true;
            });
            vscroll.connect('scroll-stop', () => {
                this.leftClickMenu.passEvents = false;
            });
            this.leftBox.add( this.applicationsScrollBox, {
                expand: true,
                x_fill: true, y_fill: true,
                y_align: St.Align.START
            });
            this.applicationsBox = new St.BoxLayout({ vertical: true });
            this.applicationsScrollBox.add_actor( this.applicationsBox);
            
        }
        placesAddSeparator(id){
            this._sections[id].box.add(this._createHorizontalSeparator(true), {
                x_expand: true,
                y_expand:false,
                x_fill: true,
                y_fill: false,
                y_align: St.Align.END
            });  
        }
        _redisplayPlaces(id) {
            if(this._sections[id].length>0){
                this.bookmarksShorctus = false;
                this.externalDevicesShorctus = false;
                this.networkDevicesShorctus = false;
                this._sections[id].removeAll();
                this._sections[id].box.destroy_all_children();
            }
            this._createPlaces(id);
        }
    	_createPlaces(id) {
            let places = this.placesManager.get(id);
            if(this.placesManager.get('network').length>0)
                this.networkDevicesShorctus = true; 
            if(this.placesManager.get('devices').length>0)
                this.externalDevicesShorctus=true;  
            if(this.placesManager.get('bookmarks').length>0)
                this.bookmarksShorctus = true;

            if (this._settings.get_boolean('show-bookmarks')){
                if(id=='bookmarks' && places.length>0){
                    for (let i = 0; i < places.length; i++){
                        let item = new PlaceDisplay.PlaceMenuItem(places[i],this);
                        this._sections[id].addMenuItem(item); 
                    } 
                    //create a separator if bookmark and software shortcut are both shown
                    if(this.bookmarksShorctus && this.softwareShortcuts){
                        this.placesAddSeparator(id);
                    }
                }
            }
            if (this._settings.get_boolean('show-external-devices')){
                if(id== 'devices'){
                    for (let i = 0; i < places.length; i++){
                        let item = new PlaceDisplay.PlaceMenuItem(places[i],this);
                        this._sections[id].addMenuItem(item); 
                    }
                    if((this.externalDevicesShorctus &&  !this.networkDevicesShorctus)  
                        &&  (this.bookmarksShorctus || this.softwareShortcuts))
                            this.placesAddSeparator(id);
                }
                if(id== 'network'){
                    for (let i = 0; i < places.length; i++){
                        let item = new PlaceDisplay.PlaceMenuItem(places[i],this);
                        this._sections[id].addMenuItem(item); 
                    }
                    if(this.networkDevicesShorctus &&  (this.bookmarksShorctus || this.softwareShortcuts))
                            this.placesAddSeparator(id);                        
                }
            }
    	}

        //used to check if a shortcut should be displayed
        getShouldShowShortcut(shortcutName){
            let setting = 'show-'+shortcutName+'-shortcut';
            let settingName = GLib.utf8_strdown(setting,setting.length);
            let addToMenu =false;
            try{
                addToMenu = this._settings.get_boolean(settingName);
            }
            catch (err) {
              
            }
      	    return addToMenu;
        }
        // Scroll to a specific button (menu item) in the applications scroll view
        scrollToButton(button) {
            let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
            let appsScrollBoxAlloc = this.applicationsScrollBox.get_allocation_box();
            let currentScrollValue = appsScrollBoxAdj.get_value();
            let boxHeight = appsScrollBoxAlloc.y2 - appsScrollBoxAlloc.y1;
            let buttonAlloc = button.actor.get_allocation_box();
            let newScrollValue = currentScrollValue;
            if (currentScrollValue > buttonAlloc.y1 - 10)
                newScrollValue = buttonAlloc.y1 - 10;
            if (boxHeight + currentScrollValue < buttonAlloc.y2 + 10)
                newScrollValue = buttonAlloc.y2 - boxHeight + 10;
            if (newScrollValue != currentScrollValue)
                appsScrollBoxAdj.set_value(newScrollValue);
        }
        
        setDefaultMenuView()
        {
            this._clearApplicationsBox();
       
                this.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
                this._displayCategories();
                this._displayAllApps();


        }
        _setActiveCategory(){

            for (let i = 0; i < this.categoryMenuItemArray.length; i++) {
                let actor = this.categoryMenuItemArray[i];
                actor.setFakeActive(false);
                //actor.remove_style_class_name('active');
            }
        }
        _onSearchBoxKeyPress(searchBox, event) {
            let symbol = event.get_key_symbol();
            if (!searchBox.isEmpty() && searchBox.hasKeyFocus()) {
                if (symbol == Clutter.Up) {
                    this.newSearch.getTopResult().actor.grab_key_focus();
                }
                else if (symbol == Clutter.Down) {
                    this.newSearch.getTopResult().actor.grab_key_focus();
            	}
    	    }
            return Clutter.EVENT_PROPAGATE;
        }
        _onSearchBoxKeyFocusIn(searchBox) {
            if (!searchBox.isEmpty()) {
                this.newSearch.highlightDefault(true);
           }
        }
   
        _onSearchBoxActive() {
            if (this.newSearch.getTopResult()) {
                this.newSearch.getTopResult().activate();
            }
        }

        _onSearchBoxChanged(searchBox, searchString) {        
            if(this.currentMenu != Constants.CURRENT_MENU.SEARCH_RESULTS){              
            	this.currentMenu = Constants.CURRENT_MENU.SEARCH_RESULTS;        
            }
            if(searchBox.isEmpty()){  
                this.setDefaultMenuView();                     	          	
            	this.newSearch.actor.hide();
            }            
            else{         

                
                    let actors = this.shorcutsBox.get_children();
                        for (let i = 0; i < actors.length; i++) {
                            let actor = actors[i];
                            this.shorcutsBox.remove_actor(actor);
                    }
                    this.shorcutsBox.add(this.newSearch.actor); 
                 
                this.newSearch.highlightDefault(true);
 		        this.newSearch.actor.show();         
                this.newSearch.setTerms([searchString]); 
          	    
            }            	
        }
        // Clear the applications menu box
        _clearApplicationsBox() {
            let actors = this.applicationsBox.get_children();
            for (let i = 0; i < actors.length; i++) {
                let actor = actors[i];
                this.applicationsBox.remove_actor(actor);
            }
        }

        // Select a category or show category overview if no category specified
        selectCategory(dir) {

 
            if (dir!="Frequent Apps") {
                this._displayButtons(this._listApplications(dir.get_menu_id()));
            }
            else if(dir=="Frequent Apps") {
                this._displayButtons(this._listApplications("Frequent Apps"));
   
            }
            else {
                this._displayCategories();
            }
            this.updateStyle();
        }

        // Display application menu items
        _displayButtons(apps) {
            if (apps) {
               
                    let actors = this.shorcutsBox.get_children();
                        for (let i = 0; i < actors.length; i++) {
                            let actor = actors[i];
                            this.shorcutsBox.remove_actor(actor);
                    
                }
                   
                for (let i = 0; i < apps.length; i++) {
                    let app = apps[i];
                    let item = this._applicationsButtons.get(app);
                    if (!item) {
                        item = new MW.ApplicationMenuItem(this, app);
                        this._applicationsButtons.set(app, item);
                    }
                    if (!item.actor.get_parent()) {
                            this.shorcutsBox.add_actor(item.actor);	
                    }
                    if(i==0){
                        item.setFakeActive(true);
                        item.grabKeyFocus();
                    }
                }
            }
        }
        _displayAllApps(){
            let appList=[];
            for(let directory in this.applicationsByCategory){
                appList = appList.concat(this.applicationsByCategory[directory]);
            }
            appList.sort(function (a, b) {
                return a.get_name().toLowerCase() > b.get_name().toLowerCase();
            });
            this._displayButtons(appList);
            this.updateStyle(); 

        }
        // Get a list of applications for the specified category or search query
        _listApplications(category_menu_id) {
            let applist;

            // Get applications in a category or all categories
            if (category_menu_id) {
                applist = this.applicationsByCategory[category_menu_id];
            } else {
                applist = [];
                for (let directory in this.applicationsByCategory)
                    applist = applist.concat(this.applicationsByCategory[directory]);
            }
            if(category_menu_id != "Frequent Apps"){
                applist.sort(function (a, b) {
                    return a.get_name().toLowerCase() > b.get_name().toLowerCase();
                });
            }
            
            return applist;
        }
        destroy(){
            if(this.network!=null){
                this.network.destroy();
                this.networkMenuItem.destroy();
            }
            if(this.computer!=null){
                this.computer.destroy();
                this.computerMenuItem.destroy();
            }
            if(this.placesManager!=null)
                this.placesManager.destroy();
            if(this.searchBox!=null){
                if (this._searchBoxChangedId > 0) {
                    this.searchBox.disconnect(this._searchBoxChangedId);
                    this._searchBoxChangedId = 0;
                }
                if (this._searchBoxKeyPressId > 0) {
                    this.searchBox.disconnect(this._searchBoxKeyPressId);
                    this._searchBoxKeyPressId = 0;
                }
                if (this._searchBoxActivateId > 0) {
                    this.searchBox.disconnect(this._searchBoxActivateId);
                    this._searchBoxActivateId = 0;
                }
                if (this._searchBoxKeyFocusInId > 0) {
                    this.searchBox.disconnect(this._searchBoxKeyFocusInId);
                    this._searchBoxKeyFocusInId = 0;
                }
                if (this._mainBoxKeyPressId > 0) {
                    this.mainBox.disconnect(this._mainBoxKeyPressId);
                    this._mainBoxKeyPressId = 0;
                }
            }
        }
        //Create a horizontal separator
        _createHorizontalSeparator(rightSide){
            let hSep = new St.DrawingArea({
                 x_expand:true,
                 y_expand:false
             });
             if(rightSide)
                 hSep.set_height(15); //increase height if on right side
             else 
                 hSep.set_height(10);
             hSep.connect('repaint', ()=> {
                 let cr = hSep.get_context();
                 let [width, height] = hSep.get_surface_size();                 
                 let b, stippleColor;                                                            
                 [b,stippleColor] = Clutter.Color.from_string(this._settings.get_string('separator-color'));           
                 if(rightSide){   
                     cr.moveTo(width / 4, height-7.5);
                     cr.lineTo(3 * width / 4, height-7.5);
                 }   
                 else{   
                     cr.moveTo(25, height-4.5);
                     cr.lineTo(width-25, height-4.5);
                 }
                 //adjust endpoints by 0.5 
                 //see https://www.cairographics.org/FAQ/#sharp_lines
                 Clutter.cairo_set_source_color(cr, stippleColor);
                 cr.setLineWidth(1);
                 cr.stroke();
             });
             hSep.queue_repaint();
             return hSep;
         }
         // Create a vertical separator
         _createVertSeparator(){      
             let vertSep = new St.DrawingArea({
                 x_expand:true,
                 y_expand:true,
                 style_class: 'vert-sep'
             });
             vertSep.connect('repaint', ()=> {
                 if(this._settings.get_boolean('vert-separator'))  {
                     let cr = vertSep.get_context();
                     let [width, height] = vertSep.get_surface_size();
                     let b, stippleColor;   
                     [b,stippleColor] = Clutter.Color.from_string(this._settings.get_string('separator-color'));   
                     let stippleWidth = 1;
                     let x = Math.floor(width / 2) + 0.5;
                     cr.moveTo(x,  0.5);
                     cr.lineTo(x, height - 0.5);
                     Clutter.cairo_set_source_color(cr, stippleColor);
                     cr.setLineWidth(stippleWidth);
                     cr.stroke();
                 }
             }); 
             vertSep.queue_repaint();
             return vertSep;
         }
    };
