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
--
-- Bilingual columns (name_en/name_ar/description_en/description_ar)
-- are populated for every menu item and reward so the customer-facing
-- menu renders fully in either Arabic or English.
-- =============================================

-- ---------- OPTION B: clean old demo data first ----------
-- (Comment these two DELETE lines out if you want to KEEP existing items)
DELETE FROM public.menu_items WHERE category IN ('Burgers','Coffee','Salads','Sides','Desserts');
DELETE FROM public.rewards WHERE name IN (
  'Free Espresso','Free Cappuccino','Free French Fries','5 JOD Off Your Order',
  'Free Caesar Salad','Free Classic Burger','Free Dessert','Buy 1 Get 1 Coffee',
  '10 JOD Off Your Order','VIP Experience'
);

-- =============================================
-- MENU CATEGORIES (Uno Cafe' Lounge)
-- =============================================
INSERT INTO public.menu_categories (name, display_name, name_en, name_ar, icon, color, sort_order, visible) VALUES
  ('Main',     'Main',     'Main',     'رئيسي',     'UtensilsCrossed', 'from-amber-500/20 to-orange-500/20',  0, true),
  ('Burgers',  'Burgers',  'Burgers',  'برغر',      'Beef',            'from-amber-500/20 to-orange-500/20',  1, true),
  ('Coffee',   'Coffee',   'Coffee',   'قهوة',      'Coffee',          'from-amber-700/20 to-yellow-600/20', 2, true),
  ('Salads',   'Salads',   'Salads',   'سلطات',     'Salad',           'from-green-500/20 to-emerald-500/20', 3, true),
  ('Sides',    'Sides',    'Sides',    'إضافات',    'Flame',           'from-orange-500/20 to-red-500/20',    4, true),
  ('Desserts', 'Desserts', 'Desserts', 'حلويات',    'Cake',            'from-pink-500/20 to-rose-500/20',     5, true)
ON CONFLICT (name) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar;

-- =============================================
-- MENU ITEMS (Uno Cafe' Lounge)
-- =============================================
INSERT INTO public.menu_items
  (name, description, name_en, name_ar, description_en, description_ar, price, category) VALUES
  -- Burgers
  ('Classic Burger', 'Juicy beef patty with lettuce, tomato, and special sauce',
   'Classic Burger', 'برغر كلاسيكي',
   'Juicy beef patty with lettuce, tomato, and special sauce',
   'قطعة لحم بقري شهية مع الخس والطماطم والصوص الخاص',
   12.99, 'Burgers'),
  ('Cheese Burger', 'Classic burger with melted cheddar cheese',
   'Cheese Burger', 'برغر بالجبن',
   'Classic burger with melted cheddar cheese',
   'برغر كلاسيكي مع جبن الشيدر الذائب',
   14.99, 'Burgers'),
  ('Bacon Burger', 'Classic burger with crispy bacon strips',
   'Bacon Burger', 'برغر باللحم المقدد',
   'Classic burger with crispy bacon strips',
   'برغر كلاسيكي مع شرائح اللحم المقدد المقرمشة',
   16.99, 'Burgers'),
  ('Veggie Burger', 'Plant-based patty with fresh vegetables',
   'Veggie Burger', 'برغر نباتي',
   'Plant-based patty with fresh vegetables',
   'قطعة نباتية مع خضار طازجة',
   13.99, 'Burgers'),
  -- Coffee
  ('Espresso', 'Rich and bold single shot espresso',
   'Espresso', 'إسبريسو',
   'Rich and bold single shot espresso',
   'جرعة إسبريسو غنية وقوية',
   4.99, 'Coffee'),
  ('Cappuccino', 'Espresso with steamed milk foam',
   'Cappuccino', 'كابتشينو',
   'Espresso with steamed milk foam',
   'إسبريسو مع رغوة الحليب المبخّر',
   5.99, 'Coffee'),
  ('Latte', 'Espresso with steamed milk',
   'Latte', 'لاتيه',
   'Espresso with steamed milk',
   'إسبريسو مع الحليب المبخّر',
   6.49, 'Coffee'),
  ('Mocha', 'Espresso with chocolate and steamed milk',
   'Mocha', 'موكا',
   'Espresso with chocolate and steamed milk',
   'إسبريسو مع الشوكولاتة والحليب المبخّر',
   6.99, 'Coffee'),
  -- Salads
  ('Caesar Salad', 'Fresh romaine with caesar dressing and croutons',
   'Caesar Salad', 'سلطة سيزر',
   'Fresh romaine with caesar dressing and croutons',
   'خس روماني طازج مع صوص سيزر والخبز المحمّص',
   10.99, 'Salads'),
  ('Greek Salad', 'Mixed greens with feta and olives',
   'Greek Salad', 'سلطة يونانية',
   'Mixed greens with feta and olives',
   'خضار ورقية مشكّلة مع جبن الفيتا والزيتون',
   9.99, 'Salads'),
  -- Sides
  ('French Fries', 'Crispy golden fries with sea salt',
   'French Fries', 'بطاطس مقلية',
   'Crispy golden fries with sea salt',
   'بطاطس ذهبية مقرمشة مع ملح البحر',
   5.99, 'Sides'),
  ('Onion Rings', 'Beer-battered onion rings',
   'Onion Rings', 'حلقات البصل',
   'Beer-battered onion rings',
   'حلقات البصل المقلية بعجينة البيرة',
   6.99, 'Sides'),
  -- Desserts
  ('Chocolate Cake', 'Rich chocolate layer cake',
   'Chocolate Cake', 'كيك الشوكولاتة',
   'Rich chocolate layer cake',
   'كيك طبقات الشوكولاتة الغنية',
   8.99, 'Desserts'),
  ('Cheesecake', 'New York style cheesecake',
   'Cheesecake', 'تشيز كيك',
   'New York style cheesecake',
   'تشيز كيك على الطريقة النيويوركية',
   7.99, 'Desserts')
ON CONFLICT DO NOTHING;

-- =============================================
-- REWARDS (Uno Cafe' Lounge)
-- =============================================
INSERT INTO public.rewards
  (name, description, name_en, name_ar, description_en, description_ar, points_cost) VALUES
  ('Free Espresso',           'Enjoy a free espresso on us!',
   'Free Espresso',           'إسبريسو مجاني',
   'Enjoy a free espresso on us!',
   'استمتع بإسبريسو مجاني منّا!',
   100),
  ('Free Cappuccino',         'A complimentary cappuccino',
   'Free Cappuccino',         'كابتشينو مجاني',
   'A complimentary cappuccino',
   'كابتشينو مجاني على حسابنا',
   150),
  ('Free French Fries',       'Crispy fries for free',
   'Free French Fries',       'بطاطس مقلية مجانية',
   'Crispy fries for free',
   'بطاطس مقلية مقرمشة مجاناً',
   200),
  ('5 JOD Off Your Order',    'Get 5 JOD discount on any order',
   '5 JOD Off Your Order',    'خصم 5 د.أ على طلبك',
   'Get 5 JOD discount on any order',
   'احصل على خصم 5 د.أ على أي طلب',
   250),
  ('Free Caesar Salad',       'Fresh caesar salad on the house',
   'Free Caesar Salad',       'سلطة سيزر مجانية',
   'Fresh caesar salad on the house',
   'سلطة سيزر طازجة على حسابنا',
   350),
  ('Free Classic Burger',     'Our signature burger for free',
   'Free Classic Burger',     'برغر كلاسيكي مجاني',
   'Our signature burger for free',
   'برغرنا المميز مجاناً',
   500),
  ('Free Dessert',            'Choose any dessert from our menu',
   'Free Dessert',            'حلى مجاني',
   'Choose any dessert from our menu',
   'اختر أي حلى من قائمتنا',
   300),
  ('Buy 1 Get 1 Coffee',      'Get two coffees for the price of one',
   'Buy 1 Get 1 Coffee',      'اشترِ واحدًا واحصل على قهوة مجانية',
   'Get two coffees for the price of one',
   'احصل على قهوتين بسعر قهوة واحدة',
   180),
  ('10 JOD Off Your Order',   'Get 10 JOD discount on any order',
   '10 JOD Off Your Order',   'خصم 10 د.أ على طلبك',
   'Get 10 JOD discount on any order',
   'احصل على خصم 10 د.أ على أي طلب',
   500),
  ('VIP Experience',          'Priority seating + free appetizer',
   'VIP Experience',          'تجربة VIP',
   'Priority seating + free appetizer',
   'مقعد أولوية + مقبلات مجانية',
   1000)
ON CONFLICT DO NOTHING;
