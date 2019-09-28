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
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {Clutter, GLib, Gio, GMenu, Gtk, Shell, St} = imports.gi;
const AppFavorites = imports.ui.appFavorites;
const appSys = Shell.AppSystem.get_default();
const ArcSearch = Me.imports.search;
const Constants = Me.imports.constants;
const GnomeSession = imports.misc.gnomeSession;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MenuLayouts = Me.imports.menulayouts;
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';

var createMenu = class{
    constructor(mainButton) {
        this._button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this.leftClickMenu  = mainButton.leftClickMenu;
        this._session = new GnomeSession.SessionManager();
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this._applicationsButtons = new Map();
        this.allApps = [];
        this.newSearch = new ArcSearch.SearchResults(this);      
        this.mainBox._delegate = this.mainBox;
        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));

        this._tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
        this._treeChangedId = this._tree.connect('changed', ()=>{
            this._reload();
        });

        //LAYOUT------------------------------------------------------------------------------------------------
        this.mainBox.vertical = true;

        //Top Search Bar
        // Create search box
        this.searchBox = new MW.SearchBox();
        this.searchBox.actor.style ="margin: 0px 10px 5px 10px;";
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
        this.shortcutsScrollBox.set_width(275);  
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
            vertical: true
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
        this._loadAllMenuItems();

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
    updateIcons(){
        this._applicationsButtons.forEach((value,key,map)=>{
            map.get(key)._updateIcon();
        });
        this.newSearch._reset();
        
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
        this._applicationsButtons.clear();
        this._loadAllMenuItems();
        this._display();
    }
    _reload() {
        this.applicationsBox.destroy_all_children();
        this._applicationsButtons.clear();
        this._loadCategories();
        this._loadAllMenuItems();
        this._display();
    }
    updateStyle(){
        let addStyle=this._settings.get_boolean('enable-custom-arc-menu');
        if(this.newSearch){
            addStyle ? this.newSearch.setStyle('arc-menu-status-text') :  this.newSearch.setStyle('search-statustext'); 
            addStyle ? this.searchBox._stEntry.set_name('arc-search-entry') : this.searchBox._stEntry.set_name('search-entry');
        }
        if(this.actionsBox){
            this.actionsBox.actor.get_children().forEach(function (actor) {
                if(actor instanceof St.Button){
                    addStyle ? actor.add_style_class_name('arc-menu-action') : actor.remove_style_class_name('arc-menu-action');
                }
            }.bind(this));
        }
    }
    // Display the menu
    _display() {
        //this.mainBox.hide();
        //this._applicationsButtons.clear();
        this._displayCategories();
        this._displayAllApps();
        
        if(this.vertSep!=null)
            this.vertSep.queue_repaint(); 
        
    }
    _loadCategories(){
        this.applicationsByCategory = {};
        this.categoryDirectories=[];
        this.allApps = [];
        
        this.categoryDirectories.push("");
        this.applicationsByCategory["Frequent Apps"] = [];

        this._usage = Shell.AppUsage.get_default();
        let mostUsed =  modernGnome ?  this._usage.get_most_used() : this._usage.get_most_used("");
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show())
                this.applicationsByCategory["Frequent Apps"].push(mostUsed[i]);
        }
        
        this._tree.load_sync();
        let root = this._tree.get_root_directory();
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
                if (app){
                    this.applicationsByCategory[categoryId].push(app);
                    this.allApps.push(app);
                }
                    
            } else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let subdir = iter.get_directory();
                if (!subdir.get_is_nodisplay())
                    this._loadCategory(categoryId, subdir);
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
            overlay_scrollbars: true
        });
        
        this.applicationsScrollBox.set_width(225);  
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
        
        this.shortcutsBox = new St.BoxLayout({ vertical: true });
        //Add Horizontal Separator
        this.leftBox.add(this.shortcutsBox, {
            expand: true,
            x_fill: true, y_fill: true,
            y_align: St.Align.START
        });
        this.shortcutsBox.add( this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG), {
            x_expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.END
        });
        this.shortcutsBox.style = "padding: 5px 0px 0px 0px;"

        var SHORTCUT_TRANSLATIONS = [_("Software"),_("Software"), _("Settings")];
        for(let i = 0; i < 3; i++) {
            if (GLib.find_program_in_path(Constants.SHORTCUTS[i].command)) {
                let shortcutMenuItem = new MW.ShortcutMenuItem(this, SHORTCUT_TRANSLATIONS[i], Constants.SHORTCUTS[i].symbolic, Constants.SHORTCUTS[i].command);
                shortcutMenuItem.setIconSizeLarge();
                this.shortcutsBox.add(shortcutMenuItem.actor, {
                    expand: false,
                    x_fill: true,
                    y_fill: false,
                    y_align: St.Align.START,
                });
            }
        };


        //Add Horizontal Separator
        this.shortcutsBox.add( this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG), {
            x_expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.END
        });
        
        // Add place shortcuts to menu (Home,Documents,Downloads,Music,Pictures,Videos)
        
        
        //create new section for Power, Lock, Logout, Suspend Buttons
        this.actionsBox = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        //check if custom arc menu is enabled
        if( this._settings.get_boolean('enable-custom-arc-menu'))
            this.actionsBox.actor.add_style_class_name('arc-menu');
        //Logout Button
        if( this._settings.get_boolean('show-logout-button')){
            let logout = new MW.LogoutButton( this);
            this.actionsBox.actor.add(logout.actor, {
                expand: true,
                x_fill: false,
                y_align: St.Align.START
            });
        }  
        //LockButton
        if( this._settings.get_boolean('show-lock-button')){
            let lock = new MW.LockButton( this);
            this.actionsBox.actor.add(lock.actor, {
                expand: true,
                x_fill: false,
                y_align: St.Align.START
            });
        }
        //Suspend Button
        if( this._settings.get_boolean('show-suspend-button')){
            let suspend = new MW.SuspendButton( this);
            this.actionsBox.actor.add(suspend.actor, {
                expand: true,
                x_fill: false,
                y_align: St.Align.START
            });
        }
        //Power Button
        if( this._settings.get_boolean('show-power-button')){
            let power = new MW.PowerButton( this);
            this.actionsBox.actor.add(power.actor, {
                expand: true,
                x_fill: false,
                y_align: St.Align.START
            });
        }
        //add actionsbox to leftbox             
        this.leftBox.add( this.actionsBox.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.End
        });
    }
    placesAddSeparator(id){

    }
    _redisplayPlaces(id) {

    }
    _createPlaces(id) {
    }

    //used to check if a shortcut should be displayed
    getShouldShowShortcut(shortcutName){
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
        this.searchBox.clear();
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
        if (dir!="Frequent Apps") 
            this._displayButtons(this._listApplications(dir.get_menu_id()));
        else if(dir=="Frequent Apps") 
            this._displayButtons(this._listApplications("Frequent Apps"));
        else 
            this._displayCategories();
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
            let fakeactive = false;
            for (let i = 0; i < apps.length; i++) {
                let app = apps[i];
                let item = this._applicationsButtons.get(app);

                if (!item.actor.get_parent()) {
                    this.shorcutsBox.add_actor(item.actor);
                    if(!fakeactive){
                        item.setFakeActive(true);
                        item.grabKeyFocus();
                        fakeactive = true;
                    }
                }
            }
        }
    }
    _loadAllMenuItems() {
        let apps= this.allApps;
        apps.sort(function (a, b) {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });  
        for (let i = 0; i < apps.length; i++) {
            let app = apps[i];
            let item = this._applicationsButtons.get(app);
            if (!item) {
                item = new MW.ApplicationMenuItem(this, app);
                this._applicationsButtons.set(app, item);
            }
        } 
    }
    _displayAllApps(){
        let appList= this.allApps;
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
        if (this._treeChangedId > 0) {
            this._tree.disconnect(this._treeChangedId);
            this._treeChangedId = 0;
            this._tree = null;
        }
    }
    //Create a horizontal separator
    _createHorizontalSeparator(style){
        let alignment = Constants.SEPARATOR_ALIGNMENT.HORIZONTAL;
        let hSep = new MW.SeparatorDrawingArea(this._settings,alignment,style,{
            x_expand:true,
            y_expand:false
        });
        hSep.queue_repaint();
        return hSep;
    }
    // Create a vertical separator
    _createVertSeparator(){    
        let alignment = Constants.SEPARATOR_ALIGNMENT.VERTICAL;
        let style = Constants.SEPARATOR_STYLE.NORMAL;
        this.vertSep = new MW.SeparatorDrawingArea(this._settings,alignment,style,{
            x_expand:true,
            y_expand:true,
            style_class: 'vert-sep'
        });
        this.vertSep.queue_repaint();
        return  this.vertSep;
    }
};
