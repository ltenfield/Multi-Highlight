var tabId = null;
var tabkey = null;
chrome.runtime.sendMessage(
	{
		action: "getTabId",
	},
	function (response) {
		// new page initialization 
		tabId = response.tabId;
		tabkey = get_tabkey(tabId);

		// https://t.ly/R-Dq
		var MutationObserver =
			window.MutationObserver || window.WebKitMutationObserver;
		var MutationObserverConfig = {
			childList: true,
			subtree: true,
			characterData: true,
		};
		var observer = new MutationObserver(function (mutations) {
			chrome.storage.local.get(["settings", tabkey], function (result) {
				var settings = result.settings;
				var tabinfo = result[tabkey];
				// console.log("vinc: " + tabinfo.keywords);
				if (settings.isOn && settings.isAlwaysSearch){ // refresh if extension is on
					console.log("[Multi-Highlight] MutationObserver")
					hl_refresh(tabinfo.keywords, settings, tabinfo);
				}
			});
		});
		observer.observe(document.body, MutationObserverConfig);

		chrome.runtime.onMessage.addListener(function (
			request,
			sender,
			sendResponse
		) {
			if (request.action == "hl_clearall") {
				chrome.storage.local.get(["settings", tabkey], function (result) {
					var settings = result.settings;
					var tabinfo = result[tabkey];
					hl_clearall(settings, tabinfo);
				});
				sendResponse({ action: "null"});
			} else if (request.action == "hl_refresh") {
				chrome.storage.local.get(["settings", tabkey], function (result) {
					var settings = result.settings;
					var tabinfo = result[tabkey];
					hl_refresh(request.inputKws, settings, tabinfo);
				});
				sendResponse({ action: "null"});
			} else if (request.action == "_hl_search") {
				chrome.storage.local.get(["settings", tabkey], function (result) {
					var settings = result.settings;
					var tabinfo = result[tabkey];
					_hl_search(request.addedKws, settings, tabinfo);
				});
				sendResponse({ action: "null"});
			} else if (request.action == "_hl_clear") {
				chrome.storage.local.get(["settings", tabkey], function (result) {
					var settings = result.settings;
					var tabinfo = result[tabkey];
					_hl_clear(request.removedKws, settings, tabinfo);
				});
				sendResponse({ action: "null"});
			}
		});

		function hl_refresh(Kws, settings, tabinfo) { // remove all highlights, and rehighlight input Kws
			console.log("[Multi-Highlight] hl_refresh: " + Kws);
			hl_clearall(settings, tabinfo);
			_hl_search(Kws, settings, tabinfo);
		}

		function _hl_search(addedKws, settings, tabinfo) {
			console.log("[Multi-Highlight] _hl_search: " + addedKws);

			isWholeWord = TrueOrFalse(settings.isWholeWord);
			isCasesensitive = TrueOrFalse(settings.isCasesensitive);
			clsPrefix = settings.CSSprefix1 + " " + settings.CSSprefix2;

			addedKws.sort((firstElem, secondElem) => {
				return secondElem.kwStr.length - firstElem.kwStr.length;
			});
			// console.log(addedKws);
			var code = addedKws
				.map((kw) => {
					var cls =
						clsPrefix +
						kw.kwGrp +
						" " +
						settings.CSSprefix3 +
						encodeURI(kw.kwStr);
					return (
						"$(document.body).highlight(" +
						`'${KeywordEscape(kw.kwStr)}', ` +
						`{className: '${cls}', wordsOnly: ${isWholeWord}, caseSensitive: ${isCasesensitive}, element: '${settings.element}'  ` +
						"});"
					);
				})
				.join("\n");
			// console.log(code);
			observer.disconnect();
			eval(code);
			observer.observe(document.body, MutationObserverConfig);
			// if(option.fromBgOrPopup){
			// 	chrome.tabs.executeScript(tabinfo.id, { code: code }, _ => chrome.runtime.lastError);
			// }else{
			// 	eval(code);
			// }
		}

		function _hl_clear(removedKws, settings, tabinfo) {
			code = removedKws
				.flatMap((kw) => {
					// if(kw.length < 1) return "";
					className = (settings.CSSprefix3 + encodeURI(kw.kwStr)).replace(
						/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g,
						"\\\\$&"
					);
					return (
						`$(document.body).unhighlight({className:'${className}', element: '${settings.element}'})`
					);
				})
				.join(";\n");
			console.log(`[Multi-Highlight] _hl_clear: ${removedKws.length}` + removedKws );
			console.log("[Multi-Highlight] REMOVE: " + code);
			observer.disconnect();
			eval(code);
			observer.observe(document.body, MutationObserverConfig);
			// if(option.fromBgOrPopup){
			// 	chrome.tabs.executeScript(tabinfo.id, {code: code}, _ => chrome.runtime.lastError);
			// }else{
			// 	eval(code);
			// }
			// settings.isNewlineNewColor || (tabinfo.style_nbr -= removedKws.length);
		}

		function hl_clearall(settings, tabinfo) {
			var code =
				"$(document.body).unhighlight({className:'" +
				settings.CSSprefix1 +
				`', element: '${settings.element}'})`;
			observer.disconnect();
			eval(code);
			observer.observe(document.body, MutationObserverConfig);
			// console.log("REMOVE: " + code);
			// if(option.fromBgOrPopup){
			// 	chrome.tabs.executeScript(tabinfo.id, {code: code }, _ => chrome.runtime.lastError);
			// }else{
			// 	eval(code);
			// }
		}
	}
);
