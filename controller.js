/*
 * Arc Menu: The new applications menu for Gnome 3.
 *
 * Copyright (C) 2017 LinxGem33
 *
 * Copyright (C) 2017 Alexander Rüedlinger
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
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Constants = Me.imports.constants;
const Helper = Me.imports.helper;

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

/**
 * The Menu Settings Controller class is responsible for changing and handling
 * the settings changes of the Arc Menu.
 */
var MenuSettingsController = class {
    constructor(settings, menuButton) {
        this._settings = settings;
        this._menuButton = menuButton;
        this._activitiesButton = Main.panel.statusArea.activities;

        // Create a Hot Corner Manager, a Menu Keybinder as well as a Keybinding Manager
        this._hotCornerManager = new Helper.HotCornerManager(this._settings);
        this._menuHotKeybinder = new Helper.MenuHotKeybinder(() => {
            this._menuButton.toggleMenu();
        });
        this._keybindingManager = new Helper.KeybindingManager(this._settings);

        this._applySettings();
    }

    // Load and apply the settings from the arc-menu settings
    _applySettings() {
        this._updateHotCornerManager();
        this._setMenuKeybinding();
        this._updateHotKeyBinder();
        this._setButtonAppearance();
        this._setButtonText();
        this._setButtonIcon();
        this._setButtonIconSize();
    }

    // Bind the callbacks for handling the settings changes to the event signals
    bindSettingsChanges() {
        //settings.connect('changed::visible-menus', function() { appsMenuButton.updateMenu(); });
        this._settings.connect('changed::disable-activities-hotcorner', this._updateHotCornerManager.bind(this));
        this._settings.connect('changed::menu-hotkey', this._updateHotKeyBinder.bind(this));
        this._settings.connect('changed::enable-menu-keybinding', this._setMenuKeybinding.bind(this));
        this._settings.connect('changed::position-in-panel', this._setButtonPosition.bind(this));
        this._settings.connect('changed::menu-button-appearance', this._setButtonAppearance.bind(this));
        this._settings.connect('changed::menu-button-text', this._setButtonText.bind(this));
        this._settings.connect('changed::custom-menu-button-text', this._setButtonText.bind(this));
        this._settings.connect('changed::menu-button-icon', this._setButtonIcon.bind(this));
        this._settings.connect('changed::custom-menu-button-icon', this._setButtonIcon.bind(this));
        this._settings.connect('changed::custom-menu-button-icon-size', this._setButtonIconSize.bind(this));
        this._settings.connect('changed::enable-menu-button-arrow', this._setMenuButtonArrow.bind(this));
    }

    _updateHotCornerManager() {
        if (this._settings.get_boolean('disable-activities-hotcorner')) {
            this._hotCornerManager.disableHotCorners();
        } else {
            this._hotCornerManager.enableHotCorners();
        }
    }

    _updateHotKeyBinder() {
        let hotKeyPos = this._settings.get_enum('menu-hotkey');
        if (hotKeyPos !== Constants.HOT_KEY.Undefined) {
            let hotKey = Constants.HOT_KEY[hotKeyPos];
            this._menuHotKeybinder.enableHotKey(hotKey);
        } else {
            this._menuHotKeybinder.disableHotKey();
        }
    }

    _setMenuKeybinding() {
        if (this._settings.get_boolean('enable-menu-keybinding')) {
            this._keybindingManager.bind('menu-keybinding-text', 'menu-keybinding',
                () => {
                    this._menuButton.toggleMenu();
                });
        } else {
            this._keybindingManager.unbind('menu-keybinding-text');
        }
    }

    // Place the menu button to main panel as specified in the settings
    _setButtonPosition() {
        if (this._isButtonEnabled()) {
            this._removeMenuButtonFromMainPanel();
            this._addMenuButtonToMainPanel();
        }
    }

    // Change the menu button appearance as specified in the settings
    _setButtonAppearance() {
        let menuButtonWidget = this._menuButton.getWidget();
        switch (this._settings.get_enum('menu-button-appearance')) {
            case Constants.MENU_APPEARANCE.Text:
                menuButtonWidget.hidePanelIcon();
                menuButtonWidget.showPanelText();
                break;
            case Constants.MENU_APPEARANCE.Icon_Text:
                menuButtonWidget.hidePanelIcon();
                menuButtonWidget.hidePanelText();
                menuButtonWidget.showPanelIcon();
                menuButtonWidget.showPanelText();
                break;
            case Constants.MENU_APPEARANCE.Text_Icon:
                menuButtonWidget.hidePanelIcon();
                menuButtonWidget.hidePanelText();
                menuButtonWidget.showPanelText();
                menuButtonWidget.showPanelIcon();
                break;
            case Constants.MENU_APPEARANCE.Icon: /* falls through */
            default:
                menuButtonWidget.hidePanelText();
                menuButtonWidget.showPanelIcon();
        }
        this._setMenuButtonArrow();
    }

    _setMenuButtonArrow() {
        let menuButtonWidget = this._menuButton.getWidget();
        if (this._settings.get_boolean('enable-menu-button-arrow')) {
            menuButtonWidget.hideArrowIcon();
            menuButtonWidget.showArrowIcon();
        } else {
            menuButtonWidget.hideArrowIcon();
        }
    }

    // Update the text of the menu button as specified in the settings
    _setButtonText() {
        // Update the text of the menu button
        let menuButtonWidget = this._menuButton.getWidget();
        let label = menuButtonWidget.getPanelLabel();

        switch (this._settings.get_enum('menu-button-text')) {
            case Constants.MENU_BUTTON_TEXT.Custom:
                let customTextLabel = this._settings.get_string('custom-menu-button-text');
                label.set_text(customTextLabel);
                break;
            case Constants.MENU_BUTTON_TEXT.System: /* falls through */
            default:
                let systemTextLabel = _('Applications');
                label.set_text(systemTextLabel);
        }
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIcon() {
        let iconFilepath = this._settings.get_string('custom-menu-button-icon');
        let menuButtonWidget = this._menuButton.getWidget();
        let stIcon = menuButtonWidget.getPanelIcon();

        switch (this._settings.get_enum('menu-button-icon')) {
            case Constants.MENU_BUTTON_ICON.Custom:
                if (GLib.file_test(iconFilepath, GLib.FileTest.EXISTS)) {
                    stIcon.set_gicon(Gio.icon_new_for_string(iconFilepath));
                    break;
                } /* falls through */
            case Constants.MENU_BUTTON_ICON.Arc_Menu:
                let arcMenuIconPath = Me.path + Constants.MENU_ICON_PATH.Arc_Menu;
                if (GLib.file_test(arcMenuIconPath, GLib.FileTest.EXISTS)) {
                    stIcon.set_gicon(Gio.icon_new_for_string(arcMenuIconPath));
                    break;
                } /* falls through */
            case Constants.MENU_BUTTON_ICON.System: /* falls through */
            default:
                stIcon.set_icon_name('start-here-symbolic');
        }
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIconSize() {
        let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        let menuButtonWidget = this._menuButton.getWidget();
        let stIcon = menuButtonWidget.getPanelIcon();
        let iconSize = this._settings.get_double('custom-menu-button-icon-size');
        let size = iconSize * scaleFactor;
        stIcon.set_icon_size(size);
    }

    // Get the current position of the menu button and its associated position order
    _getMenuPositionTuple() {
        switch (this._settings.get_enum('position-in-panel')) {
            case Constants.MENU_POSITION.Center:
                return ['center', 0];
            case Constants.MENU_POSITION.Right:
                return ['right', -1];
            case Constants.MENU_POSITION.Left: /* falls through */
            default:
                return ['left', 0];
        }
    }

    // Check if the activities button is present on the main panel
    _isActivitiesButtonPresent() {
        // Thanks to lestcape @github.com for the refinement of this method.
        return (this._activitiesButton &&
            this._activitiesButton.container &&
            Main.panel._leftBox.contains(this._activitiesButton.container));
    }

    // Remove the activities button from the main panel
    _removeActivitiesButtonFromMainPanel() {
        if (this._isActivitiesButtonPresent()) {
            Main.panel._leftBox.remove_child(this._activitiesButton.container);
        }
    }

    // Add or restore the activities button on the main panel
    _addActivitiesButtonToMainPanel() {
        if (!this._isActivitiesButtonPresent()) {
            // Retsore the activities button at the default position
            Main.panel._leftBox.add_child(this._activitiesButton.container);
            Main.panel._leftBox.set_child_at_index(this._activitiesButton.container, 0);
        }
    }

    // Add the menu button to the main panel
    _addMenuButtonToMainPanel() {
        let [menuPosition, order] = this._getMenuPositionTuple();
        Main.panel.addToStatusArea('arc-menu', this._menuButton, order, menuPosition);
    }

    // Remove the menu button from the main panel
    _removeMenuButtonFromMainPanel() {
        Main.panel.menuManager.removeMenu(this._menuButton.menu);
        Main.panel.statusArea['arc-menu'] = null;
    }

    // Enable the menu button
    enableButton() {
        this._removeActivitiesButtonFromMainPanel(); // disable the activities button
        this._addMenuButtonToMainPanel();
    }

    // Disable the menu button
    disableButton() {
        this._removeMenuButtonFromMainPanel();
        this._addActivitiesButtonToMainPanel(); // restore the activities button
    }

    _isButtonEnabled() {
        return Main.panel.statusArea['arc-menu'] !== null;
    }

    // Destroy this object
    destroy() {
        // Clean up and restore the default behaviour
        if (this._isButtonEnabled()) {
            this._disableButton();
        }
        this._hotCornerManager.destroy();
        this._menuHotKeybinder.destroy();
        this._keybindingManager.destroy();

        this._settings = null;
        this._activitiesButton = null;
        this._menuButton = null;
    }
};
