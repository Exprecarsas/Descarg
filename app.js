document.addEventListener('DOMContentLoaded', function () {
    let products = []; // Lista de productos cargados desde el CSV
    let scannedUnits = {}; // Unidades escaneadas por cada producto
    let globalUnitsScanned = 0; // Contador global de unidades escaneadas
    let totalUnits = 0; // Cantidad total de unidades esperadas
    let html5QrCode; // Objeto para manejar el escáner
    let audioContext; // Contexto de audio para generar tonos

    const focusBox = document.getElementById("focus-box"); // Cuadro de enfoque dinámico

    // Inicializar contexto de audio para generar tonos
    function initializeAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("Contexto de audio inicializado.");
        }
    }

    // Generar un tono con Web Audio API
    function playTone(frequency, duration, type = 'sine', volume = 1.5) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.value = volume;
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, duration);
    }

    // Habilitar contexto de audio al hacer clic en el primer evento (para móviles)
    document.body.addEventListener('click', initializeAudioContext, { once: true });

    // Cargar archivo CSV y extraer productos
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

                    scannedUnits = {};
                    globalUnitsScanned = 0;
                    totalUnits = products.reduce((acc, product) => acc + product.cantidad, 0);
                    products.forEach(product => {
                        scannedUnits[product.codigo_barra] = 0;
                    });

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

    // Manejar la tecla "Enter" en el campo de entrada de código de barras
    document.getElementById('barcodeInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evitar el comportamiento por defecto
            handleBarcodeScan(document.getElementById('barcodeInput').value.trim());
        }
    });

    // Mostrar modal para finalizar la descarga
    document.getElementById('finalizar-descarga').addEventListener('click', () => {
        const modal = document.getElementById('modal');
        modal.style.display = 'flex';
        document.getElementById('fecha').value = new Date().toLocaleDateString();
    });

    // Cerrar el modal de información de la descarga
    document.getElementById('cerrar-modal').addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });

    // Generar reporte en Excel con la información adicional
    document.getElementById('generar-reporte').addEventListener('click', () => {
        const placa = document.getElementById('placa').value;
        const remitente = document.getElementById('remitente').value;
        const fecha = document.getElementById('fecha').value;

        if (!placa || !remitente) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        const reportData = [
            ['Placa de Vehículo', placa],
            ['Remitente', remitente],
            ['Fecha de Descargue', fecha],
            [],
            ['Código de Barra', 'Unidades Escaneadas', 'Ciudad']
        ];

        products.forEach(product => {
            reportData.push([product.codigo_barra, scannedUnits[product.codigo_barra], product.ciudad]);
        });

        const ws = XLSX.utils.aoa_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte Descargue');
        XLSX.writeFile(wb, `reporte_descargue_${new Date().toISOString().slice(0, 10)}.xlsx`);

        alert('Reporte generado correctamente.');
        document.getElementById('modal').style.display = 'none';
    });

    // Mostrar la cámara y el cuadro de enfoque dinámico
    document.getElementById('btn-abrir-camara').addEventListener('click', function () {
        initializeAudioContext();
        const scannerContainer = document.getElementById('scanner-container');
        const mainContent = document.getElementById('main-content');

        scannerContainer.style.display = 'block';
        mainContent.style.display = 'none';

        try {
            html5QrCode = new Html5Qrcode("scanner-video");

            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                disableFlip: true
            };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    handleBarcodeScan(decodedText);

                    // Ajustar el cuadro de enfoque dinámico según la ubicación del código detectado
                    const box = decodedResult.location;
                    if (box) {
                        focusBox.style.width = `${Math.abs(box.topLeftCorner.x - box.bottomRightCorner.x)}px`;
                        focusBox.style.height = `${Math.abs(box.topLeftCorner.y - box.bottomRightCorner.y)}px`;
                        focusBox.style.left = `${box.topLeftCorner.x}px`;
                        focusBox.style.top = `${box.topLeftCorner.y}px`;
                        focusBox.style.display = 'block';
                    }
                },
                (errorMessage) => console.log(`Error de escaneo: ${errorMessage}`)
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

    // Detener la cámara y ocultar el cuadro de enfoque dinámico
    document.getElementById('close-scanner').addEventListener('click', function () {
        const scannerContainer = document.getElementById('scanner-container');
        const mainContent = document.getElementById('main-content');

        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                focusBox.style.display = 'none';
                scannerContainer.style.display = 'none';
                mainContent.style.display = 'block';
            }).catch(err => console.error("Error al detener la cámara:", err));
        }
    });

    // Manejar el escaneo del código de barras
    function handleBarcodeScan(scannedCode) {
        const sanitizedCode = scannedCode.split('-')[0].trim();
        const product = products.find(p => p.codigo_barra === sanitizedCode);

        if (product) {
            const currentScanned = scannedUnits[product.codigo_barra] || 0;
            if (currentScanned < product.cantidad) {
                scannedUnits[product.codigo_barra] = currentScanned + 1;
                globalUnitsScanned += 1;

                playTone(440, 200, 'sine'); // Tono de éxito
                showTemporaryResult(true);
                updateScannedList(product.codigo_barra);
                updateGlobalCounter();
            }
        } else {
            playTone(220, 500, 'square'); // Tono de error
            showTemporaryResult(false);
            alert("El código escaneado no coincide con ningún producto.");
        }
        document.getElementById('barcodeInput').value = '';
    }

    // Mostrar resultado temporalmente (verde para éxito, rojo para error)
    function showTemporaryResult(isSuccess) {
        const scanResultContainer = document.getElementById('scan-result');
        const resultIcon = document.getElementById('result-icon');

        if (isSuccess) {
            resultIcon.innerHTML = '&#10004;';
            scanResultContainer.style.backgroundColor = 'rgba(0, 255, 0, 0.8)';
        } else {
            resultIcon.innerHTML = '&#10006;';
            scanResultContainer.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        }

        scanResultContainer.classList.add('show-result');
        setTimeout(() => {
            scanResultContainer.classList.remove('show-result');
        }, 3000);
    }

    // Actualizar la lista de unidades escaneadas
    function updateScannedList(scannedCode = '') {
        const scannedList = document.getElementById('scanned-list');
        scannedList.innerHTML = '';

        const sortedProducts = products.slice().sort((a, b) => {
            if (a.codigo_barra === scannedCode) return -1;
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

    // Actualizar contador global
    function updateGlobalCounter() {
        const globalCounter = document.getElementById('global-counter');
        const globalCounterScanner = document.getElementById('global-counter-scanner');
        globalCounter.innerText = `Unidades descargadas: ${globalUnitsScanned} de ${totalUnits}`;
        globalCounterScanner.innerText = `Unidades descargadas: ${globalUnitsScanned} de ${totalUnits}`;
    }
});
