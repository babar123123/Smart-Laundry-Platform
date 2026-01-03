
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { auth, adminAuth } = require('../middleware/auth');

// Place new order (User)
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'user') return res.status(403).json({ msg: "Only users can place orders" });

        const { serviceId } = req.body;

        // 1. Service Details Fetch karein (Price ke liye)
        const service = await mongoose.model('Service').findById(serviceId);
        if (!service) return res.status(404).json({ msg: "Service not found" });

        // 2. User ka current balance check karein
        const user = await mongoose.model('User').findById(req.user._id);

        // 3. Balance verify karein
        if (user.walletBalance < service.price) {
            return res.status(400).json({ msg: "Insufficient funds. Please recharge." });
        }

        // 4. Paisa kato
        user.walletBalance -= service.price;
        await user.save();

        // 5. Order create karo
        const order = new Order({ user: req.user._id, service: serviceId });
        await order.save();

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Checkout (Bulk Order)
router.post('/checkout', auth, async (req, res) => {
    try {
        if (req.user.role !== 'user') return res.status(403).json({ msg: "Only users can place orders" });

        const { serviceIds } = req.body;
        if (!serviceIds || serviceIds.length === 0) return res.status(400).json({ msg: "Cart is empty" });

        const Service = mongoose.model('Service');
        const User = mongoose.model('User');
        const user = await User.findById(req.user._id);

        // 1. Calculate Total Price
        let totalPrice = 0;
        const validServices = [];

        for (const id of serviceIds) {
            const service = await Service.findById(id);
            if (service) {
                totalPrice += service.price;
                validServices.push(service);
            }
        }

        // 2. Check Balance
        if (user.walletBalance < totalPrice) {
            return res.status(400).json({ msg: `Insufficient funds.Total: €${totalPrice}, Balance: €${user.walletBalance} ` });
        }

        // 3. Deduct Balance
        user.walletBalance -= totalPrice;
        await user.save();

        // 4. Create Orders
        const orders = [];
        for (const service of validServices) {
            const order = new Order({ user: req.user._id, service: service._id });
            await order.save();
            orders.push(order);
        }

        res.json({ msg: "Order placed successfully", orders, newBalance: user.walletBalance });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's orders
router.get('/my', auth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('service')
            .populate('user', 'name email');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all orders (Admin only)
router.get('/', auth, adminAuth, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('service')
            .populate('user', 'name email');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update order status (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: "Order not found" });

        const { status } = req.body;
        order.status = status || order.status;

        await order.save();
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Order (Admin Only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ msg: "Order deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
