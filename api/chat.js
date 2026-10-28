import plantes from '../src/data/plantes.json' with { type: 'json' };

const disclaimer = 'Information à caractère informatif, pas un conseil médical.';
const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const plantAliases = {
  4: ['romarin', 'rosemary', 'rosmarinus', 'azir', 'iklil', 'iklil jabal', 'إكليل الجبل', 'الأزير'],
  8: ['caroubier', 'carob', 'khrob', 'الخروب', 'ceratonia'],
  12: ['lavande', 'lavender', 'lavandula', 'khzama', 'الخزامى'],
  3: ['olivier', 'olive tree', 'oliva', 'olivier', 'الزيتون'],
  6: ['chih', 'chiche', 'shih', 'الشياح', 'شيح', 'artemisia', 'herba alba'],
  5: ['zaatar', 'thyme', 'thymus', 'زعتر'],
  7: ['menthe pouliot', 'menthe', 'pulegium', 'فليو', 'الفليو'],
  11: ['sanouj', 'nigella', 'graines noir', 'الحبة السوداء', 'السانوج'],
  1: ['tetraclinis', 'thuya', 'arar', 'عرعار', 'الثويا'],
  10: ['taga', 'juniper', 'juniperus', 'التاقة'],
  9: ['drou', 'lentisque', 'pistacia lentiscus', 'الضرو']
};

function hasAnyPhrase(text, phrases) {
  const query = normalize(text);
  return phrases.some((phrase) => query.includes(normalize(phrase)));
}

function findPlantByAlias(question) {
  const query = normalize(question);
  for (const [plantId, aliases] of Object.entries(plantAliases)) {
    if (aliases.some((alias) => query.includes(normalize(alias)))) {
      return plantes.find((plant) => plant.id === Number(plantId));
    }
  }
  return null;
}

function findPlantMatches(question) {
  const query = normalize(question);

  return plantes.filter((plant) => {
    const haystack = normalize([
      plant.nom_ar,
      plant.nom_latin,
      plant.type,
      ...plant.usages,
      ...plant.provinces,
      plant.source
    ].join(' '));

    if (!query) return false;
    if (haystack.includes(query)) return true;

    const tokens = query.split(' ').filter(Boolean);
    return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
  });
}

function localAnswer(question) {
  const query = normalize(question);
  if (!query) return null;

  const aliasPlant = findPlantByAlias(question);
  if (aliasPlant) {
    return {
      reponse: `${aliasPlant.nom_ar} (${aliasPlant.nom_latin}) est une ${aliasPlant.type} présente dans ${aliasPlant.provinces.join(', ')}. Ses usages principaux sont : ${aliasPlant.usages.join(', ')}. ${disclaimer}`,
      plante_id: aliasPlant.id
    };
  }

  const provinceMatches = plantes.flatMap((plant) => plant.provinces.map((province) => ({ province, plant })));
  const provinceHit = provinceMatches.find(({ province }) => hasAnyPhrase(query, [province]));
  if (provinceHit) {
    const province = provinceHit.province;
    const matches = plantes.filter((plant) => plant.provinces.includes(province));
    if (matches.length) {
      return {
        reponse: `Dans la province de ${province}, le guide Nabta référence ${matches.length} plante${matches.length > 1 ? 's' : ''} : ${matches.map((plant) => `${plant.nom_ar} (${plant.nom_latin})`).join(', ')}. ${disclaimer}`,
        plante_id: null
      };
    }
  }

  const usageRules = [
    ['infusion', ['infusion', 'tisane', 'the', 'infuser']],
    ['cuisine', ['cuisine', 'assaisonnement', 'plat', 'cuisin']],
    ['huile essentielle', ['huile', 'essentielle', 'huile essentielle']],
    ['bois', ['bois', 'charpente']],
    ['parfum', ['parfum', 'odeur', 'senteur']],
    ['alimentation', ['alimentation', 'nourriture', 'food']],
    ['fourrage', ['fourrage', 'animaux']],
    ['usage traditionnel', ['tradition', 'traditionnel', 'medicinale', 'phytotherapie']]
  ];

  for (const [label, terms] of usageRules) {
    if (hasAnyPhrase(query, terms)) {
      const matches = plantes.filter((plant) => plant.usages.some((usage) => hasAnyPhrase(usage, terms)));
      if (matches.length) {
        return {
          reponse: `Les plantes du guide Nabta associées à ${label} sont : ${matches.map((plant) => `${plant.nom_ar} (${plant.nom_latin})`).join(', ')}. ${disclaimer}`,
          plante_id: null
        };
      }
    }
  }

  const typeRules = [
    ['arbre', ['arbre']],
    ['arbre fruitier', ['arbre fruitier', 'arbre fruitier']],
    ['arbuste', ['arbuste']],
    ['plante aromatique', ['aromatique', 'aromatique']],
    ['plante médicinale', ['medicinale', 'medicinal']],
    ['graine', ['graine', 'graines']]
  ];

  for (const [label, terms] of typeRules) {
    if (hasAnyPhrase(query, terms)) {
      const matches = plantes.filter((plant) => hasAnyPhrase(plant.type, terms));
      if (matches.length) {
        return {
          reponse: `Dans le guide Nabta, les ${label} sont : ${matches.map((plant) => `${plant.nom_ar} (${plant.nom_latin})`).join(', ')}. ${disclaimer}`,
          plante_id: null
        };
      }
    }
  }

  const directMatches = findPlantMatches(question);
  if (directMatches.length === 1) {
    const plant = directMatches[0];
    return {
      reponse: `${plant.nom_ar} (${plant.nom_latin}) est une ${plant.type} présente dans ${plant.provinces.join(', ')}. Ses usages principaux sont : ${plant.usages.join(', ')}. ${disclaimer}`,
      plante_id: plant.id
    };
  }

  if (directMatches.length > 1) {
    return {
      reponse: `J’ai trouvé plusieurs plantes correspondantes : ${directMatches.map((plant) => `${plant.nom_ar} (${plant.nom_latin})`).join(', ')}. ${disclaimer}`,
      plante_id: null
    };
  }

  if (/combien|nombre|total/.test(query) && /plante|plantes|graine|graines/.test(query)) {
    return {
      reponse: `Le guide Nabta contient ${plantes.length} plantes et graines documentées. ${disclaimer}`,
      plante_id: null
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
