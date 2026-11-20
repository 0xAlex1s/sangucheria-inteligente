"""
Caso de Uso: Gestor de Pedidos.
Aplica el Patrón Factory para instanciar pedidos según el tipo de atención
(Mesa, Para Llevar, Delivery) y estimar tiempos operativos en cocina.
"""

from typing import List, Dict, Any
from dominio.fabrica_pedidos import FabricaPedidos


class GestorPedidos:
    """Caso de uso para la validación y orquestación de pedidos."""

    @staticmethod
    def procesar_nuevo_pedido(tipo_pedido: str, items: List[Dict[str, Any]], mesa: str = "") -> Dict[str, Any]:
        """
        Instancia el pedido mediante el Factory Method, calcula el tiempo
        estimado y genera la directiva de preparación.
        """
        instancia_pedido = FabricaPedidos.crear_pedido(tipo_pedido, items=items, mesa=mesa)
        info_preparacion = instancia_pedido.preparar()

        # Cálculo dinámico de preparación: tiempo base + 1.5 min por producto adicional
        total_unidades = sum(int(item.get("cantidad", 1)) for item in items) if items else 1
        tiempo_base = instancia_pedido.tiempo_base_minutos()
        tiempo_total_estimado = round(tiempo_base + max(0, total_unidades - 1) * 1.5)

        return {
            "estado": "Recibido",
            "detalles_preparacion": info_preparacion,
            "tiempo_estimado_minutos": tiempo_total_estimado,
            "total_items": total_unidades,
        }
