import React from 'react';

const Card = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300 ${className}`}>
      {title && (
        <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
      )}
      {children}
    </div>
  );
};

export default Card;
