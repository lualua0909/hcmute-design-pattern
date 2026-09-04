-- Demo data for PokeShop
-- cat_products / inv_stock rows generated from data-seed.json.
-- image_url = the card's "image" field (product thumbnail).
INSERT IGNORE INTO cat_categories (id, name, slug) VALUES
 (1,'Booster Pack','booster-pack'),
 (2,'Single Card','single-card'),
 (3,'Elite Trainer Box','elite-trainer-box'),
 (4,'Accessories','accessories');

INSERT INTO cat_products (id, sku, name, slug, description, image_url, price, category_id, rarity, card_set, status) VALUES
 (1,'PKM-31506','Pikachu','pikachu-55','Common Pokémon card from Ascended Heroes. 70 HP. art by kamonabe. ASC 55.','https://images.tcggo.com/tcggo/storage/32001/pikachu-asc-55-ascended-heroes.png',0.21,2,'common','Ascended Heroes','published'),
 (2,'PKM-31508','Pikachu ex','pikachu-ex-57','Double Rare Pokémon card from Ascended Heroes. 200 HP. art by aky CG Works. ASC 57.','https://images.tcggo.com/tcggo/storage/31743/pikachu-ex-asc-57-ascended-heroes.png',3.33,2,'rare','Ascended Heroes','published'),
 (3,'PKM-31727','Pikachu ex','pikachu-ex-276','Special Illustration Rare Pokémon card from Ascended Heroes. 200 HP. art by booota. ASC 276.','https://images.tcggo.com/tcggo/storage/31939/pikachu-ex-asc-276-ascended-heroes.png',882.97,2,'secret_rare','Ascended Heroes','published'),
 (4,'PKM-31728','Pikachu ex','pikachu-ex-277','Special Illustration Rare Pokémon card from Ascended Heroes. 200 HP. art by James Turner. ASC 277.','https://images.tcggo.com/tcggo/storage/31958/pikachu-ex-asc-277-ascended-heroes.png',285.73,2,'secret_rare','Ascended Heroes','published'),
 (5,'PKM-33669','Pikachu at the Museum','pikachu-at-the-museum-mep','Oversized card from MEP Black Star Promos. art by Naoyo Kimura. MEP.','https://images.tcggo.com/tcggo/storage/36914/pikachu-at-the-museum-mep-mep-mep-black-star-promos.png',17.00,2,'rare','MEP Black Star Promos','published'),
 (6,'PKM-48518','Pikachu','pikachu-mep-093','Promo card from MEP Black Star Promos. art by DOM. MEP 093.','https://images.tcggo.com/tcggo/storage/36762/pikachu-mep-mep-093-mep-black-star-promos.png',10.00,2,'uncommon','MEP Black Star Promos','published'),
 (7,'PKM-48519','Pikachu','pikachu-mep-093-48519','Promo card from MEP Black Star Promos. art by DOM. MEP 093.','https://images.tcggo.com/tcggo/storage/36763/pikachu-mep-mep-093-mep-black-star-promos.png',130.00,2,'uncommon','MEP Black Star Promos','published'),
 (8,'PKM-48552','Pikachu ex','pikachu-ex-mep-107','Promo card from MEP Black Star Promos. art by YOSHIROTTEN. MEP 107.','https://images.tcggo.com/tcggo/storage/36796/pikachu-ex-mep-mep-107-mep-black-star-promos.png',9.99,2,'uncommon','MEP Black Star Promos','published'),
 (9,'PKM-48554','Pikachu ex','pikachu-ex-mep-109','Promo card from MEP Black Star Promos. art by YOSHIROTTEN. MEP 109.','https://images.tcggo.com/tcggo/storage/36798/pikachu-ex-mep-mep-109-mep-black-star-promos.png',9.99,2,'uncommon','MEP Black Star Promos','published'),
 (10,'PKM-21421','Pikachu ex','pikachu-ex-28','Double Rare Pokémon card from Prismatic Evolutions. 190 HP. art by N-DESIGN Inc.. PRE 28.','https://images.tcggo.com/tcggo/storage/21443/pikachu-ex-pre-28-prismatic-evolutions.png',2.14,2,'rare','Prismatic Evolutions','published'),
 (11,'PKM-21572','Pikachu ex','pikachu-ex-179','Hyper Rare Pokémon card from Prismatic Evolutions. 200 HP. art by aky CG Works. PRE 179.','https://images.tcggo.com/tcggo/storage/21594/pikachu-ex-pre-179-prismatic-evolutions.png',52.19,2,'secret_rare','Prismatic Evolutions','published'),
 (12,'PKM-20845','Pikachu ex','pikachu-ex-57-20845','Double Rare Pokémon card from Surging Sparks. 200 HP. art by aky CG Works. SSP 57.','https://images.tcggo.com/tcggo/storage/21011/pikachu-ex-ssp-57-surging-sparks.png',4.05,2,'rare','Surging Sparks','published'),
 (13,'PKM-21007','Pikachu ex','pikachu-ex-219','Ultra Rare Pokémon card from Surging Sparks. 200 HP. art by aky CG Works. SSP 219.','https://images.tcggo.com/tcggo/storage/21170/pikachu-ex-ssp-219-surging-sparks.png',25.56,2,'ultra_rare','Surging Sparks','published'),
 (14,'PKM-21026','Pikachu ex','pikachu-ex-238','Special Illustration Rare Pokémon card from Surging Sparks. 200 HP. art by GIDORA. SSP 238.','https://images.tcggo.com/tcggo/storage/21188/pikachu-ex-ssp-238-surging-sparks.png',246.83,2,'secret_rare','Surging Sparks','published'),
 (15,'PKM-21035','Pikachu ex','pikachu-ex-247','Hyper Rare Pokémon card from Surging Sparks. 200 HP. art by aky CG Works. SSP 247.','https://images.tcggo.com/tcggo/storage/21197/pikachu-ex-ssp-247-surging-sparks.png',77.06,2,'secret_rare','Surging Sparks','published'),
 (16,'PKM-1805','Pikachu','pikachu-51','Common Pokémon card from Temporal Forces. 70 HP. art by kodama. TEF 51.','https://images.tcggo.com/tcggo/storage/21357/pikachu-tef-51-temporal-forces.png',0.54,2,'common','Temporal Forces','published'),
 (17,'PKM-1980','Pikachu','pikachu-18','Common Pokémon card from Paldean Fates. 70 HP. art by OKACHEKE. PAF 18.','https://images.tcggo.com/tcggo/storage/1990/pikachu-paf-18-paldean-fates-pokemon.png',0.36,2,'common','Paldean Fates','published'),
 (18,'PKM-2105','Pikachu','pikachu-131','Shiny Rare Pokémon card from Paldean Fates. 70 HP. art by Yuu Nishida. PAF 131.','https://images.tcggo.com/tcggo/storage/2115/pikachu-paf-131-paldean-fates-pokemon.png',67.21,2,'ultra_rare','Paldean Fates','published'),
 (19,'PKM-2494','Pikachu','pikachu-25','Common Pokémon card from 151. 60 HP. art by Naoyo Kimura. MEW 25.','https://images.tcggo.com/tcggo/storage/2508/pikachu-mew-25-151-pokemon.png',1.10,2,'common','151','published'),
 (20,'PKM-2635','Pikachu','pikachu-173','Illustration Rare Pokémon card from 151. 60 HP. art by Hiroyuki Yamamoto. MEW 173.','https://images.tcggo.com/tcggo/storage/2649/pikachu-mew-173-151-pokemon.png',72.37,2,'holo_rare','151','published')
ON DUPLICATE KEY UPDATE
  sku=VALUES(sku), name=VALUES(name), slug=VALUES(slug), description=VALUES(description),
  image_url=VALUES(image_url), price=VALUES(price), category_id=VALUES(category_id),
  rarity=VALUES(rarity), card_set=VALUES(card_set), status=VALUES(status);

INSERT INTO inv_stock (product_id, sku, on_hand, reserved) VALUES
 (1,'PKM-31506',400,0),
 (2,'PKM-31508',60,0),
 (3,'PKM-31727',6,0),
 (4,'PKM-31728',6,0),
 (5,'PKM-33669',60,0),
 (6,'PKM-48518',150,0),
 (7,'PKM-48519',150,0),
 (8,'PKM-48552',150,0),
 (9,'PKM-48554',150,0),
 (10,'PKM-21421',60,0),
 (11,'PKM-21572',6,0),
 (12,'PKM-20845',60,0),
 (13,'PKM-21007',15,0),
 (14,'PKM-21026',6,0),
 (15,'PKM-21035',6,0),
 (16,'PKM-1805',400,0),
 (17,'PKM-1980',400,0),
 (18,'PKM-2105',15,0),
 (19,'PKM-2494',400,0),
 (20,'PKM-2635',30,0)
ON DUPLICATE KEY UPDATE sku=VALUES(sku), on_hand=VALUES(on_hand);
