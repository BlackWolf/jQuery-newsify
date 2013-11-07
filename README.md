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
- **maxHeight**: The maximum height of columns in pixels. Only has an affect if height is set to `auto`. Columns will never be made larger than this size. Can be set to `-1` when the page size should be the limit. Default: `-1`.
- **columnWidth**: The width of an individual column in pixels. Default: `200`.
- **columnGap**: The space between two columns in pixels. Default: `20`.
- **cssPrefix**: The prefix that is prepended to css classes created by newsify. Default: `newsify_`.
- **splitAccuracy**: newsify tries to put as much text in a column as possible before starting a new column. This option defines how accuratly the available space for text is checked. Lower values mean space in columns is better utilized, but it needs more time to compute which can be a problem for large amounts of content. Only touch this if the columnization takes too long. Default: `10`.

### Styling the columns
newsify attaches a CSS class to every column it creates. By default, this class is `newsify_column`, but you can change that by changing the `cssPrefix` property.  

There are a few things you should remember to make your columns look good. One thing is that columized text should be justified and text should be at the top. There are only rare cases where this should not happen. You can use the following CSS to achieve that:

    .newsify_column, .newsify_column * {
	    vertical-align: top;
	    text-align: justify;
    }

Besides that, remember that elements like images often look their best when they align with the columns. So if your `columnWidth` is `200` and your `columnGap` is `20`, then your image should have a width of 200px (1 column), 420px (2 columns), 640px (3 columns) etc. to look its best.

### Examples
Some examples how to use this plugin:

* `$("#content").newsify();`: Columnize with the default options, creating columns with auto-height, a width of 200px and a gap of 20px between them
* `$("#content").newsify({height: 600});`: Create columns with exactly 600 pixels height.
* `$("#content").newsify({columnWidth: 300, columnGap: 50});`: Create columns with auto-height, but with a width of 300 pixels per column and a gap of 50 pixels between each column.

Planned Features
------------
As I said before, this plugin is currently in development. There are features planned that will be coming in the future. Amongst those are:

- non-floating images: right now images always behave "floating", which means they are pushed into the next column if necessary, changing their position in the text. There will be an option to prevent this
- auto-sizing images: Right now, image widths need to be adjusted manually to span multiple columns. In the future a `columnSpan` property will be introduced that allows users to define how many columns an image should span
- fixed number of columns: Right now, the column height and width can be set. In the future, instead of a height and width the amount of desired columns can be given

Known Issues
------------
Also, there are some known bugs in this version of the script:

- images that are higher than the columns will not work. It might even break the entire script.
- html comments are stripped in the process of columnization.

Changelog
---------
### version 0.11
- text nodes are no longer unnecessarily wrapped in <span> tags
- code cleanup

### version 0.1
- Added basic image support