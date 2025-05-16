#!/bin/bash
# Script de construcción personalizado para Render

# Instalar solo las dependencias necesarias para el servidor
pip install flask==2.0.1 gunicorn==20.1.0

# Mensaje de éxito
echo "Construcción completada con éxito"
