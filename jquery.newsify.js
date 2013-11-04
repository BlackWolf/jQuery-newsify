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
		columnWidth: 200,
		columnGap: 20,
		splitAccuracy: 10,
		cssPrefix: "newsify_",
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

	var openImages;
	var suspendedImages;

	$.fn.newsify = function( passedOptions ) {
		//We save the originalOptions because we might adjust the options for each
		//passed element which we will traverse next
		var originalOptions = $.extend({}, defaultOptions, passedOptions);

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

			//create clone of source so we keep a copy of the original data
			//we then extract the data from the source and add it to the wrapper in a columnized form
			var test = $(this);
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
			//also, respect maxHeight if set
			if (originalOptions.height == "auto") {
				options.height = $(window).height() - ($(document.body).outerHeight() - $(this).height());
			}
			if (options.maxHeight > 0) options.height = Math.min(options.height, options.maxHeight);

			$(this).empty();

			wrapper.css('height', options.height);
			//wrapper.css('width', '0px');
			//Create the initial column and put the wrapper in the DOM (otherwise it always has a height of 0)
			//then do the actual columnification
			moveToNewColumn();
			$(document.body).append(wrapper);
			columnize(source, false);
			column.css('margin-right', '0px'); //remove the right margin from the last column created

			//set the wrapper width so columns are layn out horizontally
			wrapper.css('width', (columnCount*options.columnWidth + (columnCount-1)*options.columnGap)+'px');
			
			//put the wrapper from the body to its actual destination
			$(this).append(wrapper);

			//refresh on browser resize if height is set to auto
			if (originalOptions.height == "auto" && test.data("newsify_resizeAttached") !== true) {
				var resizeTimer;
				$(window).resize(function() {
					clearTimeout(resizeTimer);
					resizeTimer = setTimeout(function() {
						test.newsify(passedOptions);
					}, 100);
				});
				test.data("newsify_resizeAttached", true);
			}
		});
	};

	function columnize(node, keepOpen) {
		node = $(node);
		if (keepOpen !== false) keepOpen = true;

		var addedContainer = node;
		if (keepOpen) {
			addedContainer = addToColumn(node.clone().empty());

			openContainers.push(addedContainer);
			openContainerTemplates.push(addedContainer.clone());
		}

		node.contents()
			.filter(function() {
				return this.nodeType !== Node.COMMENT_NODE;
			})
			.each(function () {
				//We traverse each direct child of the node here, including text nodes
				//we then add each of those nodes to our columns
				addNode(this);
			});

		if (keepOpen) {
			openContainers.pop();
			openContainerTemplates.pop();
		}
	}

	function moveToNewColumn() {
		console.log("creating new column");
		column = $('<div></div>');
		column.css({
			'display': "inline-block", 
			'width': 	options.columnWidth+'px',
			'margin-right': options.columnGap+'px',
		});
		column.addClass(options.cssPrefix+'column');

		openContainers = [];
		$.each(openContainerTemplates, function(index, template) {
			var addedContainer = addToColumn(template);

			openContainers.push(addedContainer);
		});

		//TODO too dirty. we change the width here, set the margin-right and do the same in newsify() 
		//maybe we can merge this into one somehow?
		//We need to give the new column enough space. Otherwise it might be temporarily put into a
		//new row, which messes up its position and therefore the intersection tests etc.
		wrapper.css('width', wrapper.width()+options.columnWidth+options.columnGap+'px');
		wrapper.append(column);
		columnCount++;

		//look for open images that ended in the last column and therefore are not considered "open" again
		$.each(openImages, function(index, image) {
			if (doIntersect(column, image, X_AXIS_ONLY) == false) { 
				openImages.splice(openImages.indexOf(image), 1);
				console.log("removed image");
			}
		});

		$.each(suspendedImages, function(index, image) {
			addNode(image);
			suspendedImages.splice(suspendedImages.indexOf(image), 1);
		});
	}

	function addNode(node, canSplit) {
		node = $(node);
		if (canSplit !== false) canSplit = true;
		
		var addedNode = addToColumn(node); 
		
		var doesIntersect = doIntersect(addedNode, openImages);
		if (column.height() > options.height || doesIntersect) {
			//if the column gets too high by adding this node, we need to do something
			addedNode.remove();

			if (addedNode[0].nodeType === Node.TEXT_NODE && canSplit) {
				//if the node is a text node, we can split it up into small text parts
				var text = addedNode.text();

				while (text.length > 0) {
					var firstSpaceIndex = text.indexOf(' ', options.splitAccuracy);
					var splitText = '';
					if (firstSpaceIndex != -1) {
						splitText = text.substring(0, firstSpaceIndex);
						text = text.substr(firstSpaceIndex);
					} else {
						splitText = text;
						text = '';
					}

					var splitTextNode = document.createTextNode(splitText);
					addNode(splitTextNode, false);
				}
			} else {
				//If the node is a not a text node, check if it is a leaf
				//If not, go deeper into the DOM to search for splittable elementsw
				//If yes, the node cannot be split and is moved to the next column
				//TODO: if we have a leaf that is heigher than options.height, 
				//		this will produce an infinite loop
				if (doesIntersect) {
					//TODO this is a little dirty
					//can we get the height of the intersecting image and insert a div with the same height?
					//also: what if the image ends at half the column width? we could fit text right of it!
					addToColumn($('<div style="height: 0.5em;"></div>'));
					addNode(addedNode);
				} else {
					if (addedNode.is('img')) {
						suspendedImages.push(addedNode);
					} else {
						if (addedNode.contents().length > 0) {
							columnize(addedNode);
						} else {
							moveToNewColumn();
							addNode(addedNode);
						}
					}
				}
			}
		} else {
			//everything fitted fine
			//remember all image-like elements that are wider than a single column
			if (addedNode.is('img') && addedNode.width() > options.columnWidth) {
				openImages.push(addedNode);
				console.log('detected image at '+addedNode.offset().left+', '+addedNode.offset().top+' of size '+addedNode.width()+'x'+addedNode.height());
			} else {
				addedNode.contents().filter(function() {
					return $(this).is('img');
				}).each(function () {
					//we only receive images of the node we just added
					var image = $(this);
					console.log("checking "+image.width()+" against "+options.columnWidth);
					if (image.width() > options.columnWidth) {
						//the image is wider than a column - we need to remember it
						openImages.push(image);
						console.log('detected child image at '+image.offset().left+', '+image.offset().top+' of size '+image.width()+'x'+image.height());
					}
					// images.push(image);
					// image.remove();
					// console.log('detected image of size '+image.width()+'x'+image.height());
				});
			}
		}
	}

	/**
	 ** Adds a node to the current column, respecting the currently open containers.
	 **	If no containers are open, the node is added directly to the column, otherwise
	 **	it is added to the deepest open container.
	 **
	 ** This method clones the given node and adds it in order to leave the original node untouched
	 **/
	function addToColumn(node, doClone) {
		if (doClone !== false) doClone = true;

		var nodeToAdd = node;
		if (doClone) {
			nodeToAdd = node.clone();
		}

		if (openContainers.length == 0) {
			column.append(nodeToAdd);
		} else {
			var deepestContainer = openContainers[openContainers.length-1];
			deepestContainer.append(nodeToAdd);
		}

		return nodeToAdd;
	}

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
				if (_doIntersectSingle(single1, single2, mode)) {
					returnValue = true;
					return false;
				}
			});
			if (returnValue == true) return false;
		});

		return returnValue;
	}

	function _doIntersectSingle(e1, e2, mode) {
		var e1Left, e1Right, e1Top, e1Bottom, e2Left, e2Right, e2Top, e2Bottom;

		if (e1[0].nodeType === Node.TEXT_NODE) {
			var span = $('<span></span>');
			e1.wrap(span);
			e1 = e1.parent();
		}
		e1Left = e1.offset().left;
		e1Right = e1Left + Math.max(1, e1.width());
		e1Top = e1.offset().top;
		e1Bottom = e1Top + Math.max(1, e1.height());

		if (e2[0].nodeType === Node.TEXT_NODE) {
			var span = $('<span></span>');
			e2.wrap(span);
			e2 = e2.parent();
		} 
		e2Left = e2.offset().left;
		e2Right = e2Left + Math.max(1, e2.width());
		e2Top = e2.offset().top;
		e2Bottom = e2Top + Math.max(1, e2.height());

		var intersects_x = !(e2Left >= e1Right || e2Right <= e1Left);
		var intersects_y = !(e2Top >= e1Bottom || e2Bottom <= e1Top);

		if (mode == X_AXIS_ONLY) return intersects_x;
		if (mode == Y_AXIS_ONLY) return intersects_y;
		return (intersects_x && intersects_y);

		// return !( e2Left >= e1Right
		//     || e2Right <= e1Left
		//     || e2Top >= e1Bottom
		//     || e2Bottom <= e1Top
		// );
	}

}( jQuery ));