/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Original work: Copyright (C) 2015 Giovanni Campagna
 * Modified work: Copyright (C) 2016-2017 Zorin OS Technologies Ltd.
 * Modified work: Copyright (C) 2017 LinxGem33
 * Modified work: Copyright (C) 2017 Alexander Rüedlinger
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
const Util = imports.misc.util;
const GnomeSession = imports.misc.gnomeSession;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const PlaceDisplay = Me.imports.placeDisplay;
const MW = Me.imports.menuWidgets;
const ArcSearch = Me.imports.search;
const Constants = Me.imports.constants;
const TwoMenuButton = Me.imports.twoMenuButton;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;
const appSys = Shell.AppSystem.get_default();


// Application Menu Button class (most of the menu logic is here)
var ApplicationsButton = GObject.registerClass(
    class ApplicationsButton extends TwoMenuButton.TwoMenuButton {
        // Initialize the menu
        _init(settings) {
    	    super._init(settings);
            this._settings = settings;
            this._session = new GnomeSession.SessionManager();
            this.createMenu();   
            if (this.sourceActor)
            	this._keyReleaseId = this.sourceActor.connect('key-release-event',
            this._onKeyRelease.bind(this));  
           
        }
        createMenu(){
            this.vertSep=null;
            this.currentMenu = Constants.CURRENT_MENU.FAVORITES;                
                                
            
                                
                                
            this.actor.accessible_role = Atk.Role.LABEL;            
            this._menuButtonWidget = new MW.MenuButtonWidget();
            this.actor.add_actor(this._menuButtonWidget.actor);
            this.actor.name = 'panelApplications';
            this.actor.connect('captured-event', this._onCapturedEvent.bind(this));
            this.actor.connect('destroy', this._onDestroy.bind(this));
            this._showingId = Main.overview.connect('showing', () => {
                this.actor.add_accessible_state(Atk.StateType.CHECKED);
            });
            this._hidingId = Main.overview.connect('hiding', () => {
                this.actor.remove_accessible_state(Atk.StateType.CHECKED);
            });
            this._applicationsButtons = new Map();
            this.reloadFlag = false;
            this._createLayout();
            this._display();
            this._installedChangedId = appSys.connect('installed-changed', () => {
                if (this.leftClickMenu.isOpen) {
                    this._redisplay();
                    this.mainBox.show();
                } else {
                    this.reloadFlag = true;
                }
            });
            this._notifyHeightId = Main.panel.actor.connect('notify::height', () => {
                this._redisplay();
            });
            this.updateStyle();
 

        
        }
        toggleMenu() {
           if(this.rightClickMenu.isOpen)
    	        this.rightClickMenu.toggle();	            
	       Main.panel.menuManager.removeMenu(this.rightClickMenu);              
    	   Main.panel.menuManager.addMenu(this.leftClickMenu); 
     	   this.leftClickMenu.toggle();
           if(this.leftClickMenu.isOpen)
     	    	this.mainBox.grab_key_focus();
        }
        getWidget() {
            return this._menuButtonWidget;
        }
        updateHeight(){
            //set menu height
            this.mainBox.set_height(this._settings.get_int('menu-height'));
            this._redisplay();
            this._redisplayRightSide();
            //check to see if rightbox or leftbox is greater than mainBox              
            /*if(this.rightBox.get_height()>this.mainBox.get_height())
                this.mainBox.set_height(this.rightBox.get_height()+35);   
            if(this.leftBox.get_height()>this.mainBox.get_height())
               this.mainBox.set_height(this.leftBox.get_height()+35); */
        }
        updateStyle(){
            if(this._settings.get_boolean('enable-custom-arc-menu')){
                this.actionsBox.actor.add_style_class_name('arc-menu');
                this.leftClickMenu.actor.style_class = 'arc-menu-boxpointer popup-menu';
               
                this.actionsBox.actor.get_children().forEach(function (actor) {
                    if(actor instanceof St.Button){
                        actor.add_style_class_name('arc-menu-action');
                    }
                }.bind(this));
                this.applicationsBox.get_children().forEach(function (actor) {
                    if(actor instanceof St.BoxLayout){
                        actor.add_style_class_name('arc-menu');
                    }
                }.bind(this));
                this.shorcutsBox.get_children().forEach(function (actor) {
                    if(actor instanceof St.BoxLayout){
                        actor.add_style_class_name('arc-menu');
                    }
                }.bind(this));
                this.rightBox.get_children().forEach(function (actor) {
                    if(actor instanceof St.BoxLayout){
                        actor.add_style_class_name('arc-menu');
                    }
                }.bind(this));
                
                this.externalDevicesBox.get_children().forEach(function (actor) {
                    if(actor instanceof St.BoxLayout){
                        actor.add_style_class_name('arc-menu');
                    }
                }.bind(this));
                this.backButton.actor.add_style_class_name('arc-menu');
                this.viewProgramsButton.actor.add_style_class_name('arc-menu');
                this.searchBox._stEntry.set_name('arc-search-entry');
            }
            else
            {             
                this.actionsBox.actor.remove_style_class_name('arc-menu');              
                this.leftClickMenu.actor.style_class = 'popup-menu-boxpointer popup-menu';
                this.actionsBox.actor.get_children().forEach(function (actor) {
                    if(actor instanceof St.Button){
                        actor.remove_style_class_name('arc-menu-action');
                    }
                }.bind(this));
                this.applicationsBox.get_children().forEach(function (actor) {
                    if(actor instanceof St.BoxLayout){
                        actor.remove_style_class_name('arc-menu');
                    }
                }.bind(this));
               this.shorcutsBox.get_children().forEach(function (actor) {
                    if(actor instanceof St.BoxLayout){
                        actor.remove_style_class_name('arc-menu');
                    }
                }.bind(this));
            	this.rightBox.get_children().forEach(function (actor) {
                    if(actor instanceof St.BoxLayout){
                        actor.remove_style_class_name('arc-menu');
                    }
                }.bind(this));
                    this.externalDevicesBox.get_children().forEach(function (actor) {
                    if(actor instanceof St.BoxLayout){
                        actor.remove_style_class_name('arc-menu');
                    }
                }.bind(this));
                this.backButton.actor.remove_style_class_name('arc-menu');
                this.viewProgramsButton.actor.remove_style_class_name('arc-menu');
                this.searchBox._stEntry.set_name('search-entry');
            }
        }
        
        // Destroy the menu button
        _onDestroy() {
            if (this.leftClickMenu) {
                this.searchBox.disconnect(this._searchBoxClearedId);
                this.searchBox.disconnect(this._searchBoxChangedId);
                this.searchBox.disconnect(this._searchBoxKeyPressId);
                this.mainBox.disconnect(this._mainBoxKeyPressId);
                this.leftClickMenu.destroy();
                this.leftClickMenu = null;
            }
               if (this.rightClickMenu) {
                this.rightClickMenu.destroy();
                this.rightClickMenu = null;
            }

            if (this._showingId > 0) {
                Main.overview.disconnect(this._showingId);
                this._showingId = 0;
            }
            if (this._hidingId > 0) {
                Main.overview.disconnect(this._hidingId);
                this._hidingId = 0;
            }
            if (this._notifyHeightId > 0) {
                Main.panel.actor.disconnect(this._notifyHeightId);
                this._notifyHeightId = 0;
            }
            if (this._installedChangedId > 0) {
                appSys.disconnect(this._installedChangedId);
                this._installedChangedId  = 0;
            }

            super._onDestroy();
        }

        // Handle captured event
        _onCapturedEvent(actor, event) {
            if (event.type() == Clutter.EventType.BUTTON_PRESS) {
                if (!Main.overview.shouldToggleByCornerOrButton())
                    return true;
            }
            return false;
        }
        //Create a horizontal separator
         _createHorizontalSeparator(rightSide){
           let hSep = new St.DrawingArea({
                x_expand:true,
                y_expand:false
            });
            if(rightSide)
              hSep.set_height(20); //increase height if on right side
            else 
              hSep.set_height(10);
            hSep.connect('repaint', ()=> {
                let cr = hSep.get_context();
                let [width, height] = hSep.get_surface_size();                 
                let b, stippleColor;                                                            
                [b,stippleColor] = Clutter.Color.from_string(this._settings.get_string('separator-color'));           
                if(rightSide){   
                    cr.moveTo(width / 4, height-9.5);
                    cr.lineTo(3 * width / 4, height-9.5);
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
        
        // Handle changes in menu open state
        _onOpenStateChanged(menu, open) {
            if (open) {
                if (this.reloadFlag) {
                    this._redisplay();
                    this.reloadFlag = false;
                }
                if(this.user._userIcon.get_gicon()==null)
			this.user._onUserChanged();
			 
                this.mainBox.show();  
            }
            super._onOpenStateChanged(menu, open);
        }
        _redisplayRightSide(){
            this.rightBox.destroy_all_children();
            this._createRightBox();
            this.updateStyle();
        }
        // Redisplay the menu
        _redisplay() {
            if (this.applicationsBox)
                this.applicationsBox.destroy_all_children();
            this._display();
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
         	this._clearApplicationsBox();
	    	this.viewProgramsButton.actor.hide();
	    	if(this._settings.get_boolean('enable-pinned-apps'))
            		this.backButton.actor.show();
            	else{
            		this.viewProgramsButton.actor.show();
            		this.backButton.actor.hide();
            	}
    		for(var categoryDir of this.categoryDirectories){
			let categoryMenuItem = new MW.CategoryMenuItem(this, categoryDir);
			this.applicationsBox.add_actor(categoryMenuItem.actor);	
    		}
        	 this.updateStyle();
        }

        // Load menu place shortcuts
        _loadPlaces() {
            let homePath = GLib.get_home_dir();
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(homePath), _("Home"));
            let addToMenu = this._settings.get_boolean('show-home-shortcut');
            if(addToMenu){
                let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
                this.shorcutsBox.add_actor(placeMenuItem.actor);
            }    
            let dirs = Constants.DEFAULT_DIRECTORIES.slice();
            for (let i = 0; i < dirs.length; i++) {
                let path = GLib.get_user_special_dir(dirs[i]);
                if (path == null || path == homePath)
                    continue;
                let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(_(path)));
                addToMenu = this.getShouldShowShortcut(Constants.RIGHT_SIDE_SHORTCUTS[i+1]);
                if(addToMenu){
                    let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo);
                    this.shorcutsBox.add_actor(placeMenuItem.actor);
                }
            }
        }
        _loadFavorites() {
            this._clearApplicationsBox();
            this.viewProgramsButton.actor.show();
            this.backButton.actor.hide();
            let pinnedApps = this._settings.get_strv('pinned-apps');
            this.favoritesArray=[];
            for(let i = 0;i<pinnedApps.length;i+=3)
            {
                let favoritesMenuItem = new MW.FavoritesMenuItem(this, pinnedApps[i], pinnedApps[i+1], pinnedApps[i+2]);
                favoritesMenuItem.connect('saveSettings', ()=>{
                    	let array = [];
			for(let i = 0;i < this.favoritesArray.length; i++)
			{
			    array.push(this.favoritesArray[i]._name);
			    array.push(this.favoritesArray[i]._iconPath);
			    array.push(this.favoritesArray[i]._command);			   
			}
			this._settings.set_strv('pinned-apps',array);
                 	//global.log(array);
                });
                this.favoritesArray.push(favoritesMenuItem);
                this.applicationsBox.add_actor(favoritesMenuItem.actor);

            }
            this.updateStyle();
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

        // Create the menu layout
        _createLayout() {
            // Create main menu sections and scroll views
            this.section = new PopupMenu.PopupMenuSection();
            this.leftClickMenu.addMenuItem(this.section);            
            this.mainBox = new St.BoxLayout({
                vertical: false
            });            
            this.mainBox.set_height(this._settings.get_int('menu-height'));               
            this.section.actor.add_actor(this.mainBox);               
            this.mainBox._delegate = this.mainBox;
            this._mainBoxKeyPressId = this.mainBox.connect('key-press-event', this._onMainBoxKeyPress.bind(this));
            // Left Box
            if (this._settings.get_enum('visible-menus') == Constants.visibleMenus.ALL ||
                this._settings.get_enum('visible-menus') == Constants.visibleMenus.APPS_ONLY) {
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
                    overlay_scrollbars: true
                });                
                this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
                let vscroll = this.applicationsScrollBox.get_vscroll_bar();
                vscroll.connect('scroll-start', () => {
                    this.leftClickMenu.passEvents = true;
                });
                vscroll.connect('scroll-stop', () => {
                    this.leftClickMenu.passEvents = false;
                });
                this.leftBox.add(this.applicationsScrollBox, {
                    expand: true,
                    x_fill: true, y_fill: true,
                    y_align: St.Align.START
                });
                this.applicationsBox = new St.BoxLayout({ vertical: true });
                this.applicationsScrollBox.add_actor(this.applicationsBox);
                //Add Horizontal Separator
                this.leftBox.add(this._createHorizontalSeparator(false), {
                    x_expand: true,
                    x_fill: true,
                    y_fill: false,
                    y_align: St.Align.END
                });
                // Add back button to menu
                this.backButton = new MW.BackMenuItem(this);
                this.leftBox.add(this.backButton.actor, {
                    expand: false,
                    x_fill: true,
                    y_fill: false,
                    y_align: St.Align.End
                });
  	        // Add view all programs button to menu
                this.viewProgramsButton = new MW.ViewAllPrograms(this);
                this.leftBox.add(this.viewProgramsButton.actor, {
                    expand: false,
                    x_fill: true,
                    y_fill: false,
                    y_align: St.Align.START,
                    margin_top:1,
                });
                // Create search box
                this.searchBox = new MW.SearchBox();
                this._firstAppItem = null;
                this._firstApp = null;
                this._tabbedOnce = false;
                this._searchBoxChangedId = this.searchBox.connect('changed', this._onSearchBoxChanged.bind(this));
                this._searchBoxClearedId = this.searchBox.connect('cleared', this._onSearchBoxCleared.bind(this));
                this._searchBoxKeyPressId = this.searchBox.connect('key-press-event', this._onSearchBoxKeyPress.bind(this));
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

            }

            // Right Box
            if (this._settings.get_enum('visible-menus') == Constants.visibleMenus.ALL ||
                this._settings.get_enum('visible-menus') ==Constants.visibleMenus.SYSTEM_ONLY) {
                //RightBox container
                this.rightBox = new St.BoxLayout({
                    vertical: true,
                    style_class: 'right-box'
                });
                //function to create rightBox children
                this._createRightBox();
                //Add rightbox to mainbox
                this.mainBox.add(this.rightBox); 

            }        
        }
        
        _createRightBox(){
            this.placesShortcuts=false
	    this.externalDevicesShorctus = false;  
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
            this.shorcutsBox = new St.BoxLayout({
                vertical: true
            });
            this.shortcutsScrollBox = new St.ScrollView({
                x_fill: true,
                y_fill: false,
                y_align: St.Align.START,
                overlay_scrollbars: true
            });     
            this.shortcutsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            let vscroll2 = this.shortcutsScrollBox.get_vscroll_bar();
            vscroll2.connect('scroll-start', () => {
                this.leftClickMenu.passEvents = true;
            });
            vscroll2.connect('scroll-stop', () => {
                this.leftClickMenu.passEvents = false;
            }); 
	    this.shortcutsScrollBox.add_actor(this.shorcutsBox);
	    this.rightBox.add(this.shortcutsScrollBox);
            // Add place shortcuts to menu (Home,Documents,Downloads,Music,Pictures,Videos)
            this._loadPlaces();
            
            // add Home and Network shortcuts           
            if(this._settings.get_boolean('show-computer-shortcut')){
      		this.placesShortcuts=true;      
        	var computer = new PlaceDisplay.RootInfo();
            	this.shorcutsBox.add_actor(new PlaceDisplay.PlaceMenuItem(computer,this).actor);
             }
             if(this._settings.get_boolean('show-network-shortcut')){
             	this.placesShortcuts=true;
            	var network = new PlaceDisplay.PlaceInfo('network',Gio.File.new_for_uri('network:///'), _('Network'),'network-workgroup-symbolic');
             	this.shorcutsBox.add_actor(new PlaceDisplay.PlaceMenuItem(network,this).actor);
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
                this.shorcutsBox.add(this._createHorizontalSeparator(true), {
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
  	    this.placesManager = new PlaceDisplay.PlacesManager();
	    for (let i = 0; i < Constants.SECTIONS.length; i++) {
   		let id = Constants.SECTIONS[i];
    		this.placesManager.connect(`${id}-updated`, () => {
			this._redisplayPlaces();
 		});
    	    	this._createPlaces(id);
	    }

            //Add Software Shortcuts to menu (Software, Settings, Tweaks, Terminal)
            Constants.SHORTCUTS.forEach(function (shortcut) {
                if (GLib.find_program_in_path(shortcut.command)) {
                    let addToMenu = this.getShouldShowShortcut(shortcut.label);
                    if(addToMenu)
                    {
                        let shortcutMenuItem = new MW.ShortcutMenuItem(this, shortcut.label, shortcut.symbolic, shortcut.command);
                        this.shorcutsBox.add(shortcutMenuItem.actor, {
                            expand: false,
                            x_fill: true,
                            y_fill: false,
                            y_align: St.Align.START,
                        });
                    }
                }
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
            let power = new MW.PowerButton(this);
            this.actionsBox.actor.add(power.actor, {
                expand: true,
                x_fill: false,
                y_align: St.Align.START
            });   
            //add actionsbox to rightbox             
            this.rightBox.add(this.actionsBox.actor, {
                expand: true,
                x_fill: true,
                y_fill: false,
                y_align: St.Align.END
            });

        }
        
    	_redisplayPlaces() {
		this.externalDevicesBox.destroy_all_children();
		this.externalDeviceCount=0;
		this.placesManager = new PlaceDisplay.PlacesManager();
		for (let i = 0; i < Constants.SECTIONS.length; i++) {
	   		 let id = Constants.SECTIONS[i];
	    		this.placesManager.connect(`${id}-updated`, () => {
			this._redisplayPlaces(id);
	   	 	});

	    		this._createPlaces(id);
	 	}
	 	this.updateStyle();
    	}

    	_createPlaces(id) {
	      	let places = this.placesManager.get(id);
                if (this._settings.get_boolean('show-bookmarks'))
                {
			if(this.placesManager.get('bookmarks').length>0)
				this.bookmarksShorctus = true;
                	if(id=='bookmarks' && places.length>0){

        			for (let i = 0; i < places.length; i++){
				let item = new PlaceDisplay.PlaceMenuItem(places[i],this);
			    	this.externalDevicesBox.add(item.actor); 
			    	} 
			    	if(this.bookmarksShorctus && this.softwareShortcuts){
			     		this.externalDevicesBox.add(this._createHorizontalSeparator(true), {
						x_expand: true,
						y_expand:false,
						x_fill: true,
						y_fill: false,
						y_align: St.Align.END
					});  
                		}
                	}

                }
                if (this._settings.get_boolean('show-external-devices')){
                	if(id!='bookmarks'){
		        	for (let i = 0; i < places.length; i++){
				let item = new PlaceDisplay.PlaceMenuItem(places[i],this);
			    	this.externalDevicesBox.add(item.actor); 
			    	this.externalDevicesShorctus=true; }
			    	if(id=='network'){ 
					if(this.externalDevicesShorctus &&  (this.bookmarksShorctus || this.softwareShortcuts)){
		    		     		this.externalDevicesBox.add(this._createHorizontalSeparator(true), {
							x_expand: true,
							y_expand:false,
							x_fill: true,
							y_fill: false,
							y_align: St.Align.END
						});  
					}
                		}
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
        
        // Handle key press events on the mainBox to support the "type-away-feature"
        _onMainBoxKeyPress(mainBox, event) {
            if (!this.searchBox) {
                return Clutter.EVENT_PROPAGATE;
            }
            if (event.has_control_modifier()) {
                this.searchBox.grabKeyFocus();
                return Clutter.EVENT_PROPAGATE;
            }

            let symbol = event.get_key_symbol();
            let key = event.get_key_unicode();

            switch (symbol) {
                case Clutter.KEY_BackSpace:
                    if (!this.searchBox.hasKeyFocus()) {
                        this.searchBox.grabKeyFocus();
                        let newText = this.searchBox.getText().slice(0, -1);
                        this.searchBox.setText(newText);
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
                        this.searchBox.grabKeyFocus();
                        let newText = this.searchBox.getText() + key;
                        this.searchBox.setText(newText);
                    }
            }
            return Clutter.EVENT_PROPAGATE;
        }
        resetSearch()
        {
          this.searchBox.clear();
        }
        _onSearchBoxCleared() {
            this._clearApplicationsBox();
            if(this._settings.get_boolean('enable-pinned-apps')){
             this.currentMenu = Constants.CURRENT_MENU.FAVORITES;
             this._loadFavorites();
            }
            	
            else{
            this.currentMenu = Constants.CURRENT_MENU.CATEGORIES;
            this._displayCategories();
            
            }
        	
           
            this.backButton.actor.hide();
            this.viewProgramsButton.actor.show();
        }
        _onSearchBoxKeyPress(searchBox, event) {
            let symbol = event.get_key_symbol();
            if (!searchBox.isEmpty() && searchBox.hasKeyFocus()) {
               if (symbol == Clutter.Up) {
                    this.newSearch.getTopResult().actor.grab_key_focus();
            	}
    	    }
            return Clutter.EVENT_PROPAGATE;
        }

        _onSearchBoxChanged(searchBox, searchString) {
            // normalize search string            
            if(this.currentMenu != Constants.CURRENT_MENU.SEARCH_RESULTS){              
            	this.currentMenu = Constants.CURRENT_MENU.SEARCH_RESULTS;        
            }
            if(searchBox.isEmpty()){   
               	this._clearApplicationsBox();
                this._loadFavorites();
                this.updateStyle();                
            	this.searchBox.clear();                 	
            	this.newSearch._reset();               	
            	this.newSearch._clearDisplay();              	
            	this.newSearch.actor.hide();

            }            
            else{        
            	this._clearApplicationsBox(); 
		this.newSearch = new ArcSearch.SearchResults(this);
             	this.applicationsBox.add(this.newSearch.actor);      
 		this.newSearch.actor.show();         
    	    	this.newSearch.setTerms([searchString]);   
                this.backButton.actor.show();
	        this.viewProgramsButton.actor.hide();             	    
            }            	
        }

        // Display the menu
        _display() {
            this.mainBox.hide();
            if (this._settings.get_enum('visible-menus') != Constants.visibleMenus.SYSTEM_ONLY) {
                this._applicationsButtons.clear();
                this._loadCategories();
                if(this._settings.get_boolean('enable-pinned-apps'))
                	this._loadFavorites();
                else
                	this._displayCategories();
                this.backButton.actor.hide();
                if(this.vertSep!=null)
                    this.vertSep.queue_repaint(); 
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
            if (dir) {
                this._displayButtons(this._listApplications(dir.get_menu_id()));
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
            if (apps) {
                for (let i = 0; i < apps.length; i++) {
                    let app = apps[i];
                    let item = this._applicationsButtons.get(app);
                    if (!item) {
                        item = new MW.ApplicationMenuItem(this, app);
                        this._applicationsButtons.set(app, item);
                    }
                    if (!item.actor.get_parent()) {
                        this.applicationsBox.add_actor(item.actor);
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
                this._clearApplicationsBox();
                this._displayButtons(appList);
                this.updateStyle();   
                this.backButton.actor.show();
	        this.viewProgramsButton.actor.hide();
	}
        // Get a list of applications for the specified category or search query
        _listApplications(category_menu_id, pattern) {
            let applist;

            // Get applications in a category or all categories
            if (category_menu_id) {
                applist = this.applicationsByCategory[category_menu_id];
            } else {
                applist = [];
                for (let directory in this.applicationsByCategory)
                    applist = applist.concat(this.applicationsByCategory[directory]);
            }

            let res; //Results array

            // Get search results based on pattern (query)
            if (pattern) {
                //this.currentMenu = Constants.CURRENT_MENU.SEARCH_RESULTS;
                let searchResults = [];
                for (let i in applist) {
                    let app = applist[i];
                    if (app.get_name != undefined) {
		      	    let match = app.get_name().toLowerCase() + " ";
		      	    //I believe certain Wine programs might cause search to break...added a check to see if app is a GDesktopApp
			    if(app.get_id!=undefined){
			    	let info = Gio.DesktopAppInfo.new(app.get_id());
			    	if (info.get_executable()) match += info.get_executable().toLowerCase() + " ";
			    	if (info.get_keywords()) match += info.get_keywords().toString().toLowerCase() + " ";
			    	if (info.get_display_name()) match += info.get_display_name().toLowerCase() + " ";
			    }
			    if (app.get_description()) match += app.get_description().toLowerCase();
			    let index = match.indexOf(pattern);
			    if (index != -1) {
			        searchResults.push([index, app]);
			    }
		    }
                }

                // Sort results by relevance score
                searchResults.sort(function (a, b) {
                    return a[0] > b[0];
                });
                res = searchResults.map(function (value, index) { return value[1]; });
            } else {
                applist.sort(function (a, b) {
                    return a.get_name().toLowerCase() > b.get_name().toLowerCase();
                });
                res = applist;
            }
            return res;
        }
    });
