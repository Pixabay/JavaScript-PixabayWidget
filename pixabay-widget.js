/*
    Pixabay Image Gallery Widget v1.0.0
    Copyright (c) 2014 Simon Steinberger / Pixabay
    GitHub: https://github.com/Pixabay/JavaScript-PixabayWidget
    License: http://www.opensource.org/licenses/mit-license.php

    settings:
        // default values
        var pixabayWidget = { className: '', ... };
    public methods:
        // reload widget(s) after DOM changes
        new initPixabayWidget();
*/

(function(){
    var cache = {}, counter = 0, o = {
        className: 'pixabay_widget',
        rowHeight: 170,
        perPage: 20,
        maxRows: 0,
        truncate: true,
        imageType: 'all', // 'photo', 'illustration'
        safesearch: false,
        editorsChoice: false,
        order: 'popular', // 'latest'
        target: '', // '_blank'
        navpos: 'bottom', // position of branding and pagination: false, 'bottom', 'top'
        branding: true,
        prev: '◄ PREV',
        next: 'NEXT ►'
    }
    if (typeof pixabayWidget === 'object') {
        for (var k in pixabayWidget) { if (Object.prototype.hasOwnProperty.call(pixabayWidget, k)) o[k]=pixabayWidget[k]; }
    }

    styles = (
        '** .noselect { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }'+
        '** a, ** b { color: #4e99c7; text-decoration: none; font-weight: normal; cursor: pointer; transition: .3s; }'+
        '** a:hover, ** b:hover { opacity: .7; }'+
        '** a img { border: 0; }'+
        '** **_nav { clear: both; padding: 3px 7px; font: normal 12px arial, sans-serif; color: #777; }'+
        '** **_nav span { color: #ddd; cursor: default; }'+
        '** .branding { float: right; }'+
        '**.flex_grid { overflow: hidden; }'+
        '**.flex_grid .item { float: left; margin: 1px; box-sizing: content-box; overflow: hidden; position: relative;  }'+
        '**.flex_grid .item img { display: block; width: auto; height: 100%; background: #fff; transition: .3s; }'+
        '**.flex_grid .item img:hover { opacity: .85; }').replace(/\*\*/g, '.'+o.className);
    var el = document.createElement('style'); el.type = 'text/css';
    if (el.styleSheet) el.styleSheet.cssText = styles; //IE
    else el.appendChild(document.createTextNode(styles));
    document.getElementsByTagName('head')[0].appendChild(el);

    // https://github.com/Pixabay/jQuery-flexImages
    !function(){function e(e,t,r){var i=e.offsetWidth,n=window.getComputedStyle?getComputedStyle(e,null):e.currentStyle;return t?i+=(parseInt(n.marginLeft)||0)+(parseInt(n.marginRight)||0):r&&(i-=(parseInt(n.borderLeftWidth)||0)+(parseInt(n.borderRightWidth)||0)),i}function t(r,n,a,o){function s(e){a.maxRows&&u>a.maxRows||a.truncate&&e&&u>1?m[l][0].style.display="none":(m[l][5]&&(m[l][4].setAttribute("src",m[l][5]),m[l][5]=""),m[l][0].style.width=c+"px",m[l][0].style.height=d+"px",m[l][0].style.display="block")}var l,c,g=1,u=1,f=e(r,!1,!0),m=[],w=0,d=a.rowHeight;for(i=0;i<n.length;i++)if(m.push(n[i]),w+=n[i][3]+a.margin,w>=f){for(g=f/w,d=Math.ceil(a.rowHeight*g),exact_w=0,c,l=0;l<m.length;l++)c=Math.ceil(m[l][3]*g),exact_w+=c+a.margin,exact_w>f&&(c-=exact_w-f+1),s();m=[],w=0,u++}for(l=0;l<m.length;l++)c=Math.floor(m[l][3]*g),h=Math.floor(a.rowHeight*g),s(!0);o||f==e(r,!1,!0)||t(r,n,a,!0)}this.flexImages=function(){var r={selector:null,container:".item",object:"img",rowHeight:180,maxRows:0,truncate:0};if(arguments[0]&&"object"==typeof arguments[0])for(var n in arguments[0])Object.prototype.hasOwnProperty.call(arguments[0],n)&&(r[n]=arguments[0][n]);var a="object"==typeof r.selector?[r.selector]:document.querySelectorAll(r.selector);for(i=0;i<a.length;i++){var o=a[i],s=o.querySelectorAll(r.container),l=[],c=(new Date).getTime();for(r.margin=e(s[0],!0)-e(s[0],!1,!0),j=0;j<s.length;j++){var g=s[j],u=parseInt(g.getAttribute("data-w")),f=parseInt(g.getAttribute("data-h")),h=u*(r.rowHeight/f),m=g.querySelector(r.object);l.push([g,u,f,h,m,m.getAttribute("data-src")])}t(o,l,r),tempf=function(){t(o,l,r)},document.addEventListener?(window["flexImages_listener"+c]=tempf,window.removeEventListener("resize",window["flexImages_listener"+o.getAttribute("data-flex-t")]),window.addEventListener("resize",window["flexImages_listener"+c])):o.onresize=tempf,o.setAttribute("data-flex-t",c)}}}();

    function escapeHTML(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):'';}
    function toTitleCase(s){ return s.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}); }

    function callback_name(f, node, page, perPage, url){
        var fname = 'pxw_callback_'+counter;
        window[fname] = function(data){ f(data, node, page, perPage, url); try { delete window[fname]; } catch(e){} };
        counter++;
        return fname;
    }

    APIResponse = function(data, n, page, perPage, url){
        cache[url] = data;
        var nav = '', html = '',
            rh = parseInt(n.getAttribute('data-rowHeight')||o.rowHeight),
            mr = n.getAttribute('data-maxRows')||o.maxRows,
            tr = n.getAttribute('data-truncate')||o.truncate,
            target = n.getAttribute('data-target')||o.target,
            br = n.getAttribute('data-branding')||o.branding,
            navpos = n.getAttribute('data-navpos')||o.navpos;

        if (tr == 'false') tr = 0; else if (tr == 'true') tr = 1;
        if (br == 'false') br = 0; else if (br == 'true') br = 1;

        // pagination and branding
        var is_paginated = data.totalHits > perPage && o.prev && o.next;
        if (is_paginated || br) {
            nav += '<div class="noselect '+o.className+'_nav">';
            if (br) nav += '<div class="branding">Powered by <a href="http://pixabay.com/" target="'+target+'">Pixabay</a></div>';
            if (is_paginated) {
                if (page > 1) nav += '<b class="'+o.className+'_prev">'+o.prev+'&nbsp;</b>';
                else nav += '<span>'+o.prev+'&nbsp;</span>';
                if (page*perPage < data.totalHits) nav += '<b class="'+o.className+'_next">&nbsp; '+o.next+'</b>';
                else nav += '<span>&nbsp; '+o.next+'</span>';
            }
            nav += '</div>';
        }

        if (navpos == 'top') html += nav;
        // flexImages markup
        for (var i=0,hits=data.hits;i<hits.length;i++) {
            var w = hits[i].previewWidth, h = hits[i].previewHeight, src = hits[i].previewURL;
            if (rh > h-10) w = w*(180/(h+1)), h = 180, src = src.replace('_150', '__180');
            html += '<div class="item" data-w="'+w+'" data-h="'+h+'"><a title="'+escapeHTML(toTitleCase(hits[i].tags))+'" href="'+hits[i].pageURL+'" target="'+target+'"><img src="http://pixabay.com/static/img/blank.gif" data-src="'+src+'"></a></div>';
        }
        if (navpos == 'bottom') html += nav;

        n.innerHTML = html;
        if (n.className.indexOf('flex_grid')<0) n.className += ' flex_grid';
        new flexImages({selector: n, rowHeight: rh, maxRows: parseInt(mr), truncate: tr});
        n.setAttribute('data-attrstr', attrs_to_str(n));
    }

    function closest(el, selector) { // IE9+
        var match = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
        while (el) { if (match.bind(el)(selector)) return el; else el = el.parentElement; }
    }

    function attrs_to_str(n){
        var s = '';
        for (var i=0,attrs=n.attributes;i<attrs.length;i++)
            if (attrs[i].name != 'data-attrstr') s += attrs[i].name+attrs[i].value;
        return s;
    }

    if (document.addEventListener)
        document.addEventListener('click', function(e){
            var next = 0;
            if (e.target.className==o.className+'_prev') next = -1;
            else if (e.target.className==o.className+'_next') next = 1;
            if (next) {
                var n = closest(e.target, '.'+o.className), p = (parseInt(n.getAttribute('data-page')) || 1)+next;
                if (p) { n.setAttribute('data-page', p); init(); }
                e.preventDefault();
            }
        });
    else
        o.prev = '', o.next = '';

    function init(){
        for (var i=0,widgets=document.querySelectorAll('.'+o.className);i<widgets.length;i++) {
            var n = widgets[i];
            // skip rendered widgets if not changed
            if (attrs_to_str(n) != n.getAttribute('data-attrstr')) {
                var page = (parseInt(n.getAttribute('data-page'))||1),
                    perPage = (parseInt(n.getAttribute('data-perPage'))||o.perPage),
                    q = n.getAttribute('data-search')||'',
                    user = n.getAttribute('data-user')||'';
                perPage = perPage > 100 ? 100 : perPage;
                if (user) q = 'user:'+user+' '+q;
                var url = 'http://pixabay.com/api/?username=PixabayWidget&key=2e318db2f775b21a12e5&order='+(n.getAttribute('data-order')||o.order)+'&image_type='+(n.getAttribute('data-imageType')||o.imageType)+'&safesearch='+(n.getAttribute('data-safesearch')||o.safesearch)+'&editors_choice='+(n.getAttribute('data-editorsChoice')||o.editorsChoice)+'&per_page='+perPage+'&page='+page+'&q='+encodeURIComponent(q);
                if (url in cache) APIResponse(cache[url], n, page, perPage, url);
                else { var script = document.createElement('script'); script.src = url+'&callback='+callback_name(APIResponse, n, page, perPage, url); document.body.appendChild(script); }
            }
        }
    }

    // public method: new initPixabayWidget();
    this.initPixabayWidget = init;

    if (document.readyState!='loading') init();
    else if (document.addEventListener) document.addEventListener('DOMContentLoaded', init);
    else document.attachEvent('onreadystatechange', function(){ if (document.readyState=='complete') { init(); } });
}());
