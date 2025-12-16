const pool = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class ResultadoAnaliseModel {

  // =================================================================
  // CREATE
  // =================================================================
  static async create(dados) {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const { valor_medido, amostra_id, parametro_id, datacoleta, matriz_id_selecionada, legislacao_id_selecionada } = dados;

      // 1. Valida Existência
      const amostra = await this.verificarAmostraExiste(amostra_id);
      if (!amostra) throw new Error('Amostra não existe');
      const parametro = await this.verificarParametroExiste(parametro_id);
      if (!parametro) throw new Error('Parâmetro não existe');

      // 2. Valida Valor/Data
      const valor = parseFloat(valor_medido);
      if (isNaN(valor) || valor < 0) throw new Error('Valor inválido');
      if (datacoleta && new Date(datacoleta) > new Date()) throw new Error('Data futura');

      // 3. DECISÃO DE NOMES (Manual > Automático)
      let nomeMatrizFinal = amostra.matriz_nome;
      if (matriz_id_selecionada && Number(matriz_id_selecionada) > 0) {
        const res = await client.query('SELECT nome FROM matriz WHERE id = $1', [matriz_id_selecionada]);
        if (res.rowCount > 0) nomeMatrizFinal = res.rows[0].nome;
      }

      let infoLegislacaoFinal = `${parametro.legislacao_nome} (${parametro.legislacao_sigla})`;
      if (legislacao_id_selecionada && Number(legislacao_id_selecionada) > 0) {
        const res = await client.query('SELECT nome, sigla FROM legislacao WHERE id = $1', [legislacao_id_selecionada]);
        if (res.rowCount > 0) infoLegislacaoFinal = `${res.rows[0].nome} (${res.rows[0].sigla})`;
      }

      // 4. Insert
      const datadapublicacao = new Date().toISOString();
      const query = `
        INSERT INTO resultado_analise 
        (valor_medido, amostra_id, parametro_id, datacoleta, datadapublicacao, codigodaamostra, numerodaamostra, matriz, legislacao)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        valor, amostra_id, parametro_id, datacoleta || new Date(), datadapublicacao,
        amostra.codigo_amostra, amostra.numero_da_amostra, nomeMatrizFinal, infoLegislacaoFinal
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');
      await this.logOperation('CREATE', result.rows[0]);
      return result.rows[0];

    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Create Error:', error);
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // =================================================================
  // UPDATE
  // =================================================================
  static async update(id, dados) {
    let client;
    try {
      console.log(`[UPDATE START] ID: ${id}`);
      client = await pool.connect();
      await client.query('BEGIN');

      const { valor_medido, amostra_id, parametro_id, datacoleta, matriz_id_selecionada, legislacao_id_selecionada } = dados;

      // 1. Valida Existência
      const amostra = await this.verificarAmostraExiste(amostra_id);
      if (!amostra) throw new Error('Amostra não existe');
      const parametro = await this.verificarParametroExiste(parametro_id);
      if (!parametro) throw new Error('Parâmetro não existe');

      // 2. Valida Valor/Data
      const valor = parseFloat(valor_medido);
      if (isNaN(valor) || valor < 0) throw new Error('Valor inválido');
      if (new Date(datacoleta) > new Date()) throw new Error('Data futura');

      // 3. DECISÃO DE NOMES (Manual > Automático)
      let nomeMatrizFinal = amostra.matriz_nome;
      if (matriz_id_selecionada && Number(matriz_id_selecionada) > 0) {
        const res = await client.query('SELECT nome FROM matriz WHERE id = $1', [matriz_id_selecionada]);
        if (res.rowCount > 0) nomeMatrizFinal = res.rows[0].nome;
      }

      let infoLegislacaoFinal = `${parametro.legislacao_nome} (${parametro.legislacao_sigla})`;
      if (legislacao_id_selecionada && Number(legislacao_id_selecionada) > 0) {
        const res = await client.query('SELECT nome, sigla FROM legislacao WHERE id = $1', [legislacao_id_selecionada]);
        if (res.rowCount > 0) infoLegislacaoFinal = `${res.rows[0].nome} (${res.rows[0].sigla})`;
      }

      // 4. Update
      const datadapublicacao = new Date().toISOString();
      const query = `
        UPDATE resultado_analise
        SET valor_medido=$1, amostra_id=$2, parametro_id=$3, datacoleta=$4, datadapublicacao=$5,
            codigodaamostra=$6, numerodaamostra=$7, matriz=$8, legislacao=$9
        WHERE id=$10 RETURNING *
      `;
      const values = [
        valor, amostra_id, parametro_id, datacoleta, datadapublicacao,
        amostra.codigo_amostra, amostra.numero_da_amostra, nomeMatrizFinal, infoLegislacaoFinal, id
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');
      await this.logOperation('UPDATE', result.rows[0]);
      return result.rows[0];

    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Update Error:', error);
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // =================================================================
  // FIND ALL (Correção do Modal)
  // =================================================================
  static async findAll() {
    try {
      // Traz as colunas persistidas (ra.matriz) e as relacionais (m.nome) para o frontend decidir
      const query = `
        SELECT 
          ra.*,
          ra.matriz, ra.legislacao, ra.codigodaamostra, ra.numerodaamostra,
          a.codigo_amostra as amostra_codigo_join,
          a.numero_da_amostra as amostra_numero_join,
          m_amostra.nome as matriz_nome,
          p.nome as parametro_nome, p.unidade_medida,
          l.sigla as legislacao_sigla, l.nome as legislacao_nome
        FROM resultado_analise ra
        INNER JOIN amostra a ON ra.amostra_id = a.id
        INNER JOIN matriz m_amostra ON a.matriz_id = m_amostra.id
        INNER JOIN parametro p ON ra.parametro_id = p.id
        INNER JOIN legislacao l ON p.legislacao_id = l.id
        ORDER BY ra.created_at DESC
      `;
      const result = await pool.query(query);
      await this.logOperation('READ_ALL', { count: result.rowCount });
      return result.rows;
    } catch (e) { throw e; }
  }

  // --- MÉTODOS AUXILIARES E LOG (Mantidos) ---
  static async findById(id) { const res = await pool.query('SELECT * FROM resultado_analise WHERE id=$1', [id]); return res.rows[0]; }
  static async delete(id) { 
      const client = await pool.connect();
      try {
          await client.query('BEGIN');
          const res = await client.query('DELETE FROM resultado_analise WHERE id=$1 RETURNING id', [id]);
          await client.query('COMMIT');
          const del = res.rowCount > 0;
          await this.logOperation(del ? 'DELETE' : 'DELETE_NOT_FOUND', { id });
          return del;
      } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  
  static async findAmostras() { const r = await pool.query(`SELECT a.id, a.codigo_amostra, a.numero_da_amostra, m.nome as matriz_nome, m.id as matriz_id FROM amostra a JOIN matriz m ON a.matriz_id = m.id ORDER BY a.codigo_amostra ASC`); return r.rows; }
  static async findParametros() { 
      // IMPORTANTE: Adicionado m.nome as matriz_nome para o alerta visual do front
      const r = await pool.query(`SELECT p.id, p.nome, p.unidade_medida, p.limite_minimo, p.limite_maximo, m.id as matriz_id, m.nome as matriz_nome, l.id as legislacao_id FROM parametro p JOIN matriz m ON p.matriz_id = m.id JOIN legislacao l ON p.legislacao_id = l.id ORDER BY p.nome ASC`); return r.rows; 
  }
  static async findMatrizes() { const r = await pool.query(`SELECT id, nome FROM matriz ORDER BY nome ASC`); return r.rows; }
  static async findLegislacoes() { const r = await pool.query(`SELECT id, nome, sigla FROM legislacao ORDER BY nome ASC`); return r.rows; }

  static async verificarAmostraExiste(id) { const r = await pool.query('SELECT * FROM amostra a JOIN matriz m ON a.matriz_id = m.id WHERE a.id=$1', [id]); return r.rows[0]; }
  static async verificarParametroExiste(id) { const r = await pool.query('SELECT * FROM parametro p JOIN legislacao l ON p.legislacao_id = l.id WHERE p.id=$1', [id]); return r.rows[0]; }

  static async logOperation(op, data) {
    try {
      const logDir = path.join(__dirname, '../logs');
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(path.join(logDir, 'resultado_analise.log'), JSON.stringify({ timestamp: new Date().toISOString(), op, data }) + '\n');
    } catch (e) { console.error('Log error', e); }
  }
}

module.exports = ResultadoAnaliseModel;