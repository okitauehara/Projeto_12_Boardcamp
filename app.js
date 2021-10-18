import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { categorySchema, gameSchema, customerSchema, idCustomerSchema, rentalSchema, idRentalSchema } from './schemas.js';

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
        database: 'boardcamp'
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
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.post('/categories', async (req,res) => {
    const name = req.body.name;

    const { error } = categorySchema.validate({ name });

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
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.get('/games', async (req, res) => {
    const name = req.query.name;

    try {
        if (name === undefined) {
            const result = await connection.query(`
            SELECT
                games.id AS id,
                games.name AS name,
                image,
                "stockTotal",
                "categoryId",
                "pricePerDay",
                categories.name AS "categoryName"
            FROM games
            INNER JOIN categories
            ON games."categoryId" = categories.id
            `);
            if (result.rowCount === 0) {
                res.send('Nenhum jogo registrado');
                return;
            }
            res.send(result.rows);
        } else {
            const result = await connection.query(`
            SELECT
                games.id AS id,
                games.name AS name,
                image,
                "stockTotal",
                "categoryId",
                "pricePerDay",
                categories.name AS "categoryName"
            FROM games
            INNER JOIN categories
            ON games."categoryId" = categories.id
            WHERE LOWER(games.name) LIKE LOWER($1)
            `, [`${name}%`]);
            if (result.rowCount === 0) {
                res.send(result.rows);
                return;
            }
            res.send(result.rows);
        }
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
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

    const { error } = gameSchema.validate(req.body);

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
    } catch (error) {
        console.log(error);
        res.sendStatus(500)
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
            result.rows = result.rows.map(customer => ({
                ...customer,
                birthday: new Date(customer.birthday).toLocaleDateString('en-CA')
            }))
            res.send(result.rows);
            return;
        } else {
            const result = await connection.query('SELECT * FROM customers WHERE cpf LIKE $1', [`${cpf}%`]);
            if(result.rowCount === 0) {
                res.send(result.rows);
                return;
            }
            result.rows = result.rows.map(customer => ({
                ...customer,
                birthday: new Date(customer.birthday).toLocaleDateString('en-CA')
            }))
            res.send(result.rows);
        }
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.get('/customers/:customerId', async (req, res) => {
    const customerId = req.params.customerId;

    const { error } = idCustomerSchema.validate({ customerId });

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    try {
        const result = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        if (result.rowCount === 0) {
            res.sendStatus(404);
            return;
        }
        result.rows = result.rows.map(customer => ({
            ...customer,
            birthday: new Date(customer.birthday).toLocaleDateString('en-CA')
        }))
        res.send(result.rows);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.post('/customers', async (req, res) => {
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;

    const { error } = customerSchema.validate(req.body);

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

        await connection.query(`
        INSERT INTO customers
            (name, phone, cpf, birthday)
        VALUES
            ($1, $2, $3, $4)
        `, [name, phone, cpf, birthday]);
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.put('/customers/:customerId', async (req, res) => {
    const customerId = req.params.customerId;

    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;

    const { error } = customerSchema.validate(req.body) && idCustomerSchema.validate({ customerId });

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    try {
        const cpfCheck = await connection.query('SELECT cpf FROM customers WHERE cpf = $1 AND id <> $2', [cpf, customerId]);
        if (cpfCheck.rowCount > 0) {
            res.sendStatus(409);
            return;
        }

        await connection.query(`
        UPDATE customers
        SET
            name = $1,
            phone = $2,
            cpf = $3,
            birthday = $4
        WHERE id = $5
        `, [name, phone, cpf, birthday, customerId]);
        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.get('/rentals', async (req, res) => {
    const customerId = req.query.customerId;
    const gameId = req.query.gameId;

    try {
        const result = await connection.query('SELECT * FROM rentals');
        const customerInfo = await connection.query(`
        SELECT
            customers.id AS id,
            customers.name AS name
        FROM customers
        INNER JOIN rentals
        ON rentals."customerId" = customers.id
        `);
        const gameInfo = await connection.query(`
        SELECT
            games.id,
            games.name,
            games."categoryId",
            categories.name AS "categoryName"
        FROM games
        INNER JOIN categories
        ON categories.id = games."categoryId"
        `);
        result.rows = result.rows.map(rental => ({
            id: rental.id,
            customerId: rental.customerId,
            gameId: rental.gameId,
            rentDate: new Date(rental.rentDate).toLocaleDateString('en-CA'),
            daysRented: rental.daysRented,
            returnDate: rental.returnDate ? new Date(rental.returnDate).toLocaleDateString('en-CA') : null,
            originalPrice: rental.originalPrice,
            delayFee: rental.delayFee,
            customer: customerInfo.rows.find(value => rental.customerId === value.id),
            game: gameInfo.rows.find(value => rental.gameId === value.id)
        }))
        if (customerId !== undefined && gameId !== undefined) {
            result.rows = result.rows.filter(value => value.customer.id === parseInt(customerId) && value.game.id === parseInt(gameId));
            res.send(result.rows);
            return;
        }
        if (customerId !== undefined && gameId === undefined) {
            result.rows = result.rows.filter(value => value.customer.id === parseInt(customerId));
            res.send(result.rows);
            return;
        }
        if (gameId !== undefined && customerId === undefined) {
            result.rows = result.rows.filter(value => value.game.id === parseInt(gameId));
            res.send(result.rows);
            return;
        }
        res.send(result.rows);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.post('/rentals', async (req, res) => {
    const {
        customerId,
        gameId,
        daysRented
    } = req.body;

    const { error } = rentalSchema.validate(req.body);

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    try {
        const customerCheck = await connection.query('SELECT id FROM customers WHERE id = $1', [customerId]);
        if (customerCheck.rowCount === 0) {
            res.sendStatus(400);
            return;
        }

        const gameCheck = await connection.query('SELECT * FROM games WHERE id = $1', [gameId]);
        if (gameCheck.rowCount === 0) {
            res.sendStatus(400);
            return;
        }

        const gameAvailabilityCheck = await connection.query('SELECT * FROM rentals WHERE "gameId" = $1', [gameId]);
        if (gameAvailabilityCheck.rowCount >= gameCheck.rows[0].stockTotal) {
            res.sendStatus(400);
            return;
        }

        const body = {
            customerId,
            gameId,
            rentDate: new Date().toLocaleDateString('en-CA'),
            daysRented,
            returnDate: null,
            originalPrice: (gameCheck.rows[0].pricePerDay * daysRented),
            delayFee: null
        }

        await connection.query(`
        INSERT INTO rentals
            ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
        VALUES
            ($1, $2, $3, $4, $5, $6, $7)
        `, [body.customerId, body.gameId, body.rentDate, body.daysRented, body.returnDate, body.originalPrice, body.delayFee]);
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.post('/rentals/:id/return', async (req, res) => {
    const rentalId = req.params.id;

    const { error } = idRentalSchema.validate({ rentalId });

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    try {
        const rentalIdCheck = await connection.query('SELECT * FROM rentals WHERE id = $1', [rentalId]);
        if (rentalIdCheck.rowCount === 0) {
            res.sendStatus(404);
            return;
        }

        const game = await connection.query('SELECT * FROM games WHERE id = $1', [rentalIdCheck.rows[0].gameId]);

        if (rentalIdCheck.rows[0].returnDate !== null) {
            res.sendStatus(400);
            return;
        }

        const devolutionInDays = new Date(rentalIdCheck.rows[0].rentDate).getTime() / (1000 * 60 * 60 * 24);
        const devolutionDate = new Date((devolutionInDays + rentalIdCheck.rows[0].daysRented) * (1000 * 60 * 60 * 24));
        const returnDate = new Date()

        const daysDiff = Math.floor(((returnDate.getTime() - devolutionDate.getTime()) / (1000 * 60 * 60 * 24)));
        const delayFee = daysDiff * game.rows[0].pricePerDay;

        await connection.query(`
        UPDATE rentals
        SET
            "returnDate" = $1,
            "delayFee" = $2
        WHERE id = $3
        `, [returnDate.toLocaleDateString('en-CA'), delayFee <= 0 ? 0 : delayFee, rentalId]);
        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.delete('/rentals/:id', async (req, res) => {
    const rentalId = req.params.id;

    const { error } = idRentalSchema.validate({ rentalId });

    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    try {
        const rentalIdCheck = await connection.query('SELECT * FROM rentals WHERE id = $1', [rentalId]);
        if (rentalIdCheck.rowCount === 0) {
            res.sendStatus(404);
            return;
        }

        if (rentalIdCheck.rows[0].returnDate !== null) {
            res.sendStatus(400);
            return;
        }

        await connection.query('DELETE FROM rentals WHERE id = $1', [rentalId]);
        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.listen(4000);