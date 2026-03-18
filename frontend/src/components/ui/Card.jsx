import React from 'react';

const Card = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
      )}
      {children}
    </div>
  );
};

export default Card;
