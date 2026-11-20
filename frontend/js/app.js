/**
 * ==============================================================
 * APP.JS — LA LUCHA SANGUCHERÍA CRIOLLA (REVISTA DIGITAL)
 * ==============================================================
 * Arquitectura orientada a componentes con Page-Flip, Acordeón
 * de Extras, Carrito Reactivo, NLP para Antojos con IA y
 * estimación dinámica de tiempos de cocina.
 */

class GestorPedidosQR {

    /**
     * Sanitiza cadenas de texto para prevenir ataques de Cross-Site Scripting (XSS).
     * @param {string|number} str Texto o valor a sanitizar.
     * @returns {string} Texto seguro para inserción en el DOM.
     */
    _esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    constructor() {
        // Estado del catálogo y carrito
        this.catalogo              = [];
        this.cantidades            = {};
        this.numeroWhatsAppMozo    = (typeof CONFIG !== 'undefined' && CONFIG.NUMERO_WHATSAPP) ? CONFIG.NUMERO_WHATSAPP : "51994809171";
        this.productoExtraTemporal = null;
        this.precioExtraTemporal   = 0;
        
        // Detección del endpoint del Backend
        this.apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.obtenerApiUrl) 
            ? CONFIG.obtenerApiUrl() 
            : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? "http://localhost:8000" : "");

        // Extracción y sanitización del identificador de mesa desde la URL (?mesa=12)
        const urlParams = new URLSearchParams(window.location.search);
        const mesaParam = urlParams.get('mesa') || "Principal";
        this.mesa = String(mesaParam).slice(0, 30).replace(/[<>"']/g, '');

        // Estado de navegación del Flipbook
        this.paginaActual       = 0;
        this.totalPaginas       = 4;
        this.extrasSeleccionados = {};   // { [idProducto]: Set<string> }
        this.acordeonesAbiertos  = {};   // { [idProducto]: boolean }

        // Control de Antojo IA (Debounce y respaldo de estado previo)
        this._antojoDebounceTimer = null;
        this._estadoCartPrevio    = null;

        // Variables de interacción táctil (Touch / Swipe)
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._isDragging  = false;

        // Referencias a elementos clave del DOM
        this.montoTotalUI = document.getElementById('monto-total-ui');

        this._inicializarIdentificadoresMesa();
        this._inicializarSwipe();
        this._inicializarNav();
        this.cargarMenuDesdeAPI();
    }

    /** Muestra el número de mesa en la portada y en la cabecera del carrito */
    _inicializarIdentificadoresMesa() {
        const mesaBadge = document.getElementById('portada-mesa-num');
        if (mesaBadge) mesaBadge.textContent = this.mesa;

        const carritoMesaLabel = document.getElementById('carrito-mesa-label');
        if (carritoMesaLabel) carritoMesaLabel.textContent = `Mesa: ${this.mesa}`;
    }

    // ==============================================================
    // 1. SISTEMA DE NAVEGACIÓN Y PAGE-FLIP
    // ==============================================================

    /**
     * Desplaza horizontalmente el visor a la página solicitada.
     * @param {number} n Índice de la página de destino (0 a 3).
     */
    irAPagina(n) {
        if (n < 0 || n >= this.totalPaginas) return;

        this.paginaActual = n;
        const track = document.getElementById('revista-track');
        if (!track) return;

        track.style.transform = `translateX(-${n * 100}vw)`;
        track.classList.add('animando');
        setTimeout(() => track.classList.remove('animando'), 560);

        this._actualizarNavIndicadores(n);
        this._actualizarFlechas(n);

        // Control de visibilidad del botón flotante del carrito
        const miniCarrito = document.getElementById('mini-carrito-flotante');
        if (miniCarrito) {
            if (n < 3 && this._totalItems() > 0) {
                miniCarrito.classList.add('visible');
            } else {
                miniCarrito.classList.remove('visible');
            }
        }

        // Si navega a la página 4 (Mi Pedido), renderizar el desglose
        if (n === 3) {
            this._renderizarCarritoPagina4();
        }

        // Restablecer scroll al inicio en la nueva página
        const paginaEl = document.getElementById(`pagina-${n}`);
        if (paginaEl) paginaEl.scrollTop = 0;
    }

    _actualizarNavIndicadores(n) {
        document.querySelectorAll('.nav-dot').forEach((dot, i) => {
            dot.classList.toggle('activo', i === n);
        });
        document.querySelectorAll('.nav-label').forEach(label => {
            const pag = parseInt(label.dataset.pagina, 10);
            label.classList.toggle('activo', pag === n);
        });
    }

    _actualizarFlechas(n) {
        const btnPrev = document.getElementById('nav-prev');
        const btnNext = document.getElementById('nav-next');
        if (btnPrev) btnPrev.classList.toggle('inactivo', n === 0);
        if (btnNext) btnNext.classList.toggle('inactivo', n === this.totalPaginas - 1);
    }

    // ==============================================================
    // 2. SOPORTE DE GESTOS TÁCTILES (SWIPE NATIVO)
    // ==============================================================

    _inicializarSwipe() {
        const viewport = document.getElementById('revista-viewport');
        if (!viewport) return;

        viewport.addEventListener('touchstart', (e) => {
            this._touchStartX = e.changedTouches[0].screenX;
            this._touchStartY = e.changedTouches[0].screenY;
            this._isDragging  = true;
        }, { passive: true });

        viewport.addEventListener('touchend', (e) => {
            if (!this._isDragging) return;
            this._isDragging = false;

            const deltaX = e.changedTouches[0].screenX - this._touchStartX;
            const deltaY = e.changedTouches[0].screenY - this._touchStartY;

            // Procesar si el desplazamiento horizontal supera 50px y es dominante
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX < 0) {
                    this.irAPagina(this.paginaActual + 1); // Deslizar izquierda
                } else {
                    this.irAPagina(this.paginaActual - 1); // Deslizar derecha
                }
            }
        }, { passive: true });
    }

    _inicializarNav() {
        this._actualizarNavIndicadores(0);
        this._actualizarFlechas(0);
    }

    // ==============================================================
    // 3. CARGA DE MENÚ Y RECUPERACIÓN RESILIENTE
    // ==============================================================

    async cargarMenuDesdeAPI() {
        try {
            const respuesta = await fetch(`${this.apiUrl}/api/sanguches`);
            if (!respuesta.ok) throw new Error(`HTTP Error ${respuesta.status}`);

            this.catalogo = await respuesta.json();
            this._renderizarMenuFlipbook();
        } catch (error) {
            console.warn("[Advertencia] Backend no accesible. Activando catálogo de demostración local:", error.message);
            this.catalogo = (typeof CONFIG !== 'undefined' && CONFIG.CATALOGO_DEMO)
                ? CONFIG.CATALOGO_DEMO
                : this._catalogoFallbackLocal();
            this._renderizarMenuFlipbook();
        }
    }

    _catalogoFallbackLocal() {
        return [
            { id: 1, nombre: "Sándwich de Pollo",              categoria: "Sánduches",         precio: "7.00",  descripcion: "Pollo a la plancha con cremas de la casa" },
            { id: 2, nombre: "Pan con Chicharrón",             categoria: "Sánduches",         precio: "8.00",  descripcion: "El clásico de panceta crujiente y camote" },
            { id: 3, nombre: "Sándwich de Asado de Res",       categoria: "Sánduches",         precio: "9.00",  descripcion: "Asado jugoso en pan artesanal" },
            { id: 4, nombre: "Pan con Chorizo a la Plancha",   categoria: "Sánduches",         precio: "7.50",  descripcion: "Chorizo criollo a las brasas" },
            { id: 5, nombre: "Chicha Morada Helada",           categoria: "Bebidas Frías",     precio: "3.50",  descripcion: "Refrescante bebida de maíz morado" },
            { id: 6, nombre: "Jugo de Maracuyá",               categoria: "Bebidas Frías",     precio: "4.00",  descripcion: "Natural, recién exprimido" },
            { id: 7, nombre: "Inca Kola",                      categoria: "Bebidas Frías",     precio: "3.00",  descripcion: "Bebida nacional helada 500ml" },
            { id: 8, nombre: "Jugo de Papaya",                 categoria: "Bebidas Frías",     precio: "4.00",  descripcion: "Natural y cremoso" },
            { id: 9, nombre: "Café Tradicional",               categoria: "Bebidas Calientes", precio: "3.50",  descripcion: "Café pasado de altura" },
            { id: 10, nombre: "Emoliente Especial",            categoria: "Bebidas Calientes", precio: "2.50",  descripcion: "Linaza, cebada y limón caliente" },
            { id: 11, nombre: "Chocolate Caliente con Leche",  categoria: "Bebidas Calientes", precio: "4.00",  descripcion: "Cacao cusqueño puro preparado al instante" },
            { id: 12, nombre: "Infusión",                      categoria: "Bebidas Calientes", precio: "2.50",  descripcion: "Manzanilla, menta o hierba luisa" }
        ];
    }

    // ==============================================================
    // 4. GESTIÓN MULTIMEDIA Y MAPEO DE IMÁGENES
    // ==============================================================

    _mapaImagenesProductos() {
        return [
            // Sánguches
            { keywords: ['chicharrón', 'chicharron'],   img: 'img/sandwich_chicharron.png', emoji: '🥩' },
            { keywords: ['pollo'],                       img: 'img/sandwich_pollo.png',      emoji: '🍗' },
            { keywords: ['asado', 'res'],                img: 'img/sandwich_asado.png',      emoji: '🥩' },
            { keywords: ['chorizo'],                     img: 'img/sandwich_chorizo.png',    emoji: '🌭' },
            // Bebidas Frías
            { keywords: ['chicha'],                      img: 'img/bebida_chicha_morada.png',emoji: '🍇' },
            { keywords: ['maracuyá', 'maracuya'],        img: 'img/bebida_maracuya.png',     emoji: '🧃' },
            { keywords: ['inca kola', 'inca'],           img: 'img/bebida_inca_kola.png',    emoji: '🥤' },
            { keywords: ['papaya'],                      img: 'img/bebida_papaya.png',        emoji: '🧃' },
            { keywords: ['coca-cola', 'coca cola'],      img: null,                           emoji: '🥤' },
            { keywords: ['agua'],                        img: null,                           emoji: '💧' },
            // Bebidas Calientes
            { keywords: ['café', 'cafe', 'coffee'],      img: 'img/bebida_cafe.png',          emoji: '☕' },
            { keywords: ['emoliente'],                   img: 'img/bebida_emoliente.png',     emoji: '🌿' },
            { keywords: ['chocolate'],                   img: 'img/bebida_chocolate.png',     emoji: '🍫' },
            { keywords: ['infusión', 'infusion', 'manzanilla', 'menta', 'hierba'], img: 'img/bebida_infusion.png', emoji: '🫖' },
        ];
    }

    _buscarImagenProducto(nombre) {
        const nombreNorm = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const mapa = this._mapaImagenesProductos();
        for (const entry of mapa) {
            for (const kw of entry.keywords) {
                const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (nombreNorm.includes(kwNorm)) {
                    return { img: entry.img, emoji: entry.emoji };
                }
            }
        }
        return { img: null, emoji: '🥪' };
    }

    _getFotoHTML(nombre, wrapClass = 'producto-foto-wrap', imgClass = 'producto-foto', size = 88) {
        const datos = this._buscarImagenProducto(nombre);
        if (datos.img) {
            return `<div class="${wrapClass}"><img src="${datos.img}" alt="${this._esc(nombre)}" class="${imgClass}" loading="lazy" onerror="this.parentElement.innerHTML='<span style=\\'font-size:2rem;display:flex;align-items:center;justify-content:center;width:100%;height:100%;\\'>${datos.emoji}</span>'"></div>`;
        }
        return `<div class="producto-foto-emoji" style="width:${size}px;height:${size}px">${datos.emoji}</div>`;
    }

    _getThumbHTML(nombre) {
        const datos = this._buscarImagenProducto(nombre);
        if (datos.img) {
            return `<div class="carrito-item-thumb"><img src="${datos.img}" alt="${this._esc(nombre)}" loading="lazy" onerror="this.parentElement.innerHTML='<span style=\\'font-size:1.4rem\\'>${datos.emoji}</span>'"></div>`;
        }
        return `<div class="carrito-item-thumb-emoji">${datos.emoji}</div>`;
    }

    // ==============================================================
    // 5. RENDERIZADO DEL CATÁLOGO
    // ==============================================================

    _renderizarMenuFlipbook() {
        this.catalogo.forEach(prod => {
            if (this.cantidades[prod.id] === undefined) this.cantidades[prod.id] = 0;
            if (!this.extrasSeleccionados[prod.id])     this.extrasSeleccionados[prod.id] = new Set();
        });

        const normalizar = (txt) => txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const esSanguche = (c) => (c.includes('sangu') || c.includes('sandw') || c.includes('pan con')) && !c.includes('bebi');
        const esBebidaFria = (c) => c.includes('bebida') && (c.includes('fri') || c.includes('fria'));
        const esBebidaCaliente = (c) => c.includes('bebida') && (c.includes('cali') || c.includes('caliente'));

        const sanguchos = this.catalogo.filter(p => esSanguche(normalizar(p.categoria)));
        const bebidasFrias = this.catalogo.filter(p => esBebidaFria(normalizar(p.categoria)));
        const bebidasCalientes = this.catalogo.filter(p => esBebidaCaliente(normalizar(p.categoria)));

        this._renderizarSanguchos(sanguchos.length > 0 ? sanguchos : this.catalogo.slice(0, 4));
        this._renderizarBebidas(bebidasFrias, bebidasCalientes);
    }

    _esPopular(nombre) {
        return nombre === "Pan con Chicharrón";
    }

    _renderizarSanguchos(productos) {
        const contenedor = document.getElementById('lista-sanguchos');
        if (!contenedor) return;

        if (productos.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center;padding:20px;color:#795548">No se encontraron productos disponibles.</p>';
            return;
        }

        contenedor.innerHTML = productos.map(prod => this._tarjetaProductoHTML(prod, true)).join('');
    }

    _extrasDisponibles() {
        return (typeof CONFIG !== 'undefined' && CONFIG.EXTRAS_DISPONIBLES)
            ? CONFIG.EXTRAS_DISPONIBLES
            : [
                { id: 'cebolla',    label: 'Con cebolla' },
                { id: 'sin_cebolla',label: 'Sin cebolla' },
                { id: 'mayonesa',   label: 'Mayonesa' },
                { id: 'aji',        label: 'Ají amarillo' },
                { id: 'lechuga',    label: 'Lechuga' },
                { id: 'sal_extra',  label: 'Sal extra' },
            ];
    }

    _tarjetaProductoHTML(prod, conExtras = false) {
        const esPopular   = this._esPopular(prod.nombre);
        const badgeHTML   = esPopular ? `<span class="badge-popular">⭐ El más vendido</span>` : '';
        const descripHTML = prod.descripcion ? `<span class="producto-desc">${this._esc(prod.descripcion)}</span>` : '';

        const extrasHTML = conExtras ? `
            <div class="producto-acordeon-toggle" onclick="gestorApp.toggleExtras(${prod.id})" role="button" aria-expanded="false" tabindex="0">
                <span>✨ Personalizar</span>
                <span class="acordeon-flecha" id="flecha-${prod.id}">▾</span>
            </div>
            <div class="producto-extras-panel" id="extras-${prod.id}">
                <div class="extras-titulo">Elige tus extras</div>
                <div class="extras-grid">
                    ${this._extrasDisponibles().map(ex => `
                        <label class="extra-checkbox-wrap" for="chk-${prod.id}-${ex.id}">
                            <input type="checkbox"
                                   id="chk-${prod.id}-${ex.id}"
                                   onchange="gestorApp.toggleCheckboxExtra(${prod.id}, '${ex.label}', this.checked)">
                            <span class="extra-check-visual"></span>
                            <span class="extra-label">${ex.label}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return `
        <article class="producto-card" id="card-${prod.id}">
            <div class="producto-fila-principal">
                ${this._getFotoHTML(prod.nombre)}
                <div class="producto-info-izq">
                    <div class="producto-nombre-wrap">
                        <span class="producto-nombre">${this._esc(prod.nombre)}</span>
                        ${badgeHTML}
                    </div>
                    ${descripHTML}
                </div>
                <div class="producto-controls-wrap">
                    <span class="producto-precio">S/ ${parseFloat(prod.precio).toFixed(2)}</span>
                    <div class="controles-cantidad">
                        <button class="btn-cantidad btn-restar"
                                onclick="gestorApp.cambiarCantidad(${prod.id}, -1)"
                                aria-label="Restar una unidad">−</button>
                        <span class="cantidad-num" id="cant-${prod.id}">${this.cantidades[prod.id] || 0}</span>
                        <button class="btn-cantidad btn-sumar"
                                onclick="gestorApp.cambiarCantidad(${prod.id}, 1)"
                                aria-label="Agregar una unidad">+</button>
                    </div>
                </div>
            </div>
            ${extrasHTML}
        </article>`;
    }

    // ==============================================================
    // 6. RENDERIZADO DE BEBIDAS
    // ==============================================================

    _esBebidaPopular(nombre) {
        return nombre === "Emoliente Especial" || nombre === "Chicha Morada Helada";
    }

    _renderizarBebidas(bebidasFrias, bebidasCalientes) {
        const contenedor = document.getElementById('lista-bebidas');
        if (!contenedor) return;

        let html = '';

        if (bebidasFrias.length > 0) {
            html += `
            <div class="subseccion-titulo">
                <span>🥤 Bebidas Frías</span>
            </div>
            <div class="bebidas-seccion">
                <div class="bebidas-cat-img-wrap">
                    <img src="img/bebidas_frias.png" alt="Bebidas Frías y Refrescos" class="bebidas-cat-img" loading="lazy">
                </div>
                ${bebidasFrias.map(prod => this._tarjetaBebidaHTML(prod)).join('')}
            </div>`;
        }

        if (bebidasCalientes.length > 0) {
            html += `
            <div class="subseccion-titulo" style="margin-top:8px">
                <span>☕ Bebidas Calientes</span>
            </div>
            <div class="bebidas-seccion" style="padding-bottom:16px">
                <div class="bebidas-cat-img-wrap">
                    <img src="img/bebidas_calientes.png" alt="Bebidas Calientes Tradicionales" class="bebidas-cat-img" loading="lazy">
                </div>
                ${bebidasCalientes.map(prod => this._tarjetaBebidaHTML(prod)).join('')}
            </div>`;
        }

        contenedor.innerHTML = html || '<p style="text-align:center;padding:30px;color:#795548">No se encontraron bebidas registradas.</p>';
    }

    _tarjetaBebidaHTML(prod) {
        const esPopular   = this._esBebidaPopular(prod.nombre);
        const badgeHTML   = esPopular ? `<span class="badge-popular">🔥 Más pedido</span>` : '';
        const descripHTML = prod.descripcion ? `<span class="producto-desc">${this._esc(prod.descripcion)}</span>` : '';

        return `
        <article class="producto-card" id="card-${prod.id}">
            <div class="producto-fila-principal">
                ${this._getFotoHTML(prod.nombre)}
                <div class="producto-info-izq">
                    <div class="producto-nombre-wrap">
                        <span class="producto-nombre">${this._esc(prod.nombre)}</span>
                        ${badgeHTML}
                    </div>
                    ${descripHTML}
                </div>
                <div class="producto-controls-wrap">
                    <span class="producto-precio">S/ ${parseFloat(prod.precio).toFixed(2)}</span>
                    <div class="controles-cantidad">
                        <button class="btn-cantidad btn-restar"
                                onclick="gestorApp.cambiarCantidad(${prod.id}, -1)"
                                aria-label="Restar una unidad">−</button>
                        <span class="cantidad-num" id="cant-${prod.id}">${this.cantidades[prod.id] || 0}</span>
                        <button class="btn-cantidad btn-sumar"
                                onclick="gestorApp.cambiarCantidad(${prod.id}, 1)"
                                aria-label="Agregar una unidad">+</button>
                    </div>
                </div>
            </div>
        </article>`;
    }

    // ==============================================================
    // 7. ACORDEÓN DE EXTRAS Y PERSONALIZACIÓN
    // ==============================================================

    toggleExtras(idProducto) {
        const panel  = document.getElementById(`extras-${idProducto}`);
        const flecha = document.getElementById(`flecha-${idProducto}`);
        if (!panel) return;

        const estaAbierto = this.acordeonesAbiertos[idProducto];

        if (estaAbierto) {
            panel.classList.remove('abierto');
            if (flecha) flecha.style.transform = 'rotate(0deg)';
            this.acordeonesAbiertos[idProducto] = false;
        } else {
            panel.classList.add('abierto');
            if (flecha) flecha.style.transform = 'rotate(180deg)';
            this.acordeonesAbiertos[idProducto] = true;
        }
    }

    toggleCheckboxExtra(idProducto, extraLabel, marcado) {
        if (!this.extrasSeleccionados[idProducto]) {
            this.extrasSeleccionados[idProducto] = new Set();
        }
        if (marcado) {
            this.extrasSeleccionados[idProducto].add(extraLabel);
        } else {
            this.extrasSeleccionados[idProducto].delete(extraLabel);
        }
    }

    // ==============================================================
    // 8. CONTROL REACTIVO DE CANTIDADES
    // ==============================================================

    cambiarCantidad(idProducto, modificador) {
        let cantidadActual = this.cantidades[idProducto] || 0;
        let nuevaCantidad  = Math.max(0, cantidadActual + modificador);

        this.cantidades[idProducto] = nuevaCantidad;

        document.querySelectorAll(`#cant-${idProducto}`).forEach(el => {
            el.textContent = nuevaCantidad;
        });

        const card = document.getElementById(`card-${idProducto}`);
        if (card && nuevaCantidad > 0) {
            card.style.opacity = '1';
        }

        this.actualizarUI();
    }

    actualizarUI() {
        let total = 0;
        let items = 0;

        this.catalogo.forEach(prod => {
            const cant = this.cantidades[prod.id] || 0;
            total += cant * parseFloat(prod.precio);
            items += cant;
        });

        if (this.montoTotalUI) {
            this.montoTotalUI.textContent = `S/ ${total.toFixed(2)}`;
        }

        const miniMonto = document.getElementById('mini-carrito-monto');
        const miniBadge = document.getElementById('mini-carrito-badge');
        if (miniMonto) miniMonto.textContent = `S/ ${total.toFixed(2)}`;
        if (miniBadge) miniBadge.textContent = items;

        const miniCarrito = document.getElementById('mini-carrito-flotante');
        if (miniCarrito) {
            if (items > 0 && this.paginaActual < 3) {
                miniCarrito.classList.add('visible');
            } else if (items === 0) {
                miniCarrito.classList.remove('visible');
            }
        }

        if (this.paginaActual === 3) {
            this._renderizarCarritoPagina4();
        }

        this.calcularTiempoEstimado();
        this._sincronizarCheckboxesExtras();
    }

    _totalItems() {
        return this.catalogo.reduce((acc, prod) => acc + (this.cantidades[prod.id] || 0), 0);
    }

    // ==============================================================
    // 9. ESTIMACIÓN INTELIGENTE DEL TIEMPO DE PREPARACIÓN
    // ==============================================================

    calcularTiempoEstimado() {
        const wrap  = document.getElementById('tiempo-estimado-wrap');
        const valor = document.getElementById('tiempo-valor');
        const barra = document.getElementById('tiempo-barra');
        if (!wrap || !valor || !barra) return;

        const totalItems = this._totalItems();

        if (totalItems === 0) {
            wrap.style.opacity = '0.4';
            valor.textContent  = '— min';
            barra.style.width  = '0%';
            return;
        }

        const tiempoBase    = (typeof CONFIG !== 'undefined') ? CONFIG.TIEMPO_BASE_PREPARACION_MINUTOS : 6;
        const tiempoPorItem = (typeof CONFIG !== 'undefined') ? CONFIG.TIEMPO_EXTRA_POR_ITEM_MINUTOS : 1.5;
        const tiempoMaximo  = (typeof CONFIG !== 'undefined') ? CONFIG.TIEMPO_MAXIMO_BARRA_MINUTOS : 30;

        const minutosTotales = Math.round(tiempoBase + Math.max(0, totalItems - 1) * tiempoPorItem);

        valor.textContent = `~${minutosTotales} min`;
        const porcentaje = Math.min((minutosTotales / tiempoMaximo) * 100, 100);
        barra.style.width = `${porcentaje}%`;
        wrap.style.opacity = '1';
    }

    // ==============================================================
    // 10. FILTRO DE ANTOJO POR IA (LENGUAJE NATURAL)
    // ==============================================================

    filtrarPorAntojo(query) {
        const clearBtn = document.getElementById('antojo-clear');
        if (clearBtn) clearBtn.style.opacity = query.trim() ? '1' : '0';

        if (!query.trim()) {
            clearTimeout(this._antojoDebounceTimer);
            this._setInputCargando(false);
            this._restaurarEstadoPrevio();
            this._resetFiltroAntojo();
            return;
        }

        if (this._estadoCartPrevio === null) {
            this._guardarEstadoPrevio();
        }

        this._setInputCargando(true);
        this._ocultarMensajeIA();

        clearTimeout(this._antojoDebounceTimer);
        this._antojoDebounceTimer = setTimeout(() => {
            this._llamarAntojoIA(query.trim());
        }, 550);
    }

    async _llamarAntojoIA(query) {
        const catalogoPayload = this.catalogo.map(p => ({
            id:        p.id,
            nombre:    p.nombre,
            categoria: p.categoria
        }));

        try {
            const respuesta = await fetch(`${this.apiUrl}/api/antojo`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ consulta: query, catalogo: catalogoPayload }),
                signal:  AbortSignal.timeout(8000)
            });

            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

            const datos = await respuesta.json();

            if (datos.mensaje) {
                this._mostrarMensajeIA(datos.mensaje);
            } else {
                this._ocultarMensajeIA();
            }

            // Restaurar estado base para aplicar las selecciones de la búsqueda
            if (this._estadoCartPrevio !== null) {
                this.cantidades = { ...this._estadoCartPrevio.cantidades };
                this.extrasSeleccionados = {};
                for (const [id, setVal] of Object.entries(this._estadoCartPrevio.extrasSeleccionados)) {
                    this.extrasSeleccionados[id] = new Set(setVal);
                }
            }

            if (datos.seleccionados && Array.isArray(datos.seleccionados)) {
                if (!datos.ids) datos.ids = [];
                datos.seleccionados.forEach(sel => {
                    const idProd = parseInt(sel.id, 10);
                    const cant   = parseInt(sel.cantidad, 10) || 1;
                    if (this.cantidades[idProd] !== undefined) {
                        this.cantidades[idProd] = cant;
                    }
                    if (sel.extras && Array.isArray(sel.extras)) {
                        if (!this.extrasSeleccionados[idProd]) {
                            this.extrasSeleccionados[idProd] = new Set();
                        }
                        sel.extras.forEach(ex => this.extrasSeleccionados[idProd].add(ex));
                    }
                    if (!datos.ids.includes(idProd)) {
                        datos.ids.push(idProd);
                    }
                });
            }

            this.catalogo.forEach(p => {
                document.querySelectorAll(`#cant-${p.id}`).forEach(el => {
                    el.textContent = this.cantidades[p.id] || 0;
                });
            });

            this._aplicarFiltroIA(datos.ids || []);
            this.actualizarUI();

        } catch (err) {
            console.warn('[Antojo IA] Fallback local activo:', err.message);
            this._ocultarMensajeIA();
            this._filtroLocalAntojo(query);
        } finally {
            this._setInputCargando(false);
        }
    }

    buscarAntojoInmediato() {
        const input = document.getElementById('antojo-input');
        if (!input) return;
        const query = input.value.trim();
        if (!query) return;

        clearTimeout(this._antojoDebounceTimer);
        if (this._estadoCartPrevio === null) this._guardarEstadoPrevio();

        this._setInputCargando(true);
        this._ocultarMensajeIA();
        this._llamarAntojoIA(query);
    }

    _guardarEstadoPrevio() {
        const cantCopia = { ...this.cantidades };
        const extrasCopia = {};
        for (const [id, setObj] of Object.entries(this.extrasSeleccionados)) {
            extrasCopia[id] = new Set(setObj);
        }
        this._estadoCartPrevio = { cantidades: cantCopia, extrasSeleccionados: extrasCopia };
    }

    _restaurarEstadoPrevio() {
        if (this._estadoCartPrevio === null) return;

        this.cantidades = { ...this._estadoCartPrevio.cantidades };
        this.extrasSeleccionados = {};
        for (const [id, setObj] of Object.entries(this._estadoCartPrevio.extrasSeleccionados)) {
            this.extrasSeleccionados[id] = new Set(setObj);
        }

        this.catalogo.forEach(p => {
            document.querySelectorAll(`#cant-${p.id}`).forEach(el => {
                el.textContent = this.cantidades[p.id] || 0;
            });
        });

        this.actualizarUI();
        this._estadoCartPrevio = null;
    }

    _mostrarMensajeIA(texto) {
        const msgDiv = document.getElementById('antojo-mensaje-ia');
        if (msgDiv) {
            msgDiv.textContent = texto;
            msgDiv.style.display = 'block';
        }
    }

    _ocultarMensajeIA() {
        const msgDiv = document.getElementById('antojo-mensaje-ia');
        if (msgDiv) {
            msgDiv.textContent = '';
            msgDiv.style.display = 'none';
        }
    }

    _sincronizarCheckboxesExtras() {
        document.querySelectorAll('input[type="checkbox"][id^="chk-"]').forEach(chk => {
            const parts = chk.id.split('-');
            if (parts.length >= 3) {
                const idProd = parseInt(parts[1], 10);
                const idEx   = parts[2];
                const exObj  = this._extrasDisponibles().find(e => e.id === idEx);
                if (exObj) {
                    const sel = this.extrasSeleccionados[idProd] && this.extrasSeleccionados[idProd].has(exObj.label);
                    chk.checked = !!sel;
                }
            }
        });
    }

    _setInputCargando(cargando) {
        const input = document.getElementById('antojo-input');
        const icono = document.querySelector('.antojo-icono');
        if (input) input.style.opacity = cargando ? '0.6' : '1';
        if (icono) {
            icono.style.transition = 'transform 0.3s ease';
            icono.style.animation  = cargando ? 'girar 0.9s linear infinite' : 'none';
        }
    }

    _aplicarFiltroIA(ids) {
        const idSet = new Set(ids.map(id => String(id)));
        const hayFiltro = idSet.size > 0;

        document.querySelectorAll('.producto-card').forEach(card => {
            const cardId    = card.id.replace('card-', '');
            const esMatch   = hayFiltro && idSet.has(cardId);
            const enCarrito = (this.cantidades[cardId] || 0) > 0;

            card.style.transition = 'all 0.4s ease';

            if (!hayFiltro) {
                card.style.opacity   = '1';
                card.style.transform = 'scale(1)';
                card.style.boxShadow = '';
                card.style.border    = '';
            } else if (esMatch || enCarrito) {
                card.style.opacity   = '1';
                if (esMatch) {
                    card.style.transform = 'scale(1.02)';
                    card.style.boxShadow = '0 4px 18px rgba(212,160,23,0.35)';
                    card.style.border    = '1.5px solid rgba(212,160,23,0.55)';
                } else {
                    card.style.transform = 'scale(1)';
                    card.style.boxShadow = '';
                    card.style.border    = '';
                }
            } else {
                card.style.opacity   = '0.25';
                card.style.transform = 'scale(0.98)';
                card.style.boxShadow = '';
                card.style.border    = '';
            }
        });
    }

    _filtroLocalAntojo(query) {
        const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const idsMatch = this.catalogo
            .filter(p => {
                const n = p.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const c = p.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return n.includes(q) || c.includes(q);
            })
            .map(p => p.id);
        this._aplicarFiltroIA(idsMatch);
    }

    limpiarFiltroAntojo() {
        const input = document.getElementById('antojo-input');
        if (input) input.value = '';
        clearTimeout(this._antojoDebounceTimer);
        this._setInputCargando(false);
        this._restaurarEstadoPrevio();
        this._resetFiltroAntojo();
    }

    _resetFiltroAntojo() {
        this._ocultarMensajeIA();
        document.querySelectorAll('.producto-card').forEach(card => {
            card.style.opacity   = '1';
            card.style.transform = 'scale(1)';
            card.style.boxShadow = '';
            card.style.border    = '';
            card.style.transition = 'all 0.4s ease';
        });
    }

    // ==============================================================
    // 11. PÁGINA 4: RENDERIZADO DEL CARRITO
    // ==============================================================

    _renderizarCarritoPagina4() {
        const cuerpo = document.getElementById('carrito-cuerpo');
        if (!cuerpo) return;

        const seleccionados = this.catalogo.filter(p => (this.cantidades[p.id] || 0) > 0);

        if (seleccionados.length === 0) {
            cuerpo.innerHTML = `
                <div class="carrito-vacio" id="carrito-vacio">
                    <div class="carrito-vacio-icono" aria-hidden="true">🛒</div>
                    <p>Tu carrito está vacío</p>
                    <button class="btn-ir-carta" onclick="gestorApp.irAPagina(1)">Ver la Carta ➔</button>
                </div>`;
            return;
        }

        let total = 0;
        const itemsHTML = seleccionados.map(prod => {
            const cant      = this.cantidades[prod.id];
            const precio    = parseFloat(prod.precio);
            const subtotal  = cant * precio;
            total += subtotal;

            const extras    = this.extrasSeleccionados[prod.id];
            const extrasArr = extras ? Array.from(extras) : [];
            const extrasStr = extrasArr.length > 0 ? extrasArr.join(' · ') : 'Sin personalización';

            return `
            <div class="carrito-item">
                ${this._getThumbHTML(prod.nombre)}
                <div class="carrito-item-info">
                    <div class="carrito-item-header">
                        <span class="carrito-item-nombre">${this._esc(prod.nombre)}</span>
                        <span class="carrito-item-subtotal">S/ ${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="carrito-item-detalle">
                        <span class="carrito-item-extras">${this._esc(extrasStr)}</span>
                        <span class="carrito-item-cant">${cant} × S/ ${precio.toFixed(2)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        cuerpo.innerHTML = itemsHTML + '<hr class="carrito-divisor">';

        if (this.montoTotalUI) {
            this.montoTotalUI.textContent = `S/ ${total.toFixed(2)}`;
        }
    }

    // ==============================================================
    // 12. CONFIRMACIÓN VÍA IA Y DESPACHO POR WHATSAPP
    // ==============================================================

    async procesarConfirmacion() {
        const productosSeleccionados = this.catalogo.filter(prod => (this.cantidades[prod.id] || 0) > 0);

        if (productosSeleccionados.length === 0) {
            alert("Tu pedido está vacío. Por favor, selecciona productos usando el botón '+' de la carta.");
            return;
        }

        this.mostrarModalIA("El Chef IA está analizando tu pedido para sugerirte el mejor complemento criollo... ✨", true);

        const productosParaIA = productosSeleccionados.map(prod => ({
            nombre:    prod.nombre,
            categoria: prod.categoria,
            cantidad:  this.cantidades[prod.id]
        }));

        try {
            const respuesta = await fetch(`${this.apiUrl}/api/recomendar`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ productos: productosParaIA })
            });

            if (!respuesta.ok) throw new Error("Error en el servidor de IA");

            const datos = await respuesta.json();

            if (datos.texto) {
                this.productoExtraTemporal = datos.producto_extra || null;
                this.precioExtraTemporal   = parseFloat(datos.precio_extra) || 0;
                this.mostrarModalIA(datos.texto, false);
            } else if (datos.recomendacion) {
                this.mostrarModalIA(datos.recomendacion, false);
            } else {
                this.mostrarModalIA("¡Excelente elección! ¿Deseas confirmar y enviar a cocina?", false);
            }

        } catch (error) {
            console.error("Fallo al conectar con la IA:", error);
            this.mostrarModalIA(
                "¡Qué gran pedido! ✨ Recuerda que siempre puedes agregar un detalle final a tu mesa. ¿Listo para enviar a cocina?",
                false
            );
        }
    }

    mostrarModalIA(mensaje, esCarga = false) {
        const modalPrevio = document.getElementById('modal-ia-gemini');
        if (modalPrevio) modalPrevio.remove();

        const modalDiv = document.createElement('div');
        modalDiv.id = 'modal-ia-gemini';
        modalDiv.className = 'modal-ia-overlay';

        let botonesHTML = '';
        if (esCarga) {
            botonesHTML = `<button class="btn-ia-secundario" disabled style="opacity:0.6;border:none;background:transparent">Consultando al Chef...</button>`;
        } else {
            botonesHTML = `
                <button class="btn-ia-secundario" onclick="document.getElementById('modal-ia-gemini').remove(); gestorApp.enviarPedidoPorWhatsApp(false)">No, gracias</button>
                <button class="btn-ia-primario"   onclick="document.getElementById('modal-ia-gemini').remove(); gestorApp.enviarPedidoPorWhatsApp(true)">✨ ¡Sí, agrégalo y pedir!</button>
            `;
        }

        modalDiv.innerHTML = `
            <div class="modal-ia-contenido" role="dialog" aria-modal="true">
                <div class="modal-ia-header">
                    <span class="modal-ia-titulo">✨ Chef IA Recomienda</span>
                </div>
                <div class="modal-ia-body">
                    <p id="modal-ia-texto"></p>
                </div>
                <div class="modal-ia-footer">
                    ${botonesHTML}
                </div>
            </div>`;

        document.body.appendChild(modalDiv);

        const elementoTexto = document.getElementById('modal-ia-texto');
        if (esCarga) {
            elementoTexto.innerHTML = `<span style="animation:pulse 1.5s infinite">${this._esc(mensaje)}</span>`;
            return;
        }

        // Efecto mecanografía seguro (Typing Effect con textContent)
        let i = 0;
        elementoTexto.textContent = '';
        const escribirLetra = () => {
            if (i < mensaje.length) {
                elementoTexto.textContent += mensaje.charAt(i);
                i++;
                setTimeout(escribirLetra, 35);
            }
        };
        escribirLetra();
    }

    formatearLinea(item, precio) {
        const anchoTotal  = 35;
        const precioStr   = " S/ " + parseFloat(precio).toFixed(2);
        let paddingLength = Math.max(1, anchoTotal - item.length - 1 - precioStr.length);
        const padding     = ".".repeat(paddingLength);
        return `${item} ${padding}${precioStr}`;
    }

    enviarPedidoPorWhatsApp(incluirExtra = false) {
        let total = 0;
        const productosSeleccionados = [];

        this.catalogo.forEach(prod => {
            const cant = this.cantidades[prod.id] || 0;
            if (cant > 0) {
                productosSeleccionados.push({
                    nombre:        prod.nombre,
                    cantidad:      cant,
                    subtotal:       cant * parseFloat(prod.precio),
                    extras:         this.extrasSeleccionados[prod.id] ? Array.from(this.extrasSeleccionados[prod.id]) : []
                });
                total += cant * parseFloat(prod.precio);
            }
        });

        const nombreLocal = (typeof CONFIG !== 'undefined' && CONFIG.NOMBRE_RESTAURANTE) ? CONFIG.NOMBRE_RESTAURANTE.toUpperCase() : "SANGUCHERIA INTELIGENTE";

        let mensaje = `Mesa: ${this.mesa}\n`;
        mensaje += `*${nombreLocal}*\n`;
        mensaje += `-----------------------------------\n\n`;

        productosSeleccionados.forEach(item => {
            const nombreLinea = `${item.cantidad}x ${item.nombre}`;
            mensaje += `${this.formatearLinea(nombreLinea, item.subtotal)}\n`;
            if (item.extras.length > 0) {
                mensaje += `   ↳ ${item.extras.join(', ')}\n`;
            }
        });

        if (incluirExtra && this.productoExtraTemporal) {
            mensaje += `\n-----------------------------------\n`;
            const nombreExtra = `EXTRA IA: ${this.productoExtraTemporal}`;
            mensaje += `${this.formatearLinea(nombreExtra, this.precioExtraTemporal)}\n`;
            total += parseFloat(this.precioExtraTemporal);
        }

        mensaje += `\n-----------------------------------\n`;
        mensaje += `*Total a Pagar: S/ ${total.toFixed(2)}*\n\n`;
        mensaje += `Por favor, confirmar cuando mi pedido esté en preparación. ¡Muchas gracias!`;

        const url = `https://wa.me/${this.numeroWhatsAppMozo}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, "_blank");
    }
}

// ==============================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {
    window.gestorApp = new GestorPedidosQR();
});
