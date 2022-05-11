import mongoose from "mongoose";

const nonceSchema = new mongoose.Schema({
  nonce: {
    type: String,
    required: true,
    unique: true,
  },
});

const Nonce = mongoose.model("Nonce", nonceSchema);

export default Nonce;
