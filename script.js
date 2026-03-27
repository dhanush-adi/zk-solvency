document.addEventListener('DOMContentLoaded', () => {
    const heroVisual = document.querySelector('.hero-visual');
    const shapeLayers = document.querySelectorAll('.shape');
    const body = document.body;

    body.addEventListener('mousemove', (e) => {
        if (!heroVisual) return;
        
        // Calculate normalize mouse position (-1 to +1)
        const xIndex = (e.clientX / window.innerWidth - 0.5) * 2;
        const yIndex = (e.clientY / window.innerHeight - 0.5) * 2;

        // Apply slight rotation to container
        const rotX = -yIndex * 15; // up to 15deg
        const rotY = xIndex * 15;
        heroVisual.style.setProperty('--rotX', `${rotX}deg`);
        heroVisual.style.setProperty('--rotY', `${rotY}deg`);

        // Apply parallax offsets to shapes
        shapeLayers.forEach(layer => {
            layer.style.setProperty('--mx', `${xIndex * 8}px`);
            layer.style.setProperty('--my', `${yIndex * 8}px`);
        });
    });
    
    body.addEventListener('mouseleave', () => {
        if (!heroVisual) return;
        // Reset on leave
        heroVisual.style.setProperty('--rotX', `0deg`);
        heroVisual.style.setProperty('--rotY', `0deg`);
        shapeLayers.forEach(layer => {
            layer.style.setProperty('--mx', `0px`);
            layer.style.setProperty('--my', `0px`);
        });
    });
});




// --- CANVAS SINE WAVES ---
document.addEventListener('DOMContentLoaded', () => {
    let hero = document.querySelector('.hero');
    if (!hero) return;

    let canvas = document.getElementById('hero-waves');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'hero-waves';
        
        // CSS breakout technique: Allows absolute positioning to escape the 1400px parent limits
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)'; 
        canvas.style.width = '100vw'; // Forces width to strict physical monitor edges
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '0';
        
        if (getComputedStyle(hero).position === 'static') {
            hero.style.position = 'relative'; 
        }
        
        hero.insertBefore(canvas, hero.firstChild);
    }

    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
        // Javascript breakout technique: Forces vector trace to physical monitor edges
        width = window.innerWidth;
        height = hero.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();

    // Pumped opacities to distinct high-contrast white rendering
    const waves = [
        { yOffset: 0.5, amplitude: 45, frequency: 0.001, speed: 0.005, color: 'rgba(255, 255, 255, 0.4)', width: 1.5 },
        { yOffset: 0.55, amplitude: 65, frequency: 0.0008, speed: 0.003, color: 'rgba(255, 255, 255, 0.3)', width: 1.2 },
        { yOffset: 0.45, amplitude: 35, frequency: 0.0015, speed: 0.006, color: 'rgba(255, 255, 255, 0.25)', width: 2 },
        { yOffset: 0.6, amplitude: 85, frequency: 0.0005, speed: 0.002, color: 'rgba(255, 255, 255, 0.2)', width: 1 },
        { yOffset: 0.4, amplitude: 55, frequency: 0.0012, speed: 0.004, color: 'rgba(255, 255, 255, 0.35)', width: 1.5 }
    ];

    let time = 0;
    let mouseTargetY = 0;
    let mouseCurrentY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseTargetY = ((e.clientY / window.innerHeight) - 0.5) * 2;
    });

    function draw() {
        ctx.clearRect(0, 0, width, height);
        time += 1;
        
        mouseCurrentY += (mouseTargetY - mouseCurrentY) * 0.05;

        waves.forEach((wave, i) => {
            ctx.beginPath();
            
            const dynamicAmplitude = wave.amplitude + (mouseCurrentY * 15 * (i % 2 === 0 ? 1 : -1));
            
            for (let x = 0; x <= width; x += 5) {
                const y = (height * wave.yOffset) + 
                          Math.sin(x * wave.frequency + time * wave.speed) * dynamicAmplitude;
                
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = wave.width;
            
            // Intensely bright white core shadow
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            
            ctx.stroke();
            ctx.shadowBlur = 0;
        });

        requestAnimationFrame(draw);
    }
    
    draw();
});
