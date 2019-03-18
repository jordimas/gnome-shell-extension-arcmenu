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
            super._init(_('Button appearance'), parent);
            this._settings = settings;
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
        //let generalSettingsPage = new GeneralSettingsPage(this.settings);
        //notebook.append_page(generalSettingsPage, generalSettingsPage.title);

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
