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
var ApplicationsButton =   Utils.defineClass({
    Name: 'ApplicationsButton',
    Extends: PanelMenu.Button,
    // Initialize the menu
        _init(settings, panel) {
            this.callParent('_init');
            this._settings = settings;
            this.DTPSettings=false;
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menuManager._changeMenu = (menu) => {};
            let sourceActor =  modernGnome ?  this : this.actor;
            this.rightClickMenu = new PopupMenu.PopupMenu(sourceActor,1.0,St.Side.TOP);	
            this.rightClickMenu.actor.add_style_class_name('panel-menu');
            this.rightClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
            this.rightClickMenu.actor.connect('key-press-event', this._onMenuKeyPress.bind(this));
            Main.uiGroup.add_actor(this.rightClickMenu.actor);
            this.rightClickMenu.actor.hide();
            let item = new PopupMenu.PopupMenuItem(_("Arc Menu Settings"));
            item.connect('activate', ()=>{
                Util.spawnCommandLine('gnome-shell-extension-prefs arc-menu@linxgem33.com');
            });
            this.rightClickMenu.addMenuItem(item);        
            item = new PopupMenu.PopupSeparatorMenuItem();     
            item._separator.style_class='arc-menu-sep';     
            this.rightClickMenu.addMenuItem(item);      
            
            item = new PopupMenu.PopupMenuItem(_("Arc Menu on GitLab"));        
            item.connect('activate', ()=>{
                Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu');
            });     
            this.rightClickMenu.addMenuItem(item);  
            item = new PopupMenu.PopupMenuItem(_("About Arc Menu"));          
            item.connect('activate', ()=>{
                Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu/wikis/Introduction');
            });      
            this.rightClickMenu.addMenuItem(item);
            
            this.leftClickMenu = new ApplicationsMenu(sourceActor, 1.0, St.Side.TOP, this, this._settings);
            this.leftClickMenu.actor.add_style_class_name('panel-menu');
            this.leftClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
            this.leftClickMenu.actor.connect('key-press-event', this._onMenuKeyPress.bind(this));
            Main.uiGroup.add_actor(this.leftClickMenu.actor);
            this.leftClickMenu.actor.hide();
            this.menuManager.addMenu(this.rightClickMenu); 	
            this.menuManager.addMenu(this.leftClickMenu); 


            this._session = new GnomeSession.SessionManager();
            this._panel = panel;
            this.appMenuManager = new PopupMenu.PopupMenuManager(this);
            this.appMenuManager._changeMenu = (menu) => {
            };
            this.extensionChangedId = ExtensionSystem.connect('extension-state-changed', (data, extension) => {
                if (extension.uuid === 'dash-to-panel@jderose9.github.com' && extension.state === 1) 
                    this.addDTPSettings();
                if (extension.uuid === 'dash-to-panel@jderose9.github.com' && extension.state === 2) 
                    this.removeDTPSettings();
            });
            if(global.dashToPanel)
                this.addDTPSettings();

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
            if (this.sourceActor)
                this._keyReleaseId = this.sourceActor.connect('key-release-event',
            this._onKeyRelease.bind(this));  

            //Basic Layout - mainBox
            this.section = new PopupMenu.PopupMenuSection();
            this.leftClickMenu.addMenuItem(this.section);            
            this.mainBox = new St.BoxLayout({
                vertical: false
            });      ;
            //this.newSearch = new ArcSearch.SearchResults(this);      
            this.mainBox.set_height(this._settings.get_int('menu-height'));               
            this.section.actor.add_actor(this.mainBox);               
        
            
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
            this.updateStyle();
        },
        getMenu(){
            return this.MenuLayout;
        },
        updateStyle(){
            this.MenuLayout.updateStyle();
            let addStyle=this._settings.get_boolean('enable-custom-arc-menu');
  
            if(addStyle){
                this.leftClickMenu.actor.style_class = 'arc-menu-boxpointer';
                this.leftClickMenu.actor.add_style_class_name('arc-menu');
                this.rightClickMenu.actor.style_class = 'arc-menu-boxpointer';
                this.rightClickMenu.actor.add_style_class_name('arc-menu');
            }
            else
            {       
                this.leftClickMenu.actor.style_class = 'popup-menu-boxpointer';
                this.leftClickMenu.actor.add_style_class_name('popup-menu');
                this.rightClickMenu.actor.style_class = 'popup-menu-boxpointer';
                this.rightClickMenu.actor.add_style_class_name('popup-menu'); 
            }
        },
        addDTPSettings(){
            if(this.DTPSettings==false){
                let item = new PopupMenu.PopupMenuItem(_("Dash to Panel Settings"));
                item.connect('activate', ()=>{
                    Util.spawnCommandLine('gnome-shell-extension-prefs dash-to-panel@jderose9.github.com');
                });
                this.rightClickMenu.addMenuItem(item,1);   
                this.DTPSettings=true;
            }
        },
        removeDTPSettings(){
            let children = this.rightClickMenu._getMenuItems();
            if(children[1] instanceof PopupMenu.PopupMenuItem)
                children[1].destroy();
            this.DTPSettings=false;
        },
        _onMenuKeyPress(actor, event) {
            if (global.focus_manager.navigate_from_event(event))
                return Clutter.EVENT_STOP;
            
            let symbol = event.get_key_symbol();
            if (symbol == Clutter.KEY_Left || symbol == Clutter.KEY_Right) {
    
                let group = global.focus_manager.get_group(this);
                if (group) {
                    let direction = (symbol == Clutter.KEY_Left) ? Gtk.DirectionType.LEFT : Gtk.DirectionType.RIGHT;
                    group.navigate_focus(this, direction, false);
                    return Clutter.EVENT_STOP;
                }
            }
            return Clutter.EVENT_PROPAGATE;
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
            let layout = this._settings.get_enum('menu-layout');
            if(layout == Constants.MENU_LAYOUT.GnomeDash)
                Main.overview.toggle();
            else{
                this.leftClickMenu.toggle();
                if(this.leftClickMenu.isOpen)
                    this.mainBox.grab_key_focus();
            }	  

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
            this._redisplay();
            this._redisplayRightSide();
        },
        // Destroy the menu button
        _onDestroy() {
            this.MenuLayout.destroy();
            ExtensionSystem.disconnect(this.extensionChangedId);
            this.extensionChangedId = 0;
            if (this.leftClickMenu) {
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
                    this.searchBox.disconnect(this._searchBoxChangedId);
                    this.searchBox.disconnect(this._searchBoxKeyPressId);
                    this.searchBox.disconnect(this._searchBoxActivateId);
                    this.searchBox.disconnect(this._searchBoxKeyFocusInId);
                    this.mainBox.disconnect(this._mainBoxKeyPressId);
                }
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
                this._panel.actor.disconnect(this._notifyHeightId);
                this._notifyHeightId = 0;
            }
            if (this._installedChangedId > 0) {
                appSys.disconnect(this._installedChangedId);
                this._installedChangedId  = 0;
            }
            this.callParent('destroy');
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
            this.mainBox.remove_all_children();
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
        setCurrentMenu(menu) {
            this.MenuLayout.setCurrentMenu(menu);
        },
        getCurrentMenu(){
            return this.MenuLayout.getCurrentMenu();
        },
        resetSearch(){ //used by back button to clear results
            this.MenuLayout.resetSearch();
        },
        // Handle changes in menu open state
        _onOpenStateChanged(menu, open) {
            if (open) {
                if (this.reloadFlag) {
                    this._redisplay();
                    this.reloadFlag = false;
                }
                //this.setDefaultMenuView();
                this.mainBox.show();  
            }
            if (open)
                modernGnome ?  this.add_style_pseudo_class('active') : this.actor.add_style_pseudo_class('active');
            else
                modernGnome ? this.remove_style_pseudo_class('active'): this.actor.remove_style_pseudo_class('active');
        },
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
         },
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
    });
// Aplication menu class
const ApplicationsMenu = class extends PopupMenu.PopupMenu {
    // Initialize the menu
    constructor(sourceActor, arrowAlignment, arrowSide, button, settings) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = settings;
        this._button = button;  
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
        this._button.MenuLayout.resetSearch();
        super.close(animate);     
    }
};