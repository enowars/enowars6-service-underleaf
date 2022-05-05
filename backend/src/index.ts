import app from './index/express';
import { connection } from './index/mongoose';

connection.then(() => {

    console.log("connected to mongodb");
    app.listen(3000, () => {
        console.log('Started express');
    });
});