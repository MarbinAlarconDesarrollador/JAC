document.addEventListener('DOMContentLoaded', () => {
    // --- MÓDULO DE ACCESIBILIDAD ---
    const btnTheme = document.getElementById('btn-a11y-theme');
    const btnIncrease = document.getElementById('btn-a11y-increase');
    const btnDecrease = document.getElementById('btn-a11y-decrease');
    const btnSpeak = document.getElementById('btn-a11y-speak');
    let currentFontSize = 100; // Porcentaje base

    // Modo Oscuro
    btnTheme.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        // Opcional: Cambiar el color de la barra del navegador en móviles
        const metaTheme = document.getElementById('theme-color-meta');
        if (document.body.classList.contains('dark-mode')) {
            metaTheme.setAttribute('content', '#0f172a');
        } else {
            metaTheme.setAttribute('content', '#004b87');
        }
    });

    // Tamaño de Letra
    btnIncrease.addEventListener('click', () => {
        if (currentFontSize < 140) { // Límite máximo 140%
            currentFontSize += 10;
            document.documentElement.style.fontSize = currentFontSize + '%';
        }
    });

    btnDecrease.addEventListener('click', () => {
        if (currentFontSize > 80) { // Límite mínimo 80%
            currentFontSize -= 10;
            document.documentElement.style.fontSize = currentFontSize + '%';
        }
    });

    // Lector de Voz (Sintetizador Web)
    btnSpeak.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) {
            alert("Tu dispositivo o navegador no soporta la lectura en voz alta.");
            return;
        }

        window.speechSynthesis.cancel(); // Cancelar si ya estaba leyendo

        const resultadosSection = document.getElementById('resultados');
        if (resultadosSection.classList.contains('hidden')) {
            speak("Por favor, dale clic a 'Generar Escrutinio Final' primero, para poder leer los resultados.");
            return;
        }

        // Construir el texto a leer de forma limpia
        let textoALeer = "Atención. Estos son los resultados del escrutinio de la Junta de Acción Comunal. ";
        
        // Leer Resumen de Urna limpiando caracteres visuales
        const statsHtml = document.getElementById('stats-totales').innerText;
        textoALeer += statsHtml.replace(/\|/g, ', ') + ". ";
        
        textoALeer += "Asignación de cargos por bloques: ";

        // Leer Tabla
        const filas = document.querySelectorAll('#tabla-asignacion tr');
        filas.forEach(fila => {
            if (fila.querySelector('th')) {
                // Es el encabezado del bloque
                textoALeer += "En el " + fila.innerText.replace(/\(.*\)/, '') + ". "; 
            } else {
                // Es un cargo asignado
                const celdas = fila.querySelectorAll('td');
                const cargo = celdas[0].innerText.replace(/\(a\)/g, ' o a'); // Limpiar "Presidente(a)" a "Presidente o a"
                const ganador = celdas[1].innerText;
                textoALeer += "El cargo de " + cargo + " es para la " + ganador + ". ";
            }
        });

        textoALeer += "Fin del escrutinio.";
        speak(textoALeer);
    });

    function speak(texto) {
        const mensaje = new SpeechSynthesisUtterance(texto);
        mensaje.lang = 'es-CO'; // Español Colombia
        mensaje.rate = 0.9; // Velocidad ligeramente pausada para claridad
        window.speechSynthesis.speak(mensaje);
    }

    // --- MÓDULO DE CÁLCULO (LEY 2166) ---
    const bloquesConfig = [
        { nombre: 'BLOQUE DIRECTIVO', cargos: ['Presidente(a)', 'Vicepresidente(a)', 'Tesorero(a)', 'Secretario(a)'] },
        { nombre: 'BLOQUE FISCALÍA', cargos: ['Fiscal (Principal y Suplente)'] },
        { nombre: 'BLOQUE CONVIVENCIA', cargos: ['Conciliador 1', 'Conciliador 2', 'Conciliador 3'] },
        { nombre: 'BLOQUE DELEGADOS ASOJAC', cargos: ['Delegado 1 (Principal y Suplente)', 'Delegado 2 (Principal y Suplente)', 'Delegado 3 (Principal y Suplente)'] }
    ];

    const planchasContainer = document.getElementById('planchas-container');
    const btnAddPlancha = document.getElementById('btn-add-plancha');
    const btnCalcular = document.getElementById('btn-calcular');

    function init() {
        addPlanchaUI('Plancha 1', 120);
        addPlanchaUI('Plancha 2', 98);
    }

    function addPlanchaUI(nombre = '', votos = 0) {
        const div = document.createElement('div');
        div.className = 'plancha-row';
        div.innerHTML = `
            <input type="text" placeholder="Nombre Plancha" value="${nombre}" class="p-nombre">
            <input type="number" placeholder="Votos" value="${votos}" class="p-votos">
        `;
        planchasContainer.appendChild(div);
    }

    btnAddPlancha.addEventListener('click', () => addPlanchaUI());

    btnCalcular.addEventListener('click', () => {
        const vBlanco = parseInt(document.getElementById('votosBlanco').value) || 0;
        const vNulos = parseInt(document.getElementById('votosNulos').value) || 0;
        const vNoMarcados = parseInt(document.getElementById('votosNoMarcados').value) || 0;
        
        const planchasInput = Array.from(document.querySelectorAll('.plancha-row')).map(row => ({
            nombre: row.querySelector('.p-nombre').value || "Sin nombre",
            votos: parseInt(row.querySelector('.p-votos').value) || 0
        })).filter(p => p.votos > 0);

        const totalVotosPlanchas = planchasInput.reduce((acc, p) => acc + p.votos, 0);
        const totalVotosValidos = totalVotosPlanchas + vBlanco;
        const totalVotosEmitidos = totalVotosValidos + vNulos + vNoMarcados;

        if (totalVotosValidos === 0) return alert("No hay votos válidos para calcular.");

        document.getElementById('stats-totales').innerHTML = `
            <strong>Resumen General de Urna:</strong><br>
            Votos Válidos (Planchas + Blanco): ${totalVotosValidos} <br>
            Votos Nulos: ${vNulos} | No Marcados: ${vNoMarcados} <br>
            <strong>Total Tarjetones en Urna: ${totalVotosEmitidos}</strong>
        `;

        const tablaBody = document.getElementById('tabla-asignacion');
        const resumenDiv = document.getElementById('res-list');
        tablaBody.innerHTML = '';
        resumenDiv.innerHTML = '';

        bloquesConfig.forEach(bloque => {
            const numCurules = bloque.cargos.length;
            const cuocienteBase = parseFloat((totalVotosValidos / numCurules).toFixed(2));
            
            let resultadosBloque = planchasInput.map(p => {
                const divExacta = p.votos / cuocienteBase;
                const enteras = Math.floor(divExacta);
                return { ...p, division: divExacta, curules: enteras, residuo: divExacta - enteras, ganoPorResiduo: false };
            });

            let asignadas = resultadosBloque.reduce((acc, r) => acc + r.curules, 0);
            let faltantes = numCurules - asignadas;

            if (faltantes > 0) {
                let porResiduo = [...resultadosBloque].sort((a, b) => b.residuo - a.residuo);
                for (let i = 0; i < faltantes; i++) {
                    const idx = resultadosBloque.findIndex(r => r.nombre === porResiduo[i].nombre);
                    resultadosBloque[idx].curules++;
                    resultadosBloque[idx].ganoPorResiduo = true;
                }
            }

            const trH = document.createElement('tr');
            const textoCuociente = numCurules > 1 ? `(C: ${cuocienteBase})` : `(Mayoría Simple)`;
            trH.innerHTML = `<th colspan="2" class="bloque-header">${bloque.nombre} <span style="font-size:0.85em; font-weight:normal;">${textoCuociente}</span></th>`;
            tablaBody.appendChild(trH);

            let asignacionNominal = [...resultadosBloque].sort((a,b) => b.votos - a.votos);
            let cargoIdx = 0;
            
            asignacionNominal.forEach(p => {
                for (let i = 0; i < p.curules; i++) {
                    if (cargoIdx < bloque.cargos.length) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `<td>${bloque.cargos[cargoIdx]}</td><td><strong>${p.nombre}</strong></td>`;
                        tablaBody.appendChild(tr);
                        cargoIdx++;
                    }
                }
            });

            const divEq = document.createElement('div');
            divEq.className = 'ecuacion-item';
            divEq.innerHTML = `<strong>${bloque.nombre}:</strong><br>`;
            resultadosBloque.forEach(p => {
                const eqStr = numCurules > 1 ? `${p.votos} / ${cuocienteBase} = <b>${p.division.toFixed(6)}</b>` : `${p.votos} votos`;
                divEq.innerHTML += `> ${p.nombre}: ${eqStr} → ${p.curules} curul(es)${p.ganoPorResiduo ? ' <strong>(+1 por residuo mayor)</strong>' : ''}<br>`;
            });
            resumenDiv.appendChild(divEq);
        });

        document.getElementById('resultados').classList.remove('hidden');
        
        // Auto-scroll respetuoso (no forzado de golpe)
        window.scrollTo({ top: document.getElementById('resultados').offsetTop - 20, behavior: 'smooth' });
    });

    init();
});