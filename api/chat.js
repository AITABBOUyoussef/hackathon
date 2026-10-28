import plantes from '../src/data/plantes.json' with { type: 'json' };

const disclaimer = 'Information à caractère informatif, pas un conseil médical.';
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function localAnswer(question) {
  const normalizedQuestion = normalize(question);
  const province = plantes
    .flatMap((plant) => plant.provinces)
    .find((item) => normalizedQuestion.includes(normalize(item)));

  if (province && /(plante|pousse|trouve|existe|quoi|quelles)/i.test(normalizedQuestion)) {
    const matches = plantes.filter((plant) => plant.provinces.includes(province));
    return {
      reponse: `Dans la province de ${province}, le guide Nabta référence : ${matches.map((plant) => plant.nom_ar).join(', ')}. ${disclaimer}`,
      plante_id: null
    };
  }

  const plant = plantes.find((item) => normalizedQuestion.includes(normalize(item.nom_latin)) || normalizedQuestion.includes(item.nom_ar));
  if (plant) {
    return {
      reponse: `${plant.nom_ar} (${plant.nom_latin}) est référencée pour : ${plant.usages.join(', ')}. ${disclaimer}`,
      plante_id: plant.id
    };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const question = req.body?.question;
  if (!question || typeof question !== 'string') return res.status(400).json({ error: 'Une question est requise' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'La clé GEMINI_API_KEY est absente' });
  const catalogAnswer = localAnswer(question);
  if (catalogAnswer) return res.status(200).json(catalogAnswer);

  const system = `Tu es l'assistant de Nabta. Réponds uniquement à partir du contenu JSON suivant, sans inventer :
${JSON.stringify(plantes)}

Règles : réponds dans la langue de l'utilisateur (français, arabe ou darija). Si l'information n'existe pas, dis-le clairement. Si une plante est concernée, ajoute son id. Ajoute exactement cette mention : "Information à caractère informatif, pas un conseil médical." Réponds uniquement en JSON valide, sous la forme {"reponse":"texte","plante_id":3 ou null}.`;

  const models = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];
  let lastError = 'Gemini n’a pas renvoyé de réponse';

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: {
            maxOutputTokens: 500,
            responseMimeType: 'application/json'
          }
        })
      });

      const payload = await response.json();
      if (response.ok) {
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          try {
            const cleaned = text.replace(/^```json\s*|\s*```$/gi, '').trim();
            const answer = JSON.parse(cleaned);
            if (typeof answer.reponse === 'string' && (answer.plante_id === null || Number.isInteger(answer.plante_id))) {
              return res.status(200).json({ reponse: answer.reponse, plante_id: answer.plante_id });
            }
          } catch {
            lastError = "Gemini n'a pas renvoyé un JSON valide";
          }
        }
        if (!text) lastError = "Gemini n'a pas renvoyé de réponse valide";
      } else {
        lastError = payload.error?.message || `Erreur avec ${model}`;
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) break;
      }
    } catch (error) {
      lastError = error.name === 'AbortError' ? `Le modèle ${model} a dépassé le délai` : error.message;
    } finally {
      clearTimeout(timeout);
    }
  }

  return res.status(502).json({ error: `Erreur Gemini : ${lastError}` });
}
