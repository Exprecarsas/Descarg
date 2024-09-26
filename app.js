let products = [];  // Arreglo de productos
let scannedUnits = {};  // Objeto para llevar el conteo de unidades escaneadas
let globalUnitsScanned = 0;  // Contador global de unidades escaneadas
let totalUnits = 0;  // Cantidad total de unidades a descargar
let html5QrCode; // Variable global para acceder al escáner


// Cargar archivo CSV
document.getElementById('load-csv').addEventListener('click', () => {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];  // Obtener el archivo seleccionado

    if (file) {
        Papa.parse(file, {
            header: true,  // Asume que el CSV tiene encabezados
            skipEmptyLines: true,  // Ignora líneas vacías
            complete: function (results) {
                console.log("Datos cargados del CSV:", results.data);

                products = results.data.map(item => ({
                    codigo_barra: item['codigo_barra'].trim(),
                    cantidad: parseInt(item['cantidad'].trim()),
                    ciudad: item['ciudad'].trim()  // Campo de ciudad
                }));

                // Inicializar el conteo de unidades escaneadas
                scannedUnits = {};
                globalUnitsScanned = 0;  // Reiniciar el contador global
                totalUnits = products.reduce((acc, product) => acc + product.cantidad, 0);  // Total de unidades
                products.forEach(product => {
                    scannedUnits[product.codigo_barra] = 0;  // Inicialmente 0 unidades escaneadas
                });

                // Actualizar las listas después de cargar el CSV
                updateScannedList();
                updateGlobalCounter();  // Mostrar el total global inicial
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
        event.preventDefault();  // Evitar el comportamiento por defecto (como el envío de formularios)

        // Ejecutar la función que maneja el escaneo del código
        handleBarcodeScan();
    }
});

// Función para manejar el escaneo del código de barras
function handleBarcodeScan() {
    const barcodeInput = document.getElementById('barcodeInput');
    const scannedCode = barcodeInput.value.trim();  // Obtener el valor del campo de entrada

    // Verificar si el código escaneado está en la lista de productos
    const product = products.find(p => p.codigo_barra === scannedCode.split('-')[0]);

    if (product) {
        // Incrementar el conteo de unidades escaneadas para el producto
        const currentScanned = scannedUnits[product.codigo_barra] || 0;

        if (currentScanned < product.cantidad) {  // Solo sumar si no se ha alcanzado el total
            scannedUnits[product.codigo_barra] = currentScanned + 1;
            globalUnitsScanned += 1;  // Incrementar el contador global

            // Actualizar las listas y el contador global
            updateScannedList(product.codigo_barra);  // Pasar el código escaneado
            updateGlobalCounter();
        } else {
            alert("Todas las unidades de este producto ya han sido escaneadas.");
        }

        // Limpiar el campo de entrada para el próximo escaneo
        barcodeInput.value = '';
    } else {
        alert('El código escaneado no coincide con ningún producto.');
    }
}

// Función para actualizar la lista de unidades escaneadas
function updateScannedList(scannedCode = '') {
    const scannedList = document.getElementById('scanned-list');
    scannedList.innerHTML = '';  // Limpiar la lista escaneada

    // Ordenar para que el último código escaneado aparezca primero
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

// Función para iniciar el escáner
document.getElementById('btn-abrir-camara').addEventListener('click', function() {
    const scannerContainer = document.getElementById('scanner-container');
    scannerContainer.style.display = 'block'; // Mostrar el contenedor del escáner

    html5QrCode = new Html5Qrcode("scanner-container");

    html5QrCode.start(
        { facingMode: "environment" },  // Cámara trasera
        {
            fps: 10,  // Velocidad de escaneo
            qrbox: { width: 300, height: 300 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E
            ]
        },
        (decodedText, decodedResult) => {
            // Actualizar el contador global
            globalCounter++;
            document.getElementById('global-counter').innerText = `${globalCounter} de ${totalUnits}`;

            if (globalCounter >= totalUnits) {
                alert("Todos los códigos han sido escaneados.");
                html5QrCode.stop().then(() => {
                    console.log("Escáner detenido.");
                    scannerContainer.style.display = 'none'; // Ocultar el contenedor
                }).catch(err => {
                    console.error("Error al detener el escáner:", err);
                });
            }
        },
        (errorMessage) => {
            console.log(`Error: ${errorMessage}`);
        }
    ).catch((err) => {
        console.log(`No se pudo iniciar el escáner: ${err}`);
    });
});

// Función para detener el escáner cuando se presione el botón 'close-scanner'
document.getElementById('close-scanner').addEventListener('click', function() {
    if (html5QrCode) {
        // Verificar si el escáner está corriendo y detenerlo
        html5QrCode.stop().then(() => {
            console.log("Escáner detenido.");
            document.getElementById('scanner-container').style.display = 'none'; // Ocultar el contenedor del escáner
        }).catch(err => {
            console.error("Error al detener el escáner:", err);
        });
    }
});