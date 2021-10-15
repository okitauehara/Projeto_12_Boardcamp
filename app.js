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
        user: 'bootcamp_role',
        password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
        host: 'localhost',
        port: 5432,
        database: 'boardcamp',
    }
);

app.get('/categories', async (req, res) => {
    try {
        const result = await connection.query('SELECT * FROM categories');
        if (result.rowCount === 0) {
            res.send('Nenhuma categoria registrada');
            return;
        }
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
            if (result.rowCount === 0) {
                res.send('Nenhum jogo registrado');
                return;
            }
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
            name: joi.string().min(1).required(),
            image: joi.string().pattern(/(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/).required(),
            stockTotal: joi.number().integer().min(1).required(),
            categoryId: joi.number().integer().min(1).required(),
            pricePerDay: joi.number().integer().min(1).required()
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
});

app.get('/customers', async (req, res) => {
    const cpf = req.query.cpf;

    try {
        if (cpf === undefined) {
            const result = await connection.query('SELECT * FROM customers');
            if(result.rowCount === 0) {
                res.send('Nenhum cliente registrado');
                return;
            }
            res.send(result.rows);
            return;
        } else {
            const result = await connection.query('SELECT * FROM customers WHERE cpf LIKE $1', [`${cpf}%`]);
            if(result.rowCount === 0) {
                res.send('Não existem clientes registrados com este CPF');
                return;
            }
            res.send(result.rows);
        }
    } catch {
        res.sendStatus(400);
    }
});

app.get('/customers/:customerId', async (req, res) => {
    const customerId = parseInt(req.params.customerId);

    try {
        const result = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        if (result.rowCount === 0) {
            res.sendStatus(404);
            return;
        }
        res.send(result.rows[0]);
    } catch {
        res.sendStatus(400);
    }
});

app.post('/customers', async (req, res) => {
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;

    const customerSchema = joi.object(
        {
            name: joi.string().min(1).required(),
            phone: joi.string().pattern(/^[0-9]+$/).min(10).max(11).required(),
            cpf: joi.string().pattern(/^[0-9]+$/).length(11).required(),
            birthday: joi.string().pattern(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/).required()
        }
    );

    const { error } = customerSchema.validate(
        {
            name: name,
            phone: phone,
            cpf: cpf,
            birthday: birthday
        }
    );

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    try {
        const cpfCheck = await connection.query('SELECT cpf FROM customers WHERE cpf = $1', [cpf]);
        if (cpfCheck.rowCount > 0) {
            res.sendStatus(409);
            return;
        }

        await connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)', [name, phone, cpf, birthday]);
        res.sendStatus(201);
    } catch {
        res.sendStatus(404);
    }
});

app.put('/customers/:customerId', async (req, res) => {
    const customerId = parseInt(req.params.customerId);

    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;

    const updateCustomerSchema = joi.object(
        {
            name: joi.string().min(1).required(),
            phone: joi.string().pattern(/^[0-9]+$/).min(10).max(11).required(),
            cpf: joi.string().pattern(/^[0-9]+$/).length(11).required(),
            birthday: joi.string().pattern(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/).required()
        }
    );

    const { error } = updateCustomerSchema.validate(
        {
            name: name,
            phone: phone,
            cpf: cpf,
            birthday: birthday
        }
    );

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    try {
        const cpfCheck = await connection.query('SELECT cpf FROM customers WHERE cpf = $1', [cpf]);
        if (cpfCheck.rowCount > 0) {
            res.sendStatus(409);
            return;
        }

        await connection.query('UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE id = $5', [name, phone, cpf, birthday, customerId]);
        res.sendStatus(200);
    } catch {
        res.sendStatus(400);
    }
});

app.listen(4000);