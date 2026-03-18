const request = require('supertest');
const axios = require('axios');
const app = require('../index');

//Mockeamos axios para las pruebas
jest.mock('axios');

describe('PokeDex API - CRUD', () => {
    let teamId;

    //POST /teams- crear equipo 
    it('Debería crear un equipo correctamente (201)', async () => {
        const res = await request(app)
        .post('/teams')
        .send({
            name: "Equipo Kanto",
            members: ["bulbasaur", "charmander", "squirtle"]
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        teamId = res.body.id; 
    });

    //POST /teams- error: equipo lleno 
    it('Debería mandar error si hay más de 6 miembros (400)', async () => {
        const res = await request(app)
        .post('/teams')
        .send({
            name: "Equipo lleno",
            members: ["bulbasaur", "charmander", "squirtle",
                      "pikachu", "ditto", "clefairy", "slowpoke"]
        });
        expect(res.statusCode).toEqual(400);
    });

    //GET /teams- listar equipos 
    it('Debería listar todos los equipos (200)', async () => {
        const res = await request(app)
        .get('/teams');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });

    //GET /teams- error 404
    it('Debería devolver 404 para un equipo que no existe', async () => {
        const res = await request(app)
        .get('/teams/id-falso-001');
        expect(res.statusCode).toEqual(404);
    });

    //Integración "Pincheada" (Mock de Axios)
    it('Debería devolver el detalle enriquecido con el mock de PokeAPI', async () => {
        //Simulamos la respuesta exitosa de la PokeAPI
        axios.get.mockResolvedValue({
            data: {
                name: "bulbasaur",
                types: [{ type: { name: "grass" } }],
                sprites: { front_default: "url_sprite" },
                stats: [{ base_stat: 45, stat: { name: "hp" } }]
            }
        });

        const res = await request(app).get(`/teams/${teamId}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.members[0]).toHaveProperty('types');
    });

    //Manejo de fallos externos
    it('Debería devolver el detalle enriquecido con el mock de PokeAPI', async () => {
        //Simulamos una caída de la PokeAPI
        axios.get.mockResolvedValue(new Error('Network Error'));
        
        // Creamos un nuevo equipo rápido para evitar que el caché del test anterior interfiera
        const newTeam = await request(app).post('/teams')
                        .send({ name: "Fallo", members: ["mewtwo"] });

        const res = await request(app).get(`/teams/${newTeam.body.id}`);
        expect(res.statusCode).toEqual(502);
    });
});