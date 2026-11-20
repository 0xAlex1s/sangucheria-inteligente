"""
Patrón Data Access Object (DAO) para el Catálogo de Sánguches y Bebidas.
Aísla por completo las consultas de persistencia (SQL/Supabase) del resto de la aplicación.
Si la nube no está disponible, utiliza datos locales estructurados de forma transparente.
"""

from typing import List, Dict, Any, Optional
from infraestructura.conexion_bd import ConexionBaseDatos
from infraestructura.catalogo_semilla import CATALOGO_SEMILLA


class SangucheDAO:
    """DAO encargado de las operaciones de lectura y escritura del catálogo gastronómico."""
    
    def __init__(self):
        self._gestor_bd = ConexionBaseDatos()

    def obtener_todos(self) -> List[Dict[str, Any]]:
        """
        Retorna todos los productos del catálogo.
        Si la conexión a Supabase está activa, consulta la tabla 'productos';
        en caso contrario, devuelve el catálogo semilla local.
        """
        cliente = self._gestor_bd.obtener_conexion()
        
        if cliente is not None:
            try:
                respuesta = cliente.table("productos").select("*").execute()
                if hasattr(respuesta, 'data') and respuesta.data:
                    return respuesta.data
            except Exception as error:
                print(f"[ALERTA SangucheDAO] Error al consultar Supabase: {error}. Utilizando catálogo local.")

        # Fallback de alta disponibilidad
        return list(CATALOGO_SEMILLA)

    def obtener_por_id(self, id_producto: int) -> Optional[Dict[str, Any]]:
        """Busca un producto por su identificador numérico."""
        todos = self.obtener_todos()
        for item in todos:
            if item.get("id") == id_producto:
                return item
        return None

    def guardar_nuevo(self, datos_sanguche: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Inserta un nuevo producto en Supabase (útil para extensiones ERP o panel admin).
        """
        cliente = self._gestor_bd.obtener_conexion()
        if cliente is not None:
            try:
                respuesta = cliente.table("productos").insert(datos_sanguche).execute()
                return respuesta.data[0] if respuesta.data else None
            except Exception as error:
                print(f"[ERROR SangucheDAO] Error al insertar en la base de datos: {error}")
                return None
                
        # En modo local simulado, añade a la semilla en memoria
        CATALOGO_SEMILLA.append(datos_sanguche)
        return datos_sanguche