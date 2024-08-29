import React, { useState } from 'react';
import AddUser from '../assets/add_user.png';

const Register = () => {
    const [showPopup, setShowPopup] = useState(false);
    const [step, setStep] = useState(1);
    const [stringInput, setStringInput] = useState('');
    const [integerInput, setIntegerInput] = useState('');
    const [error, setError] = useState('');

    const handlePart1_5Click = () => {
        setShowPopup(true);
    };

    const handleNextClick = () => {
        setStep(2);
    };

    const handleDoneClick = async () => {
        if(integerInput.length > 10){
            setError('UID should not exceed 10 digits.');
            return;
        }
        if(integerInput.length < 10){
            setError('UID should not be less than 10 digits.');
            return;
        }
        const existingUIDs = JSON.parse(localStorage.getItem('uids')) || [];
        if (existingUIDs.includes(integerInput)) {
            setError('UID already exists.');
            return;
        }
        existingUIDs.push(integerInput);
        localStorage.setItem('uids', JSON.stringify(existingUIDs));
        localStorage.setItem('stringInput', stringInput);

        if (!stringInput || !integerInput) {
            console.error('Name and UID are required');
            alert('Name and UID are required. Please fill in all fields.');
            return;
        }
    
        try {
            const response = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: stringInput,
                    uid: integerInput,
                }),
            });
    
            const data = await response.json();
            if (response.ok) {
                console.log('Registration successful:', data);
                alert('Registration successful!');
                // Start capturing patterns after registration
                startCapturePatterns();
            } else {
                console.error('Registration failed:', data);
                alert('Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while registering. Please try again later.');
        }
    
        setShowPopup(false);
        setStep(1);
        setStringInput('');
        setIntegerInput('');
    };

    const startCapturePatterns = async () => {
        try {
            const response = await fetch('http://localhost:5000/capture-patterns', {
                method: 'GET',
            });
            const data = await response.json();
            console.log('Capture patterns response:', data);
            // Handle the response as needed
        } catch (error) {
            console.error('Error capturing patterns:', error);
            // Handle error
        }
    };
    
    return (
        <div className="flex flex-col relative justify-center items-center w-4/12 ml-10 h-full ">
            <div className="main_register h-96 w-96 m-10 flex flex-col items-center justify-center">
            <div className="main_card1 h-96 w-96 m-10 flex justify-center">
                <div className="part1 color1 flex w-96 h-96 bg-white justify-center rounded-full z-30">
                    <img src={AddUser} alt="Register" />
                </div>
                <div className="part1_5 color1_5 absolute w-96 h-96 bg-blue-400 flex justify-center items-center rounded-full z-40 cursor-pointer opacity-0"
                    onClick={handlePart1_5Click}>
                    <div className="flex justify-center items-center">
                        <h1 className="text-3xl text-nowrap text-black">
                            Register Now
                        </h1>
                    </div>
                </div>
                <div className="part2 color2 absolute w-96 h-96 rounded-full z-20"></div>
                <div className="part3 color3 absolute w-96 h-96 rounded-full z-10"></div>
            </div>
            <div className="register_heading text-3xl">
                <h1>Register Now</h1>
            </div>
            </div>
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-black p-4 rounded shadow-lg text-white">
                        {error && (
                            <div className="bg-red-500 text-white p-2 mb-2 rounded">
                                {error}
                            </div>
                        )}
                        {step === 1 ? (
                            <div>
                                <label>
                                    Enter Your Name:
                                    <input
                                        type="text"
                                        value={stringInput}
                                        onChange={(e) => setStringInput(e.target.value)}
                                        className="border p-2 m-2"
                                    />
                                </label>
                                <button
                                    onClick={handleNextClick}
                                    className="bg-blue-500 text-white p-2 rounded"
                                >
                                    Next
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label>
                                    Enter Your UID:
                                    <input
                                        type="number"
                                        value={integerInput}
                                        onChange={(e) => setIntegerInput(e.target.value)}
                                        className="border p-2 m-2"
                                    />
                                </label>
                                <button
                                    onClick={handleDoneClick}
                                    className="bg-green-500 text-white p-2 rounded"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Register;
