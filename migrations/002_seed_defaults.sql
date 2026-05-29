INSERT IGNORE INTO meal_choices (code, label_lb, label_fr, short_label, is_no_meal, sort_order) VALUES
  ('menu', 'Menu', 'Menu', 'Menu', 0, 10),
  ('alternative_1', 'Alternativ 1', 'Alternative 1', 'Al1', 0, 20),
  ('alternative_2', 'Alternativ 2', 'Alternative 2', 'Al2', 0, 30),
  ('sandwich', 'Bréitchen', 'Sandwich', 'Br', 0, 40),
  ('holiday', 'Congé / Feierdag', 'Congé / jour férié', 'Congé', 1, 90),
  ('none', 'Näischt', 'Rien', 'Rien', 1, 100);

INSERT IGNORE INTO settings (`key`, value_json) VALUES
  ('kitchen_email', '""'),
  ('registration_opening_weekday', '1'),
  ('frontend_display', '{"theme":"system","help":true}'),
  ('SERVICE_PLANG', '{}'),
  ('VERSION', '1'),
  ('MANUALUPDATE', '0');
