/**
 * TESTS UNITAIRES — Fix validation CEO : forcer cc_groupe à la validation
 *
 * Régression : sans ce fix, le CEO pouvait valider un agent CC
 * sans sélectionner de groupe → cc_groupe restait NULL
 * → l'agent voyait l'écran "En attente d'assignation" après connexion.
 *
 * Fix appliqué dans :
 *   - frontend/src/pages/Dashboard.jsx  → bloque la validation si pas de groupe
 *   - frontend/src/api.js               → passe cc_groupe dans le body du PATCH
 */

// ─── 1. Logique de blocage côté frontend ────────────────────────────────────

describe('handleValidate — blocage si cc_groupe non sélectionné', () => {
  /**
   * Reproduit la logique de Dashboard.jsx :
   *   const cc_groupe = pendingGroups[id];
   *   if (!cc_groupe) { alert(...); return; }
   */
  const canValidate = (pendingGroups, userId) => {
    const cc_groupe = pendingGroups[userId];
    return !!cc_groupe;
  };

  test('bloque si pendingGroups ne contient pas cet agent', () => {
    expect(canValidate({}, 'u1')).toBe(false);
  });

  test('bloque si le groupe est une chaîne vide', () => {
    expect(canValidate({ u1: '' }, 'u1')).toBe(false);
  });

  test('bloque si le groupe est null', () => {
    expect(canValidate({ u1: null }, 'u1')).toBe(false);
  });

  test('bloque si le groupe est undefined', () => {
    expect(canValidate({ u1: undefined }, 'u1')).toBe(false);
  });

  test('autorise si groupe = "1" (Grossiste)', () => {
    expect(canValidate({ u1: '1' }, 'u1')).toBe(true);
  });

  test('autorise si groupe = "2" (Revendeur)', () => {
    expect(canValidate({ u1: '2' }, 'u1')).toBe(true);
  });

  test('bloque pour un autre agent mais pas pour celui qui a son groupe', () => {
    const groups = { u2: '1' };
    expect(canValidate(groups, 'u1')).toBe(false);
    expect(canValidate(groups, 'u2')).toBe(true);
  });
});

// ─── 2. Construction du body API — cc_groupe doit être transmis ──────────────

describe('api.validateUser — corps de la requête PATCH', () => {
  /**
   * Avant le fix : validateUser(id) → body {}
   * Après le fix  : validateUser(id, cc_groupe) → body { cc_groupe } si défini
   */
  const buildValidateBody = (cc_groupe) =>
    cc_groupe ? { cc_groupe } : {};

  test('sans cc_groupe → body vide (ancien comportement bugué)', () => {
    expect(buildValidateBody(undefined)).toEqual({});
    expect(buildValidateBody(null)).toEqual({});
    expect(buildValidateBody('')).toEqual({});
  });

  test('avec cc_groupe="1" → body { cc_groupe: "1" }', () => {
    expect(buildValidateBody('1')).toEqual({ cc_groupe: '1' });
  });

  test('avec cc_groupe="2" → body { cc_groupe: "2" }', () => {
    expect(buildValidateBody('2')).toEqual({ cc_groupe: '2' });
  });
});

// ─── 3. Logique d'affichage — écran "En attente d'assignation" ───────────────

describe('CallCenterDashboard — affichage conditionnel selon cc_groupe', () => {
  /**
   * Reproduit la condition de CallCenterDashboard.jsx :
   *   if (user?.role === 'call_center' && !user?.cc_groupe) → afficher écran d'attente
   */
  const shouldShowWaiting = (user) =>
    user?.role === 'call_center' && !user?.cc_groupe;

  test('agent call_center sans cc_groupe → écran d\'attente visible', () => {
    expect(shouldShowWaiting({ role: 'call_center', cc_groupe: null })).toBe(true);
    expect(shouldShowWaiting({ role: 'call_center', cc_groupe: undefined })).toBe(true);
    expect(shouldShowWaiting({ role: 'call_center', cc_groupe: 0 })).toBe(true);
    expect(shouldShowWaiting({ role: 'call_center' })).toBe(true);
  });

  test('agent call_center avec cc_groupe=1 → accès normal au dashboard', () => {
    expect(shouldShowWaiting({ role: 'call_center', cc_groupe: 1 })).toBe(false);
    expect(shouldShowWaiting({ role: 'call_center', cc_groupe: '1' })).toBe(false);
  });

  test('agent call_center avec cc_groupe=2 → accès normal au dashboard', () => {
    expect(shouldShowWaiting({ role: 'call_center', cc_groupe: 2 })).toBe(false);
    expect(shouldShowWaiting({ role: 'call_center', cc_groupe: '2' })).toBe(false);
  });

  test('rôle non call_center → jamais d\'écran d\'attente', () => {
    expect(shouldShowWaiting({ role: 'ceo', cc_groupe: null })).toBe(false);
    expect(shouldShowWaiting({ role: 'comptable' })).toBe(false);
    expect(shouldShowWaiting(null)).toBe(false);
  });
});

// ─── 4. Mise à jour de pendingGroups après validation ────────────────────────

describe('pendingGroups — nettoyage après validation réussie', () => {
  /**
   * Après validation, l'agent est retiré de `pending` ET de `pendingGroups`
   * pour éviter des données orphelines.
   */
  const removeFromPending = (pending, pendingGroups, validatedId) => ({
    pending: pending.filter(u => u.id !== validatedId),
    pendingGroups: Object.fromEntries(
      Object.entries(pendingGroups).filter(([k]) => k !== validatedId)
    ),
  });

  test('l\'agent validé est retiré de la liste pending', () => {
    const pending = [{ id: 'u1' }, { id: 'u2' }];
    const groups  = { u1: '1', u2: '2' };
    const result  = removeFromPending(pending, groups, 'u1');
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0].id).toBe('u2');
  });

  test('le groupe de l\'agent validé est retiré de pendingGroups', () => {
    const pending = [{ id: 'u1' }, { id: 'u2' }];
    const groups  = { u1: '1', u2: '2' };
    const result  = removeFromPending(pending, groups, 'u1');
    expect(result.pendingGroups).not.toHaveProperty('u1');
    expect(result.pendingGroups).toHaveProperty('u2');
  });

  test('autres agents non affectés par la suppression', () => {
    const pending = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];
    const groups  = { u1: '1', u2: '2', u3: '1' };
    const result  = removeFromPending(pending, groups, 'u2');
    expect(result.pending.map(u => u.id)).toEqual(['u1', 'u3']);
    expect(Object.keys(result.pendingGroups)).toEqual(['u1', 'u3']);
  });
});
