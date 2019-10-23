/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * This file has been created specifically for ArcMenu under the terms of the GPLv2 licence by : 
 *
 * Original work: Copyright (C) 2019 Andrew Zaech 
 *
 * Artwork work: Copyright (C) 2017-2019 LinxGem33
 * 
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
        this.button = mainButton;
        this._settings = mainButton._settings;
        this.section = mainButton.section;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this.leftClickMenu  = mainButton.leftClickMenu;


        this._applicationsButtons = new Map();
        this._session = new GnomeSession.SessionManager();
        this.subMenuManager = mainButton.subMenuManager;
        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));
        this.isRunning=true;

        this._tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
        this._treeChangedId = this._tree.connect('changed', ()=>{
            this._reload();
        });
        //LAYOUT------------------------------------------------------------------------------------------------
        this.mainBox.vertical = true;
        
        this._firstAppItem = null;
        this._firstApp = null;
        this._tabbedOnce = false;

        this._createLeftBox();
        this._loadCategories();
        this._display(); 
    }
    _onMainBoxKeyPress(mainBox, event) {

        return Clutter.EVENT_PROPAGATE;
    }
    setCurrentMenu(menu){
        this.currentMenu = menu;
    }
    getCurrentMenu(){
        return this.currentMenu;
    } 
    resetSearch(){ //used by back button to clear results
        this.setDefaultMenuView();  
    }
    _redisplayRightSide(){
    }
    // Redisplay the menu
    _redisplay() {
        if (this.applicationsBox)
            this._clearApplicationsBox();
        this._display();
    }
    _reload() {
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.categoryDirectories[i].destroy();
        }    

        this.applicationsBox.destroy_all_children();
        this._createLeftBox();
        this._loadCategories();
        this._display();
    }
    updateStyle(){
        if(this.categoryDirectories){
            for (let i = 0; i <  this.categoryDirectories.length; i++) {
                this.categoryDirectories[i].updateStyle();
            }
        } 
    }
    // Display the menu
    _display() {
        this._displayCategories();       
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
                if (app ){
                    this.applicationsByCategory[categoryId].push(app);
                    let item = this._applicationsButtons.get(app);
                    if (!item) {
                        item = new MW.ApplicationMenuItem(this, app);
                        this._applicationsButtons.set(app, item);
                    }
                }
                    
            } else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let subdir = iter.get_directory();
                if (!subdir.get_is_nodisplay())
                    this._loadCategory(categoryId, subdir);
            }
        }
    }

    // Load data for all menu categories
    _loadCategories() {
        this.applicationsByCategory = null;
        this.applicationsByCategory = {};
        this.categoryDirectories = null;
        this.categoryDirectories=[]; 

        let categoryMenuItem = new MW.SimpleMenuItem(this, "","Favorites");
        this.categoryDirectories.push(categoryMenuItem);
        categoryMenuItem = new MW.SimpleMenuItem(this, "","All Programs");
        this.categoryDirectories.push(categoryMenuItem);

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
                    categoryMenuItem = new MW.SimpleMenuItem(this, dir);
                    this.categoryDirectories.push(categoryMenuItem); 
                }
            }
        }
    }
    _displayCategories(){

        this._clearApplicationsBox();
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.applicationsBox.add_actor(this.categoryDirectories[i].actor);	
        }
        
        this.updateStyle();
    }
    _displayGnomeFavorites(categoryMenuItem){
        let appList = AppFavorites.getAppFavorites().getFavorites();

        appList.sort(function (a, b) {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._displayButtons(appList,categoryMenuItem);
        this.updateStyle(); 


    }
    updateIcons(){   
        this._applicationsButtons.forEach((value,key,map)=>{
            map.get(key)._updateIcon();
        });    
    }
    _displayPlaces() {
    }
    _loadFavorites() {  
    }
    _displayFavorites() {     
    }
    // Create the menu layout

    _createLeftBox(){
        let actors = this.section.actor.get_children();
        for (let i = 0; i < actors.length; i++) {
            let actor = actors[i];
            this.section.actor.remove_actor(actor);
        }
        this.applicationsBox = new St.BoxLayout({ vertical: true });

        this.section.actor.add_actor(this.applicationsBox);  

    }
    placesAddSeparator(id){ 
    }
    _redisplayPlaces(id) {
    }
    _createPlaces(id) {
    }
    getShouldShowShortcut(shortcutName){
    }
    
    setDefaultMenuView(){

    }
    _setActiveCategory(){

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
    selectCategory(dir, categoryMenuItem) {
        if (dir!="Frequent Apps") {
            this._displayButtons(this._listApplications(dir.get_menu_id()), categoryMenuItem);
        }
        else if(dir=="Frequent Apps") {
            this._displayButtons(this._listApplications("Frequent Apps"), categoryMenuItem);

        }
        else {
            //this._displayCategories();
        }
        this.updateStyle();
    }

    // Display application menu items
    _displayButtons(apps, categoryMenuItem) {
        if (apps) {
            let children = categoryMenuItem.applicationsBox.get_children();
            for (let i = 0; i < children.length; i++) {
                let item = children[i];
                categoryMenuItem.applicationsBox.remove_actor(item);
            }
                for (let i = 0; i < apps.length; i++) {
                    let app = apps[i];
                    let item = this._applicationsButtons.get(app);
                    if (!item) {
                        item = new MW.ApplicationMenuItem(this, app);
                        this._applicationsButtons.set(app, item);
                    }
                    if(item.actor.get_parent()){
                        item.actor.get_parent().remove_actor(item.actor);
                    }
                    if (!item.actor.get_parent()) {
                        categoryMenuItem.applicationsBox.add_actor(item.actor); 
                    }
                    if(i==0){
                        item.setFakeActive(true);
                        item.grabKeyFocus();
                    }
                }
        }
    }
    _displayAllApps(categoryMenuItem){
        let appList= []
        this._applicationsButtons.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort(function (a, b) {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._displayButtons(appList,categoryMenuItem);
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
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.categoryDirectories[i].destroy();
        }
        this._applicationsButtons.forEach((value,key,map)=>{
            value.destroy();
        });
        this.categoryDirectories=null;
        this._applicationsButtons=null;


        if (this._treeChangedId > 0) {
            this._tree.disconnect(this._treeChangedId);
            this._treeChangedId = 0;
            this._tree = null;
        }
        this.isRunning=false;

    }

};
