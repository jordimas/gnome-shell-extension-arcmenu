/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Modified work: Copyright (C) 2019 Andrew Zaech
 *
 *  this.mainButton program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 *  this.mainButton program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with  this.mainButton program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *
 */
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
const Util = imports.misc.util;
const GnomeSession = imports.misc.gnomeSession;
const ExtensionUtils = imports.misc.extensionUtils;
const ExtensionSystem = imports.ui.extensionSystem;
const Me = ExtensionUtils.getCurrentExtension();
const PlaceDisplay = Me.imports.placeDisplay;
const MW = Me.imports.menuWidgets;
const ArcSearch = Me.imports.search;
const Constants = Me.imports.constants;

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;
const Utils =  Me.imports.utils;
const appSys = Shell.AppSystem.get_default();
const PanelMenu = imports.ui.panelMenu;
let modernGnome = imports.misc.config.PACKAGE_VERSION >= '3.31.9';

class createMenu {
    constructor(mainButton) {
         this.mainButton = mainButton;
        // Create main menu sections and scroll views
         this.mainButton.section = new PopupMenu.PopupMenuSection();
         this.mainButton.leftClickMenu.addMenuItem( this.mainButton.section);
         this.mainButton.mainBox = new St.BoxLayout({
            vertical: true
        });
        this.mainButton.topBox = new St.BoxLayout({
            vertical: false
        });
        this.mainButton.user = new MW.UserMenuItem(this);
        this.mainButton.topBox.add(this.mainButton.user.actor, {
            expand: true,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });
        //create new section for Power, Lock, Logout, Suspend Buttons
        this.mainButton.actionsBox = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        //check if custom arc menu is enabled
        if( this.mainButton._settings.get_boolean('enable-custom-arc-menu'))
             this.mainButton.actionsBox.actor.add_style_class_name('arc-menu');
        //Logout Button
        if( this.mainButton._settings.get_boolean('show-logout-button')){
            let logout = new MW.LogoutButton( this.mainButton);
             this.mainButton.actionsBox.actor.add(logout.actor, {
                expand: false,
                x_fill: false,
                y_align: St.Align.START
            });
        }  
        //LockButton
        if( this.mainButton._settings.get_boolean('show-lock-button')){
            let lock = new MW.LockButton( this.mainButton);
             this.mainButton.actionsBox.actor.add(lock.actor, {
                expand: false,
                x_fill: false,
                y_align: St.Align.START
            });
        }
        //Suspend Button
        if( this.mainButton._settings.get_boolean('show-suspend-button')){
            let suspend = new MW.SuspendButton( this.mainButton);
             this.mainButton.actionsBox.actor.add(suspend.actor, {
                expand: false,
                x_fill: false,
                y_align: St.Align.START
            });
        }
        //Power Button
        if( this.mainButton._settings.get_boolean('show-power-button')){
            let power = new MW.PowerButton( this.mainButton);
             this.mainButton.actionsBox.actor.add(power.actor, {
                expand: false,
                x_fill: false,
                y_align: St.Align.START
            });
        }
        //add actionsbox to leftbox             
         this.mainButton.topBox.add( this.mainButton.actionsBox.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            padding: 0,
            margin:0
        });
        this.mainButton.mainBox.add(this.mainButton.topBox, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });

         this.mainButton.newSearch = new ArcSearch.SearchResults( this.mainButton);
         this.mainButton.mainBox.set_height( this.mainButton._settings.get_int('menu-height'));
         this.mainButton.section.actor.add_actor( this.mainButton.mainBox);
         this.mainButton.mainBox._delegate =  this.mainButton.mainBox;
         this.mainButton._mainBoxKeyPressId =  this.mainButton.mainBox.connect('key-press-event',  this.mainButton._onMainBoxKeyPress.bind( this.mainButton));
         // Create search box
         this.mainButton.searchBox = new MW.SearchBox();
         this.mainButton._firstAppItem = null;
         this.mainButton._firstApp = null;
         this.mainButton._tabbedOnce = false;
         this.mainButton._searchBoxChangedId =  this.mainButton.searchBox.connect('changed',  this.mainButton._onSearchBoxChanged.bind( this.mainButton));
         this.mainButton._searchBoxKeyPressId =  this.mainButton.searchBox.connect('key-press-event',  this.mainButton._onSearchBoxKeyPress.bind( this.mainButton));
         this.mainButton._searchBoxActivateId =  this.mainButton.searchBox.connect('activate',  this.mainButton._onSearchBoxActive.bind( this.mainButton));
         this.mainButton._searchBoxKeyFocusInId =  this.mainButton.searchBox.connect('key-focus-in',  this.mainButton._onSearchBoxKeyFocusIn.bind( this.mainButton));
        //Add search box to menu
         this.mainButton.mainBox.add( this.mainButton.searchBox.actor, {
            expand: false,
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START
        });
        this.mainButton.appsBox = new St.BoxLayout({
            vertical: false
        });
        this.mainButton.mainBox.add(this.mainButton.appsBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });


        
        //Add LeftBox to MainBox


        //Right Box
         this.mainButton.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-box'
        });
        this.mainButton.shorcutsBox = new St.BoxLayout({
            vertical: true
        });
         this.mainButton.shortcutsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: false,
            y_align: St.Align.START,
            overlay_scrollbars: true
        });   
        this.mainButton.shortcutsScrollBox.set_width(250);  
         this.mainButton.shortcutsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        let vscroll2 =  this.mainButton.shortcutsScrollBox.get_vscroll_bar();
        vscroll2.connect('scroll-start', () => {
             this.mainButton.leftClickMenu.passEvents = true;
        });
        vscroll2.connect('scroll-stop', () => {
             this.mainButton.leftClickMenu.passEvents = false;
        }); 
         this.mainButton.shortcutsScrollBox.add_actor( this.mainButton.shorcutsBox);
         this.mainButton.rightBox.add( this.mainButton.shortcutsScrollBox);
        // Left Box
        //Menus Left Box container
        this.mainButton.leftBox = new St.BoxLayout({
            vertical: true,
            style_class: 'left-box'
        });
        this.mainButton.appsBox.add( this.mainButton.leftBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });
                //Add Vert Separator to Main Box
                this.mainButton.appsBox.add( this.mainButton._createVertSeparator(), {
                    expand: true,
                    x_fill: true,
                    y_fill: true
                });
         this._createLeftBox();
         this.mainButton.appsBox.add( this.mainButton.rightBox, {
            expand: true,
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START
        });
    }
    _createLeftBox(){
   

        //Applications Box - Contains Favorites, Categories or programs
         this.mainButton.applicationsScrollBox = new St.ScrollView({
            x_fill: true,
            y_fill: true,
            y_align: St.Align.START,
            style_class: 'apps-menu vfade left-scroll-area',
            overlay_scrollbars: true
        });
         this.mainButton.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        let vscroll =  this.mainButton.applicationsScrollBox.get_vscroll_bar();
        vscroll.connect('scroll-start', () => {
             this.mainButton.leftClickMenu.passEvents = true;
        });
        vscroll.connect('scroll-stop', () => {
             this.mainButton.leftClickMenu.passEvents = false;
        });
         this.mainButton.leftBox.add( this.mainButton.applicationsScrollBox, {
            expand: true,
            x_fill: true, y_fill: true,
            y_align: St.Align.START
        });
         this.mainButton.applicationsBox = new St.BoxLayout({ vertical: true });
         this.mainButton.applicationsScrollBox.add_actor( this.mainButton.applicationsBox);
        
        
    }

    _redisplayLeftSide(){
        this.mainButton.leftBox.destroy_all_children();
        this._createLeftBox();
    }
}


