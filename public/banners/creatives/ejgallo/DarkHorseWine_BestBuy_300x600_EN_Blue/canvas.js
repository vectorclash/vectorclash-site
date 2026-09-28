//global vars
var cjs = createjs
var bottle, bottleCon, light
var set = gsap.set
var canvas
var maskCon
var stage

function initCanvas() {
	canvas = document.querySelector('#bottle')
	w = canvas.width = 231
	h = canvas.height = 733
	stage = new cjs.Stage(canvas)

	bottle = new cjs.Bitmap('bottle.png')
	bottleMask = new cjs.Bitmap('bottle_mask.png')
	light = new cjs.Bitmap('light.png')
	light.x = 200
	light.y = 231
	light.alpha = .5

	maskCon = new cjs.Container()
	maskCon.addChild(light, bottleMask)
	bottleMask.compositeOperation = 'destination-in'

	bottleCon = new cjs.Container()

	bottleCon.addChild(bottle, maskCon)
	maskCon.compositeOperation = 'soft-light'

	stage.addChild(bottleCon)
	gsap.ticker.add(draw)
}

function draw() {
	stage.update()
}

function getWidth(el) {
	return el.getBounds().width
}

function getHeight(el) {
	return el.getBounds().height
}
