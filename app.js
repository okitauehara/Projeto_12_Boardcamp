import express from 'express';
import cors from 'cors';
import pg from 'pg';
import joi from 'joi';

const app = express();

app.use(cors());
app.use(express.json());

const { Pool } = pg;

const connection = new Pool(
    {
        user: 'postgres',
        password: '123456',
        host: 'localhost',
        port: 5432,
        database: 'boardcamp',
    }
);

app.get('/categories', (req, res) => {
    connection.query('SELECT * FROM categories')
        .then(result => res.send(result.rows))
        .catch(() => res.sendStatus(400));
});

app.post('/categories', (req,res) => {
    const name = req.body.name;
    const categorySchema = joi.object(
        {
            name: joi.string().min(1).required()
        }
    );
    const { error } = categorySchema.validate({name: name});

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    connection.query(`SELECT name FROM categories WHERE name = $1`, [name])
        .then(result => {
            if (result.rowCount > 0) {
                res.sendStatus(409);
                return;
            } else {
                connection.query(`INSERT INTO categories (name) VALUES ($1)`, [name])
                    .then(() => res.sendStatus(201))
                    .catch(() => res.sendStatus(400));
            }
        })
        .catch(error => res.send(error));
});

app.get('/games', (req, res) => {
    const name = req.query.name;

    if (name === undefined) {
        connection.query('SELECT * FROM games')
            .then(result => res.send(result.rows))
            .catch(() => res.sendStatus(400));
        return;
    }
    connection.query(`SELECT * FROM games WHERE LOWER(name) LIKE LOWER($1)`, [`${name}%`])
        .then(result => {
            let games = [];
            let response = result.rows;
            if (response.length === 0) {
                res.send(response);
                return;
            }
            response.map(game => {
                connection.query(`SELECT name FROM categories WHERE id = $1`, [game.categoryId])
                    .then(() => {
                        games.push({
                            ...game,
                            categoryName: result,
                        });
                    })
            })
            res.send(games);
            return;
        })
        .catch(() => res.sendStatus(400));
});

app.listen(4000);