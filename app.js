// Global variables
let peer = null;
let currentCall = null;
let localStream = null;
let myPeerId = null;
let isMuted = false;

// DOM elements
const setupSection = document.getElementById('setupSection');
const callSection = document.getElementById('callSection');
const roomInput = document.getElementById('roomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const muteBtn = document.getElementById('muteBtn');
const hangupBtn = document.getElementById('hangupBtn');
const speakerBtn = document.getElementById('speakerBtn');
const copyRoomBtn = document.getElementById('copyRoomBtn');
const remoteAudio = document.getElementById('remoteAudio');
const localAudio = document.getElementById('localAudio');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const currentRoomId = document.getElementById('currentRoomId');
const callStatusText = document.getElementById('callStatusText');
const remoteAvatar = document.getElementById('remoteAvatar');

// Initialize PeerJS
function initializePeer() {
    // Create peer with random ID or use existing one
    peer = new Peer({
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        myPeerId = id;
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Ready';
    });

    peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Connection error';
        alert('Connection error: ' + error.type);
    });

    peer.on('disconnected', () => {
        console.log('Disconnected from peer server');
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Disconnected';
    });

    // Handle incoming calls
    peer.on('call', async (call) => {
        console.log('Receiving call from:', call.peer);

        // Get microphone access
        if (!localStream) {
            const hasMedia = await getUserMedia();
            if (!hasMedia) return;
        }

        // Answer the call
        currentCall = call;
        call.answer(localStream);

        // Handle the remote stream
        call.on('stream', (remoteStream) => {
            console.log('Received remote stream');
            remoteAudio.srcObject = remoteStream;
            callStatusText.textContent = 'Connected';
            remoteAvatar.classList.add('active');
        });

        call.on('close', () => {
            console.log('Call closed');
            handleCallEnded();
        });

        call.on('error', (error) => {
            console.error('Call error:', error);
            alert('Call error: ' + error);
        });

        // Show call interface
        setupSection.style.display = 'none';
        callSection.style.display = 'block';
        currentRoomId.textContent = call.peer;
        callStatusText.textContent = 'Connecting...';
    });
}

// Get user media (microphone)
async function getUserMedia() {
    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        let errorMsg = 'Your browser does not support microphone access.\n\n';
        errorMsg += 'Current URL: ' + window.location.href + '\n\n';
        errorMsg += 'To fix this:\n';
        errorMsg += '1. Make sure you are accessing via http://localhost:8000 (NOT 127.0.0.1)\n';
        errorMsg += '2. Try a modern browser (Chrome, Firefox, Edge)\n';
        errorMsg += '3. Make sure the server is running on port 8000\n';
        alert(errorMsg);
        return false;
    }

    try {
        console.log('Requesting microphone access...');
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localAudio.srcObject = localStream;
        console.log('Got microphone access');
        return true;
    } catch (error) {
        console.error('Error accessing microphone:', error);

        let errorMessage = 'Microphone access error:\n\n';
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Permission denied. Please click the camera/microphone icon in your browser address bar and allow access.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError') {
            errorMessage += 'Microphone is being used by another application.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage += 'Microphone constraints not supported.';
        } else if (error.name === 'SecurityError') {
            errorMessage += 'Page must be served over HTTPS or localhost.\n\nCurrent URL: ' + window.location.href;
        } else {
            errorMessage += error.name + ' - ' + error.message;
        }

        alert(errorMessage);
        return false;
    }
}

// Make a call to a peer
async function makeCall(peerId) {
    if (!peer || !peer.id) {
        alert('Not connected to peer server yet. Please wait...');
        return;
    }

    // Get microphone access
    if (!localStream) {
        const hasMedia = await getUserMedia();
        if (!hasMedia) return;
    }

    console.log('Calling peer:', peerId);
    callStatusText.textContent = 'Calling...';

    // Make the call
    currentCall = peer.call(peerId, localStream);

    // Handle the remote stream
    currentCall.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        remoteAudio.srcObject = remoteStream;
        callStatusText.textContent = 'Connected';
        remoteAvatar.classList.add('active');
    });

    currentCall.on('close', () => {
        console.log('Call closed');
        handleCallEnded();
    });

    currentCall.on('error', (error) => {
        console.error('Call error:', error);
        alert('Call failed. Make sure the room ID is correct.');
        hangup();
    });

    // Show call interface
    setupSection.style.display = 'none';
    callSection.style.display = 'block';
    currentRoomId.textContent = peerId;
}

// Event handlers
createRoomBtn.addEventListener('click', async () => {
    if (!peer || !peer.id) {
        alert('Not connected yet. Please wait...');
        return;
    }

    // Get microphone access
    if (!localStream) {
        const hasMedia = await getUserMedia();
        if (!hasMedia) return;
    }

    // Use custom room ID or peer ID
    const customRoomId = roomInput.value.trim();
    const roomId = customRoomId || myPeerId;

    // If custom room ID is provided, reconnect with that ID
    if (customRoomId && customRoomId !== myPeerId) {
        peer.destroy();
        peer = new Peer(customRoomId, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        peer.on('open', (id) => {
            console.log('Room created with ID:', id);
            myPeerId = id;
            currentRoomId.textContent = id;
            setupSection.style.display = 'none';
            callSection.style.display = 'block';
            callStatusText.textContent = 'Waiting for other person...';
        });

        peer.on('error', (error) => {
            if (error.type === 'unavailable-id') {
                alert('This room ID is already taken. Please choose a different one.');
                initializePeer();
            } else {
                console.error('Peer error:', error);
                alert('Error creating room: ' + error.type);
            }
        });

        // Handle incoming calls
        peer.on('call', async (call) => {
            console.log('Receiving call from:', call.peer);
            currentCall = call;
            call.answer(localStream);

            call.on('stream', (remoteStream) => {
                console.log('Received remote stream');
                remoteAudio.srcObject = remoteStream;
                callStatusText.textContent = 'Connected';
                remoteAvatar.classList.add('active');
            });

            call.on('close', () => {
                console.log('Call closed');
                handleCallEnded();
            });
        });
    } else {
        currentRoomId.textContent = roomId;
        setupSection.style.display = 'none';
        callSection.style.display = 'block';
        callStatusText.textContent = 'Waiting for other person...';
    }
});

joinRoomBtn.addEventListener('click', () => {
    const roomId = roomInput.value.trim();
    if (!roomId) {
        alert('Please enter a room ID');
        return;
    }
    makeCall(roomId);
});

muteBtn.addEventListener('click', () => {
    if (!localStream) return;

    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;
    muteBtn.classList.toggle('active');

    if (isMuted) {
        muteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
        `;
    } else {
        muteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
        `;
    }
});

hangupBtn.addEventListener('click', () => {
    hangup();
});

copyRoomBtn.addEventListener('click', () => {
    const roomId = currentRoomId.textContent;
    navigator.clipboard.writeText(roomId);
    copyRoomBtn.textContent = 'Copied!';
    setTimeout(() => {
        copyRoomBtn.textContent = 'Copy';
    }, 2000);
});

// Hangup function
function hangup() {
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Close current call
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }

    // Reset UI
    isMuted = false;
    callSection.style.display = 'none';
    setupSection.style.display = 'block';
    roomInput.value = '';
    remoteAvatar.classList.remove('active');
    muteBtn.classList.remove('active');
    remoteAudio.srcObject = null;

    // Reinitialize peer
    if (peer) {
        peer.destroy();
    }
    initializePeer();
}

// Handle call ended
function handleCallEnded() {
    callStatusText.textContent = 'Call ended';
    remoteAvatar.classList.remove('active');
    remoteAudio.srcObject = null;

    setTimeout(() => {
        callStatusText.textContent = 'Waiting for other person...';
    }, 3000);
}

// Initialize on page load
window.addEventListener('load', () => {
    initializePeer();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (currentCall) {
        currentCall.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peer) {
        peer.destroy();
    }
});
