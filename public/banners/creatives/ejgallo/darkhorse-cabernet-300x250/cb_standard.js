(function(){
    var _ = function(a) {return new q(a);},
       	q = function (a) {var b = (typeof a === 'string') ? document.querySelector(a) : a;this.c = b;return this;};  
        _.fn = q.prototype = {
        off: function(a, b) {if(this.c.addEventListener) {this.c.removeEventListener(a, b, false);}else if(this.c.attachEvent) {this.c.detachEvent('on'+a, b);};return this;},
        on: function(a, b) {if(this.c.addEventListener) {this.c.addEventListener(a, b, false);}else if(this.c.attachEvent) {this.c.attachEvent('on'+a, b);};  return this;},
        add: function(a) {this.c.innerHTML = a; return this;},
        way: function(a) {for(var b in a) {if (a.hasOwnProperty(b)) {this.c.style[b] = a[b];};};return this;}
    };
    if(!window._) {window._=_;}
})();
function startPreload(){
	var ctr = 0, images_arr = new Array(), preArgumentsLength = startPreload.arguments.length-1, preArguments = startPreload.arguments; 
	for (i = 0; i < preArgumentsLength; i++) {images_arr[i] = new Image(), images_arr[i].src = startPreload.arguments[i], _(images_arr[i]).on('load', imageLoaded);}
	function imageLoaded(){if(ctr === (preArgumentsLength - 1)){preArguments[preArgumentsLength]();}else{ctr++;}} 
}
_(window).on('load', function() {
    initAd();
})