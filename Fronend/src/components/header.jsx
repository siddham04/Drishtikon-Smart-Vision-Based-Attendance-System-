import React, { useState } from 'react';
import Logo from '../assets/logo_avinya.svg';

const Header = ({ selectedGroup, onGroupChange }) => {
  const [open, setOpen] = useState(false);

  const handleItemClick = (group) => {
    onGroupChange(group);
    setOpen(false);
  };

  return (
    <header className="py-4 px-6 flex justify-center relative">
      <div className="header_inside w-full flex items-center p-4 px-8 rounded-2xl">
        <div className="logo absolute left-10 w-16">
          <img src={Logo} alt="Logo" className="w-full" />
        </div>
        <div className="mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide">
            Drishtikon
          </h1>
        </div>
        <div className="relative z-40 flex items-center gap-3">
          {selectedGroup && (
            <span className="text-sm text-white/50">
              Class: <span className="text-white font-medium">{selectedGroup}</span>
            </span>
          )}
          <button
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full border border-white/20 transition"
            onClick={() => setOpen(!open)}
          >
            {selectedGroup || 'Select Group'}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 p-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl shadow-2xl overflow-y-auto max-h-60 w-28 z-50">
              {Array.from({ length: 31 }, (_, i) => (
                <div
                  key={i + 1}
                  className={`p-2 rounded-lg text-center cursor-pointer text-sm transition ${
                    selectedGroup === `G-${i + 1}`
                      ? 'bg-blue-600 text-white'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                  onClick={() => handleItemClick(`G-${i + 1}`)}
                >
                  G-{i + 1}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
