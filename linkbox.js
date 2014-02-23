(function (window, undefined) {
    var document = window.document;

    // Remove any existing boxes
    [].slice.call(document.querySelectorAll('[id^="linkbox_frame_"]')).forEach(function (frame) {
        frame.parentNode.removeChild(frame);
    });

    var getLinks = function () {
        var sel = (window.getSelection || document.getSelection)();
        var links = [].slice.call(document.links);
        // If selected text, get anchor nodes in it.
        if (0 !== sel.toString().trim().length) {
            links = links.filter(function (link) {
                return sel.containsNode(link, false);
            });
        }
        // Strip out trailing junk from href
        links.forEach(function (link) {
            link.href = link.href.replace(/[#?&]*$/, '');
        });
        // Filter out empty links and duplicates
        links = links.filter(function (a, b, links) {
            var isDupe = links.lastIndexOf(a.href) == b.href;
            var isEmpty = ('' == a.href.trim());
            return !isDupe && !isEmpty;
        });
        return links;
    };

    var getElementText = function (el) {
        var tc = el.textContent.trim();
        if (0 != tc.length) { return tc; }
        if (el.title) { return el.title; }
        if (el.alt) { return el.alt; }
        var par = el.parentNode;
        if (par && par.title) { return par.title; }
        if (par && par.alt) { return par.alt; }
        return '';
    };

    var box = {};
    box.linkDisplayMode = 'title'; // title or href
    box.linkContainerType = 'list'; // textarea or list
    box.links = getLinks();

    // If there are no links in the document, no point to create the box.
    if (0 == box.links.length) {
        window.alert('No links found.');
        return null;
    }

    box.css = '*{box-sizing:border-box !important;}'+
        'body,html{height:100%;width:100%;padding:0;margin:0;}'+
        '#linkbox_table'+',ol{font:normal 13px/115% monospace}'+
        'body{'+
            'overflow:scroll;white-space:nowrap;text-align:left;'+
            'color:#900;padding:1em;}'+
        '#linkbox_close_button{'+
            'color:#fee;background-color:#cd5c5c;display:inline-block;'+
            'position:absolute;top:3px;right:3px;border:1px solid #fcc;'+
            'border-radius:3px;padding:0 3px;font:700 14px/100% monospace;'+
            'cursor:pointer;}'+
        'button{font:700 13px/115% sans-serif;text-align:left;cursor:pointer;}'+
        '#linkbox_textarea{width:100%;height:100%;}'+
        '#linkbox_table,#linkbox_table td{width:100%;vertical-align:top;}'+
        '#linkbox_table,#linkbox_link_container{height:100%;}';

    box.injectFrame = function () {
        box.frame = document.createElement('iframe');
        box.frame.id = 'linkbox_frame_' + window.Math.random().toString(36).substring(2);
        box.frame.style.cssText = (
            'display:block;position:fixed;top:10px;left:10px;height:90%;' +
            'width:' + window.Math.min(parseInt(document.documentElement.clientWidth * 0.5, 10), 600) + 'px;' +
            'border:3px double #000;border-radius:5px;background-color:#fff;' +
            'padding:1em;margin:0;z-index:999999999;opacity:0.9;' +
            'overflow-x:auto;overflow-y:auto;visibility:visible;' +
            'white-space:nowrap;padding:0;margin:0;'
        ).replace(';', ' !important;');
        box.frame.addEventListener('load', function () {
            box.document = box.frame.contentDocument;
            box.injectTemplate();
            box.document.addEventListener('toggleLinkDisplayMode', box.toggleLinkDisplayMode);
            box.document.addEventListener('toggleLinkContainerType', box.toggleLinkContainerType);
            box.setContent(box.createLinkList());
        });
        // gibs muh dat contentDocument and onload
        (document.body || document.documentElement).appendChild(box.frame);
    };

    // template
    box.injectTemplate = function () {
        // replace [[  \\*$  ]] => [[  \\  ]]
        var style = box.document.createElement('style');
        style.type = 'text/css';
        style.appendChild(box.document.createTextNode(box.css));
        box.document.head.appendChild(style);

        // Button to close frame
        // <div id="linkbox_close_button"></div>
        var closeButton = box.document.createElement('div');
        closeButton.id = 'linkbox_close_button';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', function (e) {
            e.preventDefault && e.preventDefault();
            box.frame.parentNode.removeChild(box.frame);
        });

        // button to toggle display mode
        // <tr><td id="dm_toggle"><button></button></td></tr>
        var toggleDmRow = box.document.createElement('tr');
        var toggleDmTd = box.document.createElement('td');
        var toggleDmButton = box.document.createElement('button');
        toggleDmTd.id = 'dm_toggle';
        toggleDmButton.textContent = 'Toggle links (title <=> href)';
        toggleDmButton.addEventListener('click', box.toggleLinkDisplayMode);
        toggleDmTd.appendChild(toggleDmButton);
        toggleDmRow.appendChild(toggleDmTd);

        // button to toggle container type
        // <tr><td id="ct_toggle"><button></button></td></tr>
        var toggleCtRow = box.document.createElement('tr');
        var toggleCtTd = box.document.createElement('td');
        var toggleCtButton = box.document.createElement('button');
        toggleCtTd.id = 'ct_toggle';
        toggleCtButton.textContent = 'Toggle content (list <=> textarea)';
        toggleCtButton.addEventListener('click', box.toggleLinkContainerType);
        toggleCtTd.appendChild(toggleCtButton);
        toggleCtRow.appendChild(toggleCtTd);

        // <tr><td id="linkbox_link_container"></td></tr>
        var contentRow = box.document.createElement('tr');
        var contentTd = box.document.createElement('td');
        contentTd.id = 'linkbox_link_container';
        contentRow.appendChild(contentTd);

        // <table></table>
        var table = box.document.createElement('table');
        table.id = 'linkbox_table';
        table.appendChild(toggleDmRow);
        table.appendChild(toggleCtRow);
        table.appendChild(contentRow);

        box.document.body.appendChild(closeButton);
        box.document.body.appendChild(table);
    };

    box.createLinkTextarea = function () {
        var existing = box.document.getElementById('linkbox_textarea');
        existing && existing.parentNode.removeChild(existing);
        // <textarea id="linkbox_textarea"></textarea>
        var textarea = box.document.createElement('textarea');
        textarea.id = 'linkbox_textarea';
        textarea.textContent = '';
        box.links.forEach(function (link) {
            switch(box.linkDisplayMode) {
                case 'href':
                    textarea.textContent += link.href + "\n";
                    break;
                case 'title':
                    textarea.textContent += '- [' + link.title + '](' + link.href + ')' + "\n";
                    break;
            }
        });
        return textarea;
    };

    box.createLinkList = function () {
        var existing = box.document.getElementById('linkbox_list');
        existing && existing.parentNode.removeChild(existing);
        // <ol id="linkbox_list">(<li></li>)+</ol>
        var list = box.document.createElement('ol');
        list.id = 'linkbox_list';
        box.links.forEach(function (link) {
            var li = box.document.createElement('li');
            var a = box.document.createElement('a');
            a.href = link.href;
            a.title = link.textContent.trim() || link.href;
            switch (box.linkDisplayMode) {
                case 'href':
                    a.textContent = a.title;
                    break;
                case 'title':
                    a.textContent = a.href;
                    break;
            }
            li.appendChild(a);
            list.appendChild(li);
        });
        return list;
    };

    box.emptyLinkContainer = function () {
        var linkContainer = box.document.getElementById('linkbox_link_container');
        if (!linkContainer) { return null; };
        [].slice.call(linkContainer.querySelectorAll('*')).forEach(function (el) {
            el.parentNode.removeChild(el);
        });
    };

    box.setContent = function (el) {
        box.emptyLinkContainer();
        box.document.getElementById('linkbox_link_container').appendChild(el);
    };

    box.renderLinkContainer = function () {
        switch (box.linkContainerType) {
            case 'textarea':
                box.setContent(box.createLinkTextarea());
                break;
            case 'list':
                box.setContent(box.createLinkList());
                break;
        }
    };

    // invert
    box.toggleLinkContainerType = function () {
        box.linkContainerType = (box.linkContainerType == 'list') ? 'textarea' : 'list';
        box.renderLinkContainer();
    };

    // invert
    box.toggleLinkDisplayMode = function () {
        box.linkDisplayMode = (box.linkDisplayMode == 'title') ? 'href' : 'title';
        box.renderLinkContainer();
    };

    // Inject the frame when the document is done loading.
    (function r(f) {
        /in/i.test(document.readyState) ? window.setTimeout(r, 9, f) : f();
    })(box.injectFrame);
})(window);
