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

const {Gdk, Gio, GLib, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Helper = Me.imports.helper;
const Main = imports.ui.main;
const Menu = Me.imports.menu;
const _ = Gettext.gettext;

/**
 * The Menu Settings Controller class is responsible for changing and handling
 * the settings changes of the Arc Menu.
 */
var MenuSettingsController = class {
    constructor(settings, settingsControllers, panel, isMainPanel) {
        this._settings = settings;
        this.panel = panel;
        this.currentMonitorIndex = 0;
        this.isMainPanel = isMainPanel;
        this._activitiesButton = this.panel.statusArea.activities;
        this._settingsControllers = settingsControllers

         // Create the button, a Hot Corner Manager, a Menu Keybinder as well as a Keybinding Manager
        this._menuButton = new Menu.ApplicationsButton(settings, panel);
        this._hotCornerManager = new Helper.HotCornerManager(this._settings);
        if(this.isMainPanel){
            this._menuHotKeybinder = new Helper.MenuHotKeybinder(() => this.toggleMenus());
            this._keybindingManager = new Helper.KeybindingManager(this._settings); 
        }
        this._applySettings();
    }

    // Load and apply the settings from the arc-menu settings
    _applySettings() {
        this._updateHotCornerManager();
        if(this.isMainPanel)
            this._updateHotKeyBinder();
        this._setButtonAppearance();
        this._setButtonText();
        this._setButtonIcon();
        this._setButtonIconSize();
        this._setButtonIconPadding();
    }
    // Bind the callbacks for handling the settings changes to the event signals
    bindSettingsChanges() {
        this.settingsChangeIds = [
            this._settings.connect('changed::disable-activities-hotcorner', this._updateHotCornerManager.bind(this)),
            this._settings.connect('changed::menu-hotkey', this._updateHotKeyBinder.bind(this)),
            this._settings.connect('changed::position-in-panel', this._setButtonPosition.bind(this)),
            this._settings.connect('changed::menu-position-alignment', this._setMenuPositionAlignment.bind(this)),
            this._settings.connect('changed::menu-button-appearance', this._setButtonAppearance.bind(this)),
            this._settings.connect('changed::custom-menu-button-text', this._setButtonText.bind(this)),
            this._settings.connect('changed::menu-button-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::custom-menu-button-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::custom-menu-button-icon-size', this._setButtonIconSize.bind(this)),
            this._settings.connect('changed::button-icon-padding', this._setButtonIconPadding.bind(this)),
            this._settings.connect('changed::enable-menu-button-arrow', this._setMenuButtonArrow.bind(this)),
            this._settings.connect('changed::enable-custom-arc-menu', this._enableCustomArcMenu.bind(this)),
            this._settings.connect('changed::show-home-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-documents-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-downloads-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-music-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-pictures-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-videos-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-computer-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-network-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-software-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-tweaks-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-terminal-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-settings-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-activities-overview-shortcut', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-power-button', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-logout-button', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-lock-button', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-external-devices', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-bookmarks', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::show-suspend-button', this._redisplayRightSide.bind(this)),
            this._settings.connect('changed::menu-height', this._updateMenuHeight.bind(this)),
            this._settings.connect('changed::reload-theme',this._reloadExtension.bind(this)),
            this._settings.connect('changed::pinned-app-list',this._updateFavorites.bind(this)),
            this._settings.connect('changed::mint-pinned-app-list',this._updateFavorites.bind(this)),
            this._settings.connect('changed::mint-separator-index',this._updateFavorites.bind(this)),
            this._settings.connect('changed::enable-pinned-apps',this._updateMenuDefaultView.bind(this)),
            this._settings.connect('changed::menu-layout', this._updateMenuLayout.bind(this)),
            this._settings.connect('changed::enable-large-icons', this.updateIcons.bind(this)),
        ];
    }
    updateIcons(){
        this._menuButton.updateIcons();
    }
    _updateMenuLayout(){
        this._menuButton._updateMenuLayout();
    }
    toggleMenus(){
        if(Main.overview.visible)
            Main.overview.hide();
        else{
            if(this._settings.get_boolean('multi-monitor') && global.dashToPanel){
                let screen = Gdk.Screen.get_default();
                //global.log( global.get_pointer());
                let pointer = global.get_pointer();
                let currentMonitor = screen.get_monitor_at_point(pointer[0],pointer[1]);
                for(let i = 0;i<screen.get_n_monitors();i++){
                    if(i==currentMonitor)
                        this.currentMonitorIndex=i;
                }
                //close current menus that are open on monitors other than current monitor
                for (let i = 0; i < this._settingsControllers.length; i++) {
                    if(i!=this.currentMonitorIndex){
                    if(this._settingsControllers[i]._menuButton.leftClickMenu.isOpen)
                        this._settingsControllers[i]._menuButton.toggleMenu();
                    if(this._settingsControllers[i]._menuButton.rightClickMenu.isOpen)
                        this._settingsControllers[i]._menuButton.toggleRightClickMenu();
                    }
                }  
                //toggle menu on current monitor
                for (let i = 0; i < this._settingsControllers.length; i++) {
                    if(i==this.currentMonitorIndex)
                        this._settingsControllers[i]._menuButton.toggleMenu();
                }   
            }
            else {
                //global.log("no dash to panel")
                this._menuButton.toggleMenu();
            }
        }
    }
    _reloadExtension(){
        if(this._settings.get_boolean('reload-theme') == true){
            Main.loadTheme();
            this._settings.set_boolean('reload-theme',false);
        }
    }
    _enableCustomArcMenu() {
        this._menuButton.updateStyle();
    }
    _updateMenuHeight(){
        this._menuButton.updateHeight();
    }
    _updateFavorites(){
        if(this._settings.get_enum('menu-layout') == Constants.MENU_LAYOUT.Default){
            if(this._menuButton.getShouldLoadFavorites())
                this._menuButton._loadFavorites();
            if(this._menuButton.getCurrentMenu() == Constants.CURRENT_MENU.FAVORITES)
               this._menuButton._displayFavorites();
        }
        if(this._settings.get_enum('menu-layout') == Constants.MENU_LAYOUT.Mint){
            if(this._menuButton.getShouldLoadFavorites())
                this._menuButton._loadFavorites();
        }

    }
    _updateMenuDefaultView(){
        if(this._settings.get_boolean('enable-pinned-apps'))
            this._menuButton._displayFavorites();
        else
            this._menuButton._displayCategories();
    }
    _redisplayRightSide(){
        this._menuButton._redisplayRightSide();
    }
    _updateHotCornerManager() {
        if (this._settings.get_boolean('disable-activities-hotcorner')) {
            this._hotCornerManager.disableHotCorners();
        } else {
            this._hotCornerManager.enableHotCorners();
        }
    }

    _updateHotKeyBinder() {
        if (this.isMainPanel) {
            let hotkeySettingsKey = 'menu-keybinding-text';
            let menuKeyBinding = '';
            let hotKeyPos = this._settings.get_enum('menu-hotkey');

            this._keybindingManager.unbind(hotkeySettingsKey);
            this._menuHotKeybinder.disableHotKey();
            this._menuKeyBindingKey = 0;
            
            if (hotKeyPos==3) {
                this._keybindingManager.bind(hotkeySettingsKey, 'menu-keybinding', () => this._onHotkey());
                menuKeyBinding = this._settings.get_string(hotkeySettingsKey);
            }
            else if (hotKeyPos !== Constants.HOT_KEY.Undefined ) {
                let hotKey = Constants.HOT_KEY[hotKeyPos];
                this._menuHotKeybinder.enableHotKey(hotKey);
                menuKeyBinding = hotKey;
            }

            if (menuKeyBinding) {
                this._menuKeyBindingKey = Gtk.accelerator_parse(menuKeyBinding)[0];
            }
        } 
    }

    _onHotkey() {
        if (this._settings.get_boolean('disable-hotkey-onkeyrelease'))
            this.toggleMenus();
        else
            this._onHotkeyRelease();
    }

    _onHotkeyRelease() {
        let activeMenu = this._settingsControllers[this.currentMonitorIndex]._menuButton.getActiveMenu();
        let focusTarget = activeMenu ? 
                          (activeMenu.actor || activeMenu) : 
                          (this.panel.actor || this.panel);
        
        this.disconnectKeyRelease();

        this.keyInfo = {
            pressId: focusTarget.connect('key-press-event', _ => this.disconnectKeyRelease()),
            releaseId: focusTarget.connect('key-release-event', (actor, event) => {
                this.disconnectKeyRelease();

                if (this._menuKeyBindingKey == event.get_key_symbol()) {
                    this.toggleMenus();
                }
            }),
            target: focusTarget
        };

        focusTarget.grab_key_focus();
    }

    disconnectKeyRelease() {
        if (this.keyInfo) {
            this.keyInfo.target.disconnect(this.keyInfo.pressId);
            this.keyInfo.target.disconnect(this.keyInfo.releaseId);
            this.keyInfo = 0;
        }
    }

    // Place the menu button to main panel as specified in the settings
    _setButtonPosition() {
        if (this._isButtonEnabled()) {
            this._removeMenuButtonFromMainPanel();
            this._addMenuButtonToMainPanel();
            this._setMenuPositionAlignment();
        }
    }
    _setMenuPositionAlignment(){
        this._menuButton._setMenuPositionAlignment();
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

        let customTextLabel = this._settings.get_string('custom-menu-button-text');
        label.set_text(customTextLabel);
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
                }
            case Constants.MENU_BUTTON_ICON.Arc_Menu:
                let arcMenuIconPath = Me.path + Constants.ARC_MENU_SYMBOLIC.Path;
                if (GLib.file_test(arcMenuIconPath, GLib.FileTest.EXISTS)) {
                    stIcon.set_gicon(Gio.icon_new_for_string(arcMenuIconPath));
                    break;
                } 
            case Constants.MENU_BUTTON_ICON.Arc_Menu_Alt:
                let arcMenuAltIconPath = Me.path + Constants.ARC_MENU_ALT_SYMBOLIC.Path;
                if (GLib.file_test(arcMenuAltIconPath, GLib.FileTest.EXISTS)) {
                    stIcon.set_gicon(Gio.icon_new_for_string(arcMenuAltIconPath));
                    break;
                } 
            case Constants.MENU_BUTTON_ICON.System: 
            default:
                stIcon.set_icon_name('start-here-symbolic');
        }
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIconSize() {
        let menuButtonWidget = this._menuButton.getWidget();
        let stIcon = menuButtonWidget.getPanelIcon();
        let iconSize = this._settings.get_double('custom-menu-button-icon-size');
        let size = iconSize;
        stIcon.icon_size = size;
    }
    _setButtonIconPadding() {
        let menuButtonWidget = this._menuButton.getWidget();
        let stIcon = menuButtonWidget.getPanelIcon();
        let iconPadding = this._settings.get_int('button-icon-padding');
        stIcon.style = "padding: 0 "+iconPadding+"px;";
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
            this.panel._leftBox.contains(this._activitiesButton.container));
    }

    // Remove the activities button from the main panel
    _removeActivitiesButtonFromMainPanel() {
        if (this._isActivitiesButtonPresent()) {
            this.panel._leftBox.remove_child(this._activitiesButton.container);
        }
    }

    // Add or restore the activities button on the main panel
    _addActivitiesButtonToMainPanel() {
        if (this.panel == Main.panel && !this._isActivitiesButtonPresent()) {
            // Retsore the activities button at the default position
            this.panel._leftBox.add_child(this._activitiesButton.container);
            this.panel._leftBox.set_child_at_index(this._activitiesButton.container, 0);
        }
    }

    // Add the menu button to the main panel
    _addMenuButtonToMainPanel() {
        let [menuPosition, order] = this._getMenuPositionTuple();
        this.panel.addToStatusArea('arc-menu', this._menuButton, order, menuPosition);
    }

    // Remove the menu button from the main panel
    _removeMenuButtonFromMainPanel() {
        this.panel.menuManager.removeMenu(this._menuButton.leftClickMenu);
        this.panel.menuManager.removeMenu(this._menuButton.rightClickMenu);
        this.panel.statusArea['arc-menu'] = null;
    }

    // Enable the menu button
    enableButton() {
        this._removeActivitiesButtonFromMainPanel(); // disable the activities button
        this._addMenuButtonToMainPanel();
    }

    // Disable the menu button
    _disableButton() {
        this._removeMenuButtonFromMainPanel();
        this._addActivitiesButtonToMainPanel(); // restore the activities button
        this._menuButton.destroy();
    }

    _isButtonEnabled() {
        return this.panel.statusArea['arc-menu'] !== null;
    }

    // Destroy this object
    destroy() {
        this.settingsChangeIds.forEach(id => this._settings.disconnect(id));
        this._hotCornerManager.destroy();


        // Clean up and restore the default behaviour
        if(this.panel == undefined)
            this._menuButton.destroy();
        else if (this._isButtonEnabled()) {
            this._disableButton();
        }

        if(this.isMainPanel){
            this.disconnectKeyRelease();
            this._menuHotKeybinder.destroy();
            this._keybindingManager.destroy();
        }
        this._settings = null;
        this._activitiesButton = null;
        this._menuButton = null;
    }
};
