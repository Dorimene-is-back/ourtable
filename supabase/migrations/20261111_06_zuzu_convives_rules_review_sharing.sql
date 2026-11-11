-- A private review is shared with the people at the author's tables (reviews belong to the person,
-- not to one table). Reviews imported before anyone had an account stay visible to their table.
alter policy "read public reviews, your own and your kitchen's" on public.reviews
  using (is_public or user_id = (select auth.uid()) or (user_id is not null and private.shares_kitchen(user_id))
         or (kitchen_id is not null and private.is_member(kitchen_id)));

-- Zuzu's convives and house rules, as given in the planning conversations so far.
do $$
declare
  k uuid := (select value::uuid from private.settings where key = 'import_kitchen_id');
begin
  if exists (select 1 from public.convives where kitchen_id = k) then return; end if;
  insert into public.convives (kitchen_id, name, kind, likes, dislikes, notes, sort_order) values
    (k, 'Adult', 'adult',
     'bold flavours, spicy food, Mediterranean ingredients, all cuisines; falafel, halloumi, burrata, lentils, chickpeas, canned tuna, anchovies, charcuterie; dressings: tahini, balsamic and olive oil, lemon and herbs, miso and soy, fish sauce, yoghurt, sharp vinaigrettes',
     'organ meats, smoked food, raw meat or tartare, fennel, cauliflower in salads',
     'Limit lamb and prawns. Likes a mix of light, fresh meals and comforting ones.', 0),
    (k, 'Kid 1', 'child',
     'fish, fruit, crispy and fried food, black olives, prawns, cherry tomatoes',
     'creamy textures',
     'The adventurous one. Mild food only.', 1),
    (k, 'Kid 2', 'child',
     'meat, pasta',
     '',
     'The pickier one. Mild food only.', 2);

  insert into public.house_rules (kitchen_id, body) values (k,
'- Singapore household. Up to 1 hour of active cooking on weeknights; oven or passive time is fine.
- Never: pasta al burro, mushrooms, tofu, frisée, radishes (swap for cucumber), organ meats, smoked ingredients, obvious egg dishes, quinoa, dill, parsley, purées. Coconut milk is fine when authentic.
- Chicken thighs arrive untrimmed here: use chicken breast.
- Kids share: chicken, beef, pork, white fish, salmon, hidden eggs. Carbs: pasta or noodles, rice, bread or wraps, potatoes; lentils and couscous gradually. Vegetables: cucumber, carrots, broccoli, corn, peas; hide or crisp the others. Parmesan helps.
- Spice: the adult likes it hot; the kids always get a mild version, heat on the side.
- A normal school week is Monday to Friday dinners with at least one fish meal, two adult salads, one Asian dish and one comforting dish. Every kids'' dinner has a protein, Friday included. No dessert unless asked.
- School holiday weeks: batch cook, prep earlier, cover lunch and dinner efficiently.
- At least 6 weeks before a dish comes back; 4 weeks for 5-star dishes.
- Recipes come from sites of the cuisine''s own country (French: Marmiton, 750g, Papilles & Pupilles; Italian: Giallo Zafferano, Sale & Pepe; Greek: Akis; Korean: Maangchi; Japanese: Just One Cookbook; Vietnamese: Vicky Pham; Chinese: Woks of Life; Thai: Pailin''s Kitchen; Mexican: Pati Jinich; Lebanese: Maureen Abood; Indian: Hebbars Kitchen). Never Vanilla Bean Cuisine.
- Desserts when asked: chocolate, fruit tarts or crumbles, crêpes. Crumble is the French kind: more butter, no oats, hardly any spice.
- Retired: Pasta alla Norma, DIY beef tacos, tuna and white bean salad, cabillaud à la bordelaise, pasta with anchovies and sun-dried tomatoes, chicken teriyaki with pasta al pomodoro. Pasta al Pistacchio was too dry: find another kids'' pasta.
- Gyudon: ribeye only, 60 to 90 seconds, never reheated. Karaage needs a dip. Chèvre chaud: small croûton on the salad, plenty of cheese.
- School: term ends 4 December 2026; holidays 7 December to 8 January; term starts 11 January 2027. Public holiday: 25 December.');
end $$;
