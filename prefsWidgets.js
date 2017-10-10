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
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;
const Params = imports.misc.params;

/**
 * The module prefsWidgets.js contains all the customized GUI elements
 * for the preferences widget (prefs.js).
 * In order to have a consistent UI/UX, every GUI element in the preferences
 * should be based on a widget from this module.
 */

/**
 * Arc Menu Notebook
 */
const Notebook = new GObject.Class({
    Name: 'ArcMenu.ArcMenuNotebook',
    GTypeName: 'ArcMenuNotebook',
    Extends: Gtk.Notebook,

    _init: function() {
        this.parent({
            margin_left: 6,
            margin_right: 6
        });
    },

    append_page: function(notebookPage) {
        Gtk.Notebook.prototype.append_page.call(
            this,
            notebookPage,
            notebookPage.getTitleLabel()
        );
    }
});

/**
 * Arc Menu Notebook Page
 */
const NotebookPage = new GObject.Class({
    Name: 'ArcMenu.ArcMenuNotebookPage',
    GTypeName: 'ArcMenuNotebookPage',
    Extends: Gtk.Box,

    _init: function(title) {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL,
            margin: 24,
            spacing: 20,
            homogeneous: false
        });
        this._title = new Gtk.Label({
            label: "<b>" + title + "</b>",
            use_markup: true,
            xalign: 0
        });
    },

    getTitleLabel: function() {
        return this._title;
    }
});

/**
 * Arc Menu icon Button
 */
const IconButton = new GObject.Class({
    Name: 'ArcMenu.ArcMenuIconButton',
    GTypeName: 'ArcMenuIconButton',
    Extends: Gtk.Button,

    _init: function(params) {
        this.parent();
        this._params = Params.parse(params, {
            circular: true,
            icon_name: ''
        });
        if (this._params.circular) {
            let context = this.get_style_context();
            context.add_class('circular');
        }
        if (this._params.icon_name) {
            let image = new Gtk.Image({
                icon_name: this._params.icon_name,
                xalign: 0.46
            });
            this.add(image);
        }
    }
});

/**
 * Arc Menu Dialog Window
 */
const DialogWindow = new Lang.Class({
    Name: 'ArcMenu.DialogWindow',
    GTypeName: 'ArcMenuDialogWindow',
    Extends: Gtk.Dialog,

    _init: function(title, parent) {
        this.parent({
            title: title,
            transient_for: parent.get_toplevel(),
            use_header_bar: true,
            modal: true
        });
        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            homogeneous: false,
            margin: 5
        });

        this._createLayout(vbox);
        this.get_content_area().add(vbox);
    },

    _createLayout: function(vbox) {
        throw "Not implemented!";
    }
});

/**
 * Arc Menu Frame Box
 */
const FrameBox = new Lang.Class({
    Name: 'ArcMenu.FrameBox',
    GTypeName: 'ArcMenuFrameBox',
    Extends: Gtk.Frame,

    _init: function() {
        this.parent({ label_yalign: 0.50 });
        this._listBox = new Gtk.ListBox();
        this._listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        Gtk.Frame.prototype.add.call(this, this._listBox);
    },

    add: function(boxRow) {
        this._listBox.add(boxRow);
    }
});

/**
 * Arc Menu Frame Box Row
 */
const FrameBoxRow = new Lang.Class({
    Name: 'ArcMenu.FrameBoxRow',
    GTypeName: 'ArcMenuFrameBoxRow',
    Extends: Gtk.ListBoxRow,

    _init: function() {
        this.parent({});
        this._grid = new Gtk.Grid({
            margin: 5,
            column_spacing: 20,
            row_spacing: 20
        });
        Gtk.ListBoxRow.prototype.add.call(this, this._grid);
    },

    add: function(widget) {
        this._grid.add(widget);
    }
});

/**
 * Arc Menu Tile Grid
 */
var TileGrid = new Lang.Class({
    Name: 'ArcMenu.TileGrid',
    GTypeName: 'ArcMenuTileGrid',
    Extends: Gtk.FlowBox,

    _init: function(maxColumns) {
        this.parent({
            row_spacing: 5,
            column_spacing: 5,
            max_children_per_line: maxColumns,
            vexpand: true,
            valign: Gtk.Align.START
        });
    }
});

/**
 * Arc Menu Tile Grid
 */
var Tile = new Lang.Class({
    Name: 'ArcMenu.Tile',
    GTypeName: 'ArcMenuTile',
    Extends: Gtk.EventBox,

     _init: function(params) {
        this.parent();
        this._params =  Params.parse(params, {
            label: '',
            file: null,
            height: -1,
            width: -1
        });

        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(this._params.file, this._params.width, this._params.height);
        this._image = new Gtk.Image({ pixbuf: pixbuf });
        this._label = new Gtk.Label({ label: this._params.label });

        this._vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        this._vbox.add(this._image);
        this._vbox.add(this._label);
        this.add(this._vbox);
    }
});

/**
 * Arc Menu Style Chooser
 */
var MenuStyleChooser = new Lang.Class({
    Name: 'ArcMenu.MenuStyleChooser',
    GTypeName: 'ArcMenuStyleChooser',
    Extends: Gtk.Dialog,

    _init: function(parent, params) {
        this._params = Params.parse(params, {
            title: 'Menu style chooser',
            height: 480,
            width: 660,
            thumbnailHeight: 200,
            thumbnailWidth: 200,
            maxColumns: 6,
            styles: []
        });
        this.parent({
            title: this._params.title,
            transient_for: parent.get_toplevel(),
            use_header_bar: true,
            modal: true,
            default_width: this._params.width,
            default_height: this._params.height
        });
        this._createLayout();
    },

    _createLayout: function() {
        this._vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            homogeneous: false,
            margin: 5
        });
        this._scrolled = new Gtk.ScrolledWindow();
        this._scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this._tileGrid = new TileGrid(this._params.maxColumns);

        this._params.styles.forEach(Lang.bind(this, function(style) {
            this._addStyle(style.name, style.thumbnail);
        }));

        this._scrolled.add(this._tileGrid);
        this._vbox.add(this._scrolled);
        this.get_content_area().add(this._vbox);
    },

    _addStyle: function(name, thumbnail) {
        let tile = new Tile({
            label: name,
            file: thumbnail,
            height: this._params.thumbnailHeight,
            width: this._params.thumbnailWidth
        });
        this._tileGrid.add(tile);
        tile.connect('button-press-event', Lang.bind(this, function() {
            //TODO
        }));
    }
});
