import React from 'react';

const Footer = () => {

    return (
        <footer >
            <div className="mx-auto w-full max-w-screen-xl">
                <div className="md:flex md:justify-between">
                    <div className="mb-6 md:mb-0">
                        <a href="../../index.html" className="flex items-center">
                            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
                                Face Recognition Attendance System
                            </span>
                        </a>
                    </div>
                    <div className="grid grid-cols-2 gap-8 sm:gap-6 sm:grid-cols-3">
                        <div>
                            <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase dark:text-white">
                                Follow us
                            </h2>
                            <ul className="text-gray-500 dark:text-gray-400 font-medium">
                                <li className="mb-4">
                                    <a
                                        href=""
                                        className="hover:underline"
                                    >
                                        Github
                                    </a>
                                </li>
                                <li>
                                    <a href="" className="hover:underline">
                                        Discord
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </footer>

    );
};

export default Footer;