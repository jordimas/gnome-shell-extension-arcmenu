const { Atk, Clutter, GObject, St } = imports.gi;
const Signals = imports.signals;

const Main = imports.ui.main;
const Params = imports.misc.params;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Util = imports.misc.util;

// Aplication menu class
const ApplicationsMenu = class extends PopupMenu.PopupMenu {
    // Initialize the menu
    constructor(sourceActor, arrowAlignment, arrowSide, button, settings) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = settings;
        this._button = button;  
    }

    // Return that the menu is not empty (used by parent class)
    isEmpty() {
        return false;
    }
    // Handle opening the menu
    open(animate) {
        super.open(animate);
    }
    // Handle closing the menu
    close(animate) {
        if (this._button.applicationsBox) {
            this._button._loadFavorites();
            this._button.backButton.actor.hide();
            this._button.viewProgramsButton.actor.show();
            let searchBox = this._button.searchBox;
            searchBox.clear();
        }
        super.close(animate);
    }
};

var TwoMenuButton = GObject.registerClass( class TwoMenuButton extends PanelMenu.Button {
    _init(settings) {
        super._init(1.0, null, false);
	this._settings = settings;
	//create right click menu
	this.rightClickMenu = new PopupMenu.PopupMenu(this,1.0,St.Side.TOP);	
	this.rightClickMenu.actor.add_style_class_name('panel-menu');
	this.rightClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
	this.rightClickMenu.actor.connect('key-press-event', this._onMenuKeyPress.bind(this));
	Main.uiGroup.add_actor(this.rightClickMenu.actor);
	this.rightClickMenu.actor.hide();
	let item = new PopupMenu.PopupMenuItem(_("Arc Menu Settings"));
        item.connect('activate', ()=>{
        	Util.spawnCommandLine('gnome-shell-extension-prefs arc-menu@linxgem33.com');
        });
        this.rightClickMenu.addMenuItem(item);        
        item = new PopupMenu.PopupSeparatorMenuItem();           
        this.rightClickMenu.addMenuItem(item);        
        item = new PopupMenu.PopupMenuItem(_("Arc Menu on GitLab"));        
        item.connect('activate', ()=>{
        	Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu');
        });     
        this.rightClickMenu.addMenuItem(item);  
        item = new PopupMenu.PopupMenuItem(_("About Arc Menu"));          
        item.connect('activate', ()=>{
        	Util.spawnCommandLine('xdg-open https://gitlab.com/LinxGem33/Arc-Menu/blob/master/README.md');
        });      
        this.rightClickMenu.addMenuItem(item);
      
                
        //intiate left click menu
        this.leftClickMenu = new ApplicationsMenu(this, 1.0, St.Side.TOP, this, this._settings);
	this.leftClickMenu.actor.add_style_class_name('panel-menu');
	this.leftClickMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));
	this.leftClickMenu.actor.connect('key-press-event', this._onMenuKeyPress.bind(this));
	Main.uiGroup.add_actor(this.leftClickMenu.actor);
	this.leftClickMenu.actor.hide();	
    }

    _onEvent(actor, event) {
    
    	if (event.type() == Clutter.EventType.BUTTON_PRESS){   
                if(event.get_button()==1){       
                 	if(this.rightClickMenu.isOpen)
                    		this.rightClickMenu.toggle();	            
                	Main.panel.menuManager.removeMenu(this.rightClickMenu);              
    		    	Main.panel.menuManager.addMenu(this.leftClickMenu); 
		     	    this.leftClickMenu.toggle();	
                    if(this.leftClickMenu.isOpen)
		     		    this.mainBox.grab_key_focus();	
                }     
                else if(event.get_button()==3){  
                	if(this.leftClickMenu.isOpen)
                    		this.leftClickMenu.toggle();                     
                 	Main.panel.menuManager.removeMenu(this.leftClickMenu);          
            		Main.panel.menuManager.addMenu(this.rightClickMenu); 	
                	this.rightClickMenu.toggle();	                	
                }    
            }
            else if(event.type() == Clutter.EventType.TOUCH_BEGIN){
            	if(this.rightClickMenu.isOpen)
            		this.rightClickMenu.toggle();	            
        	Main.panel.menuManager.removeMenu(this.rightClickMenu);              
	    	Main.panel.menuManager.addMenu(this.leftClickMenu); 
	     	this.leftClickMenu.toggle();
            }
                
        return Clutter.EVENT_PROPAGATE;
    }

    _onVisibilityChanged() {
    	if (!this.rightClickMenu || !this.leftClickMenu)
            return;

        if (!this.visible){
        	this.rightClickMenu.close();
        	this.leftClickMenu.close();
        }     
    }

    _onMenuKeyPress(actor, event) {
        if (global.focus_manager.navigate_from_event(event))
            return Clutter.EVENT_STOP;

        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Left || symbol == Clutter.KEY_Right) {
            let group = global.focus_manager.get_group(this);
            if (group) {
                let direction = (symbol == Clutter.KEY_Left) ? St.DirectionType.LEFT : St.DirectionType.RIGHT;
                group.navigate_focus(this, direction, false);
                return Clutter.EVENT_STOP;
            }
        }
        return Clutter.EVENT_PROPAGATE;
    }
    setSensitive(sensitive) {
        this.reactive = sensitive;
        this.can_focus = sensitive;
        this.track_hover = sensitive;
    }
    _onOpenStateChanged(menu, open) {    
        if (open)
            this.add_style_pseudo_class('active');
        else
            this.remove_style_pseudo_class('active');
    }        

    _onDestroy() {
        super._onDestroy();
    }
});
