import React from 'react';
import './HeaderIcon.scss';

const HeaderIcon = () => {
  return (
    <span className="header-icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer rotating ring */}
        <circle cx="8" cy="8" r="6" className="icon-ring-outer" />

        {/* Middle counter-rotating ring */}
        <circle cx="8" cy="8" r="4.5" className="icon-ring-middle" />

        {/* Inner rotating ring */}
        <circle cx="8" cy="8" r="3" className="icon-ring-inner" />

        {/* Pulsing core */}
        <circle cx="8" cy="8" r="1.5" className="icon-core" />

        {/* Orbital particles */}
        <circle cx="14" cy="8" r="0.8" className="icon-particle icon-particle-1" />
        <circle cx="2" cy="8" r="0.8" className="icon-particle icon-particle-2" />
        <circle cx="8" cy="2" r="0.8" className="icon-particle icon-particle-3" />
        <circle cx="8" cy="14" r="0.8" className="icon-particle icon-particle-4" />
      </svg>
    </span>
  );
};

export default HeaderIcon;
