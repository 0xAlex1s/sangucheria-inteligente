"""Paquete principal del backend de Sanguchería Inteligente."""

import os
import sys

# Asegura que las importaciones internas de las capas funcionen
# independientemente de si se ejecuta desde la raíz o dentro de /backend
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
