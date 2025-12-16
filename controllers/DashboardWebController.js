// controllers/DashboardWebController.js
const DashboardWebModel = require('../models/DashboardWebModel');
const pool = require('../config/database'); // ADICIONE ESTA LINHA!

/**
 * Helper para converter valores para número
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  if (typeof value === 'string') {
    const cleaned = value.trim().replace(',', '.');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Calcula a porcentagem da barra de progresso
 */
function calcularPorcentagem(valor, limiteMinimo, limiteMaximo) {
  if (valor === undefined || limiteMinimo === undefined || limiteMaximo === undefined) {
    return 0;
  }

  const valorNum = parseNumber(valor);
  const minNum = parseNumber(limiteMinimo);
  const maxNum = parseNumber(limiteMaximo);

  if (minNum === maxNum || isNaN(valorNum) || isNaN(minNum) || isNaN(maxNum)) {
    return 0;
  }

  let porcentagem = ((valorNum - minNum) / (maxNum - minNum)) * 100;
  porcentagem = Math.max(0, Math.min(100, porcentagem));
  return Math.round(porcentagem * 10) / 10;
}

/**
 * Determina status baseado no valor e limites
 */
function determinarStatus(valor, limiteMinimo, limiteMaximo, porcentagem) {
  const valorNum = parseNumber(valor);
  const minNum = parseNumber(limiteMinimo);
  const maxNum = parseNumber(limiteMaximo);

  if (isNaN(valorNum) || isNaN(minNum) || isNaN(maxNum)) {
    return 'nao-conforme';
  }

  if (valorNum < minNum || valorNum > maxNum) {
    return 'nao-conforme';
  }

  const percent = porcentagem !== undefined ? porcentagem : calcularPorcentagem(valorNum, minNum, maxNum);

  if (percent >= 30 && percent <= 70) {
    return 'conforme';
  } else if ((percent >= 20 && percent < 30) || (percent > 70 && percent <= 80)) {
    return 'alerta';
  } else {
    return 'critico';
  }
}

/**
 * Controlador para a API do Dashboard Web
 */
const DashboardWebController = {

  /**
   * Obtém dados do dashboard com filtros
   */
  async getDashboardData(req, res) {
    try {
      console.log('📡 Dashboard Web - Iniciando processamento');
      console.log('📡 Query recebida:', req.query);

      // Obtém e trata os parâmetros da query
      let { matriz_id, legislacao_id } = req.query;

      console.log('📡 Parâmetros recebidos:', {
        matriz_id,
        tipo_matriz_id: typeof matriz_id,
        legislacao_id,
        tipo_legislacao_id: typeof legislacao_id
      });

      // Converte para números se existirem
      if (matriz_id && matriz_id !== 'null' && matriz_id !== 'undefined') {
        matriz_id = parseNumber(matriz_id);
      } else {
        matriz_id = null;
      }

      if (legislacao_id && legislacao_id !== 'null' && legislacao_id !== 'undefined') {
        legislacao_id = parseNumber(legislacao_id);
      } else {
        legislacao_id = null;
      }

      const filtros = {
        matriz_id: matriz_id,
        legislacao_id: legislacao_id
      };

      console.log('📡 Filtros processados:', filtros);

      // Busca dados do modelo
      const dados = await DashboardWebModel.getDashboardData(filtros);

      console.log('✅ Dashboard Web - Dados retornados do modelo:', dados?.length || 0);

      // Se não tiver dados, retorna array vazio
      if (!dados || dados.length === 0) {
        console.log('⚠️ Nenhum dado encontrado no banco');
        return res.json({
          success: true,
          data: [],
          statistics: {
            compliant_count: 0,
            alert_count: 0,
            critical_count: 0,
            non_compliant_count: 0,
            total_parameters: 0
          },
          last_updated: new Date().toISOString(),
          filters_applied: filtros,
          message: 'Nenhum parâmetro encontrado com os filtros aplicados'
        });
      }

      // Processa os dados
      const dadosProcessados = dados.map((item, index) => {
        try {
          const valorParametro = parseNumber(item.valor_parametro);
          const limiteMinimo = parseNumber(item.limite_minimo);
          const limiteMaximo = parseNumber(item.limite_maximo);

          const porcentagem = calcularPorcentagem(
            valorParametro,
            limiteMinimo,
            limiteMaximo
          );

          const status = determinarStatus(
            valorParametro,
            limiteMinimo,
            limiteMaximo,
            porcentagem
          );

          return {
            id: item.id || index + 1,
            parameter_name: item.nome || `Parâmetro ${index + 1}`,
            unidade_medida: item.unidade_medida || '',
            current_value: valorParametro,
            valor_parametro: valorParametro,
            limite_minimo: limiteMinimo,
            limite_maximo: limiteMaximo,
            porcentagem: porcentagem,
            status: status,
            last_update: item.created_at || new Date().toISOString(),
            matriz_nome: item.matriz_nome || '',
            legislacao_sigla: item.legislacao_sigla || '',
            legislacao_nome: item.legislacao_nome || '',
            matriz_id: item.matriz_id || null,
            legislacao_id: item.legislacao_id || null
          };

        } catch (itemError) {
          console.error(`❌ Erro ao processar item ${index + 1}:`, itemError);

          return {
            id: index + 1,
            parameter_name: 'Parâmetro com erro',
            unidade_medida: '',
            current_value: 0,
            valor_parametro: 0,
            limite_minimo: 0,
            limite_maximo: 0,
            porcentagem: 0,
            status: 'nao-conforme',
            last_update: new Date().toISOString()
          };
        }
      });

      // Calcula estatísticas
      const estatisticas = {
        conforme: 0,
        alerta: 0,
        critico: 0,
        'nao-conforme': 0
      };

      dadosProcessados.forEach(item => {
        if (item.status && estatisticas[item.status] !== undefined) {
          estatisticas[item.status]++;
        }
      });

      const response = {
        success: true,
        data: dadosProcessados,
        statistics: {
          compliant_count: estatisticas.conforme,
          alert_count: estatisticas.alerta,
          critical_count: estatisticas.critico,
          non_compliant_count: estatisticas['nao-conforme'],
          total_parameters: dadosProcessados.length
        },
        last_updated: new Date().toISOString(),
        filters_applied: filtros
      };

      console.log('📤 Dashboard Web - Resposta preparada');

      res.json(response);

    } catch (error) {
      console.error('❌ Dashboard Web - Erro:', error.message);
      console.error('❌ Stack trace:', error.stack);

      // Em caso de erro, retorna resposta vazia
      res.status(500).json({
        success: false,
        message: 'Erro interno ao carregar dados',
        error: error.message,
        data: [],
        statistics: {
          compliant_count: 0,
          alert_count: 0,
          critical_count: 0,
          non_compliant_count: 0,
          total_parameters: 0
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  /**
   * Obtém TODAS as opções de filtro (matrizes e legislações)
   */
  async getFilterOptions(req, res) {
    try {
      console.log('📡 Buscando TODAS as opções de filtro');

      // Query para TODAS as matrizes
      const matrizesQuery = 'SELECT id, nome FROM matriz ORDER BY nome';
      const matrizesResult = await pool.query(matrizesQuery);

      // Query para TODAS as legislações
      const legislacoesQuery = `
        SELECT id, nome, sigla 
        FROM legislacao 
        ORDER BY nome
      `;
      const legislacoesResult = await pool.query(legislacoesQuery);

      // Processa legislações para remover duplicação
      const legislacoesProcessadas = legislacoesResult.rows.map(leg => {
        let nomeFormatado = leg.nome || '';
        const sigla = leg.sigla || '';

        // Remove duplicação (ex: "Resolução CONAMA nº 357/2005 (Classes) (CONAMA 357)")
        if (sigla && nomeFormatado && nomeFormatado.includes(`(${sigla})`)) {
          nomeFormatado = nomeFormatado.replace(` (${sigla})`, '').trim();
        }

        return {
          id: leg.id,
          nome: nomeFormatado || sigla,
          sigla: sigla
        };
      });

      console.log('✅ Matrizes encontradas:', matrizesResult.rows.length);
      console.log('✅ Legislações encontradas:', legislacoesResult.rows.length);
      console.log('📋 Matrizes:', matrizesResult.rows);
      console.log('📋 Legislações:', legislacoesProcessadas);

      res.json({
        success: true,
        matrizes: matrizesResult.rows,
        legislacoes: legislacoesProcessadas,
        timestamp: new Date().toISOString(),
        message: `Encontradas ${matrizesResult.rows.length} matrizes e ${legislacoesResult.rows.length} legislações`
      });

    } catch (error) {
      console.error('❌ Erro ao buscar opções de filtro:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar opções de filtro',
        error: error.message,
        matrizes: [],
        legislacoes: []
      });
    }
  }
};

module.exports = DashboardWebController;