export function legacyEmpty() {
  return 'EMPTY';
}

export function toLegacyPerson(row) {
  return {
    idPersonal: row.id,
    dtNumm: row.last_name,
    dtVirnumm: row.first_name,
    dtBday: row.birth_date,
    dtEncadrant: row.is_encadrant ? 1 : 0,
    dtShowMenu: row.meal_registration_enabled ? 1 : 0,
    dtActive: row.active ? 1 : 0,
    dtFotoPersonal: row.photo_url,
    dtOrder: row.sort_order,
    fiPersonalKategorie: row.billing_category
  };
}

export function toLegacyService(row) {
  return {
    idService: row.id,
    dtService: row.name,
    dtCols: row.columns_count,
    dtAuerzait: row.time_label,
    dtActive: row.active ? 1 : 0
  };
}

export function toLegacyMenu(row) {
  const menu = row.menu_json || {};
  const days = menu.days || {};
  const alternatives = menu.alternatives || {};
  return {
    id: row.id,
    datum: row.monday_date,
    lundi: { menu: days.monday?.name || null, allergenes: days.monday?.allergens || null },
    mardi: { menu: days.tuesday?.name || null, allergenes: days.tuesday?.allergens || null },
    mercredi: { menu: days.wednesday?.name || null, allergenes: days.wednesday?.allergens || null },
    jeudi: { menu: days.thursday?.name || null, allergenes: days.thursday?.allergens || null },
    vendredi: { menu: days.friday?.name || null, allergenes: days.friday?.allergens || null },
    alternative1: { menu: alternatives.alternative1?.name || null, allergenes: alternatives.alternative1?.allergens || null },
    alternative2: { menu: alternatives.alternative2?.name || null, allergenes: alternatives.alternative2?.allergens || null },
    'public-hidden': row.public_hidden ? 1 : 0
  };
}
