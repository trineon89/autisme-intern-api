import { created, ok, deleted } from '../../utils/http.js';
import { asInt, asString, optionalInt, optionalString, requireObject } from '../../utils/validation.js';

function client(row) {
  if (!row) return null;
  return {
    idClient: row.id,
    dtName: row.name,
    dtSurname: row.surname,
    dtAdresse: row.address,
    dtCP: row.postal_code,
    dtLieu: row.city,
    dtPays: row.country,
    dtTel: row.phone,
    dtEmail: row.email,
    fiAssociation: row.association_id,
    idAssociation: row.association_id,
    dtLabel: row.association_label,
    dtTVA: row.association_vat
  };
}

function product(row) {
  if (!row) return null;
  return {
    idProduit: row.id,
    dtDescriptive: row.description,
    dtPrixAchat: Number(row.purchase_price || 0),
    dtPrixVente: Number(row.sale_price || 0),
    dtCodeMW: row.vat_code,
    fiFournisseur: row.supplier_id,
    dtCompose: row.is_composed ? 1 : 0,
    dtVariable: row.is_variable ? 1 : 0,
    dtVisible: row.visible ? 1 : 0,
    ONactif: row.active ? 1 : 0,
    dtStockProv: Number(row.stock_quantity || 0),
    idFournisseur: row.supplier_id,
    dtLabel: row.supplier_label
  };
}

function order(row) {
  if (!row) return null;
  return {
    idCommande: row.id,
    fiClient: row.client_id,
    dtDateTermine: row.due_date,
    dtDateLivraison: row.delivery_date,
    dtDescriptive: row.description,
    fiAdresseLivraison: row.delivery_address_id,
    dtCommandeCollectInfo: row.collect_info,
    dtBL: row.delivery_note,
    fiPersonal: row.created_by_person_id,
    ONactif: row.active ? 1 : 0
  };
}

async function listProducts(db, includeHidden = false, active = true) {
  const rows = await db.query(
    `SELECT p.*, s.label AS supplier_label FROM commande_products p LEFT JOIN commande_suppliers s ON s.id = p.supplier_id
      WHERE (:includeHidden = 1 OR p.visible = 1) AND (:active IS NULL OR p.active = :active)
      ORDER BY p.description ASC`,
    { includeHidden: includeHidden ? 1 : 0, active: active === null ? null : active ? 1 : 0 }
  );
  return rows.map(product);
}

async function listOrders(db) {
  return (await db.query('SELECT * FROM commande_orders ORDER BY due_date DESC, id DESC')).map(order);
}

async function orderDetails(db, orderId) {
  const rows = await db.query(
    `SELECT op.*, p.description, p.is_composed, p.active FROM commande_order_positions op
      JOIN commande_products p ON p.id = op.product_id
      WHERE op.order_id = :orderId ORDER BY op.id ASC`,
    { orderId }
  );
  return { data: rows.map((row) => ({
    ID: row.product_id,
    idCommandePosition: row.id,
    Type: row.is_composed ? 'PC' : 'P',
    dtDescriptive: row.description,
    dtQuantite: Number(row.quantity || 0),
    dtEtat: row.completed_quantity && row.quantity ? Math.round((row.completed_quantity / row.quantity) * 100) : 0,
    statut_possible: row.completed_quantity && row.quantity ? Math.round((row.completed_quantity / row.quantity) * 100) : 0,
    quantiteassoc: Number(row.completed_quantity || 0),
    ONactif: row.active ? 1 : 0
  })) };
}

export default async function commandeRoutes(app) {
  app.get('/getClients', async (request) => (await request.server.db.query(
    `SELECT c.*, a.label AS association_label, a.vat_number AS association_vat FROM commande_clients c LEFT JOIN commande_associations a ON a.id = c.association_id ORDER BY c.name ASC`
  )).map(client));

  app.get('/getClient/:id', async (request) => client(await request.server.db.one(
    `SELECT c.*, a.label AS association_label, a.vat_number AS association_vat FROM commande_clients c LEFT JOIN commande_associations a ON a.id = c.association_id WHERE c.id = :id`,
    { id: asInt(request.params.id) }
  )));

  app.get('/getFournisseurs', async (request) => (await request.server.db.query('SELECT id AS idFournisseur, label AS dtLabel FROM commande_suppliers ORDER BY label ASC')));

  app.get('/getProduits', async (request) => listProducts(request.server.db, false, request.query.actif === undefined ? true : request.query.actif !== '0'));
  app.get('/getProduitsDatatable', async (request) => ({ data: await listProducts(request.server.db, false, true) }));
  app.get('/getProduitsDatatableAll', async (request) => ({ data: await listProducts(request.server.db, true, null) }));
  app.get('/getProduitsCompose', async (request) => ({ data: (await listProducts(request.server.db, false, true)).filter((p) => p.dtCompose === 1) }));
  app.get('/getProduitsComposeAll', async (request) => ({ data: (await listProducts(request.server.db, true, null)).filter((p) => p.dtCompose === 1) }));

  app.get('/getProduit/:id', async (request) => product(await request.server.db.one(
    `SELECT p.*, s.label AS supplier_label FROM commande_products p LEFT JOIN commande_suppliers s ON s.id = p.supplier_id WHERE p.id = :id`,
    { id: asInt(request.params.id) }
  )));
  app.get('/getProduitCompose/:id', async (request) => product(await request.server.db.one(
    `SELECT p.*, s.label AS supplier_label FROM commande_products p LEFT JOIN commande_suppliers s ON s.id = p.supplier_id WHERE p.id = :id AND p.is_composed = 1`,
    { id: asInt(request.params.id) }
  )));
  app.get('/getProduitComposeStock/:id', async (request) => product(await request.server.db.one(
    `SELECT p.*, s.label AS supplier_label FROM commande_products p LEFT JOIN commande_suppliers s ON s.id = p.supplier_id WHERE p.id = :id`,
    { id: asInt(request.params.id) }
  )));
  app.get('/getProduitsComposeStock/:id', async (request) => ({ stock: product(await request.server.db.one('SELECT * FROM commande_products WHERE id = :id', { id: asInt(request.params.id) })) }));

  app.get('/getProduitsCompositionForProduit/:id', async (request) => ({ data: await request.server.db.query(
    `SELECT c.parent_product_id AS fiProduit, c.component_product_id AS fiProduitSub, c.quantity AS dtQuantite, p.id AS idProduit, p.description AS dtDescriptive
       FROM commande_product_components c JOIN commande_products p ON p.id = c.component_product_id WHERE c.parent_product_id = :id`,
    { id: asInt(request.params.id) }
  ) }));
  app.get('/getProduitsAssociationForProduit/:id', async (request) => ({ data: await request.server.db.query(
    `SELECT c.parent_product_id AS fiProduit, c.component_product_id AS fiProduitSub, c.quantity AS dtQuantite, p.id AS idProduit, p.description AS dtDescriptive
       FROM commande_product_components c JOIN commande_products p ON p.id = c.parent_product_id WHERE c.component_product_id = :id`,
    { id: asInt(request.params.id) }
  ) }));
  app.get('/getProduitAssociationForProduit/:id/:produit', async (request) => request.server.db.one(
    `SELECT parent_product_id AS fiProduit, component_product_id AS fiProduitSub, quantity AS dtQuantite FROM commande_product_components WHERE parent_product_id = :id AND component_product_id = :produit`,
    { id: asInt(request.params.id), produit: asInt(request.params.produit) }
  ));
  app.get('/getSubProduit/:id', async (request) => request.server.db.query('SELECT * FROM commande_order_position_subs WHERE position_id = :id', { id: asInt(request.params.id) }));

  app.get('/getCommanden', async (request) => listOrders(request.server.db));
  app.post('/getCommanden', async (request) => listOrders(request.server.db));
  app.get('/getCommandenDatatable', async (request) => {
    const orders = await listOrders(request.server.db);
    const data = [];
    for (const item of orders) {
      const details = await orderDetails(request.server.db, item.idCommande);
      data.push({ id: item.idCommande, client: item.fiClient, commande: details.data.map((line) => `${line.dtQuantite}x ${line.dtDescriptive}`).join('<br>'), date_s: item.dtDateTermine, statut: 0, statut_possible: 0, BL: item.dtBL || '❌', ONactif: item.ONactif });
    }
    return { data };
  });
  app.get('/getCommande/:id', async (request) => order(await request.server.db.one('SELECT * FROM commande_orders WHERE id = :id', { id: asInt(request.params.id) })));
  app.get('/getCommandeDetails/:id', async (request) => orderDetails(request.server.db, asInt(request.params.id)));

  app.get('/getPositionForCommandeWithSub/:id', async (request) => {
    const position = await request.server.db.one('SELECT * FROM commande_order_positions WHERE id = :id', { id: asInt(request.params.id) });
    if (!position) return null;
    position.sousproduits = await request.server.db.query('SELECT * FROM commande_order_position_subs WHERE position_id = :id', { id: position.id });
    return position;
  });

  app.get('/getProductionUrgentDatatable', async (request) => ({ data: [] }));
  app.get('/getProductionTotalDatatable', async (request) => ({ data: [] }));
  app.get('/getProductionProduct/:id/:varficomm', async (request) => ({ productId: asInt(request.params.id), positionId: asInt(request.params.varficomm), components: [] }));

  app.post('/insertClient', async (request, reply) => {
    const b = requireObject(request.body);
    const id = await request.server.db.insert(
      `INSERT INTO commande_clients (name, surname, address, postal_code, city, country, association_id, phone, email)
       VALUES (:name, :surname, :address, :postalCode, :city, :country, :associationId, :phone, :email)`,
      { name: asString(b.dtName ?? b.Name ?? b.name, 'name'), surname: optionalString(b.dtSurname ?? b.Surname ?? b.surname, 'surname'), address: optionalString(b.dtAdresse ?? b.address, 'address'), postalCode: optionalString(b.dtCP ?? b.postalCode, 'postalCode'), city: optionalString(b.dtLieu ?? b.city, 'city'), country: optionalString(b.dtPays ?? b.country, 'country'), associationId: optionalInt(b.fiAssociation ?? b.associationId, 'associationId'), phone: optionalString(b.dtTel ?? b.phone, 'phone'), email: optionalString(b.dtEmail ?? b.email, 'email') }
    );
    return created(reply, { idClient: id });
  });

  app.post('/insertProduit', async (request, reply) => created(reply, await insertProduct(request)));
  app.post('/addProduit', async (request, reply) => created(reply, await insertProduct(request)));
  app.post('/addProduitCompose', async (request, reply) => created(reply, await insertProduct(request, true)));

  app.post('/insertCommande', async (request, reply) => {
    const b = requireObject(request.body);
    const id = await request.server.db.insert(
      `INSERT INTO commande_orders (client_id, due_date, delivery_date, description, delivery_address_id, collect_info, delivery_note, created_by_person_id, active)
       VALUES (:clientId, :dueDate, :deliveryDate, :description, :deliveryAddressId, :collectInfo, :deliveryNote, :createdByPersonId, :active)`,
      { clientId: asInt(b.fiClient ?? b.clientId, 'clientId'), dueDate: b.dtDateTermine ?? b.dueDate ?? null, deliveryDate: b.dtDateLivraison ?? b.deliveryDate ?? null, description: optionalString(b.dtDescriptive ?? b.description, 'description'), deliveryAddressId: optionalInt(b.fiAdresseLivraison ?? b.deliveryAddressId, 'deliveryAddressId'), collectInfo: optionalString(b.dtCommandeCollectInfo ?? b.collectInfo, 'collectInfo'), deliveryNote: optionalString(b.dtBL ?? b.deliveryNote, 'deliveryNote'), createdByPersonId: optionalInt(b.fiPersonal ?? b.createdByPersonId, 'createdByPersonId'), active: b.ONactif === 0 ? 0 : 1 }
    );
    return created(reply, { idCommande: id });
  });

  app.post('/insertProduitCommande', async (request, reply) => {
    const b = requireObject(request.body);
    const id = await request.server.db.insert(
      `INSERT INTO commande_order_positions (order_id, product_id, quantity, created_by_person_id)
       VALUES (:orderId, :productId, :quantity, :createdByPersonId)`,
      { orderId: asInt(b.fiCommande ?? b.orderId, 'orderId'), productId: asInt(b.fiProduit ?? b.productId, 'productId'), quantity: Number(b.dtQuantiteSouhaite ?? b.quantity ?? 1), createdByPersonId: optionalInt(b.fiPersonal ?? b.createdByPersonId, 'createdByPersonId') }
    );
    return created(reply, { idCommandePosition: id });
  });

  app.post('/insertProduitComposition', async (request, reply) => {
    const b = requireObject(request.body);
    await request.server.db.query(
      `INSERT INTO commande_product_components (parent_product_id, component_product_id, quantity)
       VALUES (:parent, :component, :quantity)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
      { parent: asInt(b.fiProduit ?? b.parentProductId, 'parentProductId'), component: asInt(b.fiProduitSub ?? b.componentProductId, 'componentProductId'), quantity: Number(b.dtQuantite ?? b.quantity ?? 1) }
    );
    return created(reply, { ok: true });
  });

  app.post('/updateClient', async (request) => {
    const b = requireObject(request.body);
    await request.server.db.query(
      `UPDATE commande_clients SET name = :name, surname = :surname, address = :address, postal_code = :postalCode, city = :city, country = :country, phone = :phone, email = :email, association_id = :associationId WHERE id = :id`,
      { id: asInt(b.idClient ?? b.id, 'id'), name: asString(b.dtName ?? b.name, 'name'), surname: optionalString(b.dtSurname ?? b.surname, 'surname'), address: optionalString(b.dtAdresse ?? b.address, 'address'), postalCode: optionalString(b.dtCP ?? b.postalCode, 'postalCode'), city: optionalString(b.dtLieu ?? b.city, 'city'), country: optionalString(b.dtPays ?? b.country, 'country'), phone: optionalString(b.dtTel ?? b.phone, 'phone'), email: optionalString(b.dtEmail ?? b.email, 'email'), associationId: optionalInt(b.fiAssociation ?? b.associationId, 'associationId') }
    );
    return { updated: true };
  });

  app.post('/updateCommande', async (request) => {
    const b = requireObject(request.body);
    await request.server.db.query(
      `UPDATE commande_orders SET due_date = :dueDate, delivery_date = :deliveryDate, description = :description, delivery_address_id = :deliveryAddressId, collect_info = :collectInfo, delivery_note = :deliveryNote, created_by_person_id = :createdByPersonId, active = :active WHERE id = :id`,
      { id: asInt(b.idCommande ?? b.id, 'id'), dueDate: b.dtDateTermine ?? b.dueDate ?? null, deliveryDate: b.dtDateLivraison ?? b.deliveryDate ?? null, description: optionalString(b.dtDescriptive ?? b.description, 'description'), deliveryAddressId: optionalInt(b.fiAdresseLivraison ?? b.deliveryAddressId, 'deliveryAddressId'), collectInfo: optionalString(b.dtCommandeCollectInfo ?? b.collectInfo, 'collectInfo'), deliveryNote: optionalString(b.dtBL ?? b.deliveryNote, 'deliveryNote'), createdByPersonId: optionalInt(b.fiPersonal ?? b.createdByPersonId, 'createdByPersonId'), active: b.ONactif === 0 ? 0 : 1 }
    );
    return { updated: true };
  });

  app.post('/updateCommandePosition', async (request) => updatePosition(request));
  app.post('/updateProduction', async (request) => updatePosition(request));
  app.post('/updateProductionCommande', async (request) => updatePosition(request));

  app.post('/updateProduit', async (request) => {
    const b = requireObject(request.body);
    await request.server.db.query(
      `UPDATE commande_products SET description = :description, purchase_price = :purchasePrice, sale_price = :salePrice, vat_code = :vatCode, supplier_id = :supplierId, active = :active, visible = :visible, is_composed = :isComposed, is_variable = :isVariable WHERE id = :id`,
      productPayload(b, asInt(b.idProduit ?? b.id, 'id'))
    );
    return { updated: true };
  });

  app.post('/updateStock', async (request) => {
    const b = requireObject(request.body);
    await request.server.db.query('UPDATE commande_products SET stock_quantity = :stock WHERE id = :id', { id: asInt(b.idProduit ?? b.id, 'id'), stock: Number(b.dtStockProv ?? b.stockQuantity ?? 0) });
    return { updated: true };
  });
  app.post('/addToStock', async (request) => {
    const b = requireObject(request.body);
    await request.server.db.query('UPDATE commande_products SET stock_quantity = stock_quantity + :delta WHERE id = :id', { id: asInt(b.fiProduit ?? b.id, 'id'), delta: Number(b.dtModification ?? b.delta ?? 0) });
    return { updated: true };
  });

  app.post('/deleteProduitComposition', async (request) => deleteProductComposition(request));
  app.delete('/deletePositionForCommande', async (request, reply) => { await deletePosition(request); return deleted(reply); });
  app.post('/deletePositionForCommande', async (request) => { await deletePosition(request); return { deleted: true }; });
  app.post('/deleteCommande', async (request) => { await deleteCommande(request); return { deleted: true }; });
  app.delete('/deletecommande', async (request, reply) => { await deleteCommande(request); return deleted(reply); });

  // Modern aliases.
  app.get('/clients', async (request) => ok((await request.server.db.query('SELECT * FROM commande_clients ORDER BY name ASC'))));
  app.get('/orders', async (request) => ok(await listOrders(request.server.db)));
  app.get('/products', async (request) => ok(await listProducts(request.server.db, true, null)));
}

function productPayload(b, id = undefined, composed = undefined) {
  return {
    ...(id !== undefined ? { id } : {}),
    description: asString(b.dtDescriptive ?? b.description, 'description'),
    purchasePrice: Number(b.dtPrixAchat ?? b.purchasePrice ?? 0),
    salePrice: Number(b.dtPrixVente ?? b.salePrice ?? 0),
    vatCode: optionalString(b.dtCodeMW ?? b.vatCode, 'vatCode', 40),
    supplierId: optionalInt(b.fiFournisseur ?? b.supplierId, 'supplierId'),
    active: b.ONactif === 0 ? 0 : 1,
    visible: b.dtVisible === 0 ? 0 : 1,
    isComposed: composed === undefined ? (b.dtCompose ? 1 : 0) : composed ? 1 : 0,
    isVariable: b.dtVariable ? 1 : 0,
    stock: Number(b.dtStockProv ?? b.stockQuantity ?? 0)
  };
}

async function insertProduct(request, composed = false) {
  const b = requireObject(request.body);
  const p = productPayload(b, undefined, composed);
  const id = await request.server.db.insert(
    `INSERT INTO commande_products (description, purchase_price, sale_price, vat_code, supplier_id, active, visible, is_composed, is_variable, stock_quantity)
     VALUES (:description, :purchasePrice, :salePrice, :vatCode, :supplierId, :active, :visible, :isComposed, :isVariable, :stock)`,
    p
  );
  return { idProduit: id };
}

async function updatePosition(request) {
  const b = requireObject(request.body);
  await request.server.db.query('UPDATE commande_order_positions SET quantity = :quantity, completed_quantity = :completedQuantity WHERE id = :id', {
    id: asInt(b.idCommandePosition ?? b.id, 'id'),
    quantity: Number(b.dtQuantiteSouhaite ?? b.quantity ?? 0),
    completedQuantity: Number(b.dtQuantiteTermine ?? b.completedQuantity ?? b.dtQuantiteSouhaite ?? b.quantity ?? 0)
  });
  return { updated: true };
}

async function deletePosition(request) {
  const id = asInt(request.body?.idCommandePosition ?? request.body?.id ?? request.query.id, 'id');
  await request.server.db.query('DELETE FROM commande_order_positions WHERE id = :id', { id });
}

async function deleteCommande(request) {
  const id = asInt(request.body?.idCommande ?? request.body?.id ?? request.query.id, 'id');
  await request.server.db.query('DELETE FROM commande_orders WHERE id = :id', { id });
}

async function deleteProductComposition(request) {
  const b = requireObject(request.body);
  await request.server.db.query('DELETE FROM commande_product_components WHERE parent_product_id = :parent AND component_product_id = :component', {
    parent: asInt(b.fiProduit ?? b.parentProductId, 'parentProductId'),
    component: asInt(b.fiProduitSub ?? b.componentProductId, 'componentProductId')
  });
  return { deleted: true };
}
