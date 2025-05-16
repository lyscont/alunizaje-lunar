from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)

# Configurar para servir archivos estáticos correctamente
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Evitar caché en desarrollo

# Configuración del juego
config_juego = {
    "gravedad": 1.622,  # m/s² (gravedad lunar)
    "combustible_inicial": 1000,
    "velocidad_segura_aterrizaje": 4.0,  # m/s
    "potencia_motor": 5.0  # Aceleración en m/s²
}

@app.route('/')
def index():
    """Página principal del juego"""
    return render_template('index.html')

@app.route('/api/config')
def obtener_config():
    """Devuelve la configuración del juego al cliente"""
    return jsonify(config_juego)

@app.route('/api/guardar_puntaje', methods=['POST'])
def guardar_puntaje():
    """Guarda el puntaje del jugador"""
    datos = request.json
    
    # Aquí se podría implementar la lógica para guardar puntajes en una base de datos
    # Por ahora, solo devolvemos los datos recibidos
    return jsonify({"exito": True, "mensaje": "Puntaje guardado", "datos": datos})

if __name__ == '__main__':
    # Obtener puerto del entorno (Heroku) o usar 5000 como predeterminado
    port = int(os.environ.get('PORT', 5000))
    # En producción, no usar debug=True
    is_production = 'DYNO' in os.environ
    # Ejecutar la aplicación
    app.run(debug=not is_production, host='0.0.0.0', port=port)
