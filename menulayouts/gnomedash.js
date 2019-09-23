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

// Application Menu Button class (most of the menu logic is here)
var createMenu = class {
    constructor(mainButton) {
        this.button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this.leftClickMenu  = mainButton.leftClickMenu;
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this._applicationsButtons = new Map();
       
     
        this.mainBox._delegate = this.mainBox;
        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));

        
 

    }
    _onMainBoxKeyPress(mainBox, event) {

        return Clutter.EVENT_PROPAGATE;
    }
    setCurrentMenu(menu){
    }
    getCurrentMenu(){
    } 
    resetSearch(){ //used by back button to clear results
    }
    _redisplayRightSide(){
    }
        // Redisplay the menu
        _redisplay() {

        }
        updateStyle(){

        }
        // Display the menu
        _display() {

            
        }
        // Load menu category data for a single category
        _loadCategory(categoryId, dir) {
        }

        // Load data for all menu categories
        _loadCategories() {

        }
        _displayCategories(){
        }
        _displayGnomeFavorites(){

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

        }
        
        setDefaultMenuView()
        {

        }
        _setActiveCategory(){
        }
        
        // Clear the applications menu box
        _clearApplicationsBox() {
        }

        // Select a category or show category overview if no category specified
        selectCategory(dir) {
        }

        // Display application menu items
        _displayButtons(apps) {

        }
        _displayAllApps(){

        }
        // Get a list of applications for the specified category or search query
        _listApplications(category_menu_id) {

        }
        destroy(){
        }
    };
