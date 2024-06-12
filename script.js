document.addEventListener('DOMContentLoaded', function() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const overlay = document.getElementById('overlay');
    const pulseImage = document.getElementById('pulseImage');
    const visualizer = document.getElementById('visualizer');
    
    songNum=Math.floor(Math.random() * 3);
    fetch('music'+songNum+'.mp3')
        .then(response => {
            
            const contentLength = response.headers.get('content-length');
            if (!contentLength) {
                throw new Error('Content-Length response header unavailable');
            }

            const total = parseInt(contentLength, 10);
            let loaded = 0;

            const reader = response.body.getReader();
            const stream = new ReadableStream({
                start(controller) {
                    function push() {
                        reader.read().then(({ done, value }) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            loaded += value.byteLength;
                            const percentLoaded = Math.round((loaded / total) * 100);
                            overlay.textContent = `Loading... ${percentLoaded}%`;
                            controller.enqueue(value);
                            push();
                        });
                    }
                    push();
                }
            });

            return new Response(stream);
        })
        .then(response => response.arrayBuffer())
        .then(data => audioContext.decodeAudioData(data))
        .then(buffer => {
            overlay.textContent = 'Click anywhere to play';

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            source.connect(analyser);
            analyser.connect(audioContext.destination);
            visualizer.addEventListener('click', function() {
                overlay.style.display = 'none';
                document.getElementById("container").classList.add("spin");
                source.start(0);

                // const canvas = document.getElementById("spectrum"); //canvas for visual debug
                // const ctx = canvas.getContext("2d");
                
                function animate() {
                    requestAnimationFrame(animate);

                    analyser.getByteFrequencyData(dataArray);

                    const bass = dataArray.slice(bufferLength / 12, bufferLength / 6).reduce((a, b) => a + b, 0)/((bufferLength/12)*256);//now variates between 1 and 0
                    const mids = dataArray.slice((bufferLength / 12)*4, (bufferLength / 12)*5).reduce((a, b) => a + b, 0)/((bufferLength/12)*256);
                    const highs = dataArray.slice((bufferLength / 12)*9, (bufferLength / 12)*10).reduce((a, b) => a + b, 0)/((bufferLength/12)*256);
                    
                    // ctx.fillStyle = "white";
                    // ctx.fillRect(0, 0, 256, 256);
                    // ctx.moveTo(0,256);
                    // ctx.beginPath();
                    // ctx.strokeStyle="green";
                    // for(i=0;i<128;i++){
                    //     ctx.lineTo(i*2,256-dataArray[i]);
                    // }
                    // ctx.stroke();

                    // ctx.beginPath();
                    // ctx.strokeStyle="red";
                    // ctx.moveTo(0,256-(bass*256));
                    // ctx.lineTo(256,256-(bass*256));
                    // ctx.closePath();
                    // ctx.stroke();

                    // ctx.beginPath();
                    // ctx.strokeStyle="yellow";
                    // ctx.moveTo(0,256-(mids*256));
                    // ctx.lineTo(256,256-(mids*256));
                    // ctx.closePath();
                    // ctx.stroke();

                    // ctx.beginPath();
                    // ctx.strokeStyle="blue";
                    // ctx.moveTo(0,256-(highs*256));
                    // ctx.lineTo(256,256-(highs*256));
                    // ctx.closePath();
                    // ctx.stroke();

                    const scale = (3 + bass*2 +mids + highs);
                    pulseImage.style.transform = `scale(${scale})`;
                }

                animate();
            });
        })
        .catch(e => console.error('Error with decoding audio data', e));
});
