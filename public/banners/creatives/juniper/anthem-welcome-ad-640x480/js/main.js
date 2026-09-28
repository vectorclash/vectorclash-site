var video;
var isPlaying = true;
var mainContainer;

function enablerInitHandler() {
  mainContainer = document.querySelector('.main-container');

  video = document.querySelector('video');
  video.addEventListener('ended', onVideoEnd);
  video.addEventListener('click', onBannerClick);
}

function onVideoEnd(event) {
  isPlaying = false;
}

function onBannerClick(event) {
  video.currentTime = video.duration;
  Enabler.exit('Main Banner Exit', 'http://www.juniper.net/');
}
