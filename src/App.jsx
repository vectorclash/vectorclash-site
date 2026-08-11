import React from "react";
import { gsap, ScrollTrigger } from "gsap/all";

import "./App.scss";

import Header from "./components/Header";
import About from "./components/About";
import LogoGrid from "./components/LogoGrid";
import Projects from "./components/Projects";
import ContactFooter from "./components/ContactFooter";

gsap.registerPlugin(ScrollTrigger);

function App() {
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
