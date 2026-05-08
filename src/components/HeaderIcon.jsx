import React from 'react';
import './HeaderIcon.scss';

const HeaderIcon = () => {
  return (
    <span className="header-icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer square - clockwise rotation */}
        <rect x="1" y="1" width="14" height="14" className="icon-square-outer" />

        {/* Middle square - counter-clockwise rotation */}
        <rect x="3" y="3" width="10" height="10" className="icon-square-middle" />

        {/* Inner square - clockwise rotation */}
        <rect x="5" y="5" width="6" height="6" className="icon-square-inner" />
      </svg>
    </span>
  );
};

export default HeaderIcon;
