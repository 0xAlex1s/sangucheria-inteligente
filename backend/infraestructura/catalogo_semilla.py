"""
Catálogo Semilla (Seed Data) de la Sanguchería Criolla.
Garantiza alta disponibilidad y resiliencia en entornos de desarrollo,
pruebas locales o si no se cuenta con credenciales activas de Supabase.
"""

from typing import List, Dict, Any

CATALOGO_SEMILLA: List[Dict[str, Any]] = [
    # --- SÁNGUCHES CRIOLLOS ---
    {
        "id": 1,
        "nombre": "Sándwich de Pollo",
        "categoria": "Sánduches",
        "precio": "7.00",
        "descripcion": "Pollo a la plancha deshilachado con cremas artesanales de la casa y lechuga fresca."
    },
    {
        "id": 2,
        "nombre": "Pan con Chicharrón",
        "categoria": "Sánduches",
        "precio": "8.00",
        "descripcion": "El clásico irresistible: panceta crujiente, camote frito dorado y sarza criolla."
    },
    {
        "id": 3,
        "nombre": "Sándwich de Asado de Res",
        "categoria": "Sánduches",
        "precio": "9.00",
        "descripcion": "Asado de res en su jugo, tierno y jugoso en pan artesanal crujiente."
    },
    {
        "id": 4,
        "nombre": "Pan con Chorizo a la Plancha",
        "categoria": "Sánduches",
        "precio": "7.50",
        "descripcion": "Chorizo criollo artesanal a las brasas con chimichurri y sarza criolla."
    },
    
    # --- BEBIDAS FRÍAS ---
    {
        "id": 5,
        "nombre": "Chicha Morada Helada",
        "categoria": "Bebidas Frías",
        "precio": "3.50",
        "descripcion": "Elaborada con maíz morado, piña, manzana, canela, clavo y un toque de limón."
    },
    {
        "id": 6,
        "nombre": "Jugo de Maracuyá",
        "categoria": "Bebidas Frías",
        "precio": "4.00",
        "descripcion": "Fruta natural recién exprimida, ácida y refrescante."
    },
    {
        "id": 7,
        "nombre": "Inca Kola",
        "categoria": "Bebidas Frías",
        "precio": "3.00",
        "descripcion": "La bebida de sabor nacional de 500ml bien helada."
    },
    {
        "id": 8,
        "nombre": "Jugo de Papaya",
        "categoria": "Bebidas Frías",
        "precio": "4.00",
        "descripcion": "Natural, cremoso y saludable preparado al instante."
    },
    
    # --- BEBIDAS CALIENTES ---
    {
        "id": 9,
        "nombre": "Café Tradicional",
        "categoria": "Bebidas Calientes",
        "precio": "3.50",
        "descripcion": "Café pasado peruano de altura (Chanchamayo) de aroma intenso."
    },
    {
        "id": 10,
        "nombre": "Emoliente Especial",
        "categoria": "Bebidas Calientes",
        "precio": "2.50",
        "descripcion": "Receta tradicional con linaza, cebada, boldo, cola de caballo y limón caliente."
    },
    {
        "id": 11,
        "nombre": "Chocolate Caliente con Leche",
        "categoria": "Bebidas Calientes",
        "precio": "4.00",
        "descripcion": "Cacao cusqueño puro con leche fresca y canela."
    },
    {
        "id": 12,
        "nombre": "Infusión",
        "categoria": "Bebidas Calientes",
        "precio": "2.50",
        "descripcion": "Hierbas selectas a elección: manzanilla, menta o hierba luisa."
    }
]
