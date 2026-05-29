import { created } from '../../utils/http.js';
import { asInt, asString, optionalString, requireObject } from '../../utils/validation.js';

export default async function translationRoutes(app) {
  app.get('/getWordforms', async (request) => request.server.db.query('SELECT * FROM translation_word_forms ORDER BY label ASC'));
  app.get('/getArticles', async (request) => request.server.db.query('SELECT * FROM translation_articles ORDER BY title ASC'));
  app.get('/getOccurencesForArticle/:id', async (request) => request.server.db.query('SELECT * FROM translation_occurrences WHERE article_id = :id ORDER BY position ASC', { id: asInt(request.params.id) }));
  app.get('/getMeaningsFor/:id', async (request) => request.server.db.query('SELECT * FROM translation_meanings WHERE word_form_id = :id ORDER BY label ASC', { id: asInt(request.params.id) }));
  app.get('/getMp3Files/:withcustom', async (request) => request.server.db.query('SELECT * FROM translation_audio WHERE (:withCustom = 1 OR custom = 0) ORDER BY filename ASC', { withCustom: request.params.withcustom === '1' ? 1 : 0 }));
  app.get('/insertCustomMp3/:id', async (request) => {
    await request.server.db.query('UPDATE translation_audio SET custom = 1 WHERE id = :id', { id: asInt(request.params.id) });
    return { updated: true };
  });
  app.get('/getSelectedIdsForOccurrence/:id', async (request) => request.server.db.query('SELECT meaning_id FROM translation_occurrence_meanings WHERE occurrence_id = :id', { id: asInt(request.params.id) }));

  app.post('/createWordForm', async (request, reply) => {
    const body = requireObject(request.body);
    const id = await request.server.db.insert('INSERT INTO translation_word_forms (label, language, metadata_json) VALUES (:label, :language, :metadata)', {
      label: asString(body.label ?? body.wordform ?? body.wordForm, 'label'),
      language: optionalString(body.language, 'language', 10) || 'lb',
      metadata: JSON.stringify(body.metadata ?? {})
    });
    return created(reply, { id });
  });

  app.post('/getOccurences', async (request) => {
    const body = request.body || {};
    const articleId = body.articleid ?? body.articleId;
    return request.server.db.query('SELECT * FROM translation_occurrences WHERE (:articleId IS NULL OR article_id = :articleId) ORDER BY article_id ASC, position ASC', { articleId: articleId ? asInt(articleId, 'articleId') : null });
  });

  app.post('/getArticleFor', async (request) => {
    const body = requireObject(request.body);
    return request.server.db.one('SELECT * FROM translation_articles WHERE id = :id', { id: asInt(body.id ?? body.articleid ?? body.articleId, 'id') });
  });

  app.post('/getOccurenceForKonterbont', async (request) => {
    const articleId = asInt(request.query.articleid ?? request.body?.articleid ?? request.body?.articleId, 'articleid');
    return request.server.db.query('SELECT * FROM translation_occurrences WHERE article_id = :articleId AND source = "konterbont" ORDER BY position ASC', { articleId });
  });

  app.post('/fillOccurencesWithData', async (request) => ({
    updated: 0,
    note: 'Placeholder kept for compatibility. Extend src/modules/translation for automatic occurrence enrichment.'
  }));

  app.post('/UpdateAudioForMeaning', async (request) => {
    const body = requireObject(request.body);
    await request.server.db.query('UPDATE translation_meanings SET audio_id = :audioId WHERE id = :id', { id: asInt(body.id, 'id'), audioId: asInt(body.audioId ?? body.audio_id, 'audioId') });
    return { updated: true };
  });

  app.put('/setOccurenceMeaningFor', async (request) => {
    const body = requireObject(request.body);
    const occurrenceId = asInt(body.occurrenceId ?? body.occurrence_id ?? body.idOccurrence, 'occurrenceId');
    const meaningId = asInt(body.meaningId ?? body.meaning_id ?? body.idMeaning, 'meaningId');
    await request.server.db.query(
      'INSERT IGNORE INTO translation_occurrence_meanings (occurrence_id, meaning_id) VALUES (:occurrenceId, :meaningId)',
      { occurrenceId, meaningId }
    );
    return { updated: true };
  });
}
