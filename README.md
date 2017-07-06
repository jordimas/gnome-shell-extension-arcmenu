<img src="https://github.com/LinxGem33/Arc-Menu/blob/master/screenshots/avatar.resized.png?raw=true" alt="Logo" align="left" /> Arc Menu
======

### The new applications menu for Gnome 3.

Arc menu is a Gnome shell extension designed to replace the standard menu found in Gnome 3 this applications menu extension leverages some of the work from [Zorin OS menu](https://zorinos.com/)., some of the added benefits of the Arc Menu extension is the long awaited search functionality as well as quick access to files on your system and also the current logged in user along with quick access to the software centre and system settings and other features which can be accessed from the settings menu.

##

### What's next for Arc Menu?

My first initial priority was to get this extension stable enough to upload to extensions.gnome.org as this was a menu baked into the Zorin OS operating system so it had to be ported to work with the gnome shell eco system, now the first stage of development is over features are now being added and I'm pleased to announce a new member of the team ([lexruee (Xander)](https://github.com/lexruee) and now a lead developer in the design and development of this extension hopefully more features are planned for future development and a lot has already been implemented.

##
|Default Gnome Theme|OSX Arc Theme|Adapta Theme (Dark)|Adapta Theme (Light)|
|:------:|:-----:|:-----:|:-----:|
|![](https://github.com/LinxGem33/Arc-Menu/blob/master/screenshots/arcm.png?raw=true)|![](https://github.com/LinxGem33/Arc-Menu/blob/master/screenshots/ma1.png?raw=true)|![](https://github.com/LinxGem33/Arc-Menu/blob/master/screenshots/ma2.png?raw=true)|![](https://github.com/LinxGem33/Arc-Menu/blob/master/screenshots/ma3.png?raw=true)|
|Click image to enlarge|Click image to enlarge|Click image to enlarge|Click image to enlarge|

##

![A screenshot of the Arc-Shadow theme](https://github.com/LinxGem33/Arc-Menu/blob/master/screenshots/tm.png?raw=true)

##

### Installation

You can now install this extension from extensions.gnome.org as a one click install just click on the link below
> [One Click Install](https://extensions.gnome.org/extension/1228/arc-menu/)

##
### Packages
Awaiting packagers

##
### Manual Installation

To install the Arc Menu, copy the Arc Menu folder to: 

`~/.local/share/gnome-shell/extensions` or to `/usr/share/gnome-shell/extensions` for system-wide use. 

**Note**: make sure you change the name of the folder to `arc-menu@linxgem33.com` and also delete the make file in the folder and then reboot your system or log out and back in again.

Now open the gnome tweak tool window by executing `gnome tweak tool` from the system menu and then select 
from the extensions tab on the gnome tweak tool and turn on Arc Menu.
##
### Advanced Installation (for testers & developers)

You can use the Makefile to compile the schema & install the extension:
```
make compile
```
In short, the make command compiles the schema file in the directory schemas. Basically, it runs the following command:
```
glib-compile-schemas ./schemas
```

When you are testing a new feature, you can use the install/uninstall commands:

```
make uninstall
make install
```

##
### Bugs
Bugs should be reported [here](https://github.com/LinxGem33/Arc-Menu/issues) on the Github issues page.

##
### License & Terms ![](https://github.com/LinxGem33/IP-Finder/blob/master/screens/Copyleft-16.png?raw=true)

Arc Menu is available under the terms of the GPL-2.0 license See [`COPYING`](https://github.com/LinxGem33/Arc-Menu/blob/master/COPYING) for details.

## 
### Top Developers on the Project

This section is reserved for those who have contributed a great deal to the project with their time skill and patience with a big thank you for giving back to the community with their selfless acts of helping.

> “There is a desire within each of us,
in the deep center of ourselves
that we call our heart.
We were born with it,
it is never completely satisfied,
and it never dies.
We are often unaware of it,
but it is always awake.
##
|Ranked :trophy:|Developer Name|Profile / Description|
|:-----:|:-----:|:-----:|
|:heavy_check_mark: |[lexruee (Xander)](https://github.com/lexruee)|Programmer, Tinkerer, Single Board Computer and GNU/Linux enthusiast.|

##

### Credits

This extension leverages some of the work from [Zorin OS menu](https://zorinos.com/).

Additional credits: This extension also leverages the work from [Giovanni Campagna ](https://git.gnome.org//browse/gnome-shell-extensions) gnome Applications Menu used in [Gnome 3](https://www.gnome.org/) to allow the menu to be embedded in the Gnome main panel.
##
### Pull Requests

Thanks to the following people for contributing via pull requests:
- @[fishears](https://github.com/fishears/Arc-Menu) (1) compiling the schema's (2) Added suspend button and re-order buttons
- @[JasonLG1979](https://github.com/JasonLG1979/Arc-Menu)  (1) menu style fix, (2) Asynchronously set an icon and handle errors
- @[lexruee](https://github.com/lexruee/Arc-Menu) (1) Added the shortcut 'Tweak Tool' (2) shortcut for opening the trash (3) Implement "super key/keybinding" feature and "disable/enable activities hot corner (4) Implement the menu-position-feature (5) Make file (6) Move the logic for handling settings changes in controller.js (7) Move common constants in constants.js (8) Refactor helper.js (9) Refactor some parts in menu.js (10) Implement the basic GUI option for changing the menu button text and the menu button icon (11) Update the schema file to include the new settings options (12) Add the file am.js, which provides customized GTK GUI elements for the prefs.js file (13) Replace author lexruee with Alexander Rüedlinger


- Bug Fixes: 

- @[JasonLG1979](https://github.com/JasonLG1979/Arc-Menu) (1) menu style fix
- @[lexruee](https://github.com/lexruee/Arc-Menu) (1) correctly restore the Activities button
