import express from 'express';
import cors from 'cors';
import pg from 'pg';

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
})

app.listen(4000);