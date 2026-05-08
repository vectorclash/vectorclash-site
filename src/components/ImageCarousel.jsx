import "./ImageCarousel.scss";

function ImageCarousel({ activeCarouselImage, carouselImages, toggleCarousel }) {
  const onCloseClick = () => {
    toggleCarousel(null, null);
  };

  return (
    <div className="image-carousel">
      <img src={carouselImages[activeCarouselImage].url} alt="Project carousel"></img>
      <button className="close-button" onClick={onCloseClick}>
        X
      </button>
    </div>
  );
}

export default ImageCarousel;
