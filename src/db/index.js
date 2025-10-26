import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try{
        const conn = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        // console.log(conn);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch(err){
        console.error("Failed to connect to MongoDB", err);
        process.exit(1);
    }
};

export default connectDB;
