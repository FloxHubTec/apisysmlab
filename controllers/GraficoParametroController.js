// controllers/GraficoParametrosController.js
const GraficoParametroModel = require('../models/GraficoParametroModel');

class GraficoParametrosController {
  static async index(req, res) {
    try {
      // Chama o método do model ajustado
      const dados = await GraficoParametroModel.getDadosGrafico();
      
      return res.status(200).json({
        success: true,
        data: dados,
        count: dados.length
      });

    } catch (error) {
      console.error('Erro no controller do gráfico:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar dados do gráfico',
        error: error.message
      });
    }
  }
}

module.exports = GraficoParametrosController;