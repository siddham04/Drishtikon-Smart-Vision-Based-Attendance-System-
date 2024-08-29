import React, { useState } from 'react';
import Logo from '../assets/logo_avinya.png';

const Header = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState('Select Group');

  const toggleDropdown = () => {
    setOpen(!open);
  };

  const handleItemClick = (item) => {
    setItems(item);
    setOpen(false);
  };

  return (
    <header className="py-4 flex justify-center relative">
      <div className="header_inside w-full flex items-center bg-opacity-20 p-5 rounded-full">
        <div className="main_heading mx-auto flex justify-center">
          <h1 className="text-6xl font-bold">Drishtikon</h1>
        </div>
        <div className="dropdown-container relative z-40 bg-white bg-opacity-70 rounded-full">
          <button
            className="dropdown-button text-2xl text-black p-2 rounded-full"
            onClick={toggleDropdown}
          >
            {items}
          </button>
          {open && (
            <div
              className="dropdown-content absolute mt-2 p-2 bg-black border border-gray-300 rounded shadow-lg overflow-y-auto"
              style={{ maxHeight: '15rem', width: '5rem', left: '50%', transform: 'translateX(-50%)' }}
            >
              {Array.from({ length: 31 }, (_, i) => (
                <div
                  key={i + 1}
                  className="dropdown-item p-2 text-black bg-gray-100 hover:bg-red-200 rounded text-center cursor-pointer text-nowrap m-1"
                  onClick={() => handleItemClick(`G-${i + 1}`)}
                >
                  G-{i + 1}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="logo absolute left-6 w-32 top-1">
        <img src={Logo} alt="Logo" />
      </div>
    </header>
  );
};

export default Header;
