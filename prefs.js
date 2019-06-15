/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2017 LinxGem33, Alexander Rüedlinger
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
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Constants = Me.imports.constants;
const PW = Me.imports.prefsWidgets;

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

/*
 * General Settings Page
 */
const GeneralSettingsPage = GObject.registerClass(
    class GeneralSettingsPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('General'));
            this.settings = settings;
            
            //first row - label
            let yourAppsLabel = new Gtk.Label({
                label: _("Your Pinned Apps:"),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                margin_bottom: 0
             });
            this.add(yourAppsLabel);
            
            //second row
            //list of currently pinned apps attached to scroll window
            this.pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
            this.pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            this.pinnedAppsScrollWindow.set_max_content_height(300);
            this.pinnedAppsScrollWindow.set_min_content_height(300);
            this.frame = new PW.FrameBox();
            //function to load all pinned apps
            this._loadPinnedApps(this.frame,this.settings.get_strv('pinned-apps'));
            this.pinnedAppsScrollWindow.add_with_viewport(this.frame);
            this.add(this.pinnedAppsScrollWindow);
            
            //third row - add more apps to pinned apps list
            let addPinnedAppsFrame = new PW.FrameBox();
            let addPinnedAppsFrameRow = new PW.FrameBoxRow();
            let addPinnedAppsFrameLabel = new Gtk.Label({
                label: _("Add More Apps"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let addPinnedAppsButton = new PW.IconButton({
                circular: false,
                icon_name: 'list-add-symbolic'
            });
            addPinnedAppsButton.connect('clicked', ()=>
            {
                let dialog = new AddAppsToPinnedListWindow(this.settings, this);
                dialog.show_all();
                dialog.connect('response', ()=>
                { 
                    if(dialog.get_response())
                    {
                        //checked apps to add to pinned apps list - from dialog 'Add" button click event
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        let array=[]; //how to store nested arrays in settings?
                        for(let i = 0;i<newPinnedApps.length;i++)
                        {
                            array.push(newPinnedApps[i].name);
                            array.push(newPinnedApps[i].icon);
                            array.push(newPinnedApps[i].cmd);
                        }
                        this._loadPinnedApps(this.frame,array);
                        dialog.destroy();
                        this.frame.show();
                    }
                    else
                        dialog.destroy();
                }); 
            });
            addPinnedAppsFrameRow.add(addPinnedAppsFrameLabel);
            addPinnedAppsFrameRow.add(addPinnedAppsButton);
            addPinnedAppsFrame.add(addPinnedAppsFrameRow);
            this.add(addPinnedAppsFrame);
            
            //fourth row - add custom app to pinned list
            let addCustomAppFrame = new PW.FrameBox();
            let addCustomAppFrameRow = new PW.FrameBoxRow();
            let addCustomAppFrameLabel = new Gtk.Label({
                label: _("Add Custom Shortcut"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let addCustomAppButton = new PW.IconButton({
                 circular: false,
                 icon_name: 'list-add-symbolic'
            });
            addCustomAppButton.connect('clicked', ()=>
            {
                let dialog = new AddCustomLinkDialogWindow(this.settings, this);
                dialog.show_all();
                dialog.connect('response', ()=>
                { 
                    if(dialog.get_response())
                    {
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        this._loadPinnedApps(this.frame,newPinnedApps);
                        dialog.destroy();
                        this.frame.show();
                    }
                    else
                        dialog.destroy();
                }); 
            });
            addCustomAppFrameRow.add(addCustomAppFrameLabel);
            addCustomAppFrameRow.add(addCustomAppButton);
            addCustomAppFrame.add(addCustomAppFrameRow);
            this.add(addCustomAppFrame);
            
            //last row - save settings
            let savePinnedAppsFrame = new PW.FrameBox();
            let savePinnedAppsFrameRow = new PW.FrameBoxRow();
            let savePinnedAppsFrameLabel = new Gtk.Label({
                label: _("Save Changes"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let savePinnedAppsButton = new Gtk.Button({
                label: "Save",
            });
            savePinnedAppsButton.connect('clicked', ()=>
            {
                //iterate through each frame row (containing apps to pin) to create an array to save in settings
                let array = [];
                for(let x = 0;x < this.frame.count; x++)
                {
                    array.push(this.frame.get_index(x).name);
                    array.push(this.frame.get_index(x).icon);
                    array.push(this.frame.get_index(x).cmd);
                }

                this.settings.set_strv('pinned-apps',array);
            }); 
            savePinnedAppsFrameRow.add(savePinnedAppsFrameLabel);
            savePinnedAppsFrameRow.add(savePinnedAppsButton);
            savePinnedAppsFrame.add(savePinnedAppsFrameRow);
            this.add(savePinnedAppsFrame);

        }
         
        _loadPinnedApps(frame,test)
        {
            this.frame = frame;
            for(let i = 0;i<test.length;i+=3)
            {
                let frameRow = new PW.FrameBoxRow();
                frameRow.name = test[i];
                frameRow.icon = test[i+1];
                frameRow.cmd = test[i+2];
                let arcMenuImage = new Gtk.Image(
                {
                  gicon: Gio.icon_new_for_string(test[i+1]),
                  pixel_size: 22
                });

                let arcMenuImageBox = new Gtk.VBox({
                    margin_left:5,
                    expand: false
                 });
                arcMenuImageBox.add(arcMenuImage);
                frameRow.add(arcMenuImageBox);

                let frameLabel = new Gtk.Label(
                {
                    use_markup: false,
                    xalign: 0,
                    hexpand: true
                });


                frameLabel.label = test[i];
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
                let upButton = new PW.IconButton({
                  circular: false,
                  icon_name: 'go-up-symbolic'
                });
                let downButton = new PW.IconButton({
                  circular: false,
                  icon_name: 'go-down-symbolic'
                });
                let deleteButton = new PW.IconButton({
                  circular: false,
                  icon_name: 'edit-delete-symbolic'
                });

                upButton.connect('clicked', ()=>
                {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index!=0)
                    {
                      this.frame.remove(frameRow);
                      this.frame.insert(frameRow,index-1);
                    }
                    this.frame.show();
                });

                downButton.connect('clicked', ()=>
                {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index+1<this.frame.count)
                    {
                      this.frame.remove(frameRow);
                      this.frame.insert(frameRow,index+1);
                    }
                    this.frame.show();
                });

                deleteButton.connect('clicked', ()=>
                {
                    //remove frameRow
                    this.frame.remove(frameRow);
                    this.frame.show();
                });
                //add everything to frame
                buttonBox.add(upButton);
                buttonBox.add(downButton);
                buttonBox.add(deleteButton);
                frameRow.add(deleteButton);
                frameRow.add(buttonBox);
                frame.add(frameRow);
            }
        }
    });
const AddAppsToPinnedListWindow = GObject.registerClass(
    class AddAppsToPinnedListWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            super._init(_('Add a Custom Shortcut to Pinned Apps List'), parent);
            this.newPinnedAppsArray=[];
            this.addResponse = false;
        }

        _createLayout(vbox) {
            //create a scrolledwindow for list of all apps
            let pinnedAppsScrollWindow = new Gtk.ScrolledWindow();
            pinnedAppsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            pinnedAppsScrollWindow.set_max_content_height(300);
            pinnedAppsScrollWindow.set_min_content_height(300);
            pinnedAppsScrollWindow.set_min_content_width(500);
            pinnedAppsScrollWindow.set_min_content_width(500);
            let appsFrame = new PW.FrameBox();

            //first row
            let appsFrameRow = new PW.FrameBoxRow();
            let appsFrameLabel = new Gtk.Label({
                label: 'List of Apps:',
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            //last row - Label and button to add apps to list
            let addAppsButton = new Gtk.Button({
                label: "Add",
            });

            addAppsButton.connect('clicked', ()=>
            {
                this.addResponse = true;
                this.response(-10);
            });

            let addAppsFrameRow = new PW.FrameBoxRow();
            let addAppsFrameLabel = new Gtk.Label({
                label: 'Add Selected Apps',
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            addAppsFrameRow.add(addAppsFrameLabel);
            addAppsFrameRow.add(addAppsButton);

            // add the frames to the vbox

            vbox.add(appsFrameLabel);

            this._loadCategories(appsFrame);
            pinnedAppsScrollWindow.add_with_viewport(appsFrame);
            vbox.add(pinnedAppsScrollWindow);
            vbox.add(addAppsFrameRow);
        }
        //function to get the array of apps to add to list
        get_newPinnedAppsArray()
        {
          return this.newPinnedAppsArray;
        }
        get_response()
        {
          return this.addResponse;
        }
        _loadCategories(frame)
        {
            //get all apps, store in list
            let allApps = Gio.app_info_get_all();
            //sort apps by name alphabetically
            allApps.sort(function(a, x)
            {
              let _a = a.get_display_name();
              let _b = x.get_display_name();

              return GLib.strcmp0(_a, _b);
            });
            //iterate through allApps and create the frameboxrows, labels, and checkbuttons
            for(let i = 0;i<allApps.length;i++)
            {
                if(allApps[i].should_show())
                {
                    let frameRow = new PW.FrameBoxRow();
                    frameRow.name = allApps[i].get_display_name();
                    frameRow.icon = allApps[i].get_icon().to_string(); //stores icon as string
                    frameRow.cmd = "gtk-launch " + allApps[i].get_id(); //string for command line to launch .desktop files
                    let iconImage = new Gtk.Image(
                    {
                      gicon: allApps[i].get_icon(),
                      pixel_size: 22
                    });

                    let iconImageBox = new Gtk.VBox(
                    {
                      margin_left: 5,
                      expand: false
                    });

                    iconImageBox.add(iconImage);
                    frameRow.add(iconImageBox);

                    let frameLabel = new Gtk.Label(
                    {
                      use_markup: false,
                      xalign: 0,
                      hexpand: true
                    });

                    frameLabel.label = allApps[i].get_display_name();

                    frameRow.add(frameLabel);

                    let checkButton = new Gtk.CheckButton(
                    {
                      margin_right: 20
                    });
                    checkButton.connect('toggled', ()=>
                    {
                        //if checkbox is checked add the framerow to newPinnedAppsArray
                        //else if unchecked remove it from the array
                        if(checkButton.get_active())
                        {
                          this.newPinnedAppsArray.push(frameRow);
                        }
                        else
                        {
                          let index= this.newPinnedAppsArray.indexOf(frameRow);
                          this.newPinnedAppsArray.splice(index,1);
                        }
                    });

                    frameRow.add(checkButton);
                    frame.add(frameRow);
                }
            }
        }
    });
    
const AddCustomLinkDialogWindow = GObject.registerClass(
    class AddCustomLinkDialogWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            super._init(_('Button appearance'), parent);
            this.newPinnedAppsArray=[];
            this.addResponse = false;
        }

        _createLayout(vbox) {
            let mainFrame = new PW.FrameBox();
            //first row  - Name of Custom link
            let nameFrameRow = new PW.FrameBoxRow();
            let nameFrameLabel = new Gtk.Label({
                label: _('Shortcut Name:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let nameEntry = new Gtk.Entry();
            nameFrameRow.add(nameFrameLabel);
            nameFrameRow.add(nameEntry);
            nameEntry.grab_focus();
            mainFrame.add(nameFrameRow);
            //second row  - Icon of Custom link
            let iconFrameRow = new PW.FrameBoxRow();
            let iconFrameLabel = new Gtk.Label({
                label: _("Icon Path/Icon Symbolic:"),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let iconEntry = new Gtk.Entry();
            iconFrameRow.add(iconFrameLabel);
            iconFrameRow.add(iconEntry);
            mainFrame.add(iconFrameRow);

            //third row  - Command of Custom link
            let cmdFrameRow = new PW.FrameBoxRow();
            let cmdFrameLabel = new Gtk.Label({
                label: _('Terminal Command:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let cmdEntry = new Gtk.Entry();
            cmdFrameRow.add(cmdFrameLabel);
            cmdFrameRow.add(cmdEntry);
             mainFrame.add(cmdFrameRow);
            //last row - Label and button to add custom link to list
            let addButton = new Gtk.Button({
                label: "Add",
            });

            addButton.connect('clicked', ()=>
            {
               this.newPinnedAppsArray.push(nameEntry.get_text());
               this.newPinnedAppsArray.push(iconEntry.get_text());
               this.newPinnedAppsArray.push(cmdEntry.get_text());
               this.addResponse = true;
               this.response(-10);
            });

            let addFrameRow = new PW.FrameBoxRow();
            let addFrameLabel = new Gtk.Label({
                label: _('Add Cutsom Link'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            addFrameRow.add(addFrameLabel);
            addFrameRow.add(addButton);
            mainFrame.add(addFrameRow);


            // add the frames to the vbox
            vbox.add(mainFrame);
        }
        //function to get the array of apps to add to list
        get_newPinnedAppsArray()
        {
          return this.newPinnedAppsArray;
        }
        get_response()
        {
          return this.addResponse;
        }
    });
/*
 * Behaviour Settings Page
 */
const BehaviourSettingsPage = GObject.registerClass(
    class BehaviourSettingsPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('Behaviour'));
            this.settings = settings;

            /*
             * Hot Corner Box
             */
            let disableHotCornerFrame = new PW.FrameBox();
            let disableHotCornerRow = new PW.FrameBoxRow();
            let disableHotCornerLabel = new Gtk.Label({
                label: _("Disable activities hot corner"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let disableHotCornerSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            disableHotCornerSwitch.set_active(this.settings.get_boolean('disable-activities-hotcorner'));
            disableHotCornerSwitch.connect('notify::active', function (check) {
                this.settings.set_boolean('disable-activities-hotcorner', check.get_active());
            }.bind(this));
            disableHotCornerRow.add(disableHotCornerLabel);
            disableHotCornerRow.add(disableHotCornerSwitch);
            disableHotCornerFrame.add(disableHotCornerRow);

            /*
             * Menu Hotkey and Keybinding Frame Box
             */
            let menuKeybindingFrame = new PW.FrameBox();

            // first row: hot key
            let menuHotkeyRow = new PW.FrameBoxRow();
            let menuHotkeyLabel = new Gtk.Label({
                label: _("Set menu hotkey"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuHotkeyCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            menuHotkeyCombo.append_text(_("Undefined"));
            menuHotkeyCombo.append_text(_("Left Super Key"));
            menuHotkeyCombo.append_text(_("Right Super Key"));
            menuHotkeyCombo.set_active(this.settings.get_enum('menu-hotkey'));
            menuHotkeyCombo.connect('changed', function (widget) {
                this.settings.set_enum('menu-hotkey', widget.get_active());
            }.bind(this));
            menuHotkeyRow.add(menuHotkeyLabel);
            menuHotkeyRow.add(menuHotkeyCombo);
            menuKeybindingFrame.add(menuHotkeyRow);

            // second row: custom Keybinding
            let menuKeybindingRow = new PW.FrameBoxRow();
            let menuKeybindingLabel = new Gtk.Label({
                label: _("Enable custom menu keybinding"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuKeybindingDescriptionRow = new PW.FrameBoxRow();
            let menuKeybindingDescriptionLabel = new Gtk.Label({
                label: _("Syntax: <Shift>, <Ctrl>, <Alt>, <Super>")
            });

            let menuKeybindingSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            menuKeybindingSwitch.set_active(this.settings.get_boolean('enable-menu-keybinding'));
            menuKeybindingSwitch.connect('notify::active', function (check) {
                this.settings.set_boolean('enable-menu-keybinding', check.get_active());
            }.bind(this));
            let menuKeybindingEntry = new Gtk.Entry({ halign: Gtk.Align.END });
            menuKeybindingEntry.set_width_chars(15);
            menuKeybindingEntry.set_text(this.settings.get_string('menu-keybinding-text'));
            menuKeybindingEntry.connect('changed', function (entry) {
                let _menuKeybinding = entry.get_text();
                //TODO: catch possible user mistakes
                this.settings.set_string('menu-keybinding-text', _menuKeybinding);
                // Always deactivate the menu keybinding after it has been changed.
                // By that we avoid pssible "UX" or sync bugs.
                menuKeybindingSwitch.set_active(false);
            }.bind(this));
            menuKeybindingRow.add(menuKeybindingLabel);
            menuKeybindingRow.add(menuKeybindingEntry);
            menuKeybindingRow.add(menuKeybindingSwitch);
            menuKeybindingDescriptionRow.add(menuKeybindingDescriptionLabel);

            menuKeybindingFrame.add(menuKeybindingRow);
            menuKeybindingFrame.add(menuKeybindingDescriptionRow);

            // add the frames
            this.add(disableHotCornerFrame);
            this.add(menuKeybindingFrame);
        }
    });

/*
 * TODO: Appearance Settings Page
 */
const MenuButtonCustomizationWindow = GObject.registerClass(
    class MenuButtonCustomizationWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            super._init(_('Button appearance'), parent);
        }

        _createLayout(vbox) {
            /*
            * Text Appearance Frame
            */
            let menuButtonTextFrame = new PW.FrameBox();

            //first row
            let menuButtonTextBoxRow = new PW.FrameBoxRow();
            let menuButtonTextLabel = new Gtk.Label({
                label: _('Text for the menu button'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let systemTextButton = new Gtk.RadioButton({
                label: _('System text')
            });
            let customTextButton = new Gtk.RadioButton({
                label: _('Custom text'),
                group: systemTextButton
            });

            if (this._settings.get_enum('menu-button-text') === Constants.MENU_BUTTON_TEXT.System) {
                systemTextButton.set_active(true);
            } else {
                customTextButton.set_active(true);
            }

            systemTextButton.connect('clicked', () => {
                this._settings.set_enum('menu-button-text', Constants.MENU_BUTTON_TEXT.System);
            });
            customTextButton.connect('clicked', () => {
                this._settings.set_enum('menu-button-text', Constants.MENU_BUTTON_TEXT.Custom);
            });
            menuButtonTextBoxRow.add(menuButtonTextLabel);
            menuButtonTextBoxRow.add(systemTextButton);
            menuButtonTextBoxRow.add(customTextButton);
            menuButtonTextFrame.add(menuButtonTextBoxRow);

            // second row
            let menuButtonCustomTextBoxRow = new PW.FrameBoxRow();
            let menuButtonCustomTextLabel = new Gtk.Label({
                label: _('Set custom text for the menu button'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let menuButtonCustomTextEntry = new Gtk.Entry({ halign: Gtk.Align.END });
            menuButtonCustomTextEntry.set_width_chars(15);
            menuButtonCustomTextEntry.set_text(this._settings.get_string('custom-menu-button-text'));
            menuButtonCustomTextEntry.connect('changed', function (entry) {
                let customMenuButtonText = entry.get_text();
                this._settings.set_string('custom-menu-button-text', customMenuButtonText);
            }.bind(this));
            menuButtonCustomTextBoxRow.add(menuButtonCustomTextLabel);
            menuButtonCustomTextBoxRow.add(menuButtonCustomTextEntry);
            menuButtonTextFrame.add(menuButtonCustomTextBoxRow);

            // third row
            let menuButtonArrowIconBoxRow = new PW.FrameBoxRow();
            let menuButtonArrowIconLabel = new Gtk.Label({
                label: _('Enable the arrow icon beside the button text'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let enableArrowIconSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
            enableArrowIconSwitch.set_active(this._settings.get_boolean('enable-menu-button-arrow'));
            enableArrowIconSwitch.connect('notify::active', function (check) {
                this._settings.set_boolean('enable-menu-button-arrow', check.get_active());
            }.bind(this));
            menuButtonArrowIconBoxRow.add(menuButtonArrowIconLabel);
            menuButtonArrowIconBoxRow.add(enableArrowIconSwitch);
            menuButtonTextFrame.add(menuButtonArrowIconBoxRow);

            /*
            * Icon Appearance Frame
            */
            let menuButtonIconFrame = new PW.FrameBox();

            // first row
            let menuButtonIconBoxRow = new PW.FrameBoxRow();
            let menuButtonIconBoxLabel = new Gtk.Label({
                label: _('Select icon for the menu button'),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            // create file filter and file chooser button
            let fileFilter = new Gtk.FileFilter();
            fileFilter.add_pixbuf_formats();
            let fileChooserButton = new Gtk.FileChooserButton({
                action: Gtk.FileChooserAction.OPEN,
                title: _('Please select an image icon'),
                filter: fileFilter
            });

            let menuButtonIconCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            menuButtonIconCombo.append_text(_("Arc Menu Icon"));
            menuButtonIconCombo.append_text(_("System Icon"));
            menuButtonIconCombo.append_text(_("Custom Icon"));
            menuButtonIconCombo.set_active(this._settings.get_enum('menu-button-icon'));
            menuButtonIconCombo.connect('changed', function (widget) {
                this._settings.set_enum('menu-button-icon', widget.get_active());
            }.bind(this));

            fileChooserButton.connect('file-set', function (fileChooserButton) {
                let iconFilepath = fileChooserButton.get_filename();
                this._settings.set_string('custom-menu-button-icon', iconFilepath);
                menuButtonIconCombo.set_active(Constants.MENU_BUTTON_ICON.Custom);
            }.bind(this));
            fileChooserButton.set_current_folder(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES));
            let iconFilepath = this._settings.get_string('custom-menu-button-icon');
            if (iconFilepath) {
                fileChooserButton.set_filename(iconFilepath);
            }

            menuButtonIconBoxRow.add(menuButtonIconBoxLabel);
            menuButtonIconBoxRow.add(fileChooserButton);
            menuButtonIconBoxRow.add(menuButtonIconCombo);
            menuButtonIconFrame.add(menuButtonIconBoxRow);

            // second row
            let menuButtonIconScaleBoxRow = new PW.FrameBoxRow();
            let iconSize = this._settings.get_double('custom-menu-button-icon-size');
            let menuButtonIconScaleBoxLabel = new Gtk.Label({
                label: _('Icon size') + '\n(' + _('default is') + ' ' + Constants.DEFAULT_ICON_SIZE + ')',
                use_markup: true,
                xalign: 0
            });
            let hscale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 64,
                    step_increment: 1,
                    page_increment: 1,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            hscale.connect('format-value', function (scale, value) { return value.toString() + ' px'; });
            Constants.ICON_SIZES.forEach(function (num) {
                hscale.add_mark(num, Gtk.PositionType.BOTTOM, num.toString());
            });
            hscale.set_value(iconSize);
            hscale.connect('value-changed', () => {
                this._settings.set_double('custom-menu-button-icon-size', hscale.get_value());
            });

            menuButtonIconScaleBoxRow.add(menuButtonIconScaleBoxLabel);
            menuButtonIconScaleBoxRow.add(hscale);
            menuButtonIconFrame.add(menuButtonIconScaleBoxRow);

            // add the frames to the vbox
            vbox.add(menuButtonTextFrame);
            vbox.add(menuButtonIconFrame);
        }
    });

const AppearanceSettingsPage = GObject.registerClass(
    class AppearanceSettingsPage extends PW.NotebookPage {

        _init(settings) {
            super._init(_('Appearance'));
            this.settings = settings;

            /*
             * Menu Button Appearance Frame Box
             */
            let menuButtonAppearanceFrame = new PW.FrameBox();
            let menuButtonAppearanceRow = new PW.FrameBoxRow();
            let menuButtonAppearanceLabel = new Gtk.Label({
                label: _("Customize menu button appearance"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let menuButtonAppearanceSettingsButton = new PW.IconButton({
                circular: true,
                icon_name: 'emblem-system-symbolic'
            });
            let menuButtonAppearanceCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
            menuButtonAppearanceCombo.append_text(_("Icon"));
            menuButtonAppearanceCombo.append_text(_("Text"));
            menuButtonAppearanceCombo.append_text(_("Icon and Text"));
            menuButtonAppearanceCombo.append_text(_("Text and Icon"));
            menuButtonAppearanceCombo.set_active(this.settings.get_enum('menu-button-appearance'));
            menuButtonAppearanceCombo.connect('changed', function (widget) {
                this.settings.set_enum('menu-button-appearance', widget.get_active());
            }.bind(this));

            // Extra settings for the appearance of the menu button
            menuButtonAppearanceSettingsButton.connect('clicked',
                () => {
                    let dialog = new MenuButtonCustomizationWindow(this.settings, this);
                    dialog.show_all();
                });

            menuButtonAppearanceRow.add(menuButtonAppearanceLabel);
            menuButtonAppearanceRow.add(menuButtonAppearanceSettingsButton);
            menuButtonAppearanceRow.add(menuButtonAppearanceCombo);
            menuButtonAppearanceFrame.add(menuButtonAppearanceRow);
            this.add(menuButtonAppearanceFrame);

            /*
             * Menu Position Box
             */
            let menuPositionFrame = new PW.FrameBox();
            let menuPositionRow = new PW.FrameBoxRow();
            let menuPositionBoxLabel = new Gtk.Label({
                label: _("Menu position in panel"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let menuPositionLeftButton = new Gtk.RadioButton({
                label: _('Left')
            });
            let menuPositionCenterButton = new Gtk.RadioButton({
                label: _('Center'),
                group: menuPositionLeftButton
            });
            let menuPositionRightButton = new Gtk.RadioButton({
                label: _('Right'),
                group: menuPositionLeftButton
            });
            // callback handlers for the radio buttons
            menuPositionLeftButton.connect('clicked', () => {
                this.settings.set_enum('position-in-panel', Constants.MENU_POSITION.Left);
            });
            menuPositionCenterButton.connect('clicked', () => {
                this.settings.set_enum('position-in-panel', Constants.MENU_POSITION.Center);
            });
            menuPositionRightButton.connect('clicked', () => {
                this.settings.set_enum('position-in-panel', Constants.MENU_POSITION.Right);
            });

            switch (this.settings.get_enum('position-in-panel')) {
                case Constants.MENU_POSITION.Left:
                    menuPositionLeftButton.set_active(true);
                    break;
                case Constants.MENU_POSITION.Center:
                    menuPositionCenterButton.set_active(true);
                    break;
                case Constants.MENU_POSITION.Right:
                    menuPositionRightButton.set_active(true);
                    break;
            }

            menuPositionRow.add(menuPositionBoxLabel);
            menuPositionRow.add(menuPositionLeftButton);
            menuPositionRow.add(menuPositionCenterButton);
            menuPositionRow.add(menuPositionRightButton);
            menuPositionFrame.add(menuPositionRow);

            // add the frames
            this.add(menuPositionFrame);
        }
    });

/*
 * Fine Tune Settings Page
 *
const FineTuneSettingsPage = GObject.registerClass(
    class FineTuneSettingsPage extends PW.NotebookPage {
    _init(settings) {
        super._init(_('Fine Tune'));
        this.settings = settings;

        /*
         * Tooltips Box
         *
        let toolTipsFrame = new PW.FrameBox();
        let toolTipsRow = new PW.FrameBoxRow();
        let toolTipsLabel = new Gtk.Label({
            label: _("Enable tooltips"),
            use_markup: true,
            xalign: 0,
            hexpand: true
        });
        let toolTipsSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
        toolTipsSwitch.set_active(this.settings.get_boolean('enable-tooltips'));
        toolTipsSwitch.connect('notify::active', function(check) => {
            this.settings.set_boolean('enable-tooltips', check.get_active());
        });
        toolTipsRow.add(toolTipsLabel);
        toolTipsRow.add(toolTipsSwitch);
        toolTipsFrame.add(toolTipsRow);

        // add the frames
        this.add(toolTipsFrame)
    }
});

/*
 * About Page
 */
const AboutPage = GObject.registerClass(
    class AboutPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('About'));
            this.settings = settings;

            // Use meta information from metadata.json
            let releaseVersion = Me.metadata.version || 'unknown';
            let projectName = Me.metadata.name;
            let projectDescription = Me.metadata.description;
            let projectUrl = Me.metadata.url;

            // Create GUI elements
            // Create the image box
            let logoPath = Me.path + Constants.ARC_MENU_LOGO.Path;
            let [imageWidth, imageHeight] = Constants.ARC_MENU_LOGO.Size;
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(logoPath, imageWidth, imageHeight);
            let arcMenuImage = new Gtk.Image({ pixbuf: pixbuf });
            let arcMenuImageBox = new Gtk.VBox({
                margin_top: 5,
                margin_bottom: 5,
                expand: false
            });
            arcMenuImageBox.add(arcMenuImage);

            // Create the info box
            let arcMenuInfoBox = new Gtk.VBox({
                margin_top: 5,
                margin_bottom: 5,
                expand: false
            });
            let arcMenuLabel = new Gtk.Label({
                label: '<b>' + _('Arc-Menu') + '</b>',
                use_markup: true,
                expand: false
            });
            let versionLabel = new Gtk.Label({
                label: _('version: ') + releaseVersion,
                expand: false
            });
            let projectDescriptionLabel = new Gtk.Label({
                label: _(projectDescription),
                expand: false
            });
            let projectLinkButton = new Gtk.LinkButton({
                label: _('GitLab Page'),
                uri: projectUrl,
                expand: false
            });
            arcMenuInfoBox.add(arcMenuLabel);
            arcMenuInfoBox.add(versionLabel);
            arcMenuInfoBox.add(projectDescriptionLabel);
            arcMenuInfoBox.add(projectLinkButton);

            // Create the GNU software box
            let gnuSofwareLabel = new Gtk.Label({
                label: Constants.GNU_SOFTWARE,
                use_markup: true,
                justify: Gtk.Justification.CENTER,
                expand: true
            });
            let gnuSofwareLabelBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL
            });
            gnuSofwareLabelBox.add(gnuSofwareLabel);

            this.add(arcMenuImageBox);
            this.add(arcMenuInfoBox);
            this.add(gnuSofwareLabelBox);
        }
    });

/*
 * Arc Menu Preferences Widget
 */
const ArcMenuPreferencesWidget = new GObject.Class({
    Name: 'ArcMenu.ArcMenuPreferencesWidget',
    GTypeName: 'ArcMenuPreferencesWidget',
    Extends: Gtk.Box,

    _init: function () {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            border_width: 5
        });
        this.settings = Convenience.getSettings(Me.metadata['settings-schema']);

        let notebook = new PW.Notebook();
        // Spoiler alert: There will be a general settings page in vXX ;-)
        let generalSettingsPage = new GeneralSettingsPage(this.settings);
        notebook.append_page(generalSettingsPage, generalSettingsPage.title);

        let behaviourSettingsPage = new BehaviourSettingsPage(this.settings);
        notebook.append_page(behaviourSettingsPage);

        let appearancePage = new AppearanceSettingsPage(this.settings);
        notebook.append_page(appearancePage);

        // let fineTunePage = new FineTuneSettingsPage(this.settings);
        // notebook.append_page(fineTunePage);

        let aboutPage = new AboutPage(this.settings);
        notebook.append_page(aboutPage);

        this.add(notebook);
    }
});

// Initialize menu language translations
function init() {
    Convenience.initTranslations(Me.metadata['gettext-domain']);
}

function buildPrefsWidget() {
    let widget = new ArcMenuPreferencesWidget();
    widget.show_all();
    return widget;
}