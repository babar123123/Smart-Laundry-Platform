const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const FundRequest = require('../models/FundRequest');
const User = require('../models/User');

// 1. User: Request Funds
router.post('/request', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ msg: "Invalid amount" });

        const request = new FundRequest({
            user: req.user._id,
            amount
        });
        await request.save();
        res.json({ msg: "Request submitted successfully", request });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. User: Get My Requests
router.get('/my-requests', auth, async (req, res) => {
    try {
        const requests = await FundRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Admin: Get All Pending Requests
router.get('/all-requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ msg: "Access denied" });

        const requests = await FundRequest.find({ status: 'pending' })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Admin: Approve Request
router.put('/approve/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ msg: "Access denied" });

        const request = await FundRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ msg: "Request not found" });
        if (request.status !== 'pending') return res.status(400).json({ msg: "Request already processed" });

        request.status = 'approved';
        await request.save();

        // Update User Balance
        const user = await User.findById(request.user);
        if (user) {
            user.walletBalance = (user.walletBalance || 0) + request.amount;
            await user.save();
        }

        res.json({ msg: "Request approved and balance updated", request });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Admin: Reject Request
router.put('/reject/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ msg: "Access denied" });

        const request = await FundRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ msg: "Request not found" });
        if (request.status !== 'pending') return res.status(400).json({ msg: "Request already processed" });

        request.status = 'rejected';
        await request.save();

        res.json({ msg: "Request rejected", request });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
