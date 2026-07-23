import React, { useEffect } from "react";
import { gsap, ScrollTrigger } from "gsap/all";

import "./App.scss";

import Header from "./components/Header";
import About from "./components/About";
import LogoGrid from "./components/LogoGrid";
import Projects from "./components/Projects";
import ContactFooter from "./components/ContactFooter";

gsap.registerPlugin(ScrollTrigger);

function App() {
  useEffect(() => {
    // Mobile browsers resize the viewport as the address bar hides/shows while
    // scrolling, but ScrollTrigger ignores small viewport-height changes on touch
    // devices. That leaves scrub animations pinned to "bottom bottom" (like the
    // footer's) unable to reach their end point once the address bar collapses,
    // since the page can no longer scroll as far as originally measured.
    // normalizeScroll locks scroll measurement to a stable viewport so those
    // animations can complete.
    if (ScrollTrigger.isTouch) {
      ScrollTrigger.normalizeScroll(true);
    }
  }, []);

  return (
    <div className="App">
      <Header />
      <About />
      <LogoGrid />
      <Projects />
      <ContactFooter />
    </div>
  );
}

export default App;
