"""
Patrón Factory (Fábrica) para la creación y orquestación de Pedidos.
Permite instanciar y personalizar pedidos según el canal de atención:
Mesa, Para Llevar o Delivery, aplicando el principio Open/Closed (SOLID).
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any


class Pedido(ABC):
    """Clase abstracta base para todos los tipos de pedidos."""
    
    def __init__(self, items: List[Dict[str, Any]] = None, mesa: str = ""):
        self.items = items or []
        self.mesa = mesa

    @abstractmethod
    def preparar(self) -> Dict[str, Any]:
        """Define las instrucciones operativas de preparación para cocina."""
        pass

    @abstractmethod
    def tiempo_base_minutos(self) -> int:
        """Tiempo base de preparación en minutos según el tipo de pedido."""
        pass


class PedidoMesa(Pedido):
    """Representa un pedido para consumo directo en el local."""
    
    def preparar(self) -> Dict[str, Any]:
        return {
            "tipo": "Mesa",
            "mesa": self.mesa or "Principal",
            "instruccion": "Servir en mesa en plato de loza con cubiertos y servilletas de tela.",
            "empaque": "Loza artesanal y canastilla criolla."
        }

    def tiempo_base_minutos(self) -> int:
        return 6


class PedidoLlevar(Pedido):
    """Representa un pedido preparado para retiro rápido en barra."""
    
    def preparar(self) -> Dict[str, Any]:
        return {
            "tipo": "Para Llevar",
            "mesa": self.mesa or "Barra",
            "instruccion": "Empaquetar para llevar con salsas en sachet y servilletas de papel.",
            "empaque": "Cajas térmicas biodegradables y bolsa kraft reforzada."
        }

    def tiempo_base_minutos(self) -> int:
        return 7


class PedidoDelivery(Pedido):
    """Representa un pedido destinado a despacho a domicilio."""
    
    def preparar(self) -> Dict[str, Any]:
        return {
            "tipo": "Delivery",
            "mesa": "Despacho",
            "instruccion": "Sellar térmicamente con precinto de seguridad e incluir boleta.",
            "empaque": "Empaque térmico hermético con precinto inviolable."
        }

    def tiempo_base_minutos(self) -> int:
        return 12


class FabricaPedidos:
    """
    Fábrica encargada de instanciar la clase de pedido correspondiente.
    Facilita la escalabilidad del sistema sin alterar los casos de uso existentes.
    """
    
    _TIPOS = {
        "mesa": PedidoMesa,
        "llevar": PedidoLlevar,
        "parallevar": PedidoLlevar,
        "delivery": PedidoDelivery,
    }

    @classmethod
    def crear_pedido(cls, tipo_pedido: str, items: List[Dict[str, Any]] = None, mesa: str = "") -> Pedido:
        """
        Retorna la instancia del pedido solicitado.
        Lanza ValueError si el tipo no es reconocido.
        """
        clave = tipo_pedido.strip().lower().replace(" ", "").replace("_", "")
        clase_pedido = cls._TIPOS.get(clave)
        
        if not clase_pedido:
            tipos_validos = ", ".join(cls._TIPOS.keys())
            raise ValueError(
                f"El tipo de pedido '{tipo_pedido}' no es válido. Tipos soportados: {tipos_validos}."
            )
            
        return clase_pedido(items=items, mesa=mesa)
