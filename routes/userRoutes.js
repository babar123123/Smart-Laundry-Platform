const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { check, validationResult } = require('express-validator');

// Get Current User Profile (incl. Balance)
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ msg: "User not found" });

        // Ensure balance is present
        if (user.walletBalance === undefined) {
            user.walletBalance = 50;
            await user.save();
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register
router.post('/register', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
], async (req, res) => {
    // Check Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ msg: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, walletBalance: user.walletBalance } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User does not exist" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        // MFA Check
        if (user.isMfaEnabled) {
            // Temporary token for MFA verification step (msg triggers frontend to show MFA input)
            return res.json({ mfaRequired: true, userId: user._id });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, walletBalance: user.walletBalance } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users (Admin only)
router.get('/', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User (Admin Only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update User Role (Admin Only)
router.put('/:id/role', auth, adminAuth, async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// -----------------------------------------------------
// MFA ROUTES
// -----------------------------------------------------

// 1. Generate MFA Secret
router.post('/mfa/setup', auth, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ length: 20 });
        const user = await User.findById(req.user._id);

        // Temporarily save secret to verify next
        user.mfaSecret = secret;
        await user.save();

        // Generate QR
        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) throw err;
            res.json({ secret: secret.base32, qrCode: data_url });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Verify & Enable MFA
router.post('/mfa/verify', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user._id);

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret.base32,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            user.isMfaEnabled = true;
            await user.save();
            res.json({ msg: "MFA Enabled Successfully" });
        } else {
            res.status(400).json({ msg: "Invalid Token" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Login with MFA
router.post('/login/mfa', async (req, res) => {
    try {
        const { userId, token } = req.body;
        const user = await User.findById(userId);

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret.base32,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
            res.json({
                token: authToken,
                user: { id: user._id, name: user.name, email: user.email, role: user.role, walletBalance: user.walletBalance }
            });
        } else {
            res.status(400).json({ msg: "Invalid MFA Code" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
