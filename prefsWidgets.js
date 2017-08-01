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
        this.title = new Gtk.Label({
            label: "<b>" + title + "</b>",
            use_markup: true,
            xalign: 0
        });
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
        this.parent({});
        if (params['circular']) {
            let context = this.get_style_context();
            context.add_class('circular');
        }
        if (params['icon_name']) {
            let image = new Gtk.Image({
                icon_name: params['icon_name'],
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
