# PokeAPI_web

API RESTful para gestionar equipos de Pokémon favoritos, enriquecida dinámicamente con información de la [PokeAPI](https://pokeapi.co/).

## Características
* Operaciones CRUD completas para equipos de Pokémon.
* Validación estricta de datos (Zod).
* Enriquecimiento de datos (tipos, sprites, stats) consumiendo la PokeAPI.
* Sistema de caché en memoria (120s TTL) para optimizar peticiones externas.
* Seguridad básica con `helmet` y limitador de peticiones (`express-rate-limit`).
* Manejo centralizado de errores.

## Supuestos del Sistema
1. **Persistencia:** Para esta fase del proyecto, los datos se almacenan en memoria (variables). Al reiniciar el servidor, los equipos creados se reinician.
2. **Caché:** Se asume un tiempo de vida (TTL) de 120 segundos para la información de la PokeAPI, ya que los stats base de un Pokémon rara vez cambian.

## Instalación y Ejecución

1. Instalar las dependencias:
   ```bash
   npm install

2. Iniciar el servidor:
npm start

3. Ejecutar las pruebas automatizadas (Jest + Supertest):
npm test

Endpoints (Rutas)
POST /teams - Crear un equipo
Body:
{
  "name": "Equipo Kanto",
  "members": ["bulbasaur", "charmander", 150]
}

Respuesta Exitosa (201 Created): Devuelve el objeto creado con su ID generado.

GET /teams - Listar todos los equipos
Respuesta Exitosa (200 OK): Devuelve un arreglo con todos los equipos guardados.

GET /teams/:id - Detalle enriquecido del equipo
Descripción: Devuelve el equipo consultando la PokeAPI para traer los tipos, sprites y stats de cada miembro.

Respuesta Exitosa (200 OK):
{
  "id": "1710000000000",
  "name": "Equipo Kanto",
  "members": [
    {
      "name": "bulbasaur",
      "types": [...],
      "sprites": { "front_default": "url_aqui" },
      "stats": [...]
    }
  ]
}

PATCH /teams/:id - Actualizar equipo
Body (Campos opcionales):
{
  "name": "Nuevo Nombre",
  "members": ["pikachu"]
}
Respuesta Exitosa (200 OK): Devuelve el equipo actualizado.

DELETE /teams/:id - Eliminar equipo
Respuesta Exitosa (204 No Content): Sin cuerpo en la respuesta.

Códigos HTTP Utilizados
200 OK: Petición procesada correctamente.
201 Created: Recurso creado exitosamente.
204 No Content: Recurso eliminado correctamente.
400 Bad Request: Error de validación (ej. más de 6 miembros, nombres vacíos).
404 Not Found: El ID del equipo no existe.
502 Bad Gateway: Fallo al intentar comunicarse con la PokeAPI externa.
500 Internal Server Error: Fallo inesperado en el servidor.


