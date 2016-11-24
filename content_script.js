var knownChars;
document.addEventListener('keydown', keyboardShortcuts);

loadKnownChars();

function refresh() {
	walk(document.body, null);
}

function loadKnownChars() {
	knownChars = new Set();
	// var savedChars = localStorage.getItem('known_chars');

	chrome.storage.sync.get("data", function(storage) {
		if (!chrome.runtime.error) {
			savedChars = storage.data;
			console.log(savedChars);

			if (savedChars === null) { return; }

			for (var i=0; i<savedChars.length; i++){
				knownChars.add(savedChars[i]);
			}
			console.log('Loaded ' + savedChars.length + ' known characters: ', savedChars);
			refresh();
		}
	});

}

function saveKnownChars() {
	var knownCharsString = "";

	knownChars.forEach(function(v) {
		knownCharsString += v;
	});

	console.log('Saved ' + knownCharsString.length + ' known characters: ', knownCharsString);

	chrome.storage.sync.set({ "data" : knownCharsString }, function() {
		if (chrome.runtime.error) {
			console.log("Runtime error.");
		}
	});
	// localStorage.setItem('known_chars', knownCharsString);
}


function keyboardShortcuts(ev) {
	if (ev.ctrlKey && ev.altKey && ev.keyCode==82) { // alt+r
		refresh();
		ev.stopPropagation();
	} else if (ev.ctrlKey && ev.altKey && ev.keyCode==68) { // alt+d
		addToKnown(getSelectionText());
		saveKnownChars();
		refresh();
		ev.stopPropagation();
	}
}

function addToKnown(text) {
	for (var i=0; i<text.length; i++) {
		knownChars.add(text[i]);
	}
}

function getSelectionText() {
    var text = "";
    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }
    return text;
}

function walk(node, parent)
{
	// I stole this function from here:
	// http://is.gd/mwZp7E

	var child, next;

	switch ( node.nodeType )
	{
		case 1:  // Element
		case 9:  // Document
		case 11: // Document fragment
			child = node.firstChild;
			while ( child )
			{
				next = child.nextSibling;
				walk(child, node);
				child = next;
			}
			break;

		case 3: // Text node
            if(node.parentElement.tagName.toLowerCase() != "script") {
                handleText(node, parent);
            }
			break;
	}
}

function handleText(textNode, parentNode) {
	var content = parentNode.innerHTML;

	var newContent = "";
	var anyChange = false;
	for(var i=0; i<content.length; i++) {
		if (knownChars.has(content[i])) {
			anyChange = true;
			newContent += "<i style='color:red; font-style: normal;'>"+content[i]+"</i>";
		} else {
			newContent += content[i];
		}
	}

	// Deal with the easy case
	// content = content.replace(/是/g, function(match, p1, p2, offset, string) {
	// 	return "<div style='color:red; display:inline;'>是</div>";
	// });
	if (anyChange) {
		parentNode.innerHTML = newContent;
	}
}


