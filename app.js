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

app.get('/categories', async (req, res) => {
    try {
        const result = await connection.query('SELECT * FROM categories');
        res.send(result.rows);
    } catch {
        res.sendStatus(400);
    }
});

app.post('/categories', async (req,res) => {
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

    try {
        const result = await connection.query('SELECT name FROM categories WHERE name = $1', [name]);
        if (result.rowCount > 0) {
            res.sendStatus(409);
            return;
        }
        await connection.query('INSERT INTO categories (name) VALUES ($1)', [name]);
        res.sendStatus(201)
    } catch {
        res.sendStatus(400);
    }
});

app.get('/games', async (req, res) => {
    const name = req.query.name;

    try {
        if (name === undefined) {
            const result = await connection.query('SELECT games.id AS id, games.name AS name, image, "stockTotal", "categoryId", "pricePerDay", categories.name AS "categoryName" FROM games INNER JOIN categories ON games."categoryId" = categories.id');
            res.send(result.rows);
        } else {
            const result = await connection.query('SELECT games.id AS id, games.name AS name, image, "stockTotal", "categoryId", "pricePerDay", categories.name AS "categoryName" FROM games INNER JOIN categories ON games."categoryId" = categories.id WHERE LOWER(games.name) LIKE LOWER($1)', [`${name}%`]);
            if (result.rowCount === 0) {
                res.send('Não existem jogos registrados com este nome');
                return;
            }
            res.send(result.rows);
        }
    } catch {
        res.sendStatus(400);
    }
});

app.post('/games', async (req, res) => {
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

    try {
        const categoryCheck = await connection.query(`SELECT id FROM categories WHERE id = $1`, [categoryId]);
        if (categoryCheck.rowCount === 0) {
            res.sendStatus(400);
            return;
        }

        const gameNameCheck = await connection.query(`SELECT name FROM games WHERE name = $1`, [name]);
        if (gameNameCheck.rowCount > 0) {
            res.sendStatus(409);
            return;
        }

        await connection.query(`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)`, [name, image, stockTotal, categoryId, pricePerDay]);
        res.sendStatus(201)
    } catch {
        res.sendStatus(400)
    }
})



app.listen(4000);