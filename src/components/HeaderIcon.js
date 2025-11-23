import React from 'react';
import './HeaderIcon.scss';

const HeaderIcon = () => {
  return (
    <span className="header-icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" className="icon-circle" />
        <polygon points="8,4 12,8 8,12 4,8" className="icon-diamond" />
      </svg>
    </span>
  );
};

export default HeaderIcon;
