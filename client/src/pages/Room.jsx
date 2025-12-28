import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import { motion } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, MonitorUp,
    PenTool, MessageSquare, PhoneOff, X, Users, Copy, MoreVertical
} from 'lucide-react';
import Chat from '../components/Chat';
import Whiteboard from '../components/Whiteboard';

import ThemeToggle from '../components/ThemeToggle';

const Room = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [peers, setPeers] = useState({}); // { peerId: stream }
    const [myStream, setMyStream] = useState(null);
    const [socketInstance, setSocketInstance] = useState(null);
    const userVideoRef = useRef();

    // Ensure video stream is attached reliably even after re-renders
    useEffect(() => {
        if (userVideoRef.current && myStream) {
            userVideoRef.current.srcObject = myStream;
        }
    }, [myStream]);

    const peersRef = useRef({}); // Keep track of peer call objects to remove later
    const socketRef = useRef();
    const myPeerRef = useRef();
    const myStreamRef = useRef(null);

    // Auth info
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    // Prevent rendering if not authenticated to avoid errors accessing user.name
    if (!user) return null;

    useEffect(() => {
        const socket = io('http://localhost:5000');
        socketRef.current = socket;
        setSocketInstance(socket);

        // Initialize Peer
        const myPeer = new Peer(undefined, {
            // Using default public PeerJS server
        });
        myPeerRef.current = myPeer;

        // State to track readiness
        let streamReady = false;
        let peerReady = false;
        let myId = null;

        const checkReadyAndJoin = () => {
            if (streamReady && peerReady && myId) {
                socket.emit('join-room', roomId, myId);
            }
        };

        // 1. Get User Media
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        }).then(stream => {
            console.log('Got MediaStream:', stream);
            setMyStream(stream);
            myStreamRef.current = stream;
            if (userVideoRef.current) {
                userVideoRef.current.srcObject = stream;
            }
            streamReady = true;

            // Handle Incoming Calls (moved here to ensure we have stream)
            myPeer.on('call', call => {
                console.log('Receiving call from', call.peer);
                call.answer(stream);
                call.on('stream', userVideoStream => {
                    console.log('Received stream from', call.peer);
                    addPeerStream(call.peer, userVideoStream);
                });
                peersRef.current[call.peer] = call;
            });

            checkReadyAndJoin();

        }).catch(err => {
            console.error('Failed to get local stream', err);
            // Even if we fail to get a stream (denied or no device), we should still join the room for Chat.
            streamReady = true;
            checkReadyAndJoin();
            // Optional: alert user but don't block
            // alert('Camera/Mic access denied. You can still use Chat.');
        });

        // 2. Handle User Connected
        socket.on('user-connected', userId => {
            console.log('User connected:', userId);
            // We need to wait for our stream to be ready before we can call
            const currentStream = myStreamRef.current;
            if (currentStream) {
                connectToNewUser(userId, currentStream, myPeer);
            } else {
                console.warn('Stream not ready when user connected');
            }
        });

        // 3. Handle Disconnect
        socket.on('user-disconnected', userId => {
            console.log('User disconnected:', userId);
            if (peersRef.current[userId]) {
                peersRef.current[userId].close();
            }
            removePeerStream(userId);
        });

        // 4. Peer Open
        myPeer.on('open', id => {
            console.log('My Peer ID:', id);
            peerReady = true;
            myId = id;
            checkReadyAndJoin();
        });

        return () => {
            socket.disconnect();
            myPeer.destroy();
            if (myStream) {
                myStream.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    const connectToNewUser = (userId, stream, myPeer) => {
        const call = myPeer.call(userId, stream);
        call.on('stream', userVideoStream => {
            addPeerStream(userId, userVideoStream);
        });
        call.on('close', () => {
            removePeerStream(userId);
        });

        peersRef.current[userId] = call;
    };

    const addPeerStream = (userId, stream) => {
        setPeers(prev => ({
            ...prev,
            [userId]: stream
        }));
    };

    const removePeerStream = (userId) => {
        setPeers(prev => {
            const newPeers = { ...prev };
            delete newPeers[userId];
            return newPeers;
        });
    };



    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(false);

    const getMediaStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setMyStream(stream);
            myStreamRef.current = stream;
            if (userVideoRef.current) {
                userVideoRef.current.srcObject = stream;
            }

            // If we have active calls, we might need to add tracks to them
            // Note: PeerJS behavior with late streams can be tricky. 
            // Ideally, we renegotiate, but for now we essentially 'activate' the local state.
            // A page reload might be required for full peer syncing if initial connection was purely receive-only.

            return stream;
        } catch (err) {
            console.error('Failed to get local stream', err);
            if (err.name === 'NotAllowedError') {
                alert('Permission denied. Please click the lock icon in your URL bar and allow Camera and Microphone access.');
            } else if (err.name === 'NotFoundError') {
                alert('No camera or microphone found on this device.');
            } else {
                alert(`Error accessing media devices: ${err.message}`);
            }
            return null;
        }
    };

    const toggleMute = async () => {
        if (!myStream) {
            const stream = await getMediaStream();
            if (!stream) return;
            setIsMuted(false);
            return;
        }
        const audioTrack = myStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = isMuted; // Toggle based on current state (false=enabled -> true=muted logic inverted essentially)
            // Wait, enabled=true means ACTIVE.
            // isMuted = false (initial).
            // click -> audioTrack.enabled = false (muted).
            // setIsMuted(true).
        }
        setIsMuted(!isMuted);
    };

    const toggleVideo = async () => {
        if (!myStream) {
            const stream = await getMediaStream();
            if (!stream) return;
            setIsVideoOff(false);
            return;
        }
        const videoTrack = myStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = isVideoOff; // isVideoOff=false (cam on). enabled = false (cam off).
        }
        setIsVideoOff(!isVideoOff);
    };

    const shareScreen = () => {
        navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(screenStream => {
            const screenTrack = screenStream.getVideoTracks()[0];

            Object.values(peersRef.current).forEach(call => {
                const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);
            });

            if (userVideoRef.current) userVideoRef.current.srcObject = screenStream;

            screenTrack.onended = () => {
                const camTrack = myStream.getVideoTracks()[0];
                Object.values(peersRef.current).forEach(call => {
                    const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
                    if (sender) sender.replaceTrack(camTrack);
                });
                if (userVideoRef.current) userVideoRef.current.srcObject = myStream;
            };
        });
    };

    const [showChat, setShowChat] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 flex gap-4 relative overflow-hidden transition-colors duration-300">
            <div className="flex-1 flex flex-col relative h-full">

                {/* Header */}
                <div className="flex items-center justify-between mb-4 bg-white/80 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm shadow-sm">
                    <div className="flex items-center gap-2">
                        <Users className="text-blue-600 dark:text-blue-500 w-6 h-6" />
                        <h1 className="text-xl font-bold">Room: <span className="text-blue-500 dark:text-blue-400">{roomId}</span></h1>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Whiteboard Overlay */}
                {showWhiteboard && (
                    <div className="absolute inset-0 z-50 bg-white/95 dark:bg-black/90 flex items-center justify-center p-4">
                        <div className="relative w-full h-full max-w-4xl flex flex-col justify-center">
                            <button
                                onClick={() => setShowWhiteboard(false)}
                                className="absolute top-4 right-4 text-white bg-red-600 p-2 rounded-full hover:bg-red-500 transition-colors z-50"
                            >
                                <X size={20} />
                            </button>
                            <Whiteboard socket={socketInstance} roomId={roomId} />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-24 overflow-y-auto max-h-[calc(100vh-12rem)]">
                    {/* My Video */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg aspect-video flex items-center justify-center overflow-hidden relative shadow-lg border border-gray-200 dark:border-gray-700 group">
                        {myStream ? (
                            <>
                                <video
                                    ref={userVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                                />
                                {isVideoOff && (
                                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
                                        <VideoOff size={48} />
                                        <p>Camera Off</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3 p-4 text-center">
                                <VideoOff size={48} className="text-red-500" />
                                <p className="text-sm font-medium">Camera access needed</p>
                                <button
                                    onClick={getMediaStream}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm transition-colors shadow-lg"
                                >
                                    Enable Camera
                                </button>
                            </div>
                        )}
                        <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-sm flex items-center gap-2 backdrop-blur-sm text-white">
                            Me {isMuted && <MicOff size={14} className="text-red-500" />}
                        </span>
                    </div>

                    {/* Peer Videos */}
                    {Object.entries(peers).map(([peerId, stream]) => (
                        <VideoPlayer key={peerId} stream={stream} peerId={peerId} />
                    ))}
                </div>

                {/* Popup Menu for Extra Controls - Moved outside to prevent clipping */}
                {showMoreMenu && (
                    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 p-3 bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl flex items-center gap-4 z-50 backdrop-blur-md shadow-2xl">
                        <button
                            onClick={() => {
                                shareScreen();
                                setShowMoreMenu(false);
                            }}
                            className="p-3 md:p-4 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-gray-700 dark:text-white transition-all duration-200 hover:scale-105"
                            title="Share Screen"
                        >
                            <MonitorUp size={20} className="md:w-6 md:h-6" />
                        </button>

                        <button
                            onClick={() => {
                                setShowWhiteboard(!showWhiteboard);
                                setShowMoreMenu(false);
                            }}
                            className={`p-3 md:p-4 rounded-full transition-all duration-200 ${showWhiteboard ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-purple-600 hover:text-white text-gray-700 dark:text-white'}`}
                            title="Whiteboard"
                        >
                            <PenTool size={20} className="md:w-6 md:h-6" />
                        </button>

                        <button
                            onClick={() => {
                                setShowChat(!showChat);
                                setShowMoreMenu(false);
                            }}
                            className={`p-3 md:p-4 rounded-full transition-all duration-200 md:hidden ${showChat ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-blue-600 hover:text-white text-gray-700 dark:text-white'}`}
                            title="Chat"
                        >
                            <MessageSquare size={20} className="md:w-6 md:h-6" />
                        </button>
                    </div>
                )}

                {/* Controls Bar */}
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 p-2 md:p-3 bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl flex items-center gap-2 md:gap-4 z-40 backdrop-blur-md shadow-2xl max-w-[95vw] overflow-x-auto no-scrollbar">
                    <button
                        onClick={toggleMute}
                        className={`p-3 md:p-4 rounded-full transition-all duration-200 ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white'}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={20} className="md:w-6 md:h-6" /> : <Mic size={20} className="md:w-6 md:h-6" />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-3 md:p-4 rounded-full transition-all duration-200 ${isVideoOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white'}`}
                        title={isVideoOff ? "Start Camera" : "Stop Camera"}
                    >
                        {isVideoOff ? <VideoOff size={20} className="md:w-6 md:h-6" /> : <Video size={20} className="md:w-6 md:h-6" />}
                    </button>

                    <div className="w-px h-8 bg-gray-600 mx-1 md:mx-2" />

                    {/* More Button */}
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`p-3 md:p-4 rounded-full transition-all duration-200 ${showMoreMenu ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white'}`}
                        title="More Options"
                    >
                        <MoreVertical size={20} className="md:w-6 md:h-6" />
                    </button>



                    <div className="w-px h-8 bg-gray-600 mx-1 md:mx-2" />

                    <button
                        onClick={() => window.location.href = '/'}
                        className="p-3 md:p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all duration-200 hover:scale-105"
                        title="End Call"
                    >
                        <PhoneOff size={20} className="md:w-6 md:h-6" />
                    </button>
                </div>
            </div>

            {/* Chat Sidebar (Desktop) */}
            <div className="fixed bottom-4 right-4 w-80 hidden md:flex h-[calc(100vh-6rem)] bg-white/90 dark:bg-gray-800/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white/95 dark:bg-gray-800/90">
                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white z-10">
                        <MessageSquare size={20} className="text-blue-400" />
                        In-Call Messages
                    </div>
                </div>
                <div className="flex-1 h-full overflow-hidden flex flex-col min-h-0 relative">
                    <Chat socket={socketInstance} roomId={roomId} userName={user.name} />
                </div>
            </div>

            {/* Chat Overlay (Mobile) */}
            {showChat && (
                <div className="fixed inset-0 z-50 bg-black/60 md:hidden flex justify-end backdrop-blur-sm">
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="w-full max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800"
                    >
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                                <MessageSquare size={20} className="text-blue-400" />
                                Chat
                            </h2>
                            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 h-full overflow-hidden flex flex-col min-h-0 relative">
                            <Chat socket={socketInstance} roomId={roomId} userName={user.name} />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

const VideoPlayer = ({ stream, peerId }) => {
    const ref = useRef();

    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);

    return (
        <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center overflow-hidden relative">
            <video
                ref={ref}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">User</span>
        </div>
    );
};

export default Room;
