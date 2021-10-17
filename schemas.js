import joi from 'joi';

const categorySchema = joi.object(
    {
        name: joi.string().min(1).required()
    }
);

const gameSchema = joi.object(
    {
        name: joi.string().min(1).required(),
        image: joi.string().pattern(/(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|jpeg|gif|png)/).required(),
        stockTotal: joi.number().integer().min(1).required(),
        categoryId: joi.number().integer().min(1).required(),
        pricePerDay: joi.number().integer().min(1).required()
    }
);

const customerSchema = joi.object(
    {
        name: joi.string().min(1).required(),
        phone: joi.string().pattern(/^[0-9]+$/).min(10).max(11).required(),
        cpf: joi.string().pattern(/^[0-9]+$/).length(11).required(),
        birthday: joi.date().iso().required()
    }
);

const rentalSchema = joi.object(
    {
        customerId: joi.number().min(1).required(),
        gameId: joi.number().min(1).required(),
        daysRented: joi.number().min(1).required()
    }
);

const idRentalSchema = joi.object(
    {
        rentalId: joi.number().min(1).required()
    }
);


export {
    categorySchema,
    gameSchema,
    customerSchema,
    rentalSchema,
    idRentalSchema
}