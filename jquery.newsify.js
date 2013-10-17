(function ( $ ) {

	//TODO: dynamically calculare the accuracy
	var options = {
		height: 600,
		splitAccuracy: 20,
		cssPrefix: "newsify_",
	};

	/** The outermost wrapper all our columns are put into **/
	var wrapper;
	/** The current column we are adding content to **/
	var column;

	/** As we traverse the DOM, we might encounter nested content and we want to keep that
		DOM structure in our columns. For this, we keep track of all open elements in this
		array **/
	var openContainers = [];
	/** This stores empty clones of the elements in "openContainers" that can be used to easily
		recreate that DOM structure if a new column starts. **/
	var openContainerTemplates = [];

	$.fn.newsify = function() {
		return this.each(function() {
			//Reset global variables
			wrapper = undefined;
			column = undefined;
			openContainerTemplates = [];
			openContainers = [];

			var source = $(this);
			wrapper = $('<div></div>');

			//Create initial column
			moveToNewColumn();

			//wrapper needs to be appended before we add elements
			//otherwise it always has a height of 0
			$(document.body).append(wrapper);

			columnize(source, false);
			
			source.append(wrapper);
			source.css('width', '1500px'); //TODO: remove
		});
	};

	function columnize(node, keepOpen) {
		node = $(node);
		if (keepOpen !== false) keepOpen = true;

		if (keepOpen) {
			var openedContainer = node.clone().empty();

			addToColumn(openedContainer);

			openContainers.push(openedContainer);
			openContainerTemplates.push(openedContainer.clone());
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
		column.css('width', '200px');
		column.css('text-align', 'justify');
		column.css('float', 'left');
		column.css('margin-right', '20px');
		column.addClass(options.cssPrefix+'column');

		openContainers = [];
		$.each(openContainerTemplates, function(index, template) {
			var theClone = template.clone();

			addToColumn(theClone);

			openContainers.push(theClone);
		});

		wrapper.append(column);
	}

	function addNode(node, canSplit) {
		node = $(node);
		if (canSplit !== false) canSplit = true;
		
		addToColumn(node);
		
		if (column.height() > options.height) {
			//the node is too high to be added
			node.remove();

			if (node[0].nodeType === Node.TEXT_NODE && canSplit) {
				//if the node is a text node, we can split it up into small text parts
				var text = node.text();

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
				//If not, go deeper into the DOM to search for splittable text
				//If yes, the node cannot be split and is moved to the next column
				//TODO: if we have a leaf that is heigher than options.height, 
				//		this will produce an infinite loop
				if (node.contents().length > 0) {
					columnize(node);
				} else {
					moveToNewColumn();
					addNode(node);
				}
			}
		}
	}

	/**
	 ** Adds a node to the current column, respecting the currently open containers.
	 **	If no containers are open, the node is added directly to the column, otherwise
	 **	it is added to the deepest open container.
	 **/
	function addToColumn(node) {
		if (openContainers.length == 0) {
			column.append(node);
		} else {
			var deepestContainer = openContainers[openContainers.length-1];
			deepestContainer.append(node);
		}
	}

}( jQuery ));