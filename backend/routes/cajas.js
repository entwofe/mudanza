// backend/routes/cajas.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');
const connection = require('../db/connection');

// Configurar almacenamiento Multer con Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'mudanza',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 800, height: 600, crop: 'limit' }]
    }
});
const upload = multer({ storage });

// Función para borrar imagen de Cloudinary
async function borrarFotoCloudinary(urlFoto) {
    if (!urlFoto) return;

    try {
        const partes = urlFoto.split('/');
        const nombreCompleto = partes.pop();
        const publicId = `mudanza/${nombreCompleto.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
        console.log('✅ Imagen eliminada de Cloudinary');
    } catch (error) {
        console.error('❌ Error eliminando imagen de Cloudinary:', error.message);
    }
}

// -----------------------------
// RUTAS API
// -----------------------------

// Listar cajas
router.get('/', async (req, res) => {
    try {
        const [results] = await connection.query('SELECT * FROM cajas');
        res.json(results);
    } catch (error) {
        console.error('❌ Error obteniendo cajas:', error);
        res.status(500).json({ error: 'Error al obtener cajas' });
    }
});

// Crear nueva caja
router.post('/', upload.single('foto'), async (req, res) => {
    const { numero_caja, nombre, categoria, ubicacion, contenido, prioridad } = req.body;
    const fragil = req.body.fragil === '1' ? 1 : 0;
    const pesado = req.body.pesado === '1' ? 1 : 0;
    const foto = req.file ? req.file.path : '';

    const nuevaCaja = { numero_caja, nombre, categoria, ubicacion, contenido, prioridad, fragil, pesado, foto };

    try {
        const [result] = await connection.query('INSERT INTO cajas SET ?', nuevaCaja);
        res.status(201).json({ message: '📦 Caja creada correctamente', id: result.insertId });
    } catch (error) {
        console.error('❌ Error insertando caja:', error);
        res.status(500).json({ error: 'Error insertando caja' });
    }
});

// Eliminar caja
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [results] = await connection.query('SELECT foto FROM cajas WHERE id = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }

        await borrarFotoCloudinary(results[0].foto);
        await connection.query('DELETE FROM cajas WHERE id = ?', [id]);
        res.json({ message: '✅ Caja y foto eliminadas correctamente' });
    } catch (error) {
        console.error('❌ Error eliminando caja:', error);
        res.status(500).json({ error: 'Error eliminando caja' });
    }
});

// Actualizar caja
router.put('/:id', upload.single('foto'), async (req, res) => {
    const { id } = req.params;
    const { numero_caja, nombre, categoria, ubicacion, contenido, prioridad } = req.body;
    const fragil = req.body.fragil === '1' ? 1 : 0;
    const pesado = req.body.pesado === '1' ? 1 : 0;

    const actualizarCaja = { numero_caja, nombre, categoria, ubicacion, contenido, prioridad, fragil, pesado };

    try {
        if (req.file) {
            actualizarCaja.foto = req.file.path;

            const [results] = await connection.query('SELECT foto FROM cajas WHERE id = ?', [id]);
            if (results.length > 0) {
                await borrarFotoCloudinary(results[0].foto);
            }
        }

        await connection.query('UPDATE cajas SET ? WHERE id = ?', [actualizarCaja, id]);
        res.json({ message: req.file ? '✅ Caja actualizada y foto reemplazada' : '✅ Caja actualizada correctamente' });
    } catch (error) {
        console.error('❌ Error actualizando caja:', error);
        res.status(500).json({ error: 'Error actualizando caja' });
    }
});

module.exports = router;