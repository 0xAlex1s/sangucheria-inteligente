"""
Controlador / Router de FastAPI para los servicios de Inteligencia Artificial.
Rutas: /api/recomendar y /api/antojo
"""

from fastapi import APIRouter, Request
from dominio.modelos import PeticionRecomendacion, PeticionAntojo
from casos_de_uso.gestor_ia import GestorIA

router = APIRouter(prefix="/api", tags=["Inteligencia Artificial"])


@router.post("/recomendar")
def recomendar_complemento(peticion: PeticionRecomendacion, request: Request):
    """
    Analiza los productos del carrito y retorna una sugerencia persuasiva
    de complemento mediante DeepSeek o motor heurístico de maridaje criollo.
    """
    return GestorIA.obtener_recomendacion(peticion.productos)


@router.post("/antojo")
def filtrar_por_antojo(peticion: PeticionAntojo, request: Request):
    """
    Interpreta el lenguaje natural del cliente (jerga, antojos, descripciones)
    y retorna los IDs y extras sugeridos del menú.
    """
    return GestorIA.consultar_antojo(peticion.consulta, peticion.catalogo)
