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

// Detectar cuando se presiona "Enter" en el campo de entrada del código de barras
document.getElementById('barcodeInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();  // Evitar comportamiento por defecto
        const barcodeInput = document.getElementById('barcodeInput').value.trim();  // Obtener el valor ingresado
        handleBarcodeScan(barcodeInput);  // Llamar a la función pasando el valor escaneado manualmente
    }
});

// Función para manejar el escaneo del código de barras
function handleBarcodeScan(scannedCode) {
    // Verificar si el código escaneado está en la lista de productos
    const product = products.find(p => p.codigo_barra === scannedCode.split('-')[0]);

    if (product) {
        const currentScanned = scannedUnits[product.codigo_barra] || 0;

        if (currentScanned < product.cantidad) {  // Solo sumar si no se ha alcanzado el total
            scannedUnits[product.codigo_barra] = currentScanned + 1;
            globalUnitsScanned += 1;

            updateScannedList(product.codigo_barra);  // Actualizar lista con el código escaneado
            updateGlobalCounter();  // Actualizar el contador global
        } else {
            alert("Todas las unidades de este producto ya han sido escaneadas.");
        }

        // Limpiar el campo de entrada para el próximo escaneo
        document.getElementById('barcodeInput').value = '';
    } else {
        alert('El código escaneado no coincide con ningún producto.');
    }
}

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
    globalCounter.innerText = `Unidades descargadas: ${globalUnitsScanned} de ${totalUnits}`;
}

// Iniciar la cámara
document.getElementById('btn-abrir-camara').addEventListener('click', function() {
    const scannerContainer = document.getElementById('scanner-container');
    scannerContainer.style.display = 'block';

    html5QrCode = new Html5Qrcode("scanner-container");
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 300, height: 300 }
        },
        (decodedText, decodedResult) => {
            console.log(`Código escaneado: ${decodedText}`);
            handleBarcodeScan(decodedText);  // Usar la función de manejo del código escaneado
        },
        (errorMessage) => {
            console.log(`Error de escaneo: ${errorMessage}`);
        }
    ).catch((err) => {
        console.error("Error al iniciar la cámara:", err);
    });

    document.getElementById('close-scanner').addEventListener('click', function() {
        html5QrCode.stop().then(() => {
            console.log("Escáner detenido.");
            scannerContainer.style.display = 'none';
        }).catch(err => {
            console.error("Error al detener la cámara:", err);
        });
    });
});

// Mostrar modal al hacer clic en "Finalizar Descarga"
document.getElementById('finalizar-descarga').addEventListener('click', () => {
    const modal = document.getElementById('modal');
    modal.style.display = 'flex';

    // Colocar la fecha actual en el campo de fecha
    const fechaInput = document.getElementById('fecha');
    const today = new Date().toLocaleDateString();
    fechaInput.value = today;
});

// Generar el reporte en Excel
document.getElementById('generar-reporte').addEventListener('click', () => {
    const placa = document.getElementById('placa').value;
    const remitente = document.getElementById('remitente').value;
    const fecha = document.getElementById('fecha').value;

    if (!placa || !remitente) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    // Crear el archivo Excel
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
});
