"""
Controlador / Router de FastAPI para el Catálogo Gastronómico.
Rutas: /api/sanguches
"""

from fastapi import APIRouter, Request, HTTPException
from typing import List, Dict, Any
from casos_de_uso.gestor_catalogo import GestorCatalogo

router = APIRouter(prefix="/api/sanguches", tags=["Catálogo"])
gestor = GestorCatalogo()


@router.get("", response_model=List[Dict[str, Any]])
def obtener_catalogo(request: Request):
    """
    Retorna la lista consolidada de productos categorizados.
    Utiliza SangucheDAO con fallback automático a catálogo semilla.
    """
    return gestor.listar_catalogo_completo()


@router.get("/{id_producto}", response_model=Dict[str, Any])
def obtener_producto_por_id(id_producto: int, request: Request):
    """
    Retorna el detalle de un producto específico por su ID.
    """
    producto = gestor.consultar_por_id(id_producto)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto
