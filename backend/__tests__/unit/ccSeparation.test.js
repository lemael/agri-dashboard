/**
 * TESTS UNITAIRES — Séparation agents CC (Grossiste / Revendeur)
 *
 * Ces tests vérifient la logique de classification des agents CC
 * sans toucher la base de données.
 */

// ─── 1. Logique isGrossiste ────────────────────────────────────────────────

describe('isGrossiste — détection du rôle CC', () => {
  const isGrossiste = (user) => Number(user?.cc_groupe) === 1;

  test('cc_groupe=1 → Grossiste', () => {
    expect(isGrossiste({ cc_groupe: 1 })).toBe(true);
    expect(isGrossiste({ cc_groupe: '1' })).toBe(true);
  });

  test('cc_groupe=2 → Revendeur', () => {
    expect(isGrossiste({ cc_groupe: 2 })).toBe(false);
    expect(isGrossiste({ cc_groupe: '2' })).toBe(false);
  });

  test('cc_groupe=null → traité comme Revendeur par défaut (BUG CONNU)', () => {
    // Un agent non-classifié est silencieusement traité comme Revendeur.
    // Il devrait être bloqué ou redirigé vers une page d'attente.
    expect(isGrossiste({ cc_groupe: null })).toBe(false);
    expect(isGrossiste({ cc_groupe: undefined })).toBe(false);
    expect(isGrossiste({})).toBe(false);
  });

  test('utilisateur null/undefined → pas de crash', () => {
    expect(isGrossiste(null)).toBe(false);
    expect(isGrossiste(undefined)).toBe(false);
  });
});

// ─── 2. Règle de filtrage all-clients ────────────────────────────────────────

describe('all-clients — règle de filtrage par groupe', () => {
  /**
   * BUG : La requête inclut "cc_groupe IS NULL" dans les deux groupes,
   * ce qui fait apparaître des agents non-classifiés dans Grossiste ET Revendeur.
   */
  const filterClientsCorrect = (clients, groupe) =>
    clients.filter(c => c.cc_groupe === groupe);

  const filterClientsBugge = (clients, groupe) =>
    clients.filter(c => c.cc_groupe === groupe || c.cc_groupe === null);

  const clients = [
    { id: 1, nom: 'ClientA', cc_groupe: 1 },  // Grossiste
    { id: 2, nom: 'ClientB', cc_groupe: 2 },  // Revendeur
    { id: 3, nom: 'ClientC', cc_groupe: null }, // Non-classifié
  ];

  test('filtre correct : groupe=1 ne retourne que les clients Grossiste', () => {
    const result = filterClientsCorrect(clients, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test('filtre correct : groupe=2 ne retourne que les clients Revendeur', () => {
    const result = filterClientsCorrect(clients, 2);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  test('filtre bugué : groupe=1 inclut aussi les non-classifiés (PROBLÈME)', () => {
    const result = filterClientsBugge(clients, 1);
    expect(result).toHaveLength(2); // ClientA + ClientC
    expect(result.map(c => c.id)).toContain(3); // ClientC ne devrait pas être là
  });

  test('filtre bugué : groupe=2 inclut aussi les non-classifiés (PROBLÈME)', () => {
    const result = filterClientsBugge(clients, 2);
    expect(result).toHaveLength(2); // ClientB + ClientC
    expect(result.map(c => c.id)).toContain(3); // ClientC ne devrait pas être là
  });
});

// ─── 3. Règle de filtrage grossiste-produits ──────────────────────────────────

describe('grossiste-produits — seuls les agents cc_groupe=1 fournissent des produits', () => {
  const getGrossisteProduits = (agents) =>
    agents.filter(a => a.cc_groupe === 1);

  test('seuls les agents cc_groupe=1 sont inclus', () => {
    const agents = [
      { email: 'g1@test', cc_groupe: 1 },
      { email: 'r1@test', cc_groupe: 2 },
      { email: 'na@test', cc_groupe: null },
    ];
    const result = getGrossisteProduits(agents);
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('g1@test');
  });

  test('un agent Grossiste avec cc_groupe=null est invisible (PROBLÈME)', () => {
    const agents = [{ email: 'g_nonclassifie@test', cc_groupe: null }];
    const result = getGrossisteProduits(agents);
    expect(result).toHaveLength(0); // ses produits ne seront jamais visibles
  });
});

// ─── 4. Souhaits — filtrage par groupe ───────────────────────────────────────

describe('souhaits — CC Grossiste lit ceux du groupe 2 (Revendeur)', () => {
  /**
   * Le CC Grossiste récupère les souhaits avec ?groupe=2.
   * Cela signifie cc_groupe=2 dans dashboard_users.
   * Si un agent soumet un souhait avec cc_groupe=null, il est invisible pour le Grossiste.
   */
  const souhaits = [
    { id: 's1', cc_email: 'rev1@test', cc_groupe: 2 },
    { id: 's2', cc_email: 'rev2@test', cc_groupe: 2 },
    { id: 's3', cc_email: 'nonclassifie@test', cc_groupe: null },
  ];

  const filterSouhaitsParGroupe = (souhaits, groupe) =>
    souhaits.filter(s => s.cc_groupe === groupe);

  test('groupe=2 retourne uniquement les souhaits des Revendeurs', () => {
    const result = filterSouhaitsParGroupe(souhaits, 2);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.id)).not.toContain('s3');
  });

  test('souhaits d\'un agent non-classifié sont invisibles (PROBLÈME si agent légitime)', () => {
    const result = filterSouhaitsParGroupe(souhaits, 2);
    expect(result.map(s => s.cc_email)).not.toContain('nonclassifie@test');
  });
});

// ─── 5. Validation CEO — assignation du groupe ───────────────────────────────

describe('validation CEO — cc_groupe doit être assigné à la validation', () => {
  /**
   * BUG : Le endpoint PATCH /:id/validate ne prend pas cc_groupe en paramètre.
   * Un agent validé sans cc_groupe assigné sera toujours NULL → mauvais comportement.
   */
  const validateWithGroupe = (userId, cc_groupe) => {
    if (!cc_groupe || ![1, 2].includes(cc_groupe))
      return { ok: false, error: 'cc_groupe (1 ou 2) requis pour la validation' };
    return { ok: true, userId, cc_groupe };
  };

  test('validation sans cc_groupe doit échouer', () => {
    expect(validateWithGroupe('u1', null).ok).toBe(false);
    expect(validateWithGroupe('u1', undefined).ok).toBe(false);
    expect(validateWithGroupe('u1', 0).ok).toBe(false);
  });

  test('validation avec cc_groupe=1 (Grossiste) doit réussir', () => {
    const result = validateWithGroupe('u1', 1);
    expect(result.ok).toBe(true);
    expect(result.cc_groupe).toBe(1);
  });

  test('validation avec cc_groupe=2 (Revendeur) doit réussir', () => {
    const result = validateWithGroupe('u1', 2);
    expect(result.ok).toBe(true);
    expect(result.cc_groupe).toBe(2);
  });

  test('validation avec cc_groupe=3 (invalide) doit échouer', () => {
    expect(validateWithGroupe('u1', 3).ok).toBe(false);
  });
});
