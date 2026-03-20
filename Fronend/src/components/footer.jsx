import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full py-4 px-6 border-t border-white/10">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between text-sm text-white/40">
        <span>Drishtikon — Face Recognition Attendance System</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-white/70 transition">GitHub</a>
          <a href="#" className="hover:text-white/70 transition">Discord</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
