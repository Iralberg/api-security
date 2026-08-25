import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        lowercase:true
    },
     phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
},
    { timestamps: true }
);


const Client = mongoose.model('clients', ClientSchema);
export default Client;