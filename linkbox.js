javascript:(function () {
    "use strict";

    var Linkbox = (function () {
        var plainLinkRegex = /(\b(?:https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        var blacklistRegex = /^(mailto|javascript)\:/i;
        var filterGeneric = function (v) { return !!v; };
        var slice = Array.prototype.slice;

        var dash = function (v) {
            return v.replace(/([A-Z])/g, "-$1").toLowerCase();
        };

        var createElement = function (type, props, doc) {
            doc = doc || document;
            var elem = doc.createElement(type);

            Object.keys(props).forEach(function (name) {
                if (name === "text") {
                    elem.appendChild(doc.createTextNode(props[name]));
                }
                else if (name === "html") {
                    elem.innerHTML = props[name];
                }
                else if (name === "events") {
                    Object.keys(props[name]).forEach(function (key) {
                        elem.addEventListener(key, props[name][key]);
                    });
                }
                else if (name === "children") {
                    props[name].forEach(function (child) {
                        elem.appendChild(child);
                    });
                }
                else if (name === "style") {
                    elem.style.cssText = cssifyRule(props[name]);
                }
                else if (name === "cssText") {
                    elem.style.cssText = props[name];
                }
                else if (name === "parent") {
                    props[name].appendChild(elem);
                }
                else if (name in elem) {
                    elem[name] = props[name];
                }
                else {
                    elem.setAttribute(name, props[name]);
                }
            });

            return elem;
        };

        var removeChildren = function (selector, doc) {
            var element = (doc || document).querySelector(selector);
            if (element) {
                while (element.hasChildNodes()) {
                    element.removeChild(element.lastChild);
                }
            }
        };

        var removeElement = function (selector, doc) {
            var element = (doc || document).querySelector(selector);
            if (element) {
                element.parentNode.removeChild(element);
            }
        };

        var removeElements = function (selector, doc) {
            var elements = (doc || document).querySelectorAll(selector);
            toArray(elements).forEach(function (element) {
                element.parentNode.removeChild(element);
            });
        };

        var toArray = function (obj) {
            return slice.call(obj);
        };

        var getRandom = function () {
            return Math.random().toString(36).substring(2);
        };

        var cssifyRule = function (rule) {
            return Object.keys(rule).map(function (key) {
                return dash(key) + ": " + rule[key];
            }).join("; ") + ";";
        };

        var cssifyRuleset = function (obj) {
            return Object.keys(obj).map(function (selector) {
                return selector + " { " + cssifyRule(obj[selector]) + " }";
            }).join("\n");
        };

        var unique = function (array) {
            return array.reverse().filter(function (e, i, arr) {
                return arr.indexOf(e, i + 1) === -1;
            }).reverse();
        };

        var objectProperty = function (name, obj) {
            return obj[name];
        };

        var curry = function (f) {
            return function (a) {
                return function (b) {
                    return f(a, b);
                };
            };
        };

        function Linkbox () {
            this.setup();
        }

        Linkbox.DISPLAY_MODE_TITLE = "title";
        Linkbox.DISPLAY_MODE_HREF = "href";
        Linkbox.CONTAINER_TYPE_LIST = "list";
        Linkbox.CONTAINER_TYPE_TEXTAREA = "textarea";

        Linkbox.IFRAME_DOCUMENT_CSS = cssifyRuleset({
            "*": {
                boxSizing: "border-box !important",
            },
            "body, html": {
                height: "100%",
                width: "100%",
                padding: "0",
                margin: "0",
            },
            "body": {
                display: "flex",
                flexDirection: "column",
                overflow: "scroll",
                whiteSpace: "nowrap",
                color: "#900",
                padding: "1em",
            },
            "#close-button": {
                color: "#fee",
                backgroundColor: "#cd5c5c",
                display: "inline-block",
                position: "fixed",
                top: "3px",
                right: "3px",
                border: "1px solid #fcc",
                cursor: "pointer",
                borderRadius: "3px",
                padding: "0 3px",
                margin: "0",
                font: "700 14px/100% monospace",
            },
            "button": {
                font: "700 13px/115% sans-serif",
                textAlign: "left",
                cursor: "pointer",
            },
            "ol": {
                font: "normal 13px/115% monospace",
                marginTop: "0",
            },
            "textarea": {
                width: "100%",
            },
            "#linkbox-container": {
                flex: "1",
                display: "flex",
                marginTop: "0.5em",
            },
        });

        Linkbox.prototype.setup = function () {
            this.displayMode = Linkbox.DISPLAY_MODE_TITLE;
            this.containerType = Linkbox.CONTAINER_TYPE_LIST;
            this.iframeDocument = null;
            this.links = this.getLinks();

            var self = this;
            var clientWidth = document.documentElement.clientWidth;
            var iframeWidth = Math.max(parseInt(clientWidth * 0.45, 10), 450);

            this.iframe = createElement("iframe", {
                id: "linkbox-iframe-" + getRandom(),
                cssText: cssifyRule({
                    display: "block !important",
                    position: "fixed !important",
                    top: "10px !important",
                    left: "10px !important",
                    height: "90% !important",
                    width: iframeWidth + "px !important",
                    border: "3px double #000 !important",
                    borderRadius: "5px !important",
                    backgroundColor: "#fff !important",
                    padding: "0 !important",
                    margin: "0 !important",
                    zIndex: "999999999 !important",
                    opacity: "0.9 !important",
                    overflowX: "auto !important",
                    overflowY: "auto !important",
                    visibility: "visible !important",
                    whiteSpace: "nowrap !important",
                }),
                events: {load: this.onIframeLoaded.bind(this)},
            });
        };

        Linkbox.prototype.linkInfo = function (link) {
            if (link.href) {
                var text = (link.text || link.textContent || link.innerText || "").trim();
                var parent = (link.parentNode || {});
                var title = (text || link.title || parent.title || parent.alt || "").trim();

                text = text || "[no text]";

                return {
                    href: link.href,
                    title: title,
                    text: text,
                    id: link.id,
                };
            }
            else {
                return null;
            }
        };

        Linkbox.prototype.getSelection = function () {
            return (window.getSelection || document.getSelection).call();
        };

        /* links from selected text, or if none, all links in document. */
        Linkbox.prototype.getLinks = function () {
            var selection = this.getSelection();
            var links = toArray(document.links);

            if (selection.toString().trim().length > 0) {
                links = links.filter(function (link) {
                    return selection.containsNode(link, true);
                });
            }

            links = links.map(this.linkInfo).filter(filterGeneric);

            /* Remove duplicates */

            var hrefs = links.map(curry(objectProperty)("href"));

            links = links.reverse().filter(function (link, index) {
                return hrefs.indexOf(link.href, index + 1) === -1;
            }).reverse();

            return links;
        };

        Linkbox.prototype.toggleContainerType = function () {
            switch (this.containerType) {
                case Linkbox.CONTAINER_TYPE_LIST: {
                    this.setContainerType(Linkbox.CONTAINER_TYPE_TEXTAREA);
                    break;
                }
                case Linkbox.CONTAINER_TYPE_TEXTAREA: {
                    this.setContainerType(Linkbox.CONTAINER_TYPE_LIST);
                    break;
                }
            }
        };

        Linkbox.prototype.setContainerType = function (containerType) {
            switch (containerType) {
                case Linkbox.CONTAINER_TYPE_LIST: {
                    this.containerType = Linkbox.CONTAINER_TYPE_LIST;
                    break;
                }
                case Linkbox.CONTAINER_TYPE_TEXTAREA: {
                    this.containerType = Linkbox.CONTAINER_TYPE_TEXTAREA;
                    break;
                }
            }

            this.renderContainer();
        };

        Linkbox.prototype.toggleDisplayMode = function () {
            switch (this.displayMode) {
                case Linkbox.DISPLAY_MODE_TITLE: {
                    this.setDisplayMode(Linkbox.DISPLAY_MODE_HREF);
                    break;
                }
                case Linkbox.DISPLAY_MODE_HREF: {
                    this.setDisplayMode(Linkbox.DISPLAY_MODE_TITLE);
                    break;
                }
            }
        };

        Linkbox.prototype.setDisplayMode = function (displayMode) {
            switch (displayMode) {
                case Linkbox.DISPLAY_MODE_TITLE: {
                    this.displayMode = Linkbox.DISPLAY_MODE_TITLE;
                    break;
                }
                case Linkbox.DISPLAY_MODE_HREF: {
                    this.displayMode = Linkbox.DISPLAY_MODE_HREF;
                    break;
                }
            }

            this.renderContainer();
        };

        Linkbox.prototype.renderContainer = function () {
            switch (this.containerType) {
                case Linkbox.CONTAINER_TYPE_LIST: {
                    this.setContainerContent(this.createList());
                    break;
                }
                case Linkbox.CONTAINER_TYPE_TEXTAREA: {
                    this.setContainerContent(this.createTextarea());
                    break;
                }
            }
        };

        Linkbox.prototype.setContainerContent = function (contentNode) {
            removeChildren("#linkbox-container", this.iframeDocument);
            this.iframeDocument.querySelector("#linkbox-container").appendChild(contentNode);
        };

        Linkbox.prototype.getLinkText = function () {
            var toText;

            switch (this.displayMode) {
                case Linkbox.DISPLAY_MODE_TITLE: {
                    toText = function (link) {
                        return "- [" + link.title + "](" + link.href + ")";
                    };
                    break;
                }
                case Linkbox.DISPLAY_MODE_HREF: {
                    toText = function (link) {
                        return link.href;
                    };
                    break;
                }
            }

            return this.links.map(toText).join("\n");
        };

        Linkbox.prototype.createTextarea = function () {
            removeElement("#linkbox-textarea", this.iframeDocument);

            return createElement("textarea", {
                id: "linkbox-textarea",
                text: this.getLinkText(),
            }, this.iframeDocument);
        };

        Linkbox.prototype.linkToListItem = function (link) {
            var anchor = createElement("a", {
                href: link.href,
                title: (link.text || link.href),
            }, this.iframeDocument);

            switch (this.displayMode) {
                case Linkbox.DISPLAY_MODE_HREF: {
                    anchor.textContent = anchor.href;
                    break;
                }
                case Linkbox.DISPLAY_MODE_TITLE: {
                    anchor.textContent = anchor.title;
                    break;
                }
            }

            return createElement("li", {
                children: [anchor],
            }, this.iframeDocument);
        };

        Linkbox.prototype.createList = function () {
            removeElement("#linkbox-list", this.iframeDocument);

            return createElement("ol", {
                id: "linkbox-list",
                children: this.links.map(this.linkToListItem.bind(this)),
            }, this.iframeDocument);
        };

        Linkbox.prototype.openLinks = function () {
            if (this.links.length < 10 || confirm("Open " + this.links.length + " links?")) {
                this.links.forEach(function (link) {
                    window.open(link.href, getRandom());
                });
            }
        };

        Linkbox.prototype.onIframeLoaded = function () {
            var self = this;
            var doc = this.iframeDocument = this.iframe.contentDocument;
            doc.addEventListener("toggleDisplayMode", this.toggleDisplayMode.bind(this));
            doc.addEventListener("toggleContainerType", this.toggleContainerType.bind(this));

            createElement("style", {
                type: "text/css",
                text: Linkbox.IFRAME_DOCUMENT_CSS,
                parent: doc.head,
            }, doc);

            createElement("p", {
                id: "close-button",
                html: "&times;",
                events: {click: Linkbox.removeExistingIframes},
                parent: doc.body,
            }, doc);

            createElement("button", {
                text: "Toggle display mode (title <=> href)",
                events: {click: this.toggleDisplayMode.bind(this)},
                parent: createElement("div", {parent: doc.body}, doc),
            }, doc);

            createElement("button", {
                text: "Toggle container type (list <=> textarea)",
                events: {click: this.toggleContainerType.bind(this)},
                parent: createElement("div", {parent: doc.body}, doc),
            }, doc);

            createElement("button", {
                text: "Open all links",
                events: {click: this.openLinks.bind(this)},
                parent: createElement("div", {parent: doc.body}, doc),
            }, doc);

            createElement("div", {
                id: "linkbox-container",
                parent: doc.body,
            }, doc);

            this.renderContainer();
        };

        Linkbox.removeExistingIframes = function () {
            removeElements("[id^='linkbox-iframe']", document);
        };

        Linkbox.onDocumentClick = function (event) {
            var target = event.target;
            if (!target.matches("[id^='linkbox-iframe'], [id^='linkbox-iframe'] *")) {
                Linkbox.removeExistingIframes();
            }
        };

        Linkbox.prototype.display = function () {
            Linkbox.removeExistingIframes();
            document.removeEventListener("click", Linkbox.onDocumentClick);
            document.addEventListener("click", Linkbox.onDocumentClick);
            this.setup();
            var target = (document.querySelector("body") || document.documentElement);
            target.appendChild(this.iframe);
        };

        return Linkbox;
    })();

    new Linkbox().display();
})();
