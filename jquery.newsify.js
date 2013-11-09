(function ( $ ) {
	//Constants
	var BOTH_AXIS = 0;
	var X_AXIS_ONLY = 1;
	var Y_AXIS_ONLY = 2;

	//TODO: dynamically calculare the accuracy
	/** Defaults for options **/
	var defaultOptions = {
		height: "auto",
		maxHeight: -1,
		minHeight: -1,
		columnWidth: 200,
		columnGap: 20,
		splitAccuracy: 10,
		prefix: "newsify_",
	};

	/** options should be available globally, so we define the options var here **/
	var options;
	/** The outermost wrapper all our columns are put into **/
	var wrapper;
	/** The current column we are adding content to **/
	var column;
	/** Counter of how many columns we added so far **/
	var columnCount;

	/** As we traverse the DOM, we might encounter nested content and we want to keep that
		DOM structure in our columns. For this, we keep track of all open elements in this
		array **/
	var openContainers;
	/** This stores empty clones of the elements in "openContainers" that can be used to easily
		recreate that DOM structure if a new column starts. **/
	var openContainerTemplates;

	/** Stores the images that intersect the current column in some way **/
	var openImages;
	/** Remembers the images that did not fit in the current column and need to be 
		inserted into the next column **/
	var suspendedImages;

	$.fn.newsify = function(passedOptions) {
		var originalOptions = $.extend({}, defaultOptions, passedOptions);
		
		//Legacy options
		//"prefix" was "cssPrefix" earlier
		if ('cssPrefix' in originalOptions) {
			console.warn("newsify: Option 'cssPrefix' is deprecated. Use 'prefix' instead.");
			
			if (('prefix' in passedOptions) == false) {
				originalOptions.prefix = originalOptions.cssPrefix;	
			}
			delete originalOptions.cssPrefix;
		}
		
		//Options sanity checks
		if (originalOptions.minHeight > 0 && originalOptions.maxHeight > 0 && originalOpptions.minHeight > originalOptions.maxHeight) {
			var t = originalOptions.minHeight;
			originalOptions.minHeight = originalOptions.maxHeight;
			originalOptions.maxHeight = t;
		}

		return this.each(function() {
			//Reset global variables
			wrapper = undefined;
			column = undefined;
			columnCount = 0;
			openContainerTemplates = [];
			openContainers = [];
			openImages = [];
			suspendedImages = [];
			options = $.extend(true, {}, originalOptions);

			//keep a copy of the original element for when we need to refresh the columns
			var source;
			if ($(this).data("newsify_source") == undefined) {
				source = $(this).clone(); 
				source.attr("id", getUnusedID());
				source.css("display", "none");
				$(document.body).append(source);
				$(this).data("newsify_source", source.attr("id"));
			} else {
				source = $("#"+$(this).data("newsify_source"));
			}

			wrapper = $('<div></div>');

			//If height is set to auto, make the columns fill the browser
			if (originalOptions.height == "auto") {
				options.height = $(window).height() - ($(document.body).outerHeight() - $(this).height());
			}
			if (options.maxHeight > 0) options.height = Math.min(options.height, options.maxHeight);
			if (options.minHeight > 0) options.height = Math.max(options.height, options.minHeight);

			//$(this) was cloned into source, now empty $(this) and fill it with columns
			$(this).empty();

			//the wrapper needs to be in the DOM before we start, otherwise columns will
			//always have a height of 0.
			wrapper.css('height', options.height);
			moveToNewColumn();
			$(this).append(wrapper);
			columnizeContainer(source, false);
			
			//TODO do stuff in case we have openImages at this point (they exceed the last column)

			column.css('margin-right', '0px'); //remove the right margin from the last column created

			//set the correct wrapper width so columns are layn out horizontally
			wrapper.css('width', (columnCount*options.columnWidth + (columnCount-1)*options.columnGap)+'px');

			if (originalOptions.height == "auto" && $(this).data("newsify_resizeAttached") !== true) {
				attachNewsifyOnWindowResize($(this));				
				$(this).data("newsify_resizeAttached", true);
			}
		});
	};
	
	/**
	 ** Columnizes the contents of the given container. if keepOpen is set to true, the
	 ** container itself will also be added, keeping the original DOM tree intact. Be aware
	 ** that keepOpen=true also means that container might be added multiple times if 
	 ** it does not fit into the current column entirely.
	 **/
	function columnizeContainer(container, keepOpen) {
		container = $(container);
		if (keepOpen !== false) keepOpen = true;

		//if keepOpen=true, add the container itself to the current column. 
		//remember the container (so we can add its child into it)
		//and a template of the container (so we can clone it when a new column starts)
		if (keepOpen) {
			var emptyContainer = container.clone().empty();
	
			insertNodeIntoColumn(emptyContainer);
			
			openContainers.push(emptyContainer);
			openContainerTemplates.push(emptyContainer.clone());
		}

		container.contents().filter(function() {
			return this.nodeType !== Node.COMMENT_NODE;
		})
		.each(function () {
			newColumnizeNode(this);
		});

		if (keepOpen) {
			openContainers.pop();
			openContainerTemplates.pop();
		}
	}
	
	function newColumnizeNode(node, splitTextNode) {
		node = $(node);
		if (splitTextNode !== false) splitTextNode = true;
		
		var nodeClone = node.clone();
		
		if (nodeClone.is('img')) {
			_sizeImage(nodeClone);
		} else {
			nodeClone.contents().filter(function() { return $(this).is('img'); })
			.each(function () {
				_sizeImage(this);
			});
		}
		
		insertNodeIntoColumn(nodeClone); 
		
		var doesIntersect = doIntersect(nodeClone, openImages);
		if (column.height() > options.height || doesIntersect) {
			nodeClone.remove();
			
			if (node[0].nodeType === Node.TEXT_NODE && splitTextNode) {
				_splitTextNode(node);
				return false;
			}
			
			if (doesIntersect) {
				insertNodeIntoColumn($('<div style="height: 0.5em;"></div>')); 
				newColumnizeNode(node);
				return false;
			}
			
			if (node.is('img')) {
				suspendedImages.push(node.clone());
				return false;
			}
			
			if (node.contents().length > 0) {
				columnizeContainer(node);
				return false;
			}
			
			moveToNewColumn();
			newColumnizeNode(node);
		} else {
			//the node fitted in the column. remember images that span more than the current column
			//this allows us to avoid text intersecting with those images in successive columns
			if (nodeClone.is('img')) {
				if (nodeClone.width() > options.columnWidth) {
					openImages.push(nodeClone);
				}
				return false;
			}
			
			nodeClone.contents().filter(function() { return $(this).is('img'); })
			.each(function () {
				var image = $(this);
				if (image.width() > options.columnWidth) {
					openImages.push(image);
				}
			});
		}
	}
	
	/**
	 ** Adds a node to the current column, respecting the currently open containers.
	 **	If no containers are open, the node is added directly to the column, otherwise
	 **	it is added to the deepest open container.
	 **/
	function insertNodeIntoColumn(node) {
		if (openContainers.length == 0) {
			column.append(node);
		} else {
			var deepestContainer = openContainers[openContainers.length-1];
			deepestContainer.append(node);
		}
	}
	
	function moveToNewColumn() {		
		column = $('<div></div>');
		column.css({
			'display': "inline-block", 
			'width': 	options.columnWidth+'px',
			'margin-right': options.columnGap+'px',
		});
		column.addClass(options.prefix+'column');

		//clone all open container templates into the new column. this is done so the DOM structure is kept. 
		//example: a new column starts in the middle of a div with class "foo"
		//when the new column starts, the div is closed and this code creates a new div with class foo in the new column
		openContainers = [];
		$.each(openContainerTemplates, function(index, template) {
			var container = template.clone();
			insertNodeIntoColumn(container);

			openContainers.push(container);
		});

		//TODO too dirty. we change the width here, set the margin-right and do the same in newsify() 
		//maybe we can merge this into one somehow?
		//We need to give the new column enough space. Otherwise it might be temporarily put into a
		//new row, which messes up its position and therefore the intersection tests
		wrapper.css('width', wrapper.width()+options.columnWidth+options.columnGap+'px');
		wrapper.append(column);
		columnCount++;

		//close images that ended in the last column
		var remainingOpenImages = [];
		$.each(openImages, function(index, image) {
			if (doIntersect(column, image, X_AXIS_ONLY) == true) {
				remainingOpenImages.push(image); 
			}
		});
		openImages = remainingOpenImages;

		//add suspended images to the new column
		//if an image still doesn't fit it is re-added to suspendedImages by columnizeNode()
		var suspendedImagesCopy = suspendedImages.slice(0);
		suspendedImages = [];
		$.each(suspendedImagesCopy, function(index, image) {
			newColumnizeNode(image);
		});
	}
		
	/**
	 ** Splits a text node into chunks of text and adds each chunk to the column separately.
	 ** This allows us to distribute text nodes over multiple columns.
	 ** Don't call directly, use columnizeNode() instead.
	 **/
	function _splitTextNode(node) {
		var text = node.text();
		
		while (text.length > 0) {
			var spaceIndex = text.indexOf(' ', options.splitAccuracy);
			var splittedText = '';
			if (spaceIndex != -1) {
				splittedText = text.substring(0, spaceIndex);
				text = text.substr(spaceIndex);
			} else {
				splittedText = text;
				text = '';
			}
			
			var splittedTextNode = document.createTextNode(splittedText);
			newColumnizeNode(splittedTextNode, false);
		}
	}
	
	/** 
	 ** Sets the size of an image, taking sizing attributes 
	 ** and constraints like column height into account.
	 **/
	function _sizeImage(image) {
		image = $(image);
		
		var nativeWidth = image[0].naturalWidth;
		var nativeHeight = image[0].naturalHeight;
		
		if (image.attr(options.prefix+"columnSpan")) {
			var columnSpan = image.attr(options.prefix+"columnSpan");
			if (/^[0-9]+$/.test(columnSpan) == true) {
				//columnSpan property of image was given - size image to span as many columns
				
				var newWidth, newHeight;
				do {
					newWidth = columnSpan*options.columnWidth + (columnSpan-1)*options.columnGap;
					newHeight = nativeHeight * (newWidth/nativeWidth);
					
					columnSpan--;
				} while (newWidth > nativeWidth && image.attr(options.prefix+'allowOverscale') != "true" && columnSpan > 0)
				
				if (newWidth > nativeWidth) {
					//the image is smaller than a single column
					newWidth = nativeWidth;
					newHeight = nativeHeight;	
				}
				
				image.css('width', newWidth+'px');
				image.css('height', newHeight+'px');
			} else {
				console.warn("newsify: columnSpan property is not a number for image "+image.attr('src'));
			}
		}
		
		//Determine if width and height were explictly set by the user
		//Also, make sure that if width/height were only set as the element attribute, they
		//are copied to the CSS of the image so jQuery's height()/width() return correct values
		if (image.attr('height') == undefined && image[0].style.height.length == 0) {
			image.data("newsify_explicit_height", false);
			image.css('height', nativeHeight);
		} else {
			image.data("newsify_explicit_height", true);
			if (image[0].style.height.length == 0) {
				image.css('height', image.attr('height')+'px');
			}
		}
		if (image.attr('width') == undefined && image[0].style.width.length == 0) {
			image.data("newsify_explicit_width", false);
			image.css('width', nativeWidth);
		} else {
			image.data("newsify_explicit_width", true);
			if (image[0].style.width.length == 0) {
				image.css('width', image.attr('width')+'px');
			}
		}
		
		//No image is allowed to be higher than a column
		if (image.height() > options.height) {
			var newHeight = options.height;
			var newWidth = nativeWidth * (newHeight/nativeHeight);
			
			image.css('height', newHeight+'px');
			if (image.data("newsify_explicit_width") != true) image.css('width', newWidth+'px');
		}
	}

	/**
	 ** Returns an element ID that is not used in the document yet.
	 **/
	function getUnusedID() {
		var counter = 1;
		while ($("#newsifyClone"+counter).length > 0) {
			counter++;
		}

		return "newsifyClone"+counter;
	}

	/**
	 ** Checks if two elements intersect. If so returns true.
	 ** Both parameters can be arrays of elements instead. If so, if any of the elements in the first array
	 ** intersect any of the elements in the second array, this will return true.
	 **/
	function doIntersect(e1, e2, mode) {
		if (e1 == undefined || e2 == undefined) return false;
		if ($.isArray(e1) && e1.length == 0) return false;
		if ($.isArray(e2) && e2.length == 0) return false;
		if (mode == undefined) mode = BOTH_AXIS;

		if ($.isArray(e1) === false) e1 = [e1];
		if ($.isArray(e2) === false) e2 = [e2];

		var returnValue = false;
		$.each(e1, function(index, single1) {
			$.each(e2, function(index, single2) {
				if (_doesIntersect(single1, single2, mode)) {
					returnValue = true;
					return false;
				}
			});
			if (returnValue == true) return false; //skip the outer loop
		});

		return returnValue;
	}

	/**
	 ** Returns true if two elements intersect. Should not be used, use
	 ** doIntersect() instead.
	 **/
	function _doesIntersect(e1, e2, mode) {
		var e1Left, e1Right, e1Top, e1Bottom, e2Left, e2Right, e2Top, e2Bottom;
		var originalE1, originalE2;

		//text nodes do not have a position, therefore we wrap them in a span
		if (e1[0].nodeType === Node.TEXT_NODE) {
			originalE1 = e1;
			var span = $('<span></span>');
			e1.wrap(span);
			e1 = e1.parent();
		}
		e1Left = e1.offset().left;
		e1Right = e1Left + Math.max(1, e1.width());
		e1Top = e1.offset().top;
		e1Bottom = e1Top + Math.max(1, e1.height());

		//text nodes do not have a position, therefore we wrap them in a span
		if (e2[0].nodeType === Node.TEXT_NODE) {
			originalE2 = e2;
			var span = $('<span></span>');
			e2.wrap(span);
			e2 = e2.parent();
		} 
		e2Left = e2.offset().left;
		e2Right = e2Left + Math.max(1, e2.width());
		e2Top = e2.offset().top;
		e2Bottom = e2Top + Math.max(1, e2.height());
		
		//if e1 and/or e2 were text nodes and wrapped in a span, unwrap them
		if (originalE1 !== undefined) originalE1.unwrap();
		if (originalE2 !== undefined) originalE2.unwrap();

		var intersects_x = !(e2Left >= e1Right || e2Right <= e1Left);
		var intersects_y = !(e2Top >= e1Bottom || e2Bottom <= e1Top);

		if (mode == X_AXIS_ONLY) return intersects_x;
		if (mode == Y_AXIS_ONLY) return intersects_y;
		return (intersects_x && intersects_y);
	}

	/**
	 ** Attaches a resize handler on the window that columnizes the passed element
	 ** when the window is resized.
	 **/
	function attachNewsifyOnWindowResize(el) {
		var resizeTimer;
		$(window).resize(function() {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function() {
				el.newsify(passedOptions);
			}, 100);
		});
	}
}( jQuery ));