/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2017 Alexander Rüedlinger
 *
 * Copyright (C) 2017-2019 LinxGem33 
 *
 * Copyright (C) 2019 Andrew Zaech
 * 
 * Import/Export settings utility leveraged from Dash to Panel -- https://github.com/home-sweet-gnome/dash-to-panel
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
const PW = Me.imports.prefsWidgets;
const _ = Gettext.gettext;

const SCHEMA_PATH = '/org/gnome/shell/extensions/arc-menu/';
const GSET = 'gnome-shell-extension-tool';
/*
 * Pinned Apps Page
 */
var PinnedAppsPage = GObject.registerClass(
    class PinnedAppsPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('Pinned Apps'));
            this._settings = settings;
            
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
            this._loadPinnedApps(this._settings.get_strv('pinned-app-list'));
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
                let dialog = new AddAppsToPinnedListWindow(this._settings, this);
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
                            array.push(newPinnedApps[i]._name);
                            array.push(newPinnedApps[i]._icon);
                            array.push(newPinnedApps[i]._cmd);
                        }
                        this._loadPinnedApps(array);
                        dialog.destroy();
                        this.frame.show();
                        this.savePinnedAppsButton.set_sensitive(true);
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
                let dialog = new AddCustomLinkDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', ()=>
                { 
                    if(dialog.get_response())
                    {
                        let newPinnedApps = dialog.get_newPinnedAppsArray();
                        this._loadPinnedApps(newPinnedApps);
                        dialog.destroy();
                        this.frame.show();
                        this.savePinnedAppsButton.set_sensitive(true);
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
            this.savePinnedAppsButton = new Gtk.Button({
                label: _("Save"),
            });
            this.savePinnedAppsButton.connect('clicked', ()=>
            {
                //iterate through each frame row (containing apps to pin) to create an array to save in settings
                let array = [];
                for(let x = 0;x < this.frame.count; x++)
                {
                    array.push(this.frame.get_index(x)._name);
                    array.push(this.frame.get_index(x)._icon);
                    array.push(this.frame.get_index(x)._cmd);
                }
                this._settings.set_strv('pinned-app-list',array);
                this.savePinnedAppsButton.set_sensitive(false);
            }); 
            this.savePinnedAppsButton.set_halign(Gtk.Align.END);
            this.savePinnedAppsButton.set_sensitive(false);
            this.add(this.savePinnedAppsButton);

        }
         
        _loadPinnedApps(array)
        {
            for(let i = 0;i<array.length;i+=3)
            {
                let frameRow = new PW.FrameBoxRow();
                frameRow._name = array[i];
                frameRow._icon = array[i+1];
                frameRow._cmd = array[i+2];
                let arcMenuImage = new Gtk.Image(
                {
                  gicon: Gio.icon_new_for_string(frameRow._icon),
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
                let deleteButton = new PW.IconButton({
                  circular: false,
                  icon_name: 'edit-delete-symbolic'
                });
                editButton.connect('clicked', ()=>
                {
                    let appArray = [frameRow._name,frameRow._icon,frameRow._cmd];
                    let dialog = new AddCustomLinkDialogWindow(this._settings, this, true, appArray);
                    dialog.show_all();
                    dialog.connect('response', ()=>
                    { 
                        if(dialog.get_response())
                        {
                            let newPinnedApps = dialog.get_newPinnedAppsArray();
                            frameRow._name = newPinnedApps[0];
                            frameRow._icon = newPinnedApps[1];
                            frameRow._cmd = newPinnedApps[2];
                            frameLabel.label = _(frameRow._name);
                            arcMenuImage.gicon = Gio.icon_new_for_string(frameRow._icon);
                            dialog.destroy();
                            this.frame.show();
                            this.savePinnedAppsButton.set_sensitive(true);
                        }
                        else
                            dialog.destroy();
                    }); 
                    
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
                    this.savePinnedAppsButton.set_sensitive(true);
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
                    this.savePinnedAppsButton.set_sensitive(true);
                });

                deleteButton.connect('clicked', ()=>
                {
                    //remove frameRow
                    this.frame.remove(frameRow);
                    this.frame.show();
                    this.savePinnedAppsButton.set_sensitive(true);
                });
                //add everything to frame
                buttonBox.add(editButton);
                buttonBox.add(upButton);
                buttonBox.add(downButton);
                buttonBox.add(deleteButton);
                frameRow.add(buttonBox);
                this.frame.add(frameRow);
            }
        }
});
//Dialog Window for Adding Apps to Pinned Apps List   
var AddAppsToPinnedListWindow = GObject.registerClass(
    class AddAppsToPinnedListWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            super._init(_('Select Apps to add to Pinned Apps List'), parent);
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
            this.appsFrame = new PW.FrameBox();

            //first row


            //last row - Label and button to add apps to list
            let addAppsButton = new Gtk.Button({
                label: _("Add"),
                xalign:1
            });

            addAppsButton.connect('clicked', ()=>
            {
                this.addResponse = true;
                this.response(-10);
            });
	    addAppsButton.set_halign(Gtk.Align.END);

            // add the frames to the vbox
            this._loadCategories();
            pinnedAppsScrollWindow.add_with_viewport(this.appsFrame);
            vbox.add(pinnedAppsScrollWindow);
            vbox.add(addAppsButton);
        }
        //function to get the array of apps to add to list
        get_newPinnedAppsArray(){
            return this.newPinnedAppsArray;
        }
        get_response(){
            return this.addResponse;
        }
        _loadCategories(){
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
                //if(true) //debug
                if(allApps[i].should_show())
                {
                    let frameRow = new PW.FrameBoxRow();
                    frameRow._name = allApps[i].get_display_name();
                    if(allApps[i].get_icon())
                    	frameRow._icon = allApps[i].get_icon().to_string(); //stores icon as string
                    else{
                        //global.log(frameRow._name);
                    	frameRow._icon= "dialog-information";
                    }
                    frameRow._cmd =  allApps[i].get_id(); //string for command line to launch .desktop files
                    let iconImage = new Gtk.Image(
                    {
                      gicon: Gio.icon_new_for_string(frameRow._icon),
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

                    frameLabel.label = frameRow._name;

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
                    this.appsFrame.add(frameRow);
                }
            }
        }
});
    
//Dialog Window for Adding Custom Links to Pinned Apps List    
var AddCustomLinkDialogWindow = GObject.registerClass(
    class AddCustomLinkDialogWindow extends PW.DialogWindow {

        _init(settings, parent, isAppEdit=false, appArray=null) {
            this._settings = settings;
            this.newPinnedAppsArray=[];
            this.addResponse = false;
            this.isAppEdit = isAppEdit;
            this.appArray = appArray;
            super._init(isAppEdit?_('Edit Pinned App'):_('Add a Custom Shortcut'), parent);
        
          
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
            nameEntry.set_width_chars(35);
            nameFrameRow.add(nameFrameLabel);
            nameFrameRow.add(nameEntry);
            nameEntry.grab_focus();
            mainFrame.add(nameFrameRow);
            //second row  - Icon of Custom link
            let iconFrameRow = new PW.FrameBoxRow();
            let iconFrameLabel = new Gtk.Label({
                label: _("Icon:"),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let iconEntry = new Gtk.Entry();
            iconEntry.set_width_chars(35);
            // create file filter and file chooser button
            let fileFilter = new Gtk.FileFilter();
            fileFilter.add_pixbuf_formats();
            let fileChooserButton = new Gtk.FileChooserButton({
                action: Gtk.FileChooserAction.OPEN,
                title: _('Please select an image icon'),
                filter: fileFilter,
                width_chars: 10
            });
            fileChooserButton.connect('file-set', function (fileChooserButton) {
                let iconFilepath = fileChooserButton.get_filename();
                iconEntry.set_text(iconFilepath);
            }.bind(this));
            fileChooserButton.set_current_folder(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES));


            iconFrameRow.add(iconFrameLabel);
            iconFrameRow.add(fileChooserButton);
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
            cmdEntry.set_width_chars(35);
            cmdFrameRow.add(cmdFrameLabel);
            cmdFrameRow.add(cmdEntry);
            mainFrame.add(cmdFrameRow);
            //last row - Label and button to add custom link to list

            let addButton = new Gtk.Button({
                label: this.isAppEdit ?_("Save") :_("Add")
            });

            if(this.appArray!=null)
            {
                nameEntry.text=this.appArray[0];
                iconEntry.text=this.appArray[1];
                cmdEntry.text=this.appArray[2];
                let iconFilepath = iconEntry.get_text();
                if (iconFilepath) {
                    fileChooserButton.set_filename(iconFilepath);
                }
            }
            addButton.connect('clicked', ()=>
            {
               this.newPinnedAppsArray.push(nameEntry.get_text());
               this.newPinnedAppsArray.push(iconEntry.get_text());
               this.newPinnedAppsArray.push(cmdEntry.get_text());
               this.addResponse = true;
               this.response(-10);
            });
            addButton.set_halign(Gtk.Align.END);

            // add the frames to the vbox
            vbox.add(mainFrame);
            vbox.add(addButton);
           
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
 * General Settings Page
 */
var GeneralSettingsPage = GObject.registerClass(
    class GeneralSettingsPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('General'));
            this._settings = settings;

          /*
           * Menu Position Box
           */
          let menuPositionFrame = new PW.FrameBox();
          let menuPositionRow = new PW.FrameBoxRow();
          let menuPositionBoxLabel = new Gtk.Label({
              label: _("Menu Button Position in Panel"),
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
              this._settings.set_enum('position-in-panel', Constants.MENU_POSITION.Left);
          });
          menuPositionCenterButton.connect('clicked', () => {
              this._settings.set_enum('position-in-panel', Constants.MENU_POSITION.Center);
          });
          menuPositionRightButton.connect('clicked', () => {
              this._settings.set_enum('position-in-panel', Constants.MENU_POSITION.Right);
          });

          switch (this._settings.get_enum('position-in-panel')) {
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

          /*
           * Multi-monitor
           */
          let multiMonitorFrame = new PW.FrameBox();
          let multiMonitorRow = new PW.FrameBoxRow();
          let multiMonitorLabel = new Gtk.Label({
              label: _("Display on all monitors when using Dash to Panel"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });

          let multiMonitorSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
          multiMonitorSwitch.set_active(this._settings.get_boolean('multi-monitor'));
          multiMonitorSwitch.connect('notify::active', function (check) {
              this._settings.set_boolean('multi-monitor', check.get_active());
          }.bind(this));

          multiMonitorRow.add(multiMonitorLabel);
          multiMonitorRow.add(multiMonitorSwitch);
          multiMonitorFrame.add(multiMonitorRow);
          /*
           * Tool-tips
           */
          let tooltipFrame = new PW.FrameBox();
          let tooltipRow = new PW.FrameBoxRow();
          let tooltipLabel = new Gtk.Label({
              label: _("Disable Tooltips"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });

          let tooltipSwitch = new Gtk.Switch({ halign: Gtk.Align.END });
          tooltipSwitch.set_active(this._settings.get_boolean('disable-tooltips'));
          tooltipSwitch.connect('notify::active', function (check) {
              this._settings.set_boolean('disable-tooltips', check.get_active());
          }.bind(this));

          tooltipRow.add(tooltipLabel);
          tooltipRow.add(tooltipSwitch);
          tooltipFrame.add(tooltipRow);

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
            disableHotCornerSwitch.set_active(this._settings.get_boolean('disable-activities-hotcorner'));
            disableHotCornerSwitch.connect('notify::active', function (check) {
                this._settings.set_boolean('disable-activities-hotcorner', check.get_active());
            }.bind(this));
            disableHotCornerRow.add(disableHotCornerLabel);
            disableHotCornerRow.add(disableHotCornerSwitch);
            disableHotCornerFrame.add(disableHotCornerRow);
            /*
             * Pinned Apps / Categories Default View Toggle
             */
            let defaultLeftBoxFrame = new PW.FrameBox();
            let defaultLeftBoxRow = new PW.FrameBoxRow();
            let defaultLeftBoxLabel = new Gtk.Label({
                label: _("Choose Arc Menus Default View"),
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
            defaultLeftBoxCombo.connect('changed', function (widget) {
            	if(widget.get_active()==0)
                	this._settings.set_boolean('enable-pinned-apps',true);
        	if(widget.get_active()==1)
                	this._settings.set_boolean('enable-pinned-apps',false);
            }.bind(this));
           
            defaultLeftBoxRow.add(defaultLeftBoxLabel);
            defaultLeftBoxRow.add(defaultLeftBoxCombo);
            defaultLeftBoxFrame.add(defaultLeftBoxRow);
            /*
           * Hotkey On Key Release
           */
          let keyReleaseFrame = new PW.FrameBox();
          let keyReleaseRow = new PW.FrameBoxRow();
          let keyReleaseLabel = new Gtk.Label({
              label: _("Hotkey activation"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let keyReleaseCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
          keyReleaseCombo.append_text(_("Key Release"));
          keyReleaseCombo.append_text(_("Key Press"));
          if(this._settings.get_boolean('disable-hotkey-onkeyrelease'))
            keyReleaseCombo.set_active(1);
          else 
            keyReleaseCombo.set_active(0);
          keyReleaseCombo.connect('changed', function (widget) {
                if(widget.get_active()==0)
                    this._settings.set_boolean('disable-hotkey-onkeyrelease',false);
                if(widget.get_active()==1)
                    this._settings.set_boolean('disable-hotkey-onkeyrelease',true);
          }.bind(this));
   
          keyReleaseRow.add(keyReleaseLabel);
          keyReleaseRow.add(keyReleaseCombo);
          keyReleaseFrame.add(keyReleaseRow);
            /*
             * Menu Hotkey and Keybinding Frame Box
             */

            this.menuKeybindingFrame = new PW.FrameBox();

            // first row: hot key
            let menuHotkeyLabelRow = new PW.FrameBoxRow();
            let menuHotkeyLabel = new Gtk.Label({
                label: _("Set Menu Hotkey"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            menuHotkeyLabelRow.add(menuHotkeyLabel);
            

            let menuHotkeyButtonRow = new PW.FrameBoxRow();
            let leftButton = new Gtk.RadioButton({
                label: _("Left Super Key"),
                xalign:.5,
                draw_indicator: false
            });   
       
            let rightButton = new Gtk.RadioButton({
                label: _("Right Super Key"),
                group: leftButton,
                draw_indicator: false
            });   
            let customButton = new Gtk.RadioButton({
                label: _("Custom"),
                group: leftButton,
                draw_indicator: false
            });   
            this.undefinedButton = new Gtk.RadioButton({
                label: _("None"),
                group: leftButton,
                draw_indicator: false
            });  
            switch (this._settings.get_enum('menu-hotkey')) {
                case 0:
                    this.undefinedButton.set_active(true);
                    break;
                case 1:
                    leftButton.set_active(true);
                    break;
                case 2:
                    rightButton.set_active(true);
                    break;
                case 3:
                    customButton.set_active(true);
                    break;
            }
            this.undefinedButton.connect('clicked', ()=>{
                if(this.undefinedButton.get_active()){
                    this._settings.set_enum('menu-hotkey', 0);
                    if(this.menuKeybindingFrame.count==3)
                        this.menuKeybindingFrame.remove(this.menuKeybindingRow);
                }
            });
            leftButton.connect('clicked', ()=>{
                if(leftButton.get_active()){
                    this._settings.set_enum('menu-hotkey', 1);
                    if(this.menuKeybindingFrame.count==3)
                        this.menuKeybindingFrame.remove(this.menuKeybindingRow);
                }
            });
            rightButton.connect('clicked', ()=>{
                if(rightButton.get_active()){
                    this._settings.set_enum('menu-hotkey', 2);
                    if(this.menuKeybindingFrame.count==3)
                        this.menuKeybindingFrame.remove(this.menuKeybindingRow);
                }
            });
            customButton.connect('clicked', ()=>{
                if(customButton.get_active()){
                    let dialog = new CustomShortcutDialogWindow(this._settings, this);
                    dialog.show_all();
                    dialog.connect('response', ()=>
                    {   
                        if(dialog.addResponse)
                        {
                            this._settings.set_string('menu-keybinding-text', dialog.resultsText);
                            this._settings.set_enum('menu-hotkey', 3);
                            if(this.menuKeybindingFrame.count==3)
                                this.menuKeybindingFrame.remove(this.menuKeybindingRow);
                            this.createHotKeyRow();
                            this.menuKeybindingFrame.show();
                            dialog.destroy();
                        }
                        else{
                            //global.log('close');
                            this._settings.set_enum('menu-hotkey', 3);
                            if(this.menuKeybindingFrame.count==3)
                                this.menuKeybindingFrame.remove(this.menuKeybindingRow);
                            this.createHotKeyRow();
                            this.menuKeybindingFrame.show();
                            dialog.destroy();
                        }
                            
                    
                    }); 
                }
            });

            menuHotkeyButtonRow.add(this.undefinedButton);
            menuHotkeyButtonRow.add(leftButton);
            menuHotkeyButtonRow.add(rightButton);
            menuHotkeyButtonRow.add(customButton);

            this.menuKeybindingFrame.add(menuHotkeyLabelRow);
            this.menuKeybindingFrame.add(menuHotkeyButtonRow);
            if(this._settings.get_enum('menu-hotkey')==3)
                this.createHotKeyRow();
            
            
            // add the frames
            this.add(defaultLeftBoxFrame);
            this.add(menuPositionFrame);
            this.add(multiMonitorFrame);
            this.add(tooltipFrame);
            this.add(disableHotCornerFrame);
            this.add(keyReleaseFrame);
            this.add(this.menuKeybindingFrame);
            //-----------------------------------------------------------------
        }
        
        createHotKeyRow(){
            this.menuKeybindingRow = new PW.FrameBoxRow();    
            let fillerLabel = new Gtk.Label({
                label: _("Current Hotkey"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });

            let shortcutCell = new Gtk.ShortcutsShortcut();
            shortcutCell.accelerator = this._settings.get_string('menu-keybinding-text');

            shortcutCell.set_halign(Gtk.Align.END);
         
             

            this.menuKeybindingRow.add(fillerLabel);
            this.menuKeybindingRow.add(shortcutCell);
            this.menuKeybindingFrame.add(this.menuKeybindingRow);
            
        }
});

//DialogWindow for Custom Shortcut
var CustomShortcutDialogWindow = GObject.registerClass(
    class CustomShortcutDialogWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            super._init(_('Set Custom Shortcut'), parent);
        }

        _createLayout(vbox) {
            let frame = new PW.FrameBox();

            //Label 
            let labelRow = new PW.FrameBoxRow();  
            let label = new Gtk.Label({
            label: _("Press a key"),
            use_markup: true,
            xalign: .5,
            hexpand: true
            });
            labelRow.add(label);

            //Hotkey
            let hotkeyKey='';

            //Keyboard Image
            let keyboardPath = Me.path + Constants.KEYBOARD_LOGO.Path;
            let [imageWidth, imageHeight] = Constants.KEYBOARD_LOGO.Size;
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(keyboardPath, imageWidth, imageHeight);
            let keyboardImage = new Gtk.Image({ pixbuf: pixbuf });
            let keyboardImageBox = new Gtk.VBox({
                margin_top: 5,
                margin_bottom: 5,
                expand: false
            });
            keyboardImageBox.add(keyboardImage);

           //Modifiers
            let modRow= new PW.FrameBoxRow(); 
            let modLabel = new Gtk.Label({
                label: _("Modifiers"),
                xalign: 0,
                hexpand: true
            });
            let ctrlButton = new Gtk.CheckButton({
                label: _("Ctrl"),
                xalign:.5,
                draw_indicator: false
            });   
            let superButton = new Gtk.CheckButton({
                label: _("Super"),
                draw_indicator: false
            });   
            let shiftButton = new Gtk.CheckButton({
                label: _("Shift"),
                draw_indicator: false
            });   
            let altButton = new Gtk.CheckButton({
                label: _("Alt"),
                draw_indicator: false
            });  
            ctrlButton.connect('clicked', ()=>{
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsLabel.accelerator =  this.resultsText; 
                applyButton.set_sensitive(true);      
            });
            superButton.connect('clicked', ()=>{
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsLabel.accelerator =  this.resultsText;   
                applyButton.set_sensitive(true);    
            });
            shiftButton.connect('clicked', ()=>{
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsLabel.accelerator =  this.resultsText; 
                applyButton.set_sensitive(true);      
            });
            altButton.connect('clicked', ()=>{
                this.resultsText=""; 
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += hotkeyKey;   
                resultsLabel.accelerator =  this.resultsText;  
                applyButton.set_sensitive(true);     
            });
            modRow.add(modLabel);
            modRow.add(ctrlButton);
            modRow.add(superButton);
            modRow.add(shiftButton);
            modRow.add(altButton);

            //Hotkey Results
            let resultsRow= new PW.FrameBoxRow(); 
            let resultsLabel = new Gtk.ShortcutsShortcut({
                hexpand: true});
            resultsLabel.set_halign(Gtk.Align.CENTER);
            resultsRow.add(resultsLabel);
           
            //Add to frame
            frame.add(modRow);
            frame.add(labelRow);
            frame.add(keyboardImageBox);
            frame.add(resultsRow);

            //ApplyB utton
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                xalign:1
            });
            applyButton.connect('clicked', ()=> {
                this.addResponse = true;
                this.response(-10);
            });
            applyButton.set_halign(Gtk.Align.END);
            applyButton.set_sensitive(false);

            //connect to key presses
            this.connect('key-release-event', function(widget,event)  {
                this.resultsText="";
                let key = event.get_keyval()[1];
                hotkeyKey = Gtk.accelerator_name(key,0);    
                if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";     
                if(superButton.get_active()) this.resultsText += "<Super>";   
                if(shiftButton.get_active()) this.resultsText += "<Shift>";   
                if(altButton.get_active()) this.resultsText += "<Alt>";  
                this.resultsText += Gtk.accelerator_name(key,0);   
                resultsLabel.accelerator =  this.resultsText;   
                applyButton.set_sensitive(true);  
            }.bind(this));

            //add to vbox
            vbox.add(frame);
            vbox.add(applyButton);    
        }
});
//DialogWindow for Menu Button Customization
var MenuButtonCustomizationWindow = GObject.registerClass(
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
//Appearance Page
var  AppearanceSettingsPage = GObject.registerClass(
    class AppearanceSettingsPage extends PW.NotebookPage {

      _init(settings) {
          super._init(_('Appearance'));
          this._settings = settings;
             this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.checkIfPresetMatch();

          /*
           * Menu Button Appearance Frame Box
           */
          let menuButtonAppearanceFrame = new PW.FrameBox();
          let menuButtonAppearanceRow = new PW.FrameBoxRow();
          let menuButtonAppearanceLabel = new Gtk.Label({
              label: _("Customize Menu Button Appearance"),
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
          menuButtonAppearanceCombo.set_active(this._settings.get_enum('menu-button-appearance'));
          menuButtonAppearanceCombo.connect('changed', function (widget) {
              this._settings.set_enum('menu-button-appearance', widget.get_active());
          }.bind(this));

          // Extra settings for the appearance of the menu button
          menuButtonAppearanceSettingsButton.connect('clicked',
              () => {
                  let dialog = new MenuButtonCustomizationWindow(this._settings, this);
                  dialog.show_all();
              });

          menuButtonAppearanceRow.add(menuButtonAppearanceLabel);
          menuButtonAppearanceRow.add(menuButtonAppearanceSettingsButton);
          menuButtonAppearanceRow.add(menuButtonAppearanceCombo);
          menuButtonAppearanceFrame.add(menuButtonAppearanceRow);
          this.add(menuButtonAppearanceFrame);
          
          //CUSTOMIZE ARC MENU FRAME
          let customArcMenuFrame = new PW.FrameBox();
          let customArcMenuRow = new PW.FrameBoxRow();
          let customArcMenuLabel = new Gtk.Label({
              label: _("Customize Arc Menu Appearance"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let customizeArcMenuButton = new PW.IconButton({
              circular: true,
              icon_name: 'emblem-system-symbolic'
          });
          customizeArcMenuButton.connect('clicked', ()=>{
              let dialog = new ArcMenuCustomizationWindow(this._settings, this);
              dialog.show_all();
              dialog.connect('response', ()=>
              { 
                  if(dialog.get_response())
                  {
                      this._settings.set_int('menu-height', dialog.heightValue);
                      this._settings.set_string('separator-color',dialog.separatorColor);
                      this._settings.set_boolean('vert-separator',dialog.verticalSeparator);
                      this._settings.set_boolean('enable-custom-arc-menu', dialog.customArcMenu); 
                      this._settings.set_string('menu-color',dialog.menuColor);
                      this._settings.set_string('menu-foreground-color',dialog.menuForegroundColor);
                      this._settings.set_string('border-color',dialog.borderColor);
                      this._settings.set_string('highlight-color',dialog.highlightColor );
                      this._settings.set_int('menu-font-size',dialog.fontSize);
                      this._settings.set_int('menu-border-size',dialog.borderSize);
                      this._settings.set_int('menu-corner-radius',dialog.cornerRadius);
                      this._settings.set_int('menu-margin',dialog.menuMargin);
                      this._settings.set_int('menu-arrow-size',dialog.menuArrowSize);
                      this._settings.set_int('menu-width', dialog.menuWidth);
                      this._settings.set_int('menu-rightpanel-width',dialog.menuRightWidth);
                      this._settings.set_boolean('enable-large-icons',dialog.largeIcons);
                      saveCSS(this._settings);
                      this._settings.set_boolean('reload-theme',true);
                      dialog.destroy();
                  }
                  else
                      dialog.destroy();
              }); 
          });
          
          customArcMenuRow.add(customArcMenuLabel);
          customArcMenuRow.add(customizeArcMenuButton);
          customArcMenuFrame.add(customArcMenuRow);
          this.add(customArcMenuFrame);
          
           //Override Arc Menu Theme
          let overrideArcMenuFrame = new PW.FrameBox();
          let overrideArcMenuRow = new PW.FrameBoxRow();
          let overrideArcMenuLabel = new Gtk.Label({
              label: _("Override Arc Menu Theme"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let overrideArcMenuButton = new PW.IconButton({
              circular: true,
              icon_name: 'emblem-system-symbolic'
          });
          overrideArcMenuButton.set_sensitive(this._settings.get_boolean('enable-custom-arc-menu'));
          overrideArcMenuButton.connect('clicked', ()=>{
              let dialog = new OverrideArcMenuThemeWindow(this._settings, this);
              dialog.show_all();
              dialog.connect('response', function(response)
              { 
                
                if(dialog.get_response())
                {
                    this._settings.set_int('menu-height', dialog.heightValue);
                    this._settings.set_string('separator-color',dialog.separatorColor);
                    this._settings.set_boolean('vert-separator',dialog.verticalSeparator);
                    this._settings.set_boolean('enable-custom-arc-menu', dialog.customArcMenu); 
                    this._settings.set_string('menu-color',dialog.menuColor);
                    this._settings.set_string('menu-foreground-color',dialog.menuForegroundColor);
                    this._settings.set_string('border-color',dialog.borderColor);
                    this._settings.set_string('highlight-color',dialog.highlightColor );
                    this._settings.set_int('menu-font-size',dialog.fontSize);
                    this._settings.set_int('menu-border-size',dialog.borderSize);
                    this._settings.set_int('menu-corner-radius',dialog.cornerRadius);
                    this._settings.set_int('menu-margin',dialog.menuMargin);
                    this._settings.set_int('menu-arrow-size',dialog.menuArrowSize);
                    this._settings.set_int('menu-width', dialog.menuWidth);
                    this._settings.set_int('menu-rightpanel-width',dialog.menuRightWidth);
                    saveCSS(this._settings);
                    this._settings.set_boolean('reload-theme',true);
                    this.presetName = dialog.presetName;
                    currentPresetTextLabel.label = dialog.presetName;
                    dialog.destroy();
                }
                else{
                    this.checkIfPresetMatch();
                    currentPresetTextLabel.label = this.presetName;
                    dialog.destroy();
                }
                      
              }.bind(this)); 
          });
          let overrideArcMenuSwitch = new Gtk.Switch({ halign: Gtk.Align.END});
          overrideArcMenuSwitch.set_active(this._settings.get_boolean('enable-custom-arc-menu'));
          overrideArcMenuSwitch.connect('notify::active', function (check) {
        	this._settings.set_boolean('enable-custom-arc-menu',check.get_active());
            overrideArcMenuButton.set_sensitive(check.get_active());
            saveCSS(this._settings);
            this._settings.set_boolean('reload-theme',true);
            if(check.get_active() && overrideArcMenuFrame.count==1){
                overrideArcMenuFrame.add(presetTextRow);
                overrideArcMenuFrame.show();
            }
            if(!check.get_active() && overrideArcMenuFrame.count==2){
                overrideArcMenuFrame.remove(presetTextRow);
            }
        //--
          }.bind(this));
          let presetTextRow = new PW.FrameBoxRow();
          let presetTextLabel = new Gtk.Label({
              label: _("Current Color Theme"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let currentPresetTextLabel = new Gtk.Label({
            label: this.presetName,
            use_markup: true,
            xalign: 1,
            hexpand: false
        });
        presetTextRow.add(presetTextLabel);
        presetTextRow.add(currentPresetTextLabel);
        overrideArcMenuRow.add(overrideArcMenuLabel);
        overrideArcMenuRow.add(overrideArcMenuButton);
        overrideArcMenuRow.add(overrideArcMenuSwitch);
        overrideArcMenuFrame.add(overrideArcMenuRow);
        if(overrideArcMenuSwitch.get_active())
            overrideArcMenuFrame.add(presetTextRow);
        this.add(overrideArcMenuFrame);

          let avatarStyleFrame = new PW.FrameBox();
          let avatarStyleRow = new PW.FrameBoxRow();
          let avatarStyleLabel = new Gtk.Label({
              label: _('Choose Avatar Icon Shape'),
              xalign:0,
              hexpand: true,
           });   
           let avatarStyleCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
           avatarStyleCombo.append_text(_("Circular"));
           avatarStyleCombo.append_text(_("Square"));
           avatarStyleCombo.set_active(this._settings.get_enum('avatar-style'));
           avatarStyleCombo.connect('changed', function (widget) {
               this._settings.set_enum('avatar-style', widget.get_active());
               saveCSS(this._settings);
               this._settings.set_boolean('reload-theme',true);
           }.bind(this));
          avatarStyleRow.add(avatarStyleLabel);
          avatarStyleRow.add(avatarStyleCombo);
          avatarStyleFrame.add(avatarStyleRow);
          this.add(avatarStyleFrame);

           /*
             * Menu Layout
             */
            let layoutFrame = new PW.FrameBox();
            let layoutRow = new PW.FrameBoxRow();
            let layoutLabel = new Gtk.Label({
                label: _("Choose Menu Layout"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let layoutButton = new PW.IconButton({
                circular: true,
                icon_name: 'emblem-system-symbolic'
            });
            layoutButton.connect('clicked', ()=>{
                let dialog = new ArcMenuLayoutWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', function(response)
                { 
                    if(dialog.get_response())
                    {
                        this._settings.set_enum('menu-layout', dialog.index);
                        currentStyleLabel.label = Constants.MENU_STYLE_CHOOSER.Styles[dialog.index].name;
                        saveCSS(this._settings);
                        this._settings.set_boolean('reload-theme',true);
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }.bind(this)); 
            });
            layoutRow.add(layoutLabel);
            layoutRow.add(layoutButton);
            layoutFrame.add(layoutRow);
    
            let currentLayoutRow = new PW.FrameBoxRow();
            let currentLayoutLabel = new Gtk.Label({
                label: _("Current Layout"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 
            let currentStyleLabel = new Gtk.Label({
                label: "",
                use_markup: true,
                xalign: 0,
                hexpand: false
            }); 
            let index = this._settings.get_enum('menu-layout');
            currentStyleLabel.label = Constants.MENU_STYLE_CHOOSER.Styles[index].name;
            currentLayoutRow.add(currentLayoutLabel);
            currentLayoutRow.add(currentStyleLabel);
            layoutFrame.add(currentLayoutRow);

            let messageRow = new PW.FrameBoxRow();
            let messageLabel = new Gtk.Label({
                label: _("Each layout is different in behaviour and style.")+"\n"
                    +_("All layouts can be modified by customization settings.")+"\n"
                    +_("However, some settings are specifc to Arc Menu layout."),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 
            messageLabel.set_sensitive(false);
            messageRow.add(messageLabel);
            layoutFrame.add(messageRow);
            this.add(layoutFrame);
            
        


    }
    checkIfPresetMatch(){
        this.presetName="Custom Theme";
        let currentSettingsArray = [this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.separatorColor, 
                    this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                    this.menuMargin.toString(), this.verticalSeparator.toString()];
        let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
        for(let i = 0;i < all_color_themes.length;i++){
            //all_color_themes[i].shift(); //remove first element -- we don't need this to compare values.
            this.isEqual=true;
            for(let l = 0; l<currentSettingsArray.length;l++){
                if(currentSettingsArray[l] !=  all_color_themes[i][l+1]){
                    this.isEqual=false;
                    break; //If not equal then break out of inner loop
                }
            }
            if(this.isEqual){
                this.presetName = all_color_themes[i][0];
               
                break; //If equal we found match, break out of loops
            }      
        }
    }
});

//Dialog Window for Arc Menu Customization    
var ArcMenuLayoutWindow = GObject.registerClass(
    class ArcMenuLayoutWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.index = this._settings.get_enum('menu-layout');
            
            this._params = {
                title: _("Menu style chooser"),
                height: Constants.MENU_STYLE_CHOOSER.WindowHeight,
                width: Constants.MENU_STYLE_CHOOSER.WindowWidth,
                maxColumns: Constants.MENU_STYLE_CHOOSER.MaxColumns,
                thumbnailHeight: Constants.MENU_STYLE_CHOOSER.ThumbnailHeight,
                thumbnailWidth: Constants.MENU_STYLE_CHOOSER.ThumbnailWidth,
                styles: Constants.MENU_STYLE_CHOOSER.Styles
            };
            this._tileGrid = new PW.TileGrid(this._params.maxColumns);
            super._init(_('Arc Menu Layout'), parent);
            this.resize(660,480);
          


        }

        _createLayout(vbox) {         
            this._scrolled = new Gtk.ScrolledWindow();
            this._scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

            this._params.styles.forEach(function(style){
                this._addTile(style.name, Me.path + style.thumbnail);
            }.bind(this));
    
            this._scrolled.add(this._tileGrid);

            vbox.add(this._scrolled);
            // Button Row -------------------------------------------------------
           let buttonRow = new PW.FrameBoxRow();


           this._tileGrid.connect('selected-children-changed', ()=>{
                applyButton.set_sensitive(true);
            });
           let fillerLabel = new Gtk.Label({
               label: '',
               xalign:0,
               hexpand: true,
           });   
           buttonRow.add(fillerLabel);

           let applyButton = new Gtk.Button({
               label: _("Apply"),
               xalign:1
           });
           applyButton.connect('clicked', ()=> {
                let temp = this._tileGrid.get_selected_children();
                let array= this._tileGrid.get_children();
                for(let i = 0; i < array.length; i++){
                   if(array[i]==temp[0]){
                        this.index=i;
                   }
                        
                }
                this.addResponse = true;
                this.response(-10);
           });
           applyButton.set_halign(Gtk.Align.END);
         
           buttonRow.add(applyButton);

           vbox.add(buttonRow);
           this._tileGrid.set_selection_mode(Gtk.SelectionMode.SINGLE);
           this.show();
           let temp = this._tileGrid.get_child_at_index(this.index);
           this._tileGrid.select_child(temp);
           applyButton.set_sensitive(false);
            
        }
        _addTile(name, thumbnail) {
            let tile = new PW.Tile(name, thumbnail, this._params.thumbnailWidth, this._params.thumbnailHeight);
            this._tileGrid.add(tile);
            tile.connect('button-press-event', ()=> {
                //TODO
            });
        }
   

    
        get_response(){
            return this.addResponse;
        }

  
});


//Dialog Window for Arc Menu Customization    
var ArcMenuCustomizationWindow = GObject.registerClass(
    class ArcMenuCustomizationWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.heightValue = this._settings.get_int('menu-height');
            this.menuWidth = this._settings.get_int('menu-width');
            this.menuRightWidth = this._settings.get_int('menu-rightpanel-width');
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.largeIcons = this._settings.get_boolean('enable-large-icons');
            super._init(_('Customize Arc Menu Appearance'), parent);
	        this.resize(450,250);
        }

        _createLayout(vbox) {
            let mainFrame = new PW.FrameBox();
            //let screenHeight = Gdk.Display.get_default().get_primary_monitor().get_geometry().height;
            //let scaleFactor = Gdk.Display.get_default().get_primary_monitor().get_scale_factor();
            let display = Gdk.Display.get_default();
            let primaryMonitor =display.get_monitor(0);
            let screenHeight = primaryMonitor.get_geometry().height;
            let scaleFactor = primaryMonitor.get_scale_factor();
            screenHeight = screenHeight * scaleFactor;
            //global.log(scaleFactor);
            //global.log(screenHeight);
            //first row  - Name of Custom link
            let heightRow = new PW.FrameBoxRow();
            let heightLabel = new Gtk.Label({
                label: _('Menu Height'),
                use_markup: true,
                xalign: 0,
                hexpand: false,
                selectable: false
            });
            let hscale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 300,
                    upper: (screenHeight * 8) / 10,
                    step_increment: 10,
                    page_increment: 10,
                    page_size: 0
                }),
                digits: 0,
                round_digits: 0,
                hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            hscale.connect('format-value', function (scale, value) { return value.toString() + ' px'; });
            hscale.set_value(this.heightValue);
            hscale.connect('value-changed', () => {
                this.heightValue = hscale.get_value();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            heightRow.add(heightLabel);
            heightRow.add(hscale);
            mainFrame.add(heightRow);
            //ROW 3 - MENU WIDTH--------------------------------------------------   
            let menuWidthRow = new PW.FrameBoxRow();
            let menuWidthLabel = new Gtk.Label({
                label: _('Left-Panel Width'),
                xalign:0,
                hexpand: false,
             });   
            let menuWidthScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 200,upper: 500, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            menuWidthScale.connect('format-value', function (scale, value) { return value.toString() + 'px'; });
            menuWidthScale.set_value(this.menuWidth);
            menuWidthScale.connect('value-changed', () => {
                this.menuWidth = menuWidthScale.get_value();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            menuWidthRow.add(menuWidthLabel);
            menuWidthRow.add(menuWidthScale);
            mainFrame.add(menuWidthRow);
            

            let largeIconsRow = new PW.FrameBoxRow();
            let largeIconsLabel = new Gtk.Label({
                label: _('Large Application Icons'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let largeIconsSwitch = new Gtk.Switch({ halign: Gtk.Align.END});
            largeIconsSwitch.set_active( this.largeIcons);
            largeIconsSwitch.connect('notify::active', function (check) {
                 this.largeIcons = check.get_active();
                 applyButton.set_sensitive(true);
                 resetButton.set_sensitive(true);
            }.bind(this));
            largeIconsRow.add(largeIconsLabel);            
            largeIconsRow.add(largeIconsSwitch);             
            mainFrame.add(largeIconsRow);

            let vertSeparatorRow = new PW.FrameBoxRow();
            let vertSeparatorLabel = new Gtk.Label({
                label: _('Enable Vertical Separator'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let vertSeparatorSwitch = new Gtk.Switch({ halign: Gtk.Align.END});
            vertSeparatorSwitch.set_active(this.verticalSeparator);
            vertSeparatorSwitch.connect('notify::active', function (check) {
                 this.verticalSeparator = check.get_active();
                 applyButton.set_sensitive(true);
                 resetButton.set_sensitive(true);
            }.bind(this));
            vertSeparatorRow.add(vertSeparatorLabel);            
            vertSeparatorRow.add(vertSeparatorSwitch);             
            mainFrame.add(vertSeparatorRow);
            
            let separatorColorRow = new PW.FrameBoxRow();
            let separatorColorLabel = new Gtk.Label({
                label: _('Separator Color'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let colorChooser = new Gtk.ColorButton({use_alpha:true});     
            let color = new Gdk.RGBA();
            color.parse(this.separatorColor);
            colorChooser.set_rgba(color);    
            colorChooser.connect('color-set', ()=>{
                this.separatorColor = colorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                resetButton.set_sensitive(true);
            });
            separatorColorRow.add(separatorColorLabel);            
            separatorColorRow.add(colorChooser);             
            mainFrame.add(separatorColorRow);
            
           // Button Row -------------------------------------------------------
           let buttonRow = new PW.FrameBoxRow();
           let resetButton = new Gtk.Button({
               label: _("Reset"),
               xalign:0
           });   
           resetButton.set_sensitive( this.checkIfResetButtonSensitive());
           resetButton.connect('clicked', ()=> {
               
                this.heightValue = 550;
                this.menuWidth = 290;
                this.menuRightWidth = 200;
                this.separatorColor = "rgb(63,62,64)";
                this.verticalSeparator = false;
                this.largeIcons = false;
                hscale.set_value(this.heightValue);
                menuWidthScale.set_value(this.menuWidth);
                menuRightWidthScale.set_value(this.menuRightWidth);
                vertSeparatorSwitch.set_active(this.verticalSeparator);
                largeIconsSwitch.set_active(this.largeIcons);
                color.parse(this.separatorColor);
                colorChooser.set_rgba(color);    

                resetButton.set_sensitive(false);
                applyButton.set_sensitive(true);               
           });

           buttonRow.add(resetButton);
          
           let fillerLabel = new Gtk.Label({
               label: '',
               xalign:0,
               hexpand: true,
           });   
           buttonRow.add(fillerLabel);

           let applyButton = new Gtk.Button({
               label: _("Apply"),
               xalign:1
           });
           applyButton.connect('clicked', ()=> {
              this.addResponse = true;
              this.response(-10);
           });
           applyButton.set_halign(Gtk.Align.END);
           applyButton.set_sensitive(false);
           buttonRow.add(applyButton);

           vbox.add(mainFrame);
           vbox.add(buttonRow);
        }
        get_response(){
            return this.addResponse;
        }
        checkIfResetButtonSensitive(){
            return (this.heightValue != 550 ||
                this.menuWidth != 290 ||
                this.menuRightWidth != 200 ||
                this.separatorColor != "rgb(63,62,64)"||
                this.verticalSeparator != false||
                this.largeIcons != false) ? true : false
            
        }
   
});
//Dialog Window for Arc Menu Customization    
var ColorThemeDialogWindow = GObject.registerClass(
    class ColorThemeDialogWindow extends PW.DialogWindow {

        _init(settings, parent, isSave, themeName="") {
            this._settings = settings;
            this.addResponse = false;
            this.isSave = isSave;
            this.themeName = themeName;
            super._init( isSave? _('Color Theme Name') : _('Delete Theme "') + themeName +'?' , parent);
            //this.resize(450,250);
        }

        _createLayout(vbox) {        
            let nameFrameRow = new PW.FrameBoxRow();
            let nameFrameLabel = new Gtk.Label({
                label: _('Name:'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            nameFrameRow.add(nameFrameLabel);
            if(this.isSave){
                this.nameEntry = new Gtk.Entry();
                this.nameEntry.set_width_chars(35);
                
                nameFrameRow.add(this.nameEntry);
                this.nameEntry.grab_focus();
                if(this.themeName!=""){
                    this.nameEntry.set_text(this.themeName);
                }
                this.nameEntry.connect('changed',()=>{
                    if(this.nameEntry.get_text().length > 0)
                        saveButton.set_sensitive(true);
                    else
                        saveButton.set_sensitive(false);
                });
            }
            else{
                nameFrameLabel.label = _('Are you sure you want to delete theme ')+ '"' + this.themeName +'"?';
            }
            
            vbox.add(nameFrameRow);
            let buttonRow = new PW.FrameBoxRow();
            let saveButton = new Gtk.Button({
                label: this.isSave ? _("Save Theme") : _("Delete Theme"),
                xalign:0
            });   
            saveButton.set_sensitive(this.isSave ? false : true);
            saveButton.connect('clicked', ()=> {
                if(this.isSave)
                    this.themeName = this.nameEntry.get_text();
                this.addResponse=true;
                this.response(-10);
            });
            let fillerLabel = new Gtk.Label({
                label: '',
                xalign:0,
                hexpand: true,
            });   
            buttonRow.add(fillerLabel);
            buttonRow.add(saveButton);
            vbox.add(buttonRow);
        }
        get_response(){
            return this.addResponse;
        }
});

//Dialog Window for Arc Menu Customization    
var ExportColorThemeDialogWindow = GObject.registerClass(
    class ExportColorThemeDialogWindow extends PW.DialogWindow {

        _init(settings, parent, themes=null) {
            this._settings = settings;
            this._themes = themes;
            this.addResponse = false;
            this.selectedThemes = [];
            super._init(this._themes ? _('Select Themes to Import'): _('Select Themes to Export'), parent);
            //this.resize(450,250);
        }

        _createLayout(vbox) {    
            //create a scrolledwindow for list of all apps
            let themesListScrollWindow = new Gtk.ScrolledWindow();
            themesListScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themesListScrollWindow.set_max_content_height(300);
            themesListScrollWindow.set_min_content_height(300);
            themesListScrollWindow.set_min_content_width(500);
            themesListScrollWindow.set_min_content_width(500);
            this.mainFrame = new PW.FrameBox();

            //first row


            //last row - Label and button to add apps to list
            let themesListButton = new Gtk.Button({
                label: this._themes ?_("Import"): _("Export"),
                xalign:1
            });

            themesListButton.connect('clicked', ()=>
            {
                this.addResponse = true;
                this.response(-10);
            });
	        themesListButton.set_halign(Gtk.Align.END);

            // add the frames to the vbox
           
            themesListScrollWindow.add_with_viewport(this.mainFrame);
            vbox.add(themesListScrollWindow);
            vbox.add(themesListButton);

            this.color_themes = this._themes ? this._themes : this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i< this.color_themes.length; i++){
                let theme = this.color_themes[i];
                let frameRow = new PW.FrameBoxRow();
                let frameLabel = new Gtk.Label(
                {
                    use_markup: false,
                    xalign: 0,
                    hexpand: true
                });
    
                frameLabel.label = theme[0];
    
                frameRow.add(frameLabel);
    
                let checkButton = new Gtk.CheckButton(
                {
                    margin_right: 20
                });
                checkButton.connect('toggled', ()=>
                {
                    if(checkButton.get_active()){
                        this.selectedThemes.push(theme);
                    }
                    else{
                      let index= this.selectedThemes.indexOf(theme);
                      this.selectedThemes.splice(index,1);
                    }
                });
                frameRow.add(checkButton);
                this.mainFrame.add(frameRow);
                checkButton.set_active(true);
            }    
          
        }
        get_response(){
            return this.addResponse;
        }
});
//Dialog Window for Arc Menu Customization    
var ManageColorThemeDialogWindow = GObject.registerClass(
    class ManageColorThemeDialogWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.selectedThemes = [];
            super._init( _('Manage Themes'), parent);
            //this.resize(450,250);
        }

        _createLayout(vbox) {    
            //create a scrolledwindow for list of all apps
            let themesListScrollWindow = new Gtk.ScrolledWindow();
            themesListScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            themesListScrollWindow.set_max_content_height(300);
            themesListScrollWindow.set_min_content_height(300);
            themesListScrollWindow.set_min_content_width(500);
            themesListScrollWindow.set_min_content_width(500);
            this.mainFrame = new PW.FrameBox();

            //first row


            //last row - Label and button to add apps to list
            let applyButton = new Gtk.Button({
                label: _("Apply"),
                xalign:1
            });
            applyButton.set_sensitive(false);
            applyButton.connect('clicked', ()=>
            {
                this.addResponse = true;
                this.response(-10);
            });
	        applyButton.set_halign(Gtk.Align.END);

            // add the frames to the vbox
           
            themesListScrollWindow.add_with_viewport(this.mainFrame);
            vbox.add(themesListScrollWindow);
            vbox.add(applyButton);

            this.color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0; i< this.color_themes.length; i++){
                let theme = this.color_themes[i];
                let frameRow = new PW.FrameBoxRow();
                let frameLabel = new Gtk.Label(
                {
                    use_markup: false,
                    xalign: 0,
                    hexpand: true
                });
    
                frameLabel.label = theme[0];
    
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
                let deleteButton = new PW.IconButton({
                  circular: false,
                  icon_name: 'edit-delete-symbolic'
                });
                editButton.connect('clicked', ()=>
                {
                    let dialog = new ColorThemeDialogWindow(this._settings, this, true,theme[0]);
                    dialog.show_all();
                    dialog.connect('response', function(response){ 
                        if(dialog.get_response()){
                            let index = frameRow.get_index();
                            let array = [dialog.themeName, theme[1], theme[2], theme[3], theme[4], theme[5], 
                            theme[6], theme[7], theme[8], theme[9], theme[10], theme[11]];
                            this.color_themes.splice(index,1,array);
                            //this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                            frameLabel.label = dialog.themeName;
                            dialog.destroy();
                        }
                        else
                            dialog.destroy();
                    }.bind(this)); 
                    applyButton.set_sensitive(true);
                });
                upButton.connect('clicked', ()=>
                {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index!=0)
                    {
                      this.mainFrame.remove(frameRow);
                      this.mainFrame.insert(frameRow,index-1);
                      this.color_themes.splice(index,1);
                      this.color_themes.splice(index-1,0,theme);
                    }
                    this.mainFrame.show();
                    applyButton.set_sensitive(true);
                });

                downButton.connect('clicked', ()=>
                {
                    //find index of frameRow in frame
                    //remove and reinsert at new position
                    let index = frameRow.get_index();
                    if(index+1<this.mainFrame.count)
                    {
                      this.mainFrame.remove(frameRow);
                      this.mainFrame.insert(frameRow,index+1);
                      this.color_themes.splice(index,1);
                      this.color_themes.splice(index+1,0,theme);
                    }
                    this.mainFrame.show();
                    applyButton.set_sensitive(true);
                });

                deleteButton.connect('clicked', ()=>
                {
                    //remove frameRow
                    let index = frameRow.get_index();
                    this.mainFrame.remove(frameRow);
                    this.color_themes.splice(index,1);
                    this.mainFrame.show();
                    applyButton.set_sensitive(true);
                });
                //add everything to frame
                buttonBox.add(editButton);
                buttonBox.add(upButton);
                buttonBox.add(downButton);
                buttonBox.add(deleteButton);
                frameRow.add(buttonBox);
                this.mainFrame.add(frameRow);
              
            }    
          
        }
        get_response(){
            return this.addResponse;
        }
});
//Dialog Window for Arc Menu Customization    
var OverrideArcMenuThemeWindow = GObject.registerClass(
    class OverrideArcMenuThemeWindow extends PW.DialogWindow {

        _init(settings, parent) {
            this._settings = settings;
            this.addResponse = false;
            this.heightValue = this._settings.get_int('menu-height');
            this.separatorColor = this._settings.get_string('separator-color');
            this.verticalSeparator = this._settings.get_boolean('vert-separator');
            this.customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
            
            this.menuColor = this._settings.get_string('menu-color');
            this.menuForegroundColor = this._settings.get_string('menu-foreground-color');
            this.borderColor = this._settings.get_string('border-color');
            this.highlightColor = this._settings.get_string('highlight-color');
            this.fontSize = this._settings.get_int('menu-font-size');
            this.borderSize = this._settings.get_int('menu-border-size');
            this.cornerRadius = this._settings.get_int('menu-corner-radius');
            this.menuMargin = this._settings.get_int('menu-margin');
            this.menuArrowSize = this._settings.get_int('menu-arrow-size');
            this.menuWidth = this._settings.get_int('menu-width');
            this.menuRightWidth = this._settings.get_int('menu-rightpanel-width');
            this.updatePresetComboBox = true;
            super._init(_('Override Arc Menu Theme'), parent);
            this.resize(450,250);
            this.shouldDeselect = true; 
        }

        _createLayout(vbox) {         
            //OVERRIDE ARC MENUS THEME-----------------------------
            //OVERRIDE OPTIONS--------------------------------
            let customArcMenuOptionsFrame = new PW.FrameBox();
 
            this.colorPresetFrame = new PW.FrameBox();
            let colorPresetRow = new PW.FrameBoxRow();
            let colorPresetLabel = new Gtk.Label({
                label: _('Color Theme Presets'),
                xalign:0,
                hexpand: true,
             });   
             this.colorPresetCombo = new Gtk.ComboBoxText({ halign: Gtk.Align.END });
             this.color_themes = this._settings.get_value('color-themes').deep_unpack();
             for(let i= 0; i<this.color_themes.length; i++){
                this.colorPresetCombo.append_text(_(this.color_themes[i][0]));
             }
             this.saveButton = new Gtk.Button({
                label: _("Save as Preset"),
                xalign:0
            });   
             this.checkIfPresetMatch();
             //this.colorPresetCombo.set_active(this._settings.get_int('color-theme-index'));
             this.colorPresetCombo.connect('changed', function (widget) {
                 if(this.updatePresetComboBox){
                    let index = widget.get_active();
                    //this._settings.set_int('color-theme-index',index);
                    /*let defaultArray = ["Theme Name","Background Color", "Foreground Color","Border Color", "Highlight Color", "Separator Color"
                                            , "Font Size", "Border Size", "Corner Radius", "Arrow Size", "Menu Displacement", "Vertical Separator"];*/
                    
                    if(index>=0){
                        this.menuColor = this.color_themes[index][1];
                        this.menuForegroundColor = this.color_themes[index][2];
                        this.borderColor = this.color_themes[index][3];
                        this.highlightColor = this.color_themes[index][4];
                        this.separatorColor = this.color_themes[index][5];
                        this.fontSize = parseInt(this.color_themes[index][6]);
                        this.borderSize = parseInt(this.color_themes[index][7]);
                        this.cornerRadius = parseInt(this.color_themes[index][8]);
                        this.menuArrowSize = parseInt(this.color_themes[index][9]);
                        this.menuMargin = parseInt(this.color_themes[index][10]);
                        this.verticalSeparator = (this.color_themes[index][11] === 'true');
                        
                        this.shouldDeselect = false;
                        this.presetName=this.color_themes[index][0];
                        color.parse(this.menuColor);
                        menuBackgroudColorChooser.set_rgba(color);
        
                        color.parse(this.menuForegroundColor);
                        menuForegroundColorChooser.set_rgba(color); 
        
                        fontScale.set_value(this.fontSize); 
        
                        color.parse(this.borderColor);
                        borderColorChooser.set_rgba(color); 
        
                        borderScale.set_value(this.borderSize);
        
                        color.parse(this.highlightColor);
                        itemColorChooser.set_rgba(color);
        
                        cornerScale.set_value(this.cornerRadius);
                        marginScale.set_value(this.menuMargin);
                        arrowScale.set_value(this.menuArrowSize);

                        vertSeparatorSwitch.set_active(this.verticalSeparator);
                        color.parse(this.separatorColor);
                        colorChooser.set_rgba(color);  
                        this.saveButton.set_sensitive(false);
                        applyButton.set_sensitive(true);  
                        this.shouldDeselect = true;           
                    }         
                 }
                   
             }.bind(this));
             colorPresetRow.add(colorPresetLabel);
             colorPresetRow.add(this.colorPresetCombo);
             this.colorPresetFrame.add(colorPresetRow);

             let presetsButtonRow = new PW.FrameBoxRow();
             
             
             this.saveButton.connect('clicked', ()=> {
                 /*let defaultArray = ["Theme Name","Background Color", "Foreground Color","Border Color", "Highlight Color", "Separator Color"
                                 , "Font Size", "Border Size", "Corner Radius", "Arrow Size", "Menu Displacement", "Vertical Separator"];*/
              
                 let dialog = new ColorThemeDialogWindow(this._settings, this, true);
                 dialog.show_all();
                 dialog.connect('response', function(response){ 
                     if(dialog.get_response()){
                         let array = [dialog.themeName, this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.separatorColor, 
                                         this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                                         this.menuMargin.toString(), this.verticalSeparator.toString()];
                         this.color_themes.push(array);
                         this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                         this.colorPresetCombo.append_text(_(array[0]));
                         this.checkIfPresetMatch();
                         dialog.destroy();
                     }
                     else
                         dialog.destroy();
                 }.bind(this)); 
             });
 
             
             let fillerLabel = new Gtk.Label({
                label: '',
                xalign:0,
                hexpand: true,
            });   
         
             
             let manageButton = new Gtk.Button({
                label: _("Manage Presets"),
                xalign:0
            });   
            manageButton.connect('clicked', ()=> {            
                let dialog = new ManageColorThemeDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', function(response){ 
                    if(dialog.get_response()){
                        this.color_themes = dialog.color_themes;
                        this._settings.set_value('color-themes',new GLib.Variant('aas',dialog.color_themes));
                        this.colorPresetCombo.remove_all();
                        
                        for(let i= 0; i<this.color_themes.length; i++){
                            this.colorPresetCombo.append_text(_(this.color_themes[i][0]));
                         }
                         this.checkIfPresetMatch();
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }.bind(this)); 
            });
            presetsButtonRow.add(manageButton);
            presetsButtonRow.add(fillerLabel);
            presetsButtonRow.add(this.saveButton);
            this.colorPresetFrame.add(presetsButtonRow);
            vbox.add(this.colorPresetFrame);

            //ROW 1 - MENU BACKGROUND COLOR--------------------------------------   
            let menuBackgroudColorRow = new PW.FrameBoxRow();
            let menuBackgroudColorLabel = new Gtk.Label({
                label: _('Menu Background Color'),
                xalign:0,
                hexpand: true,
             });   
            let menuBackgroudColorChooser = new Gtk.ColorButton({use_alpha:true});   
            let color = new Gdk.RGBA();
            color.parse(this.menuColor);
            menuBackgroudColorChooser.set_rgba(color);            
            menuBackgroudColorChooser.connect('color-set', ()=>{
                this.menuColor = menuBackgroudColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
               
            
                resetButton.set_sensitive(true);
            });
            menuBackgroudColorRow.add(menuBackgroudColorLabel);
            menuBackgroudColorRow.add(menuBackgroudColorChooser);
            customArcMenuOptionsFrame.add(menuBackgroudColorRow);
            //ROW 2 - MENU FOREGROUND COLOR--------------------------------------   
            let menuForegroundColorRow = new PW.FrameBoxRow();
            let menuForegroundColorLabel = new Gtk.Label({
                label: _('Menu Foreground Color'),
                xalign:0,
                hexpand: true,
             });   
            let menuForegroundColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color.parse(this.menuForegroundColor);
            menuForegroundColorChooser.set_rgba(color);            
            menuForegroundColorChooser.connect('color-set', ()=>{
                this.menuForegroundColor = menuForegroundColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                resetButton.set_sensitive(true);
            });
            menuForegroundColorRow.add(menuForegroundColorLabel);
            menuForegroundColorRow.add(menuForegroundColorChooser);
            customArcMenuOptionsFrame.add(menuForegroundColorRow);
            //ROW 2 - FONT SIZE--------------------------------------------------   
            let fontSizeRow = new PW.FrameBoxRow();
            let fontSizeLabel = new Gtk.Label({
                label: _('Font Size'),
                xalign:0,
                hexpand: true,
             });   
            let fontScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 8,upper: 14, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            fontScale.connect('format-value', function (scale, value) { return value.toString() + 'pt'; });
            fontScale.set_value(this.fontSize);
            fontScale.connect('value-changed', () => {
                this.fontSize = fontScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                resetButton.set_sensitive(true);
            });
            fontSizeRow.add(fontSizeLabel);
            fontSizeRow.add(fontScale);
            customArcMenuOptionsFrame.add(fontSizeRow);
            //ROW 3- Border Color-------------------------------------------------
            let borderColorRow = new PW.FrameBoxRow();
            let borderColorLabel = new Gtk.Label({
                label: _('Border Color'),
                xalign:0,
                hexpand: true,
             });   
            let borderColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.borderColor);
            borderColorChooser.set_rgba(color);            
            borderColorChooser.connect('color-set', ()=>{
                this.borderColor = borderColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                resetButton.set_sensitive(true);
            });
            borderColorRow.add(borderColorLabel);
            borderColorRow.add(borderColorChooser);
            customArcMenuOptionsFrame.add(borderColorRow);
            //ROW 4 - Border Size-------------------------------------------------------
            let borderSizeRow = new PW.FrameBoxRow();
            let borderSizeLabel = new Gtk.Label({
                label: _('Border Size'),
                xalign:0,
                hexpand: true,
             });   
            let borderScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 4, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            borderScale.connect('format-value', function (scale, value) { return value.toString() + 'px'; });
            borderScale.set_value(this.borderSize);
            borderScale.connect('value-changed', () => {
                this.borderSize = borderScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                
                resetButton.set_sensitive(true);
            }); 
            borderSizeRow.add(borderSizeLabel);
            borderSizeRow.add(borderScale);
            customArcMenuOptionsFrame.add(borderSizeRow);
            //ROW 5- ITEM highlight Color-----------------------------------------------
            let itemColorRow = new PW.FrameBoxRow();
            let itemColorLabel = new Gtk.Label({
                label: _('Highlighted Item Color'),
                xalign:0,
                hexpand: true,
             });   
            let itemColorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.highlightColor);
            itemColorChooser.set_rgba(color);            
            itemColorChooser.connect('color-set', ()=>{
                this.highlightColor = itemColorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                
                resetButton.set_sensitive(true);
            });
            itemColorRow.add(itemColorLabel);
            itemColorRow.add(itemColorChooser);
            customArcMenuOptionsFrame.add(itemColorRow);
            //ROW 6 - CORNER RADIUS-----------------------------------------------------
            let cornerRadiusRow = new PW.FrameBoxRow();
            let cornerRadiusLabel = new Gtk.Label({
                label: _('Corner Radius'),
                xalign:0,
                hexpand: true,
             }); 
            let cornerScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            cornerScale.connect('format-value', function (scale, value) { return value.toString() + 'px'; });
            cornerScale.set_value(this.cornerRadius);
            cornerScale.connect('value-changed', () => {
                this.cornerRadius = cornerScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                
                resetButton.set_sensitive(true);
            });   
            cornerRadiusRow.add(cornerRadiusLabel);
            cornerRadiusRow.add(cornerScale);
            customArcMenuOptionsFrame.add(cornerRadiusRow);
            //ROW 7 - MENU MARGINS-------------------------------------------------------
            let menuMarginRow = new PW.FrameBoxRow();
            let menuMarginLabel = new Gtk.Label({
                label: _('Menu Arrow Size'),
                xalign:0,
                hexpand: true,
             });   
            let marginScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            marginScale.connect('format-value', function (scale, value) { return value.toString() + 'px'; });
            marginScale.set_value(this.menuMargin);
            marginScale.connect('value-changed', () => {
                this.menuMargin = marginScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                
                resetButton.set_sensitive(true);
            });   
            menuMarginRow.add(menuMarginLabel);
            menuMarginRow.add(marginScale);
            customArcMenuOptionsFrame.add(menuMarginRow);
            //ROW 8 - MENU ARROW SIZE------------------------------------------------------
            let menuArrowRow = new PW.FrameBoxRow();
            let menuArrowLabel = new Gtk.Label({
                label: _('Menu Displacement'),
                xalign:0,
                hexpand: true,
             });   
            let arrowScale = new Gtk.HScale({
                adjustment: new Gtk.Adjustment({
                    lower: 0,upper: 20, step_increment: 1, page_increment: 1, page_size: 0
                }),
                digits: 0,round_digits: 0,hexpand: true,
                value_pos: Gtk.PositionType.RIGHT
            });
            arrowScale.connect('format-value', function (scale, value) { return value.toString() + 'px'; });
            arrowScale.set_value(this.menuArrowSize);
            arrowScale.connect('value-changed', () => {
                this.menuArrowSize = arrowScale.get_value();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                
                resetButton.set_sensitive(true);
            });   
            menuArrowRow.add(menuArrowLabel);
            menuArrowRow.add(arrowScale);
            customArcMenuOptionsFrame.add(menuArrowRow);
            let vertSeparatorRow = new PW.FrameBoxRow();
            let vertSeparatorLabel = new Gtk.Label({
                label: _('Enable Vertical Separator'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
             });   
            let vertSeparatorSwitch = new Gtk.Switch({ halign: Gtk.Align.END});
            vertSeparatorSwitch.set_active(this.verticalSeparator);
            vertSeparatorSwitch.connect('notify::active', function (check) {
                 this.verticalSeparator = check.get_active();
                 if(this.shouldDeselect){
                    this.checkIfPresetMatch();
                    
                }
                 applyButton.set_sensitive(true);
                 
                 resetButton.set_sensitive(true);
            }.bind(this));
            vertSeparatorRow.add(vertSeparatorLabel);            
            vertSeparatorRow.add(vertSeparatorSwitch);             
            customArcMenuOptionsFrame.add(vertSeparatorRow);
            
            let separatorColorRow = new PW.FrameBoxRow();
            let separatorColorLabel = new Gtk.Label({
                label: _('Separator Color'),
                use_markup: true,
                xalign: 0,
                hexpand: true,
                selectable: false
            });
            let colorChooser = new Gtk.ColorButton({use_alpha:true});     
            color = new Gdk.RGBA();
            color.parse(this.separatorColor);
            colorChooser.set_rgba(color);    
            colorChooser.connect('color-set', ()=>{
                this.separatorColor = colorChooser.get_rgba().to_string();
                applyButton.set_sensitive(true);
                if(this.shouldDeselect){
                    
                    this.checkIfPresetMatch();
                }
                
                resetButton.set_sensitive(true);
            });
            separatorColorRow.add(separatorColorLabel);            
            separatorColorRow.add(colorChooser);             
            customArcMenuOptionsFrame.add(separatorColorRow);
            // Button Row -------------------------------------------------------
            let buttonRow = new PW.FrameBoxRow();
            let resetButton = new Gtk.Button({
                label: _("Reset"),
                xalign:0
            });   
            resetButton.set_sensitive( this.checkIfResetButtonSensitive());
            resetButton.connect('clicked', ()=> {
                 this.separatorColor = "rgb(63,62,64)";
                 this.verticalSeparator = false;
                 this.menuColor = "rgba(28, 28, 28, 0.98)";
                 this.menuForegroundColor = "rgba(211, 218, 227, 1)";
                 this.borderColor = "rgb(63,62,64)";
                 this.highlightColor = "rgba(238, 238, 236, 0.1)";
                 this.fontSize = 9;
                 this.borderSize = 0;
                 this.cornerRadius = 0;
                 this.menuMargin = 0;
                 this.menuArrowSize = 0;
                 color.parse(this.menuColor);
                 menuBackgroudColorChooser.set_rgba(color);
 
                 color.parse(this.menuForegroundColor);
                 menuForegroundColorChooser.set_rgba(color); 
 
                 fontScale.set_value(this.fontSize); 
 
                 color.parse(this.borderColor);
                 borderColorChooser.set_rgba(color); 
 
                 borderScale.set_value(this.borderSize);
 
                 color.parse("rgba(238, 238, 236, 0.1)");
                 itemColorChooser.set_rgba(color);
 
                 cornerScale.set_value(this.cornerRadius);
                 marginScale.set_value(this.menuMargin);
                 arrowScale.set_value(this.menuArrowSize);

                 vertSeparatorSwitch.set_active(this.verticalSeparator);
                 color.parse(this.separatorColor);
                 colorChooser.set_rgba(color);    
 
                 resetButton.set_sensitive(false);
                 applyButton.set_sensitive(true);               
            });
 
            buttonRow.add(resetButton);
 
            fillerLabel = new Gtk.Label({
                label: '',
                xalign:0,
                hexpand: true,
            });   
            buttonRow.add(fillerLabel);

            let applyButton = new Gtk.Button({
                label: _("Apply"),
                xalign:1
            });
            applyButton.connect('clicked', ()=> {
               this.addResponse = true;
               this.response(-10);
            });
            applyButton.set_halign(Gtk.Align.END);
            applyButton.set_sensitive(false);
            buttonRow.add(applyButton);

            vbox.add(customArcMenuOptionsFrame);
            vbox.add(buttonRow);
            
        }
        get_response(){
            return this.addResponse;
        }
        checkIfPresetMatch(){
            this.presetName="Custom Theme";
            let currentSettingsArray = [this.menuColor, this.menuForegroundColor, this.borderColor, this.highlightColor, this.separatorColor, 
                        this.fontSize.toString(), this.borderSize.toString(), this.cornerRadius.toString(), this.menuArrowSize.toString(), 
                        this.menuMargin.toString(), this.verticalSeparator.toString()];
            let all_color_themes = this._settings.get_value('color-themes').deep_unpack();
            for(let i = 0;i < all_color_themes.length;i++){
                //all_color_themes[i].shift(); //remove first element -- we don't need this to compare values.
                this.isEqual=true;
                for(let l = 0; l<currentSettingsArray.length;l++){
                    if(currentSettingsArray[l] !=  all_color_themes[i][l+1]){
                        this.isEqual=false;
                        break; //If not equal then break out of inner loop
                    }
                }
                if(this.isEqual){
                    this.presetName = all_color_themes[i][0];
                    this.updatePresetComboBox = false;
                    this.colorPresetCombo.set_active(i);
                    this.saveButton.set_sensitive(false);
                    this.updatePresetComboBox = true;
                    break; //If equal we found match, break out of loops
                }      
            }
            if(!this.isEqual){
                this.saveButton.set_sensitive(true);
                this.colorPresetCombo.set_active(-1);
            }
                
            
        }
        checkIfResetButtonSensitive(){
            return (this.menuColor != "rgba(28, 28, 28, 0.98)"||
            this.menuForegroundColor != "rgba(211, 218, 227, 1)"||
            this.borderColor != "rgb(63,62,64)"||
            this.highlightColor != "rgba(238, 238, 236, 0.1)"||
            this.fontSize != 9||
            this.borderSize != 0||
            this.cornerRadius != 0||
            this.menuMargin != 0||
            this.menuArrowSize != 0 ||
            this.verticalSeparator != false ||
            this.separatorColor != "rgb(63,62,64)"
            ) ? true : false
        }
});

var ConfigureSettingsPage = GObject.registerClass(
    class ConfigureSettingsPage extends PW.NotebookPage {
    _init(settings) {
        super._init(_('Configure'));
        this._settings = settings;
           
          //WHICH SHORTCUTS ON RIGHT SIDE
          let shortcutsFrame = new PW.FrameBox();
          let shortcutsRow = new PW.FrameBoxRow();
          let shortcutsLabel = new Gtk.Label({
              label: _("Enable/Disable shortcuts"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let shortcutsScrollWindow = new Gtk.ScrolledWindow();
          shortcutsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
          shortcutsScrollWindow.set_max_content_height(115);
          shortcutsScrollWindow.set_min_content_height(115);
          shortcutsScrollWindow.add(shortcutsFrame);
          var SHORTCUT_TRANSLATIONS = [_("Home"), _("Documents"),_("Downloads"), _("Music"),_("Pictures"),_("Videos"),_("Computer"), 
          _("Network")];
          for(let i = 0;i<8;i++){
          	let shortcut; 
              if(i<6)
                 shortcut = Constants.RIGHT_SIDE_SHORTCUTS[i]; 
              else if(i==6)  
              	 shortcut = 'Computer';  
      	      else if(i==7)  
              	 shortcut = 'Network';            
              let shortcutsRow = new PW.FrameBoxRow();
              let shortcutsLabel = new Gtk.Label({
                  label: SHORTCUT_TRANSLATIONS[i],
                  use_markup: true,
                  xalign: 0,
                  hexpand: true
              });
              
              let checkButton = new Gtk.Switch(
              {
                  margin_right: 20,
              });
              let setting = 'show-'+shortcut+'-shortcut';
              let settingName = GLib.utf8_strdown(setting,setting.length);
              if(this._settings.get_boolean(settingName))
                  checkButton.set_active(true);
              else
                  checkButton.set_active(false);
              checkButton.connect('notify::active', function (check)
              {
                  this._settings.set_boolean(settingName, check.get_active());
              }.bind(this));
              shortcutsRow.add(shortcutsLabel);
              shortcutsRow.add(checkButton);
              shortcutsFrame.add(shortcutsRow);

          };
          this.add(shortcutsLabel);
          this.add(shortcutsScrollWindow);
          //---------------------------------------------------------------------------------------
          
          //EXTERNAL DEVICES/BOOKMARKS--------------------------------------------------------------
          let placesFrame = new PW.FrameBox();
          let externalDeviceRow = new PW.FrameBoxRow();
          let externalDeviceLabel = new Gtk.Label({
              label: _("External Devices"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
     	  
     	  let externalDeviceButton = new Gtk.Switch({margin_right: 20});
          if(this._settings.get_boolean('show-external-devices'))
              externalDeviceButton.set_active(true);
          externalDeviceButton.connect('notify::active', function (check)
          {
              this._settings.set_boolean('show-external-devices', check.get_active());
          }.bind(this));   
          externalDeviceRow.add(externalDeviceLabel);
          externalDeviceRow.add(externalDeviceButton);

          //ADD TO FRAME
          placesFrame.add(externalDeviceRow);
          this.add(placesFrame);
          
           //BOOKMARKS LIST       
          let bookmarksRow = new PW.FrameBoxRow();
          let bookmarksLabel = new Gtk.Label({
              label: _("Bookmarks"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
     	  
     	  let bookmarksButton = new Gtk.Switch({margin_right: 20});
          if(this._settings.get_boolean('show-bookmarks'))
              bookmarksButton.set_active(true);
          bookmarksButton.connect('notify::active', function (check)
          {
              this._settings.set_boolean('show-bookmarks', check.get_active());
          }.bind(this));   
          bookmarksRow.add(bookmarksLabel);
         bookmarksRow.add(bookmarksButton);

          //ADD TO FRAME
          placesFrame.add(bookmarksRow);
          //---------------------------------------------------------------------------------
          
          //Software Shortcuts------------------------------------------------------------------------
          let softwareShortcutsFrame = new PW.FrameBox();
          let softwareShortcutsRow = new PW.FrameBoxRow();
          let softwareShortcutsScrollWindow = new Gtk.ScrolledWindow();
          softwareShortcutsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
          softwareShortcutsScrollWindow.set_max_content_height(115);
          softwareShortcutsScrollWindow.set_min_content_height(115);
          softwareShortcutsScrollWindow.add(softwareShortcutsFrame);
          let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview")];
          for(let i = 0; i<Constants.SOFTWARE_SHORTCUTS.length;i++){
              let shortcut = Constants.SOFTWARE_SHORTCUTS[i];
              let softwareShortcutsRow = new PW.FrameBoxRow();
              let softwareShortcutsLabel = new Gtk.Label({
                  label: SOFTWARE_TRANSLATIONS[i],
                  use_markup: true,
                  xalign: 0,
                  hexpand: true
              });
              
              let softwareCheckButton = new Gtk.Switch(
              {
                  margin_right: 20,
              });
              let softwareSetting = 'show-'+shortcut+'-shortcut';
              let softwareSettingName = GLib.utf8_strdown(softwareSetting,softwareSetting.length);
              if(this._settings.get_boolean(softwareSettingName))
                  softwareCheckButton.set_active(true);
              else
                  softwareCheckButton.set_active(false);
              softwareCheckButton.connect('notify::active', function (check)
              {
                  this._settings.set_boolean(softwareSettingName, check.get_active());
              }.bind(this));
              softwareShortcutsRow.add(softwareShortcutsLabel);
              softwareShortcutsRow.add(softwareCheckButton);
              softwareShortcutsFrame.add(softwareShortcutsRow);
          }
          this.add(softwareShortcutsScrollWindow);
          
          //-----------------------------------------------------------------------------------------
          
          //Session Buttons Enable/Disable----------------------------------------------------          
          //SUSPEND BUTTON

          let sessionButtonsFrame = new PW.FrameBox();
          let sessionButtonsScrollWindow = new Gtk.ScrolledWindow();
          sessionButtonsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
          sessionButtonsScrollWindow.set_max_content_height(115);
          sessionButtonsScrollWindow.set_min_content_height(115);
          sessionButtonsScrollWindow.add(sessionButtonsFrame);
          let suspendRow = new PW.FrameBoxRow();
          let suspendLabel = new Gtk.Label({
              label: _("Suspend"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let suspendButton = new Gtk.Switch({margin_right: 20});
          if(this._settings.get_boolean('show-suspend-button'))
              suspendButton.set_active(true);
          suspendButton.connect('notify::active', function (check)
          {
              this._settings.set_boolean('show-suspend-button', check.get_active());
          }.bind(this));
          suspendRow.add(suspendLabel);
          suspendRow.add(suspendButton);
          
          //LOCK BUTTON
          let lockRow = new PW.FrameBoxRow();
          let lockLabel = new Gtk.Label({
              label: _("Lock"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let lockButton = new Gtk.Switch({margin_right: 20});
          if(this._settings.get_boolean('show-lock-button'))
              lockButton.set_active(true);
          lockButton.connect('notify::active', function (check)
          {
              this._settings.set_boolean('show-lock-button', check.get_active());
          }.bind(this));
          lockRow.add(lockLabel);
          lockRow.add(lockButton);
          
          //LOG OUT BUTTON
          let logOffRow = new PW.FrameBoxRow();
          let logOffLabel = new Gtk.Label({
              label: _("Log Out"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let logOffButton = new Gtk.Switch({margin_right: 20});
          if(this._settings.get_boolean('show-logout-button'))
              logOffButton.set_active(true);
          logOffButton.connect('notify::active', function (check)
          {
              this._settings.set_boolean('show-logout-button', check.get_active());
          }.bind(this));   
          logOffRow.add(logOffLabel);
          logOffRow.add(logOffButton);

          //POWER BUTTON
          let powerRow = new PW.FrameBoxRow();
          let powerLabel = new Gtk.Label({
              label: _("Power Off"),
              use_markup: true,
              xalign: 0,
              hexpand: true
          });
          let powerButton = new Gtk.Switch({margin_right: 20});
          if(this._settings.get_boolean('show-power-button'))
            powerButton.set_active(true);
          powerButton.connect('notify::active', function (check)
          {
              this._settings.set_boolean('show-power-button', check.get_active());
          }.bind(this));   
          powerRow.add(powerLabel);
          powerRow.add(powerButton);

          //ADD TO FRAME
          sessionButtonsFrame.add(suspendRow);
          sessionButtonsFrame.add(logOffRow);
          sessionButtonsFrame.add(lockRow);
          sessionButtonsFrame.add(powerRow);
          this.add(sessionButtonsScrollWindow);
	  //------------------------------------------------------------------------------------------
          

        
    }
});
/*
 * Misc Page
 */
var MiscPage = GObject.registerClass(
    class MiscPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('Misc'));
            this._settings = settings;

            let importFrame = new PW.FrameBox();
            let importRow = new PW.FrameBoxRow();
            let importLabel = new Gtk.Label({
                label: _("Export and Import Arc Menu Settings"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let importTextRow = new PW.FrameBoxRow();
            let importTextLabel = new Gtk.Label({
                label: _("All current Arc Menu settings will be changed when importing from file.") +"\n"
                    + _("This includes all saved pinned apps."),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 
            importTextLabel.set_sensitive(false);
            importTextRow.add(importTextLabel);
            let importButtonsRow = new PW.FrameBoxRow();
            let importButton = new Gtk.Button({
                label: _("Import from File"),
                xalign:.5,
                expand:true
            });
            importButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Import settings'),
                    { action: Gtk.FileChooserAction.OPEN },
                    Gtk.STOCK_OPEN,
                    filename => {
                        let settingsFile = Gio.File.new_for_path(filename);
                        let [ , pid, stdin, stdout, stderr] = 
                            GLib.spawn_async_with_pipes(
                                null,
                                ['dconf', 'load', SCHEMA_PATH],
                                null,
                                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                                null
                            );
            
                        stdin = new Gio.UnixOutputStream({ fd: stdin, close_fd: true });
                        GLib.close(stdout);
                        GLib.close(stderr);
                                            
                        let [ , , , retCode] = GLib.spawn_command_line_sync(GSET + ' -d ' + Me.uuid);
                                            
                        if (retCode == 0) {
                            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => GLib.spawn_command_line_sync(GSET + ' -e ' + Me.uuid));
                        }
    
                        stdin.splice(settingsFile.read(null), Gio.OutputStreamSpliceFlags.CLOSE_SOURCE | Gio.OutputStreamSpliceFlags.CLOSE_TARGET, null);
                    }
                );
            });
            let exportButton = new Gtk.Button({
                label: _("Export to File"),
                xalign:.5,
                expand:true
            });
            exportButton.connect('clicked', ()=> {
                
                this._showFileChooser(
                    _('Export settings'),
                    { action: Gtk.FileChooserAction.SAVE,
                      do_overwrite_confirmation: true },
                    Gtk.STOCK_SAVE,
                    filename => {
                        let file = Gio.file_new_for_path(filename);
                        let raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                        let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
    
                        out.write_all(GLib.spawn_command_line_sync('dconf dump ' + SCHEMA_PATH)[1], null);
                        out.close(null);
                    }
                );

            
            });
       
            
            importRow.add(importLabel);
            importButtonsRow.add(exportButton);
            importButtonsRow.add(importButton);
            importFrame.add(importRow);     
            importFrame.add(importTextRow);
            importFrame.add(importButtonsRow);




            let importColorPresetFrame = new PW.FrameBox();
            let importColorPresetRow = new PW.FrameBoxRow();
            let importColorPresetLabel = new Gtk.Label({
                label: _("Color Theme Presets - Export/Import"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            });
            let imgPath = Me.path + Constants.COLOR_PRESET.Path;
            let [imageWidth, imageHeight] = Constants.COLOR_PRESET.Size;
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(imgPath, imageWidth, imageHeight);
            let colorPresetImage = new Gtk.Image({ pixbuf: pixbuf });
            let colorPresetBox = new Gtk.VBox({
                margin_top: 5,
                margin_bottom: 0,
                expand: false
            });
            colorPresetBox.add(colorPresetImage);
            

            let importColorPresetTextRow = new PW.FrameBoxRow();
            let importColorPresetTextLabel = new Gtk.Label({
                label: _("Imported theme presets are located on the Appearance Tab")+
                 "\n"+ _("in Override Arc Menu Theme"),
                use_markup: true,
                xalign: 0,
                hexpand: true
            }); 
            importColorPresetTextLabel.set_sensitive(false);
            importColorPresetTextRow.add(importColorPresetTextLabel);
           

            let importColorPresetButtonsRow = new PW.FrameBoxRow();
            let importColorPresetButton = new Gtk.Button({
                label: _("Import Theme Preset"),
                xalign:.5,
                expand:true
            });
            importColorPresetButton.connect('clicked', ()=> {
                this._showFileChooser(
                    _('Import theme preset'),
                    { action: Gtk.FileChooserAction.OPEN },
                    Gtk.STOCK_OPEN,
                    filename => {
                        let settingsFile = Gio.File.new_for_path(filename);
                        let [ success, content, etags] = 
                        settingsFile.load_contents(null);
                        //global.log(content);
                        let string = content.toString();
                        let themes = string.split("\n")
                        //global.log(string[0]);
                        themes.pop(); //remove last blank array 
                        this.color_themes = [];
                        for(let i = 0; i < themes.length; i++){
                            let array = themes[i].split('//')
                            array.pop();
                            this.color_themes.push(array);
                        }
                        let dialog = new ExportColorThemeDialogWindow(this._settings, this, this.color_themes);
                        dialog.show_all();
                        dialog.connect('response', function(response){ 
                            if(dialog.get_response()){
                                let selectedThemes = dialog.selectedThemes;
                                this.color_themes = this._settings.get_value('color-themes').deep_unpack();
                                for(let i = 0; i < selectedThemes.length; i++){
                                    this.color_themes.push(selectedThemes[i]);
                                }
                                
                                this._settings.set_value('color-themes',new GLib.Variant('aas',this.color_themes));
                        
                                dialog.destroy();
                            }
                            else
                                dialog.destroy();
                        }.bind(this)); 
                        
                    }
                );
            });
            let exportColorPresetButton = new Gtk.Button({
                label: _("Export Theme Preset"),
                xalign:.5,
                expand:true
            });
            exportColorPresetButton.connect('clicked', ()=> {
                let dialog = new ExportColorThemeDialogWindow(this._settings, this);
                dialog.show_all();
                dialog.connect('response', function(response){ 
                    if(dialog.get_response()){
                       this.selectedThemes = dialog.selectedThemes;
                       this._showFileChooser(
                            _('Export theme preset'),
                                { action: Gtk.FileChooserAction.SAVE,
                                    do_overwrite_confirmation: true },
                                    Gtk.STOCK_SAVE,
                                    filename => {
                                        let file = Gio.file_new_for_path(filename);
                                        let raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                                        let out = Gio.BufferedOutputStream.new_sized(raw, 4096);
                                        for(let i = 0; i<this.selectedThemes.length; i++){
                                            for(let x = 0; x<this.selectedThemes[i].length;x++){
                                                out.write_all((this.selectedThemes[i][x]).toString()+"//", null);
                                            }
                                            out.write_all("\n", null);
                                        }
                                        
                                        out.close(null);
                                    }
                        );
                        dialog.destroy();
                    }
                    else
                        dialog.destroy();
                }.bind(this)); 


            
            });
       
            
            importColorPresetRow.add(importColorPresetLabel);
            importColorPresetRow.add(colorPresetBox);
            importColorPresetButtonsRow.add(exportColorPresetButton);
            importColorPresetButtonsRow.add(importColorPresetButton);
            importColorPresetFrame.add(importColorPresetRow);   
            importColorPresetFrame.add(importColorPresetTextRow);
            importColorPresetFrame.add(importColorPresetButtonsRow);





            this.add(importFrame);
            this.add(importColorPresetFrame);
        
        }
        _showFileChooser(title, params, acceptBtn, acceptHandler) {
            let dialog = new Gtk.FileChooserDialog(mergeObjects({ title: title, transient_for: this.get_toplevel() }, params));
    
            dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
            dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);
    
            if (dialog.run() == Gtk.ResponseType.ACCEPT) {
                try {
                    acceptHandler(dialog.get_filename());
                } catch(e) {
                    log('error from dash-to-panel filechooser: ' + e);
                }
            }
    
            dialog.destroy();
        }
    });
    function mergeObjects(main, bck) {
        for (var prop in bck) {
            if (!main.hasOwnProperty(prop) && bck.hasOwnProperty(prop)) {
                main[prop] = bck[prop];
            }
        }
    
        return main;
    };
/*
 * About Page
 */
var AboutPage = GObject.registerClass(
    class AboutPage extends PW.NotebookPage {
        _init(settings) {
            super._init(_('About'));
            this._settings = settings;

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
                margin_bottom: 0,
                expand: false
            });
            arcMenuImageBox.add(arcMenuImage);

            // Create the info box
            let arcMenuInfoBox = new Gtk.VBox({
                margin_top: 0,
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
            this.creditsScrollWindow = new Gtk.ScrolledWindow();
            this.creditsScrollWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            this.creditsScrollWindow.set_max_content_height(150);
            this.creditsScrollWindow.set_min_content_height(150);
            this.creditsFrame = new Gtk.Frame();
            this.creditsFrame.set_shadow_type(Gtk.ShadowType.NONE);
            this.creditsScrollWindow.add_with_viewport(this.creditsFrame);
  	        let creditsLabel = new Gtk.Label({
		        label: _(Constants.CREDITS),
		        use_markup: true,
		        justify: Gtk.Justification.CENTER,
		        expand: false
            });
            this.creditsFrame.add(creditsLabel);
            
            arcMenuInfoBox.add(arcMenuLabel);
            arcMenuInfoBox.add(versionLabel);
            arcMenuInfoBox.add(projectDescriptionLabel);
            arcMenuInfoBox.add(projectLinkButton);
            arcMenuInfoBox.add(this.creditsScrollWindow);

            // Create the GNU software box
            let gnuSofwareLabel = new Gtk.Label({
                label: _(Constants.GNU_SOFTWARE),
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
var ArcMenuPreferencesWidget = GObject.registerClass(
class ArcMenuPreferencesWidget extends Gtk.Box{


    _init() {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            border_width: 5
        });
        this._settings = Convenience.getSettings(Me.metadata['settings-schema']);

        let notebook = new PW.Notebook();

        let generalSettingsPage = new GeneralSettingsPage(this._settings);
        notebook.append_page(generalSettingsPage);

        let appearancePage = new AppearanceSettingsPage(this._settings);
        notebook.append_page(appearancePage);

        let configurePage = new ConfigureSettingsPage(this._settings);
        notebook.append_page(configurePage);
        
        let pinnedAppsPage = new PinnedAppsPage(this._settings);
        notebook.append_page(pinnedAppsPage);
   
        let miscPage = new MiscPage(this._settings);
        notebook.append_page(miscPage);

        let aboutPage = new AboutPage(this._settings);
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
function lighten_rgb(colorString, percent, modifyAlpha) // implemented from https://stackoverflow.com/a/141943
{
	//creates a nice effect when items are selected
	if(colorString.includes('rgba'))
		colorString = colorString.replace('rgba(','');
	if(colorString.includes('rgb'))
		colorString = colorString.replace('rgb(','');
	colorString = colorString.replace(')','');
	//global.log(colorString);
    let rgbaColor = colorString.split(",");

    let r = parseFloat(rgbaColor[0]) + 255 * percent;
    let g = parseFloat(rgbaColor[1]) + 255 * percent;
    let b = parseFloat(rgbaColor[2]) + 255 * percent;
	let a;
	if(rgbaColor[3] != undefined)
		a = parseFloat(rgbaColor[3]); 
	else
        a =1;
    if(modifyAlpha)
        a=0.4;
	let m = Math.max(r,g,b);
	let threshold = 255.9999;
	r = Math.round(r);
	g = Math.round(g);
    b = Math.round(b);
    if(r<0) r=0;
    if(g<0) g=0;
    if(b<0) b=0;
	if(m<=threshold){
		return "rgba("+r+","+g+","+b+","+a+")";
	}
	let total = r + g + b;
	if(total >= 3 * threshold){
		return "rgba(255,255,255,"+a+")";
	}
	let x = (3 * threshold - total) / (3 * m - total);
	let gray = threshold - x * m;
	r = gray + x * r;
	g = gray + x * g;
	b = gray + x * b;
	r = Math.round(r);
	g = Math.round(g);
	b = Math.round(b);
	return "rgba("+r+","+g+","+b+","+a+")";
};
function saveCSS(settings){
    this._settings= settings;
    let heightValue = this._settings.get_int('menu-height');
    let separatorColor = this._settings.get_string('separator-color');
    let verticalSeparator = this._settings.get_boolean('vert-separator');
    let customArcMenu = this._settings.get_boolean('enable-custom-arc-menu');
    let menuColor = this._settings.get_string('menu-color');
    let menuForegroundColor = this._settings.get_string('menu-foreground-color');
    let borderColor = this._settings.get_string('border-color');
    let highlightColor = this._settings.get_string('highlight-color');
    let fontSize = this._settings.get_int('menu-font-size');
    let borderSize = this._settings.get_int('menu-border-size');
    let cornerRadius = this._settings.get_int('menu-corner-radius');
    let menuMargin = this._settings.get_int('menu-margin');
    let menuArrowSize = this._settings.get_int('menu-arrow-size');
    let menuWidth = this._settings.get_int('menu-width');
    let menuRightWidth = this._settings.get_int('menu-rightpanel-width');
    let avatarStyle =  this._settings.get_enum('avatar-style');
    let avatarRadius = avatarStyle == 0 ? 999 : 0;
    
    let menuLayout =  this._settings.get_enum('menu-layout');
    let searchBoxPadding;
    if(menuLayout == 0) 
        searchBoxPadding = ".search-box-padding { \npadding-top: 0.75em;\n"+"padding-bottom: 0.25em;\npadding-left: 1em;\n padding-right: 0.25em;\n margin-right: .5em;\n}\n";
    else 
        searchBoxPadding = ".search-box-padding { \npadding-top: 0.0em;\n"+"padding-bottom: 0.5em;\npadding-left: 0.4em;\n padding-right: 0.4em;\n margin-right: 0em;\n}\n";


   

    let tooltipForegroundColor= customArcMenu ? "\n color:"+  menuForegroundColor+";\n" : "";
    let tooltipBackgroundColor= customArcMenu ? "\n background-color:"+lighten_rgb( menuColor,0.05)+";\n" : "";
    let tooltipStyle = customArcMenu ?   
        ("#tooltip-menu-item{border-color:"+  borderColor+ ";\n border: 1px;\nfont-size:"+fontSize+"pt;\n padding: 2px 5px;"
        + tooltipForegroundColor + tooltipBackgroundColor+"\nmax-width:550px;\n}") 
        : ("#tooltip-menu-item{\n padding: 2px 5px;\nmax-width:550px;\n}")

    let file = Gio.File.new_for_path(Me.path+"/stylesheet.css");
    let css ="#arc-search{width: "+  menuWidth+"px;} \n.arc-menu-status-text{\ncolor:"+  menuForegroundColor+";\nfont-size:" + fontSize+"pt;\n}\n "+                                                      
        ".search-statustext {font-size:11pt;}\n "+    
    	".left-scroll-area{ \nwidth:"+  menuWidth+"px;\n}\n"   
    	+".arc-empty-dash-drop-target{\nwidth: "+  menuWidth+"px; \nheight: 2px; \nbackground-color:"+  separatorColor+"; \npadding: 0 0; \nmargin:0;\n}\n"     
        +".left-box{\nwidth:"+  menuWidth+"px;\n}" + "\n.vert-sep{\nwidth:11px;\n}\n"
        +"#search-entry{\nmax-width: 17.667em;\n}\n#search-entry:focus { \nborder-color:"+  separatorColor+";\n}\n"
        +"#arc-search-entry{\nmax-width: 17.667em;\nfont-size:" + fontSize+"pt;\n border-color:"+  separatorColor+";\n"
        +" color:"+  menuForegroundColor+";\n background-color:" +  menuColor + ";\n}\n"
        +"#arc-search-entry:focus { \nborder-color:"+ lighten_rgb( separatorColor,0.25)+";\n}\n"
       
        +".arc-menu-action{\ncolor:"+  menuForegroundColor+";\n}\n"
        +".arc-menu-action:hover, .arc-menu-action:focus {\ncolor:"+ lighten_rgb( menuForegroundColor,0.15)+";\n background-color:"+  highlightColor+";\n}\n"

        +tooltipStyle

        +searchBoxPadding
        
        +".arc-menu{\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\nbox-shadow: none;\nfont-size:" + fontSize+"pt;\n}\n"
        +".arc-menu .popup-sub-menu {\npadding-bottom: 1px;\nbackground-color: "+lighten_rgb( menuColor,0.05)+";\nborder-color: "+lighten_rgb( menuColor,0.10)+";\n border-width:1px;\n}\n"
        +".arc-menu .popup-menu-content {padding: 1em 0em;}\n .arc-menu .popup-menu-item {\nspacing: 12px; \nborder: 0;\ncolor:"+  menuForegroundColor+";\n }\n" 
        +".arc-menu .popup-menu-item:ltr {padding: .4em 1.75em .4em 0em; }\n.arc-menu .popup-menu-item:rtl {padding: .4em 0em .4em 1.75em;}\n"
        +".arc-menu .popup-menu-item:checked {\nbackground-color:"+menuColor+";\n box-shadow: 0;\nfont-weight: bold;\n }\n"
        +".arc-menu .popup-menu-item.selected, .arc-menu .popup-menu-item:active{\nbackground-color:"+  highlightColor+"; \ncolor: "+ lighten_rgb( menuForegroundColor,0.15)+";\n }\n" 
        +".arc-menu .popup-menu-item:disabled {color: rgba(238, 238, 236, 0.5); }\n"
        +".arc-menu-boxpointer{ \n-arrow-border-radius:"+  cornerRadius+"px;\n"
        +"-arrow-background-color:" +  menuColor + ";\n"
        +"-arrow-border-color:"+  borderColor+ ";\n"
        +"-arrow-border-width:"+  borderSize+"px;\n"
        +"-arrow-base:"+  menuMargin+"px;\n"
        +"-arrow-rise:"+  menuArrowSize+"px;\n"
        +"-arrow-box-shadow: 0 1px 3px black;\n }"

        +"\n.arc-menu-sep {\nheight: 1px;\nmargin: 5px 20px;\nbackground-color: transparent;"
        +"\nborder-color:"+  separatorColor+";\n border-bottom-width: 1px;\nborder-bottom-style: solid;\n }"

        +".menu-user-avatar {\n background-size: contain; \n border: none;\n border-radius: "+avatarRadius+"px;\n }"
        + "#rightClickMenu{max-width:350px;}"
        +".arc-right-click{\nmax-width:350px;\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\nfont-size:" + fontSize+"pt;\nmargin:2px;\npadding:2px;"
        +"\nspacing:2px;\nbox-shadow: 1px 1px 4px rgb(53, 52, 52);\n}\n"
        +".arc-right-click .popup-sub-menu {\npadding-bottom: 1px;\nbackground-color: #3a393b;\nbox-shadow: inset 0 -1px 0px #323233;\n }\n"
        +".arc-right-click .popup-menu-content {padding: 2px;}\n .arc-right-click .popup-menu-item {\nspacing: 12px; \nborder: 0;\ncolor:"+  menuForegroundColor+";\n }\n" 
        +".arc-right-click .popup-menu-item:ltr {padding: .4em 1.75em .4em 0em; }\n.arc-right-click .popup-menu-item:rtl {padding: .4em 0em .4em 1.75em;}\n"
        +".arc-right-click .popup-menu-item:checked {\nbackground-color: #3a393b;\n box-shadow: inset 0 1px 0px #323233;\nfont-weight: bold;\n }\n"
        +".arc-right-click .popup-menu-item.selected, .arc-right-click .popup-menu-item:active{\nbackground-color:"+  highlightColor+"; \ncolor: "+ lighten_rgb( menuForegroundColor,0.15)+";\n }\n" 
        +".arc-right-click .popup-menu-item:disabled {color: rgba(238, 238, 236, 0.5); }\n"
        +".arc-right-click .popup-menu-item:insensitive {color:" +  lighten_rgb( menuForegroundColor,-0.30) + "; }\n"
        +".arc-right-click-boxpointer{ \n-arrow-border-radius:"+  cornerRadius+"px;\n"
        +"-arrow-background-color:" +  lighten_rgb( menuColor,0.05) + ";\n"
        +"-arrow-border-color:"+  borderColor+ ";\n"
        +"-arrow-border-width:"+  "1px;\n"
        +"-arrow-base:"+  menuMargin+"px;\n"
        +"-arrow-rise:"+  menuArrowSize+"px;\n"
        +"-arrow-box-shadow: 0 1px 3px black;\n }"
        
        +"\n.app-right-click-sep {\nheight: 1px;\nmargin: 2px 35px;\nbackground-color: transparent;"
        +"\nborder-color:"+  lighten_rgb(separatorColor,0.05) +";\nborder-bottom-width: 1px;\nborder-bottom-style: solid; \n}";
    file.replace_contents(css,null,false,Gio.FileCreateFlags.REPLACE_DESTINATION,null);
}

