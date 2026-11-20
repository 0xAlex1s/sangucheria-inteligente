"""
Patrón Singleton para la Conexión a la Base de Datos (Supabase).
Centraliza la instancia del cliente para evitar sobrecarga de memoria
y conexiones redundantes, garantizando resiliencia operativa.
"""

from typing import Optional
from configuracion import config

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None


class ConexionBaseDatos:
    """
    Singleton que gestiona la conexión con el servicio Supabase.
    Si las credenciales no están presentes, opera en modo desconectado
    permitiendo la continuidad del servicio mediante datos locales.
    """
    _instancia = None

    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super(ConexionBaseDatos, cls).__new__(cls)
            cls._instancia._cliente: Optional[Any] = None
            cls._instancia._inicializada = False
            cls._instancia._inicializar_conexion()
        return cls._instancia

    def _inicializar_conexion(self):
        """Inicializa el cliente de Supabase respetando variables de entorno."""
        url = config.SUPABASE_URL
        key = config.SUPABASE_KEY

        if not url or not key:
            print("[INFO] Supabase no configurado (SUPABASE_URL o SUPABASE_KEY vacías).")
            print("[INFO] El sistema operará con el Catálogo Semilla de alta disponibilidad.")
            self._cliente = None
            self._inicializada = True
            return

        if create_client is None:
            print("[AVISO] La librería 'supabase' no está instalada en el entorno.")
            self._cliente = None
            self._inicializada = True
            return

        try:
            print("[INFO] Conectando a Supabase PostgreSQL...")
            self._cliente = create_client(url, key)
            print("[ÉXITO] Conexión a Supabase establecida correctamente.")
        except Exception as error:
            print(f"[ALERTA] No se pudo conectar a Supabase: {error}")
            print("[INFO] Se activará el Catálogo Semilla como respaldo.")
            self._cliente = None
        finally:
            self._inicializada = True

    def esta_conectado(self) -> bool:
        """Indica si existe una conexión activa con Supabase."""
        return self._cliente is not None

    def obtener_conexion(self) -> Optional[Client]:
        """Retorna el cliente de Supabase si está disponible."""
        return self._cliente
