(function ( $ ) {

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

		wrapper.append(column);
		columnCount++;
	}

	function addNode(node, canSplit) {
		node = $(node);
		if (canSplit !== false) canSplit = true;
		
		var addedNode = addToColumn(node);
		
		if (column.height() > options.height) {
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
				if (addedNode.contents().length > 0) {
					columnize(addedNode);
				} else {
					moveToNewColumn();
					addNode(addedNode);
				}
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
	function addToColumn(node) {
		var nodeToAdd = node.clone();
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

}( jQuery ));