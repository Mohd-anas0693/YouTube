// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
import dotenv from "dotenv";
import db from "./db/database.js";
import { app } from "./app.js";

dotenv.config({
    path: './.env'
})

db().then(
    () => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`server is running at port ${process.env.PORT}`)
        })
    }
).catch((error) => {
    console.log("MongoDb connection Error", error);
});

// db().then(() => {
//     app.listen(process.env.POST || 8000, () => {
//         console.log(`server is running ${process.env.PORT}`)
//     });
// }).catch((error) => {
//     console.log(`Error occured ${error}`);
// })
// ; (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGOOSE_URI}/${DB_NAME}`);
//         app.on("error", (error) => {
//             console.log(error)
//         });
//         app.listen(process.env.PORT, () => {
//             console.log(`app is listening at ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.log(error);
//         throw error
//     }
// }
// )(); 