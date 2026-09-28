//global vars
var cjs = createjs;
var bottle,bottleCon,light;
var set = TweenMax.set;
var canvas;
var maskCon;
var stage;
//init
function initCanvas(){
    canvas = document.getElementById("bottle");
    w = canvas.width = 172;
    h = canvas.height = 533;
	stage = new cjs.Stage(canvas);
	//---------------------------
	bottle = new cjs.Bitmap('bottle.png');
    bottleMask = new cjs.Bitmap('bottle_mask.png');
	light = new cjs.Bitmap('light.png');
	light.x = 166; 
	light.y = 159;
	light.alpha = .5;
	//bottleMask = bottle.clone(); 
	//--------------------------
	maskCon = new cjs.Container();
	maskCon.addChild(light,bottleMask);
	bottleMask.compositeOperation = 'destination-in';
	//---------------------------
	bottleCon = new cjs.Container();
	
	bottleCon.addChild(bottle,maskCon);
	maskCon.compositeOperation = 'soft-light';
	//---------------------------
	stage.addChild(bottleCon);
	TweenLite.ticker.addEventListener('tick',draw)
}
function draw(){
	stage.update();
}


function getWidth(el){
	return el.getBounds().width;
}
function getHeight(el){
	return el.getBounds().height;
}