import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, ChevronLeft, ChevronRight, CircleHelp, FlaskConical, Leaf, MapPin, Moon, Search, Send, Sparkles, Sun, TreePine, X } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import plantes from './data/plantes.json';
import './styles.css';

const locations = {
  'Béni Mellal': [32.34, -6.36], Azilal: [31.96, -6.57],
  'Fquih Ben Salah': [32.5, -6.69], Khénifra: [32.94, -5.67], Khouribga: [32.88, -6.91]
};
const typeIcons = { arbre: TreePine, 'arbre fruitier': Leaf, arbuste: Leaf, 'plante aromatique': FlaskConical, 'plante médicinale': FlaskConical, graine: Sparkles };
const suggestions = ['À quoi sert le romarin ?', 'Quelles plantes poussent à Khénifra ?', 'Parle-moi du caroubier'];

function PlantCard({ plant, onDetails, index }) {
  const Icon = typeIcons[plant.type] || Leaf;
  return <motion.article className="plant-card glass-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.045 }} whileHover={{ y: -6, scale: 1.015 }}>
    <div className="card-top"><Icon className="plant-icon" size={22} /><span className={`status ${plant.verifie ? 'verified' : 'pending'}`}>{plant.verifie && <Check size={12} />} {plant.verifie ? 'Vérifié' : 'À vérifier'}</span></div>
    <h3>{plant.nom_ar}</h3><p className="latin">{plant.nom_latin}</p><span className={`type-tag type-${plant.type.replaceAll(' ', '-')}`}>{plant.type}</span>
    <p className="provinces">{plant.provinces.slice(0, 3).join(' · ')}{plant.provinces.length > 3 ? ' · …' : ''}</p>
    <button className="text-button" onClick={() => onDetails(plant)}>Voir la fiche <ChevronRight size={15} /></button>
  </motion.article>;
}

function PlantModal({ plant, plants, onClose, onChange }) {
  const [tab, setTab] = useState('aperçu');
  useEffect(() => { setTab('aperçu'); }, [plant]);
  useEffect(() => {
    if (!plant) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [plant, onClose]);
  if (!plant) return null;
  const position = plants.findIndex((item) => item.id === plant.id);
  const previous = plants[(position - 1 + plants.length) % plants.length];
  const next = plants[(position + 1) % plants.length];
  return <AnimatePresence><motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.section className="modal glass-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={{ opacity: 0, y: 30, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} onMouseDown={(event) => event.stopPropagation()}>
      <button className="close-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
      <span className="eyebrow">FICHE DE LA PLANTE · #{plant.id}</span><h2 id="modal-title">{plant.nom_ar}</h2><p className="latin large">{plant.nom_latin}</p>
      <div className="modal-tabs" role="tablist">{['aperçu', 'usages', 'provinces', 'source'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)} role="tab" aria-selected={tab === item}>{item}</button>)}</div>
      <div className="tab-content" role="tabpanel">
        {tab === 'aperçu' && <><span className="type-tag">{plant.type}</span><p className="modal-intro">Une plante de notre patrimoine régional, documentée dans le guide Nabta.</p><div className="info-row"><strong>Statut</strong><span className={plant.verifie ? 'green' : 'orange'}>{plant.verifie ? 'Source vérifiée' : 'Source à vérifier'}</span></div></>}
        {tab === 'usages' && <div className="chip-list">{plant.usages.map((usage) => <span className="detail-chip" key={usage}>{usage}</span>)}</div>}
        {tab === 'provinces' && <div className="chip-list">{plant.provinces.map((item) => <span className="detail-chip" key={item}><MapPin size={13} />{item}</span>)}</div>}
        {tab === 'source' && <div className="info-row"><strong>Source</strong><span>{plant.source}</span></div>}
      </div>
      <p className="notice">Information à caractère informatif, pas un conseil médical.</p>
      <div className="modal-navigation"><button onClick={() => onChange(previous)} aria-label="Plante précédente"><ChevronLeft size={16} /> Précédente</button><span>{position + 1} / {plants.length}</span><button onClick={() => onChange(next)} aria-label="Plante suivante">Suivante <ChevronRight size={16} /></button></div>
    </motion.section>
  </motion.div></AnimatePresence>;
}

function Assistant({ onDetails }) {
  const [open, setOpen] = useState(false); const [question, setQuestion] = useState(''); const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Bonjour ! Je peux vous aider à explorer les plantes de Béni Mellal-Khénifra.' }]);
  async function ask(event, value = question) {
    event?.preventDefault(); const current = value.trim(); if (!current || loading) return; setQuestion(''); setMessages((old) => [...old, { role: 'user', text: current }]); setLoading(true);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: current }) }); const raw = await response.text(); if (!response.ok) throw new Error(raw || 'Erreur du serveur');
      let data; try { data = JSON.parse(raw); } catch { data = { reponse: raw, plante_id: null }; } const plant = plantes.find((item) => item.id === data.plante_id);
      setMessages((old) => [...old, { role: 'assistant', text: data.reponse || raw, plant }]);
    } catch (error) { setMessages((old) => [...old, { role: 'assistant', text: `Impossible de contacter l'assistant : ${error.message}` }]); } finally { setLoading(false); }
  }
  return <><button className="assistant-fab" onClick={() => setOpen(true)} aria-label="Ouvrir l'assistant IA"><Sparkles size={16} /> Assistant IA</button>
    <AnimatePresence>{open && <motion.aside className="chat-panel glass-card" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}>
      <div className="chat-header"><div><strong><Bot size={17} /> Assistant Nabta</strong><small>Réponses basées sur notre guide</small></div><button onClick={() => setOpen(false)} aria-label="Fermer"><X size={18} /></button></div>
      <div className="chat-messages">{messages.length === 1 && <div className="suggestions"><small>Essayez une question</small>{suggestions.map((item) => <button key={item} onClick={() => ask(null, item)}>{item}</button>)}</div>}
        {messages.map((message, index) => <motion.div className={`message ${message.role}`} key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><p>{message.text}</p>{message.plant && <motion.div className="chat-plant" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}><strong>{message.plant.nom_ar}</strong><em>{message.plant.nom_latin}</em><button onClick={() => onDetails(message.plant)}>Voir la documentation</button></motion.div>}</motion.div>)}
        {loading && <div className="message assistant"><div className="skeleton-line" /><div className="typing"><i /><i /><i /></div></div>}
      </div><form className="chat-form" onSubmit={ask}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Posez votre question…" aria-label="Question" /><button aria-label="Envoyer"><Send size={15} /></button></form>
    </motion.aside>}</AnimatePresence></>;
}

function RegionalMap({ onProvince }) {
  return <section className="map-section" id="carte"><div className="map-copy"><span className="eyebrow">NOTRE TERRITOIRE</span><h2>Une flore ancrée dans la région.</h2><p>Explorez les cinq provinces couvertes par Nabta.</p><div className="map-legend"><MapPin size={16} /><span>Cliquez sur un point pour filtrer les plantes</span></div></div>
    <MapContainer center={[32.45, -6.4]} zoom={8} scrollWheelZoom={false} className="regional-map"><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{Object.entries(locations).map(([name, position]) => <CircleMarker key={name} center={position} pathOptions={{ color: '#315b3c', fillColor: '#b67b40', fillOpacity: .9 }} radius={9}><Popup><strong>{name}</strong><br /><button className="map-filter" onClick={() => onProvince(name)}>Voir les plantes</button></Popup></CircleMarker>)}</MapContainer></section>;
}

function App() {
  const [search, setSearch] = useState(''); const [province, setProvince] = useState(''); const [type, setType] = useState(''); const [selected, setSelected] = useState(null); const [dark, setDark] = useState(() => localStorage.getItem('nabta-theme') === 'dark');
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('nabta-theme', dark ? 'dark' : 'light'); }, [dark]);
  const provinces = useMemo(() => [...new Set(plantes.flatMap((plant) => plant.provinces))].sort(), []); const types = useMemo(() => [...new Set(plantes.map((plant) => plant.type))].sort(), []);
  const filtered = plantes.filter((plant) => (!search || `${plant.nom_ar} ${plant.nom_latin} ${plant.type}`.toLowerCase().includes(search.toLowerCase())) && (!province || plant.provinces.includes(province)) && (!type || plant.type === type));
  const clearFilters = () => { setSearch(''); setProvince(''); setType(''); };
  return <div className="app-shell"><header className="site-header"><a className="brand" href="#guide"><span className="brand-mark">ن</span><span><strong>Nabta</strong><small>نبتة · Nos plantes, notre savoir</small></span></a><nav><a href="#guide">Le guide</a><a href="#carte">La carte</a><a href="#a-propos">À propos</a><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Changer le thème">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><button className="nav-cta" onClick={() => document.querySelector('.assistant-fab')?.click()}><Sparkles size={15} /> Assistant IA</button></nav></header>
    <main><section className="hero" id="guide"><div className="hero-pattern" aria-hidden="true" /><motion.div className="hero-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><span className="eyebrow">GUIDE BOTANIQUE RÉGIONAL</span><h1>Les plantes qui<br /><i>racontent</i> notre région.</h1><p>Explorez les plantes et graines de Béni Mellal-Khénifra, entre savoirs ancestraux et documentation locale.</p><div className="hero-search"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une plante, une graine…" /><kbd>⌘ K</kbd></div></motion.div><div className="hero-art" aria-hidden="true"><Leaf size={52} /><b>نباتات<br />المغرب</b></div></section>
      <section className="catalog"><div className="section-heading"><div><span className="eyebrow">COLLECTION LOCALE</span><h2>Explorer le guide</h2></div><span className="result-count">{filtered.length} plantes</span></div><div className="filters"><div className="chip-group"><span>Provinces</span><button className={!province ? 'selected' : ''} onClick={() => setProvince('')}>Toutes</button>{provinces.map((item) => <button className={province === item ? 'selected' : ''} key={item} onClick={() => setProvince(item)}>{item}</button>)}</div><div className="chip-group"><span>Types</span><button className={!type ? 'selected' : ''} onClick={() => setType('')}>Tous</button>{types.map((item) => <button className={type === item ? 'selected' : ''} key={item} onClick={() => setType(item)}>{item}</button>)}</div>{(search || province || type) && <button className="reset-button" onClick={clearFilters}>Réinitialiser</button>}</div>
        <AnimatePresence mode="popLayout">{filtered.length ? <motion.div className="plant-grid" layout>{filtered.map((plant, index) => <PlantCard key={plant.id} plant={plant} index={index} onDetails={setSelected} />)}</motion.div> : <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><CircleHelp size={22} />Aucune plante ne correspond à votre recherche.</motion.div>}</AnimatePresence></section>
      <RegionalMap onProvince={(name) => { setProvince(name); document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth' }); }} /><section className="about" id="a-propos"><span className="eyebrow">TRANSMETTRE · PRÉSERVER · APPRENDRE</span><h2>Un herbier vivant, construit ensemble.</h2><p>Nabta rassemble les connaissances botaniques de notre territoire. Une ressource ouverte pour apprendre, documenter et transmettre.</p></section></main>
    <footer><span><strong>{plantes.length}</strong> plantes · <strong>{plantes.filter((plant) => plant.verifie).length}</strong> vérifiées</span><a href="https://github.com/" target="_blank" rel="noreferrer">Contribuer sur GitHub <ChevronRight size={14} /></a></footer><Assistant onDetails={setSelected} /><PlantModal plant={selected} plants={plantes} onClose={() => setSelected(null)} onChange={setSelected} /></div>;
}
createRoot(document.getElementById('root')).render(<App />);
