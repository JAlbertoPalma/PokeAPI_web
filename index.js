const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const ratelimit = require('express-rate-limit');
const { z } = require('zod');
const NodeCache = require('node-cache');

const app = express();
app.use(express.json());

// Para la seguridad y el rate limit
app.use(helmet());
const limiter = ratelimit({
    windowMs: 15 * 60 * 1000, //15min x 60seg x 1000?
    max: 100, //límite de peticiones por cada ip
});
app.use(limiter);

//***???
//Configuramos la caché con TTL corto para q no abusemos de la pokeapi
const cache = new NodeCache({ stdTTL: 120});

//Persistencia en memoria de nivel básico
let teams = [];

//Esquema de validación con Zod
const teamSchema = z.object({
    name: z.string().min(1, "El nombre no puede estar vacío"),
    members: z.array(z.union([z.string(), z.number()]))
    .max(6, "Máximo 6 miembros por equipo")
    .refine((items) => new Set(items).size === items.length, {
        message: "No puede haber miembros duplicados",
    }),
});

//POST: /teams : para crear los equipos
app.post('/teams', (req, res, next) => {
    try{
        const parsedData = teamSchema.parse(req.body);

        const newTeam = {
            id: Date.now().toString(),
            name: parsedData.name,
            members: parsedData.members
        };
        
        //mandamos 201 cuando creamos un equipo
        teams.push(newTeam);
        res.status(201).json(newTeam);
    } catch (error) {
        if(error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors});
        }
        next(error);
    }
});

//GET: /teams : para leer los equipos
app.get('/teams', (req, res) => {
    res.status(200).json(teams);
});

//GET: /teams/:id para ver el detalle del pokemon en específico
app.get('/teams/:id', async (req, res, next) => {
    try{
        const team = teams.find(t => t.id === req.params.id);
        //Mandamos 404 si no se encuentra el equipo
        if (!team) return res.status(404).json({ message: "Equipo no encontrado"}); 
        const enrichedMembers = await Promise.all(team.members.map(async (member) => {
            let pokemonData = cache.get(member);

            if(!pokemonData) {
                try{
                    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${member.toString().toLowerCase()}`)
                    pokemonData = {
                        name: response.data.name,
                        types: response.data.types,
                        sprites: response.data.sprites,
                        stats: response.data.stats
                    };
                    //Guardamos la info del pokemon en la caché del miembro
                    cache.set(member, pokemonData);
                }catch(pokeError) {
                    // Si falla la API del pokedex lanzamos un error que va a cachar el middlerware
                    const err = new Error(`Fallo al obtener datos de PokeAPI para: ${member}`);
                    // 502 osea Bad Gateway
                    err.status = 502;
                    throw err;
                }
            }
            return pokemonData;
        }));

        //Mandamos un 200, osea todo ok
        res.status(200).json({
            id: team.id,
            name: team.name,
            members: enrichedMembers
        });
    } catch (error) {
        next(error);
    }
});

//Esquema para actualizar
const updateTeamSchema = z.object({
    name: z.string().min(1, "El nombre no puede estar vacío ").optional(),
    members: z.array(z.union([z.string(), z.number()]))
        .max(6, "Máximo 6 miembros por equipo")
        .refine((items) => new Set(items).size === items.length, {
            message: "No puede haber miembros duplicados ",
        }).optional()
});

//PATCH /teams/:id para actualizar el nombre y/o miembros
app.patch('/teams/:id', (req, res, next) => {
    try {
        const teamIndex = teams.findIndex(t => t.id === req.params.id);
        if (teamIndex === -1) return res.status(404).json({ message: "Equipo no encontrado" });

        const parsedData = updateTeamSchema.parse(req.body);

        if (parsedData.name) teams[teamIndex].name = parsedData.name;
        if (parsedData.members) teams[teamIndex].members = parsedData.members;

        res.status(200).json(teams[teamIndex]);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        next(error);
    }
});

//DELETE: /teams/:id para eliminar a un equipo
app.delete('/teams/:id', (req, res) => {
    const initialLength = teams.length;
    teams = teams.filter(t => t.id !== req.params.id);

    if(teams.length === initialLength) {
        return res.status(404).json({ message: "Equipo no encontrado"});
    }

    res.status(204).send();
});

app.use((err, req, res, next) => {
    console.error(err.message);
    const status = err.status || 500;
    res.status(status).json({
        error: "Error interno del servidor",
        message: err.message
    });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`PokeDex API corriendo en el puerto ${PORT}`);
    });
}

module.exports = app;
