"""
Punto de Entrada Principal de la API — Sanguchería Inteligente.
Configura la aplicación FastAPI, CORS, Rate Limiting y registra los controladores.
"""

import os
import sys

# Asegura que el directorio del backend esté en sys.path para importaciones absolutas
DIRECTORIO_BACKEND = os.path.dirname(os.path.abspath(__file__))
if DIRECTORIO_BACKEND not in sys.path:
    sys.path.insert(0, DIRECTORIO_BACKEND)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from configuracion import config
from infraestructura.conexion_bd import ConexionBaseDatos

# Importación de controladores (Routers)
from controladores.catalogo_controlador import router as catalogo_router
from controladores.ia_controlador import router as ia_router
from controladores.pedidos_controlador import router as pedidos_router

# Inicialización de Rate Limiting con SlowAPI (resiliente)
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None
    RateLimitExceeded = None

# Instanciación de la aplicación FastAPI
app = FastAPI(
    title="API Sanguchería Inteligente",
    description="Backend gastronómico con Clean Architecture, IA para recomendaciones culinarias y base de datos Supabase.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración del Rate Limiter
if limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ORIGENES_PERMITIDOS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de Controladores / Routers
app.include_router(catalogo_router)
app.include_router(ia_router)
app.include_router(pedidos_router)


# ==============================================================
# EVENTOS DE CICLO DE VIDA (STARTUP / SHUTDOWN)
# ==============================================================

@app.on_event("startup")
def al_iniciar():
    """Inicializa servicios esenciales y la conexión singleton a la base de datos."""
    print("=" * 60)
    print(" SANGUCHERÍA INTELIGENTE — SERVIDOR INICIADO ")
    print(f" Entorno: {config.ENTORNO}")
    print("=" * 60)
    # Inicializa el Singleton de la base de datos
    bd = ConexionBaseDatos()
    if bd.esta_conectado():
        print("[ESTADO BD] Conectado exitosamente a Supabase.")
    else:
        print("[ESTADO BD] Modo Catálogo Semilla local activo.")


# ==============================================================
# RUTAS DE DIAGNÓSTICO Y SALUD
# ==============================================================

@app.get("/", tags=["Diagnóstico"])
def ruta_raiz():
    """Ruta raíz de bienvenida e información de la API."""
    return {
        "proyecto": "Sanguchería Inteligente",
        "version": "2.0.0",
        "estado": "Operativo",
        "documentacion": "/docs",
        "descripcion": "API desarrollada con FastAPI y Clean Architecture para gestión de cartas digitales e IA gastronómica."
    }


@app.get("/api/health", tags=["Diagnóstico"])
def estado_salud():
    """Endpoint para monitoreo de salud (healthcheck) de servicios."""
    bd = ConexionBaseDatos()
    return {
        "servidor": "OK",
        "base_de_datos": "Supabase" if bd.esta_conectado() else "Catalogo_Semilla_Local",
        "asistente_ia": "DeepSeek" if bool(config.DEEPSEEK_API_KEY) else "Heuristica_Criolla_Local"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("servidor:app", host=config.HOST, port=config.PUERTO, reload=True)
