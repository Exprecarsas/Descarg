let products = [];  // Arreglo de productos
let scannedUnits = {};  // Objeto para llevar el conteo de unidades escaneadas
let globalUnitsScanned = 0;  // Contador global de unidades escaneadas
let totalUnits = 0;  // Cantidad total de unidades a descargar

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
// Variables para manejo de audio
const beepSound = new Audio('beep.mp3');

let scanner; // Variable global para el escáner

// Mostrar la cámara y empezar a escanear
document.getElementById('camera-btn').addEventListener('click', () => {
    startScanner();
    document.getElementById('close-camera-btn').style.display = 'block'; // Mostrar botón de cerrar cámara
});
// Detener el escáner de la cámara
document.getElementById('close-camera-btn').addEventListener('click', () => {
    if (scanner) {
        scanner.stop(); // Detener el escáner
        document.getElementById('close-camera-btn').style.display = 'none'; // Ocultar botón de cerrar cámara
    }
});
// Función para iniciar el escáner de códigos de barras y QR
function startScanner() {
    const scanner = new Instascan.Scanner({ video: document.createElement('video') });
    scanner.addListener('scan', content => {
        handleScan(content); // Manejar el código escaneado
    });

    // Intentar activar la cámara
    Instascan.Camera.getCameras().then(cameras => {
        if (cameras.length > 0) {
            scanner.start(cameras[0]);
        } else {
            alert('No se encontraron cámaras.');
        }
    }).catch(e => console.error(e));
}

// Manejo del código escaneado
function handleScan(content) {
    // Reproducir sonido de alarma al escanear
    beepSound.play();

    const barcode = content.trim();  // El código escaneado

    // Verificar si el código escaneado está en la lista de productos
    const product = products.find(p => p.codigo_barra === barcode);

    if (product) {
        document.getElementById('scanner-messages').innerHTML = `<span style="color: green;">✔ Código ${barcode} encontrado y registrado</span>`;
        // Lógica para manejar el registro del código
        updateProductCount(product);
    } else {
        document.getElementById('scanner-messages').innerHTML = `<span style="color: red;">✖ Código ${barcode} no está en la lista</span>`;
    }

    // Continuar escaneando más códigos
    setTimeout(() => {
        document.getElementById('scanner-messages').innerHTML = ''; // Limpiar el mensaje después de unos segundos
    }, 2000);
}

// Actualizar el conteo de productos
function updateProductCount(product) {
    scannedUnits[product.codigo_barra] = (scannedUnits[product.codigo_barra] || 0) + 1;

    // Verificar si se completaron todas las unidades
    if (scannedUnits[product.codigo_barra] >= product.unidades) {
        document.getElementById('scanner-messages').innerHTML = `<span style="color: green;">✔ Todas las unidades del código ${product.codigo_barra} completadas</span>`;
    }

    // Actualizar visualización de unidades
    displayScannedUnits();
}

// Mostrar las unidades escaneadas
function displayScannedUnits() {
    let scannedList = '';
    products.forEach(product => {
        const scanned = scannedUnits[product.codigo_barra] || 0;
        scannedList += `<p>${product.codigo_barra}: ${scanned}/${product.unidades}</p>`;
    });
    document.getElementById('scanned-list').innerHTML = scannedList;
}

// Asegúrate de tener un contenedor en HTML para mostrar las unidades escaneadas
// <div id="scanned-list"></div>
