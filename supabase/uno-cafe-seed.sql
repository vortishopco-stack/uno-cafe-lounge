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
-- are populated for every menu item so the customer-facing menu can
-- render fully in either Arabic or English.
-- =============================================

-- ---------- OPTION B: clean old demo data first ----------
-- (Comment these two DELETE lines out if you want to KEEP existing items)
DELETE FROM public.menu_items WHERE category IN ('Burgers','Coffee','Salads','Sides','Desserts','Pastries','Light Bites');
DELETE FROM public.rewards WHERE name IN (
  'Free Espresso','Free Cappuccino','Free French Fries','5 JOD Off Your Order',
  'Free Caesar Salad','Free Classic Burger','Free Dessert','Buy 1 Get 1 Coffee',
  '10 JOD Off Your Order','VIP Experience',
  'Free Butter Croissant','Free Cold Brew','Free Avocado Toast','Free Caramel Macchiato',
  'Lounge VIP Seating','Free Brunch for Two'
);

-- =============================================
-- MENU CATEGORIES (Uno Cafe' Lounge)
-- Insert bilingual display names so the customer filter bar
-- renders correctly in both Arabic and English.
-- =============================================
INSERT INTO public.menu_categories (name, display_name, name_en, name_ar, icon, color, sort_order, visible) VALUES
  ('Coffee',       'Coffee',       'Coffee',       'قهوة',         'Coffee',          'from-amber-700/20 to-yellow-600/20', 0, true),
  ('Pastries',     'Pastries',     'Pastries',     'معجنات',       'Croissant',       'from-amber-500/20 to-orange-500/20', 1, true),
  ('Light Bites',  'Light Bites',  'Light Bites',  'وجبات خفيفة',  'Sandwich',        'from-green-500/20 to-emerald-500/20', 2, true),
  ('Desserts',     'Desserts',     'Desserts',     'حلويات',       'Cake',            'from-pink-500/20 to-rose-500/20',    3, true)
ON CONFLICT (name) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar;

-- =============================================
-- MENU ITEMS (Uno Cafe' Lounge)
-- =============================================
INSERT INTO public.menu_items
  (name, description, name_en, name_ar, description_en, description_ar, price, category) VALUES
  -- Coffee
  ('Espresso',            'Rich and bold single shot of premium espresso',
   'Espresso',            'إسبريسو',
   'Rich and bold single shot of premium espresso',
   'جرعة إسبريسو غنية وقوية من قهوة فاخرة',
   3.50, 'Coffee'),
  ('Americano',           'Espresso diluted with hot water for a smooth cup',
   'Americano',           'أمريكانو',
   'Espresso diluted with hot water for a smooth cup',
   'إسبريسو مخفّف بالماء الساخن لكوبس ناعم',
   4.00, 'Coffee'),
  ('Cappuccino',          'Espresso with steamed milk and velvety foam',
   'Cappuccino',          'كابتشينو',
   'Espresso with steamed milk and velvety foam',
   'إسبريسو مع الحليب المبخّر ورغوة مخمليّة',
   4.75, 'Coffee'),
  ('Latte',               'Espresso with creamy steamed milk and a light foam top',
   'Latte',               'لاتيه',
   'Espresso with creamy steamed milk and a light foam top',
   'إسبريسو مع حليب مبخّر كريمي وطبقة رغوة خفيفة',
   5.25, 'Coffee'),
  ('Flat White',          'Double ristretto with silky microfoam',
   'Flat White',          'فلات وايت',
   'Double ristretto with silky microfoam',
   'ريستريتو مزدوج مع رغوة حريرية دقيقة',
   5.50, 'Coffee'),
  ('Mocha',               'Espresso with Belgian chocolate and steamed milk',
   'Mocha',               'موكا',
   'Espresso with Belgian chocolate and steamed milk',
   'إسبريسو مع شوكولاتة بلجيكية والحليب المبخّر',
   5.75, 'Coffee'),
  ('Turkish Coffee',      'Traditional finely ground coffee brewed in a cezve',
   'Turkish Coffee',      'قهوة تركية',
   'Traditional finely ground coffee brewed in a cezve',
   'قهوة مطحونة ناعمة بشكل تقليدي مُعدة في ركوة',
   4.50, 'Coffee'),
  ('Cold Brew',           'Slow-steeped 18 hours for a smooth, low-acidity cold coffee',
   'Cold Brew',           'كولد برو',
   'Slow-steeped 18 hours for a smooth, low-acidity cold coffee',
   'قهوة باردة منقوعة لمدة 18 ساعة للحصول على طعم ناعم منخفض الحموضة',
   5.50, 'Coffee'),
  ('Iced Latte',          'Chilled espresso with cold milk over ice',
   'Iced Latte',          'آيس لاتيه',
   'Chilled espresso with cold milk over ice',
   'إسبريسو مثلّج مع حليب بارد فوق الثلج',
   5.75, 'Coffee'),
  ('Caramel Macchiato',   'Vanilla, steamed milk, espresso and a caramel drizzle',
   'Caramel Macchiato',   'كراميل ماكياتو',
   'Vanilla, steamed milk, espresso and a caramel drizzle',
   'فانيليا وحليب مبخّر وإسبريسو مع طبقة من الكراميل',
   6.25, 'Coffee'),
  -- Pastries
  ('Butter Croissant',    'Flaky, buttery French-style croissant',
   'Butter Croissant',    'كرواسون بالزبدة',
   'Flaky, buttery French-style croissant',
   'كرواسون فرنسي متقشر بالزبدة',
   3.25, 'Pastries'),
  ('Pain au Chocolat',    'Croissant pastry with rich dark chocolate',
   'Pain au Chocolat',    'بان أو شوكولا',
   'Croissant pastry with rich dark chocolate',
   'معجّنة كرواسون مع شوكولاتة داكنة غنية',
   3.75, 'Pastries'),
  ('Blueberry Muffin',    'Soft muffin loaded with fresh blueberries',
   'Blueberry Muffin',    'كعكة التوت الأزرق',
   'Soft muffin loaded with fresh blueberries',
   'كعكة طرية محشوة بالتوت الأزرق الطازج',
   3.50, 'Pastries'),
  ('Cinnamon Roll',       'Warm roll swirled with cinnamon and cream cheese glaze',
   'Cinnamon Roll',       'لفائف القرفة',
   'Warm roll swirled with cinnamon and cream cheese glaze',
   'لفائف دافئة مع القرفة وتغليفة جبن الكريم',
   4.25, 'Pastries'),
  ('Banana Bread',        'Moist banana bread slice, lightly toasted',
   'Banana Bread',        'كعكة الموز',
   'Moist banana bread slice, lightly toasted',
   'شريحة كعكة الموز الطرية محمّصة قليلاً',
   3.50, 'Pastries'),
  -- Light Bites
  ('Avocado Toast',       'Smashed avocado on sourdough with chili flakes and lime',
   'Avocado Toast',       'توست الأفوكادو',
   'Smashed avocado on sourdough with chili flakes and lime',
   'أفوكادو مهروس على خبز سوردو مع رقائق الفلفل والليمون',
   8.50, 'Light Bites'),
  ('Club Sandwich',       'Triple-decker turkey, bacon, lettuce and tomato',
   'Club Sandwich',       'ساندويتش كلوب',
   'Triple-decker turkey, bacon, lettuce and tomato',
   'ساندويتش ثلاثي الطبقات بالديك الرومي واللحم المقدد والخس والطماطم',
   9.75, 'Light Bites'),
  ('Caesar Salad',        'Romaine, croutons, parmesan and classic caesar dressing',
   'Caesar Salad',        'سلطة سيزر',
   'Romaine, croutons, parmesan and classic caesar dressing',
   'خس روماني ومكسرات الخبز والبارميزان مع صوص سيزر الكلاسيكي',
   8.25, 'Light Bites'),
  ('Tomato Basil Soup',   'Creamy roasted tomato soup with fresh basil',
   'Tomato Basil Soup',   'شوربة الطماطم والريحان',
   'Creamy roasted tomato soup with fresh basil',
   'شوربة طماطم مشوية كريمية مع الريحان الطازج',
   6.50, 'Light Bites'),
  ('Margherita Flatbread','Flatbread with tomato, mozzarella and fresh basil',
   'Margherita Flatbread','خبز مارغريتا',
   'Flatbread with tomato, mozzarella and fresh basil',
   'خبز مسطح بالطماطم والموزاريلا والريحان الطازج',
   9.50, 'Light Bites'),
  -- Desserts
  ('Tiramisu',            'Coffee-soaked ladyfingers layered with mascarpone',
   'Tiramisu',            'تيراميسو',
   'Coffee-soaked ladyfingers layered with mascarpone',
   'أصابع سيدة منقوعة بالقهوة بطبقات الماسكاربوني',
   5.50, 'Desserts'),
  ('New York Cheesecake', 'Classic dense and creamy cheesecake with berry coulis',
   'New York Cheesecake', 'تشيز كيك نيويوركي',
   'Classic dense and creamy cheesecake with berry coulis',
   'تشيز كيك كلاسيكي كثيف وكريمي مع صوص التوت',
   5.25, 'Desserts'),
  ('Chocolate Lava Cake', 'Warm cake with a molten chocolate center',
   'Chocolate Lava Cake', 'كيك الشوكولاتة البركاني',
   'Warm cake with a molten chocolate center',
   'كيك دافئ بقلب من الشوكولاتة الذائبة',
   5.75, 'Desserts'),
  ('Baklava',             'Layered filo with nuts and honey syrup',
   'Baklava',             'بقلاوة',
   'Layered filo with nuts and honey syrup',
   'طبقات عجينة الفيلو بالمكسرات وشراب العسل',
   4.75, 'Desserts')
ON CONFLICT DO NOTHING;

-- =============================================
-- REWARDS (Uno Cafe' Lounge)
-- =============================================
INSERT INTO public.rewards
  (name, description, name_en, name_ar, description_en, description_ar, points_cost) VALUES
  ('Free Espresso',           'Enjoy a free single espresso on us!',
   'Free Espresso',           'إسبريسو مجاني',
   'Enjoy a free single espresso on us!',
   'استمتع بإسبريسو مفرد مجاني منّا!',
   100),
  ('Free Cappuccino',         'A complimentary cappuccino, made just for you',
   'Free Cappuccino',         'كابتشينو مجاني',
   'A complimentary cappuccino, made just for you',
   'كابتشينو مجاني على حسابنا، مُحضّر خصيصاً لك',
   150),
  ('Free Butter Croissant',   'Fresh flaky croissant for free',
   'Free Butter Croissant',   'كرواسون بالزبدة مجاني',
   'Fresh flaky croissant for free',
   'كرواسون متقشر طازج مجاناً',
   120),
  ('Buy 1 Get 1 Coffee',      'Get two coffees for the price of one',
   'Buy 1 Get 1 Coffee',      'اشترِ واحدًا واحصل على قهوة مجانية',
   'Get two coffees for the price of one',
   'احصل على قهوتين بسعر قهوة واحدة',
   180),
  ('Free Cold Brew',          'Smooth 18-hour cold brew on the house',
   'Free Cold Brew',          'كولد برو مجاني',
   'Smooth 18-hour cold brew on the house',
   'قهوة باردة منقوعة 18 ساعة ناعمة على حسابنا',
   220),
  ('Free Avocado Toast',      'Our signature avocado toast for free',
   'Free Avocado Toast',      'توست الأفوكادو مجاني',
   'Our signature avocado toast for free',
   'توست الأفوكادو المميز لدينا مجاناً',
   300),
  ('Free Dessert',            'Choose any dessert from our menu',
   'Free Dessert',            'حلى مجاني',
   'Choose any dessert from our menu',
   'اختر أي حلى من قائمتنا',
   300),
  ('5 JOD Off Your Order',       'Get 5 JOD discount on any order',
   '5 JOD Off Your Order',       'خصم 5 د.أ على طلبك',
   'Get 5 JOD discount on any order',
   'احصل على خصم 5 د.أ على أي طلب',
   250),
  ('Free Caramel Macchiato',  'Our premium caramel macchiato, complimentary',
   'Free Caramel Macchiato',  'كراميل ماكياتو مجاني',
   'Our premium caramel macchiato, complimentary',
   'كراميل ماكياتو الفاخر لدينا، مجاناً',
   350),
  ('10 JOD Off Your Order',      'Get 10 JOD discount on any order',
   '10 JOD Off Your Order',      'خصم 10 د.أ على طلبك',
   'Get 10 JOD discount on any order',
   'احصل على خصم 10 د.أ على أي طلب',
   500),
  ('Lounge VIP Seating',      'Priority seating in our VIP lounge + free appetizer',
   'Lounge VIP Seating',      'مقعد VIP في الصالة',
   'Priority seating in our VIP lounge + free appetizer',
   'مقعد أولوية في صالة VIP + مقبلات مجانية',
   750),
  ('Free Brunch for Two',     'Complimentary brunch for two at Uno Cafe Lounge',
   'Free Brunch for Two',     'برنش مجاني لشخصين',
   'Complimentary brunch for two at Uno Cafe Lounge',
   'برنش مجاني لشخصين في Uno Cafe Lounge',
   1500)
ON CONFLICT DO NOTHING;
