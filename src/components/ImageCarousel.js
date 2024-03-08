import React from "react";
// import { gsap, SplitText, ScrollTrigger } from "gsap/all";
// import tinycolor from "tinycolor2";
import "./ImageCarousel.scss";

class ImageCarousel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeCarouselImage: this.props.activeCarouselImage,
      carouselImages: this.props.carouselImages
    };
  }

  onCloseClick() {
    this.props.toggleCarousel(null, null);
  }

  render() {
    return (
      <div className="image-carousel">
        <img src={this.state.carouselImages[this.state.activeCarouselImage].url} alt="eat a dick"></img>
        <button className="close-button" onClick={this.onCloseClick.bind(this)}>
          X
        </button>
      </div>
    );
  }
}

export default ImageCarousel;
