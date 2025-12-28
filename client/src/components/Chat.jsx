import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';


const Chat = ({ socket, roomId, userName }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (msg, user) => {
            setMessages(prev => [...prev, { text: msg, user }]);
        };

        socket.on('create-message', handleMessage);

        return () => {
            socket.off('create-message', handleMessage);
        };
    }, [socket]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && socket) {
            // Server expects (message, userName), roomId is handled by server room closure
            socket.emit('send-message', input, userName);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">

            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
                {messages.map((msg, index) => (
                    <div key={index} className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">{msg.user}</span>
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-800 dark:text-white text-sm max-w-[80%] break-words shadow-sm">
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm transition-colors"
                />
                <button
                    type="submit"
                    className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
                    disabled={!input.trim()}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default Chat;
