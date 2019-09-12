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
const IconGrid = imports.ui.iconGrid;

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
class createMenu {
    constructor(mainButton) {
        this.button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this.leftClickMenu  = mainButton.leftClickMenu;
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this._applicationsButtons = mainButton._applicationsButtons;
        this._applications=[];
        this._session = new GnomeSession.SessionManager();
        this.newSearch = new ArcSearch.SearchResults(this);      
        this.mainBox._delegate = this.mainBox;
        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));


        //LAYOUT------------------------------------------------------------------------------------------------
        this.mainBox.vertical = false;
  
        //Top Search Bar
        // Create search box
        this.searchBox = new MW.SearchBox();
        this._firstAppItem = null;
        this._firstApp = null;
        this._tabbedOnce = false;
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxActivateId = this.searchBox.connect('activate', this._onSearchBoxActive.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));


        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            vertical: true
        });
        //Add search box to menu
        this.subMainBox.add(this.searchBox.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });
        this.mainBox.add(this.subMainBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });

        //Right Box

        this.shorcutsBox = new St.BoxLayout({
            vertical: true
        });
        this.shortcutsScrollBox = new St.ScrollView({
            x_fill:false,
            y_fill: false,
            y_align: St.Align.START,
            overlay_scrollbars: true
        });   
        this.shortcutsScrollBox.set_width(450);  
        this.shortcutsScrollBox.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        let vscroll2 =  this.shortcutsScrollBox.get_vscroll_bar();
        vscroll2.connect('scroll-start', () => {
            this.leftClickMenu.passEvents = true;
        });
        vscroll2.connect('scroll-stop', () => {
            this.leftClickMenu.passEvents = false;
        }); 
        this.shortcutsScrollBox.add_actor( this.shorcutsBox);
        
      
        //this.shorcutsBox.add(this.iconGrid.actor);
        this.subMainBox.add( this.shortcutsScrollBox, {
            expand: true,
            x_fill: false,
            y_fill: true,
            y_align: St.Align.START
        });
        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box'
        });
        this._createRightBox();
        this.mainBox.add(this.rightBox);  
        this._loadCategories();
        this._displayAllApps();

        this._display();
        //Right Box
       

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
    resetSearch(){ //used by back button to clear results -- gets called on menu close
        this.searchBox.clear();
        this.setDefaultMenuView();  
    }
    _redisplayRightSide(){
        this.leftBox.destroy_all_children();
        this._createLeftBox();
   
        this.updateStyle();
    }
        // Redisplay the menu
        _redisplay() {

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
                    this.actionsBox.actor.get_children().forEach(function (actor) {
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
                    this.actionsBox.actor.get_children().forEach(function (actor) {
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
            //this._applications = [];
            this._displayAppIcons()
            
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

    
        }
        _displayGnomeFavorites(){

        }
        // Load menu place shortcuts
        _displayPlaces() {
            let homePath = GLib.get_home_dir();
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(homePath), _("Home"));
            let addToMenu = this._settings.get_boolean('show-home-shortcut');
            if(addToMenu){
                let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
                this.placesBox.add_actor(placeMenuItem.actor);
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
                    this.placesBox.add_actor(placeMenuItem.actor);
                }
            }
        }
        _loadFavorites() {
         
        }
        _displayFavorites() {
            
        }
        // Create the menu layout

        _createRightBox(){
            this.placesShortcuts=false
            this.externalDevicesShorctus = false;  
            this.networkDevicesShorctus = false;  
	        this.bookmarksShorctus = false;  
            this.softwareShortcuts = false;
            //add USER shortcut to top of right side menu
            this.user = new MW.UserMenuItem(this);
            this.rightBox.add(this.user.actor, {
                expand: false,
                x_fill: true,
                y_fill: false,
                y_align: St.Align.START
            });
     
            //draw top right horizontal separator under User Name
            this.rightBox.add(this._createHorizontalSeparator(true), {
                x_expand: true,
                x_fill: true,
                y_fill: false,
                y_align: St.Align.END
            });
            //Shortcuts Box
            this.placesBox = new St.BoxLayout({
                vertical: true
            });
            this.placesScrollBox = new St.ScrollView({
                x_fill: true,
                y_fill: false,
                y_align: St.Align.START,
                overlay_scrollbars: true
            });     
            this.placesScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            let vscroll2 = this.placesScrollBox.get_vscroll_bar();
            vscroll2.connect('scroll-start', () => {
                this.leftClickMenu.passEvents = true;
            });
            vscroll2.connect('scroll-stop', () => {
                this.leftClickMenu.passEvents = false;
            }); 
	        this.placesScrollBox.add_actor(this.placesBox);
	        this.rightBox.add(this.placesScrollBox);
            // Add place shortcuts to menu (Home,Documents,Downloads,Music,Pictures,Videos)
            this._displayPlaces();
            // add Home and Network shortcuts           
            if(this._settings.get_boolean('show-computer-shortcut')){
      		    this.placesShortcuts=true;  
                this.computer = new PlaceDisplay.RootInfo();
                this.computerMenuItem = new PlaceDisplay.PlaceMenuItem(this.computer,this);
            	this.placesBox.add_actor(this.computerMenuItem.actor);
            }
            if(this._settings.get_boolean('show-network-shortcut')){
             	this.placesShortcuts=true;
                this.network = new PlaceDisplay.PlaceInfo('network',Gio.File.new_for_uri('network:///'), _('Network'),'network-workgroup-symbolic');
                this.networkMenuItem = new PlaceDisplay.PlaceMenuItem(this.network,this);
             	this.placesBox.add_actor(this.networkMenuItem.actor);
            }
            //draw bottom right horizontal separator + logic to determine if should show
            let shouldDraw = false;
            for(let i=0;i<6;i++){
                if(this.getShouldShowShortcut(Constants.RIGHT_SIDE_SHORTCUTS[i])){
                   this.placesShortcuts=true;
                  break;
                }
            }
            for(let i =6;i<11;i++){
                if(this.getShouldShowShortcut(Constants.RIGHT_SIDE_SHORTCUTS[i])){
                this.softwareShortcuts = true;
                  break;
                }
            }
            //check to see if should draw separator
            if(this.placesShortcuts && (this._settings.get_boolean('show-external-devices') || this.softwareShortcuts || this._settings.get_boolean('show-bookmarks'))  )
                shouldDraw=true;  
            if(shouldDraw){
                this.placesBox.add(this._createHorizontalSeparator(true), {
                x_expand: true,
                y_expand:false,
                x_fill: true,
                y_fill: false,
                y_align: St.Align.END
                });
            }
            //External Devices and Bookmarks Shortcuts
	        this.externalDevicesBox = new St.BoxLayout({
    		    vertical: true
	        });	
            this.placesBox.add( this.externalDevicesBox, {
                x_fill: true,
                y_fill: false,
                expand:false
            });      
            this._sections = { };
  	        this.placesManager = new PlaceDisplay.PlacesManager();
	        for (let i = 0; i < Constants.SECTIONS.length; i++) {
                let id = Constants.SECTIONS[i];
                this._sections[id] =  new PopupMenu.PopupMenuSection({
                    vertical: true
                });	
                this.placesManager.connect(`${id}-updated`, () => {
                    this._redisplayPlaces(id);
 		        });

                this._createPlaces(id);
                this.externalDevicesBox.add(this._sections[id].actor);
	        }

            //Add Software Shortcuts to menu (Software, Settings, Tweaks, Terminal)
            var SHORTCUT_TRANSLATIONS = [_("Software"),_("Software"), _("Settings"),_("Tweaks"), _("Terminal")];
            let i = 0;
            Constants.SHORTCUTS.forEach(function (shortcut) {
                if (GLib.find_program_in_path(shortcut.command)) {
                    let addToMenu = this.getShouldShowShortcut(shortcut.label);
                    if(addToMenu)
                    {
                        let shortcutMenuItem = new MW.ShortcutMenuItem(this, SHORTCUT_TRANSLATIONS[i], shortcut.symbolic, shortcut.command);
                        this.placesBox.add(shortcutMenuItem.actor, {
                            expand: false,
                            x_fill: true,
                            y_fill: false,
                            y_align: St.Align.START,
                        });
                    }
                }
                i++;
            }.bind(this));
            
            //Add Activities Overview to menu
            if(this._settings.get_boolean('show-activities-overview-shortcut')){
                let activities = new MW.ActivitiesMenuItem(this);
                this.placesBox.add(activities.actor, {
                    expand: false,
                    x_fill: true,
                    y_fill: false,
                    y_align: St.Align.START
                });
            }
          
            //create new section for Power, Lock, Logout, Suspend Buttons
            this.actionsBox = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false
            });
            //check if custom arc menu is enabled
            if(this._settings.get_boolean('enable-custom-arc-menu'))
                this.actionsBox.actor.add_style_class_name('arc-menu');
            //Logout Button
            if(this._settings.get_boolean('show-logout-button')){
                let logout = new MW.LogoutButton(this);
                this.actionsBox.actor.add(logout.actor, {
                    expand: true,
                    x_fill: false,
                    y_align: St.Align.START
                });
            }  
            //LockButton
            if(this._settings.get_boolean('show-lock-button')){
                let lock = new MW.LockButton(this);
                this.actionsBox.actor.add(lock.actor, {
                    expand: true,
                    x_fill: false,
                    y_align: St.Align.START
                });
            }
            //Suspend Button
            if(this._settings.get_boolean('show-suspend-button')){
                let suspend = new MW.SuspendButton(this);
                this.actionsBox.actor.add(suspend.actor, {
                    expand: true,
                    x_fill: false,
                    y_align: St.Align.START
                });
            }
            //Power Button
            if(this._settings.get_boolean('show-power-button')){
                let power = new MW.PowerButton(this);
                this.actionsBox.actor.add(power.actor, {
                    expand: true,
                    x_fill: false,
                    y_align: St.Align.START
                });
            }
            //add actionsbox to rightbox             
            this.rightBox.add(this.actionsBox.actor, {
                expand: true,
                x_fill: true,
                y_fill: false,
                y_align: St.Align.END
            });
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
            let appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
            let appsScrollBoxAlloc = this.shortcutsScrollBox.get_allocation_box();
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

            this._displayAppIcons()


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

        }

        // Select a category or show category overview if no category specified
        selectCategory(dir) {


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
                    let item = this._applications.find(function(element){return element==app});
                    if (!item) {
                        this._applications.push(app);
                    }
                    
                }
              
                this.appsBox= new St.BoxLayout({
                    vertical: false
                });
                for (let i = 0; i < this._applications.length; i++){
                    if(i%15==0){
                        this.pageBox= new St.BoxLayout({
                            vertical: true
                        });
                        this.appsBox.add(this.pageBox, {
                            expand: false,
                            x_fill: false,
                            y_fill: false,
                            x_align: St.Align.MIDDLE,
                            y_align: St.Align.MIDDLE
                        });
                    }
                    if(i%5==0){ //create a new row every 5 app icons
                        this.rowBox= new St.BoxLayout({
                            vertical: false
                        });
                        this.pageBox.add(this.rowBox, {
                            expand: false,
                            x_fill: false,
                            y_fill: false,
                            x_align: St.Align.MIDDLE,
                            y_align: St.Align.MIDDLE
                        });
                    }
  
                    let app = this._applications[i];
                    let item = new MW.ApplicationMenuIcon(this, app);

                    this.rowBox.add(item.actor, {
                        expand: false,
                        x_fill: false,
                        y_fill: false,
                        x_align: St.Align.MIDDLE,
                        y_align: St.Align.MIDDLE
                    });
                }
            }
        }
        _displayAppIcons(){
            let actors = this.shorcutsBox.get_children();
                        for (let i = 0; i < actors.length; i++) {
                            let actor = actors[i];
                            this.shorcutsBox.remove_actor(actor);
                    
                }
            this.shorcutsBox.add(this.appsBox, {
                expand: true,
                x_fill: true,
                y_fill: true,
                x_align: St.Align.MIDDLE,
                y_align: St.Align.MIDDLE
            });

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
