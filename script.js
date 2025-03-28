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
                
                // Use the new function
                hideAllBadges();
                scanAttempts = 0;
                
                // Reset result text
                resultElement.innerText = "No QR code detected";
                
                // Keep result container hidden until a QR code is detected
                document.querySelector('.result-container').classList.add('hidden');
                
                requestAnimationFrame(tick);
            })
            .catch(function(error) {
                console.error("Error accessing the camera: ", error);
                resultElement.innerText = "Error accessing the camera. Please make sure you've granted camera permissions.";
                // Show result container for error message
                document.querySelector('.result-container').classList.remove('hidden');
            });
        } else {
            resultElement.innerText = "Sorry, your browser doesn't support camera access.";
            // Show result container for error message
            document.querySelector('.result-container').classList.remove('hidden');
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
        
        // Hide verified badge when stopping
        verifiedBadge.classList.add('hidden');
        verifiedBadge.classList.remove('show-badge');
        notVerifiedBadge.classList.add('hidden');
        notVerifiedBadge.classList.remove('show-badge');
        
        // Hide the result container when stopping
        document.querySelector('.result-container').classList.add('hidden');
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
                
                // Check if the QR code contains "Ticket"
                if (code.data.includes("Ticket")) {
                    // Show the result container
                    document.querySelector('.result-container').classList.remove('hidden');
                    
                    // Hide all badges first
                    hideAllBadges();
                    
                    // Then show verified badge
                    verifiedBadge.classList.remove('hidden');
                    setTimeout(() => {
                        verifiedBadge.classList.add('show-badge');
                    }, 100);
                    
                    // Play success sound
                    playVerifiedSound();
                    
                    // Show standalone notification
                    showStandaloneNotification("Verified", true);
                } else {
                    // Not a valid ticket
                    // Hide the result container
                    document.querySelector('.result-container').classList.add('hidden');
                    
                    // Show not verified notification
                    hideAllBadges();
                    notVerifiedBadge.classList.remove('hidden');
                    notVerifiedBadge.classList.add('show-badge');
                    
                    // Create a standalone notification for "Not Verified"
                    showStandaloneNotification("Not Verified", false);
                }
                
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
                showStandaloneNotification("Not Verified", false);
                scanAttempts = 0;
                // Hide the result container for not verified notification
                document.querySelector('.result-container').classList.add('hidden');
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
        hideAllBadges();
        
        // Hide the scan result box
        resultElement.innerText = "";
        
        // Show not verified badge
        notVerifiedBadge.classList.remove('hidden');
        notVerifiedBadge.classList.add('show-badge');
        
        // Make sure the badge is visible in the DOM
        document.body.offsetHeight; // Force a reflow
    }
    
    // Add this function to ensure only one badge is shown at a time
    function hideAllBadges() {
        verifiedBadge.classList.add('hidden');
        verifiedBadge.classList.remove('show-badge');
        notVerifiedBadge.classList.add('hidden');
        notVerifiedBadge.classList.remove('show-badge');
    }
    
    // Add this function to play a verification sound
    function playVerifiedSound() {
        // Create an AudioContext
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create an oscillator for a simple beep
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Connect the nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set parameters for a pleasant sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime); // Higher frequency for success
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Lower volume
        
        // Start and stop the sound
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15); // Short duration
        
        // Add a second tone for a more pleasant sound
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            oscillator2.connect(gainNode);
            oscillator2.type = 'sine';
            oscillator2.frequency.setValueAtTime(1800, audioContext.currentTime); // Higher frequency
            oscillator2.start();
            oscillator2.stop(audioContext.currentTime + 0.1); // Even shorter duration
        }, 100);
    }
    
    // Add this new function to your script.js file
    function showStandaloneNotification(message, isSuccess) {
        // Remove any existing notifications
        const existingNotification = document.getElementById('standalone-notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }
        
        // Create a new notification element
        const notification = document.createElement('div');
        notification.id = 'standalone-notification';
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.backgroundColor = isSuccess ? '#4CAF50' : '#f44336';
        notification.style.color = 'white';
        notification.style.padding = '20px';
        notification.style.borderRadius = '10px';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        notification.style.zIndex = '1000';
        notification.style.textAlign = 'center';
        notification.style.fontFamily = 'Poppins, sans-serif';
        notification.style.fontSize = '24px';
        notification.style.fontWeight = 'bold';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.justifyContent = 'center';
        
        // Add icon
        const icon = document.createElement('i');
        icon.className = isSuccess ? 'fas fa-check-circle' : 'fas fa-times-circle';
        icon.style.marginRight = '10px';
        icon.style.fontSize = '30px';
        notification.appendChild(icon);
        
        // Add message
        const text = document.createElement('span');
        text.textContent = message;
        notification.appendChild(text);
        
        // Add to body
        document.body.appendChild(notification);
        
        // Remove after 2 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }
        }, 2000);
    }
}); 