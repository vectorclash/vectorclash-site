import React from "react";

import "./App.scss";

import Header from "./components/Header";
import About from "./components/About";
import LogoGrid from "./components/LogoGrid";
import Projects from "./components/Projects";
import ContactFooter from "./components/ContactFooter";

function App() {
  return (
    <div className="App">
      <Header />
      <Projects />
      <About />
      <LogoGrid />
      <ContactFooter />
    </div>
  );
}

export default App;
