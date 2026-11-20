"""
Caso de Uso: Gestor del Catálogo.
Coordina la recuperación y filtrado de productos del menú
a través de la abstracción del DAO.
"""

from typing import List, Dict, Any, Optional
from adaptadores.sanguche_dao import SangucheDAO


class GestorCatalogo:
    """Caso de uso para la gestión del catálogo de productos."""

    def __init__(self, dao: Optional[SangucheDAO] = None):
        self._dao = dao or SangucheDAO()

    def listar_catalogo_completo(self) -> List[Dict[str, Any]]:
        """Obtiene la lista consolidada de productos disponibles."""
        return self._dao.obtener_todos()

    def consultar_por_id(self, id_producto: int) -> Optional[Dict[str, Any]]:
        """Obtiene los detalles de un producto específico."""
        return self._dao.obtener_por_id(id_producto)
