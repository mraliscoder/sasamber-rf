document.addEventListener('DOMContentLoaded', function() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const overlay = document.getElementById('overlay');
    const pulseImage = document.getElementById('pulseImage');
    const visualizer = document.getElementById('visualizer');

    fetch('music.mp3')
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

                function animate() {
                    requestAnimationFrame(animate);

                    analyser.getByteFrequencyData(dataArray);
                    const bass = dataArray.slice(0, bufferLength / 4).reduce((a, b) => a + b, 0);

                    const scale = (1 + bass) / 1000;
                    pulseImage.style.transform = `scale(${scale})`;
                }

                animate();
            });
        })
        .catch(e => console.error('Error with decoding audio data', e));
});
