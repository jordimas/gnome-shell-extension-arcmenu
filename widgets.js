const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Pango = imports.gi.Pango;
const GLib = imports.gi.GLib;
const Signals = imports.signals;
const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Tooltips = Me.imports.tooltips;
const Widgets = Me.imports.widgets;

const Convenience = Me.imports.convenience;
let settings = Convenience.getSettings();

const AppEntry = new Lang.Class({
    Name: 'AppEntry',
