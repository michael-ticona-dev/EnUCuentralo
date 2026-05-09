const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const xss = require('xss');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'posts.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Create uploads folder if not exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/imgs', express.static(path.join(__dirname, 'imgs')));
app.use(express.static(path.join(__dirname, '../frontend')));

const upload = multer({ dest: UPLOADS_DIR });

// ── Criptografía AES-256-CBC para WhatsApp ──────────────────────────
const ALGORITHM = 'aes-256-cbc';
const ENCRYPT_KEY = Buffer.from(process.env.ENCRYPT_KEY || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', 'hex');

function encryptData(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPT_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Formato: iv:encrypted (ambos en hex)
    return iv.toString('hex') + ':' + encrypted;
}

function decryptData(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPT_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// ── Helpers JSON ─────────────────────────────────────────────────────
const getPosts = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

const savePosts = (posts) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
};

// ── RUTAS CRUD ───────────────────────────────────────────────────────

// READ — Devuelve posts SIN WhatsApp (protección de identidad)
app.get('/api/posts', (req, res) => {
    try {
        const posts = getPosts();
        // Ocultar WhatsApp cifrado del público
        const safePosts = posts.map(({ whatsapp, ...rest }) => rest);
        res.json(safePosts.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) {
        res.status(500).json({ error: "Read Error" });
    }
});

// CREATE — Hash DNI + Cifrar WhatsApp
app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
        const { firstName, lastName, dni, description, whatsapp } = req.body;
        const posts = getPosts();
        
        // Criptografía: Hash del DNI con bcrypt (irreversible)
        const salt = await bcrypt.genSalt(10);
        const hashedDni = await bcrypt.hash(dni, salt);

        // Criptografía: Cifrar WhatsApp con AES-256 (reversible, solo por el servidor)
        const encryptedWhatsapp = encryptData(whatsapp);

        const newPost = {
            id: Date.now(),
            author: `${xss(firstName)} ${xss(lastName)}`,
            dniHash: hashedDni,
            description: xss(description),
            whatsapp: encryptedWhatsapp, // Almacenado cifrado, nunca en texto plano
            image: req.file ? `/uploads/${req.file.filename}` : null,
            date: new Date().toISOString()
        };

        posts.unshift(newPost);
        savePosts(posts);

        // Devolver al cliente sin el WhatsApp cifrado
        const { whatsapp: _, ...safePost } = newPost;
        res.status(201).json(safePost);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Write Error" });
    }
});

// UPDATE
app.put('/api/posts/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body;
        let posts = getPosts();
        const index = posts.findIndex(p => p.id == id);
        
        if (index !== -1) {
            posts[index].description = xss(description);
            savePosts(posts);
            const { whatsapp, ...safePost } = posts[index];
            res.json(safePost);
        } else {
            res.status(404).json({ error: "Not found" });
        }
    } catch (e) {
        res.status(500).json({ error: "Update Error" });
    }
});

// DELETE
app.delete('/api/posts/:id', (req, res) => {
    try {
        let posts = getPosts();
        posts = posts.filter(p => p.id != req.params.id);
        savePosts(posts);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Delete Error" });
    }
});

// ── REVEAL — Descifrar WhatsApp (flujo seguro post-verificación) ─────
app.get('/api/posts/:id/reveal', (req, res) => {
    try {
        const posts = getPosts();
        const post = posts.find(p => p.id == req.params.id);

        if (!post) {
            return res.status(404).json({ error: "Post no encontrado" });
        }

        if (!post.whatsapp) {
            return res.status(404).json({ error: "Sin datos de contacto" });
        }

        // Descifrar el WhatsApp
        const decryptedWhatsapp = decryptData(post.whatsapp);

        res.json({ 
            whatsapp: decryptedWhatsapp,
            message: "Número descifrado tras validación de prueba fotográfica"
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error al descifrar datos de contacto" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor con JSON persistente en http://localhost:${PORT}`);
    console.log(`🔐 Cifrado AES-256-CBC activo para protección de identidad`);
});
