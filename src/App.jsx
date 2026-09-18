import React from "react";
import { gsap, ScrollTrigger } from "gsap/all";

import "./App.scss";

import Hero from "./components/Hero";
import About from "./components/About";
import LogoGrid from "./components/LogoGrid";
import Projects from "./components/Projects";
import ContactFooter from "./components/ContactFooter";

gsap.registerPlugin(ScrollTrigger);

function App() {
  return (
    <div className="App">
      <Hero />
      <About />
      <LogoGrid />
      <Projects />
      <ContactFooter />
    </div>
  );
}

export default App;
