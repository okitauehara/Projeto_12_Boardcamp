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
    connection.query('SELECT * FROM categories;')
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

    connection.query('SELECT name FROM categories WHERE name = $1;', [name])
        .then(result => {
            if (result.rowCount > 0) {
                res.sendStatus(409);
                return;
            } else {
                connection.query('INSERT INTO categories (name) VALUES ($1);', [name])
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
            .then(result => {
                let response = result.rows;
                let games = [];
                
                response.map(game => {
                    connection.query('SELECT name FROM categories WHERE id = $1;', [game.categoryId])
                        .then((result) => {
                            games.push({
                                ...game,
                                categoryName: result.rows[0].name
                            });
                            if (games.length === response.length) {
                                res.send(games);
                                return;
                            }
                        })
                })
            })
            .catch(() => res.sendStatus(400));
            return;
    }

    connection.query('SELECT * FROM games WHERE LOWER(name) LIKE LOWER($1);', [`${name}%`])
        .then(result => {
            let response = result.rows;

            if (result.rowCount === 0) {
                res.send(response);
                return;
            } else {
                let games = [];
                response.map(game => {
                    connection.query('SELECT name FROM categories WHERE id = $1;', [game.categoryId])
                        .then((result) => {
                            games.push({
                                ...game,
                                categoryName: result.rows[0].name
                            });
                            if (games.length === response.length) {
                                res.send(games);
                                return;
                            }
                        })
                })
            }
        })
        .catch(() => res.sendStatus(404));
});

app.post('/games', (req, res) => {
    const {
        name,
        image,
        stockTotal,
        categoryId,
        pricePerDay
    } = req.body;

    const gameSchema = joi.object(
        {
            name: joi.string().min(1),
            image: joi.string().pattern(/(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/),
            stockTotal: joi.number().integer().min(1),
            categoryId: joi.number().integer().min(1),
            pricePerDay: joi.number().integer().min(1)
        }
    );
    const { error } = gameSchema.validate({
        name: name,
        image: image,
        stockTotal: stockTotal,
        categoryId: categoryId,
        pricePerDay: pricePerDay
    });

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    connection.query(`SELECT id FROM categories WHERE id = $1;`, [categoryId])
        .then(result => {
            if (result.rowCount === 0) {
                res.sendStatus(400);
                return;
            } else {
                connection.query(`SELECT name FROM games WHERE name = $1;`, [name])
                    .then(result => {
                        if (result.rowCount > 0) {
                            res.sendStatus(409);
                            return;
                        } else {
                            connection.query(`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);`, [name, image, stockTotal, categoryId, pricePerDay])
                                .then(() => res.sendStatus(201))
                                .catch(() => res.sendStatus(404));
                        }
                    })
                    .catch(error => res.send(error));
            }
        })
        .catch(error => res.send(error));
})

app.listen(4000);