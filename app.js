document.addEventListener('DOMContentLoaded', function () {
    let products = []; // Lista de productos del CSV
    let scannedUnits = {}; // Unidades escaneadas para cada producto
    let globalUnitsScanned = 0; // Contador global de unidades escaneadas
    let totalUnits = 0; // Total de unidades esperadas
    let html5QrCode;
    let audioContext; // Contexto de audio para dispositivos móviles

    // Función para inicializar el contexto de audio (importante para dispositivos móviles)
    function initializeAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("Contexto de audio inicializado.");
        }
    }

    // Sonidos de éxito y error
    const successSound = new Audio("sounds/success.mp3");
    const errorSound = new Audio("sounds/error.mp3");

    // Habilitar el contexto de audio al hacer clic en cualquier botón (para móviles)
    document.body.addEventListener('click', initializeAudioContext, { once: true });

    // Contenedor del resultado temporal
    const scanResultContainer = document.getElementById('scan-result');
    const resultIcon = document.getElementById('result-icon');

    // Cargar el archivo CSV y extraer los productos
    document.getElementById('load-csv').addEventListener('click', () => {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput.files[0];

        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    products = results.data.map(item => ({
                        codigo_barra: item['codigo_barra'].trim(),
                        cantidad: parseInt(item['cantidad'].trim()),
                        ciudad: item['ciudad'].trim()
                    }));

                    // Reiniciar contadores
                    scannedUnits = {};
                    globalUnitsScanned = 0;
                    totalUnits = products.reduce((acc, product) => acc + product.cantidad, 0);

                    products.forEach(product => {
                        scannedUnits[product.codigo_barra] = 0; // Inicializar las unidades escaneadas en 0
                    });

                    // Actualizar lista y contadores globales
                    updateScannedList();
                    updateGlobalCounter();
                },
                error: function (error) {
                    alert("Error al leer el archivo CSV: " + error.message);
                }
            });
        } else {
            alert("Por favor, selecciona un archivo CSV.");
        }
    });

    // Detectar la tecla "Enter" en el campo de entrada de código de barras
    document.getElementById('barcodeInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evitar el comportamiento por defecto
            handleBarcodeScan(document.getElementById('barcodeInput').value.trim());
        }
    });

    // Configurar la inicialización de la cámara
    document.getElementById('btn-abrir-camara').addEventListener('click', function () {
        initializeAudioContext(); // Asegurarse de que el contexto de audio esté inicializado
        const scannerContainer = document.getElementById('scanner-container');
        const mainContent = document.getElementById('main-content');

        // Mostrar el contenedor de la cámara
        scannerContainer.style.display = 'block';
        mainContent.style.display = 'none'; // Ocultar el contenido principal

        // Iniciar la cámara usando `Html5Qrcode`
        try {
            html5QrCode = new Html5Qrcode("scanner-video");

            html5QrCode.start(
                { facingMode: "environment" }, // Usar la cámara trasera en móviles
                {
                    fps: 10, // Velocidad de fotogramas
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    handleBarcodeScan(decodedText); // Manejar el escaneo del código de barras
                },
                (errorMessage) => {
                    console.log(`Error de escaneo: ${errorMessage}`);
                }
            ).then(() => {
                console.log("Cámara iniciada correctamente.");
            }).catch((err) => {
                console.error("Error al iniciar la cámara:", err);
                alert("Error al iniciar la cámara. Asegúrate de permitir el acceso.");
            });
        } catch (e) {
            console.error("Error al crear Html5Qrcode:", e);
        }
    });

    // Función para detener la cámara y volver a la vista principal
    document.getElementById('close-scanner').addEventListener('click', function () {
        const scannerContainer = document.getElementById('scanner-container');
        const mainContent = document.getElementById('main-content');

        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                scannerContainer.style.display = 'none'; // Ocultar el contenedor del escáner
                mainContent.style.display = 'block'; // Mostrar el contenido principal
                console.log("Cámara detenida.");
            }).catch(err => {
                console.error("Error al detener la cámara:", err);
            });
        }
    });

    // Función para manejar el escaneo del código de barras
    function handleBarcodeScan(scannedCode) {
        // Obtener solo la parte del código antes del guion
        const sanitizedCode = scannedCode.split('-')[0].trim();

        const product = products.find(p => p.codigo_barra === sanitizedCode);

        if (product) {
            const currentScanned = scannedUnits[product.codigo_barra] || 0;

            if (currentScanned < product.cantidad) {
                scannedUnits[product.codigo_barra] = currentScanned + 1;
                globalUnitsScanned += 1;

                successSound.play(); // Reproducir sonido de éxito
                showTemporaryResult(true); // Mostrar ícono de éxito
                updateScannedList(product.codigo_barra); // Actualizar la lista con el último código
                updateGlobalCounter(); // Actualizar contador global
            }
        } else {
            errorSound.play(); // Reproducir sonido de error
            showTemporaryResult(false); // Mostrar ícono de error
            alert("El código escaneado no coincide con ningún producto.");
        }

        document.getElementById('barcodeInput').value = '';
    }

    // Mostrar el resultado temporalmente (verde para éxito, rojo para error)
    function showTemporaryResult(isSuccess) {
        if (isSuccess) {
            resultIcon.innerHTML = '&#10004;'; // Icono de check
            scanResultContainer.style.backgroundColor = 'rgba(0, 255, 0, 0.8)'; // Verde para éxito
        } else {
            resultIcon.innerHTML = '&#10006;'; // Icono de cruz
            scanResultContainer.style.backgroundColor = 'rgba(255, 0, 0, 0.8)'; // Rojo para error
        }

        scanResultContainer.classList.add('show-result');
        setTimeout(() => {
            scanResultContainer.classList.remove('show-result');
        }, 3000); // Ocultar después de 3 segundos
    }

    // Función para actualizar la lista de unidades escaneadas y ordenar
    function updateScannedList(scannedCode = '') {
        const scannedList = document.getElementById('scanned-list');
        scannedList.innerHTML = '';

        const sortedProducts = products.slice().sort((a, b) => {
            if (a.codigo_barra === scannedCode) return -1; // Mover el producto escaneado al principio
            if (b.codigo_barra === scannedCode) return 1;
            return 0;
        });

        sortedProducts.forEach(product => {
            const totalScanned = scannedUnits[product.codigo_barra] || 0;
            const progressWidth = (totalScanned / product.cantidad) * 100;
            let statusClass = '';

            if (totalScanned === product.cantidad) {
                statusClass = 'status-complete';
            } else if (totalScanned > 0) {
                statusClass = 'status-warning';
            } else {
                statusClass = 'status-incomplete';
            }

            const li = document.createElement('li');
            li.className = statusClass;
            li.innerHTML = `
                <span>Código: ${product.codigo_barra}</span>
                <span class="city">Ciudad: ${product.ciudad}</span>
                <div class="progress-bar">
                    <div class="progress-bar-inner" style="width: ${progressWidth}%"></div>
                </div>
                <span class="progress-text">${totalScanned} de ${product.cantidad} unidades escaneadas</span>
            `;
            scannedList.appendChild(li);
        });
    }

    // Función para actualizar el contador global de unidades escaneadas
    function updateGlobalCounter() {
        const globalCounter = document.getElementById('global-counter');
        const globalCounterScanner = document.getElementById('global-counter-scanner');
        globalCounter.innerText = `Unidades descargadas: ${globalUnitsScanned} de ${totalUnits}`;
        globalCounterScanner.innerText = `Unidades descargadas: ${globalUnitsScanned} de ${totalUnits}`;
    }
});
