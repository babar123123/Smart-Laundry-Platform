const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'service_provider', 'user'], default: 'user' },
    walletBalance: { type: Number, default: 50 },
    mfaSecret: { type: Object }, // Store the secret object from speakeasy
    isMfaEnabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
