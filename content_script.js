// BUG: multiple calls add nested elements

(function() {
    var node = document.createElement('style');
    document.body.appendChild(node);
    window.addStyleString = function(str) {
        node.innerHTML = str;
    }
}());

// addStyleString('\
//     .knownchinese { font-style: inherit; }\
//     .knownchinese.knownword { color: coral; }\
//     .knownchinese.knownchar { color: red; }\
// ');

addStyleString('\
    .knownchinese { font-style: inherit; }\
    .knownchinese.unknownword { background: -webkit-linear-gradient(left, transparent, rgba(255,0,0,.2), transparent); }\
    .knownchinese.knownword { background: -webkit-linear-gradient(left, transparent, rgba(0,255,0,.33), transparent); }\
    .knownchinese.knownchar { background: -webkit-linear-gradient(left, transparent, rgba(0,0,255,.2), transparent); }\
');

var dictionary = {};
var currentKnownWords = 0;
var currentUnknownWords = 0;
var currentKnownChars = 0;
var currentUnknownChars = 0;

function parseDictionary(progressEvent){
    // Entire file
    console.log(progressEvent);

    // By lines
    var lines = this.responseText.split('\n');
    for(var i = 0; i < lines.length; i++){
        if(lines[i][0] == "#") {
            continue;
        }

        var parsed = /([^\s]+) ([^\s]+) \[(.+)\] \/(.+)\//i.exec(lines[i]);
        var traditional = parsed[1];
        var simplified = parsed[2];
        var pinin = parsed[3].split(' ');
        var explanation = parsed[4].split('/');

        if (/\w+/g.test(traditional)) {
            continue;
        }

        // console.log(lines[i]);
        // console.log(traditional);
        // console.log(simplified);
        // console.log(pinin);
        // console.log(explanation);
        var entry = {
            'traditional': traditional,
            'simplified': simplified,
            'pinin': pinin,
            'explanation': explanation,
        }
        dictionary[simplified] = entry;
        dictionary[traditional] = entry;
    }
    console.log(Object.keys(dictionary).length);
};

var oReq = new XMLHttpRequest();
oReq.addEventListener("load", parseDictionary);
oReq.open("GET", chrome.runtime.getURL("cedict_ts.u8"));
oReq.send();

var promises = [oReq];

Promise.all(promises).then(function() {
    console.log('FINISHED');
    // returned data is in arguments[0], arguments[1], ... arguments[n]
    // you can process it here
}, function(err) {
    console.log('ERROR');
    // error occurred
});


var knownChars;
var knownWords;
document.addEventListener('keydown', keyboardShortcuts);

loadKnownChars();

function refresh() {
    currentKnownWords = 0;
    currentUnknownWords = 0;
    currentKnownChars = 0;
    currentUnknownChars = 0;

    if (Object.keys(dictionary).length==0) {
        return;
    }

    walk(document.body);

    console.log("You know: ");
    console.log(currentKnownWords/(currentKnownWords+currentUnknownWords)*100 + "% of words ");
    console.log(currentKnownChars/(currentKnownChars+currentUnknownChars)*100 + "% of characters ");
}

function loadKnownChars() {
    knownChars = new Set();
    knownWords = new Set();

    chrome.storage.sync.get("data", function(storage) {
        if (!chrome.runtime.error) {
            savedWords = storage.data.split(',');

            if (savedWords === null) { return; }

            for (var i=0; i<savedWords.length; i++){
                knownWords.add(savedWords[i]);
                for (var j=0; j<savedWords[i].length; j++){
                    knownChars.add(savedWords[i][j]);
                }
            }
            console.log('Loaded ' + savedWords.length + ' known words: ', savedWords);
            refresh();
        }
    });
}

function saveKnownChars() {
    var knownWordsArray = [];

    knownWords.forEach(function(v) {
        if(dictionary[v] !== undefined) {
            knownWordsArray.push(v);
        }
    });

    console.log('Saved ' + knownWordsArray.length + ' known words: ', knownWordsArray);

    chrome.storage.sync.set({ "data" : knownWordsArray.join(',') }, function() {
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
    knownWords.add(text);
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

// Our walker function
function walk(node) {
    // I stole this function from here:
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
    //  return "<div style='color:red; display:inline;'>是</div>";
    // });
    if (anyChange) {
        parentNode.innerHTML = newContent;
    }
}

function highlightWords(textNode) {
    var content = textNode.parentElement.innerHTML;

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
            word = content[i];
            while (i+1 < content.length && dictionary[word+content[i+1]] !== undefined) {
                word += content[++i];
            }
            anyChange = true;
            if (knownWords.has(word)) {
                newContent += "<i class='knownchinese knownword'>"+word+"</i>";
                currentKnownWords++;
                currentKnownChars += word.length;
            } else {
                currentUnknownWords++;
                newContent += "<i class='knownchinese unknownword'>";
                for (var j=0; j<word.length;j++) {
                    if (knownChars.has(word[j])) {
                        newContent += "<i class='knownchinese knownchar'>"+word[j]+"</i>";
                        currentKnownChars++;
                    } else {
                        newContent += word[j];
                        currentUnknownChars++;
                    }
                }
                newContent += "</i>";
            }
        } else {
            newContent += content[i];
        }
    }

    if (anyChange) {
        textNode.parentElement.innerHTML = newContent;
    }
}


