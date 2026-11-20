"""
Controlador / Router de FastAPI para la creación y orquestación de Pedidos.
Rutas: /api/pedidos
"""

from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from casos_de_uso.gestor_pedidos import GestorPedidos

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])


class PeticionNuevoPedido(BaseModel):
    tipo: str = Field(default="mesa", description="Tipo de pedido: 'mesa', 'llevar' o 'delivery'")
    mesa: str = Field(default="Principal", description="Identificador de la mesa o destinatario")
    items: List[Dict[str, Any]] = Field(default_factory=list, description="Lista de productos y cantidades")


@router.post("/preparar")
def procesar_pedido(peticion: PeticionNuevoPedido, request: Request):
    """
    Simula la recepción de un pedido aplicando el Factory Method
    para determinar los estándares de empaque y tiempos de cocina.
    """
    try:
        resultado = GestorPedidos.procesar_nuevo_pedido(
            tipo_pedido=peticion.tipo,
            items=peticion.items,
            mesa=peticion.mesa
        )
        return resultado
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
