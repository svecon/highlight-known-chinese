var dictionary = null;

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if (request.enable) {
			refresh();
		} else {
			removeHighlights();
		}
});

var dict = chrome.runtime.connect({name: "knownchinese-dict"});
var saver = chrome.runtime.connect({name: "knownchinese-saver"});
dict.onMessage.addListener(function(msg) {

	el = document.getElementById(msg.id);

	var cssclass;
	if (msg.char) {
		if (msg.knownword) {
			cssclass = 'knownchar';
		} else {
			cssclass = 'unknownchar';
		}
	} else {
		if (msg.knownword) {
			cssclass = 'knownword';
		} else {
			cssclass = 'unknownword';
		}
	}

	el.classList.add(cssclass);
});

(function() {
    var node = document.createElement('style');
    document.body.appendChild(node);
    window.addStyleString = function(str) {
        node.innerHTML = str;
    }
}());

addStyleString('\
                          .knownchinese-element { font-style: inherit; }\
    .knownchinese-enabled .knownchinese-element.unknownword { background: -webkit-linear-gradient(left, transparent, rgba(255,0,0,.2), transparent); }\
    .knownchinese-enabled .knownchinese-element.unknownword .knownchinese-element.knownchar { background: -webkit-linear-gradient(left, transparent, rgba(0,0,255,.2), transparent); }\
    .knownchinese-enabled .knownchinese-element.knownword { background: -webkit-linear-gradient(left, transparent, rgba(0,255,0,.33), transparent); }\
');

var currentState = 0;

document.addEventListener('keydown', keyboardShortcuts);
document.body.classList.add('knownchinese', 'knownchinese-enabled');

function refresh() {
	if (dictionary === null) {
		chrome.runtime.sendMessage({want: "dictionary"}, function(response) {
			dictionary = response.dictionary;
			refresh();
		});
		return;
	}

    walk(document.body);
}

function keyboardShortcuts(ev) {
    if (ev.shiftKey && ev.altKey && ev.keyCode==82) { // r
        removeHighlights();
        refresh();
        ev.stopPropagation();
    } else if (ev.shiftKey && ev.altKey && ev.keyCode==65) { // a
    	saver.postMessage({save:true, word:getSelectionText()});
    	removeHighlights();
        refresh();
        ev.stopPropagation();
    } else if (ev.shiftKey && ev.altKey && ev.keyCode==68) { // d
        saver.postMessage({save:false, word:getSelectionText()});
    	removeHighlights();
        refresh();
        ev.stopPropagation();
    } else if (ev.shiftKey && ev.altKey && ev.keyCode==84) { // t
        removeHighlights();
        ev.stopPropagation();
    } else if (ev.shiftKey && ev.altKey && ev.keyCode==79) { // o
        chrome.runtime.sendMessage({want: "options"});
        ev.stopPropagation();
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

// Our walker function
function walk(node) {
    // http://is.gd/mwZp7E
    var child, next;
    switch (node.nodeType) {
        case 1:  // Element
        case 9:  // Document
        case 11: // Document fragment
            child = node.firstChild;
            while (child) {
                next = child.nextSibling;
                walk(child);
                child = next;
            }
            break;
        case 3: // Text node
            highlightWords(node);
            break;
    }
}

function randId() {
	return "knownchinese-"+Math.random().toString(36).substr(2, 10);
}

function highlightWords(textNode) {
    var content = textNode.data;

	var temp = document.createElement('div');

    var newContent = "";
    var word = "";
    var anyChange = false;
    var insideTag = false;
    for(var i=0; i<content.length; i++) {
        if (content[i] == "<") {
            insideTag  = true;
        } else if (content[i] == ">") {
            insideTag = false;
        }

        if (!insideTag && dictionary[content[i]] !== undefined) {
            anyChange = true;

            word = content[i];
            while (i+1 < content.length && dictionary[word+content[i+1]] !== undefined) {
                word += content[++i];
            }
            
            var id = randId();
            dict.postMessage({text: word, id: id, char:false});
            newContent += "<i class='knownchinese-element' id='"+id+"'>";
			for (var j=0; j<word.length;j++) {
				var id = randId();
            	dict.postMessage({text: word[j], id: id, char:true});
                newContent += "<i class='knownchinese-element' id='"+id+"'>"+word[j]+"</i>";
            }
            newContent += "</i>";
        } else {
            newContent += content[i];
        }
    }

    if (anyChange) {
    	temp.innerHTML = newContent;

	    while (temp.firstChild) {
	        textNode.parentNode.insertBefore(temp.firstChild, textNode);
	    }
	    textNode.parentNode.removeChild(textNode);
    }
}

function removeHighlights() {
    
    var nodes = null;
	while((nodes = document.getElementsByClassName("knownchinese-element")).length > 0) {

		for (var i=0; i<nodes.length; i++) {
			var node = nodes[i];
			node.parentNode.insertBefore(document.createTextNode(node.textContent), node);
	    	node.parentNode.removeChild(node);
		}
	}
}
