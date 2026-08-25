import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    stock:{
        type:Number,
        required:true
    },
    sku:{
        type:String,
        required:true
    }
},
    {timestamps: true}
);


const Product = mongoose.model('products', ProductSchema);
export default Product;