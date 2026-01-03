const mongoose = require('mongoose');
const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    image: { type: String }, // ADD THIS	
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
