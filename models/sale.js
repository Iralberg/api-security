import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
    {
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "clients",
            required: true
        },

        products: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "products",
                    required: true
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                },

                price: {
                    type: Number,
                    required: true,
                    min: 0
                },

                subtotal: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ],

        total: {
            type: Number,
            required: true,
            min: 0
        },

        // Histórico dos pagamentos realizados
        payments: [
            {
                amount: {
                    type: Number,
                    required: true,
                    min: 0
                },

                method: {
                    type: String,
                    enum: ["Dinheiro", "Pix", "Cartão", "Boleto","Fiado"],
                    required: true
                },
                status: {
                    type: String,
                    enum: ["Confirmado", "Estornado"],
                    default: "Confirmado"
                },
                date: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        // Quanto já foi pago
        paidAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        // Quanto ainda falta pagar
        remainingAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        status: {
            type: String,
            enum: ["Pendente", "Parcial", "Pago", "Cancelado"],
            default: "Pendente"
        },

        numberVenda: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;