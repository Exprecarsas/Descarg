document.addEventListener('DOMContentLoaded', function () {
    let products = [];
    let scannedUnits = {};
    let globalUnitsScanned = 0;
    let totalUnits = 0;
    let html5QrCode;

    // Cargar archivo CSV
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

    // Iniciar la cámara cuando se presiona el botón de "Abrir Cámara"
    document.getElementById('btn-abrir-camara').addEventListener('click', function() {
        const scannerContainer = document.getElementById('scanner-container');
        const mainContent = document.getElementById('main-content');

        // Ocultar el contenido principal y mostrar el contenedor de la cámara
        mainContent.classList.add('hidden'); // Ocultar el contenido principal
        scannerContainer.style.display = 'flex'; // Mostrar el contenedor de la cámara

        try {
            // Inicializar Html5Qrcode en el contenedor "scanner-video"
            html5QrCode = new Html5Qrcode("scanner-video");
            html5QrCode.start(
                { facingMode: "environment" },  // Usar la cámara trasera
                {
                    fps: 10,
                    qrbox: { width: 300, height: 300 }
                },
                (decodedText) => {
                    console.log(`Código escaneado: ${decodedText}`);
                    handleBarcodeScan(decodedText);  // Manejar el código escaneado
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
    // Detectar la tecla "Enter" en el campo de entrada de código de barras
    document.getElementById('barcodeInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evitar el comportamiento por defecto
            handleBarcodeScan(document.getElementById('barcodeInput').value.trim());
        }
    });

    // Función para manejar el escaneo del código de barras
    function handleBarcodeScan(scannedCode) {
        const product = products.find(p => p.codigo_barra === scannedCode.split('-')[0]);

        if (product) {
            const currentScanned = scannedUnits[product.codigo_barra] || 0;

            if (currentScanned < product.cantidad) {
                scannedUnits[product.codigo_barra] = currentScanned + 1;
                globalUnitsScanned += 1;

                updateScannedList(product.codigo_barra);
                updateGlobalCounter();
            } else {
                alert("Todas las unidades de este producto ya han sido escaneadas.");
            }

            document.getElementById('barcodeInput').value = '';
        } else {
            alert('El código escaneado no coincide con ningún producto.');
        }
    }

    // Función para detener la cámara y volver a la vista principal
    document.getElementById('close-scanner').addEventListener('click', function() {
        const scannerContainer = document.getElementById('scanner-container');
        const mainContent = document.getElementById('main-content');

        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                console.log("Cámara detenida.");
                scannerContainer.style.display = 'none';  // Ocultar el contenedor de la cámara
                mainContent.classList.remove('hidden');  // Mostrar el contenido principal
            }).catch(err => {
                console.error("Error al detener la cámara:", err);
            });
        }
    });

    // Función para actualizar la lista de unidades escaneadas
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

    // Función para actualizar el contador global de unidades escaneadas
    function updateGlobalCounter() {
        const globalCounter = document.getElementById('global-counter');
        const globalCounterScanner = document.getElementById('global-counter-scanner');
        globalCounter.innerText = `Unidades descargadas: ${globalUnitsScanned} de ${totalUnits}`;
        globalCounterScanner.innerText = `Unidades descargadas: ${globalUnitsScanned} de ${totalUnits}`;
    }
});
