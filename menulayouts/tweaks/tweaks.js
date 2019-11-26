/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2019 Andrew Zaech
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
const {Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Prefs = Me.imports.prefs;
const PW = Me.imports.prefsWidgets;
const _ = Gettext.gettext;


const SCHEMA_PATH = '/org/gnome/shell/extensions/arc-menu/';
const GSET = 'gnome-shell-extension-tool';

var TweaksDialog = GObject.registerClass(
    class ArcMenu_BriskTweaksDialog extends PW.DialogWindow {

        _init(settings, parent, label) {
            this._settings = settings;
            this.addResponse = false;
            super._init(label, parent);
            this.resize(550,250);
        }

        _createLayout(vbox) {    
            let menuLayout = this._settings.get_enum('menu-layout');
            if(menuLayout == Constants.MENU_LAYOUT.Default)
                this._loadArcMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Brisk)
                this._loadBriskMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Whisker)
                this._loadWhiskerMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.GnomeMenu)
                this._loadGnomeMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Mint)
                this._loadMintMenuTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Elementary)
                this._loadPlaceHolderTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.GnomeDash)
                this._loadPlaceHolderTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Simple)
                this._loadPlaceHolderTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Simple2)
                this._loadPlaceHolderTweaks(vbox);
            else if(menuLayout == Constants.MENU_LAYOUT.Redmond)
                this._loadRedmondMenuTweaks(vbox)
            else if(menuLayout == Constants.MENU_LAYOUT.UbuntuDash)
                this._loadPlaceHolderTweaks(vbox);
            else
                this._loadPlaceHolderTweaks(vbox);
        }
        _createActivateOnHoverRow(){
            let activateOnHoverRow = new PW.FrameBoxRow();
            let activateOnHoverLabel = new Gtk.Label({
                label: _("Category Activation"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let activateOnHoverCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            activateOnHoverCombo.append_text(_("Mouse Click"));
            activateOnHoverCombo.append_text(_("Mouse Hover"));
            if(this._settings.get_boolean('activate-on-hover'))
                activateOnHoverCombo.set_active(1);
            else 
                activateOnHoverCombo.set_active(0);
                activateOnHoverCombo.connect('changed', (widget) => {
                if(widget.get_active()==0)
                    this._settings.set_boolean('activate-on-hover',false);
                if(widget.get_active()==1)
                    this._settings.set_boolean('activate-on-hover',true);
            });
            
            activateOnHoverRow.add(activateOnHoverLabel);
            activateOnHoverRow.add(activateOnHoverCombo);
            return activateOnHoverRow;
        }
        _loadBriskMenuTweaks(vbox){
            let briskMenuTweaksFrame = new PW.FrameBox();
            briskMenuTweaksFrame.add(this._createActivateOnHoverRow());
            vbox.add(briskMenuTweaksFrame);
        }
        _loadMintMenuTweaks(vbox){
            let mintMenuTweaksFrame = new PW.FrameBox();
            mintMenuTweaksFrame.add(this._createActivateOnHoverRow());
            vbox.add(mintMenuTweaksFrame);
        }
        _loadWhiskerMenuTweaks(vbox){
            let whiskerMenuTweaksFrame = new PW.FrameBox();
            whiskerMenuTweaksFrame.add(this._createActivateOnHoverRow());

            let avatarStyleRow = new PW.FrameBoxRow();
            let avatarStyleLabel = new Gtk.Label({
                label: _('Avatar Icon Shape'),
                xalign:0,
                hexpand: true,
            });   
            let avatarStyleCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            avatarStyleCombo.append_text(_("Circular"));
            avatarStyleCombo.append_text(_("Square"));
            avatarStyleCombo.set_active(this._settings.get_enum('avatar-style'));
            avatarStyleCombo.connect('changed', (widget) => {
                this._settings.set_enum('avatar-style', widget.get_active());
                Prefs.saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
            });
            avatarStyleRow.add(avatarStyleLabel);
            avatarStyleRow.add(avatarStyleCombo);
            whiskerMenuTweaksFrame.add(avatarStyleRow);

            vbox.add(whiskerMenuTweaksFrame);
        }
        _loadRedmondMenuTweaks(vbox){
            let redmondMenuTweaksFrame = new PW.FrameBox();

            let avatarStyleRow = new PW.FrameBoxRow();
            let avatarStyleLabel = new Gtk.Label({
                label: _('Avatar Icon Shape'),
                xalign:0,
                hexpand: true,
            });   
            let avatarStyleCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            avatarStyleCombo.append_text(_("Circular"));
            avatarStyleCombo.append_text(_("Square"));
            avatarStyleCombo.set_active(this._settings.get_enum('avatar-style'));
            avatarStyleCombo.connect('changed', (widget) => {
                this._settings.set_enum('avatar-style', widget.get_active());
                Prefs.saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
            });
            avatarStyleRow.add(avatarStyleLabel);
            avatarStyleRow.add(avatarStyleCombo);
            redmondMenuTweaksFrame.add(avatarStyleRow);

            vbox.add(redmondMenuTweaksFrame);
        }
        _loadGnomeMenuTweaks(vbox){
            let gnomeMenuTweaksFrame = new PW.FrameBox();
            gnomeMenuTweaksFrame.add(this._createActivateOnHoverRow());
            vbox.add(gnomeMenuTweaksFrame);
        }
        _loadPlaceHolderTweaks(vbox){
            let placeHolderFrame = new PW.FrameBox();
            let placeHolderRow = new PW.FrameBoxRow();
            let placeHolderLabel = new Gtk.Label({
                label: _("Nothing Yet!"),
                use_markup: true,
                halign: Gtk.Align.CENTER,
                hexpand: true
            });
            placeHolderRow.add(placeHolderLabel);
            placeHolderFrame.add(placeHolderRow);
            vbox.add(placeHolderFrame);
        }
        _loadArcMenuTweaks(vbox){
            //Pinned Apps / Categories Default View Toggle 
            let arcMenuTweaksFrame = new PW.FrameBox();
            let defaultLeftBoxRow = new PW.FrameBoxRow();
            let defaultLeftBoxLabel = new Gtk.Label({
                label: _("Arc Menu Default View"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let defaultLeftBoxCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            defaultLeftBoxCombo.append_text(_("Pinned Apps"));
            defaultLeftBoxCombo.append_text(_("Categories List"));
            if(this._settings.get_boolean('enable-pinned-apps'))
                defaultLeftBoxCombo.set_active(0);
            else 
            defaultLeftBoxCombo.set_active(1);
            defaultLeftBoxCombo.connect('changed', (widget) => {
                if(widget.get_active()==0)
                    this._settings.set_boolean('enable-pinned-apps',true);
                if(widget.get_active()==1)
                    this._settings.set_boolean('enable-pinned-apps',false);
            });
            
            defaultLeftBoxRow.add(defaultLeftBoxLabel);
            defaultLeftBoxRow.add(defaultLeftBoxCombo);
            arcMenuTweaksFrame.add(defaultLeftBoxRow);

            let avatarStyleRow = new PW.FrameBoxRow();
            let avatarStyleLabel = new Gtk.Label({
                label: _('Avatar Icon Shape'),
                xalign:0,
                hexpand: true,
            });   
            let avatarStyleCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            avatarStyleCombo.append_text(_("Circular"));
            avatarStyleCombo.append_text(_("Square"));
            avatarStyleCombo.set_active(this._settings.get_enum('avatar-style'));
            avatarStyleCombo.connect('changed', (widget) => {
                this._settings.set_enum('avatar-style', widget.get_active());
                Prefs.saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
            });
            avatarStyleRow.add(avatarStyleLabel);
            avatarStyleRow.add(avatarStyleCombo);
            arcMenuTweaksFrame.add(avatarStyleRow);
            vbox.add(arcMenuTweaksFrame);
        }
});
