jQuery-newsify
==============

A plugin for jQuery that reformats text and other media into columns. In contrast to CSS3 columns and jQuery columnizer it is designed to support other media like images inside the columns and can handle any kind of nested content in your text.

### A word of caution
First of all, this plugin is currently in development and in **beta state**. There is a lot of functionality missing as of now and bugs can happen! If you find a problem, feel free to open an issue on github.  

Secondly, this plugin makes deep changes to the DOM structure. It is designed to work in as much environments as possible, but there might be cases where using this plugin might simply not work or requires some changes to your site. But as I said, it is designed to work for as many cases as possible as flawless as possible, so give it a try!

Installation
------------
Like any other jQuery plugin: You need to include jQuery (1.10) and this plugin into the header of your webpage:

    <head>
        <script src="./path/to/js/jquery-1.10.2.js"></script>
        <script src="./path/to/js/newsify/jquery.newsify.js"></script>
    </head>

How to use?
-----------
After including the plugin, you can columnize any element on your page by simply calling the `newsify()` method on it:

    $("#content").newsify();

will create columns out of the content of the DOM element with ID `content`.  

### Options
By default, the columns will be automatically made as high as possible without introducing vertical scrolling to your page. You can customize your columns with different options:

- **height**: Defines the maximium height of a column. Can be set to a number, like `600`, which is a pixel-value, or to `auto` to make the columns as high as the page allows them to be without introducing vertical scrolling. Using `auto` also automatically refreshes the columns when the browser window is resized. Default: `auto`.
- **maxHeight**: The maximum height of columns in pixels. Only applies if **height** is set to `auto`. Auto-sized columns will never exceed this height. If set to `-1`, columns will be made as high as possible without introducing vertical scrolling to the page. Default: `-1`.
- **minHeight**: The minimum height of columns in pixels. Only applies if **height** is set to `auto`. Auto-sized columns will never be smaller than this height. If set to `-1`, columns will be made as high as possible without introducing vertical scrolling to the page. Default: `-1`.
- **columnWidth**: The width of an individual column in pixels. Default: `200`.
- **columnGap**: The space between two columns in pixels. Default: `20`.
- **cssPrefix**: The prefix that is prepended to css classes created by newsify. Default: `newsify_`.
- **splitAccuracy**: newsify tries to put as much text in a column as possible before starting a new column. This option defines how accurately the available space is checked. Lower values mean space in columns is better utilized, but it needs more time to compute which can be a problem for large amounts of content. Only touch this if the columnization takes too long. Default: `10`.

#### Wait, what does height: auto do?
The default for the `height` option is the value `auto`. This value can be used, for example, if you want your website to have a horizontal layout. It will determine the height of your page and make columns exactly the height so they fit in the browser window. This means that with this option. newsify will prevent vertical scrolling in your webpage. The nice thing is that the columns will automatically adjust when the user resizes the browser window.   
Be aware that, without setting `minHeight` or `maxHeight`, newsify might also make your columns extremly small or big in very small or very big browser windows.  

For a live example of this option, see the "autoHeight.html" in the "examples" folder.

### Styling the columns
newsify attaches a CSS class to every column it creates. By default, this class is `newsify_column`, but you can change that by changing the `prefix` property.  

One thing that should be done on almost any page is justifying the column content. You can use the following CSS snippet to do that with the default `prefix` option:

    .newsify_column, .newsify_column * {
	    vertical-align: top;
	    text-align: justify;
    }

### Auto-sizing images
newsify provides the ability to auto-size images with the help of an additional html attribute. By default that attribute is `newsify_columnSpan`, but the prefix can be changed by setting the `prefix` option. You can then use the attribute on any image in your columnized content:

    <img src="./img/someImage.png" newsify_columnSpan="2"/>
    
This will tell newsify that it should be responsible for sizing the image and it will make the image span exactly two columns. As you can see, you don't even need to specify any width and height for the image.  
Be aware that if the image resolution is not large enough to support the given number of columns, newsify will use a value for `columnSpan` that the image supports. If you want to suppress this behaviour (and therefore become overscaled, blurry images) you can set the `newsify_allowOverscale` property to `true`.

For a live example of this option, see the "imageColumnSpan.html" in the "examples" folder.

### Examples
Some examples how to use this plugin:

* `$("#content").newsify();`: Columnize with the default options, creating columns with auto-height, a width of 200px and a gap of 20px between them
* `$("#content").newsify({height: 600});`: Create columns with exactly 600 pixels height.
* `$("#content").newsify({columnWidth: 300, columnGap: 50});`: Create columns with auto-height, but with a width of 300 pixels per column and a gap of 50 pixels between each column.

Planned Features
------------
As I said before, this plugin is currently in development. There are features planned that will be coming in the future. Amongst those are:

- non-floating images: right now images always behave "floating", which means they are pushed into the next column if necessary, changing their position in the text. There will be an option to prevent this
- fixed number of columns: Right now, the column height and width can be set. In the future, instead of a height and width the amount of desired columns can be given
- magnetic images: it should be possible to set an attribute on images to attach them to other images. This can for example be used to make sure two images are always displayed next to each other, or two images slighly overlapping, to give the columns a more "magazine"-like feeling
- testing and adjusting image-sizing features for retina displays

Known Issues
------------
Also, there are some known bugs in this version of the script:

- if the `height` option is set to `auto` but the webpage is already heigher than the browser window, the script may break.
- if images are columnized, text lines below the image might have slighly off y-position compared to imageless columns
- html comments are stripped in the process of columnization.
- when an auto-sized image is sized to full column height, there might be an empty space to its right
- margin/padding is not taken into account when positioning and sizing images: for example, an image that has more bottom-margin than a column is high will never be columnized to the screen. also, an image with margin-left/right will still be auto-sized as if it had no margin at all

Changelog
---------
### version 0.2
- introduced `minHeight` option
- introduced the `columnSpan` and `allowOverscale` attributes for iamges
- some bug fixes in regard to image sizes, especially a major bug with images higher than columns. from now on, images can never be higher than the columns.
- fixed a bug where multiple images close to each other would break the script

### version 0.11
- text nodes are no longer unnecessarily wrapped in `<span>` tags
- major code cleanup

### version 0.1
- Added basic image support