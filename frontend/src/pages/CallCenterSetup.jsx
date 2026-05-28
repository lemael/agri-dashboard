import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const COSMETIQUE_SUBCATS = [
  // Soins du visage
  'Crème visage', 'Sérum', 'Nettoyant visage', 'Gommage visage', 'Masque facial', 'Lotion tonique', 'Anti-acné', 'Anti-âge',
  // Maquillage
  'Fond de teint', 'Rouge à lèvres', 'Poudre', 'Mascara', 'Eyeliner', 'Blush', 'Palette maquillage',
  // Soins capillaires
  'Shampoing', 'Après-shampoing', 'Huile cheveux', 'Gel coiffant', 'Perruques', 'Extensions', 'Traitement capillaire',
  // Parfumerie
  'Parfum homme', 'Parfum femme', 'Déodorant', 'Brume corporelle', 'Eau de toilette',
  // Soins du corps
  'Lait corporel', 'Crème hydratante', 'Savon de beauté', 'Gommage corps', 'Huile corporelle', 'Beurre de karité',
  // Produits naturels / bio
  'Huile essentielle', 'Produits bio', 'Savon artisanal', 'Cosmétique naturel', 'Aloe vera',
  // Cosmétique homme
  'Barbe', 'Après-rasage', 'Gel douche homme', 'Crème homme',
  // Cosmétique femme
  'Soins intimes', 'Kits beauté', 'Accessoires maquillage', 'Produits beauté femme',
  // Onglerie / Nail care
  'Vernis', 'Faux ongles', 'Gel UV', 'Dissolvant', 'Accessoires ongles',
  // Accessoires beauté
  'Pinceaux', 'Éponge maquillage', 'Miroir', 'Trousse beauté', 'Lisseur', 'Sèche-cheveux',
];

const VETEMENTS_SUBCATS = [
  // Vêtements Femme
  'Robes', 'Jupes', 'Jeans femme', 'Tops / T-shirts', 'Vestes femme', 'Pantalons femme', 'Ensembles femme', 'Lingerie', 'Vêtements traditionnels',
  // Vêtements Homme
  'Chemises', 'T-shirts homme', 'Jeans homme', 'Costumes', 'Vestes homme', 'Shorts', 'Pantalons homme', 'Sous-vêtements homme',
  // Vêtements Enfant
  'Bébé', 'Garçon', 'Fille', 'Uniformes scolaires', 'Habits naissance',
  // Chaussures
  'Chaussures homme', 'Chaussures femme', 'Sandales', 'Baskets', 'Talons', 'Bottes', 'Chaussures enfant',
  // Accessoires de mode
  'Ceintures', 'Sacs', 'Casquettes', 'Lunettes', 'Bijoux fantaisie', 'Portefeuilles', 'Montres',
  // Sport & Fitness
  'Tenues sportives', 'Chaussures sport', 'Jogging', 'Leggings', 'Maillots', 'Accessoires fitness',
  // Mode traditionnelle / locale
  'Boubou', 'Wax', 'Kente', 'Bazin', 'Tenues africaines', 'Voiles / hijab',
  // Luxe & Boutique
  'Marques premium', 'Vêtements importés', 'Articles haut de gamme',
  // Friperie / Occasion
  'Vêtements seconde main', 'Chaussures occasion', 'Balles de friperie',
  // Couture & Personnalisation
  'Couture sur mesure', 'Retouches', 'Broderie', 'Impression textile',
];

const MAISON_SUBCATS = [
  // Cuisine
  'Assiettes', 'Casseroles', 'Poêles', 'Cuillères', 'Mixeurs', 'Bouilloires', 'Boîtes de conservation', 'Ustensiles cuisine', 'Gobelets / verres',
  // Salon & Décoration
  'Rideaux', 'Tapis', 'Coussins', 'Table basse', 'Lampes', 'Décoration murale', 'Horloges', 'Cadres photo', 'Plantes artificielles',
  // Salle de bain / Douche
  'Serviettes', 'Rideaux douche', 'Porte-savon', 'Tapis douche', 'Brosse toilette', 'Accessoires lavabo', 'Miroirs salle de bain',
  // Produits ménagers
  'Savon ménager', 'Détergents', 'Eau de javel', 'Désinfectants', 'Nettoyants sol', 'Liquide vaisselle', 'Éponges', 'Balais', 'Serpillières',
  // Literie & Chambre
  'Draps', 'Couvertures', 'Oreillers', 'Moustiquaires', 'Housses matelas', 'Rideaux chambre',
  // Électroménager maison
  'Ventilateurs', 'Fers à repasser', 'Aspirateurs', 'Micro-ondes', 'Réchauds', 'Machines à laver',
  // Rangement & Organisation
  'Étagères', 'Boîtes rangement', 'Paniers', 'Porte-chaussures', 'Armoires plastiques',
  // Jardin & Extérieur
  'Pots de fleurs', "Tuyaux d'arrosage", 'Chaises extérieures', 'Outils jardin', 'Lampes extérieures',
  // Sécurité Maison
  'Caméras', 'Serrures', 'Alarmes', 'Détecteurs fumée',
  // Décoration événementielle
  'Décoration mariage', 'Décoration anniversaire', 'Bougies', 'Ballons', 'Nappes',
];

const ELECTRONIQUE_SUBCATS = [
  // Téléphones & Smartphones
  'Smartphones Android', 'iPhone', 'Téléphones simples', 'Téléphones professionnels', 'Téléphones gaming', 'Téléphones reconditionnés',
  'Chargeurs', 'Écouteurs', 'Casques Bluetooth', 'Coques', 'Verres trempés', 'Power banks', 'Câbles USB', 'Supports téléphone', 'Accessoires téléphone',
  // Télévision & Multimédia
  'Smart TV', 'Android TV', 'Télévision LED', 'Télévision OLED', 'Décodeurs', 'Antennes TV', 'Home cinéma', 'Projecteurs', 'Télécommandes',
  // Informatique
  'Ordinateurs portables', 'PC bureau', 'Écrans', 'Claviers', 'Souris', 'Imprimantes', 'Disques durs', 'SSD', 'Clés USB', 'Routeurs WiFi',
  // Gaming
  'Consoles', 'Manettes', 'Casques gaming', 'Chaises gaming',
  // Électroménager
  'Réfrigérateurs', 'Mixeurs', 'Micro-ondes', 'Cuisinières', 'Bouilloires', 'Machines café',
  'Machines à laver', 'Aspirateurs', 'Fers à repasser', 'Ventilateurs', 'Climatiseurs',
  // Audio & Son
  'Haut-parleurs Bluetooth', 'Baffles', 'Casques audio', 'Micros', 'Soundbars', 'Radios',
  // Énergie & Électricité
  'Panneaux solaires', 'Batteries', 'Onduleurs', 'Multiprises', 'Générateurs', 'Lampes rechargeables', 'Ampoules LED',
  // Sécurité électronique
  'Caméras surveillance', 'Alarmes', 'Détecteurs mouvement', 'Serrures intelligentes',
  // Accessoires électroniques
  'Adaptateurs', 'Cartes mémoire', 'Chargeurs universels', 'Batteries externes', 'Connecteurs HDMI', 'Supports TV', 'Rallonges électriques',
  // Réseaux & Communication
  'Modems', 'Routeurs', 'Switch réseau', 'Répéteurs WiFi', 'Téléphones IP',
  // Objets connectés / Smart devices
  'Montres connectées', 'Bracelets connectés', 'Smart home', 'Alexa / Google Home', 'Caméras connectées',
];

const ALIMENTAIRE_SUBCATS = [
  // Produits frais — Fruits
  'Banane', 'Orange', 'Pomme', 'Mangue', 'Avocat', 'Ananas',
  // Produits frais — Légumes
  'Tomate', 'Oignon', 'Piment', 'Carotte', 'Chou', 'Salade',
  // Produits frais — Animaux
  'Viande', 'Poulet', 'Poisson', 'Fruits de mer', 'Œufs',
  // Produits frais — Laitiers
  'Lait', 'Yaourt', 'Fromage', 'Beurre',
  // Produits secs & épicerie
  'Riz', 'Farine', 'Sucre', 'Haricots', 'Maïs', 'Pâtes alimentaires', 'Semoule', 'Huile alimentaire', 'Sel', 'Épices',
  // Conserves
  'Sardines', 'Thon', 'Tomates en conserve', 'Légumes en boîte', 'Lait concentré', 'Corned beef', 'Sauce tomate', 'Petits pois en conserve',
  // Pâtisserie & boulangerie
  'Pain', 'Baguette', 'Croissant', 'Sandwich', 'Gâteaux', 'Biscuits', 'Beignets', 'Muffins', 'Tartes', 'Chocolats',
  // Boissons gazeuses
  'Soda', 'Eau gazeuse',
  // Jus & boissons naturelles
  'Jus fruits', 'Jus naturels', 'Smoothies',
  // Eau
  'Eau minérale', 'Eau purifiée',
  // Boissons chaudes
  'Café', 'Thé', 'Chocolat chaud',
  // Boissons énergétiques
  'Energy drinks',
  // Produits surgelés
  'Poulet congelé', 'Poisson congelé', 'Frites surgelées', 'Légumes congelés', 'Glaces',
  // Produits locaux / traditionnels
  'Manioc', 'Fufu', 'Attiéké', 'Plantain', 'Couscous local', 'Huile rouge', 'Produits artisanaux',
  // Snacks & confiseries
  'Bonbons', 'Chips', 'Popcorn', 'Chewing-gum', 'Biscuits apéritifs',
  // Produits bio & santé
  'Produits bio', 'Produits sans sucre', 'Produits diététiques', 'Céréales santé', 'Produits vegan',
  // Restauration rapide / Fast-food
  'Pizza', 'Burger', 'Shawarma', 'Poulet braisé', 'Frites', 'Hot-dog',
];

const SECTORS_WITH_DATALIST = ['Cosmétique', 'Vêtements', 'Accessoires maison', 'Appareils électroniques', 'Alimentaire'];

const SECTORS = {
  'Cosmétique':              COSMETIQUE_SUBCATS,
  'Alimentaire':             ALIMENTAIRE_SUBCATS,
  'Appareils électroniques': ELECTRONIQUE_SUBCATS,
  'Vêtements':               VETEMENTS_SUBCATS,
  'Accessoires maison':      MAISON_SUBCATS,
};

const STEPS = ['Informations', 'Secteur commercial', 'Orientation'];

export default function CallCenterSetup() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    prenom: user?.prenom || '',
    telephone: '',
    ville: '',
    geolocation: '',
    secteur_principal: '',
    secteur_secondaire: '',
    orientation: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validateStep() {
    if (step === 0) {
      if (!form.prenom.trim()) return 'Le prénom est requis.';
      if (!form.telephone.trim()) return 'Le téléphone est requis.';
      if (!/^\+2376\d{8}$/.test(form.telephone))
        return 'Format téléphone invalide : +2376 suivi de 8 chiffres (ex: +237612345678)';
      if (!form.ville.trim()) return 'La ville est requise.';
    }
    if (step === 1) {
      if (!form.secteur_principal)  return 'Choisissez un secteur principal.';
      if (!form.secteur_secondaire) return 'Choisissez une sous-catégorie.';
    }
    if (step === 2) {
      if (!form.orientation) return 'Choisissez une orientation commerciale.';
    }
    return '';
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      await api.ccSaveProfile({
        email: user.email,
        prenom: form.prenom,
        telephone: form.telephone,
        ville: form.ville,
        geolocation: form.geolocation || undefined,
        secteur_principal: form.secteur_principal,
        secteur_secondaire: form.secteur_secondaire,
        orientation: form.orientation,
      });
      login({ ...user, prenom: form.prenom, profile_complete: true });
      navigate('/cc-dashboard', { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const subcategories = SECTORS[form.secteur_principal] || [];

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a2f 0%,#2d5a45 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36 }}>🌱</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 4 }}>Facilitar</div>
          <div style={{ fontSize: 14, color: '#a0c4ad', marginTop: 4 }}>Configuration de votre profil</div>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            style={{ marginTop: 10, background: 'none', border: 'none', color: '#a0c4ad', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Se déconnecter
          </button>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, fontWeight: 700,
                background: i < step ? '#4caf7d' : i === step ? '#fff' : 'rgba(255,255,255,0.2)',
                color: i < step ? '#fff' : i === step ? '#1e3a2f' : 'rgba(255,255,255,0.5)',
                border: i === step ? '2px solid #4caf7d' : 'none',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 10, color: i === step ? '#4caf7d' : 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#1e3a2f' }}>
            {step === 0 && '👤 Informations personnelles'}
            {step === 1 && '🏷️ Secteur commercial'}
            {step === 2 && '🎯 Orientation commerciale'}
          </h2>

          {/* Step 0 */}
          {step === 0 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <Field label="Prénom *" value={form.prenom} onChange={v => set('prenom', v)} placeholder="Votre prénom" />
              <PhoneField value={form.telephone} onChange={v => set('telephone', v)} />
              <VilleField value={form.ville} onChange={v => set('ville', v)} />
              <GeoField value={form.geolocation} onChange={v => set('geolocation', v)} />
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={labelStyle}>Secteur principal *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  {Object.keys(SECTORS).map(s => (
                    <button key={s} onClick={() => { set('secteur_principal', s); set('secteur_secondaire', ''); }}
                      style={{
                        padding: '10px 8px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                        border: form.secteur_principal === s ? '2px solid #4caf7d' : '1px solid #e0e0e0',
                        background: form.secteur_principal === s ? '#f0fff4' : '#fafafa',
                        color: form.secteur_principal === s ? '#1e3a2f' : '#495057',
                        fontWeight: form.secteur_principal === s ? 700 : 400,
                        textAlign: 'center', transition: 'all .15s',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {form.secteur_principal && (
                <div>
                  <label style={labelStyle}>Sous-catégorie *</label>
                  {SECTORS_WITH_DATALIST.includes(form.secteur_principal) ? (
                    <SubCatDatalist
                      value={form.secteur_secondaire}
                      onChange={v => set('secteur_secondaire', v)}
                      options={subcategories}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {subcategories.map(sc => (
                        <button key={sc} onClick={() => set('secteur_secondaire', sc)}
                          style={{
                            padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                            border: form.secteur_secondaire === sc ? '2px solid #4caf7d' : '1px solid #e0e0e0',
                            background: form.secteur_secondaire === sc ? '#4caf7d' : '#fff',
                            color: form.secteur_secondaire === sc ? '#fff' : '#495057',
                            fontWeight: form.secteur_secondaire === sc ? 700 : 400,
                            transition: 'all .15s',
                          }}>
                          {sc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#636e72' }}>
                Choisissez votre orientation commerciale principale.
              </p>
              {[
                { val: 'Revendeur', icon: '🏪', desc: 'Vous vendez directement aux consommateurs finaux' },
                { val: 'Grossiste', icon: '🏭', desc: 'Vous vendez en grandes quantités à des revendeurs' },
              ].map(o => (
                <button key={o.val} onClick={() => set('orientation', o.val)}
                  style={{
                    padding: 16, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: form.orientation === o.val ? '2px solid #4caf7d' : '1px solid #e0e0e0',
                    background: form.orientation === o.val ? '#f0fff4' : '#fafafa',
                    transition: 'all .15s',
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{o.icon}</div>
                  <div style={{ fontWeight: 700, color: '#1e3a2f', fontSize: 15 }}>{o.val}</div>
                  <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>{o.desc}</div>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: '8px 12px', background: '#fff5f5', borderRadius: 8, color: '#c0392b', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button onClick={() => { setError(''); setStep(s => s - 1); }} style={btnSecondary}>
                ← Retour
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={next} style={{ ...btnPrimary, flex: 1 }}>
                Suivant →
              </button>
            ) : (
              <button onClick={submit} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                {saving ? 'Enregistrement…' : '✓ Terminer la configuration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', autoComplete = 'off' }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, marginTop: 4,
          border: '1px solid #e0e0e0', outline: 'none', boxSizing: 'border-box',
          background: '#fafafa',
        }}
      />
    </div>
  );
}

const VILLES_CM = ['Yaoundé', 'Douala', 'Bafoussam', 'Mbalmayo', 'Kribi', 'Limbé', 'Ebolowa'];

function VilleField({ value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>Ville *</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        list="villes-cm"
        placeholder="Ex: Yaoundé, Douala..."
        autoComplete="off"
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, marginTop: 4,
          border: '1px solid #e0e0e0', outline: 'none', boxSizing: 'border-box', background: '#fafafa',
        }}
      />
      <datalist id="villes-cm">
        {VILLES_CM.map(v => <option key={v} value={v} />)}
      </datalist>
    </div>
  );
}

function PhoneField({ value, onChange }) {
  const PREFIX = '+2376';

  function handleChange(e) {
    let raw = e.target.value;
    // Ensure prefix is always present
    if (!raw.startsWith(PREFIX)) {
      raw = PREFIX + raw.replace(/^\+?237?6?/, '');
    }
    // Remove anything after prefix that's not a digit
    const digits = raw.slice(PREFIX.length).replace(/\D/g, '').slice(0, 8);
    onChange(PREFIX + digits);
  }

  const isValid = /^\+2376\d{8}$/.test(value);
  const showHint = value.length > PREFIX.length && !isValid;

  return (
    <div>
      <label style={labelStyle}>Téléphone *</label>
      <input
        type="tel"
        value={value || PREFIX}
        onChange={handleChange}
        autoComplete="off"
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, marginTop: 4,
          border: `1px solid ${showHint ? '#e74c3c' : isValid && value.length > PREFIX.length ? '#4caf7d' : '#e0e0e0'}`,
          outline: 'none', boxSizing: 'border-box', background: '#fafafa',
        }}
      />
      {showHint
        ? <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>Format: +2376 suivi de 8 chiffres</div>
        : <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>Format: +2376XXXXXXXX (8 chiffres)</div>
      }
    </div>
  );
}

function GeoField({ value, onChange }) {  const [loading, setLoading] = React.useState(false);
  const [geoErr, setGeoErr] = React.useState('');

  function detect() {
    if (!navigator.geolocation) { setGeoErr('Géolocalisation non supportée.'); return; }
    setLoading(true);
    setGeoErr('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        onChange(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setLoading(false);
      },
      () => { setGeoErr('Accès refusé ou position indisponible.'); setLoading(false); },
      { timeout: 8000 }
    );
  }

  return (
    <div>
      <label style={labelStyle}>Géolocalisation <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Ex: 3.84800, 11.50240 ou adresse"
          autoComplete="off"
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13,
            border: '1px solid #e0e0e0', outline: 'none', background: '#fafafa',
          }}
        />
        <button type="button" onClick={detect} disabled={loading} style={{
          padding: '9px 14px', borderRadius: 8, border: 'none',
          background: loading ? '#b2bec3' : '#1e3a2f', color: '#fff',
          fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        }}>
          {loading ? '⏳' : '📍 Détecter'}
        </button>
      </div>
      {geoErr && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>{geoErr}</div>}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#495057', textTransform: 'uppercase', letterSpacing: '0.5px' };

function SubCatDatalist({ value, onChange, options }) {
  const id = 'subcat-cosmetique-list';
  return (
    <div style={{ marginTop: 6 }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        list={id}
        placeholder="Tapez ou choisissez une sous-catégorie…"
        autoComplete="off"
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
          border: value ? '1px solid #4caf7d' : '1px solid #e0e0e0',
          outline: 'none', boxSizing: 'border-box', background: '#fafafa',
        }}
      />
      <datalist id={id}>
        {options.map(o => <option key={o} value={o} />)}
      </datalist>
      {value && (
        <div style={{ fontSize: 11, color: '#4caf7d', marginTop: 3 }}>✓ {value}</div>
      )}
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
        Ex : Robes, Sérum, Casseroles, Smartphones Android, Riz, Poulet…
      </div>
    </div>
  );
}

const btnPrimary = {
  padding: '11px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14,
  background: '#4caf7d', color: '#fff', border: 'none', cursor: 'pointer',
};

const btnSecondary = {
  padding: '11px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14,
  background: '#f0f0f0', color: '#495057', border: 'none', cursor: 'pointer',
};
