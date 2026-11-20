"""
Módulo de Configuración Centralizada de la Sanguchería Inteligente.
Carga y valida las variables de entorno para el backend.
"""

import os
from typing import List

# Intenta cargar python-dotenv si está disponible en el entorno
try:
    from dotenv import load_dotenv
    # Busca .env en la carpeta backend o en la raíz del proyecto
    ruta_env_backend = os.path.join(os.path.dirname(__file__), ".env")
    ruta_env_raiz = os.path.join(os.path.dirname(__file__), "..", ".env")
    
    if os.path.exists(ruta_env_backend):
        load_dotenv(ruta_env_backend)
    elif os.path.exists(ruta_env_raiz):
        load_dotenv(ruta_env_raiz)
except ImportError:
    # Carga manual limpia como fallback si dotenv no estuviera instalado
    for ruta in [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env")
    ]:
        if os.path.exists(ruta):
            with open(ruta, "r", encoding="utf-8") as f:
                for linea in f:
                    linea = linea.strip()
                    if linea and not linea.startswith("#") and "=" in linea:
                        clave, valor = linea.split("=", 1)
                        os.environ.setdefault(clave.strip(), valor.strip().strip('"\''))


class Configuracion:
    """Clase contenedora de variables de configuración del sistema."""
    
    # Servidor
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PUERTO: int = int(os.getenv("PUERTO", "8000"))
    ENTORNO: str = os.getenv("ENTORNO", "development")
    
    # Supabase (Base de datos)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "").strip()
    
    # DeepSeek (Inteligencia Artificial)
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "").strip()
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/chat/completions"
    DEEPSEEK_MODELO: str = "deepseek-chat"
    
    # Orígenes permitidos para CORS
    ORIGENES_PERMITIDOS: List[str] = [
        "https://sangucheria-inteligente.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]


config = Configuracion()
