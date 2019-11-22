/*
 * Arc Menu - The new Application Menu for GNOME 3
 *
 * Arc Menu Lead Developer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * Arc Menu Founder/Maintainer/Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33
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
 *
 * Credits:
 * Complete list of credits and previous developers - https://gitlab.com/LinxGem33/Arc-Menu#credits
 * 
 * This project uses modified code from Gnome-Shell-Extensions (Apps-Menu and Places-Menu)
 * and modified code from Gnome-Shell source code.
 * https://gitlab.gnome.org/GNOME/gnome-shell-extensions/tree/master/extensions
 * https://github.com/GNOME/gnome-shell
 * 
 * Arc Menu also leverages some code from the Menu extension by Zorin OS and some utility 
 * functions from Dash to Panel https://github.com/home-sweet-gnome/dash-to-panel
 * 
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

var createMenu = class {
    constructor(mainButton) {
        this._button = mainButton;
        this._settings = mainButton._settings;
        this.mainBox = mainButton.mainBox; 
        this.appMenuManager = mainButton.appMenuManager;
        this._session = new GnomeSession.SessionManager();
        this.leftClickMenu  = mainButton.leftClickMenu;
        this.currentMenu = Constants.CURRENT_MENU.FAVORITES; 
        this._applicationsButtons = new Map();
        this.isRunning=true;
        this.shouldLoadFavorites = true;
        this.newSearch = new ArcSearch.SearchResults(this);     
        this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));


        this._tree = new GMenu.Tree({ menu_basename: 'applications.menu' });
        this._treeChangedId = this._tree.connect('changed', ()=>{
            this._reload();
        });

        this.mainBox.vertical = false;
        // Left Box
        //Menus Left Box container
        this.leftBox = new St.BoxLayout({
            vertical: true,
            style_class: 'left-box'
        });
        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            style_class: 'apps-menu vfade left-scroll-area',
            overlay_scrollbars: true,
            reactive:true
        });      
        this.applicationsScrollBox.connect('key-press-event',(actor,event)=>{
            let key = event.get_key_symbol();
            if(key == Clutter.Up || key == Clutter.KP_Up)
                this.scrollToItem(this.activeMenuItem,Constants.DIRECTION.UP);
            else if(key == Clutter.Down || key == Clutter.KP_Down)
                this.scrollToItem(this.activeMenuItem,Constants.DIRECTION.DOWN);
        }) ;         
        this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.leftBox.add(this.applicationsScrollBox, {
            expand: true,
            x_fill: true, y_fill: true,
            y_align: St.Align.START
        });
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.applicationsScrollBox.clip_to_allocation = true;
        //Add Horizontal Separator
        this.leftBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.LONG), {
            x_expand: true,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.END
        });
        //Add back button to menu
        this.backButton = new MW.BackMenuItem(this);
        this.leftBox.add(this.backButton.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.End
        });
        //Add view all programs button to menu
        this.viewProgramsButton = new MW.ViewAllPrograms(this);
        this.leftBox.add(this.viewProgramsButton.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            margin_top:1,
        });
        // Create search box
        this.searchBox = new MW.SearchBox(this);
        this._firstAppItem = null;
        this._firstApp = null;
        this._tabbedOnce = false;
        this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
        this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
        this._searchBoxKeyFocusInId = this.searchBox.connect('key-focus-in', this._onSearchBoxKeyFocusIn.bind(this));
        //Add search box to menu
        this.leftBox.add(this.searchBox.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });
        //Add LeftBox to MainBox
        this.mainBox.add(this.leftBox, {
            expand: true,
            x_fill: true,
            y_fill: true
        });
        //Add Vert Separator to Main Box
        this.mainBox.add(this._createVertSeparator(), {
            expand: true,
            x_fill: true,
            y_fill: true
        });

        //Right Box
        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box'
        });
        this._loadCategories();
        this._createRightBox();
        this.mainBox.add(this.rightBox);  
        this._loadFavorites();
        this._display(); 
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
        this.rightBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT), {
            x_expand: true,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.END
        });
        //Shortcuts Box
        this.shorcutsBox = new St.BoxLayout({
            vertical: true
        });
        this.shortcutsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            overlay_scrollbars: true,
            style_class: 'vfade'
        });     
        this.shortcutsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.shortcutsScrollBox.add_actor(this.shorcutsBox);
        this.shortcutsScrollBox.clip_to_allocation = true;
        this.rightBox.add(this.shortcutsScrollBox);
        // Add place shortcuts to menu (Home,Documents,Downloads,Music,Pictures,Videos)
        this._displayPlaces();
        // add Home and Network shortcuts           
        if(this._settings.get_boolean('show-computer-shortcut')){
            this.placesShortcuts=true;  
            this.computer = new PlaceDisplay.RootInfo();
            this.computerMenuItem = new PlaceDisplay.PlaceMenuItem(this.computer,this);
            this.shorcutsBox.add_actor(this.computerMenuItem.actor);
        }
        if(this._settings.get_boolean('show-network-shortcut')){
            this.placesShortcuts=true;
            this.network = new PlaceDisplay.PlaceInfo('network',Gio.File.new_for_uri('network:///'), _('Network'),'network-workgroup-symbolic');
            this.networkMenuItem = new PlaceDisplay.PlaceMenuItem(this.network,this);
            this.shorcutsBox.add_actor(this.networkMenuItem.actor);
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
            this.shorcutsBox.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT), {
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
        this.shorcutsBox.add( this.externalDevicesBox, {
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
                    this.shorcutsBox.add(shortcutMenuItem.actor, {
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
            this.shorcutsBox.add(activities.actor, {
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
    setDefaultMenuView(){
        this.searchBox.clear();
        this.newSearch._reset();
        this._clearApplicationsBox();
        if(this._settings.get_boolean('enable-pinned-apps')){
            this.currentMenu = Constants.CURRENT_MENU.FAVORITES;
            this._displayFavorites();
        }	
        else{
            this.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
            this._displayCategories();
        }
        this.backButton.actor.hide();
        this.viewProgramsButton.actor.show();
        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
        appsScrollBoxAdj = this.shortcutsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
    }
    _redisplayRightSide(){
        this.rightBox.destroy_all_children();
        this._createRightBox();
        this.updateStyle();
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
        for (let i = 0; i < this.favoritesArray.length; i++) {
            this.favoritesArray[i].destroy();
        }
        this.applicationsBox.destroy_all_children();
        this._loadCategories();
        this._loadFavorites();
        this._display();
    }
    // Display the menu
    _display() {
        //this.mainBox.hide();
        
        if(this._settings.get_boolean('enable-pinned-apps'))
            this._displayFavorites();
        else
            this._displayCategories();
        this.backButton.actor.hide();

        if(this.vertSep!=null)
            this.vertSep.queue_repaint(); 
        
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
    _loadCategories(){
        this.applicationsByCategory = null;
        this.applicationsByCategory = {};
        this.categoryDirectories = null;
        this.categoryDirectories=[];
        
        let categoryMenuItem = new MW.CategoryMenuItem(this, "");
        this.categoryDirectories.push(categoryMenuItem);

        this.applicationsByCategory["Frequent Apps"] = [];

        let mostUsed =  modernGnome ?  Shell.AppUsage.get_default().get_most_used() : Shell.AppUsage.get_default().get_most_used("");
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
                    categoryMenuItem = new MW.CategoryMenuItem(this, dir);
                    this.categoryDirectories.push(categoryMenuItem);
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
                if (!app)
                    app = new Shell.App({ app_info: entry.get_app_info() });
                if (app.get_app_info().should_show()){
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
        
    _displayCategories(){
        this._clearApplicationsBox();
            
        this.viewProgramsButton.actor.hide();
        if(this._settings.get_boolean('enable-pinned-apps'))
            this.backButton.actor.show();
        else{
            this.viewProgramsButton.actor.show();
            this.backButton.actor.hide();
        }
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.applicationsBox.add_actor(this.categoryDirectories[i].actor);	
        }
        this.updateStyle();
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
        let pinnedApps = this._settings.get_strv('pinned-app-list');
        this.favoritesArray=null;
        this.favoritesArray=[];
        for(let i = 0;i<pinnedApps.length;i+=3){
            if(i == 0 && pinnedApps[0]=="ArcMenu_WebBrowser")
                this.updatePinnedAppsWebBrowser(pinnedApps);
            let favoritesMenuItem = new MW.FavoritesMenuItem(this, pinnedApps[i], pinnedApps[i+1], pinnedApps[i+2]);
            favoritesMenuItem.connect('saveSettings', ()=>{
                let array = [];
                for(let i = 0;i < this.favoritesArray.length; i++)
                {
                    array.push(this.favoritesArray[i]._name);
                    array.push(this.favoritesArray[i]._iconPath);
                    array.push(this.favoritesArray[i]._command);		   
                }
                this._settings.set_strv('pinned-app-list',array);
            });
            this.favoritesArray.push(favoritesMenuItem);
        }   
    }
    updatePinnedAppsWebBrowser(pinnedApps){
        //Find the Default Web Browser, if found add to pinned apps list, if not found delete the placeholder.
        //Will only run if placeholder is found. Placeholder only found with default settings set.
        if(pinnedApps[0]=="ArcMenu_WebBrowser")
        {     
            let [res, stdout, stderr, status] = GLib.spawn_command_line_sync("xdg-settings get default-web-browser");
            let webBrowser = String.fromCharCode.apply(null, stdout);
            let browserName = webBrowser.split(".desktop")[0];
            browserName+=".desktop";
            this._app = appSys.lookup_app(browserName);
            if(this._app){
                let appIcon = this._app.create_icon_texture(25);
                let iconName = '';
                if(appIcon.icon_name)
                    iconName = appIcon.icon_name;
                else if(appIcon.gicon)
                    iconName = appIcon.gicon.to_string();
                pinnedApps[0] = this._app.get_name();
                pinnedApps[1] = iconName;
                pinnedApps[2] = this._app.get_id();
            }
            else{
                pinnedApps.splice(0,3);
            }
            this.shouldLoadFavorites = false; // We don't want to trigger a setting changed event
            this._settings.set_strv('pinned-app-list',pinnedApps);
            this.shouldLoadFavorites = true;
        }
    }
    _displayFavorites() {
        //global.log('display favs');
        this._clearApplicationsBox();
        this.viewProgramsButton.actor.show();
        this.backButton.actor.hide();
        
        for(let i = 0;i < this.favoritesArray.length; i++)
        {
            this.applicationsBox.add_actor(this.favoritesArray[i].actor);		   
        }
        this.updateStyle();  
    }
    placesAddSeparator(id){
        this._sections[id].box.add(this._createHorizontalSeparator(Constants.SEPARATOR_STYLE.SHORT), {
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
    _setActiveCategory(){
        for (let i = 0; i < this.categoryMenuItemArray.length; i++) {
            let actor = this.categoryMenuItemArray[i];
            actor.setFakeActive(false);
            //actor.remove_style_class_name('active');
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
        this._clearApplicationsBox();
        if (dir!="Frequent Apps") {
            this._displayButtons(this._listApplications(dir.get_menu_id()));
            this.backButton.actor.show();
            this.currentMenu = Constants.CURRENT_MENU.CATEGORY_APPLIST;
            this.viewProgramsButton.actor.hide();
            
        }
        else if(dir=="Frequent Apps") {
            this._displayButtons(this._listApplications("Frequent Apps"));
            this.backButton.actor.show();
            this.currentMenu = Constants.CURRENT_MENU.CATEGORY_APPLIST;
            this.viewProgramsButton.actor.hide();
        }
        else {
            this._displayCategories();
            this.viewProgramsButton.actor.show();
        }
        this.updateStyle();
    }

    // Display application menu items
    _displayButtons(apps) {               
        for (let i = 0; i < apps.length; i++) {
            let app = apps[i];
            let item = this._applicationsButtons.get(app);
            if (!item) {
                item = new MW.ApplicationMenuItem(this, app);
                this._applicationsButtons.set(app, item);
            }
            if (!item.actor.get_parent()) 
                this.applicationsBox.add_actor(item.actor);
            if(i==0){
                item.setFakeActive(true);
                item.actor.grab_key_focus();
                global.sync_pointer();
            }
                
        }
    }

    _displayAllApps(){

        let appList= []
        this._applicationsButtons.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort(function (a, b) {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        this._clearApplicationsBox();
        this._displayButtons(appList);
        this.updateStyle(); 
        this.backButton.actor.show();
        this.viewProgramsButton.actor.hide();
        
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
    _onSearchBoxChanged(searchBox, searchString) {        
        if(this.currentMenu != Constants.CURRENT_MENU.SEARCH_RESULTS){              
            this.currentMenu = Constants.CURRENT_MENU.SEARCH_RESULTS;        
        }
        if(searchBox.isEmpty()){  
            this.newSearch.setTerms(['']); 
            this.setDefaultMenuView();                     	          	
            this.newSearch.actor.hide();
        }            
        else{         
            this._clearApplicationsBox(); 
            this.applicationsBox.add(this.newSearch.actor); 
            this.newSearch.highlightDefault(true);
            this.newSearch.actor.show();         
            this.newSearch.setTerms([searchString]); 
            this.backButton.actor.show();
            this.viewProgramsButton.actor.hide();            	    
        }            	
    }
    // Scroll to a specific button (menu item) in the applications scroll view
    scrollToItem(button, direction) {
        let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
        let currentScrollValue = appsScrollBoxAdj.get_value();
        let box = button.actor.get_allocation_box();
        let buttonHeight = box.y1 - box.y2;
        direction == Constants.DIRECTION.UP ? buttonHeight = buttonHeight : buttonHeight = -buttonHeight;
        appsScrollBoxAdj.set_value(currentScrollValue + buttonHeight );
    }
    setCurrentMenu(menu){
        this.currentMenu = menu;
    }
    getCurrentMenu(){
        return this.currentMenu;
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
    destroy(){
        for (let i = 0; i < this.categoryDirectories.length; i++) {
            this.categoryDirectories[i].destroy();
        }
        for (let i = 0; i < this.favoritesArray.length; i++) {
            this.favoritesArray[i].destroy();
        }
        this._applicationsButtons.forEach((value,key,map)=>{
            value.destroy();
        });
        this.categoryDirectories=null;
        this.favoritesArray=null;
        this._applicationsButtons=null;
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
            if (this._searchBoxKeyFocusInId > 0) {
                this.searchBox.disconnect(this._searchBoxKeyFocusInId);
                this._searchBoxKeyFocusInId = 0;
            }
            if (this._mainBoxKeyPressId > 0) {
                this.mainBox.disconnect(this._mainBoxKeyPressId);
                this._mainBoxKeyPressId = 0;
            }
        }
        if(this.newSearch){
            this.newSearch.destroy();
        }
        if (this._treeChangedId > 0) {
            this._tree.disconnect(this._treeChangedId);
            this._treeChangedId = 0;
            this._tree = null;
        }
        this.isRunning=false;
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

