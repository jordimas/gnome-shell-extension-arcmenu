/*
 * Arc Menu - A traditional application menu for GNOME 3
 *
 * Arc Menu Lead Developer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * Arc Menu Founder/Maintainer/Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33
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

            let pinnedAppsFrame = new PW.FrameBox();
            
            let pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
            pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            pinnedAppsScrollWindow.set_max_content_height(300);
            pinnedAppsScrollWindow.set_min_content_height(300);
            //last row - save settings
            let savePinnedAppsButton = new Gtk.Button({
                label: _("Save"),
            });
            savePinnedAppsButton.connect('clicked', ()=> {
                //iterate through each frame row (containing apps to pin) to create an array to save in settings
                let array = [];
                for(let x = 0;x < pinnedAppsFrame.count; x++) {
                    array.push(pinnedAppsFrame.get_index(x)._name);
                    array.push(pinnedAppsFrame.get_index(x)._icon);
                    array.push(pinnedAppsFrame.get_index(x)._cmd);
                }
                this._settings.set_strv('mint-pinned-app-list',array);
                savePinnedAppsButton.set_sensitive(false);
            }); 
            savePinnedAppsButton.set_halign(Gtk.Align.END);
            savePinnedAppsButton.set_sensitive(false);
            
            //function to load all pinned apps
            this._loadPinnedApps(this._settings.get_strv('mint-pinned-app-list'), pinnedAppsFrame, savePinnedAppsButton);
            pinnedAppsScrollWindow.add_with_viewport(pinnedAppsFrame);
            vbox.add(pinnedAppsScrollWindow);

            vbox.add(savePinnedAppsButton);

            let pinnedAppsSeparatorFrame = new PW.FrameBox();
            let pinnedAppsSeparatorRow = new PW.FrameBoxRow();
            let pinnedAppsSeparatorLabel = new Gtk.Label({
                label: _("Separator Position Index"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let pinnedAppsSeparatorScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 7, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            pinnedAppsSeparatorScale.set_value(this._settings.get_int('mint-separator-index'));
            pinnedAppsSeparatorScale.connect('value-changed', (widget) => {
                this._settings.set_int('mint-separator-index', widget.get_value());
            }); 
            pinnedAppsSeparatorRow.add(pinnedAppsSeparatorLabel);
            pinnedAppsSeparatorRow.add(pinnedAppsSeparatorScale);
            pinnedAppsSeparatorFrame.add(pinnedAppsSeparatorRow);
            vbox.add(pinnedAppsSeparatorFrame);
            
            
        }
        _loadPinnedApps(array,frame, savePinnedAppsButton) {
            for(let i = 0;i<array.length;i+=3) {
                let frameRow = new PW.FrameBoxRow();
                frameRow._name = array[i];
                frameRow._icon = array[i+1];
                frameRow._cmd = array[i+2];
                
                let arcMenuImage = new Gtk.Image( {
                    gicon: Gio.icon_new_for_string(frameRow._icon),
                    pixel_size: 22
                });

                let arcMenuImageBox = new Gtk.VBox({
                    margin_left:5,
                    expand: false
                });
                arcMenuImageBox.add(arcMenuImage);
                frameRow.add(arcMenuImageBox);

                let frameLabel = new Gtk.Label({
                    use_markup: false,
                    xalign: 0,
                    hexpand: true
                });

                frameLabel.label = _(frameRow._name);
                frameRow.add(frameLabel);
                let buttonBox = new Gtk.Grid({
                    margin_top:0,
                    margin_bottom: 0,
                    vexpand: false,
                    hexpand: false,
                    margin_right: 15,
                    column_spacing: 2
                });

                //create the three buttons to handle the ordering of pinned apps
                //and delete pinned apps
                let addPinnedAppsButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'list-add-symbolic'
                });
                addPinnedAppsButton.connect('clicked', ()=> {
                    let isMintLayout = true;
                    let dialog = new Prefs.AddAppsToPinnedListWindow(this._settings, this, isMintLayout);
                    dialog.show_all();
                    dialog.connect('response', ()=> { 
                        if(dialog.get_response()) {
                            //checked apps to add to pinned apps list - from dialog 'Add" button click event
                            let newPinnedApps = dialog.get_newPinnedAppsArray();
                            frameRow._name = newPinnedApps[0];
                            frameRow._icon = newPinnedApps[1];
                            frameRow._cmd = newPinnedApps[2];
                            frameLabel.label = _(frameRow._name);
                            arcMenuImage.gicon = Gio.icon_new_for_string(frameRow._icon);
                            dialog.destroy();
                            frame.show();
                            savePinnedAppsButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    }); 
                });

                let editButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'emblem-system-symbolic'
                });
                let upButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'go-up-symbolic'
                });
                let downButton = new PW.IconButton({
                    circular: false,
                    icon_name: 'go-down-symbolic'
                });
                editButton.connect('clicked', ()=> {
                    let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                    let dialog = new Prefs.AddCustomLinkDialogWindow(this._settings, this, true, appArray);
                    dialog.show_all();
                    dialog.connect('response', ()=> { 
                        if(dialog.get_response()) {
                            let newPinnedApps = dialog.get_newPinnedAppsArray();
                            frameRow._name = newPinnedApps[0];
                            frameRow._icon = newPinnedApps[1];
                            frameRow._cmd = newPinnedApps[2];
                            frameLabel.label = _(frameRow._name);
                            arcMenuImage.gicon = Gio.icon_new_for_string(frameRow._icon);
                            dialog.destroy();
                            frame.show();
                            savePinnedAppsButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    });  
                });
                upButton.connect('clicked', ()=> {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index!=0) {
                      frame.remove(frameRow);
                      frame.insert(frameRow,index-1);
                    }
                    frame.show();
                    savePinnedAppsButton.set_sensitive(true);
                });

                downButton.connect('clicked', ()=> {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index+1<frame.count) {
                      frame.remove(frameRow);
                      frame.insert(frameRow,index+1);
                    }
                    frame.show();
                    savePinnedAppsButton.set_sensitive(true);
                });

                //add everything to frame
                buttonBox.add(addPinnedAppsButton);
                buttonBox.add(editButton);
                buttonBox.add(upButton);
                buttonBox.add(downButton);
                frameRow.add(buttonBox);
                frame.add(frameRow);
            }
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
