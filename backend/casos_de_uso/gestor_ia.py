"""
Caso de Uso: Gestor de Inteligencia Artificial.
Orquesta los requerimientos de cross-selling inteligente y
búsqueda en lenguaje natural delegando al Asistente Lucho IA.
"""

from typing import Dict, Any, List
from ia.asistente_lucho import AsistenteLuchoIA
from dominio.modelos import ProductoCarrito, ProductoCatalogo


class GestorIA:
    """Caso de uso para la interacción con el motor de IA gastronómica."""

    @staticmethod
    def obtener_recomendacion(productos: List[ProductoCarrito]) -> Dict[str, Any]:
        """
        Procesa el carrito del cliente para recomendar el mejor complemento.
        """
        payload_items = [p.model_dump() if hasattr(p, 'model_dump') else p.dict() for p in productos]
        return AsistenteLuchoIA.generar_recomendacion_complemento(payload_items)

    @staticmethod
    def consultar_antojo(consulta: str, catalogo: List[ProductoCatalogo]) -> Dict[str, Any]:
        """
        Interpreta el lenguaje natural del usuario y selecciona los productos relevantes.
        """
        catalogo_dict = [p.model_dump() if hasattr(p, 'model_dump') else p.dict() for p in catalogo]
        return AsistenteLuchoIA.interpretar_antojo(consulta, catalogo_dict)
