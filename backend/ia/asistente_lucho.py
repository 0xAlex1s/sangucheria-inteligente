"""
Motor de Inteligencia Artificial para el Asistente Gastronómico 'Lucho'.
Gestiona las llamadas a DeepSeek LLM con manejo robusto de excepciones,
validación de esquemas y motor heurístico local de respaldo (Fallback).
"""

import json
import urllib.request
import urllib.error
from typing import Dict, Any, List

from configuracion import config
from ia.prompts import (
    COMPLEMENTOS_LOCAL,
    construir_prompt_sistema_recomendacion,
    construir_prompt_sistema_antojo,
)


class AsistenteLuchoIA:
    """Clase principal del asistente gastronómico inteligente."""

    @staticmethod
    def _invocar_deepseek(mensajes: List[Dict[str, str]], max_tokens: int = 150, temperatura: float = 0.2) -> Optional[Dict[str, Any]]:
        """Realiza la petición HTTP hacia el endpoint de chat de DeepSeek."""
        api_key = config.DEEPSEEK_API_KEY
        if not api_key:
            return None

        payload = json.dumps({
            "model": config.DEEPSEEK_MODELO,
            "messages": mensajes,
            "response_format": {"type": "json_object"},
            "max_tokens": max_tokens,
            "temperature": temperatura,
        }).encode("utf-8")

        peticion = urllib.request.Request(
            config.DEEPSEEK_API_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(peticion, timeout=12) as respuesta:
                cuerpo = respuesta.read().decode("utf-8")
                return json.loads(cuerpo)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, Exception) as error:
            print(f"[AVISO AsistenteLuchoIA] Llamada a DeepSeek falló ({error}). Activando motor de respaldo.")
            return None

    # ==============================================================
    # 1. RECOMENDACIÓN INTELIGENTE DE COMPLEMENTOS
    # ==============================================================

    @classmethod
    def generar_recomendacion_complemento(cls, productos_carrito: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Determina el complemento perfecto según el carrito del cliente.
        Usa DeepSeek si hay API key activa; si no, aplica heurística culinaria.
        """
        # Intento con LLM si hay API Key configurada
        if config.DEEPSEEK_API_KEY:
            prompt_sistema = construir_prompt_sistema_recomendacion()
            prompt_usuario = "El cliente tiene en su carrito:\n"
            for item in productos_carrito:
                nombre = item.get("nombre", "")
                categoria = item.get("categoria", "")
                cantidad = item.get("cantidad", 1)
                prompt_usuario += f"  • {cantidad}x {nombre} ({categoria})\n"
            prompt_usuario += "\nSugiere el complemento perfecto en formato JSON."

            mensajes = [
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": prompt_usuario},
            ]

            datos_llm = cls._invocar_deepseek(mensajes, max_tokens=140, temperatura=0.2)
            if datos_llm and "choices" in datos_llm:
                try:
                    contenido_json = datos_llm["choices"][0]["message"]["content"]
                    resultado = json.loads(contenido_json)
                    if "texto" in resultado and "producto_extra" in resultado:
                        return resultado
                except Exception as error:
                    print(f"[ALERTA AsistenteLuchoIA] Error procesando JSON de LLM: {error}")

        # --- MOTOR HEURÍSTICO GASTRONÓMICO DE RESPALDO ---
        return cls._recomendacion_heuristica(productos_carrito)

    @classmethod
    def _recomendacion_heuristica(cls, productos_carrito: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Reglas culinarias criollas predefinidas de maridaje peruano."""
        nombres = [p.get("nombre", "").lower() for p in productos_carrito]
        categorias = [p.get("categoria", "").lower() for p in productos_carrito]
        
        tiene_sanguche = any("sánd" in c or "sangu" in c or "pan con" in n for c, n in zip(categorias, nombres))
        tiene_bebida = any("bebi" in c for c in categorias)

        # Regla 1: Tiene sánguche pero no bebida -> Maridaje de chicha morada
        if tiene_sanguche and not tiene_bebida:
            return {
                "texto": "¡Ese sánguche pide a gritos una Chicha Morada bien helada! 🫙✨",
                "producto_extra": "Chicha Morada Helada",
                "precio_extra": 3.50
            }
        
        # Regla 2: Solo bebidas -> Sugerir papitas fritas
        if tiene_bebida and not tiene_sanguche:
            return {
                "texto": "¿Solo para calmar la sed? ¡Acompáñalo con unas Papas Fritas crujientes! 🍟🔥",
                "producto_extra": "Piqueo Papas Fritas",
                "precio_extra": 4.50
            }

        # Regla 3: Tiene pan con chicharrón o asado -> Salsa huancaína o criolla
        if any("chicharrón" in n or "chicharron" in n or "asado" in n for n in nombres):
            return {
                "texto": "¿Un toque picantito criollo? ¡La Salsa Criolla o Huancaína le queda brutal! 🌶️😋",
                "producto_extra": "Salsa Huancaína",
                "precio_extra": 2.00
            }

        # Regla por defecto: Salsa Chimichurri
        return {
            "texto": "¡Todo buen sánguche merece nuestra salsa Chimichurri artesanal! 🌿🥪",
            "producto_extra": "Salsa Chimichurri",
            "precio_extra": 2.00
        }

    # ==============================================================
    # 2. FILTRO POR ANTOJO (PROCESAMIENTO DE LENGUAJE NATURAL)
    # ==============================================================

    @classmethod
    def interpretar_antojo(cls, consulta: str, catalogo: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Interpreta texto libre informal y devuelve productos coincidentes.
        """
        if config.DEEPSEEK_API_KEY:
            catalogo_str = json.dumps(
                [{"id": p.get("id"), "nombre": p.get("nombre"), "categoria": p.get("categoria")} for p in catalogo],
                ensure_ascii=False
            )
            prompt_sistema = construir_prompt_sistema_antojo(catalogo_str)
            prompt_usuario = f'El cliente dice: "{consulta}"\nResponde solo con el JSON requerido.'

            mensajes = [
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": prompt_usuario},
            ]

            datos_llm = cls._invocar_deepseek(mensajes, max_tokens=400, temperatura=0.1)
            if datos_llm and "choices" in datos_llm:
                try:
                    contenido_json = datos_llm["choices"][0]["message"]["content"]
                    resultado = json.loads(contenido_json)
                    return cls._sanitizar_resultado_antojo(resultado, catalogo)
                except Exception as error:
                    print(f"[ALERTA AsistenteLuchoIA] Error parseando antojo LLM: {error}")

        # Fallback heurístico semántico
        return cls._antojo_heuristico(consulta, catalogo)

    @classmethod
    def _sanitizar_resultado_antojo(cls, resultado: Dict[str, Any], catalogo: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Filtra y valida que los IDs retornados existan en el catálogo disponible."""
        ids_validos = {p.get("id") for p in catalogo}
        ids_raw = resultado.get("ids", [])
        seleccionados_raw = resultado.get("seleccionados", [])
        mensaje = resultado.get("mensaje", "")

        ids_filtrados = [int(i) for i in ids_raw if isinstance(i, (int, str)) and int(i) in ids_validos]
        
        seleccionados_filtrados = []
        extras_permitidos = {"Con cebolla", "Sin cebolla", "Mayonesa", "Ají amarillo", "Lechuga", "Sal extra"}

        for item in seleccionados_raw:
            if isinstance(item, dict) and "id" in item:
                try:
                    id_val = int(item["id"])
                    if id_val in ids_validos:
                        cant = max(1, int(item.get("cantidad", 1)))
                        extras = [e for e in item.get("extras", []) if e in extras_permitidos]
                        seleccionados_filtrados.append({
                            "id": id_val,
                            "cantidad": cant,
                            "extras": extras
                        })
                except (ValueError, TypeError):
                    continue

        return {
            "ids": ids_filtrados,
            "seleccionados": seleccionados_filtrados,
            "mensaje": mensaje
        }

    @classmethod
    def _antojo_heuristico(cls, consulta: str, catalogo: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Búsqueda semántica aproximada basada en palabras clave peruanas."""
        texto = consulta.lower().strip()
        ids_encontrados = []
        seleccionados = []

        palabras_clave = {
            "pollo": [1],
            "chicharr": [2],
            "cerdo": [2],
            "chancho": [2],
            "asado": [3],
            "carne": [3],
            "res": [3],
            "chorizo": [4],
            "chicha": [5],
            "maracuya": [6],
            "maracuyá": [6],
            "inca": [7],
            "papaya": [8],
            "café": [9],
            "cafe": [9],
            "emoliente": [10],
            "chocolate": [11],
            "infusion": [12],
            "infusión": [12],
            "te": [12],
            "té": [12],
            "fresquito": [5, 6, 7],
            "frio": [5, 6, 7, 8],
            "frío": [5, 6, 7, 8],
            "caliente": [9, 10, 11, 12],
            "antojo": [2, 5],
            "rico": [2],
            "hambre": [2, 3],
        }

        for kw, id_lista in palabras_clave.items():
            if kw in texto:
                for id_prod in id_lista:
                    if id_prod not in ids_encontrados:
                        ids_encontrados.append(id_prod)
                        seleccionados.append({
                            "id": id_prod,
                            "cantidad": 1,
                            "extras": ["Sin cebolla"] if "sin cebolla" in texto else []
                        })

        return {
            "ids": ids_encontrados,
            "seleccionados": seleccionados,
            "mensaje": "" if ids_encontrados else "No encontré ese antojo específico, pero ¡mira las delicias de nuestra carta! 🥖😋"
        }
