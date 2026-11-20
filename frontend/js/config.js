/**
 * ==============================================================
 * CONFIGURACIÓN GLOBAL DEL CLIENTE — SANGUCHERÍA INTELIGENTE
 * ==============================================================
 * Centraliza los parámetros operativos del frontend para facilitar
 * personalizaciones y despliegues sin alterar la lógica de negocio.
 */

const CONFIG = {
    // Número telefónico para recepción de pedidos por WhatsApp (con código de país)
    // Ejemplo: 51994809171 (Perú: +51)
    NUMERO_WHATSAPP: "51994809171",

    // Nombre de la marca y local
    NOMBRE_RESTAURANTE: "La Lucha Sanguchería Criolla",

    // Detección automática del endpoint del Backend
    // Si estás en localhost o 127.0.0.1 apunta a http://localhost:8000;
    // En producción (ej. Vercel) utiliza rutas relativas ('')
    obtenerApiUrl: function() {
        const esLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        return esLocal ? "http://localhost:8000" : "";
    },

    // Parámetros de estimación de cocina
    TIEMPO_BASE_PREPARACION_MINUTOS: 6,
    TIEMPO_EXTRA_POR_ITEM_MINUTOS: 1.5,
    TIEMPO_MAXIMO_BARRA_MINUTOS: 30,

    // Opciones de personalización de salsas y extras para sánguches
    EXTRAS_DISPONIBLES: [
        { id: 'cebolla',     label: 'Con cebolla' },
        { id: 'sin_cebolla', label: 'Sin cebolla' },
        { id: 'mayonesa',    label: 'Mayonesa' },
        { id: 'aji',         label: 'Ají amarillo' },
        { id: 'lechuga',     label: 'Lechuga' },
        { id: 'sal_extra',   label: 'Sal extra' },
    ],

    // Catálogo de respaldo local inmediato si el backend no responde
    CATALOGO_DEMO: [
        { id: 1, nombre: "Sándwich de Pollo",              categoria: "Sánduches",         precio: "7.00",  descripcion: "Pollo a la plancha con cremas de la casa" },
        { id: 2, nombre: "Pan con Chicharrón",             categoria: "Sánduches",         precio: "8.00",  descripcion: "El clásico irresistible de la sanguchería" },
        { id: 3, nombre: "Sándwich de Asado de Res",       categoria: "Sánduches",         precio: "9.00",  descripcion: "Asado jugoso en pan artesanal" },
        { id: 4, nombre: "Pan con Chorizo a la Plancha",   categoria: "Sánduches",         precio: "7.50",  descripcion: "Chorizo criollo a las brasas" },
        { id: 5, nombre: "Chicha Morada Helada",           categoria: "Bebidas Frías",     precio: "3.50",  descripcion: "Refrescante bebida tradicional peruana" },
        { id: 6, nombre: "Jugo de Maracuyá",               categoria: "Bebidas Frías",     precio: "4.00",  descripcion: "Natural, recién exprimido" },
        { id: 7, nombre: "Inca Kola",                      categoria: "Bebidas Frías",     precio: "3.00",  descripcion: "La bebida de sabor nacional" },
        { id: 8, nombre: "Jugo de Papaya",                 categoria: "Bebidas Frías",     precio: "4.00",  descripcion: "Natural y cremoso" },
        { id: 9, nombre: "Café Tradicional",               categoria: "Bebidas Calientes", precio: "3.50",  descripcion: "Café peruano de altura" },
        { id: 10, nombre: "Emoliente Especial",            categoria: "Bebidas Calientes", precio: "2.50",  descripcion: "Hierba santa con linaza y cebada" },
        { id: 11, nombre: "Chocolate Caliente con Leche",  categoria: "Bebidas Calientes", precio: "4.00",  descripcion: "Chocolate de Cuzco preparado al instante" },
        { id: 12, nombre: "Infusión",                      categoria: "Bebidas Calientes", precio: "2.50",  descripcion: "Manzanilla, menta o hierba luisa" }
    ]
};
