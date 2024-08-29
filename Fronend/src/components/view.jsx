import React from 'react';
import View from '../assets/view.png';

const ViewAtt = () => {
    return (
        <div className="flex flex-col relative justify-center items-center w-4/12 ml-10 h-full ">
            <div className="main_view h-96 w-96 m-10 flex flex-col items-center justify-center">
                <div className="main_card1  h-96 w-96 m-10 flex justify-center">
                <div className="part1 color1_1 flex w-96 h-96 bg-white justify-center items-center rounded-full z-30">
                    <div className="flex justify-center items-center">
                        <img src={View} alt="" />
                    </div>
                </div>
                <div className="part1_5 bg-[#db373b] absolute w-96 h-96 flex justify-center items-center rounded-full z-30 opacity-0">
                    <div className="flex justify-center items-center"> 
                        <h1 className="text-3xl text-nowrap">
                            View Attendence
                        </h1>
                    </div>
                </div>
                <div className="part2 color1_2 absolute w-96 h-96 rounded-full z-20">

                </div>
                <div className="part3 color1_3 absolute w-96 h-96 rounded-full z-10">

                </div>
            </div>  
                <div className="view_heading text-3xl">
                    <h1>View Attendence</h1>
                </div>
            </div>
        </div>
    );
};

export default ViewAtt;
