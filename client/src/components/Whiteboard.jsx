import React, { useEffect, useRef, useState } from 'react';

const Whiteboard = ({ socket, roomId }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');

    // Helper to get coordinates
    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        // Handle touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Logical size (shared coordinate system)
        canvas.width = 800;
        canvas.height = 600;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;

        // Socket listener for incoming drawing data
        const handleCanvasData = (data) => {
            const { x0, y0, x1, y1, color } = data;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = color;
            ctx.stroke();
            ctx.closePath();
        };

        if (socket) {
            socket.on('canvas-data', handleCanvasData);
        }

        return () => {
            if (socket) socket.off('canvas-data', handleCanvasData);
        };
    }, [socket]);

    const lastPos = useRef({ x: 0, y: 0 });

    const startDrawing = (e) => {
        // Prevent scrolling on touch
        if (e.touches) e.preventDefault();

        setIsDrawing(true);
        lastPos.current = getPos(e);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        if (e.touches) e.preventDefault();

        const { x, y } = getPos(e);
        const { x: x0, y: y0 } = lastPos.current;

        // Draw locally
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x, y);
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.closePath();

        // Emit to server
        if (socket) {
            socket.emit('canvas-data', { roomId, x0, y0, x1: x, y1: y, color });
        }

        lastPos.current = { x, y };
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    return (
        <div className="flex flex-col items-center bg-white rounded-lg overflow-hidden shadow-2xl p-2 relative w-full h-full max-h-[80vh] aspect-[4/3]">
            <div className="absolute top-2 left-2 flex gap-2 z-10">
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 cursor-pointer border-none"
                />
                <button
                    onClick={() => {
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        // TODO: Emit clear event
                    }}
                    className="bg-red-500 text-white px-2 rounded text-xs"
                >
                    Clear
                </button>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="border border-gray-300 cursor-crosshair bg-white w-full h-full touch-none"
            />
        </div>
    );
};

export default Whiteboard;
