// models/DashboardWebModel.js
const pool = require('../config/database');

class DashboardWebModel {

  static async getDashboardData(filtros = {}) {
    try {
      const { matriz_id, legislacao_id } = filtros; // AGORA É filtros, não req.query

      console.log('📊 Model - Filtros recebidos:', { matriz_id, legislacao_id });

      const params = [];
      let whereClause = '';
      let paramIndex = 1;

      // Filtros de Matriz e Legislação - CORRIGIDO
      if (matriz_id && matriz_id !== 'null' && matriz_id !== 'undefined' && Number(matriz_id) > 0) {
        whereClause += ` AND p.matriz_id = $${paramIndex}`;
        params.push(Number(matriz_id));
        paramIndex++;
      }

      if (legislacao_id && legislacao_id !== 'null' && legislacao_id !== 'undefined' && Number(legislacao_id) > 0) {
        whereClause += ` AND p.legislacao_id = $${paramIndex}`;
        params.push(Number(legislacao_id));
        paramIndex++;
      }

      const query = `
        SELECT 
        p.id,
        p.nome,
        p.unidade_medida,
        p.valor_parametro,
        p.limite_minimo,
        p.limite_maximo,
        p.created_at,
        
        -- IDs das relações
        p.matriz_id,
        p.legislacao_id,
        
        -- Nomes
        m.nome as matriz_nome,
        l.sigla as legislacao_sigla,
        l.nome as legislacao_nome

        FROM parametro p
        INNER JOIN matriz m ON p.matriz_id = m.id
        INNER JOIN legislacao l ON p.legislacao_id = l.id
        
        WHERE p.valor_parametro IS NOT NULL 
          AND p.limite_minimo IS NOT NULL 
          AND p.limite_maximo IS NOT NULL
          ${whereClause}
        
        ORDER BY p.nome ASC
      `;

      console.log('📊 Model - Query:', query);
      console.log('📊 Model - Parâmetros:', params);

      const result = await pool.query(query, params);

      console.log('✅ Model - Resultados:', result.rows.length, 'registros');
      if (result.rows.length > 0) {
        console.log('📋 Model - Primeiro registro:', result.rows[0]);
      }

      return result.rows;

    } catch (error) {
      console.error('❌ Erro no DashboardWebModel:', error);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }
}

module.exports = DashboardWebModel;