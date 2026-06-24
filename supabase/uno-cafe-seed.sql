-- =============================================
-- Uno Cafe' Lounge - Menu & Rewards Seed Data
-- =============================================
-- HOW TO USE:
--   Option A (fresh setup): Replace the "Menu Items" and "Rewards"
--     INSERT blocks at the BOTTOM of supabase/schema.sql with the
--     blocks below, then run schema.sql in the Supabase SQL Editor.
--
--   Option B (existing project, keep schema): Run this whole file
--     in the Supabase SQL Editor. It first clears the old demo
--     menu/rewards, then inserts the Uno Cafe items.
--     (Safe to re-run — uses ON CONFLICT DO NOTHING.)
-- =============================================

-- ---------- OPTION B: clean old demo data first ----------
-- (Comment these two DELETE lines out if you want to KEEP existing items)
DELETE FROM public.menu_items WHERE category IN ('Burgers','Coffee','Salads','Sides','Desserts');
DELETE FROM public.rewards WHERE name IN (
  'Free Espresso','Free Cappuccino','Free French Fries','$5 Off Your Order',
  'Free Caesar Salad','Free Classic Burger','Free Dessert','Buy 1 Get 1 Coffee',
  '$10 Off Your Order','VIP Experience'
);

-- =============================================
-- MENU ITEMS (Uno Cafe' Lounge)
-- =============================================
INSERT INTO public.menu_items (name, description, price, category) VALUES
  -- Coffee
  ('Espresso',            'Rich and bold single shot of premium espresso',              3.50, 'Coffee'),
  ('Americano',           'Espresso diluted with hot water for a smooth cup',           4.00, 'Coffee'),
  ('Cappuccino',          'Espresso with steamed milk and velvety foam',                4.75, 'Coffee'),
  ('Latte',               'Espresso with creamy steamed milk and a light foam top',     5.25, 'Coffee'),
  ('Flat White',          'Double ristretto with silky microfoam',                      5.50, 'Coffee'),
  ('Mocha',               'Espresso with Belgian chocolate and steamed milk',           5.75, 'Coffee'),
  ('Turkish Coffee',      'Traditional finely ground coffee brewed in a cezve',         4.50, 'Coffee'),
  ('Cold Brew',           'Slow-steeped 18 hours for a smooth, low-acidity cold coffee',5.50, 'Coffee'),
  ('Iced Latte',          'Chilled espresso with cold milk over ice',                   5.75, 'Coffee'),
  ('Caramel Macchiato',   'Vanilla, steamed milk, espresso and a caramel drizzle',      6.25, 'Coffee'),
  -- Pastries
  ('Butter Croissant',    'Flaky, buttery French-style croissant',                      3.25, 'Pastries'),
  ('Pain au Chocolat',    'Croissant pastry with rich dark chocolate',                  3.75, 'Pastries'),
  ('Blueberry Muffin',    'Soft muffin loaded with fresh blueberries',                  3.50, 'Pastries'),
  ('Cinnamon Roll',       'Warm roll swirled with cinnamon and cream cheese glaze',     4.25, 'Pastries'),
  ('Banana Bread',        'Moist banana bread slice, lightly toasted',                  3.50, 'Pastries'),
  -- Light Bites
  ('Avocado Toast',       'Smashed avocado on sourdough with chili flakes and lime',    8.50, 'Light Bites'),
  ('Club Sandwich',       'Triple-decker turkey, bacon, lettuce and tomato',            9.75, 'Light Bites'),
  ('Caesar Salad',        'Romaine, croutons, parmesan and classic caesar dressing',    8.25, 'Light Bites'),
  ('Tomato Basil Soup',   'Creamy roasted tomato soup with fresh basil',                6.50, 'Light Bites'),
  ('Margherita Flatbread','Flatbread with tomato, mozzarella and fresh basil',          9.50, 'Light Bites'),
  -- Desserts
  ('Tiramisu',            'Coffee-soaked ladyfingers layered with mascarpone',          5.50, 'Desserts'),
  ('New York Cheesecake', 'Classic dense and creamy cheesecake with berry coulis',      5.25, 'Desserts'),
  ('Chocolate Lava Cake', 'Warm cake with a molten chocolate center',                   5.75, 'Desserts'),
  ('Baklava',             'Layered filo with nuts and honey syrup',                     4.75, 'Desserts')
ON CONFLICT DO NOTHING;

-- =============================================
-- REWARDS (Uno Cafe' Lounge)
-- =============================================
INSERT INTO public.rewards (name, description, points_cost) VALUES
  ('Free Espresso',           'Enjoy a free single espresso on us!',                      100),
  ('Free Cappuccino',         'A complimentary cappuccino, made just for you',            150),
  ('Free Butter Croissant',   'Fresh flaky croissant for free',                           120),
  ('Buy 1 Get 1 Coffee',      'Get two coffees for the price of one',                     180),
  ('Free Cold Brew',          'Smooth 18-hour cold brew on the house',                    220),
  ('Free Avocado Toast',      'Our signature avocado toast for free',                     300),
  ('Free Dessert',            'Choose any dessert from our menu',                         300),
  ('$5 Off Your Order',       'Get $5 discount on any order',                             250),
  ('Free Caramel Macchiato',  'Our premium caramel macchiato, complimentary',             350),
  ('$10 Off Your Order',      'Get $10 discount on any order',                            500),
  ('Lounge VIP Seating',      'Priority seating in our VIP lounge + free appetizer',      750),
  ('Free Brunch for Two',     'Complimentary brunch for two at Uno Cafe Lounge',         1500)
ON CONFLICT DO NOTHING;
