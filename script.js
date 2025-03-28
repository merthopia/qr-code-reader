document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const resultElement = document.getElementById('result');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const verificationStatus = document.getElementById('verification-status');
    
    let scanning = false;
    
    // Start the scanner
    startButton.addEventListener('click', () => {
        startScanner();
    });
    
    // Stop the scanner
    stopButton.addEventListener('click', () => {
        stopScanner();
    });
    
    function startScanner() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            })
            .then(function(stream) {
                video.srcObject = stream;
                video.setAttribute("playsinline", true);
                video.play();
                
                scanning = true;
                startButton.disabled = true;
                stopButton.disabled = false;
                
                // Hide verification badge when starting new scan
                verificationStatus.classList.add('hidden');
                
                requestAnimationFrame(tick);
            })
            .catch(function(error) {
                console.error("Error accessing the camera: ", error);
                resultElement.innerText = "Error accessing the camera. Please make sure you've granted camera permissions.";
            });
        } else {
            resultElement.innerText = "Sorry, your browser doesn't support camera access.";
        }
    }
    
    function stopScanner() {
        scanning = false;
        
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => {
                track.stop();
            });
            video.srcObject = null;
        }
        
        startButton.disabled = false;
        stopButton.disabled = true;
        resultElement.innerText = "Scanner stopped";
        verificationStatus.classList.add('hidden');
    }
    
    function tick() {
        if (!scanning) return;
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                // QR code detected
                resultElement.innerText = formatTicketData(code.data);
                
                // Show verification badge
                verificationStatus.classList.remove('hidden');
                
                // Draw a box around the QR code
                drawQRCodeOutline(code.location);
                
                // Optional: Add a beep sound or vibration here
                
                // Pause scanning for a moment to avoid multiple scans of the same code
                scanning = false;
                setTimeout(() => {
                    scanning = true;
                    requestAnimationFrame(tick);
                }, 2000);
                
                return;
            }
        }
        
        requestAnimationFrame(tick);
    }
    
    function formatTicketData(data) {
        // This function can be customized to format the QR code data
        // For example, if the QR code contains JSON data, you can parse and format it
        try {
            const ticketData = JSON.parse(data);
            if (ticketData.name && ticketData.ticketId) {
                return `Name: ${ticketData.name}\nTicket ID: ${ticketData.ticketId}\nTicket Type: ${ticketData.type || 'Standard'}`;
            }
        } catch (e) {
            // If not JSON or parsing fails, return the raw data
        }
        return data;
    }
    
    function drawQRCodeOutline(location) {
        ctx.beginPath();
        ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
        ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
        ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
        ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
        ctx.lineTo(location.topLeftCorner.x, location.topLeftCorner.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#FF8C00"; // Zebra accent color
        ctx.stroke();
    }
}); 