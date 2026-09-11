const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT||3000;

const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const UPLOADS_DIR = path.join(__dirname, "public", "uploads");

const ADMIN_USER = "admin";
const ADMIN_PASS = "change-this-password";

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

    return product;
}

function getProducts() {
    return readJSON(PRODUCTS_FILE).map(normalize);
}

function saveProducts(products) {
    writeJSON(PRODUCTS_FILE, products);
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

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        res.setHeader("WWW-Authenticate", 'Basic realm="The Royal Fashion Admin"');
        return res.status(401).send("Invalid username or password");
    }

    next();
}

/* =========================
   CUSTOMER PRODUCTS
========================= */

app.get("/api/products", (req, res) => {
    const products = getProducts().filter(
        product => product.hidden !== true
    );

    res.json(products);
});

/* =========================
   CUSTOMER ORDER
========================= */

app.post("/api/orders", (req, res) => {
    try {
        const orders = readJSON(ORDERS_FILE);

        const order = {
            id: "ORD-" + Date.now(),
            createdAt: new Date().toISOString(),
            status: "Pending",
            ...req.body
        };

        orders.push(order);

        writeJSON(ORDERS_FILE, orders);

        res.json({
            success: true,
            ok: true,
            orderId: order.id,
            order
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

app.get("/api/admin/products", adminAuth, (req, res) => {
    res.json(getProducts());
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
    (req, res) => {
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
                featured:
                    req.body.featured === "true" ||
                    req.body.featured === "on",
                hidden: false,
                createdAt: new Date().toISOString()
            };

            products.push(product);

            saveProducts(products);

            res.json({
                success: true,
                product
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
    (req, res) => {
        try {
            const products = getProducts();

            const product = products.find(
                p => String(p.id) === String(req.params.id)
            );

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const newImages = (req.files || []).map(
                file => "/uploads/" + file.filename
            );

            if (!Array.isArray(product.images)) {
                product.images = product.image
                    ? [product.image]
                    : [];
            }

            product.images.push(...newImages);

            if (!product.image && product.images.length > 0) {
                product.image = product.images[0];
            }

            saveProducts(products);

            res.json({
                success: true,
                product
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
    (req, res) => {
        const products = getProducts();

        const product = products.find(
            p => String(p.id) === String(req.params.id)
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        product.featured = !product.featured;

        saveProducts(products);

        res.json({
            success: true,
            product
        });
    }
);

/* =========================
   HIDE / SHOW
========================= */

app.post(
    "/api/admin/products/:id/toggle-hidden",
    adminAuth,
    (req, res) => {
        const products = getProducts();

        const product = products.find(
            p => String(p.id) === String(req.params.id)
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        product.hidden = !product.hidden;

        saveProducts(products);

        res.json({
            success: true,
            product
        });
    }
);

/* =========================
   DELETE PRODUCT
========================= */

app.delete(
    "/api/admin/products/:id",
    adminAuth,
    (req, res) => {
        const products = getProducts();

        const index = products.findIndex(
            p => String(p.id) === String(req.params.id)
        );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        products.splice(index, 1);

        saveProducts(products);

        res.json({
            success: true
        });
    }
);

/* =========================
   ADMIN ORDERS
========================= */

app.get("/api/admin/orders", adminAuth, (req, res) => {
    res.json(readJSON(ORDERS_FILE));
});

app.post(
    "/api/admin/orders/:id/status",
    adminAuth,
    (req, res) => {
        const orders = readJSON(ORDERS_FILE);

        const order = orders.find(
            o => String(o.id) === String(req.params.id)
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        order.status = req.body.status || order.status;

        writeJSON(ORDERS_FILE, orders);

        res.json({
            success: true,
            order
        });
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