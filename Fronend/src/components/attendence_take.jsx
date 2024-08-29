import React, { useState } from 'react';
import AttendenceImage from '../assets/noDP.jpeg';

const AttendenceComponent = () => {
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');

    const handleAttendence = () => {
        //open the modal
        setShowModal(true);
    };

    const handleNext = () => {
        localStorage.setItem('name and uid', name);
        //logic to handle next button click, you can process the name input here
        console.log("Name:", name);
        //close the modal after processing
        setShowModal(false);
        //reset the name input field
        setName('');
    };
    

    return (
        <div className="flex flex-col justify-between items-center h-full text-white">
            <div>
                <h1 className="take_heading text-4xl font-bold m-5">TAKE ATTENDANCE</h1>
            </div>
            <div className="mb-6">
                <img src={AttendenceImage} alt="Attendance" className="take_img max-w-full rounded-lg" />
            </div>
            <div className="m-5"> 
                <button onClick={handleAttendence} className="bg-blue-500 hover:bg-green-600 text-black duration-300 ease-in-out text-xl font-bold py-2 px-4 rounded">
                    ATTEND
                </button>
            </div>
            {showModal && (
                <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
                    <div className="bg-white p-8 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Enter Name and UID</h2>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="border text-xl border-gray-400 rounded-md px-4 py-2 mb-4"
                            placeholder="ex name, uid"
                        />
                        <button onClick={handleNext} className="bg-blue-500 m-2 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendenceComponent;
