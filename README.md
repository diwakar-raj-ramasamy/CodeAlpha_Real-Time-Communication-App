# Real-Time Communication App

A feature-rich video conferencing application built with the MERN stack (MongoDB, Express, React, Node.js), Socket.IO, and WebRTC (PeerJS). This application allows users to create private rooms for video calls, real-time chat, and collaborative whiteboarding.


## 🚀 Features

- **Real-Time Video & Audio:** High-quality video calls using WebRTC.
- **Instant Messaging:** Built-in chat functionality powered by Socket.IO.
- **Collaborative Whiteboard:** Draw and visualize ideas in real-time with others.
- **Screen Sharing:** Share your screen with the room (Desktop & Mobile support).
- **Smart Camera Handling:** Automatically detects and avoids IR cameras (common issue on Dell Latitudes) to prevent black screens.
- **Audio-Only Fallback:** Automatically switches to audio mode if no camera is detected.
- **Dark/Light Mode:** Fully responsive UI with theme support.
- **Secure Rooms:** Unique room IDs for private sessions.

## 🛠️ Tech Stack

**Frontend:**
- React.js (Vite)
- Tailwind CSS v4 (Styling)
- Framer Motion (Animations)
- PeerJS (WebRTC Wrapper)
- Lucide React (Icons)

**Backend:**
- Node.js
- Express.js
- Socket.IO (Signaling & Real-time events)
- PeerJS Server (Optional / or using public Cloud PeerServer)

## 📦 Installation & Setup

### Prerequisites
- Node.js installed on your machine.
- MongoDB (if backend uses it for auth, otherwise local storage/mock).

### 1. Clone the Repository
```bash
git clone <repository-url>
cd real-time-communication-app
```

### 2. Backend Setup
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
# Start the backend server (Running on port 5000)
npm start
# OR for development with nodemon
node index.js
```

### 3. Frontend Setup
Open a new terminal, navigate to the client directory:
```bash
cd client
npm install
# Start the frontend dev server (Running on port 5173)
npm run dev
```

## 🖥️ Usage

1.  Open your browser and verify the backend is running at `http://localhost:5000`.
2.  Go to the frontend URL: `http://localhost:5173`.
3.  **Sign In / Sign Up** to access the dashboard.
4.  **Create a Room** or join an existing one using a Room ID.
5.  **Permissions:** Allow Camera and Microphone access when prompted.
    *   *Note: If you see a black screen on a Dell laptop, the app will automatically try to switch to the correct RGB camera.*

## 🔧 Troubleshooting

**"No Camera Found" / Black Screen:**
- Check if your laptop has a privacy shutter.
- **Dell Users:** This app has a built-in fix for Dell IR cameras. If it still fails, ensure your drivers are up to date.
- Try closing other apps using the camera (Zoom, Teams).

**Mobile Issues:**
- Screen sharing on mobile depends on browser support (Android Chrome usually works, iOS Safari has limitations).
- Use the "More" button (three dots) to access Chat and Whiteboard on mobile.

## 🤝 Contributing

Feel free to fork this project and submit pull requests.

## 📄 License

This project is open-source and available under the MIT License.
