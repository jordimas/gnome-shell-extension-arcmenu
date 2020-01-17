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

const Me = imports.misc.extensionUtils.getCurrentExtension();

const Constants = Me.imports.constants;
const Controller = Me.imports.controller;
const Convenience = Me.imports.convenience;
const ExtensionSystem = imports.ui.extensionSystem;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;


// Initialize panel button variables
let settings;
let settingsControllers;
let extensionChangedId;
let extensionChangedHandler;
let dashToDockPanelToggleID;

// Initialize menu language translations
function init(metadata) {
    Convenience.initTranslations(Me.metadata['gettext-domain']);      
}

// Enable the extension
function enable() {
    settings = Convenience.getSettings(Me.metadata['settings-schema']);
    settings.connect('changed::multi-monitor', () => _onMultiMonitorChange());
    settings.connect('changed::arc-menu-placement', () => _onArcMenuPlacementChange());
    settingsControllers = [];

    _enableButtons();
    
    // dash to panel might get enabled after Arc-Menu
    extensionChangedId = (Main.extensionManager || ExtensionSystem).connect('extension-state-changed', (data, extension) => {
        if (extension.uuid === 'dash-to-panel@jderose9.github.com' && extension.state === 1) {
            let arcMenuPosition = settings.get_enum('arc-menu-placement');
            if(arcMenuPosition == Constants.ARC_MENU_PLACEMENT.PANEL){
                _connectDtpSignals();
                _enableButtons();
            }
        }
    });
        
    extensionChangedHandler = (Main.extensionManager || ExtensionSystem).connect('extension-state-changed', (data, extension) => {
        if (extension.uuid === "dash-to-dock@micxgx.gmail.com" && extension.state === 1) {
            let arcMenuPosition = settings.get_enum('arc-menu-placement');
            if(arcMenuPosition == Constants.ARC_MENU_PLACEMENT.DASH){
                _enableButtons();
            }

        }
    });       
    // listen to dash to panel if it is compatible and already enabled
    _connectDtpSignals();
}

// Disable the extension
function disable() {
    if ( extensionChangedId > 0){
        (Main.extensionManager || ExtensionSystem).disconnect(extensionChangedId);
        extensionChangedId = 0;
    }


    _disconnectDtpSignals();
    if(extensionChangedHandler)
        (Main.extensionManager || ExtensionSystem).disconnect(extensionChangedHandler);
    settingsControllers.forEach(sc => _disableButton(sc));
    settingsControllers = null;

    settings.run_dispose();
    settings = null;
    
}

function _connectDtpSignals() {
    if (global.dashToPanel) {
        global.dashToPanel._amPanelsCreatedId = global.dashToPanel.connect('panels-created', () => _enableButtons());
    }
}

function _disconnectDtpSignals() {
    if (global.dashToPanel && global.dashToPanel._amPanelsCreatedId) {
        global.dashToPanel.disconnect(global.dashToPanel._amPanelsCreatedId);
        delete global.dashToPanel._amPanelsCreatedId;
    }
}

function _onArcMenuPlacementChange() {
    let arcMenuPosition = settings.get_enum('arc-menu-placement');
    if(arcMenuPosition == Constants.ARC_MENU_PLACEMENT.PANEL){
        _connectDtpSignals();
    }
    else{
        _disconnectDtpSignals();
    }
    settingsControllers.forEach(sc => _disableButton(sc, 1));
    _enableButtons();
}
function _onMultiMonitorChange() {
    if (!settings.get_boolean('multi-monitor')) {
        for (let i = settingsControllers.length - 1; i >= 0; --i) {
            let sc = settingsControllers[i];

            if (sc.panel != Main.panel) {
                _disableButton(sc, 1);
            }
        }
    }

    _enableButtons();
}

function _enableButtons() {
    let dashToDock = Main.extensionManager ?
                        Main.extensionManager.lookup("dash-to-dock@micxgx.gmail.com") : //gnome-shell >= 3.33.4
                        ExtensionUtils.extensions["dash-to-dock@micxgx.gmail.com"];
    let arcMenuPosition = settings.get_enum('arc-menu-placement');
    if(arcMenuPosition == Constants.ARC_MENU_PLACEMENT.DASH && dashToDock && dashToDock.stateObj && dashToDock.stateObj.dockManager){
        let panel = dashToDock.stateObj.dockManager; 
        if(panel){ 
            if(panel._allDocks.length){                
                let settingsController = new Controller.MenuSettingsController(settings, settingsControllers, panel, true, Constants.ARC_MENU_PLACEMENT.DASH);
                settingsController.enableButtonInDash();

                settingsController.bindSettingsChanges();
                settingsControllers.push(settingsController);
            }
        }
    }
    else{
        let panelArray = (settings.get_boolean('multi-monitor') && global.dashToPanel) ? 
        global.dashToPanel.panels.map(pw => pw.panel || pw) : [Main.panel];
        for(var i = 0; i<panelArray.length;i++){
            let panel = panelArray[i];
            let isMainPanel = ('isSecondary' in panel && !panel.isSecondary) || panel == Main.panel;
    
            if (panel.statusArea['arc-menu'])
                continue;
            else if (settingsControllers[i])
                _disableButton(settingsControllers[i], 1); 
    
            // Create a Menu Controller that is responsible for controlling
            // and managing the menu as well as the menu button.
        
            let settingsController = new Controller.MenuSettingsController(settings, settingsControllers, panel, isMainPanel, Constants.ARC_MENU_PLACEMENT.PANEL);
            
            if (!isMainPanel) {
                panel._amDestroyId = panel.connect('destroy', () => extensionChangedId ? _disableButton(settingsController, 1) : null);
            }
    
            settingsController.enableButton();
            settingsController.bindSettingsChanges();
            settingsControllers.push(settingsController);
        }
    }  
    
}

function _disableButton(controller, remove) {
    if (controller.panel._amDestroyId) {
        controller.panel.disconnect(controller.panel._amDestroyId);
        delete controller.panel._amDestroyId;
    }

    controller.destroy();
    
    if (remove) {
        settingsControllers.splice(settingsControllers.indexOf(controller), 1);
    }
}
