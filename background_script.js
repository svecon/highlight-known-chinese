var dictionary = {};
var currentKnownWords = 0;
var currentUnknownWords = 0;
var currentKnownChars = 0;
var currentUnknownChars = 0;

var currentState = 0;

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
    console.log(Object.keys(dictionary).length);
};

var oReq = new XMLHttpRequest();
oReq.addEventListener("load", parseDictionary);
oReq.open("GET", chrome.runtime.getURL("cedict_ts.u8"));
oReq.send();

var knownWords;
loadKnownChars();

function loadKnownChars() {
    knownWords = new Set();

    chrome.storage.sync.get("data", function(storage) {
        if (!chrome.runtime.error) {
            savedWords = storage.data.split(',');

            if (savedWords === null) { return; }

            for (var i=0; i<savedWords.length; i++){
                knownWords.add(savedWords[i]);
            }
            console.log('Loaded ' + savedWords.length + ' known words: ', savedWords);
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
}

function addToKnown(text) {
    knownWords.add(text);
    for (var i=0; i<text.length; i++) {
        knownWords.add(text[i]);
    }
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
	}
});
