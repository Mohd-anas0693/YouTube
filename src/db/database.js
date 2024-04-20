// require('dotenv').config({ path: './env' });
import dotenv from "dotenv";
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const connectDB = async () => {
    try {
        let connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected !! DB Host: ${connectionInstance.connection.host}`);
        console.log(`\n Connection Instance: ${connectionInstance}`);
    } catch (error) {
        console.log("MongoDb connection failed" + error)
        process.exit(1);
    }

}
export default connectDB;