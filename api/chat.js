import Anthropic from '@anthropic-ai/sdk';
import plantes from '../src/data/plantes.json' with { type: 'json' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const question = req.body?.question;
  if (!question || typeof question !== 'string') return res.status(400).json({ error: 'Une question est requise' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'La clé ANTHROPIC_API_KEY est absente' });
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = `Tu es l'assistant de Nabta. Réponds uniquement à partir du contenu JSON suivant, sans inventer :\n${JSON.stringify(plantes)}\n\nRègles : réponds dans la langue de l'utilisateur (français, arabe ou darija). Si l'information n'existe pas, dis-le clairement. Si une plante est concernée, ajoute son id. Ajoute exactement cette mention : "Information à caractère informatif, pas un conseil médical." Réponds uniquement en JSON valide, sous la forme {"reponse":"texte","plante_id":3 ou null}.`;
  try {
    const completion = await client.messages.create({ model: 'claude-3-5-haiku-20241022', max_tokens: 500, system, messages: [{ role: 'user', content: question }] });
    const text = completion.content?.[0]?.text || '';
    return res.status(200).send(text);
  } catch (error) {
    return res.status(502).json({ error: `Erreur Anthropic : ${error.message}` });
  }
}
