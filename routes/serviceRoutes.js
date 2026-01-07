const multer = require('multer');
const path = require('path');

const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { auth, adminAuth } = require('../middleware/auth');



// Store images in uploads folder with original filename
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // unique filename
    }
});

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only!'));
    }
}

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});


// Add new service (Service Provider)
router.post('/', auth, (req, res, next) => {
    upload.single('image')(req, res, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (req.user.role !== 'service_provider')
            return res.status(403).json({ msg: "Only Service Provider can add services" });

        const { name, description, price } = req.body;
        const image = req.file ? req.file.filename : null;

        const service = new Service({ name, description, price, provider: req.user._id, image });
        await service.save();
        res.json(service);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all services (public)
router.get('/', async (req, res) => {
    try {
        const services = await Service.find().populate('provider', 'name email');
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update service (Service Provider or Admin)
router.put('/:id', auth, async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ msg: "Service not found" });

        if (req.user.role !== 'admin' && service.provider.toString() !== req.user._id.toString())
            return res.status(403).json({ msg: "Access denied" });

        const { name, description, price } = req.body;
        service.name = name || service.name;
        service.description = description || service.description;
        service.price = price || service.price;

        await service.save();
        res.json(service);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete service (Admin only)
// Delete service (Service Provider or Admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ msg: "Service not found" });

        // Check: Sirf Admin ya wahi Provider jisne service banayi delete kar sake
        if (req.user.role !== 'admin' && service.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({ msg: "Access denied: You can only delete your own services" });
        }

        // purana service.remove() ki jagah ye use karein:
        await Service.findByIdAndDelete(req.params.id);

        res.json({ msg: "Service deleted successfully" });
    } catch (err) {
        console.error("Delete Route Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
