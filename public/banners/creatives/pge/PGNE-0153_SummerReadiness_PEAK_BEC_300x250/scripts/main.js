var main;
var frame1OffPeak;
var frame1PartialPeak;
var frame1Peak;
var frame1Text;
var sun;
var icon;
var moon;
var cloud;
var cta;
var ctaText;
var ctaArrow;
var peakText;
var offpeakText;
var partialpeakText;
var offPeakBackground;
var partialpeakBackground;
var frame5Text;
var frame6Text;
var frame6Footer;

var theDate;
var peak = false;
var offPeak = false;
var partialPeak = false;

function init() {

	theDate = new Date();
	var day = theDate.getDay();
	var time = theDate.getHours() + ":" + theDate.getMinutes();

	if(day < 6) {

		// test for peak hours

		if(isBetweenTimes(time, "12:00", "17:59")) {
			peak = true;
			offPeak = false;
			partialPeak = false;
		}

		// test for first partial-peak interval
		if(isBetweenTimes(time, "8:30", "11:59")) {
			peak = false;
			offPeak = false;
			partialPeak = true;
		}

		// test for peak hours
		if(isBetweenTimes(time, "18:00", "21:29")) {
			peak = true;
			offPeak = false;
			partialPeak = false;
		}

		// test for first off-peak interval
		if(isBetweenTimes(time, "21:30", "23:59")) {
			peak = false;
			offPeak = true;
			partialPeak = false;
		}

		// test for second off-peak interval
		if(isBetweenTimes(time, "0:00", "8:29")) {
			peak = false;
			offPeak = true;
			partialPeak = false;
		}

	} else {
		peak = false;
		offPeak = true;
		partialPeak = false;
	}

	// test to see if it's memorial day 2017

	if(theDate.getMonth() == 4 && theDate.getDate() == 29 && theDate.getYear() == 2017) {
		peak = false;
		offPeak = true;
		partialPeak = false;
	}

	// test to see if it's independence day day 2017

	if(theDate.getMonth() == 6 && theDate.getDate() == 4 && theDate.getYear() == 2017) {
		peak = false;
		offPeak = true;
		partialPeak = false;
	}

	// test to see if it's labor day 2017

	if(theDate.getMonth() == 8 && theDate.getDate() == 4 && theDate.getYear() == 2017) {
		peak = false;
		offPeak = true;
		partialPeak = false;
	}

	// for testing purposes. set desired billing period

	//peak = false;
	//offPeak = true;
	//partialPeak = false;

	// set objects here

	main = document.getElementById("main");
	frame1Text = document.getElementById("frame1_text1");
	frame1OffPeak = document.getElementById("frame1_offpeak");
	frame1PartialPeak = document.getElementById("frame1_partialpeak");
	frame1Peak = document.getElementById("frame1_peak");
	peakText = document.getElementById("frame1_text_peak");
	offpeakText = document.getElementById("frame1_text_offpeak");
	partialpeakText = document.getElementById("frame1_text_partialpeak");
	sun = document.getElementById("sun");
	TweenLite.set(sun, {transformOrigin:"50% 60%", scaleX:0.4, scaleY:0.4, x: 60, y: -10});
	icon = document.getElementById("icon");
	TweenLite.set(icon, {transformOrigin:"50% 80%"});
	buildings = document.getElementById("buildings");
	frame5Text = document.getElementById("frame5_text");
	frame6Text = document.getElementById("frame6_text");
	frame6Footer = document.getElementById("frame6_footer");
	cta = document.getElementById("cta");
	ctaText = document.getElementById("cta_text");
	ctaArrow = document.getElementById("cta_arrow");
	offPeakBackground = document.getElementById("background_offpeak");
	partialpeakBackground = document.getElementById("background_partialpeak");
	cloud = document.getElementById("cloud");
	moon = document.getElementById("moon");

	// set event listeners

	main.addEventListener('click', onBannerClick);
	main.addEventListener('mouseover', onBannerOver);
	main.addEventListener('mouseout', onBannerOut);

	animateFrame1();
}

function animateFrame1() {
	if(peak) {
		TweenLite.to(peakText, 0.5, {alpha:1});
		TweenLite.from(peakText, 0.5, {y:30});

		TweenLite.to(sun, 0.5, {alpha:1});
		TweenLite.to(sun, 1, {scaleX:0.6, scaleY:0.6});
		TweenLite.from(sun, 1, {x:40, y:50, rotation:-60, ease:Quad.easeInOut});

		TweenLite.to(icon, 0.5, {alpha:1, delay:1});
		TweenLite.from(icon, 1, {scaleX:0.4, scaleY:0.4, rotation:-10, ease:Back.easeOut, delay:1});

		TweenLite.to(sun, 1, {x:300, y:-120, scaleX:0.8, scaleY:0.8, ease:Quad.easeIn, delay:3, onComplete:animateNext});
		TweenLite.to(buildings, 1, {x:-50, y:100, ease:Quad.easeIn, delay:3});
		TweenLite.to(logo, 1, {alpha:0, ease:Quad.easeOut, delay:3});

		TweenLite.to(frame1Text, 0.5, {alpha:0, ease:Quad.easeIn, delay:3.8});
		TweenLite.to(peakText, 0.5, {alpha:0, ease:Quad.easeIn, delay:3.8});
	}

	if(offPeak) {
		TweenLite.to(offPeakBackground, 0.5, {alpha:1});
		TweenLite.to(offpeakText, 0.5, {alpha:1});
		TweenLite.from(offpeakText, 0.5, {y:30});

		TweenLite.to(moon, 0.5, {alpha:1});
		TweenLite.from(moon, 1, {x:-30, y:50, scaleX:0.6, scaleY:0.6, ease:Quad.easeInOut});

		TweenLite.to(moon, 1, {x:300, y:-120, scaleX:1.9, scaleY:1.9, ease:Quad.easeIn, delay:3, onComplete:animateNext});
		TweenLite.to(buildings, 1, {x:-50, y:100, ease:Quad.easeIn, delay:3});
		TweenLite.to(logo, 1, {alpha:0, ease:Quad.easeOut, delay:3});

		TweenLite.to(frame1Text, 0.5, {alpha:0, ease:Quad.easeIn, delay:3.8});
		TweenLite.to(offpeakText, 0.5, {alpha:0, ease:Quad.easeIn, delay:3.8});
	}

	if(partialPeak) {
		TweenLite.to(partialpeakBackground, 0.5, {alpha:1});
		TweenLite.to(partialpeakText, 0.5, {alpha:1});
		TweenLite.from(partialpeakText, 0.5, {y:30});

		TweenLite.to(cloud, 0.5, {alpha:1});
		TweenLite.from(cloud, 1, {x:40, y:50, scaleX:0.6, scaleY:0.6, ease:Quad.easeInOut});

		TweenLite.to(cloud, 1, {x:300, y:-120, scaleX:1.5, scaleY:1.5, ease:Quad.easeIn, delay:3, onComplete:animateNext});
		TweenLite.to(buildings, 1, {x:-50, y:100, ease:Quad.easeIn, delay:3});
		TweenLite.to(logo, 1, {alpha:0, ease:Quad.easeOut, delay:3});

		TweenLite.to(frame1Text, 0.5, {alpha:0, ease:Quad.easeIn, delay:3.8});
		TweenLite.to(partialpeakText, 0.5, {alpha:0, ease:Quad.easeIn, delay:3.8});
	}
}

function animateNext() {
	TweenLite.to(offPeakBackground, 0.5, {alpha:0});
	TweenLite.to(partialpeakBackground, 0.5, {alpha:0});

	TweenLite.set(sun, {scaleX:1, scaleY:1, x:0, y:0, alpha:1});
	TweenLite.set(icon, {alpha:1});
	TweenLite.from(sun, 1, {scaleX:0.8, scaleY:0.8, x:-70, y:150, ease:Quad.easeOut});

	TweenLite.to(frame5Text, 0.5, {alpha:1, delay:0.5});

	TweenLite.to(sun, 1, {scaleX:0.7, scaleY:0.7, x:80, y:-27, ease:Quad.easeInOut, delay:3});
	TweenLite.to(frame5Text, 0.5, {alpha:0, delay:3.5});

	TweenLite.to(frame6Text, 0.5, {alpha:1, delay:4});
	TweenLite.to(cta, 0.5, {alpha:1, delay:4.5});
	TweenLite.to(frame6Footer, 0.5, {alpha:1, delay:4.4});
	TweenLite.to(logo, 0.5, {alpha:1, delay:4.2});
}

function isBetweenTimes(value, min, max) {
	var isBetween;
	if(compareTime(value, min) >= 0) {
	if(compareTime(value, max) <= 0) {
		isBetween = true;
	} else {
		isBetween = false;
	}
	} else {
		isBetween = false;
	}
	return isBetween;
}

function compareTime(value1, value2) {
	var comparison;
	var a1 = value1.split(":");
	var hours1 = Number(a1[0]);
	var minutes1 = Number(a1[1]);

	var a2 = value2.split(":");
	var hours2 = Number(a2[0]);
	var minutes2 = Number(a2[1]);

	if (hours1 > hours2) {
		comparison = 1;
	} else if (hours1 == hours2 && minutes1 > minutes2) {
		comparison = 1;
	} else if (hours1 == hours2 && minutes1 == minutes2) {
		comparison = 0;
	} else {
		comparison = -1;
	}

	return comparison;
}

function onBannerOver(e) {
	TweenLite.to(ctaArrow, 0.3, {x:3, ease:Quad.easeInOut});
	TweenLite.to(ctaArrow, 0.2, {x:0, ease:Quad.easeInOut, delay:0.35});
}

function onBannerOut(e) {

}

function onBannerClick(e) {
	window.open(window.clickTag);
}
