-- One-off cleanup when moving from the old Pokémon catalogue to the sports catalogue.
-- cat_products changed shape (rarity/card_set -> gender/sport), so the catalogue
-- tables are dropped and rebuilt by init.sql. Orders and users are left untouched.
DROP TABLE IF EXISTS cat_products;
DROP TABLE IF EXISTS cat_categories;
DELETE FROM inv_stock;
DELETE FROM inv_movements;
DELETE FROM inv_reservations;
DELETE FROM ana_sales_facts;
DELETE FROM ana_daily_rollup;
