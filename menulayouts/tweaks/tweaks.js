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

const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
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
            else
                this._loadPlaceHolderTweaks(vbox);
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
                saveCSS(this._settings);
                this._settings.set_boolean('reload-theme',true);
            });
            avatarStyleRow.add(avatarStyleLabel);
            avatarStyleRow.add(avatarStyleCombo);
            arcMenuTweaksFrame.add(avatarStyleRow);
            vbox.add(arcMenuTweaksFrame);
        }
});
