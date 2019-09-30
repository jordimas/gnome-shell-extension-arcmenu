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

const {Atk, Clutter, GMenu, Gtk, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
const Constants = Me.imports.constants;
const ExtensionSystem = imports.ui.extensionSystem;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const GnomeSession = imports.misc.gnomeSession;
const Main = imports.ui.main;
const MenuLayouts = Me.imports.menulayouts;
const MW = Me.imports.menuWidgets;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';

// Application Menu Button class (most of the menu logic is here)
var ApplicationsButton =   Utils.defineClass({
    Name: 'ApplicationsButton',
    Extends: PanelMenu.Button,
    // Initialize the menu
        _init(settings, panel) {
            this.callParent('_init');
            this._settings = settings;
            this._session = new GnomeSession.SessionManager();
            this._panel = panel;
            this._menuButtonWidget = new MW.MenuButtonWidget();

            //Create Main Button Left and Right Click Menus---------------------------------------------------
            let sourceActor =  modernGnome ?  this : this.actor;

            this.rightClickMenu = new RightClickMenu(sourceActor,1.0,St.Side.TOP);	
            this.rightClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
           
            this.leftClickMenu = new ApplicationsMenu(sourceActor, 1.0, St.Side.TOP, this, this._settings);
            this.leftClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
            //------------------------------------------------------------------------------------------------

            //Main Menu Manager--------------------------------------------------------
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menuManager._changeMenu = (menu) => {};
            this.menuManager.addMenu(this.rightClickMenu); 	
            this.menuManager.addMenu(this.leftClickMenu); 
            //-------------------------------------------------------------------------

            //Sub Menu Manager - For Simple Menu Layout--------------------------------
            this.subMenuManager = new PopupMenu.PopupMenuManager(this);
            this.subMenuManager._changeMenu = (menu) => {};
            //-------------------------------------------------------------------------

            //Applications Right Click Context Menu------------------------------------
            this.appMenuManager = new PopupMenu.PopupMenuManager(this);
            this.appMenuManager._changeMenu = (menu) => {};
            //-------------------------------------------------------------------------

            //Create Dash to Panel Settings Menu Item on Right Click Menu----------------------
            this.extensionChangedId = (Main.extensionManager || ExtensionSystem).connect('extension-state-changed', (data, extension) => {
                if (extension.uuid === 'dash-to-panel@jderose9.github.com' && extension.state === 1) 
                    this.rightClickMenu.addDTPSettings();
                if (extension.uuid === 'dash-to-panel@jderose9.github.com' && extension.state === 2) 
                    this.rightClickMenu.removeDTPSettings();
            });
            if(global.dashToPanel)
                this.rightClickMenu.addDTPSettings();
            //----------------------------------------------------------------------------------

            //Update Categories on 'installed-changed' event-------------------------------------
            this._installedChangedId = appSys.connect('installed-changed', () => {
                this._reload();
            });
            //-----------------------------------------------------------------------------------
            
            if(imports.misc.config.PACKAGE_VERSION >= '3.33'){
                this.accessible_role = Atk.Role.LABEL;            
                this.add_actor(this._menuButtonWidget.actor);
                this.name = 'panelApplications';
                this.connect('captured-event', this._onCapturedEvent.bind(this));
                this.connect('destroy', this.destroy.bind(this));
            }
            else{
                this.actor.accessible_role = Atk.Role.LABEL;            
                this.actor.add_actor(this._menuButtonWidget.actor);
                this.actor.name = 'panelApplications';
                this.actor.connect('captured-event', this._onCapturedEvent.bind(this));
                this.actor.connect('destroy', this.destroy.bind(this));
            }

            this._showingId = Main.overview.connect('showing', () => {
                this.actor.add_accessible_state(Atk.StateType.CHECKED);
            });
            this._hidingId = Main.overview.connect('hiding', () => {
                this.actor.remove_accessible_state(Atk.StateType.CHECKED);
            });
            
            this.reloadFlag = false;
            if (this.sourceActor)
                this._keyReleaseId = this.sourceActor.connect('key-release-event', this._onKeyRelease.bind(this));  

            //Create Basic Layout ------------------------------------------------
            this.section = new PopupMenu.PopupMenuSection();
            this.leftClickMenu.addMenuItem(this.section);            
            this.mainBox = new St.BoxLayout({
                vertical: false
            });        
            this.mainBox.set_height(this._settings.get_int('menu-height'));               
            this.section.actor.add_actor(this.mainBox);          
            //--------------------------------------------------------------------

            //Create Menu Layout--------------------------------------------------
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.Default)
                this.MenuLayout =  new MenuLayouts.arcmenu.createMenu(this);
            else if(layout == Constants.MENU_LAYOUT.Brisk)
                this.MenuLayout =  new MenuLayouts.brisk.createMenu(this); 
            else if(layout == Constants.MENU_LAYOUT.Whisker)
                this.MenuLayout = new MenuLayouts.whisker.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.GnomeMenu)
                this.MenuLayout = new MenuLayouts.gnomemenu.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Mint)
                this.MenuLayout = new MenuLayouts.mint.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.GnomeDash)
                this.MenuLayout = new MenuLayouts.gnomedash.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Elementary)
                this.MenuLayout = new MenuLayouts.elementary.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Redmond)
                this.MenuLayout = new MenuLayouts.redmond.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Simple)
                this.MenuLayout = new MenuLayouts.simple.createMenu(this);  
            else if (layout == Constants.MENU_LAYOUT.Simple2)
                this.MenuLayout = new MenuLayouts.simple2.createMenu(this);  
            else if (layout == Constants.MENU_LAYOUT.UbuntuDash)
                this.MenuLayout = new MenuLayouts.ubuntudash.createMenu(this);  
            ///--------------------------------------------------------------------
            this.updateStyle();
        },
        getMenu(){
            return this.MenuLayout;
        },
        updateStyle(){
            this.MenuLayout.updateStyle();
            let addStyle=this._settings.get_boolean('enable-custom-arc-menu');

            this.leftClickMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
            this.leftClickMenu.actor.add_style_class_name( addStyle ? 'arc-menu' : 'popup-menu');

            this.rightClickMenu.actor.style_class = addStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
            this.rightClickMenu.actor.add_style_class_name(addStyle ? 'arc-menu' : 'popup-menu');
        },
        setSensitive(sensitive) {
            this.reactive = sensitive;
            this.can_focus = sensitive;
            this.track_hover = sensitive;
        },
        _onVisibilityChanged() {
            if (!this.rightClickMenu || !this.leftClickMenu)
                return;
    
            if (!this.visible){
                this.rightClickMenu.close();
                this.leftClickMenu.close();
            }     
        },
        _onEvent(actor, event) {
    
            if (event.type() == Clutter.EventType.BUTTON_PRESS){   
                if(event.get_button()==1){    
                    let layout = this._settings.get_enum('menu-layout');
                    if(layout == Constants.MENU_LAYOUT.GnomeDash)
                        Main.overview.toggle();
                    else{
                        this.leftClickMenu.toggle();	
                        if(this.leftClickMenu.isOpen)
                            this.mainBox.grab_key_focus();	
                    }                
                }    
                else if(event.get_button()==3){                      
                    this.rightClickMenu.toggle();	                	
                }    
            }
            else if(event.type() == Clutter.EventType.TOUCH_BEGIN){         
                let layout = this._settings.get_enum('menu-layout');
                    if(layout == Constants.MENU_LAYOUT.GnomeDash)
                        Main.overview.toggle();
                    else{
                        this.leftClickMenu.toggle();	
                        if(this.leftClickMenu.isOpen)
                            this.mainBox.grab_key_focus();	
                    }         
            }
                    
            return Clutter.EVENT_PROPAGATE;
        },
        toggleMenu() {
            if(this.appMenuManager.activeMenu)
                this.appMenuManager.activeMenu.toggle();

            if(this.subMenuManager.activeMenu)
                this.subMenuManager.activeMenu.toggle();

            //If Layout is GnomeDash - toggle Main Overview   
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.GnomeDash)
                Main.overview.toggle();
            else{
                this.leftClickMenu.toggle();
                if(this.leftClickMenu.isOpen)
                    this.mainBox.grab_key_focus();
            }	  

        },
        getActiveMenu(){
            if(this.appMenuManager.activeMenu)
                return this.appMenuManager.activeMenu;
            else if(this.subMenuManager.activeMenu)
                return this.appMenuManager.activeMenu;
            else if(this.leftClickMenu.isOpen)
                return this.leftClickMenu;
            else if(this.rightClickMenu.isOpen)
                return this.rightClickMenu;
            else
                return null;
        },
        toggleRightClickMenu(){
            if(this.rightClickMenu.isOpen)
                this.rightClickMenu.toggle();   
        },
        getWidget() {
            return this._menuButtonWidget;
        },
        updateHeight(){
            //set menu height
            this.mainBox.set_height(this._settings.get_int('menu-height'));
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.Simple2) 
                this.MenuLayout.updateHeight(this._settings.get_int('menu-height'));
            this._redisplay();
            this._redisplayRightSide();
        },
        // Destroy the menu button
        destroy() {
            this.MenuLayout.destroy();

            if ( this.extensionChangedId > 0) {
                (Main.extensionManager || ExtensionSystem).disconnect(this.extensionChangedId);
                this.extensionChangedId = 0;
            }
            if (this._showingId > 0) {
                Main.overview.disconnect(this._showingId);
                this._showingId = 0;
            }
            if (this._hidingId > 0) {
                Main.overview.disconnect(this._hidingId);
                this._hidingId = 0;
            }
            if (this._installedChangedId > 0) {
                appSys.disconnect(this._installedChangedId);
                this._installedChangedId  = 0;
            }
            if (this.leftClickMenu) {
                this.leftClickMenu.destroy();
            }
            if (this.rightClickMenu) {
                this.rightClickMenu.destroy();
            }
            modernGnome ? this.callParent('destroy') : this.emit('destroy');
        },

        // Handle captured event
        _onCapturedEvent(actor, event) {
            if (event.type() == Clutter.EventType.BUTTON_PRESS) {
                if (!Main.overview.shouldToggleByCornerOrButton())
                    return true;
            }
            return false;
        },
        _updateMenuLayout(){
            this.leftClickMenu.removeAll();
            this.leftClickMenu.actor.style = '';
            //Create Basic Layout ------------------------------------------------
            this.section = new PopupMenu.PopupMenuSection();
            this.leftClickMenu.addMenuItem(this.section);            
            this.mainBox = new St.BoxLayout({
                vertical: false
            });        
            this.mainBox.set_height(this._settings.get_int('menu-height'));               
            this.section.actor.add_actor(this.mainBox);          
            //------------------------------------------------  
             
            //this.MenuLayout = null;
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.Default)
                this.MenuLayout =  new MenuLayouts.arcmenu.createMenu(this);
            else if(layout == Constants.MENU_LAYOUT.Brisk)
                this.MenuLayout =  new MenuLayouts.brisk.createMenu(this); 
            else if(layout == Constants.MENU_LAYOUT.Whisker)
                this.MenuLayout = new MenuLayouts.whisker.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.GnomeMenu)
                this.MenuLayout = new MenuLayouts.gnomemenu.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Mint)
                this.MenuLayout = new MenuLayouts.mint.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.GnomeDash)
                this.MenuLayout = new MenuLayouts.gnomedash.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Elementary)
                this.MenuLayout = new MenuLayouts.elementary.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Redmond)
                this.MenuLayout = new MenuLayouts.redmond.createMenu(this); 
            else if (layout == Constants.MENU_LAYOUT.Simple)
                this.MenuLayout = new MenuLayouts.simple.createMenu(this);  
            else if (layout == Constants.MENU_LAYOUT.Simple2)
                this.MenuLayout = new MenuLayouts.simple2.createMenu(this);  
            else if (layout == Constants.MENU_LAYOUT.UbuntuDash)
                this.MenuLayout = new MenuLayouts.ubuntudash.createMenu(this);  
            this.updateStyle();
        },
        updateIcons(){
            this.MenuLayout.updateIcons();
        },
        _loadCategories(){
            this.MenuLayout._loadCategories();
        },
        _clearApplicationsBox() {
            this.MenuLayout._clearApplicationsBox();
        },
        _displayCategories() {
            this.MenuLayout._displayCategories();
        },
        _displayFavorites() {
            this.MenuLayout._displayFavorites();
        },
        _loadFavorites() {
            this.MenuLayout._loadFavorites();
        },
        _displayAllApps() {
            this.MenuLayout._displayAllApps();
        },
        selectCategory(dir) {
            this.MenuLayout.selectCategory(dir);
        },
        _displayGnomeFavorites(){
            this.MenuLayout._displayGnomeFavorites();
        },
        _setActiveCategory(){
            this.MenuLayout._setActiveCategory();
        },
        scrollToButton(button){
            this.MenuLayout.scrollToButton(button);
        },
        _redisplayRightSide(){
            this.MenuLayout._redisplayRightSide();
        },
        _redisplay() {
            this.MenuLayout._redisplay();
        },
        _reload(){
            this.MenuLayout._reload();
        },
        setCurrentMenu(menu) {
            this.MenuLayout.setCurrentMenu(menu);
        },
        getCurrentMenu(){
            return this.MenuLayout.getCurrentMenu();
        },
        resetSearch(){ //used by back button to clear results
            this.MenuLayout.resetSearch();
        },
        setDefaultMenuView(){
            this.MenuLayout.setDefaultMenuView();
        },
        // Handle changes in menu open state
        _onOpenStateChanged(menu, open) {
            if (menu == this.leftClickMenu) {
                if(open)
                    this.mainBox.show();  
            }
            if (open)
                modernGnome ?  this.add_style_pseudo_class('active') : this.actor.add_style_pseudo_class('active');
            else
                modernGnome ? this.remove_style_pseudo_class('active'): this.actor.remove_style_pseudo_class('active');
        }
    });
// Aplication menu class
const ApplicationsMenu = class extends PopupMenu.PopupMenu {
    // Initialize the menu
    constructor(sourceActor, arrowAlignment, arrowSide, button, settings) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = settings;
        this._button = button;  
        this.actor.add_style_class_name('panel-menu');
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
    }
    // Return that the menu is not empty (used by parent class)
    isEmpty() {
        return false;
    }
    // Handle opening the menu
    open(animate) {
        super.open(animate); 
    }
    // Handle closing the menu
    close(animate) {
        //close any active menus
        if(this._button.appMenuManager.activeMenu)
            this._button.appMenuManager.activeMenu.toggle();
        if(this._button.subMenuManager.activeMenu)
            this._button.subMenuManager.activeMenu.toggle();
        super.close(animate);   
        this._button.setDefaultMenuView();  
    }
};
// Aplication menu class
const RightClickMenu = class extends PopupMenu.PopupMenu {
    // Initialize the menu
    constructor(sourceActor, arrowAlignment, arrowSide, button, settings) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = settings;
        this._button = button;  
        this.DTPSettings=false;

        this.actor.add_style_class_name('panel-menu');
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
        let item = new PopupMenu.PopupMenuItem(_("Arc Menu Settings"));
        item.connect('activate', ()=>{
            Util.spawnCommandLine('gnome-shell-extension-prefs arc-menu@linxgem33.com');
        });
        this.addMenuItem(item);        
        item = new PopupMenu.PopupSeparatorMenuItem();     
        item._separator.style_class='arc-menu-sep';     
        this.addMenuItem(item);      
        
        item = new PopupMenu.PopupMenuItem(_("Arc Menu on GitLab"));        
        item.connect('activate', ()=>{
            Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu');
        });     
        this.addMenuItem(item);  
        item = new PopupMenu.PopupMenuItem(_("About Arc Menu"));          
        item.connect('activate', ()=>{
            Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu/wikis/Introduction');
        });      
        this.addMenuItem(item);
    }
    addDTPSettings(){
        if(this.DTPSettings==false){
            let item = new PopupMenu.PopupMenuItem(_("Dash to Panel Settings"));
            item.connect('activate', ()=>{
                Util.spawnCommandLine('gnome-shell-extension-prefs dash-to-panel@jderose9.github.com');
            });
            this.addMenuItem(item,1);   
            this.DTPSettings=true;
        }
    }
    removeDTPSettings(){
        let children = this._getMenuItems();
        if(children[1] instanceof PopupMenu.PopupMenuItem)
            children[1].destroy();
        this.DTPSettings=false;
    }
    // Return that the menu is not empty (used by parent class)
    // Handle opening the menu
    open(animate) {
        super.open(animate);
    }
    // Handle closing the menu
    close(animate) { 
        super.close(animate);     
    }
};