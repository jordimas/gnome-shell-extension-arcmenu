# ![Arc Menu](https://github.com/LinxGem33/Arc-Menu/blob/master/screenshots/aam.resized.png?raw=true) Arc Menu

Arc menu is a Gnome shell extension designed to replace the standard menu found in Gnome 3 this menu is based on the zorin os menu, some of the added benefits of the Arc Menu extension is the long awaited search functionality as well as quick access to files on your system and also the current logged in user along with quick access to the software centre and system settings.

##

### What's next for Arc Menu?

My first initial priority was to get this extension stable enough to upload to extensions.gnome.org as this was a menu baked into the Zorin OS operating system so it had to be ported to work with the gnome shell eco system, once I've ironed out the bugs which appear after this first release i can then move onto stage two which is to start adding new features.

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
|:1st_place_medal: :2nd_place_medal: :3rd_place_medal: Rank|Developer Name|Profile / Description|
|-----|-----|-----|
|:1st_place_medal:|![](https://avatars1.githubusercontent.com/u/649340?v=3&s=88) [**lexruee**](https://github.com/lexruee/Arc-Menu)|Programmer, Tinkerer, Single Board Computer and GNU/Linux enthusiast.|

##

### Credits

Much of the code in this extension comes from [Zorin OS menu](https://zorinos.com/).

Additional credits: This extension leverages the work for [Giovanni Campagna gnome Applications Menu](https://git.gnome.org//browse/gnome-shell-extensions) used in [ZorinOS](https://zorinos.com/) to allow the menu to be embedded in the Gnome main panel.
##
### Pull Requests

Thanks to the following people for contributing via pull requests:
- @[fishears](https://github.com/fishears/Arc-Menu) (1) compiling the schema's (2) Added suspend button and re-order buttons
- @[JasonLG1979](https://github.com/JasonLG1979/Arc-Menu)  (1) menu style fix, (2) Asynchronously set an icon and handle errors
- @[lexruee](https://github.com/lexruee/Arc-Menu) (1) Added the shortcut 'Tweak Tool' (2) shortcut for opening the trash 


- Bug Fixes: 

- @[JasonLG1979](https://github.com/JasonLG1979/Arc-Menu)  menu style fix
