document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const resultElement = document.getElementById('result');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const verifiedBadge = document.getElementById('verified-badge');
    const notVerifiedBadge = document.getElementById('not-verified-badge');
    
    let scanning = false;
    let scanAttempts = 0;
    
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
                
                // Hide verified badge when starting a new scan
                verifiedBadge.classList.add('hidden');
                verifiedBadge.classList.remove('show-badge');
                notVerifiedBadge.classList.add('hidden');
                notVerifiedBadge.classList.remove('show-badge');
                scanAttempts = 0;
                
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
        
        // Hide verified badge when stopping
        verifiedBadge.classList.add('hidden');
        verifiedBadge.classList.remove('show-badge');
        notVerifiedBadge.classList.add('hidden');
        notVerifiedBadge.classList.remove('show-badge');
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
                resultElement.innerText = code.data;
                
                // Draw a box around the QR code
                drawQRCodeOutline(code.location);
                
                // Show verified badge
                verifiedBadge.classList.remove('hidden');
                setTimeout(() => {
                    verifiedBadge.classList.add('show-badge');
                }, 100);
                
                // Reset scan attempts
                scanAttempts = 0;
                
                // Optional: Add a beep sound or vibration here
                
                // Pause scanning for a moment to avoid multiple scans of the same code
                scanning = false;
                setTimeout(() => {
                    scanning = true;
                    requestAnimationFrame(tick);
                }, 1000);
                
                return;
            }
            
            // Increment scan attempts if no QR code was found
            scanAttempts++;
            
            // Show "Not Verified" after several unsuccessful attempts
            if (scanAttempts > 60) { // About 1 second if running at 60fps
                showNotVerifiedNotification();
                scanAttempts = 0;
            }
        }
        
        requestAnimationFrame(tick);
    }
    
    function drawQRCodeOutline(location) {
        ctx.beginPath();
        ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
        ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
        ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
        ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
        ctx.lineTo(location.topLeftCorner.x, location.topLeftCorner.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#FF3B58";
        ctx.stroke();
    }
    
    function showNotVerifiedNotification() {
        // Hide verified badge if it's showing
        verifiedBadge.classList.add('hidden');
        verifiedBadge.classList.remove('show-badge');
        
        // Show not verified badge
        notVerifiedBadge.classList.remove('hidden');
        setTimeout(() => {
            notVerifiedBadge.classList.add('show-badge');
        }, 100);
        
        // Hide the notification after 3 seconds
        setTimeout(() => {
            notVerifiedBadge.classList.remove('show-badge');
            setTimeout(() => {
                notVerifiedBadge.classList.add('hidden');
            }, 500);
        }, 3000);
    }
}); 