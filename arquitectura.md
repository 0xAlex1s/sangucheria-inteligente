# Arquitectura de Software: Sanguchería Inteligente

Este documento detalla la arquitectura modular implementada bajo los principios de **Clean Architecture** (Arquitectura Limpia) y buenas prácticas de ingeniería de software para sistemas gastronómicos de alta concurrencia.

---

## 🏛️ Principios Rectores

1. **Aislamiento de Reglas de Negocio**: La capa de `dominio` y `casos_de_uso` no dependen de ningún framework (FastAPI), base de datos (Supabase) o proveedor de IA externo (DeepSeek).
2. **Alta Disponibilidad y Resiliencia**: El sistema implementa el principio de *Degradación Elegante* (Graceful Degradation): si las credenciales de la base de datos o de la IA no están disponibles, el backend opera de manera autónoma con su catálogo semilla y motor heurístico.
3. **Escalabilidad Horizontal y Separación de Responsabilidades**: Las capas se comunican mediante contratos e interfaces desacopladas.

---

## 📁 Árbol de Estructura del Proyecto

```text
sangucheria_inteligente/
├── frontend/                     # Cliente Web (Flipbook Digital - HTML5 / CSS3 / Vanilla JS)
│   ├── index.html                # Interfaz gráfica accesible y semántica
│   ├── css/
│   │   └── estilos.css           # Sistema de diseño con tokens CSS y Mobile-First
│   ├── js/
│   │   ├── config.js             # Parámetros operativos desacoplados (WhatsApp, API, Tiempos)
│   │   └── app.js                # Lógica reactiva: Flipbook, Carrito, NLP IA y WhatsApp
│   └── img/                      # Activos gráficos optimizados de sánguches y bebidas
│
├── backend/                      # Módulo Servidor (Python / FastAPI)
│   ├── servidor.py               # Punto de entrada ASGI, middlewares (CORS, Rate Limiting) y ciclo de vida
│   ├── configuracion.py          # Carga y validación tipada de variables de entorno (.env)
│   ├── requirements.txt          # Dependencias esenciales optimizadas
│   ├── .env.example              # Plantilla de variables de entorno documentada
│   │
│   ├── dominio/                  # Capa Central: Reglas y modelos puros del negocio
│   │   ├── modelos.py            # Contratos de datos tipados con Pydantic (Validaciones)
│   │   └── fabrica_pedidos.py    # Patrón Factory: Instanciación de PedidoMesa / PedidoLlevar / Delivery
│   │
│   ├── infraestructura/          # Capa de Infraestructura: Recursos externos y persistencia
│   │   ├── conexion_bd.py        # Patrón Singleton: Gestión resiliente de cliente Supabase
│   │   └── catalogo_semilla.py   # Catálogo local de alta disponibilidad (Seed Data)
│   │
│   ├── adaptadores/              # Capa de Adaptadores: Aislamiento del almacenamiento
│   │   └── sanguche_dao.py       # Patrón DAO (Data Access Object) con fallback inteligente
│   │
│   ├── ia/                       # Capa de Inteligencia Artificial (NLP & Cross-Selling)
│   │   ├── asistente_lucho.py    # Cliente DeepSeek LLM + Motor Heurístico Criollo de Respaldo
│   │   └── prompts.py            # Prompts del sistema estructurados para respuestas JSON
│   │
│   ├── casos_de_uso/             # Lógica de la Aplicación y Casos de Uso
│   │   ├── gestor_catalogo.py    # Orquestación de consulta y filtrado del catálogo
│   │   ├── gestor_ia.py          # Orquestación de recomendaciones y búsqueda de antojos
│   │   └── gestor_pedidos.py     # Orquestación y cálculo operativo de tiempos de cocina
│   │
│   └── controladores/            # Capa de Presentación: Controladores HTTP (FastAPI Routers)
│       ├── catalogo_controlador.py # Endpoints /api/sanguches
│       ├── ia_controlador.py       # Endpoints /api/recomendar y /api/antojo
│       └── pedidos_controlador.py  # Endpoints /api/pedidos/preparar
│
├── .gitignore                    # Reglas de exclusión para Git (seguridad y limpieza)
├── .env.example                  # Plantilla raíz de configuración
├── INICIAR.bat                   # Script de automatización de entorno local
├── vercel.json                   # Configuración para despliegue Serverless en Vercel
└── README.md                     # Documentación principal del repositorio para GitHub
```

---

## 🎯 Patrones de Diseño Implementados

### 1. Patrón Singleton (`infraestructura/conexion_bd.py`)
Garantiza una única instancia de conexión compartida hacia Supabase PostgreSQL. Evita fuga de recursos y conexiones redundantes durante la concurrencia de peticiones en el servidor ASGI.

### 2. Patrón Factory Method (`dominio/fabrica_pedidos.py`)
Encapsula la creación de instancias de pedidos (`PedidoMesa`, `PedidoLlevar`, `PedidoDelivery`). Satisface el principio **Open/Closed** de SOLID: nuevos tipos de pedidos pueden integrarse añadiendo una nueva subclase sin alterar los casos de uso existentes.

### 3. Patrón DAO / Repositorio (`adaptadores/sanguche_dao.py`)
Desacopla la lógica de negocio de la tecnología de almacenamiento. Si se migra de Supabase a MongoDB o SQLite, solo se ajusta el DAO sin alterar los controladores ni el frontend. Además, implementa un fallback automático hacia `catalogo_semilla.py` si no hay conexión a internet o faltan credenciales en la nube.

### 4. Patrón Asistente con Fallback Heurístico (`ia/asistente_lucho.py`)
La integración con el LLM (DeepSeek) está encapsulada. En caso de timeout, ausencia de API Key o indisponibilidad de la API externa, el sistema activa de forma transparente un motor heurístico basado en reglas gastronómicas de maridaje peruano, garantizando que el usuario final siempre reciba una respuesta inmediata.

---

## 🔐 Seguridad y Protección de Secretos

- **Cero Secretos Hardcodeados**: Ninguna API Key, contraseña o token está escrito en el código fuente.
- **Validación con Rate Limiting**: Protección activa contra ataques de denegación de servicio (DoS) usando `SlowAPI` con identificación por IP.
- **Sanitización contra XSS**: La capa frontend sanitiza todas las cadenas devueltas por el servidor o URL antes de inyectarlas en el DOM.
