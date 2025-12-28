import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';

const Home = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden relative transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            </div>

            {/* Top Right Navigation */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 flex items-center gap-4">
                <ThemeToggle />
                <Link
                    to="/login"
                    className="px-6 py-2 bg-white/10 dark:bg-black/20 border border-gray-200 dark:border-white/20 hover:bg-white/20 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-full transition-all backdrop-blur-sm font-medium"
                >
                    Sign In
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 text-center px-4"
            >
                <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-600 mb-6">
                    Connect. Collaborate.
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                    Experience the future of video conferencing with real-time collaboration tools,
                    secure streaming, and a beautiful interface.
                </p>

                <div className="flex flex-col gap-4 items-center">
                    {/* Create Meeting */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                            try {
                                // Check auth
                                const token = localStorage.getItem('token');
                                if (!token) {
                                    window.location.href = '/login';
                                    return;
                                }

                                const res = await fetch('http://localhost:5000/api/room', { method: 'POST' });
                                const data = await res.json();
                                window.location.href = `/room/${data.roomId}`;
                            } catch (e) {
                                console.error(e);
                            }
                        }}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg transition-all w-64"
                    >
                        Start New Meeting
                    </motion.button>

                    {/* Join Meeting (Input) */}
                    <div className="flex gap-2 w-full max-w-sm">
                        <input
                            type="text"
                            placeholder="Enter Room Code"
                            className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm"
                            id="roomInput"
                        />
                        <button
                            onClick={() => {
                                const code = document.getElementById('roomInput').value;
                                if (code) window.location.href = `/room/${code}`;
                            }}
                            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-md"
                        >
                            Join
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Home;
