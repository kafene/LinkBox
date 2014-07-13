javascript:(function () {
    /* remove any existing iframes */
    [].forEach.call(document.querySelectorAll('[id^=linkbox_frame_]'), function (frame) {
        frame.parentNode.removeChild(frame);
    });

    /* links from selected text, or if none, all links in document. */
    var links = (function () {
        var selection = (window.getSelection || document.getSelection).call();
        var links = [].slice.call(document.links);

        if (selection.toString().trim().length > 0) {
            links = links.filter(function (a) {
                return selection.containsNode(a, true);
            });
        }

        /* convert to an array, nullify ones without an href or empty href */
        links = links.map(function (a) {
            var text = (a.text||a.textContent||a.innerText).trim();
            return a.href ? {
                href: a.href.trim(),
                title: (text||a.title||a.parentNode.title||a.parentNode.alt||''),
                text: text,
                id: a.id,
            } : null;
        });

        /* filter out nullified/empty links. */
        links = links.filter(function (a) { return a && a.href; });

        /* Remove duplicates */
        var hrefs = links.map(function (a) { return a.href; });

        links = links.reverse().filter(function (a, i) {
            return hrefs.indexOf(a.href, i + 1) === -1;
        }).reverse();

        return links;
    })();

    /* No need to go any further... */
    if (0 === links.length) {
        window.alert('No links found.');
        return null;
    }

    /* the iframe */
    var iframe;

    /* the iframe document */
    var ifdoc;

    /* display mode (title,href) */
    var dm = 'href';

    /* container type (list,textarea) */
    var ct = 'list';

    /* toggle the container type */
    var togglect = function () {
        ct = (ct === 'list') ? 'textarea' : 'list';
        renderLinkContainer();
    };

    /* toggle the display mode */
    var toggledm = function () {
        dm = (dm === 'title') ? 'href' : 'title';
        renderLinkContainer();
    };

    /*  */
    var renderLinkContainer = function () {
        setContainerContent((ct === 'textarea') ? createTextarea() : createList());
    };

    /*  */
    var setContainerContent = function (node) {
        emptyContainer();
        ifdoc.getElementById('container').appendChild(node);
    };

    /*  */
    var emptyContainer = function () {
        var c = ifdoc.getElementById('container');
        c && [].forEach.call(c.querySelectorAll('*'), function (node) {
            node.parentNode.removeChild(node);
        });
    };

    /*  */
    var createTextarea = function () {
        var ta = ifdoc.getElementById('lb_textarea');
        ta && ta.parentNode.removeChild(ta);
        ta = ifdoc.createElement('textarea');
        ta.id = 'lb_textarea';
        ta.textContent = '';
        links.forEach(function (link) {
            ta.textContent += (dm === 'href') ? link.href+'\n' : '- ['+link.title+']('+link.href+')\n';
        });
        return ta;
    };

    /*  */
    var createList = function () {
        var list = ifdoc.getElementById('linkbox_list');
        list && list.parentNode.removeChild(list);
        list = ifdoc.createElement('ol');
        list.id = 'linkbox_list';
        links.forEach(function (link) {
            var li = ifdoc.createElement('li');
            var a = ifdoc.createElement('a');
            a.href = link.href;
            a.title = link.text || link.href;
            a.textContent = (dm === 'href') ? a.href : a.title;
            li.appendChild(a);
            list.appendChild(li);
        });
        return list;
    };

    /* CSS injected into the iframe document */
    var ifdoccss = [
        ['*',['box-sizing:border-box !important']],
        ['body,html',['height:100%','width:100%','padding:0','margin:0']],
        ['body', ['display:flex','flex-direction:column',
            'overflow:scroll','white-space:nowrap','color:#900','padding:1em'
        ]],
        ['#xbtn',['color:#fee','background-color:#cd5c5c',
            'display:inline-block','position:absolute','top:3px','right:3px',
            'border:1px solid #fcc','border-radius:3px','padding:0 3px',
            'font:700 14px/100% monospace','cursor:pointer',
        ]],
        ['button',['font:700 13px/115% sans-serif','text-align:left','cursor:pointer']],
        ['ol',['font:normal 13px/115% monospace','margin-top:0']],
        ['textarea',['width:100%']],
        ['#container',['flex:1','display:flex','margin-top:0.5em']],
    ].map(function (a) {return a[0]+' {'+a[1].join(';')+'}\n'}).join('');

    /* CSS applied to the iframe in its parent document */
    var ifcss = [
        'display:block','position:fixed','top:10px','left:10px','height:90%',
        'width:'+Math.max(parseInt(document.documentElement.clientWidth*0.65,10),600)+'px',
        'border:3px double #000','border-radius:5px','background-color:#fff',
        'padding:1em','margin:0','z-index:999999999','opacity:0.9',
        'overflow-x:auto','overflow-y:auto','visibility:visible',
        'white-space:nowrap','padding:0','margin:0',
    ].join(' !important;')+' !important;';

    /* inject the iframe, set ifdoc, and ... go! */
    iframe = document.createElement('iframe');
    iframe.id = 'linkbox_frame_' + Math.random().toString(36).substring(2);
    iframe.style.cssText = ifcss;
    iframe.addEventListener('load', function () {
        ifdoc = iframe.contentDocument;
        ifdoc.addEventListener('toggleDisplayMode', toggledm);
        ifdoc.addEventListener('toggleContainerType', togglect);

        var style = ifdoc.createElement('style');
        style.type = 'text/css';
        style.appendChild(ifdoc.createTextNode(ifdoccss));

        var xbtn = ifdoc.createElement('div');
        xbtn.id = 'xbtn';
        xbtn.innerHTML = '&times';
        xbtn.addEventListener('click', function (e) {
            e.preventDefault();
            iframe.parentNode.removeChild(iframe);
        });

        var div1 = ifdoc.createElement('div');
        var div2 = ifdoc.createElement('div');
        var div3 = ifdoc.createElement('div');
        var btn1 = ifdoc.createElement('button');
        var btn2 = ifdoc.createElement('button');
        div3.id = 'container';
        btn1.textContent = 'Toggle display mode (title <=> href)';
        btn2.textContent = 'Toggle container type (list <=> textarea)';
        btn1.addEventListener('click', toggledm);
        btn2.addEventListener('click', togglect);
        div1.appendChild(btn1);
        div2.appendChild(btn2);
        ifdoc.head.appendChild(style);
        ifdoc.body.appendChild(xbtn);
        ifdoc.body.appendChild(div1);
        ifdoc.body.appendChild(div2);
        ifdoc.body.appendChild(div3);

        setContainerContent(createList());
    });

    (document.body||document.documentElement).appendChild(iframe);
})();
