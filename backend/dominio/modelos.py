"""
Modelos y Entidades de Dominio de la Sanguchería Inteligente.
Define los contratos de datos y reglas de validación usando Pydantic.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ==============================================================
# ENTIDADES DEL CATÁLOGO
# ==============================================================

class ProductoCatalogo(BaseModel):
    """Representa un producto individual dentro del catálogo del restaurante."""
    id: int = Field(..., description="Identificador único del producto")
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre comercial del producto")
    categoria: str = Field(..., description="Categoría (ej: Sánguches, Bebidas Frías, Bebidas Calientes)")
    precio: Optional[str] = Field(default="0.00", description="Precio en formato decimal como string o float")
    descripcion: Optional[str] = Field(default="", description="Descripción de los ingredientes y sabor")


class ComplementoRecomendado(BaseModel):
    """Representa una opción de complemento para venta cruzada (cross-selling)."""
    producto_extra: str = Field(..., description="Nombre del complemento sugerido")
    precio_extra: float = Field(..., ge=0, description="Precio unitario adicional")


# ==============================================================
# MODELOS PARA CARRITO Y RECOMENDACIÓN IA
# ==============================================================

class ProductoCarrito(BaseModel):
    """Elemento del carrito enviado por el cliente para análisis."""
    nombre: str = Field(..., description="Nombre del producto")
    categoria: str = Field(..., description="Categoría del producto")
    cantidad: int = Field(..., ge=1, le=50, description="Cantidad seleccionada")


class PeticionRecomendacion(BaseModel):
    """Petición enviada al endpoint /api/recomendar."""
    productos: List[ProductoCarrito] = Field(..., description="Lista de productos en el carrito actual")

    @field_validator('productos')
    @classmethod
    def validar_tamano_carrito(cls, productos: List[ProductoCarrito]) -> List[ProductoCarrito]:
        if not productos:
            raise ValueError('El carrito no puede estar vacío para solicitar una recomendación.')
        if len(productos) > 20:
            raise ValueError('El carrito no puede tener más de 20 productos distintos.')
        return productos


class RespuestaRecomendacion(BaseModel):
    """Respuesta generada para el cliente con la sugerencia del Chef IA."""
    texto: str = Field(..., description="Mensaje cálido y persuasivo de Lucho")
    producto_extra: Optional[str] = Field(None, description="Nombre exacto del complemento sugerido")
    precio_extra: Optional[float] = Field(None, description="Precio del complemento sugerido")
    recomendacion: Optional[str] = Field(None, description="Mensaje alternativo informativo o de aviso")


# ==============================================================
# MODELOS PARA FILTRADO POR ANTOJO (PROCESAMIENTO DE LENGUAJE NATURAL)
# ==============================================================

class PeticionAntojo(BaseModel):
    """Petición enviada al endpoint /api/antojo con el texto libre del usuario."""
    consulta: str = Field(..., min_length=1, max_length=200, description="Texto libre ingresado por el usuario")
    catalogo: List[ProductoCatalogo] = Field(..., description="Catálogo disponible para contrastar la búsqueda")

    @field_validator('consulta')
    @classmethod
    def validar_consulta(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('La consulta no puede estar vacía.')
        if len(v) > 200:
            raise ValueError('La consulta no puede superar los 200 caracteres.')
        return v

    @field_validator('catalogo')
    @classmethod
    def validar_catalogo(cls, v: List[ProductoCatalogo]) -> List[ProductoCatalogo]:
        if len(v) > 60:
            raise ValueError('El catálogo no puede tener más de 60 productos.')
        return v


class ProductoSeleccionadoIA(BaseModel):
    """Producto seleccionado automáticamente por la IA en base a la intención del usuario."""
    id: int = Field(..., description="ID del producto sugerido")
    cantidad: int = Field(default=1, ge=1, description="Cantidad inferida de la petición")
    extras: List[str] = Field(default_factory=list, description="Lista de extras o modificaciones")


class RespuestaAntojo(BaseModel):
    """Respuesta estructurada para el frontend del filtro por antojo."""
    ids: List[int] = Field(default_factory=list, description="IDs de productos a resaltar")
    seleccionados: List[ProductoSeleccionadoIA] = Field(default_factory=list, description="Detalle de items con cantidades")
    mensaje: str = Field(default="", description="Mensaje simpático en caso de consultas fuera de contexto")
