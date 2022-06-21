import mongoose from "mongoose";

export const connection = mongoose.connect(`mongodb://root:password@db`);
