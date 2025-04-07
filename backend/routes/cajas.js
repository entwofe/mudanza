const fs = require('fs');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const connection = require('../db/connection');

// Nueva ubicación de uploads
const uploadsFolder = path.join(__dirname, '..', '..', 'public', 'uploads');

// Crear carpeta 'uploads' si no existe
if (!fs.existsSync(uploadsFolder)) {
    fs.mkdirSync(uploadsFolder, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsFolder);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .substring(0, 20);
        const timestamp = Date.now();
        cb(null, `${baseName}_${timestamp}${ext}`);
    }
});

const upload = multer({ storage });

// Función para borrar foto
function borrarFoto(pathFoto) {
    if (pathFoto) {
        const fotoCompleta = path.join(__dirname, '..', '..', 'public', pathFoto.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(fotoCompleta)) {
            fs.unlink(fotoCompleta, (err) => {
                if (err) {
                    console.warn('No se pudo eliminar la foto:', err.message);
                } else {
                    console.log('Foto eliminada correctamente.');
                }
            });
        } else {
            console.log('Foto no encontrada para eliminar.');
        }
    }
}

// Listar cajas
router.get('/', (req, res) => {
    connection.query('SELECT * FROM cajas', (error, results) => {
        if (error) {
            console.error('Error obteniendo cajas:', error);
            res.status(500).json({ error: 'Error al obtener cajas' });
        } else {
            res.json(results);
        }
    });
});

// Crear caja
router.post('/', upload.single('foto'), (req, res) => {
    const { numero_caja, nombre, categoria, ubicacion, contenido, prioridad } = req.body;
    const fragil = req.body.fragil === '1' ? 1 : 0;
    const pesado = req.body.pesado === '1' ? 1 : 0;
    const foto = req.file ? `/uploads/${req.file.filename}` : '';

    const nuevaCaja = { numero_caja, nombre, categoria, ubicacion, contenido, prioridad, fragil, pesado, foto };

    connection.query('INSERT INTO cajas SET ?', nuevaCaja, (error, result) => {
        if (error) {
            console.error('Error insertando caja:', error);
            res.status(500).json({ error: 'Error insertando caja' });
        } else {
            res.status(201).json({ message: 'Caja creada correctamente', id: result.insertId });
        }
    });
});

// Eliminar caja
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    connection.query('SELECT foto FROM cajas WHERE id = ?', [id], (error, results) => {
        if (error) {
            console.error('Error buscando caja:', error);
            return res.status(500).json({ error: 'Error buscando caja' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Caja no encontrada' });
        }

        borrarFoto(results[0].foto);

        connection.query('DELETE FROM cajas WHERE id = ?', [id], (error) => {
            if (error) {
                console.error('Error eliminando caja:', error);
                res.status(500).json({ error: 'Error eliminando caja' });
            } else {
                res.json({ message: 'Caja y foto eliminadas correctamente' });
            }
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
        actualizarCaja.foto = `/uploads/${req.file.filename}`;

        connection.query('SELECT foto FROM cajas WHERE id = ?', [id], (error, results) => {
            if (error) {
                console.error('Error buscando foto anterior:', error);
                return res.status(500).json({ error: 'Error buscando foto anterior' });
            }

            if (results.length > 0) {
                borrarFoto(results[0].foto);
            }

            connection.query('UPDATE cajas SET ? WHERE id = ?', [actualizarCaja, id], (error) => {
                if (error) {
                    console.error('Error actualizando caja:', error);
                    res.status(500).json({ error: 'Error actualizando caja' });
                } else {
                    res.json({ message: 'Caja actualizada correctamente (foto reemplazada).' });
                }
            });
        });

    } else {
        connection.query('UPDATE cajas SET ? WHERE id = ?', [actualizarCaja, id], (error) => {
            if (error) {
                console.error('Error actualizando caja:', error);
                res.status(500).json({ error: 'Error actualizando caja' });
            } else {
                res.json({ message: 'Caja actualizada correctamente.' });
            }
        });
    }
});

module.exports = router;
