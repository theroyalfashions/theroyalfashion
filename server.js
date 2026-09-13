require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const UPLOADS_DIR = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, "[]");
}

if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        return [];
    }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function normalize(product) {
    if (!Array.isArray(product.images) || product.images.length === 0) {
        product.images = product.image ? [product.image] : [];
    }

    if (!product.image && product.images.length > 0) {
        product.image = product.images[0];
    }

    if (!Array.isArray(product.sizes)) {
        product.sizes = product.sizes ? [product.sizes] : [];
    }

    if (product.stock === undefined || product.stock === null || product.stock === "") {
        product.stock = 10;
    } else {
        product.stock = Math.max(0, parseInt(product.stock, 10) || 0);
    }

    return product;
}

/* =====================================================
   MONGOOSE MODELS & ATLAS CONNECTION
===================================================== */

let isMongoConnected = false;

const productSchema = new mongoose.Schema({
    id: { type: String, unique: true, index: true },
    name: { type: String, default: "" },
    category: { type: String, default: "" },
    price: { type: Number, default: 0 },
    oldPrice: { type: Number, default: 0 },
    comparePrice: { type: Number, default: 0 },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    stock: { type: Number, default: 10 },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    toJSON: {
        transform: function(doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

const orderSchema = new mongoose.Schema({
    id: { type: String, unique: true, index: true },
    customer: { type: String, default: "" },
    phone: { type: String, default: "" },
    alternativePhone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    paymentMethod: { type: String, default: "Cash on Delivery (COD)" },
    items: { type: Array, default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, default: "Pending" },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    toJSON: {
        transform: function(doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(async () => {
            isMongoConnected = true;
            console.log("🍃 MongoDB Atlas Connected Successfully!");

            try {
                const pCount = await Product.countDocuments();
                if (pCount === 0 && fs.existsSync(PRODUCTS_FILE)) {
                    const localProducts = readJSON(PRODUCTS_FILE);
                    if (localProducts.length > 0) {
                        await Product.insertMany(localProducts);
                        console.log(`🍃 Synced ${localProducts.length} local products to MongoDB Atlas.`);
                    }
                }
                const oCount = await Order.countDocuments();
                if (oCount === 0 && fs.existsSync(ORDERS_FILE)) {
                    const localOrders = readJSON(ORDERS_FILE);
                    if (localOrders.length > 0) {
                        await Order.insertMany(localOrders);
                        console.log(`🍃 Synced ${localOrders.length} local orders to MongoDB Atlas.`);
                    }
                }
            } catch (syncErr) {
                console.error("MongoDB initial sync error:", syncErr.message);
            }
        })
        .catch(err => {
            console.error("MongoDB Connection Error:", err.message);
        });
}

async function getProducts() {
    if (isMongoConnected) {
        try {
            const docs = await Product.find({}).lean();
            return docs.map(normalize);
        } catch (err) {
            console.error("Mongo getProducts error:", err.message);
        }
    }
    return readJSON(PRODUCTS_FILE).map(normalize);
}

async function saveProducts(products) {
    writeJSON(PRODUCTS_FILE, products);
}

async function getOrders() {
    if (isMongoConnected) {
        try {
            const docs = await Order.find({}).sort({ createdAt: -1 }).lean();
            return docs;
        } catch (err) {
            console.error("Mongo getOrders error:", err.message);
        }
    }
    return readJSON(ORDERS_FILE);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },

    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000000) +
            ext;

        cb(null, name);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        files: 10,
        fileSize: 10 * 1024 * 1024
    }
});

function getAdminCredentials() {
    try {
        if (fs.existsSync(path.join(__dirname, ".env"))) {
            const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
            let u = null;
            let p = null;
            envContent.split("\n").forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) return;
                const eqIdx = trimmed.indexOf("=");
                if (eqIdx !== -1) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
                    if (key === "ADMIN_USERNAME" || key === "ADMIN_USER") u = val;
                    if (key === "ADMIN_PASSWORD" || key === "ADMIN_PASS") p = val;
                }
            });
            if (u || p) {
                return {
                    user: u || process.env.ADMIN_USERNAME || process.env.ADMIN_USER || "admin",
                    pass: p || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "admin"
                };
            }
        }
    } catch (e) {
        // fallback
    }

    return {
        user: process.env.ADMIN_USERNAME || process.env.ADMIN_USER || "admin",
        pass: process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "admin"
    };
}

function adminAuth(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Basic ")) {
        res.setHeader("WWW-Authenticate", 'Basic realm="The Royal Fashion Admin"');
        return res.status(401).send("Authentication required");
    }

    const decoded = Buffer.from(
        auth.split(" ")[1],
        "base64"
    ).toString();

    const separator = decoded.indexOf(":");

    const username = decoded.substring(0, separator);
    const password = decoded.substring(separator + 1);

    const { user: currentAdminUser, pass: currentAdminPass } = getAdminCredentials();

    if (username !== currentAdminUser || password !== currentAdminPass) {
        res.setHeader("WWW-Authenticate", 'Basic realm="The Royal Fashion Admin"');
        return res.status(401).send("Invalid username or password");
    }

    next();
}

app.get("/api/admin-check", adminAuth, (req, res) => {
    res.json({ success: true });
});

/* =========================
   CUSTOMER PRODUCTS
========================= */

app.get("/api/products", async (req, res) => {
    try {
        const all = await getProducts();
        const products = all.filter(
            product => product && product.hidden !== true
        );
        res.json(products);
    } catch (err) {
        console.error("GET /api/products error:", err);
        res.status(500).json([]);
    }
});

/* =========================
   CUSTOMER ORDER
========================= */

app.post("/api/orders", async (req, res) => {
    try {
        const orderData = {
            id: "ORD-" + Date.now(),
            createdAt: new Date().toISOString(),
            status: "Pending",
            ...req.body
        };

        let savedOrder = orderData;
        if (isMongoConnected) {
            try {
                const doc = await Order.create(orderData);
                savedOrder = doc.toJSON ? doc.toJSON() : doc;
            } catch (mongoErr) {
                console.error("Mongo order create error:", mongoErr);
            }
        }

        // Backup to local orders.json
        try {
            const orders = readJSON(ORDERS_FILE);
            orders.unshift(savedOrder);
            writeJSON(ORDERS_FILE, orders);
        } catch (e) {}

        // Deduct ordered quantities from product stock automatically
        if (Array.isArray(savedOrder.items) && savedOrder.items.length > 0) {
            for (const item of savedOrder.items) {
                const qty = Math.max(1, parseInt(item.qty, 10) || 1);
                if (isMongoConnected) {
                    try {
                        const prod = await Product.findOne({ id: String(item.id) });
                        if (prod) {
                            prod.stock = Math.max(0, (parseInt(prod.stock !== undefined ? prod.stock : 10, 10) || 0) - qty);
                            await prod.save();
                        }
                    } catch (stockErr) {
                        console.error("Stock deduction error in Mongo:", stockErr);
                    }
                }
            }
            const currentProducts = await getProducts();
            await saveProducts(currentProducts);
        }

        res.json({
            success: true,
            ok: true,
            orderId: savedOrder.id,
            order: savedOrder
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to place order"
        });
    }
});

/* =========================
   ADMIN PRODUCTS
========================= */

app.get("/api/admin/products", adminAuth, async (req, res) => {
    try {
        const products = await getProducts();
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to fetch products" });
    }
});

app.post(
    "/api/admin/products",
    adminAuth,
    upload.fields([
        {
            name: "images",
            maxCount: 10
        },
        {
            name: "image",
            maxCount: 1
        }
    ]),
    async (req, res) => {
        try {
            const products = getProducts();

            let uploadedFiles = [];

            if (req.files && req.files.images) {
                uploadedFiles = uploadedFiles.concat(req.files.images);
            }

            if (req.files && req.files.image) {
                uploadedFiles = uploadedFiles.concat(req.files.image);
            }

            const images = uploadedFiles.map(
                file => "/uploads/" + file.filename
            );

            let sizes = [];
            if (req.body.sizes) {
                if (Array.isArray(req.body.sizes)) {
                    sizes = req.body.sizes;
                } else if (typeof req.body.sizes === "string") {
                    try {
                        const parsed = JSON.parse(req.body.sizes);
                        sizes = Array.isArray(parsed) ? parsed : req.body.sizes.split(",").map(s => s.trim()).filter(Boolean);
                    } catch (e) {
                        sizes = req.body.sizes.split(",").map(s => s.trim()).filter(Boolean);
                    }
                }
            }

            const stock = req.body.stock !== undefined && req.body.stock !== ""
                ? Math.max(0, parseInt(req.body.stock, 10) || 0)
                : 10;

            const product = {
                id: Date.now().toString(),
                name: req.body.name || "",
                category: req.body.category || "",
                price: Number(req.body.price || 0),
                oldPrice: Number(req.body.oldPrice || req.body.comparePrice || 0),
                description: req.body.description || "",
                image: images[0] || "",
                images: images,
                sizes: sizes,
                stock: stock,
                pinned:
                    req.body.pinned === "true" ||
                    req.body.pinned === true ||
                    req.body.featured === "true" ||
                    req.body.featured === "on",
                featured:
                    req.body.featured === "true" ||
                    req.body.featured === "on" ||
                    req.body.pinned === "true" ||
                    req.body.pinned === true,
                hidden: false,
                createdAt: new Date().toISOString()
            };

            if (isMongoConnected) {
                try {
                    await Product.create(product);
                } catch (mongoErr) {
                    console.error("Mongo product create error:", mongoErr);
                }
            }

            const localProducts = readJSON(PRODUCTS_FILE);
            localProducts.push(product);
            writeJSON(PRODUCTS_FILE, localProducts);

            res.json({
                success: true,
                product: normalize(product)
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to create product"
            });
        }
    }
);

/* =========================
   ADD MORE PHOTOS
========================= */

app.post(
    "/api/admin/products/:id/images",
    adminAuth,
    upload.array("images", 10),
    async (req, res) => {
        try {
            const newImages = (req.files || []).map(
                file => "/uploads/" + file.filename
            );

            let product = null;
            if (isMongoConnected) {
                product = await Product.findOne({ id: String(req.params.id) });
                if (product) {
                    if (!Array.isArray(product.images)) {
                        product.images = product.image ? [product.image] : [];
                    }
                    product.images.push(...newImages);
                    if (!product.image && product.images.length > 0) {
                        product.image = product.images[0];
                    }
                    await product.save();
                }
            }

            const localProducts = readJSON(PRODUCTS_FILE);
            const localProd = localProducts.find(p => String(p.id) === String(req.params.id));
            if (localProd) {
                if (!Array.isArray(localProd.images)) {
                    localProd.images = localProd.image ? [localProd.image] : [];
                }
                localProd.images.push(...newImages);
                if (!localProd.image && localProd.images.length > 0) {
                    localProd.image = localProd.images[0];
                }
                writeJSON(PRODUCTS_FILE, localProducts);
            }

            if (!product && !localProd) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            res.json({
                success: true,
                product: normalize(product ? (product.toJSON ? product.toJSON() : product) : localProd)
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to add photos"
            });
        }
    }
);

/* =========================
   FEATURE / UNFEATURE
========================= */

app.post(
    "/api/admin/products/:id/feature",
    adminAuth,
    async (req, res) => {
        try {
            let product = null;
            if (isMongoConnected) {
                product = await Product.findOne({ id: String(req.params.id) });
                if (product) {
                    product.featured = !product.featured;
                    product.pinned = product.featured;
                    await product.save();
                }
            }

            const localProducts = readJSON(PRODUCTS_FILE);
            const localProd = localProducts.find(p => String(p.id) === String(req.params.id));
            if (localProd) {
                localProd.featured = !localProd.featured;
                localProd.pinned = localProd.featured;
                writeJSON(PRODUCTS_FILE, localProducts);
            }

            if (!product && !localProd) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            res.json({
                success: true,
                product: normalize(product ? (product.toJSON ? product.toJSON() : product) : localProd)
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, error: "Failed to feature product" });
        }
    }
);

/* =========================
   HIDE / SHOW
========================= */

app.post(
    "/api/admin/products/:id/toggle-hidden",
    adminAuth,
    async (req, res) => {
        try {
            let product = null;
            if (isMongoConnected) {
                product = await Product.findOne({ id: String(req.params.id) });
                if (product) {
                    product.hidden = !product.hidden;
                    await product.save();
                }
            }

            const localProducts = readJSON(PRODUCTS_FILE);
            const localProd = localProducts.find(p => String(p.id) === String(req.params.id));
            if (localProd) {
                localProd.hidden = !localProd.hidden;
                writeJSON(PRODUCTS_FILE, localProducts);
            }

            if (!product && !localProd) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            res.json({
                success: true,
                product: normalize(product ? (product.toJSON ? product.toJSON() : product) : localProd)
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, error: "Failed to toggle hidden" });
        }
    }
);

/* =========================
   DELETE PRODUCT
========================= */

app.delete(
    "/api/admin/products/:id",
    adminAuth,
    async (req, res) => {
        try {
            if (isMongoConnected) {
                await Product.findOneAndDelete({ id: String(req.params.id) });
            }

            const localProducts = readJSON(PRODUCTS_FILE);
            const index = localProducts.findIndex(
                p => String(p.id) === String(req.params.id)
            );

            if (index !== -1) {
                localProducts.splice(index, 1);
                writeJSON(PRODUCTS_FILE, localProducts);
            }

            res.json({
                success: true
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, error: "Failed to delete product" });
        }
    }
);

/* =========================
   UPDATE PRODUCT
========================= */

app.put(
    "/api/admin/products/:id",
    adminAuth,
    async (req, res) => {
        try {
            const updates = {};
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.category !== undefined) updates.category = req.body.category;
            if (req.body.price !== undefined) updates.price = Number(req.body.price || 0);
            if (req.body.comparePrice !== undefined) updates.oldPrice = Number(req.body.comparePrice || 0);
            if (req.body.oldPrice !== undefined) updates.oldPrice = Number(req.body.oldPrice || 0);
            if (req.body.description !== undefined) updates.description = req.body.description;
            if (req.body.pinned !== undefined) {
                updates.pinned = Boolean(req.body.pinned);
                updates.featured = Boolean(req.body.pinned);
            }
            if (req.body.featured !== undefined) updates.featured = Boolean(req.body.featured);
            if (req.body.stock !== undefined) {
                updates.stock = Math.max(0, parseInt(req.body.stock, 10) || 0);
            }

            let updatedProduct = null;
            if (isMongoConnected) {
                updatedProduct = await Product.findOneAndUpdate(
                    { id: String(req.params.id) },
                    { $set: updates },
                    { new: true }
                ).lean();
            }

            const localProducts = readJSON(PRODUCTS_FILE);
            const product = localProducts.find(
                p => String(p.id) === String(req.params.id)
            );
            if (product) {
                Object.assign(product, updates);
                writeJSON(PRODUCTS_FILE, localProducts);
                if (!updatedProduct) updatedProduct = product;
            }

            if (!updatedProduct) {
                return res.status(404).json({
                    success: false,
                    error: "Product not found"
                });
            }

            res.json({
                success: true,
                product: normalize(updatedProduct)
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                error: "Unable to update product"
            });
        }
    }
);

/* =========================
   QUICK STOCK UPDATE
========================= */

app.post(
    "/api/admin/products/:id/stock",
    adminAuth,
    async (req, res) => {
        try {
            const newStock = Math.max(0, parseInt(req.body.stock, 10) || 0);

            let updatedProduct = null;
            if (isMongoConnected) {
                updatedProduct = await Product.findOneAndUpdate(
                    { id: String(req.params.id) },
                    { $set: { stock: newStock } },
                    { new: true }
                ).lean();
            }

            const localProducts = readJSON(PRODUCTS_FILE);
            const product = localProducts.find(
                p => String(p.id) === String(req.params.id)
            );

            if (product) {
                product.stock = newStock;
                writeJSON(PRODUCTS_FILE, localProducts);
                if (!updatedProduct) updatedProduct = product;
            }

            if (!updatedProduct) {
                return res.status(404).json({
                    success: false,
                    error: "Product not found"
                });
            }

            res.json({
                success: true,
                stock: updatedProduct.stock,
                product: normalize(updatedProduct)
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                error: "Unable to update stock"
            });
        }
    }
);

/* =========================
   ADMIN ORDERS
========================= */

app.get("/api/admin/orders", adminAuth, async (req, res) => {
    try {
        const orders = await getOrders();
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
});

app.post(
    "/api/admin/orders/:id/status",
    adminAuth,
    async (req, res) => {
        try {
            const newStatus = req.body.status;
            let updatedOrder = null;
            if (isMongoConnected) {
                updatedOrder = await Order.findOneAndUpdate(
                    { id: String(req.params.id) },
                    { $set: { status: newStatus } },
                    { new: true }
                ).lean();
            }

            const localOrders = readJSON(ORDERS_FILE);
            const order = localOrders.find(
                o => String(o.id) === String(req.params.id)
            );

            if (order) {
                if (newStatus) order.status = newStatus;
                writeJSON(ORDERS_FILE, localOrders);
                if (!updatedOrder) updatedOrder = order;
            }

            if (!updatedOrder) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            res.json({
                success: true,
                order: updatedOrder
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, error: "Failed to update order status" });
        }
    }
);

app.put(
    "/api/admin/orders/:id",
    adminAuth,
    async (req, res) => {
        try {
            const newStatus = req.body.status;
            let updatedOrder = null;
            if (isMongoConnected) {
                updatedOrder = await Order.findOneAndUpdate(
                    { id: String(req.params.id) },
                    { $set: { status: newStatus } },
                    { new: true }
                ).lean();
            }

            const localOrders = readJSON(ORDERS_FILE);
            const order = localOrders.find(
                o => String(o.id) === String(req.params.id)
            );

            if (order) {
                if (newStatus) order.status = newStatus;
                writeJSON(ORDERS_FILE, localOrders);
                if (!updatedOrder) updatedOrder = order;
            }

            if (!updatedOrder) {
                return res.status(404).json({
                    success: false,
                    error: "Order not found"
                });
            }

            res.json({
                success: true,
                order: updatedOrder
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, error: "Failed to update order" });
        }
    }
);

/* =========================
   PAGES
========================= */

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

app.get("/admin", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "admin", "index.html")
    );
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, '0.0.0.0', () => {
    console.log("");
    console.log("======================================");
    console.log("   THE ROYAL FASHION (RUNNING)");
    console.log("======================================");
    console.log("Computer (Local): http://localhost:" + PORT);
    console.log("Mobile (Same Wi-Fi): http://10.42.168.87:" + PORT);
    console.log("Admin Dashboard:  http://localhost:" + PORT + "/admin");
    console.log("======================================");
});