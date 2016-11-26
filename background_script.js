var dictionary = {};
var currentKnownWords = 0;
var currentUnknownWords = 0;
var currentKnownChars = 0;
var currentUnknownChars = 0;

var currentStatePerTab = {};

function parseDictionary(progressEvent){
    // Entire file
    // By lines
    var lines = this.responseText.split('\n');
    for(var i = 0; i < lines.length; i++){
        if(lines[i][0] == "#") {
            continue;
        }

        // var parsed = /([^\s]+) ([^\s]+) \[(.+)\] \/(.+)\//i.exec(lines[i]);
        var parsed = /([^\s]+) ([^\s]+)/i.exec(lines[i]);
        var traditional = parsed[1];
        var simplified = parsed[2];
        // var pinin = parsed[3].split(' ');
        // var explanation = parsed[4].split('/');

        if (/\w+/g.test(traditional)) {
            continue;
        }

        var entry = {
            'traditional': traditional,
            'simplified': simplified,
            // 'pinin': pinin,
            // 'explanation': explanation,
        }
        dictionary[simplified] = entry;
        dictionary[traditional] = entry;
    }
    // console.log(Object.keys(dictionary).length);
};

var oReq = new XMLHttpRequest();
oReq.addEventListener("load", parseDictionary);
oReq.open("GET", chrome.runtime.getURL("dictionaries/cedict_ts.u8"));
oReq.send();

var knownWords;
loadKnownChars();

function loadKnownChars() {
    knownWords = new Set();

    chrome.storage.sync.get("data", function(storage) {
        if (chrome.runtime.error) {
        	console.log("Runtime error.");
        	return;
        }
        if (storage.data === null) { return; }

        knownWords = new Set(storage.data);
        // console.log('Loaded ' + knownWords.size + ' known words: ', knownWords);
    });
}

function saveKnownChars() {
    console.log('Saved ' + knownWords.size + ' known words: ', knownWords);

    chrome.storage.sync.set({ data: Array.from(knownWords) }, function() {
        if (chrome.runtime.error) {
            console.log("Runtime error.");
        }
    });
}

function addAllToKnown(arr) {
	for (var i=0; i<arr.length;i++) {
		addToKnown(arr[i]);
	}
}

function addToKnown(text) {
    if(dictionary[text] !== undefined) {
        knownWords.add(text);
    }
    
    // for (var i=0; i<text.length; i++) {
    // 	if(dictionary[text[i]] !== undefined) {
	   //      knownWords.add(text[i]);
	   //  }
    // }
}

function removeFromKnown(text) {
    knownWords.delete(text);
}

chrome.runtime.onConnect.addListener(function(port) {
	if (port.name == "knownchinese-dict") {
		port.onMessage.addListener(function(msg) {
			port.postMessage({
				id: msg.id,
				char: msg.char,
				knownword: knownWords.has(msg.text),
			});
		});
	} else if (port.name == "knownchinese-saver") {
		port.onMessage.addListener(function(msg) {
			if (msg.save) {
				addToKnown(msg.word);
			} else {
				removeFromKnown(msg.word);
			}
			saveKnownChars();
		});
	}
});

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
	if (request.want == "dictionary") {
		sendResponse({dictionary: dictionary});
	} else if (request.want == "knownwords") {
		sendResponse({knownwords: Array.from(knownWords)});
	} else if (request.want == "options") {
		chrome.tabs.create({'url': chrome.extension.getURL('options.html'), 'selected': true});
	} else if (request.want == "saveall") {
		if(request.overwrite) {
			knownWords = new Set();
		}
		addAllToKnown(request.input);
		saveKnownChars();
		sendResponse({knownwords: Array.from(knownWords)});
	}
});

chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		
		if (currentStatePerTab[tabs[0].id] === undefined) {
			currentStatePerTab[tabs[0].id] = 0;
			chrome.tabs.sendMessage(tabs[0].id, {enable: true});
		} else {
			delete currentStatePerTab[tabs[0].id];
			chrome.tabs.sendMessage(tabs[0].id, {enable: false});
		}
	});
});

