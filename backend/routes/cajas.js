// backend/routes/cajas.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary'); // usamos nuestro módulo externo
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
        const nombreCompleto = partes[partes.length - 1];
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
router.get('/', (req, res) => {
    connection.query('SELECT * FROM cajas', (error, results) => {
        if (error) {
            console.error('Error obteniendo cajas:', error);
            return res.status(500).json({ error: 'Error al obtener cajas' });
        }
        res.json(results);
    });
});

// Crear nueva caja
router.post('/', upload.single('foto'), (req, res) => {
    const { numero_caja, nombre, categoria, ubicacion, contenido, prioridad } = req.body;
    const fragil = req.body.fragil === '1' ? 1 : 0;
    const pesado = req.body.pesado === '1' ? 1 : 0;
    const foto = req.file ? req.file.path : '';

    const nuevaCaja = { numero_caja, nombre, categoria, ubicacion, contenido, prioridad, fragil, pesado, foto };

    connection.query('INSERT INTO cajas SET ?', nuevaCaja, (error, result) => {
        if (error) {
            console.error('Error insertando caja:', error);
            return res.status(500).json({ error: 'Error insertando caja' });
        }
        res.status(201).json({ message: 'Caja creada correctamente', id: result.insertId });
    });
});

// Eliminar caja
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    connection.query('SELECT foto FROM cajas WHERE id = ?', [id], async (error, results) => {
        if (error) {
            console.error('Error buscando caja:', error);
            return res.status(500).json({ error: 'Error buscando caja' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }

        await borrarFotoCloudinary(results[0].foto);

        connection.query('DELETE FROM cajas WHERE id = ?', [id], (error) => {
            if (error) {
                console.error('Error eliminando caja:', error);
                return res.status(500).json({ error: 'Error eliminando caja' });
            }
            res.json({ message: 'Caja y foto eliminadas correctamente' });
        });
    });
});

// Actualizar caja
router.put('/:id', upload.single('foto'), (req, res) => {
    const { id } = req.params;
    const { numero_caja, nombre, categoria, ubicacion, contenido, prioridad } = req.body;
    const fragil = req.body.fragil === '1' ? 1 : 0;
    const pesado = req.body.pesado === '1' ? 1 : 0;

    const actualizarCaja = { numero_caja, nombre, categoria, ubicacion, contenido, prioridad, fragil, pesado };

    if (req.file) {
        actualizarCaja.foto = req.file.path;

        connection.query('SELECT foto FROM cajas WHERE id = ?', [id], async (error, results) => {
            if (error) {
                console.error('Error buscando foto anterior:', error);
                return res.status(500).json({ error: 'Error buscando foto anterior' });
            }

            if (results.length > 0) {
                await borrarFotoCloudinary(results[0].foto);
            }

            connection.query('UPDATE cajas SET ? WHERE id = ?', [actualizarCaja, id], (error) => {
                if (error) {
                    console.error('Error actualizando caja:', error);
                    return res.status(500).json({ error: 'Error actualizando caja' });
                }
                res.json({ message: 'Caja actualizada correctamente (foto reemplazada).' });
            });
        });

    } else {
        connection.query('UPDATE cajas SET ? WHERE id = ?', [actualizarCaja, id], (error) => {
            if (error) {
                console.error('Error actualizando caja:', error);
                return res.status(500).json({ error: 'Error actualizando caja' });
            }
            res.json({ message: 'Caja actualizada correctamente.' });
        });
    }
});

module.exports = router;
