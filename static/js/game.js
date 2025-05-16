// Configuración inicial del juego
let config = {
    gravedad: 1.622,
    combustible_inicial: 1000,
    velocidad_segura_aterrizaje: 4.0,
    potencia_motor: 5.0
};

// Estado del juego
let estado = {
    enJuego: false,
    altitud: 1000,
    velocidadVertical: 0,
    velocidadHorizontal: 0,
    combustible: 1000,
    posicionX: 400,
    propulsionActiva: false,
    propulsionIzquierda: false,
    propulsionDerecha: false,
    terreno: [],
    zonaAterrizaje: { inicio: 0, fin: 0 },
    naveDestruida: false,
    animacionExplosion: {
        activa: false,
        frame: 0,
        maxFrames: 30,
        posicionX: 0,
        posicionY: 0
    }
};

// Referencias a elementos del DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const btnIniciar = document.getElementById('btn-iniciar');
const btnReiniciar = document.getElementById('btn-reiniciar');
const altitudElement = document.getElementById('altitud');
const velocidadVerticalElement = document.getElementById('velocidad-vertical');
const velocidadHorizontalElement = document.getElementById('velocidad-horizontal');
const combustibleElement = document.getElementById('combustible');
const mensajeResultado = document.getElementById('mensaje-resultado');
const textoResultado = document.getElementById('texto-resultado');
const detallesResultado = document.getElementById('detalles-resultado');

// Referencias a los controles táctiles
const btnArriba = document.getElementById('btn-arriba');
const btnIzquierda = document.getElementById('btn-izquierda');
const btnDerecha = document.getElementById('btn-derecha');

// Detectar si es un dispositivo móvil
const esMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Ajustar el tamaño del canvas para dispositivos móviles
function ajustarTamanoCanvas() {
    if (esMobile) {
        // En móviles, ajustar el ancho al 100% del contenedor
        const contenedor = canvas.parentElement;
        const anchoDisponible = contenedor.clientWidth;
        
        // Mantener la relación de aspecto 4:3
        const altoCalculado = (anchoDisponible * 3) / 4;
        
        // Establecer dimensiones del canvas
        canvas.style.width = anchoDisponible + 'px';
        canvas.style.height = altoCalculado + 'px';
    }
}

// Llamar a la función de ajuste al cargar y al cambiar el tamaño de la ventana
window.addEventListener('load', ajustarTamanoCanvas);
window.addEventListener('resize', ajustarTamanoCanvas);

// Imágenes
const naveImg = new Image();
naveImg.src = '/static/images/nave.png';
const llamaImg = new Image();
llamaImg.src = '/static/images/llama.png';

// Obtener configuración del servidor
fetch('/api/config')
    .then(response => response.json())
    .then(data => {
        config = data;
        estado.combustible = config.combustible_inicial;
        actualizarInterfaz();
    })
    .catch(error => console.error('Error al obtener configuración:', error));

// Inicializar el juego
function iniciarJuego() {
    estado.enJuego = true;
    estado.altitud = 1000;
    estado.velocidadVertical = 0;
    estado.velocidadHorizontal = 0;
    estado.combustible = config.combustible_inicial;
    estado.posicionX = canvas.width / 2;
    estado.naveDestruida = false;
    
    // Generar terreno lunar aleatorio
    generarTerreno();
    
    // Inicializar estrellas fijas
    inicializarEstrellas();
    
    // Actualizar interfaz
    actualizarInterfaz();
    
    // Cambiar estado de botones
    btnIniciar.disabled = true;
    btnReiniciar.disabled = false;
    
    // Ocultar mensaje de resultado
    mensajeResultado.classList.add('oculto');
    
    // Iniciar bucle del juego
    requestAnimationFrame(actualizarJuego);
}

// Generar terreno lunar aleatorio
function generarTerreno() {
    estado.terreno = [];
    
    // Generar puntos del terreno
    const numPuntos = 20;
    const anchoSegmento = canvas.width / numPuntos;
    
    for (let i = 0; i <= numPuntos; i++) {
        const x = i * anchoSegmento;
        const y = canvas.height - 50 - Math.random() * 100;
        estado.terreno.push({ x, y });
    }
    
    // Crear zona de aterrizaje plana
    const indiceZona = Math.floor(Math.random() * (numPuntos - 3)) + 1;
    const alturaZona = canvas.height - 50 - Math.random() * 80;
    
    estado.terreno[indiceZona].y = alturaZona;
    estado.terreno[indiceZona + 1].y = alturaZona;
    estado.terreno[indiceZona + 2].y = alturaZona;
    
    estado.zonaAterrizaje = {
        inicio: estado.terreno[indiceZona].x,
        fin: estado.terreno[indiceZona + 2].x
    };
}

// Actualizar el estado del juego
function actualizarJuego(timestamp) {
    if (!estado.enJuego) return;
    
    // Actualizar posición y velocidad
    actualizarFisica();
    
    // Dibujar escena
    dibujarEscena();
    
    // Comprobar colisiones
    if (comprobarColision()) {
        finalizarJuego();
        return;
    }
    
    // Actualizar interfaz
    actualizarInterfaz();
    
    // Continuar bucle
    requestAnimationFrame(actualizarJuego);
}

// Actualizar física del juego
function actualizarFisica() {
    // Aplicar gravedad
    estado.velocidadVertical += config.gravedad * 0.02;
    
    // Aplicar propulsión si está activa y hay combustible
    if (estado.propulsionActiva && estado.combustible > 0) {
        estado.velocidadVertical -= config.potencia_motor * 0.02;
        estado.combustible -= 1;
    }
    
    // Aplicar propulsión lateral
    if (estado.propulsionIzquierda && estado.combustible > 0) {
        estado.velocidadHorizontal -= 1 * 0.02;
        estado.combustible -= 0.5;
    }
    
    if (estado.propulsionDerecha && estado.combustible > 0) {
        estado.velocidadHorizontal += 1 * 0.02;
        estado.combustible -= 0.5;
    }
    
    // Actualizar posición
    estado.posicionX += estado.velocidadHorizontal;
    estado.altitud -= estado.velocidadVertical;
    
    // Limitar posición X dentro del canvas
    if (estado.posicionX < 0) estado.posicionX = 0;
    if (estado.posicionX > canvas.width) estado.posicionX = canvas.width;
}

// Dibujar la escena del juego
function dibujarEscena() {
    // Limpiar canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar estrellas
    dibujarEstrellas();
    
    // Dibujar terreno lunar
    dibujarTerreno();
    
    // Dibujar nave si no está destruida
    if (!estado.naveDestruida) {
        dibujarNave();
    }
}

// Estrellas fijas en el cielo
let estrellas = [];

// Colores de estrellas
const coloresEstrellas = [
    { nombre: 'blanca', rgb: [255, 255, 255] },
    { nombre: 'amarilla', rgb: [255, 255, 0] },
    { nombre: 'roja', rgb: [255, 0, 0] },
    { nombre: 'azul', rgb: [30, 144, 255] }  // Azul brillante
];

// Inicializar estrellas fijas
function inicializarEstrellas() {
    estrellas = [];
    
    // Crear estrellas blancas (más numerosas)
    for (let i = 0; i < 80; i++) {
        estrellas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            tamaño: Math.random() * 2 + 0.5,
            brillo: Math.random() * 0.5 + 0.5,  // Brillo base entre 0.5 y 1
            velocidadTitileo: Math.random() * 0.02 + 0.005,  // Velocidad de titileo muy lenta
            color: 'blanca',
            rgb: [255, 255, 255],
            amplitudTitileo: 0.01  // Amplitud normal
        });
    }
    
    // Crear estrellas amarillas (menos numerosas)
    for (let i = 0; i < 30; i++) {
        estrellas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            tamaño: Math.random() * 3 + 1,  // Ligeramente más grandes
            brillo: Math.random() * 0.4 + 0.6,  // Más brillantes
            velocidadTitileo: Math.random() * 0.015 + 0.003,
            color: 'amarilla',
            rgb: [255, 255, 0],
            amplitudTitileo: 0.01  // Amplitud normal
        });
    }
    
    // Crear estrellas rojas (pocas, pero más grandes)
    for (let i = 0; i < 20; i++) {
        estrellas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            tamaño: Math.random() * 3.5 + 1.5,  // Más grandes
            brillo: Math.random() * 0.3 + 0.7,  // Más brillantes
            velocidadTitileo: Math.random() * 0.01 + 0.002,
            color: 'roja',
            rgb: [255, 0, 0],
            amplitudTitileo: 0.01  // Amplitud normal
        });
    }
    
    // Crear estrellas azules (más pequeñas y con titileo más pronunciado)
    for (let i = 0; i < 50; i++) {
        estrellas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            tamaño: Math.random() * 1.5 + 0.3,  // Más pequeñas
            brillo: Math.random() * 0.3 + 0.7,  // Brillantes
            velocidadTitileo: Math.random() * 0.05 + 0.02,  // Titileo más rápido
            color: 'azul',
            rgb: [30, 144, 255],  // Azul brillante
            amplitudTitileo: 0.03  // Mayor amplitud de titileo
        });
    }
    
    // Añadir algunas estrellas azules muy pequeñas con titileo intenso (como estrellas distantes)
    for (let i = 0; i < 30; i++) {
        estrellas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            tamaño: Math.random() * 0.8 + 0.2,  // Muy pequeñas
            brillo: Math.random() * 0.4 + 0.6,  // Brillo medio
            velocidadTitileo: Math.random() * 0.08 + 0.04,  // Titileo muy rápido
            color: 'azul',
            rgb: [100, 180, 255],  // Azul más claro
            amplitudTitileo: 0.05  // Amplitud de titileo muy alta
        });
    }
    
    // Añadir algunas estrellas especiales más grandes (como planetas lejanos)
    for (let i = 0; i < 5; i++) {
        // Elegir un color aleatorio para cada planeta
        const colorIndex = Math.floor(Math.random() * coloresEstrellas.length);
        const color = coloresEstrellas[colorIndex];
        
        estrellas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.5,  // Más arriba en el cielo
            tamaño: Math.random() * 4 + 3,  // Mucho más grandes
            brillo: Math.random() * 0.2 + 0.8,  // Muy brillantes
            velocidadTitileo: Math.random() * 0.005 + 0.001,  // Titileo muy lento
            color: color.nombre,
            rgb: [...color.rgb],
            amplitudTitileo: 0.005  // Amplitud baja (planetas titilan poco)
        });
    }
}

// Dibujar estrellas en el fondo
function dibujarEstrellas() {
    // Si no hay estrellas inicializadas, crearlas
    if (estrellas.length === 0) {
        inicializarEstrellas();
    }
    
    // Dibujar cada estrella con su brillo actual
    for (let estrella of estrellas) {
        // Actualizar brillo para efecto de titileo personalizado por tipo de estrella
        estrella.brillo += Math.sin(Date.now() * estrella.velocidadTitileo) * estrella.amplitudTitileo;
        
        // Mantener el brillo en un rango adecuado
        if (estrella.brillo > 1) estrella.brillo = 1;
        if (estrella.brillo < 0.4) estrella.brillo = 0.4;
        
        // Aplicar brillo al color de la estrella
        const r = Math.floor(estrella.rgb[0] * estrella.brillo);
        const g = Math.floor(estrella.rgb[1] * estrella.brillo);
        const b = Math.floor(estrella.rgb[2] * estrella.brillo);
        
        // Efecto especial para estrellas azules pequeñas (titileo más pronunciado)
        if (estrella.color === 'azul' && estrella.tamaño < 1) {
            // Hacer que ocasionalmente parpadeen más intensamente
            if (Math.random() < 0.03) {
                ctx.fillStyle = `rgb(255, 255, 255)`; // Destello blanco ocasional
                const tamañoOriginal = estrella.tamaño;
                estrella.tamaño *= 1.5; // Aumentar temporalmente el tamaño
                ctx.beginPath();
                ctx.arc(estrella.x, estrella.y, estrella.tamaño, 0, Math.PI * 2);
                ctx.fill();
                estrella.tamaño = tamañoOriginal; // Restaurar tamaño original
            } else {
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.beginPath();
                ctx.arc(estrella.x, estrella.y, estrella.tamaño, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Dibujo normal para otras estrellas
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.beginPath();
            ctx.arc(estrella.x, estrella.y, estrella.tamaño, 0, Math.PI * 2);
            ctx.fill();
            
            // Para estrellas más grandes, añadir un resplandor
            if (estrella.tamaño > 2.5) {
                // Crear un gradiente radial para el resplandor
                const resplandor = ctx.createRadialGradient(
                    estrella.x, estrella.y, estrella.tamaño * 0.5,
                    estrella.x, estrella.y, estrella.tamaño * 3
                );
                
                resplandor.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
                resplandor.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.3)`);
                resplandor.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                
                ctx.fillStyle = resplandor;
                ctx.beginPath();
                ctx.arc(estrella.x, estrella.y, estrella.tamaño * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Efecto especial para estrellas azules (rayos de luz)
            if (estrella.color === 'azul' && estrella.tamaño > 1.5) {
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
                ctx.lineWidth = 0.5;
                
                // Dibujar rayos de luz
                for (let i = 0; i < 4; i++) {
                    const angulo = (Math.PI / 2) * i;
                    ctx.beginPath();
                    ctx.moveTo(estrella.x, estrella.y);
                    ctx.lineTo(
                        estrella.x + Math.cos(angulo) * estrella.tamaño * 5,
                        estrella.y + Math.sin(angulo) * estrella.tamaño * 5
                    );
                    ctx.stroke();
                }
            }
        }
    }
}

// Dibujar el terreno lunar
function dibujarTerreno() {
    // Dibujar líneas del terreno
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    
    for (const punto of estado.terreno) {
        ctx.lineTo(punto.x, punto.y);
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    
    ctx.fillStyle = '#555555';
    ctx.fill();
    
    // Dibujar zona de aterrizaje mucho más llamativa
    const inicioZona = estado.zonaAterrizaje.inicio;
    const finZona = estado.zonaAterrizaje.fin;
    const anchoZona = finZona - inicioZona;
    const alturaBase = 10; // Base más alta
    
    // Efecto de parpadeo para la zona de aterrizaje
    const tiempoActual = Date.now() / 1000;
    const intensidadParpadeo = (Math.sin(tiempoActual * 3) + 1) / 2; // Valor entre 0 y 1
    
    // Gradiente para la plataforma de aterrizaje
    const gradiente = ctx.createLinearGradient(inicioZona, 0, finZona, 0);
    gradiente.addColorStop(0, '#00ff00'); // Verde brillante
    gradiente.addColorStop(0.5, '#50fa7b'); // Verde claro
    gradiente.addColorStop(1, '#00ff00'); // Verde brillante
    
    // Dibujar la plataforma principal
    ctx.fillStyle = gradiente;
    ctx.fillRect(inicioZona, estado.terreno[1].y - alturaBase + 3, anchoZona, alturaBase);
    
    // Dibujar luces parpadeantes en los bordes
    const colorLuces = `rgba(255, 255, 255, ${intensidadParpadeo})`;
    ctx.fillStyle = colorLuces;
    
    // Luces en los bordes
    const tamanoLuz = 5;
    for (let i = 0; i < 5; i++) {
        // Luces izquierdas
        ctx.beginPath();
        ctx.arc(inicioZona + 5, estado.terreno[1].y - i * 2, tamanoLuz, 0, Math.PI * 2);
        ctx.fill();
        
        // Luces derechas
        ctx.beginPath();
        ctx.arc(finZona - 5, estado.terreno[1].y - i * 2, tamanoLuz, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Texto "ATERRIZAJE" en la plataforma
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('ATERRIZAJE', inicioZona + anchoZona/2, estado.terreno[1].y - 2);
    
    // Dibujar flechas indicadoras encima de la zona
    const alturaPunta = 40;
    const anchoPunta = 20;
    
    // Flecha izquierda
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.moveTo(inicioZona + anchoPunta, estado.terreno[1].y - alturaPunta);
    ctx.lineTo(inicioZona - anchoPunta, estado.terreno[1].y - alturaPunta/2);
    ctx.lineTo(inicioZona + anchoPunta, estado.terreno[1].y - alturaPunta/4);
    ctx.closePath();
    ctx.fill();
    
    // Flecha derecha
    ctx.beginPath();
    ctx.moveTo(finZona - anchoPunta, estado.terreno[1].y - alturaPunta);
    ctx.lineTo(finZona + anchoPunta, estado.terreno[1].y - alturaPunta/2);
    ctx.lineTo(finZona - anchoPunta, estado.terreno[1].y - alturaPunta/4);
    ctx.closePath();
    ctx.fill();
}

// Dibujar la nave espacial
function dibujarNave() {
    const naveY = canvas.height - estado.altitud;
    
    // Dibujar la nave con un tamaño más grande y colores más brillantes
    
    // Añadir un contorno para mayor visibilidad
    ctx.strokeStyle = '#FF9900';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(estado.posicionX, naveY - 40);  // Punta superior
    ctx.lineTo(estado.posicionX - 25, naveY);  // Esquina izquierda
    ctx.lineTo(estado.posicionX + 25, naveY);  // Esquina derecha
    ctx.closePath();
    ctx.stroke();
    
    // Cuerpo principal de la nave (triángulo más grande)
    ctx.fillStyle = '#DDDDFF';  // Color más claro y visible
    ctx.beginPath();
    ctx.moveTo(estado.posicionX, naveY - 40);  // Punta superior
    ctx.lineTo(estado.posicionX - 25, naveY);  // Esquina izquierda
    ctx.lineTo(estado.posicionX + 25, naveY);  // Esquina derecha
    ctx.closePath();
    ctx.fill();
    
    // Cabina de la nave (más grande y visible)
    ctx.fillStyle = '#50fa7b';  // Verde brillante
    ctx.beginPath();
    ctx.rect(estado.posicionX - 10, naveY - 30, 20, 15);
    ctx.fill();
    
    // Detalles adicionales (líneas de la nave)
    ctx.strokeStyle = '#5555FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(estado.posicionX, naveY - 40);
    ctx.lineTo(estado.posicionX, naveY - 15);
    ctx.stroke();
    
    // Patas de aterrizaje más visibles
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Pata izquierda
    ctx.moveTo(estado.posicionX - 15, naveY - 5);
    ctx.lineTo(estado.posicionX - 30, naveY + 10);
    // Pata derecha
    ctx.moveTo(estado.posicionX + 15, naveY - 5);
    ctx.lineTo(estado.posicionX + 30, naveY + 10);
    ctx.stroke();
    
    // Base de las patas
    ctx.fillStyle = '#AAAAAA';
    ctx.beginPath();
    ctx.rect(estado.posicionX - 35, naveY + 8, 10, 5);
    ctx.rect(estado.posicionX + 25, naveY + 8, 10, 5);
    ctx.fill();
    
    // Dibujar propulsión si está activa
    if (estado.propulsionActiva && estado.combustible > 0) {
        // Llama principal más grande y brillante
        ctx.fillStyle = '#FF5500';
        ctx.beginPath();
        ctx.moveTo(estado.posicionX - 12, naveY);
        ctx.lineTo(estado.posicionX, naveY + 35);  // Más larga
        ctx.lineTo(estado.posicionX + 12, naveY);
        ctx.closePath();
        ctx.fill();
        
        // Centro de la llama (más brillante)
        ctx.fillStyle = '#FFDD00';
        ctx.beginPath();
        ctx.moveTo(estado.posicionX - 6, naveY);
        ctx.lineTo(estado.posicionX, naveY + 25);
        ctx.lineTo(estado.posicionX + 6, naveY);
        ctx.closePath();
        ctx.fill();
        
        // Núcleo de la llama (blanco)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(estado.posicionX - 3, naveY);
        ctx.lineTo(estado.posicionX, naveY + 15);
        ctx.lineTo(estado.posicionX + 3, naveY);
        ctx.closePath();
        ctx.fill();
    }
    
    // Propulsores laterales mejorados
    if (estado.propulsionIzquierda && estado.combustible > 0) {
        ctx.fillStyle = '#FF7700';
        ctx.beginPath();
        ctx.moveTo(estado.posicionX - 20, naveY - 15);
        ctx.lineTo(estado.posicionX - 35, naveY - 5);
        ctx.lineTo(estado.posicionX - 20, naveY);
        ctx.closePath();
        ctx.fill();
        
        // Centro más brillante
        ctx.fillStyle = '#FFDD00';
        ctx.beginPath();
        ctx.moveTo(estado.posicionX - 22, naveY - 12);
        ctx.lineTo(estado.posicionX - 30, naveY - 7);
        ctx.lineTo(estado.posicionX - 22, naveY - 3);
        ctx.closePath();
        ctx.fill();
    }
    
    if (estado.propulsionDerecha && estado.combustible > 0) {
        ctx.fillStyle = '#FF7700';
        ctx.beginPath();
        ctx.moveTo(estado.posicionX + 20, naveY - 15);
        ctx.lineTo(estado.posicionX + 35, naveY - 5);
        ctx.lineTo(estado.posicionX + 20, naveY);
        ctx.closePath();
        ctx.fill();
        
        // Centro más brillante
        ctx.fillStyle = '#FFDD00';
        ctx.beginPath();
        ctx.moveTo(estado.posicionX + 22, naveY - 12);
        ctx.lineTo(estado.posicionX + 30, naveY - 7);
        ctx.lineTo(estado.posicionX + 22, naveY - 3);
        ctx.closePath();
        ctx.fill();
    }
}

// Comprobar colisión con el terreno
function comprobarColision() {
    const naveY = canvas.height - estado.altitud;
    
    // Obtener altura del terreno en la posición X de la nave
    let alturaTerreno = 0;
    
    for (let i = 0; i < estado.terreno.length - 1; i++) {
        const p1 = estado.terreno[i];
        const p2 = estado.terreno[i + 1];
        
        if (estado.posicionX >= p1.x && estado.posicionX <= p2.x) {
            // Interpolación lineal para obtener la altura exacta
            const factor = (estado.posicionX - p1.x) / (p2.x - p1.x);
            alturaTerreno = p1.y + factor * (p2.y - p1.y);
            break;
        }
    }
    
    // Comprobar si la nave ha tocado el terreno
    if (naveY >= alturaTerreno) {
        return true;
    }
    
    return false;
}

// Animar la explosión de la nave
function animarExplosion() {
    if (!estado.animacionExplosion.activa) return;
    
    // Limpiar canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar estrellas y terreno
    dibujarEstrellas();
    dibujarTerreno();
    
    // Dibujar explosión
    const { posicionX, posicionY, frame } = estado.animacionExplosion;
    const radio = frame * 2;
    
    // Círculo exterior (naranja)
    ctx.fillStyle = '#FF5500';
    ctx.beginPath();
    ctx.arc(posicionX, posicionY, radio, 0, Math.PI * 2);
    ctx.fill();
    
    // Círculo medio (amarillo)
    ctx.fillStyle = '#FFDD00';
    ctx.beginPath();
    ctx.arc(posicionX, posicionY, radio * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // Círculo interior (blanco)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(posicionX, posicionY, radio * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Partículas de la explosión
    ctx.fillStyle = '#FF7700';
    for (let i = 0; i < 20; i++) {
        const angulo = Math.random() * Math.PI * 2;
        const distancia = Math.random() * radio * 1.2;
        const tamano = Math.random() * 5 + 2;
        const x = posicionX + Math.cos(angulo) * distancia;
        const y = posicionY + Math.sin(angulo) * distancia;
        
        ctx.beginPath();
        ctx.arc(x, y, tamano, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Actualizar frame
    estado.animacionExplosion.frame++;
    
    // Continuar animación o finalizar
    if (estado.animacionExplosion.frame < estado.animacionExplosion.maxFrames) {
        requestAnimationFrame(animarExplosion);
    } else {
        estado.animacionExplosion.activa = false;
        mostrarMensajeResultado(false);
    }
}

// Mostrar mensaje de resultado
function mostrarMensajeResultado(exitoso) {
    // Mostrar mensaje de resultado
    mensajeResultado.classList.remove('oculto');
    
    if (exitoso) {
        mensajeResultado.classList.add('exito');
        mensajeResultado.classList.remove('fracaso');
        textoResultado.textContent = '¡Aterrizaje Exitoso!';
        detallesResultado.textContent = `Velocidad de aterrizaje: ${estado.velocidadVertical.toFixed(2)} m/s. Combustible restante: ${estado.combustible}`;
    } else {
        mensajeResultado.classList.add('fracaso');
        mensajeResultado.classList.remove('exito');
        textoResultado.textContent = '¡Módulo Lunar Destruido!';
        detallesResultado.textContent = `Velocidad de impacto: ${estado.velocidadVertical.toFixed(2)} m/s. La velocidad segura es menor a ${config.velocidad_segura_aterrizaje} m/s.`;
    }
    
    // Enviar puntaje al servidor
    enviarPuntaje(exitoso);
}

// Finalizar el juego
function finalizarJuego() {
    estado.enJuego = false;
    
    // Comprobar si el aterrizaje fue exitoso
    const exitoso = comprobarAterrizajeExitoso();
    
    if (!exitoso) {
        // Iniciar animación de explosión
        estado.naveDestruida = true;
        estado.animacionExplosion.activa = true;
        estado.animacionExplosion.frame = 0;
        estado.animacionExplosion.posicionX = estado.posicionX;
        estado.animacionExplosion.posicionY = canvas.height - estado.altitud;
        
        // Animar la explosión antes de mostrar el mensaje
        animarExplosion();
        return;
    }
    
    // Mostrar mensaje de resultado inmediatamente para aterrizaje exitoso
    mostrarMensajeResultado(exitoso);
}

// Comprobar si el aterrizaje fue exitoso
function comprobarAterrizajeExitoso() {
    // Comprobar velocidad vertical
    const velocidadSegura = estado.velocidadVertical < config.velocidad_segura_aterrizaje;
    
    // Comprobar si aterrizó en la zona de aterrizaje
    const enZonaAterrizaje = (
        estado.posicionX >= estado.zonaAterrizaje.inicio && 
        estado.posicionX <= estado.zonaAterrizaje.fin
    );
    
    return velocidadSegura && enZonaAterrizaje;
}

// Enviar puntaje al servidor
function enviarPuntaje(exitoso) {
    const datos = {
        exitoso: exitoso,
        velocidad_vertical: estado.velocidadVertical,
        velocidad_horizontal: estado.velocidadHorizontal,
        combustible_restante: estado.combustible,
        tiempo: new Date().toISOString()
    };
    
    fetch('/api/guardar_puntaje', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    })
    .then(response => response.json())
    .then(data => console.log('Puntaje guardado:', data))
    .catch(error => console.error('Error al guardar puntaje:', error));
}

// Actualizar elementos de la interfaz
function actualizarInterfaz() {
    altitudElement.textContent = `${Math.round(estado.altitud)} m`;
    velocidadVerticalElement.textContent = `${estado.velocidadVertical.toFixed(2)} m/s`;
    velocidadHorizontalElement.textContent = `${estado.velocidadHorizontal.toFixed(2)} m/s`;
    combustibleElement.textContent = Math.round(estado.combustible);
}

// Reiniciar el juego
function reiniciarJuego() {
    iniciarJuego();
}

// Eventos de teclado
document.addEventListener('keydown', (e) => {
    if (!estado.enJuego) return;
    
    switch (e.key) {
        case 'ArrowUp':
            estado.propulsionActiva = true;
            break;
        case 'ArrowLeft':
            estado.propulsionIzquierda = true;
            break;
        case 'ArrowRight':
            estado.propulsionDerecha = true;
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            estado.propulsionActiva = false;
            break;
        case 'ArrowLeft':
            estado.propulsionIzquierda = false;
            break;
        case 'ArrowRight':
            estado.propulsionDerecha = false;
            break;
    }
});

// Eventos de botones de interfaz
btnIniciar.addEventListener('click', iniciarJuego);
btnReiniciar.addEventListener('click', reiniciarJuego);

// Eventos para controles táctiles en dispositivos móviles

// Función para manejar eventos táctiles
function manejarEventosTactiles() {
    // Botón de propulsión (arriba)
    btnArriba.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevenir comportamiento predeterminado
        estado.propulsionActiva = true;
    });
    
    btnArriba.addEventListener('touchend', (e) => {
        e.preventDefault();
        estado.propulsionActiva = false;
    });
    
    // Botón izquierda
    btnIzquierda.addEventListener('touchstart', (e) => {
        e.preventDefault();
        estado.propulsionIzquierda = true;
    });
    
    btnIzquierda.addEventListener('touchend', (e) => {
        e.preventDefault();
        estado.propulsionIzquierda = false;
    });
    
    // Botón derecha
    btnDerecha.addEventListener('touchstart', (e) => {
        e.preventDefault();
        estado.propulsionDerecha = true;
    });
    
    btnDerecha.addEventListener('touchend', (e) => {
        e.preventDefault();
        estado.propulsionDerecha = false;
    });
    
    // Manejar caso donde el usuario mueve el dedo fuera del botón
    document.addEventListener('touchcancel', () => {
        estado.propulsionActiva = false;
        estado.propulsionIzquierda = false;
        estado.propulsionDerecha = false;
    });
}

// También añadir soporte para eventos de mouse (para pruebas en desktop)
function manejarEventosMouse() {
    btnArriba.addEventListener('mousedown', () => {
        estado.propulsionActiva = true;
    });
    
    btnArriba.addEventListener('mouseup', () => {
        estado.propulsionActiva = false;
    });
    
    btnIzquierda.addEventListener('mousedown', () => {
        estado.propulsionIzquierda = true;
    });
    
    btnIzquierda.addEventListener('mouseup', () => {
        estado.propulsionIzquierda = false;
    });
    
    btnDerecha.addEventListener('mousedown', () => {
        estado.propulsionDerecha = true;
    });
    
    btnDerecha.addEventListener('mouseup', () => {
        estado.propulsionDerecha = false;
    });
    
    // Manejar caso donde el usuario suelta el botón fuera del elemento
    document.addEventListener('mouseup', () => {
        estado.propulsionActiva = false;
        estado.propulsionIzquierda = false;
        estado.propulsionDerecha = false;
    });
}

// Inicializar controles táctiles
manejarEventosTactiles();
manejarEventosMouse();

// Dibujar escena inicial
dibujarEscena();

// Función para bloquear la orientación a landscape en dispositivos móviles
function bloquearOrientacion() {
    if (esMobile && window.screen.orientation && window.screen.orientation.lock) {
        try {
            // Intentar bloquear la orientación a landscape
            window.screen.orientation.lock('landscape').catch(() => {
                console.log('No se pudo bloquear la orientación');
            });
        } catch (error) {
            console.log('API de orientación no soportada');
        }
    }
}

// Intentar bloquear la orientación cuando el usuario inicia el juego
btnIniciar.addEventListener('click', bloquearOrientacion);
