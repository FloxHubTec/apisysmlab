const express = require('express');
const router = express.Router();
const AmostraController = require('../controllers/AmostraController');

// =================================================================
// ROTAS AUXILIARES (Dropdowns)
// Devem ser declaradas ANTES das rotas com :id
// =================================================================

/**
 * @route GET /amostras/matrizes
 * @description Busca lista de matrizes para o select
 */
router.get('/matrizes', AmostraController.getMatrizes);

/**
 * @route GET /amostras/usuarios
 * @description Busca lista de usuários para o select
 */
router.get('/usuarios', AmostraController.getUsuarios);


// =================================================================
// CRUD PRINCIPAL
// =================================================================

/**
 * @route GET /amostras
 * @description Lista todas as amostras
 */
router.get('/', AmostraController.findAll);

/**
 * @route POST /amostras
 * @description Cria uma nova amostra (com array de parâmetros)
 */
router.post('/', AmostraController.create);

/**
 * @route GET /amostras/:id
 * @description Busca detalhes de uma amostra específica
 */
router.get('/:id', AmostraController.findById);

/**
 * @route PUT /amostras/:id
 * @description Atualiza uma amostra
 */
router.put('/:id', AmostraController.update);

/**
 * @route DELETE /amostras/:id
 * @description Exclui uma amostra
 */
router.delete('/:id', AmostraController.delete);



module.exports = router;