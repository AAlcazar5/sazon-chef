// ROADMAP 4.0 Tier T-bis "loose-end: ≥1500 recipes" — world-tour backlog fill.
//
// Adds 130 hand-curated dinners across 13 underrepresented cuisines
// (each previously at 11 recipes from earlier seeding). Idempotent
// upsert by deterministic id `worldtour-<cuisine>-<n>`. Pure data
// builder exported for testability.

import { PrismaClient } from '@prisma/client';

export interface WorldTourRecipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  canonicalCuisine: string;
  mealType: string;
  cookTime: number;
  servings: number;
  difficulty: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: string[];
  instructions: string[];
}

interface DishSpec {
  title: string;
  desc: string;
  cookTime: number;
  cal: number;
  pro: number;
  carb: number;
  fat: number;
  fiber: number;
  ing: string[];
  steps: string[];
}

interface CuisineBatch {
  cuisine: string;
  canonical: string;
  dishes: DishSpec[];
}

const BATCHES: CuisineBatch[] = [
  // ── Persian ──────────────────────────────────────────────────────
  {
    cuisine: 'Persian',
    canonical: 'persian',
    dishes: [
      { title: 'Joojeh Kabab with Saffron Yogurt', desc: 'Saffron-marinated chicken thighs grilled with sumac onions.', cookTime: 35, cal: 480, pro: 42, carb: 18, fat: 24, fiber: 2,
        ing: ['1.5 lb boneless chicken thighs, cubed', '1/2 cup Greek yogurt', 'pinch saffron, bloomed in 2 tbsp hot water', '1 lemon, juiced', '1 yellow onion, grated + 1 sliced', '2 tsp sumac', 'olive oil, salt'],
        steps: ['Mix yogurt, saffron water, lemon juice, grated onion, salt — marinate chicken 30 min.', 'Skewer or spread on foil-lined tray, broil 12 min flipping once.', 'Toss sliced onion with sumac and a squeeze of lemon.', 'Plate chicken, top with sumac onions and a drizzle of saffron oil.'] },
      { title: 'Ghormeh Sabzi (Herb & Bean Stew)', desc: 'Slow-cooked herbs with kidney beans and dried lime.', cookTime: 40, cal: 410, pro: 26, carb: 38, fat: 16, fiber: 9,
        ing: ['1 lb stew beef, cubed', '1 bunch parsley, chopped', '1 bunch cilantro, chopped', '1/2 bunch chives, chopped', '1 can kidney beans, drained', '2 dried limes, pierced', '1 yellow onion, diced', 'turmeric, salt, oil'],
        steps: ['Sauté onion in oil with turmeric until soft. Add beef, brown.', 'Sauté herbs in a separate pan 8 min until dark green.', 'Combine, add 3 cups water and dried limes; simmer 25 min.', 'Stir in beans, simmer 5 more, taste salt, serve over basmati.'] },
      { title: 'Fesenjan with Walnuts & Pomegranate', desc: 'Chicken in walnut-pomegranate molasses sauce.', cookTime: 45, cal: 520, pro: 38, carb: 22, fat: 30, fiber: 4,
        ing: ['1.5 lb boneless chicken thighs', '1.5 cups walnuts, finely ground', '1/3 cup pomegranate molasses', '1 yellow onion, diced', '1 tsp cinnamon', '2 cups water', 'salt, oil'],
        steps: ['Toast ground walnuts in a dry pan 5 min; add water, simmer 15 min stirring.', 'Brown chicken with onion in oil. Add walnut mixture and pomegranate molasses.', 'Add cinnamon, salt; simmer 20 min covered.', 'Adjust sweet/tart with extra molasses or sugar; serve over rice.'] },
      { title: 'Sabzi Polo (Herbed Rice with Salmon)', desc: 'Saffron-tahdig rice studded with herbs alongside seared salmon.', cookTime: 35, cal: 540, pro: 36, carb: 56, fat: 18, fiber: 4,
        ing: ['1.5 cups basmati rice', '4 salmon fillets', '1 cup mixed parsley/cilantro/dill, chopped', '2 tbsp butter', 'pinch saffron, bloomed', '2 garlic cloves, minced', 'lemon, salt'],
        steps: ['Parboil rice 6 min, drain. Layer with herbs, drizzle saffron butter on top.', 'Cover, steam 20 min on low — bottom forms tahdig.', 'Sear salmon skin-down 4 min, flip 3 min, finish with garlic and lemon.', 'Plate salmon over herbed rice with crispy tahdig.'] },
      { title: 'Kookoo Sabzi (Herb Frittata)', desc: 'Fragrant Persian herb omelet with walnuts and barberries.', cookTime: 30, cal: 360, pro: 22, carb: 14, fat: 24, fiber: 4,
        ing: ['6 eggs', '2 cups mixed parsley/cilantro/dill/chives, finely chopped', '1/4 cup walnuts, chopped', '2 tbsp dried barberries (or cranberries)', '2 tbsp flour', 'olive oil, salt, pepper'],
        steps: ['Whisk eggs with flour, salt, pepper. Stir in herbs, walnuts, barberries.', 'Heat olive oil in 9-inch oven-safe skillet. Pour in mixture, cook 4 min on low.', 'Transfer to 350°F oven, bake 15 min until set.', 'Cut into wedges, serve warm or room temp with yogurt.'] },
      { title: 'Mirza Ghasemi (Smoky Eggplant)', desc: 'Charred eggplant with garlic, tomato, and eggs.', cookTime: 40, cal: 320, pro: 14, carb: 24, fat: 20, fiber: 8,
        ing: ['2 large eggplants', '6 garlic cloves, minced', '4 tomatoes, diced', '4 eggs', '1 tsp turmeric', 'olive oil, salt'],
        steps: ['Char eggplants over open flame or broiler until skin blackens, 12 min. Cool, peel, mash flesh.', 'Sauté garlic in oil with turmeric 1 min. Add tomatoes, cook 8 min.', 'Stir in eggplant, simmer 10 min until thick.', 'Crack eggs into pan, scramble in or leave whole; cook 4 min and serve with bread.'] },
      { title: 'Ash Reshteh (Noodle & Bean Soup)', desc: 'Hearty herb soup with noodles, beans, and kashk drizzle.', cookTime: 45, cal: 380, pro: 18, carb: 56, fat: 8, fiber: 12,
        ing: ['1/2 cup chickpeas, soaked', '1/2 cup kidney beans, soaked', '1/2 cup lentils', '6 oz linguine, broken', '2 cups mixed herbs (parsley/cilantro/dill)', '1 onion, diced', 'mint-fried onions for garnish', 'kashk or sour cream'],
        steps: ['Simmer beans and chickpeas in 6 cups water 25 min. Add lentils, simmer 15 min.', 'Add herbs and broken noodles, cook 8 min.', 'Sauté onion until golden, fold in along with dried mint.', 'Ladle into bowls, drizzle kashk, top with crispy onions.'] },
      { title: 'Shirazi Salad with Grilled Pita', desc: 'Bright cucumber-tomato-onion salad with lime and mint.', cookTime: 15, cal: 240, pro: 6, carb: 32, fat: 10, fiber: 5,
        ing: ['3 Persian cucumbers, diced small', '3 tomatoes, diced small', '1/2 red onion, diced fine', '1/4 cup chopped mint', '2 limes, juiced', '2 pitas, grilled and torn', 'olive oil, salt, sumac'],
        steps: ['Combine cucumber, tomato, onion in a bowl.', 'Whisk lime juice, olive oil, salt, sumac. Toss with vegetables.', 'Fold in mint just before serving.', 'Serve with grilled torn pita and a drizzle of olive oil.'] },
      { title: 'Koobideh Beef Skewers', desc: 'Spiced ground-beef skewers with charred tomato.', cookTime: 25, cal: 460, pro: 36, carb: 16, fat: 28, fiber: 2,
        ing: ['1.25 lb ground beef (80/20)', '1 onion, grated and drained', '1 tsp turmeric', '1 tsp sumac', '4 plum tomatoes', 'lavash or rice', 'butter, salt'],
        steps: ['Mix beef with grated onion, turmeric, sumac, salt. Knead 5 min until tacky.', 'Form into long skewers (or oblong patties). Chill 15 min.', 'Grill or broil 3 min per side; broil tomatoes alongside.', 'Brush with butter, serve over rice or wrap in lavash with tomato.'] },
      { title: 'Polo Morgh (Chicken Saffron Rice)', desc: 'One-pan saffron rice with bone-in chicken and barberries.', cookTime: 45, cal: 580, pro: 42, carb: 64, fat: 16, fiber: 4,
        ing: ['4 bone-in chicken thighs', '1.5 cups basmati rice', 'pinch saffron, bloomed', '1 onion, sliced', '2 tbsp dried barberries', '3 cups chicken stock', 'butter, salt, turmeric'],
        steps: ['Brown chicken skin-down in butter; remove. Sauté onion with turmeric until golden.', 'Add rice, stir to coat. Pour in stock and saffron water; nestle chicken back in.', 'Cover, simmer 25 min low. Off heat 10 min.', 'Fluff rice, scatter barberries, serve with the crispy bottom layer.'] },
    ]
  },

  // ── Lebanese ──────────────────────────────────────────────────────
  {
    cuisine: 'Lebanese',
    canonical: 'lebanese',
    dishes: [
      { title: 'Mujadara with Caramelized Onions', desc: 'Lentils and rice topped with deeply caramelized onions.', cookTime: 40, cal: 420, pro: 16, carb: 64, fat: 12, fiber: 11,
        ing: ['1 cup brown lentils', '3/4 cup basmati rice', '3 large onions, thinly sliced', '1 tsp cumin', '1 tsp cinnamon', 'olive oil, salt', 'plain yogurt to serve'],
        steps: ['Caramelize onions in olive oil over medium-low 25 min until deep brown.', 'Simmer lentils in 3 cups water 15 min. Add rice, cumin, cinnamon, salt; cook 18 more.', 'Stir half the onions into the rice mixture.', 'Top with remaining onions, serve with cool yogurt.'] },
      { title: 'Fattoush with Sumac Vinaigrette', desc: 'Crisp salad with toasted pita and sumac-pomegranate dressing.', cookTime: 15, cal: 280, pro: 8, carb: 32, fat: 14, fiber: 6,
        ing: ['2 pitas, torn and toasted', '2 tomatoes, diced', '2 Persian cucumbers, diced', '4 radishes, sliced', '3 scallions, sliced', '1/2 cup parsley', '2 tbsp pomegranate molasses', '1 tbsp sumac', 'olive oil, salt'],
        steps: ['Toast torn pita in oven at 400°F for 6 min until crisp.', 'Whisk pomegranate molasses, olive oil, sumac, salt.', 'Combine vegetables and parsley, toss with dressing.', 'Top with toasted pita just before serving so it stays crisp.'] },
      { title: 'Baked Kibbeh', desc: 'Bulgur and beef layered with pine nuts, baked until crisp.', cookTime: 50, cal: 480, pro: 28, carb: 38, fat: 22, fiber: 7,
        ing: ['1 cup fine bulgur, soaked', '1.25 lb ground beef', '2 onions, divided', '1/3 cup pine nuts', '1 tsp allspice', '1 tsp cinnamon', 'olive oil, salt'],
        steps: ['Mix bulgur with half the beef and one grated onion, allspice, salt. Pulse in food processor smooth.', 'Sauté other onion with remaining beef and pine nuts until cooked, 8 min.', 'Press half the bulgur mix in oiled pan, layer filling, top with remaining bulgur.', 'Score top in diamonds, drizzle olive oil, bake 425°F for 35 min until golden.'] },
      { title: 'Lebanese-Style Shakshuka', desc: 'Eggs poached in spiced tomato with za\'atar yogurt.', cookTime: 25, cal: 340, pro: 18, carb: 22, fat: 22, fiber: 5,
        ing: ['1 onion, diced', '3 garlic cloves', '1 red pepper, diced', '1 tsp seven-spice (baharat)', '1 can crushed tomatoes', '4 eggs', 'plain yogurt + za\'atar to serve', 'olive oil, salt'],
        steps: ['Sauté onion, pepper in olive oil 6 min. Add garlic and baharat, cook 1 min.', 'Pour in tomatoes, simmer 8 min until thick.', 'Make wells, crack eggs in. Cover, cook 6 min until whites set.', 'Drizzle za\'atar yogurt, serve with bread.'] },
      { title: 'Seven-Spice Chicken with Rice', desc: 'Baharat-rubbed chicken thighs over toasted vermicelli rice.', cookTime: 35, cal: 540, pro: 38, carb: 52, fat: 18, fiber: 3,
        ing: ['4 bone-in chicken thighs', '2 tsp baharat (seven-spice)', '1.5 cups basmati rice', '1/2 cup vermicelli noodles, broken', '3 cups chicken stock', 'butter, salt'],
        steps: ['Rub chicken with baharat and salt. Sear skin-down 5 min in oven-safe pan.', 'Flip, add vermicelli to pan, toast 2 min.', 'Stir in rice, pour in stock, scrape pan. Cover, bake 375°F for 25 min.', 'Rest 10 min, fluff and plate.'] },
      { title: 'M\'jadra Lentil Rice Bowl', desc: 'Spiced lentil-rice bowl with tomato cucumber salad.', cookTime: 35, cal: 440, pro: 18, carb: 68, fat: 10, fiber: 12,
        ing: ['1 cup green lentils', '3/4 cup long-grain rice', '1 onion, diced', '1 tsp cumin', '2 tomatoes, diced', '1 cucumber, diced', 'lemon, parsley, olive oil, salt'],
        steps: ['Sauté onion with cumin until soft. Add lentils and 3 cups water; simmer 15 min.', 'Add rice and salt; cook 18 min covered.', 'Toss tomato, cucumber, parsley with lemon and olive oil.', 'Plate lentil rice topped with the salad.'] },
      { title: 'Hummus Bowl with Spiced Lamb', desc: 'Warm hummus topped with cumin lamb crumble.', cookTime: 25, cal: 520, pro: 28, carb: 38, fat: 28, fiber: 8,
        ing: ['2 cups hummus', '1 lb ground lamb', '1 tsp cumin', '1 tsp allspice', '1/4 cup pine nuts', '1/4 cup parsley', 'olive oil, lemon, salt', 'pita for serving'],
        steps: ['Brown lamb in pan with cumin, allspice, salt 8 min. Drain excess fat.', 'Toast pine nuts 2 min in same pan.', 'Spread hummus in shallow bowl, top with lamb and pine nuts.', 'Drizzle olive oil, scatter parsley, serve with warm pita.'] },
      { title: 'Kafta Meatballs in Tomato', desc: 'Spiced beef meatballs simmered in cinnamon tomato.', cookTime: 35, cal: 480, pro: 32, carb: 22, fat: 28, fiber: 4,
        ing: ['1.25 lb ground beef', '1 onion, grated', '1/2 cup parsley, chopped', '1 tsp seven-spice', '1 can crushed tomatoes', '1 cinnamon stick', 'olive oil, salt'],
        steps: ['Mix beef with grated onion, parsley, seven-spice, salt. Form 16 meatballs.', 'Brown in olive oil 6 min, remove.', 'Simmer tomatoes with cinnamon stick 8 min. Return meatballs, cook 12 min.', 'Discard cinnamon, serve over rice.'] },
      { title: 'Lebanese Lentil Soup', desc: 'Red lentil and chard soup brightened with lemon.', cookTime: 30, cal: 320, pro: 18, carb: 50, fat: 6, fiber: 14,
        ing: ['1.5 cups red lentils, rinsed', '1 onion, diced', '4 garlic cloves', '1 bunch chard, chopped', '1 tsp cumin', '6 cups stock', '2 lemons, juiced', 'olive oil, salt'],
        steps: ['Sauté onion with cumin until soft. Add garlic, cook 1 min.', 'Add lentils and stock; simmer 20 min until lentils break down.', 'Stir in chard, cook 4 min until wilted.', 'Off heat, stir in lemon juice; finish with olive oil drizzle.'] },
      { title: 'Fattet Hummus', desc: 'Layered chickpeas, toasted pita, garlic yogurt, and pine nuts.', cookTime: 25, cal: 480, pro: 18, carb: 56, fat: 22, fiber: 10,
        ing: ['2 cans chickpeas, drained', '2 pitas, torn and toasted', '1.5 cups Greek yogurt', '3 garlic cloves, grated', '1/4 cup tahini', '1/4 cup pine nuts, toasted', 'olive oil, parsley, paprika'],
        steps: ['Warm chickpeas with a splash of water 5 min. Reserve some for garnish.', 'Whisk yogurt, tahini, garlic, salt with a little water until creamy.', 'Layer toasted pita, then chickpeas, then yogurt sauce in a wide bowl.', 'Top with pine nuts, paprika oil, parsley, and reserved chickpeas.'] },
    ]
  },

  // ── Vietnamese ───────────────────────────────────────────────────
  {
    cuisine: 'Vietnamese',
    canonical: 'vietnamese',
    dishes: [
      { title: 'Bun Bo Nam Bo (Beef Herb Noodle Bowl)', desc: 'Lemongrass beef over rice vermicelli with herbs.', cookTime: 30, cal: 540, pro: 32, carb: 64, fat: 18, fiber: 5,
        ing: ['1 lb flank steak, sliced thin', '2 stalks lemongrass, minced', '4 garlic cloves', '8 oz rice vermicelli', '1 cup mixed mint/cilantro/Thai basil', '2 cups bean sprouts', '1/4 cup peanuts, crushed', 'fish sauce, lime, sugar'],
        steps: ['Marinate beef in lemongrass, garlic, fish sauce, sugar 15 min.', 'Cook noodles per package, rinse cold.', 'Sear beef in hot pan 2 min total per batch.', 'Build bowls: noodles, herbs, bean sprouts, beef; dress with fish sauce + lime; top with peanuts.'] },
      { title: 'Bun Cha (Hanoi Pork & Noodles)', desc: 'Grilled pork patties with dipping broth and herbs.', cookTime: 35, cal: 520, pro: 30, carb: 56, fat: 20, fiber: 4,
        ing: ['1.25 lb ground pork', '3 tbsp fish sauce', '2 tbsp sugar', '4 garlic cloves', '8 oz rice vermicelli', '1 cup herbs (cilantro/mint)', '2 cups lettuce', '1 carrot + 1 daikon, pickled'],
        steps: ['Mix pork with half the fish sauce, sugar, garlic. Form into 16 patties.', 'Grill or pan-sear patties 4 min per side until charred.', 'Make dipping broth: 2 cups warm water + remaining fish sauce + sugar + lime; add pickled veg.', 'Serve patties in bowls of warm broth, with noodles, herbs, and lettuce on the side.'] },
      { title: 'Ca Kho To (Caramel Braised Fish)', desc: 'Catfish braised in palm sugar caramel and fish sauce.', cookTime: 30, cal: 380, pro: 30, carb: 18, fat: 18, fiber: 1,
        ing: ['1.25 lb catfish or swai, cut into 1.5-inch pieces', '3 tbsp palm sugar (or brown)', '3 tbsp fish sauce', '4 shallots, sliced', '2 garlic cloves', '1 chili, sliced', 'black pepper, oil'],
        steps: ['Caramelize sugar in clay pot or heavy pan until amber.', 'Add shallots, garlic, chili, fish sauce, 1/2 cup water; simmer 3 min.', 'Add fish, spoon sauce over, simmer covered 18 min.', 'Crack pepper over top, serve over jasmine rice.'] },
      { title: 'Bo Luc Lac (Shaking Beef)', desc: 'Cubed garlic beef tossed with watercress and tomato.', cookTime: 20, cal: 480, pro: 36, carb: 16, fat: 28, fiber: 3,
        ing: ['1.25 lb sirloin, cubed', '5 garlic cloves, minced', '2 tbsp soy sauce', '1 tbsp fish sauce', '2 tbsp sugar', '1 bunch watercress', '1 tomato, wedged', 'lime, salt, pepper, oil'],
        steps: ['Marinate beef in soy, fish sauce, half garlic, sugar 10 min.', 'Heat pan very hot. Sear beef in batches 2 min, shaking pan, until charred outside.', 'Toss watercress and tomato with lime juice, salt, pepper.', 'Plate beef over greens, scatter remaining raw garlic, drizzle pan juices.'] },
      { title: 'Banh Xeo (Crispy Rice Crepes)', desc: 'Turmeric-coconut crepe filled with shrimp, pork, and sprouts.', cookTime: 30, cal: 460, pro: 24, carb: 48, fat: 20, fiber: 4,
        ing: ['1 cup rice flour', '1/3 cup coconut milk', '1 cup water', '1 tsp turmeric', '8 oz shrimp, peeled', '6 oz ground pork', '2 cups bean sprouts', 'lettuce + herbs to wrap', 'fish sauce, lime'],
        steps: ['Whisk rice flour, coconut milk, water, turmeric, salt — rest 15 min.', 'Sear pork and shrimp in oiled pan. Pour in batter, swirl thin. Top with sprouts.', 'Fold in half, slide out when crisp on bottom (4 min).', 'Tear into lettuce wraps with herbs, dip in nuoc cham (fish sauce + lime + sugar + chili).'] },
      { title: 'Banh Mi Tofu Bowl', desc: 'Lemongrass tofu deconstructed banh mi with pickles.', cookTime: 25, cal: 420, pro: 22, carb: 48, fat: 18, fiber: 7,
        ing: ['14 oz extra-firm tofu, cubed', '2 stalks lemongrass, minced', '1 carrot + 1 daikon, julienned', '2 tbsp rice vinegar', '2 tbsp sugar', '2 cups jasmine rice, cooked', 'cilantro, cucumber, sriracha mayo'],
        steps: ['Press and cube tofu. Toss with lemongrass, soy, oil; bake 425°F for 18 min.', 'Quick-pickle carrot/daikon in vinegar, sugar, salt 15 min.', 'Whisk mayo with sriracha and a squeeze of lime.', 'Build bowls: rice, tofu, pickles, cucumber, cilantro, drizzle of sriracha mayo.'] },
      { title: 'Com Tam (Broken Rice with Pork)', desc: 'Lemongrass pork chop over broken jasmine rice.', cookTime: 35, cal: 580, pro: 36, carb: 56, fat: 22, fiber: 3,
        ing: ['4 boneless pork chops', '2 stalks lemongrass, minced', '4 garlic cloves', '3 tbsp fish sauce', '2 tbsp honey', '1.5 cups broken jasmine rice (or short-grain)', 'cucumber, scallion oil, fish sauce dressing'],
        steps: ['Marinate pork in lemongrass, garlic, fish sauce, honey 20 min.', 'Cook rice, fluff. Make scallion oil: warm oil + sliced scallions 1 min.', 'Grill or sear chops 3 min per side until caramelized.', 'Plate over rice with cucumber, drizzle scallion oil and fish sauce dressing.'] },
      { title: 'Pho Bo (Beef Noodle Soup)', desc: 'Star-anise-scented beef broth over rice noodles.', cookTime: 50, cal: 540, pro: 32, carb: 68, fat: 14, fiber: 4,
        ing: ['8 oz flat rice noodles', '1 lb thinly sliced sirloin', '6 cups good beef stock', '1 onion (charred)', '2-inch ginger (charred)', '3 star anise', '1 cinnamon stick', 'fish sauce, basil, sprouts, lime'],
        steps: ['Char onion and ginger over flame. Simmer with stock, star anise, cinnamon, fish sauce 30 min. Strain.', 'Cook noodles per package, divide into bowls.', 'Top noodles with raw sliced sirloin and pour boiling broth over to cook.', 'Serve with basil, sprouts, lime, sliced chili at the table.'] },
      { title: 'Goi Cuon (Fresh Spring Rolls)', desc: 'Rice paper rolls with shrimp, herbs, and peanut sauce.', cookTime: 25, cal: 320, pro: 18, carb: 42, fat: 10, fiber: 4,
        ing: ['12 rice paper wrappers', '12 cooked shrimp, halved lengthwise', '4 oz rice vermicelli, cooked', '1 cup mint + cilantro', '1 cup lettuce, shredded', '1/3 cup hoisin', '2 tbsp peanut butter', 'lime, garlic'],
        steps: ['Soak each wrapper 5 sec, lay flat. Layer shrimp, vermicelli, herbs, lettuce.', 'Fold sides in, roll tight.', 'Whisk hoisin with peanut butter, splash of water, garlic, lime.', 'Slice rolls in half on the bias, serve with peanut sauce.'] },
      { title: 'Ga Nuong Sa (Lemongrass Grilled Chicken)', desc: 'Lemongrass-marinated chicken thighs with nuoc cham.', cookTime: 35, cal: 460, pro: 38, carb: 12, fat: 26, fiber: 1,
        ing: ['1.5 lb boneless chicken thighs', '3 stalks lemongrass, minced', '4 garlic cloves', '2 tbsp fish sauce', '2 tbsp brown sugar', '1 chili, minced', 'lime, cilantro, jasmine rice to serve'],
        steps: ['Mix lemongrass, garlic, fish sauce, sugar, chili. Marinate chicken 30 min.', 'Grill or broil chicken 5 min per side until lacquered.', 'Whisk lime juice, fish sauce, sugar, water for nuoc cham.', 'Slice chicken, serve over rice with cilantro and dipping sauce.'] },
    ]
  },

  // ── Filipino ─────────────────────────────────────────────────────
  {
    cuisine: 'Filipino',
    canonical: 'filipino',
    dishes: [
      { title: 'Chicken Adobo', desc: 'Soy-vinegar braised chicken with garlic and bay.', cookTime: 40, cal: 480, pro: 38, carb: 12, fat: 28, fiber: 1,
        ing: ['8 bone-in chicken thighs', '1/2 cup soy sauce', '1/2 cup white vinegar', '1 head garlic, smashed', '3 bay leaves', '1 tsp peppercorns', 'oil, jasmine rice'],
        steps: ['Brown chicken skin-down in oil. Add garlic.', 'Pour in soy and vinegar (do not stir for 3 min — lets vinegar mellow).', 'Add bay and peppercorns, simmer 30 min uncovered until sauce reduces.', 'Serve over rice with sauce spooned over.'] },
      { title: 'Sinigang na Hipon', desc: 'Tamarind-sour shrimp soup with vegetables.', cookTime: 30, cal: 320, pro: 28, carb: 28, fat: 8, fiber: 6,
        ing: ['1 lb shrimp, head-on if possible', '1 packet sinigang mix (or 1/3 cup tamarind paste)', '1 daikon, sliced', '6 long beans, cut', '2 tomatoes, wedged', '1 onion, wedged', '1 bunch water spinach', 'fish sauce'],
        steps: ['Bring 6 cups water to boil. Add tomatoes, onion, daikon; simmer 8 min.', 'Add long beans, cook 3 min.', 'Stir in tamarind paste/sinigang mix and fish sauce.', 'Add shrimp and water spinach, cook 3 min until shrimp pink.'] },
      { title: 'Pancit Bihon', desc: 'Stir-fried rice noodles with chicken and vegetables.', cookTime: 25, cal: 460, pro: 24, carb: 64, fat: 12, fiber: 4,
        ing: ['8 oz bihon (rice stick noodles)', '8 oz chicken breast, sliced', '1 carrot, julienned', '2 cups cabbage, shredded', '4 garlic cloves', '3 tbsp soy sauce', '2 tbsp oyster sauce', 'lemon, scallions'],
        steps: ['Soak bihon in warm water 5 min, drain.', 'Stir-fry chicken in oil 3 min. Add garlic, carrot, cabbage; cook 3 min.', 'Add noodles, soy, oyster sauce, 1/2 cup water. Toss until noodles soft, 4 min.', 'Top with scallions and lemon wedges.'] },
      { title: 'Kare-Kare with Bok Choy', desc: 'Peanut-sauced oxtail (or beef) stew with bok choy.', cookTime: 60, cal: 540, pro: 32, carb: 22, fat: 36, fiber: 6,
        ing: ['1.5 lb beef chuck, cubed (or oxtail)', '1/2 cup peanut butter', '2 tbsp annatto powder (or paprika)', '1 onion, diced', '4 garlic cloves', '4 baby bok choy', '8 long beans', 'bagoong (shrimp paste)'],
        steps: ['Brown beef. Cover with water, simmer 40 min until tender.', 'Sauté onion and garlic, stir in annatto and peanut butter with 1 cup of beef broth.', 'Pour into pot with beef, simmer 10 min.', 'Add bok choy and beans, cook 4 min. Serve with bagoong on the side.'] },
      { title: 'Lumpia Shanghai (Pork Spring Rolls)', desc: 'Crispy thin pork-vegetable rolls with sweet chili.', cookTime: 40, cal: 420, pro: 18, carb: 36, fat: 22, fiber: 3,
        ing: ['1 lb ground pork', '1 carrot, finely grated', '4 scallions, minced', '2 garlic cloves, minced', '20 lumpia wrappers (or spring roll)', '1 egg', 'soy sauce, pepper', 'sweet chili sauce, oil for frying'],
        steps: ['Mix pork, carrot, scallion, garlic, egg, soy, pepper.', 'Place 1 tbsp filling on each wrapper, roll tight (cigar shape).', 'Pan-fry in 1/2 inch oil 3 min per side until golden.', 'Drain, slice in half, serve with sweet chili.'] },
      { title: 'Bicol Express (Coconut Pork)', desc: 'Pork simmered in coconut milk with chilies and shrimp paste.', cookTime: 40, cal: 540, pro: 28, carb: 14, fat: 38, fiber: 2,
        ing: ['1.25 lb pork shoulder, cubed', '1 can coconut milk', '4 long green chilies, sliced', '2 tbsp shrimp paste (bagoong)', '1 onion, diced', '4 garlic cloves', 'ginger, oil, jasmine rice'],
        steps: ['Brown pork in oil. Add onion, garlic, ginger; cook 3 min.', 'Stir in shrimp paste 1 min. Pour in coconut milk.', 'Simmer 25 min until pork tender. Add chilies, cook 5 min.', 'Reduce sauce, serve over rice.'] },
      { title: 'Tortang Talong (Eggplant Omelet)', desc: 'Charred eggplant fanned and dipped in egg, pan-fried.', cookTime: 30, cal: 320, pro: 14, carb: 18, fat: 22, fiber: 7,
        ing: ['4 small Asian eggplants', '4 eggs', '4 oz ground pork (optional)', '1 garlic clove, minced', 'oil, salt, pepper', 'banana ketchup or vinegar dip'],
        steps: ['Char eggplants over flame 8 min until soft. Cool, peel keeping stem.', 'Press flat with fork (fan shape).', 'Brown pork with garlic. Whisk eggs with salt.', 'Dip eggplant in egg (top with pork), pan-fry 2 min per side. Serve with banana ketchup.'] },
      { title: 'Tinolang Manok', desc: 'Ginger chicken soup with green papaya and chili leaves.', cookTime: 40, cal: 380, pro: 32, carb: 20, fat: 18, fiber: 4,
        ing: ['1 whole chicken, cut up', '2-inch ginger, sliced', '1 onion, wedged', '1 green papaya (or chayote), cubed', '2 cups malunggay (or spinach)', '6 cups water', 'fish sauce'],
        steps: ['Sauté ginger and onion in oil 2 min.', 'Add chicken, brown lightly. Pour in water, fish sauce; simmer 25 min.', 'Add papaya, cook 8 min.', 'Stir in greens at the end, serve hot.'] },
      { title: 'Pinakbet', desc: 'Mixed vegetable stew seasoned with shrimp paste.', cookTime: 30, cal: 280, pro: 14, carb: 32, fat: 10, fiber: 9,
        ing: ['1 small kabocha or butternut, cubed', '8 okra', '1 bitter melon, sliced (or zucchini)', '1 small Asian eggplant, sliced', '8 long beans', '4 oz pork belly or shrimp', '2 tbsp shrimp paste (bagoong)', 'garlic, onion, tomato'],
        steps: ['Sauté pork belly until fat renders. Add garlic, onion, tomato; cook 3 min.', 'Stir in shrimp paste 1 min.', 'Layer harder vegetables (kabocha, beans) at the bottom; softer on top. Pour in 1 cup water.', 'Cover, steam-braise 18 min. Toss gently before serving.'] },
      { title: 'Beef Caldereta', desc: 'Tomato-braised beef with potatoes, peppers, and olives.', cookTime: 60, cal: 520, pro: 32, carb: 32, fat: 26, fiber: 5,
        ing: ['1.5 lb beef chuck, cubed', '1 can tomato sauce', '2 potatoes, cubed', '1 red pepper, diced', '1/3 cup pitted green olives', '4 garlic cloves', '1 onion, diced', '1/4 cup liver spread (or sub: 2 tbsp tomato paste)'],
        steps: ['Brown beef in oil. Sauté onion, garlic until soft. Stir in tomato sauce.', 'Add 2 cups water, simmer covered 40 min.', 'Add potatoes, cook 12 min. Stir in pepper, olives, liver spread.', 'Simmer 5 more, taste salt, serve with rice.'] },
    ]
  },
];

// Round 2: 9 more cuisines × 10 dishes (compact form for size). Each
// follows the same DishSpec shape; instructions deliberately short
// (4-5 steps), ingredients 6-8 each. Targeting weeknight pace.
const BATCHES_2: CuisineBatch[] = [
  {
    cuisine: 'Ethiopian', canonical: 'ethiopian',
    dishes: makeBatch('eth', [
      ['Doro Wat (Spiced Chicken Stew)', 'Berbere chicken with hard-boiled eggs.', 50, 520, 36, 22, 28, 4,
       ['8 chicken thighs', '4 hard-boiled eggs', '3 tbsp berbere', '3 onions, finely diced', '4 garlic cloves', '2-inch ginger', 'spiced butter (or ghee + cardamom)', 'salt'],
       ['Caramelize onions slowly 20 min until jammy.', 'Stir in berbere, garlic, ginger; cook 3 min.', 'Add chicken, 1.5 cups water, ghee. Simmer 25 min.', 'Add eggs at the end. Serve with injera.']],
      ['Misir Wat (Red Lentil Stew)', 'Berbere-spiced red lentils.', 30, 360, 18, 56, 6, 14,
       ['1.5 cups red lentils', '2 onions, diced', '3 tbsp berbere', '4 garlic cloves', 'ginger, ghee, salt', '4 cups water'],
       ['Sauté onions 12 min until deep brown.', 'Stir in berbere, garlic, ginger 2 min.', 'Add lentils and water; simmer 18 min until thick.', 'Finish with ghee, serve with injera or rice.']],
      ['Gomen (Collards)', 'Slow-cooked collards with garlic and ginger.', 35, 220, 8, 22, 12, 10,
       ['2 lb collard greens, chopped', '1 onion, diced', '4 garlic cloves', 'ginger, jalapeño, oil', 'salt'],
       ['Sauté onion until soft. Add garlic, ginger, jalapeño.', 'Add collards in batches with 1/2 cup water.', 'Cover, cook 25 min stirring occasionally.', 'Season with salt, drizzle with oil.']],
      ['Kitfo Beef Tartare-Style', 'Cooked-rare beef with mitmita and niter kibbeh.', 20, 480, 36, 8, 32, 1,
       ['1 lb fresh beef tenderloin, finely chopped', '2 tsp mitmita (or smoked paprika+cayenne)', '3 tbsp niter kibbeh (spiced butter)', 'salt'],
       ['Warm niter kibbeh until just melted.', 'Toss beef with mitmita and salt.', 'Stir in warm butter just to barely cook (lebleb).', 'Serve immediately with cottage cheese and injera.']],
      ['Atakilt Wat (Cabbage, Carrot, Potato)', 'Turmeric-spiced vegetable trio.', 35, 280, 6, 42, 10, 8,
       ['1 head cabbage, chopped', '3 carrots, sliced', '3 potatoes, cubed', '1 onion, diced', 'turmeric, ginger, garlic, oil, salt'],
       ['Sauté onion with turmeric, ginger, garlic 4 min.', 'Add carrots and potatoes, cover and steam 12 min.', 'Stir in cabbage, cook 12 more min.', 'Season and serve over injera.']],
      ['Shiro Wat (Chickpea Flour Stew)', 'Quick chickpea-flour stew with berbere.', 20, 320, 14, 32, 14, 8,
       ['3/4 cup shiro (chickpea) flour', '1 onion, finely diced', '2 tbsp berbere', '4 garlic cloves', 'oil, salt, 4 cups water'],
       ['Sauté onion until soft. Stir in berbere and garlic.', 'Whisk shiro with cold water, pour in.', 'Simmer 12 min stirring constantly until thickened.', 'Drizzle oil, serve with injera.']],
      ['Beg Wot (Lamb Stew)', 'Berbere-braised lamb with onion gravy.', 70, 540, 36, 12, 36, 3,
       ['1.5 lb lamb shoulder, cubed', '3 onions, finely diced', '4 tbsp berbere', '4 garlic cloves', 'ginger, ghee, salt', 'red wine, water'],
       ['Caramelize onions deeply 25 min.', 'Add berbere, garlic, ginger 3 min.', 'Add lamb, brown 5 min. Add wine, water.', 'Simmer 35 min until tender, finish with ghee.']],
      ['Alecha (Mild Vegetable Stew)', 'Turmeric-ginger stew without berbere.', 35, 260, 8, 38, 8, 9,
       ['1 head cauliflower, florets', '2 carrots, sliced', '1 onion, diced', '2 cloves garlic', 'turmeric, ginger, oil, salt'],
       ['Sauté onion in oil with turmeric and ginger.', 'Add carrots, cook 4 min, then cauliflower.', 'Add 1/2 cup water, cover, steam 14 min.', 'Season and serve.']],
      ['Key Wat (Beef Stew)', 'Simpler berbere beef braise.', 50, 460, 32, 14, 26, 4,
       ['1.25 lb beef chuck, cubed', '2 onions, finely diced', '3 tbsp berbere', '4 garlic cloves', 'ginger, ghee, salt'],
       ['Caramelize onions 18 min.', 'Add berbere, garlic, ginger 3 min.', 'Add beef, water to cover; simmer 30 min.', 'Reduce sauce, finish with ghee.']],
      ['Vegetable Beyaynetu Bowl', 'Sampler bowl: misir, gomen, atakilt, shiro over injera.', 25, 420, 14, 64, 12, 14,
       ['1 cup cooked misir wat', '1 cup cooked gomen', '1 cup cooked atakilt', '1 cup cooked shiro', '2 injera', 'lemon'],
       ['Warm components in separate small pans.', 'Lay injera on plate.', 'Spoon mounds of each stew around the plate.', 'Squeeze lemon, eat with hands tearing injera.']],
    ])
  },
  {
    cuisine: 'Brazilian', canonical: 'brazilian',
    dishes: makeBatch('br', [
      ['Feijoada (Black Bean Stew)', 'Black beans with pork shoulder and sausage.', 70, 580, 36, 48, 24, 14,
       ['1 lb dry black beans, soaked', '1 lb pork shoulder, cubed', '8 oz linguiça or chorizo', '1 onion, diced', '4 garlic cloves', 'bay leaf, oil, salt', 'orange to serve'],
       ['Brown pork and sausage. Add onion, garlic, bay.', 'Add beans and water to cover by 2 inches.', 'Simmer 50 min until beans soft.', 'Mash some beans for body, serve with rice and orange wedges.']],
      ['Moqueca de Peixe', 'Coconut-tomato fish stew with palm oil.', 30, 460, 36, 14, 26, 3,
       ['1.5 lb white fish (cod, halibut), cubed', '1 can coconut milk', '2 tomatoes, sliced', '1 red pepper, sliced', '1 onion, sliced', '2 tbsp dendê (palm) oil or olive oil', 'cilantro, lime, salt'],
       ['Layer onion, pepper, tomato, fish in a clay or heavy pot.', 'Pour coconut milk and palm oil over.', 'Simmer covered 18 min on low.', 'Top with cilantro and lime, serve with rice.']],
      ['Picadinho (Beef Hash)', 'Diced beef with peppers and onion.', 30, 460, 36, 18, 26, 3,
       ['1.25 lb sirloin, finely diced', '1 red pepper, diced', '1 onion, diced', '4 garlic cloves', '2 tomatoes, diced', 'parsley, oil, salt, pepper'],
       ['Brown beef in oil 4 min.', 'Add onion, pepper, garlic; cook 5 min.', 'Stir in tomatoes, cook 8 min until saucy.', 'Top with parsley, serve over rice with a fried egg.']],
      ['Escondidinho (Yuca-Topped Carne Seca)', 'Shepherd\'s pie with yuca mash and salted beef.', 60, 540, 30, 56, 22, 6,
       ['1 lb dried/salted beef (carne seca) or brisket', '2 lb yuca, peeled', '1 onion, diced', '4 garlic cloves', '1/2 cup cream', '1 cup mozzarella', 'salt, oil'],
       ['Boil yuca 25 min until tender. Mash with cream and salt.', 'Sauté onion, garlic; add shredded beef, cook 5 min.', 'Layer beef in baking dish, top with yuca mash and cheese.', 'Bake 400°F for 18 min until golden.']],
      ['Frango com Quiabo', 'Chicken with okra in a tomato base.', 40, 420, 36, 18, 22, 6,
       ['8 chicken thighs', '1 lb okra, sliced', '2 tomatoes, diced', '1 onion, diced', '4 garlic cloves', 'oil, salt, pepper'],
       ['Brown chicken in pot. Add onion, garlic.', 'Stir in tomatoes, cook 4 min.', 'Add okra and 1 cup water; simmer 25 min.', 'Serve over rice with farofa on the side.']],
      ['Vatapá (Bahian Bread Stew)', 'Coconut-shrimp stew thickened with bread.', 35, 520, 28, 36, 28, 4,
       ['1 lb shrimp', '4 slices stale bread, soaked in 1 cup coconut milk', '1 onion, diced', '4 garlic cloves', '1/2 cup peanuts, ground', '1/4 cup palm oil', 'ginger, cilantro, lime'],
       ['Sauté onion, garlic, ginger.', 'Blend bread+milk and peanuts; pour in.', 'Simmer 12 min until thick. Stir in shrimp, cook 4 min.', 'Drizzle palm oil, top cilantro, serve with rice.']],
      ['Baião de Dois', 'Black-eyed peas and rice with curd cheese.', 35, 480, 18, 64, 14, 8,
       ['1 cup dry black-eyed peas', '1 cup long-grain rice', '4 oz queijo coalho or halloumi, cubed', '4 oz linguiça or smoked sausage', '1 onion, diced', 'garlic, oil, salt'],
       ['Boil black-eyed peas 25 min until tender; reserve.', 'Sauté sausage, onion, garlic.', 'Add rice and 1.5 cups water; cook 18 min.', 'Fold in peas and cheese cubes off heat. Rest 5 min.']],
      ['Arroz Carreteiro', 'Beef-and-rice cattle-driver one-pot.', 35, 520, 32, 56, 18, 4,
       ['1 lb beef (sirloin or jerky carne seca), shredded', '1.5 cups rice', '1 onion, diced', '1 red pepper, diced', '4 garlic cloves', '3 cups stock', 'parsley, oil, salt'],
       ['Sauté onion, garlic, pepper.', 'Add beef, brown 5 min.', 'Stir in rice and stock; cover, cook 18 min.', 'Rest 10 min, fold parsley.']],
      ['Churrasco-Style Steak Salad', 'Garlic-lime steak over greens with chimichurri-style salsa.', 25, 520, 36, 16, 32, 4,
       ['1.25 lb sirloin steak', '4 garlic cloves', '2 limes', '4 cups arugula', '1 cucumber, sliced', '2 tomatoes, wedged', 'parsley, olive oil, salt, pepper'],
       ['Marinate steak in garlic, lime, salt 15 min.', 'Sear hot pan 3 min per side, rest.', 'Whisk parsley, olive oil, lime, garlic for salsa.', 'Slice steak, plate over greens, drizzle salsa.']],
      ['Farofa Bowl', 'Toasted cassava flour with bacon, banana, and egg over rice.', 25, 540, 22, 64, 22, 6,
       ['1 cup cassava flour (farinha)', '4 oz bacon, diced', '1 onion, diced', '2 hard-boiled eggs, chopped', '1 banana, sliced', 'butter, parsley, salt', '1.5 cups cooked rice'],
       ['Crisp bacon. Add onion to fat, cook 4 min.', 'Stir in cassava flour and butter; toast 5 min until golden.', 'Fold in egg and banana off heat.', 'Spoon farofa over rice and serve.']],
    ])
  },
  {
    cuisine: 'Colombian', canonical: 'colombian',
    dishes: makeBatch('col', [
      ['Bandeja Paisa Bowl', 'Beans, rice, beef, plantain, egg, avocado.', 45, 720, 38, 72, 32, 14,
       ['1 cup cooked red beans', '1 cup cooked rice', '8 oz ground beef', '4 oz chorizo', '1 plantain, sliced and fried', '2 eggs', '1 avocado', 'oil, salt'],
       ['Brown ground beef and chorizo.', 'Fry plantain slices in oil until caramelized.', 'Fry eggs sunny-side-up.', 'Build bowl: rice, beans, beef, chorizo, plantain, egg, avocado.']],
      ['Ajiaco (Chicken Potato Soup)', 'Three-potato chicken soup with corn and capers.', 50, 460, 32, 52, 14, 6,
       ['1 whole chicken, cut up', '4 potatoes (mix of waxy and starchy), sliced', '2 corn cobs, halved', '1 bunch guascas (or oregano)', 'capers, cream, avocado, cilantro'],
       ['Simmer chicken in 8 cups water 25 min.', 'Add potatoes and corn; cook 18 min until potatoes break down.', 'Stir in guascas at the end.', 'Serve topped with cream, capers, avocado.']],
      ['Arepas con Queso', 'Cornmeal cakes stuffed with cheese.', 25, 380, 14, 48, 16, 4,
       ['2 cups masarepa (precooked white cornmeal)', '2.5 cups warm water', '1 tsp salt', '1.5 cups mozzarella, grated', 'butter, oil'],
       ['Mix masarepa, water, salt; rest 5 min.', 'Form 8 patties, stuff each with cheese, seal.', 'Pan-fry in oil 4 min per side until crisp.', 'Top with butter and serve.']],
      ['Lentejas Colombianas', 'Brown lentil stew with chorizo.', 35, 420, 22, 52, 12, 14,
       ['1.5 cups brown lentils', '4 oz chorizo, diced', '1 onion, diced', '1 carrot, diced', '2 tomatoes, diced', 'garlic, cumin, oil, salt'],
       ['Brown chorizo. Add onion, carrot, garlic; cook 5 min.', 'Stir in tomatoes and cumin.', 'Add lentils and 4 cups water; simmer 25 min.', 'Adjust salt, serve over rice.']],
      ['Sancocho de Gallina', 'Chicken sancocho with yuca and plantain.', 60, 460, 32, 48, 14, 6,
       ['1 whole chicken, cut up', '1 lb yuca, peeled and chunked', '1 green plantain, chunked', '2 corn cobs', '1 onion, diced', 'cilantro, garlic, salt'],
       ['Simmer chicken in 8 cups water with onion and garlic 30 min.', 'Add yuca, plantain, corn; cook 18 min.', 'Stir in cilantro at the end.', 'Serve broth and solids alongside rice.']],
      ['Frijoles Cargamanto', 'Cargamanto bean stew with pork.', 60, 520, 28, 56, 18, 14,
       ['1 lb cargamanto or pinto beans, soaked', '8 oz pork shoulder, cubed', '1 carrot, diced', '1 onion, diced', '1 plantain, diced', 'garlic, oil, salt'],
       ['Brown pork. Add onion, carrot, garlic.', 'Add beans and water; simmer 45 min.', 'Add plantain, cook 12 more min.', 'Mash a bit for body, serve with rice.']],
      ['Pollo Guisado Colombiano', 'Tomato-stewed chicken with potato.', 40, 460, 36, 32, 18, 5,
       ['8 chicken thighs', '2 potatoes, cubed', '2 tomatoes, diced', '1 onion, diced', '1 red pepper, diced', 'cilantro, cumin, oil, salt'],
       ['Brown chicken. Add onion, pepper, garlic.', 'Stir in tomato and cumin.', 'Add potato and 1 cup water; simmer 25 min.', 'Top with cilantro, serve over rice.']],
      ['Arroz con Coco', 'Coconut rice with raisins.', 30, 380, 6, 64, 12, 3,
       ['1.5 cups long-grain rice', '1 can coconut milk', '1 cup water', '1/3 cup raisins', '2 tbsp sugar', 'salt, butter'],
       ['Reduce coconut milk and sugar in pot 8 min until caramel-y bits form.', 'Add water, salt, raisins, rice.', 'Cover, cook 18 min.', 'Rest 10 min, fluff with butter.']],
      ['Mondongo Soup', 'Tripe and beef soup with vegetables.', 90, 380, 28, 32, 14, 6,
       ['1 lb beef tripe, cleaned and cubed (or sub: chuck)', '8 oz beef chuck', '2 carrots, diced', '2 potatoes, cubed', '1 plantain, diced', 'garlic, cilantro, salt, lime'],
       ['Simmer tripe and chuck in water 60 min until tender.', 'Add carrots, potatoes, plantain; cook 18 min.', 'Stir in cilantro and lime.', 'Serve with rice and lime wedges.']],
      ['Posta Cartagenera', 'Slow-braised beef in panela cola sauce.', 75, 520, 38, 22, 30, 3,
       ['2 lb beef chuck roast', '1 cup cola or 1/2 cup panela syrup', '1/2 cup soy sauce', '1 onion, sliced', '4 garlic cloves', 'oil, salt, pepper'],
       ['Sear beef on all sides.', 'Add onion, garlic, cola, soy sauce, water to cover.', 'Simmer covered 60 min until tender.', 'Reduce sauce 10 min, slice beef, spoon sauce.']],
    ])
  },
  {
    cuisine: 'Cuban', canonical: 'cuban',
    dishes: makeBatch('cu', [
      ['Ropa Vieja', 'Shredded beef in pepper-tomato sauce.', 60, 480, 36, 24, 22, 5,
       ['2 lb flank steak', '1 onion, sliced', '2 peppers (red+green), sliced', '4 garlic cloves', '1 can crushed tomatoes', 'cumin, oregano, bay, oil, salt'],
       ['Simmer flank in water with onion and bay 50 min until shred-able.', 'Sauté onion, peppers, garlic. Add cumin and oregano.', 'Stir in tomatoes and shredded beef with 1 cup of cooking liquid.', 'Simmer 12 min, serve with rice and black beans.']],
      ['Picadillo Cubano', 'Ground beef with raisins, olives, capers.', 30, 460, 30, 24, 24, 4,
       ['1.25 lb ground beef', '1 onion, diced', '1 pepper, diced', '4 garlic cloves', '1 can crushed tomatoes', '1/4 cup raisins', '1/4 cup green olives', 'cumin, oregano, oil, salt'],
       ['Brown beef. Add onion, pepper, garlic.', 'Stir in tomatoes, raisins, olives, cumin, oregano.', 'Simmer 15 min until thick.', 'Serve over rice with fried plantains.']],
      ['Vaca Frita', 'Crispy shredded beef with mojo onions.', 35, 520, 38, 14, 32, 3,
       ['1 lb cooked shredded beef (from ropa vieja base)', '2 onions, sliced thin', '4 garlic cloves', '2 limes', 'cumin, oil, salt'],
       ['Pan-fry shredded beef in oil 6 min until crispy at edges.', 'Wilt onions in same pan with garlic and cumin.', 'Squeeze lime over both.', 'Serve with rice and beans.']],
      ['Lechon Asado', 'Garlic-citrus pork shoulder.', 100, 580, 38, 12, 38, 1,
       ['3 lb pork shoulder', '8 garlic cloves, smashed', '1 cup sour orange juice (or 1/2 orange + 1/2 lime)', 'oregano, cumin, salt, oil'],
       ['Marinate pork in mojo (garlic, citrus, herbs) 30 min.', 'Roast 325°F for 90 min until pull-apart.', 'Crisp under broiler 5 min.', 'Slice/shred, spoon pan juices over.']],
      ['Frijoles Negros', 'Cuban black beans with cumin and oregano.', 50, 320, 16, 56, 4, 14,
       ['1 lb dry black beans, soaked', '1 onion, diced', '1 pepper, diced', '6 garlic cloves', 'cumin, oregano, bay, vinegar, oil, salt'],
       ['Sauté onion, pepper, garlic in oil. Add cumin and oregano.', 'Add beans and 8 cups water with bay; simmer 45 min.', 'Mash some beans, splash vinegar at end.', 'Serve over rice.']],
      ['Arroz con Pollo Cubano', 'Saffron-tinted chicken and rice.', 45, 540, 38, 56, 16, 3,
       ['8 chicken thighs', '1.5 cups long-grain rice', '1 onion, diced', '1 pepper, diced', 'pinch saffron', '3 cups chicken stock', '1/2 cup peas', 'oregano, oil, salt'],
       ['Brown chicken. Sauté onion, pepper, oregano.', 'Stir in rice 1 min.', 'Add saffron stock, return chicken. Cover, simmer 22 min.', 'Fold in peas, rest 5 min.']],
      ['Masitas de Puerco', 'Marinated fried pork chunks with onions.', 35, 520, 38, 8, 36, 2,
       ['1.5 lb pork shoulder, cubed', '6 garlic cloves', '1/2 cup sour orange (or orange + lime)', '1 onion, sliced', 'oregano, cumin, oil, salt'],
       ['Marinate pork in citrus-garlic-oregano 20 min.', 'Pan-fry in oil 12 min until crisp.', 'Wilt onions in pan juices.', 'Serve over rice with onions piled on top.']],
      ['Camarones Enchilados', 'Shrimp in spicy tomato-pepper sauce.', 25, 360, 30, 18, 16, 4,
       ['1.25 lb shrimp, peeled', '1 can crushed tomatoes', '1 onion, diced', '1 pepper, diced', '4 garlic cloves', 'cumin, oregano, oil, salt'],
       ['Sauté onion, pepper, garlic.', 'Add tomatoes, cumin, oregano; simmer 8 min.', 'Stir in shrimp, cook 4 min.', 'Serve over white rice.']],
      ['Bistec de Palomilla', 'Thin garlic-lime steaks with onions.', 20, 460, 36, 8, 28, 2,
       ['4 thin sirloin steaks (palomilla)', '6 garlic cloves, mashed', '2 limes', '2 onions, sliced', 'oil, salt, pepper, parsley'],
       ['Marinate steaks in garlic, lime, salt 10 min.', 'Sear 1.5 min per side in hot oil.', 'Wilt onions in same pan.', 'Top steaks with onions and parsley.']],
      ['Tostones Bowl', 'Twice-fried plantains with garlic mojo and beans.', 25, 480, 14, 64, 18, 12,
       ['2 green plantains', '1 cup cooked black beans', '4 garlic cloves', '1 cup cooked rice', '1/2 avocado, sliced', 'oil, salt, lime'],
       ['Slice plantains 1-inch, fry 4 min, smash flat, fry 4 more min.', 'Mash garlic with salt and a squeeze of lime in mortar.', 'Brush mojo over hot tostones.', 'Plate with rice, beans, avocado.']],
    ])
  },
  {
    cuisine: 'Salvadorean', canonical: 'salvadorean',
    dishes: makeBatch('sv', [
      ['Pupusas Revueltas', 'Cheese-bean-pork stuffed corn cakes with curtido.', 35, 520, 24, 56, 22, 6,
       ['2 cups masa harina', '1.5 cups warm water', '1 cup cooked refried beans', '1 cup mozzarella', '4 oz cooked ground pork', '2 cups shredded cabbage (curtido)', 'vinegar, oregano, salt, oil'],
       ['Mix masa with water and salt; rest 5 min.', 'Form patties, stuff with bean+cheese+pork mix, seal.', 'Cook on dry skillet 4 min per side until charred.', 'Serve with cabbage curtido (cabbage + vinegar + oregano).']],
      ['Sopa de Gallina', 'Hen soup with rice and chayote.', 60, 420, 36, 32, 14, 5,
       ['1 whole chicken, cut up', '1 onion, diced', '2 chayote, cubed (or zucchini)', '2 carrots, sliced', '1 cup rice', 'cilantro, garlic, salt'],
       ['Simmer chicken in 8 cups water with onion and garlic 35 min.', 'Add carrots, chayote; cook 12 min.', 'Stir in rice, cook 18 more min.', 'Top with cilantro, serve with lime.']],
      ['Yuca con Chicharrón', 'Boiled yuca with crispy pork and curtido.', 50, 580, 26, 56, 28, 6,
       ['1.5 lb yuca, peeled and chunked', '1 lb pork shoulder, cubed', '2 cups shredded cabbage', 'vinegar, oregano, oil, salt, lime'],
       ['Boil yuca in salted water 25 min until tender.', 'Confit pork in its own fat 35 min until crispy.', 'Mix cabbage with vinegar, oregano, salt for curtido.', 'Plate yuca, top with chicharrón, side curtido.']],
      ['Pollo Encebollado', 'Onion-smothered chicken thighs.', 40, 460, 36, 18, 26, 4,
       ['8 chicken thighs', '4 onions, sliced thin', '4 garlic cloves', '1 tomato, diced', 'oregano, cumin, oil, salt, pepper'],
       ['Brown chicken. Remove.', 'Wilt onions in fat 12 min until jammy.', 'Add garlic, tomato, oregano.', 'Return chicken, simmer 18 min covered.']],
      ['Panes con Pollo', 'Chicken sandwiches in spiced tomato sauce.', 50, 540, 32, 56, 22, 4,
       ['1 lb shredded chicken', '4 sandwich rolls (telera or hoagie)', '1 can crushed tomatoes', '4 tomatillos, charred', '1 onion, diced', 'sesame seeds, oregano, lettuce, radish'],
       ['Char tomatillos and blend with onion, tomato, oregano.', 'Simmer chicken in sauce 12 min.', 'Toast rolls.', 'Build sandwich: chicken, sauce, lettuce, radish.']],
      ['Casamiento (Rice & Black Beans)', 'Stir-fried rice and black beans together.', 25, 380, 14, 64, 8, 12,
       ['1.5 cups cooked rice', '1.5 cups cooked black beans, drained', '1 onion, diced', '4 garlic cloves', '1 pepper, diced', 'oil, salt, cilantro'],
       ['Sauté onion, pepper, garlic.', 'Add beans with a splash of liquid, mash slightly.', 'Stir in rice, toss to coat.', 'Top with cilantro.']],
      ['Atol de Elote Bowl', 'Sweet corn drink-bowl with cinnamon.', 25, 380, 12, 56, 14, 4,
       ['4 corn cobs (kernels) or 3 cups frozen', '4 cups milk', '1/3 cup sugar', '1 cinnamon stick', 'vanilla, salt'],
       ['Blend corn with milk smooth.', 'Strain into pot. Add cinnamon, sugar, salt.', 'Simmer 15 min stirring until thick.', 'Serve warm in bowls (more soup than drink).']],
      ['Gallo en Chicha Bowl', 'Chicken in fermented-corn-pineapple stew (chicha).', 50, 480, 36, 38, 14, 4,
       ['1 whole chicken, cut up', '2 cups pineapple chunks', '1 cup chicha or apple juice', '1 onion, diced', '1 pepper, diced', 'cumin, oregano, oil, salt'],
       ['Brown chicken. Add onion, pepper.', 'Pour in chicha and pineapple.', 'Add 1 cup water; simmer 30 min.', 'Reduce sauce 5 min, serve over rice.']],
      ['Salpicón Salvadoreño', 'Cold minced beef salad with mint and radish.', 25, 420, 32, 14, 26, 3,
       ['1 lb cooked beef (from leftover or boiled flank), finely minced', '1 bunch radishes, finely diced', '4 scallions, finely sliced', '1/2 cup mint, chopped', 'lime, olive oil, salt'],
       ['Combine beef, radish, scallion, mint.', 'Dress with lime juice, olive oil, salt.', 'Toss and chill 10 min.', 'Serve over rice or in tortillas.']],
      ['Plátanos en Mole con Frijoles', 'Plantains in chocolate-tomato sauce over beans.', 35, 520, 14, 78, 22, 14,
       ['3 ripe plantains, sliced', '1 cup mole sauce (jarred or homemade)', '1.5 cups cooked black beans', '1 cup rice', 'crema, cilantro, oil'],
       ['Pan-fry plantains until caramelized 8 min.', 'Warm mole sauce, ladle over plantains.', 'Plate beans and rice alongside.', 'Drizzle crema, top with cilantro.']],
    ])
  },
  {
    cuisine: 'Puerto Rican', canonical: 'puerto_rican',
    dishes: makeBatch('pr', [
      ['Arroz con Gandules', 'Pigeon-pea rice with sofrito and pork.', 45, 520, 22, 72, 16, 10,
       ['1.5 cups long-grain rice', '1 can pigeon peas (gandules), drained', '4 oz salt pork or bacon, diced', '1/2 cup sofrito', '1 packet sazón (or 1 tsp annatto + cumin)', '1/4 cup pitted olives', '3 cups stock'],
       ['Crisp pork in pot. Add sofrito and sazón, sauté 3 min.', 'Add gandules, olives.', 'Stir in rice and stock; cover, cook 22 min.', 'Rest 10 min, fluff.']],
      ['Pernil', 'Garlic-oregano pork shoulder roast.', 120, 540, 38, 6, 38, 1,
       ['3 lb skin-on pork shoulder', '8 garlic cloves', '2 tbsp oregano', '1 tbsp cumin', '1/4 cup olive oil', '2 tbsp adobo seasoning', 'salt, lime'],
       ['Make paste of garlic, oregano, cumin, oil, salt. Stab pork all over and rub paste in.', 'Roast 325°F for 90 min, then 425°F 25 min for crackling skin.', 'Rest 20 min.', 'Shred meat, crack skin, serve with rice and beans.']],
      ['Pasteles Bowl', 'Deconstructed plantain pasteles with pork.', 50, 580, 28, 56, 28, 8,
       ['2 green plantains, grated', '1 lb pork shoulder, cubed', '1/2 cup sofrito', '1/4 cup olives', '1/4 cup raisins', 'sazón, oil, salt', 'banana leaves (optional)'],
       ['Brown pork. Add sofrito and sazón, simmer 30 min.', 'Stir in olives and raisins.', 'Pan-fry grated plantain in patties 4 min per side.', 'Plate plantain cakes topped with pork stew.']],
      ['Pollo Guisado Boricua', 'Sofrito-stewed chicken with potatoes.', 40, 460, 36, 32, 18, 5,
       ['8 chicken thighs', '2 potatoes, cubed', '1/2 cup sofrito', '1 packet sazón', '1 can tomato sauce', '1/4 cup olives', '1/4 cup raisins', 'oil, salt'],
       ['Brown chicken. Add sofrito and sazón.', 'Stir in tomato sauce, olives, raisins.', 'Add potatoes and 1 cup water; simmer 25 min.', 'Serve over rice.']],
      ['Mofongo de Pollo', 'Garlic-mashed plantain with chicken.', 35, 540, 32, 56, 22, 6,
       ['3 green plantains', '4 oz pork rinds (chicharrones), crushed', '6 garlic cloves', '1 lb cooked shredded chicken in sofrito', 'oil, salt, lime, broth'],
       ['Fry plantain chunks 8 min until soft. Drain.', 'Mash with garlic, chicharrones, salt, splash of broth.', 'Form into mound or stuff with chicken.', 'Drizzle pan sauce, serve with lime.']],
      ['Habichuelas Guisadas', 'Stewed pink beans with sofrito.', 35, 360, 16, 52, 8, 14,
       ['2 cans pink (habichuelas) beans', '1/2 cup sofrito', '1 can tomato sauce', '1 packet sazón', '1 potato, diced', '1/4 cup pitted olives', 'oil, salt'],
       ['Sauté sofrito in oil 3 min.', 'Add tomato sauce and sazón.', 'Add beans (with their liquid), potato, olives.', 'Simmer 18 min until thick.']],
      ['Sancocho Boricua', 'Beef and root-vegetable stew.', 75, 520, 36, 38, 22, 7,
       ['1.5 lb beef chuck, cubed', '1 lb yuca + plantain + yautia, mixed chunks', '1 corn cob, halved', '1/2 cup sofrito', '1 packet sazón', 'cilantro, salt'],
       ['Brown beef. Add sofrito and sazón.', 'Cover with water; simmer 50 min.', 'Add roots and corn; cook 18 min.', 'Stir in cilantro and serve.']],
      ['Alcapurrias Bowl', 'Yuca-plantain dough with picadillo (deconstructed).', 50, 540, 26, 56, 24, 6,
       ['2 green plantains, grated', '1/2 lb yautia or yuca, grated', '1 lb ground beef', '1/2 cup sofrito', 'sazón, olives, capers, salt, oil'],
       ['Mix grated roots with salt; rest 10 min.', 'Brown ground beef with sofrito and sazón. Stir in olives and capers.', 'Form root mixture into patties, pan-fry 4 min per side.', 'Plate patties with picadillo on top.']],
      ['Asopao de Pollo', 'Soupy chicken and rice.', 45, 480, 32, 52, 14, 4,
       ['8 chicken thighs', '1 cup rice', '1/2 cup sofrito', '1 packet sazón', '6 cups stock', '1/4 cup olives', 'cilantro, salt'],
       ['Brown chicken. Add sofrito and sazón.', 'Pour in stock, simmer 20 min.', 'Add rice and olives, cook 18 min.', 'Should stay soupy; finish with cilantro.']],
      ['Bistec Encebollado', 'Sliced steak smothered in onions.', 30, 480, 36, 18, 28, 4,
       ['4 thin sliced steaks (cube steak or sirloin)', '3 onions, sliced thin', '6 garlic cloves', '1/4 cup vinegar', 'oregano, oil, salt, pepper'],
       ['Marinate steaks in garlic, vinegar, oregano 15 min.', 'Sear 1.5 min per side. Remove.', 'Wilt onions in same pan 10 min.', 'Return steaks, simmer 5 min in onions, serve over rice.']],
    ])
  },
  {
    cuisine: 'Greek', canonical: 'greek',
    dishes: makeBatch('gr', [
      ['Chicken Souvlaki Bowls', 'Lemon-oregano chicken over rice with tzatziki.', 30, 540, 38, 56, 18, 4,
       ['1.5 lb chicken thighs, cubed', '3 lemons', '2 tbsp oregano', '4 garlic cloves', '1.5 cups cooked rice', '1 cup tzatziki', 'cucumber, tomato, red onion'],
       ['Marinate chicken in lemon, oregano, garlic, oil 20 min.', 'Skewer or pan-sear 4 min per side.', 'Build bowl: rice, chicken, cucumber, tomato, onion.', 'Top with tzatziki and lemon.']],
      ['Moussaka', 'Layered eggplant, beef, and béchamel.', 75, 560, 28, 32, 36, 6,
       ['2 eggplants, sliced and salted', '1 lb ground lamb or beef', '1 onion, diced', '1 can crushed tomatoes', '2 cups milk', '3 tbsp butter + 3 tbsp flour', 'cinnamon, nutmeg, parmesan'],
       ['Roast eggplant slices 20 min. Brown meat with onion, cinnamon, tomato; simmer 12 min.', 'Make béchamel: butter+flour+milk+nutmeg, simmer 5 min.', 'Layer eggplant, meat, eggplant, béchamel; top with parmesan.', 'Bake 375°F for 30 min until bubbling.']],
      ['Gemista (Stuffed Vegetables)', 'Tomatoes and peppers stuffed with herbed rice.', 60, 380, 10, 64, 12, 8,
       ['4 tomatoes + 4 peppers, hollowed', '1 cup rice', '1 onion, diced', '1/4 cup pine nuts', '1/4 cup raisins', '1/2 cup mint and dill, chopped', 'olive oil, lemon, salt'],
       ['Sauté onion, stir in rice, pine nuts, herbs, raisins.', 'Stuff vegetables, replace tops.', 'Place in oiled dish, drizzle olive oil and a splash of water.', 'Bake 375°F for 50 min until rice cooked.']],
      ['Fasolakia (Green Beans in Tomato)', 'Slow-cooked green beans with potatoes and tomato.', 45, 320, 8, 38, 18, 8,
       ['1.5 lb green beans, trimmed', '2 potatoes, cubed', '1 onion, diced', '1 can crushed tomatoes', '4 garlic cloves', '1/2 cup olive oil', 'dill, salt'],
       ['Sauté onion in lots of olive oil 6 min.', 'Add garlic, tomatoes; simmer 5 min.', 'Add beans and potatoes with 1/2 cup water. Cover, simmer 30 min.', 'Stir in dill, eat warm or room temp.']],
      ['Briam', 'Roasted vegetable medley.', 70, 320, 6, 42, 14, 8,
       ['2 zucchini, sliced', '2 potatoes, sliced', '1 eggplant, sliced', '1 red pepper, sliced', '1 can crushed tomatoes', '1 onion, sliced', 'olive oil, oregano, salt'],
       ['Layer all vegetables in baking dish with onion and tomato.', 'Drizzle generously with olive oil, oregano, salt.', 'Roast 400°F covered 35 min.', 'Uncover, roast 15 more min until edges caramelize.']],
      ['Lemon Chicken (Kotopoulo Lemonato)', 'Whole chicken roasted with lemon and oregano potatoes.', 75, 580, 36, 42, 28, 5,
       ['4 chicken leg quarters', '4 potatoes, wedged', '4 lemons', '4 garlic cloves', '2 tbsp oregano', 'olive oil, salt, pepper, chicken broth'],
       ['Toss potatoes with lemon juice, oregano, oil, salt in pan.', 'Place chicken on top, drizzle more lemon oil.', 'Pour 1 cup broth around. Roast 400°F for 55 min.', 'Spoon pan juices over to serve.']],
      ['Gigantes Plaki (Giant Beans in Tomato)', 'Slow-baked giant lima beans.', 60, 360, 14, 56, 8, 16,
       ['1 lb giant lima beans, soaked overnight', '1 onion, diced', '1 carrot, diced', '4 garlic cloves', '1 can crushed tomatoes', '1/3 cup olive oil', 'dill, parsley, salt'],
       ['Boil beans 35 min until just tender.', 'Sauté onion, carrot, garlic. Add tomato, simmer 5 min.', 'Combine with beans in baking dish, drizzle olive oil.', 'Bake 400°F for 25 min. Top with dill and parsley.']],
      ['Spanakopita Bowl', 'Spinach-feta filling over phyllo crackers.', 35, 380, 18, 32, 22, 5,
       ['1 lb spinach, wilted and squeezed', '1 cup feta, crumbled', '4 scallions, sliced', '1/4 cup dill', '2 eggs', '4 sheets phyllo, brushed with butter and baked into crackers', 'lemon, salt'],
       ['Mix spinach, feta, scallion, dill, egg, salt.', 'Stack 4 phyllo sheets with butter; bake 8 min until crisp; break.', 'Spoon spinach mixture into bowls.', 'Top with phyllo crackers and lemon zest.']],
      ['Pastitsio', 'Layered pasta and meat sauce with béchamel.', 75, 580, 28, 56, 28, 4,
       ['12 oz long pasta', '1 lb ground beef', '1 can crushed tomatoes', '1 onion, diced', '2 cups milk', '3 tbsp butter + 3 tbsp flour', 'cinnamon, parmesan, nutmeg'],
       ['Boil pasta 1 min less than package. Brown beef with onion, cinnamon, tomato; simmer 12 min.', 'Make béchamel: butter+flour+milk+nutmeg.', 'Layer half pasta, all meat, rest of pasta, all béchamel.', 'Bake 375°F for 35 min until golden.']],
      ['Bifteki', 'Greek-spiced beef patties stuffed with feta.', 30, 460, 32, 18, 28, 3,
       ['1.25 lb ground beef', '1/2 cup grated onion', '1/4 cup parsley', '4 oz feta', '2 garlic cloves', 'oregano, oil, salt, pepper', 'pita, tzatziki to serve'],
       ['Mix beef, onion, parsley, garlic, oregano, salt.', 'Form 8 patties; tuck a feta cube into each, seal.', 'Pan-sear or grill 4 min per side.', 'Serve in pita with tzatziki.']],
    ])
  },
  {
    cuisine: 'French', canonical: 'french',
    dishes: makeBatch('fr', [
      ['Coq au Vin', 'Red wine-braised chicken with bacon and mushrooms.', 75, 580, 38, 18, 32, 3,
       ['8 bone-in chicken thighs', '4 oz bacon, diced', '8 oz mushrooms, halved', '1 cup pearl onions', '2 cups red wine', '1 cup chicken stock', 'thyme, butter, flour, salt'],
       ['Crisp bacon. Brown chicken. Sauté mushrooms and onions in fat.', 'Pour off fat, dust pan with flour, whisk in wine and stock.', 'Return chicken with thyme; simmer covered 50 min.', 'Reduce sauce 5 min, swirl in butter.']],
      ['Ratatouille', 'Slow-cooked summer vegetables.', 60, 280, 6, 42, 12, 12,
       ['1 eggplant, cubed', '2 zucchini, cubed', '2 peppers, cubed', '1 onion, diced', '1 can crushed tomatoes', '4 garlic cloves', 'thyme, basil, olive oil, salt'],
       ['Brown vegetables separately in olive oil 4 min each.', 'Combine with tomato, garlic, thyme.', 'Simmer covered 35 min until everything soft.', 'Top with basil; eat warm or room temp.']],
      ['Salade Lyonnaise', 'Frisée with bacon, poached egg, mustard vinaigrette.', 20, 380, 18, 14, 28, 4,
       ['1 head frisée or curly endive', '6 oz bacon, diced', '4 eggs', '2 tbsp Dijon mustard', '3 tbsp red wine vinegar', 'olive oil, salt, pepper', 'crouton'],
       ['Crisp bacon, reserve fat.', 'Whisk Dijon, vinegar, olive oil, bacon fat.', 'Poach eggs in vinegar water 3 min.', 'Toss greens with dressing, top with bacon, croutons, and a poached egg per plate.']],
      ['Croque-Style Bake', 'Croque monsieur deconstructed in casserole.', 35, 540, 28, 38, 28, 2,
       ['8 slices brioche or sourdough', '8 oz ham, sliced', '1.5 cups gruyère, grated', '2 cups milk', '3 eggs', 'Dijon, butter, nutmeg, salt'],
       ['Butter bread, layer with ham and gruyère in baking dish.', 'Whisk eggs, milk, Dijon, nutmeg.', 'Pour over bread, press down, rest 10 min.', 'Bake 375°F for 25 min until puffed and golden.']],
      ['Salade Niçoise', 'Tuna, eggs, potatoes, beans, olives, anchovies.', 35, 480, 30, 32, 24, 8,
       ['8 oz seared tuna or canned', '4 eggs, hard-boiled', '8 small potatoes, boiled', '1 cup green beans, blanched', '1/2 cup olives', '4 anchovies', 'butter lettuce, tomatoes, Dijon vinaigrette'],
       ['Boil potatoes and beans separately. Cool.', 'Whisk Dijon, vinegar, olive oil for dressing.', 'Compose plates: lettuce, then potatoes, beans, tomatoes, eggs, tuna, olives, anchovies.', 'Drizzle dressing.']],
      ['Blanquette de Veau', 'White veal stew with mushrooms.', 90, 540, 38, 22, 28, 3,
       ['2 lb veal shoulder (or chicken thigh) cubed', '8 oz mushrooms, quartered', '1 onion + 2 carrots, sliced', '1 cup cream', '3 tbsp butter + 3 tbsp flour', 'parsley, lemon, salt'],
       ['Simmer veal in salted water with onion, carrots 70 min.', 'Sauté mushrooms in butter.', 'Make roux from butter+flour, whisk in 2 cups veal broth and cream.', 'Combine, finish with parsley and lemon.']],
      ['Hachis Parmentier', 'French shepherd\'s pie with leftover beef.', 50, 520, 28, 56, 22, 4,
       ['1 lb cooked shredded beef (pot roast)', '2 lb potatoes, cubed', '1 onion, diced', '1/2 cup cream', '2 tbsp butter', '1 cup gruyère, grated', 'thyme, parsley, salt'],
       ['Boil potatoes 18 min, mash with cream and butter.', 'Sauté onion, mix with shredded beef, thyme, parsley.', 'Layer beef in dish, top with mash, then gruyère.', 'Bake 400°F for 25 min until golden.']],
      ['Pissaladière Bowl', 'Caramelized onion-anchovy-olive pizza, deconstructed.', 60, 380, 12, 48, 16, 6,
       ['4 onions, sliced thin', '8 anchovies', '1/3 cup nicoise olives, pitted', '4 pita or flatbreads, crisped', 'thyme, olive oil, salt'],
       ['Caramelize onions in olive oil 35 min until jammy.', 'Crisp pitas in oven.', 'Top each pita with onions, lay anchovies in lattice, scatter olives.', 'Drizzle olive oil and thyme; serve as open-face plates.']],
      ['Lentilles du Puy with Sausage', 'French green lentils with mustard and merguez.', 40, 520, 28, 48, 22, 14,
       ['1.5 cups Puy lentils', '4 merguez or sausages', '1 carrot + 1 onion + 2 celery, diced', '2 tbsp Dijon', 'thyme, oil, salt, vinegar'],
       ['Simmer lentils in water with thyme 25 min until tender.', 'Sauté carrot, onion, celery 6 min.', 'Sear sausages alongside.', 'Drain lentils, toss with vegetables, Dijon, vinegar; serve sausage on top.']],
      ['Poulet Basquaise', 'Basque-style chicken with peppers and tomatoes.', 60, 480, 36, 22, 26, 5,
       ['8 chicken thighs', '4 peppers (mixed colors), sliced', '1 onion, sliced', '4 garlic cloves', '1 can crushed tomatoes', '1/4 cup parsley', 'piment d\'Espelette, oil, salt'],
       ['Brown chicken. Sauté peppers and onion.', 'Add tomatoes, garlic, piment d\'Espelette.', 'Return chicken; simmer 35 min.', 'Top with parsley, serve with rice.']],
    ])
  },
  {
    cuisine: 'Nigerian', canonical: 'nigerian',
    dishes: makeBatch('ng', [
      ['Jollof Rice', 'Smoky tomato rice with peppers.', 50, 480, 14, 78, 12, 5,
       ['2 cups long-grain rice', '1 can crushed tomatoes', '2 red peppers, blended smooth', '1 onion, blended', 'scotch bonnet (or jalapeño)', 'thyme, curry powder, bay, oil, salt'],
       ['Reduce blended tomato-pepper-onion in oil 10 min until darker.', 'Stir in spices and bay.', 'Add rice and 2 cups stock; cover, cook 22 min.', 'Off heat, char rice on bottom 3 min for smoky party rice flavor.']],
      ['Egusi Soup', 'Melon-seed thickened stew with greens.', 60, 540, 32, 22, 36, 6,
       ['1.5 lb assorted meat (beef, smoked turkey)', '1 cup ground egusi (melon seed)', '1 onion, blended', '4 cups spinach or bitterleaf', 'palm oil, scotch bonnet, stock', 'crayfish powder, salt'],
       ['Boil meat with onion, salt 35 min.', 'Bloom palm oil 2 min, add blended onion+pepper.', 'Stir in egusi and stock; simmer 20 min until thick.', 'Add greens and meat, cook 5 min.']],
      ['Suya Beef Bowl', 'Peanut-spiced grilled beef strips.', 30, 460, 36, 18, 26, 4,
       ['1.25 lb sirloin, sliced thin', '1/3 cup yaji spice (peanut + cayenne + ginger + garlic)', 'red onion, tomato, cabbage', 'olive oil, lime'],
       ['Toss beef with yaji and oil, marinate 15 min.', 'Skewer or pan-sear 2 min per side.', 'Toss onion, tomato, cabbage with lime.', 'Plate beef over slaw, dust with extra yaji.']],
      ['Efo Riro', 'Spinach stew with beef and smoked fish.', 50, 480, 30, 22, 28, 6,
       ['1 lb beef, cubed', '4 oz smoked fish, flaked', '2 lb spinach, chopped', '2 red peppers, blended', '1 onion, blended', 'palm oil, ground crayfish, locust beans (iru), salt'],
       ['Boil beef 30 min in salted water.', 'Bloom palm oil. Add blended pepper-onion, simmer 8 min.', 'Stir in iru, crayfish, smoked fish, beef.', 'Fold in spinach last 3 min.']],
      ['Ofada Rice with Ayamase', 'Brown unpolished rice with green-pepper stew.', 60, 540, 22, 78, 18, 8,
       ['1.5 cups ofada or short-grain brown rice', '1.5 lb assorted meat', '4 green peppers (rodo + tatashe), blended', '1 onion, sliced', 'palm oil, locust beans, crayfish, salt'],
       ['Cook rice in 3 cups water 35 min.', 'Bleach palm oil (heat then cool 3 min).', 'Sauté onion in oil. Add blended green peppers, simmer 12 min.', 'Add boiled meat and seasonings; serve over ofada wrapped in banana leaf or plate.']],
      ['Akara (Bean Cakes)', 'Fried black-eyed pea fritters.', 35, 380, 22, 38, 18, 14,
       ['1.5 cups dry black-eyed peas, soaked, peeled, blended', '1 onion, blended', 'scotch bonnet, salt', 'oil for frying', 'pap or bread to serve'],
       ['Whisk bean batter with onion and pepper paste 5 min until light.', 'Drop spoonfuls into 350°F oil.', 'Fry 4 min until golden, flipping.', 'Drain, serve with pap or bread.']],
      ['Dodo with Stew', 'Sweet plantains with tomato pepper stew.', 30, 460, 14, 78, 14, 8,
       ['3 ripe plantains, sliced', '1 lb chicken thighs, cubed', '2 red peppers, blended', '1 can tomatoes', '1 onion, blended', 'curry, thyme, oil, salt'],
       ['Pan-fry plantain slices in oil until caramelized; reserve.', 'Brown chicken in same pan.', 'Add blended tomato-pepper-onion and spices; simmer 15 min.', 'Plate plantains with stew over rice.']],
      ['Ayamase (Designer Stew)', 'Roasted green pepper stew with assorted meat.', 60, 580, 32, 18, 38, 6,
       ['1.5 lb assorted meat', '6 green peppers + scotch bonnet, roasted and blended', '1 onion, sliced', '1/3 cup palm oil', 'locust beans (iru), crayfish, salt'],
       ['Roast green peppers and bonnet under broiler. Blend rough.', 'Bleach palm oil 3 min.', 'Sauté onion, add pepper purée; simmer 18 min.', 'Add boiled meat and seasonings, cook 8 more min.']],
      ['Asaro (Yam Pottage)', 'Soft-cooked yam in palm-oil tomato sauce.', 40, 460, 12, 78, 14, 8,
       ['2 lb yam (or sub: russet potato), cubed', '2 tomatoes, blended', '1 onion, blended', 'scotch bonnet', 'palm oil, ground crayfish, salt', 'spinach (optional)'],
       ['Boil yam in seasoned water 18 min until just tender.', 'Bloom palm oil with blended tomato, onion, bonnet.', 'Mash some of the cooked yam into the sauce for body.', 'Stir in crayfish and optional spinach; cook 4 min.']],
      ['Ofe Nsala (White Soup)', 'Pepper-soup-style fish stew with yam thickener.', 45, 380, 32, 22, 14, 4,
       ['1.5 lb catfish or any white fish, cleaned', '1/2 lb yam, boiled and pounded smooth', '1 onion, blended', '2 tbsp utazi or basil leaves', 'uziza pepper, ehuru, ginger, garlic, salt'],
       ['Simmer fish gently with onion, ginger, ehuru in 5 cups water 12 min.', 'Whisk in pounded yam paste in small amounts.', 'Stir until thickened, 6 min.', 'Add utazi/basil at the end.']],
    ])
  },
];

// Helper to convert short tuple form into DishSpec.
function makeBatch(prefix: string, rows: Array<[string, string, number, number, number, number, number, number, string[], string[]]>): DishSpec[] {
  return rows.map(([title, desc, cookTime, cal, pro, carb, fat, fiber, ing, steps]) => ({
    title, desc, cookTime, cal, pro, carb, fat, fiber, ing, steps,
  }));
}

export function buildWorldTourSeed(): WorldTourRecipe[] {
  const out: WorldTourRecipe[] = [];
  for (const batch of [...BATCHES, ...BATCHES_2]) {
    batch.dishes.forEach((d, i) => {
      out.push({
        id: `worldtour-${batch.canonical}-${String(i + 1).padStart(2, '0')}`,
        title: d.title,
        description: d.desc,
        cuisine: batch.cuisine,
        canonicalCuisine: batch.canonical,
        mealType: 'dinner',
        cookTime: d.cookTime,
        servings: 4,
        difficulty: d.cookTime <= 30 ? 'easy' : d.cookTime <= 60 ? 'medium' : 'hard',
        calories: d.cal,
        protein: d.pro,
        carbs: d.carb,
        fat: d.fat,
        fiber: d.fiber,
        ingredients: d.ing,
        instructions: d.steps,
      });
    });
  }
  return out;
}

async function main() {
  const prisma = new PrismaClient();
  const seed = buildWorldTourSeed();
  let created = 0;
  let updated = 0;
  for (const r of seed) {
    const existing = await prisma.recipe.findUnique({ where: { id: r.id } });
    await prisma.recipe.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        title: r.title,
        description: r.description,
        cuisine: r.cuisine,
        canonicalCuisine: r.canonicalCuisine,
        mealType: r.mealType,
        cookTime: r.cookTime,
        servings: r.servings,
        difficulty: r.difficulty,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        fiber: r.fiber,
        source: 'database',
        ingredients: {
          create: r.ingredients.map((text, idx) => ({ text, order: idx })),
        },
        instructions: {
          create: r.instructions.map((text, idx) => ({ step: idx + 1, text })),
        },
      },
      update: {
        title: r.title,
        description: r.description,
        canonicalCuisine: r.canonicalCuisine,
      },
    });
    if (existing) updated++; else created++;
  }
  // eslint-disable-next-line no-console
  console.log(`seedWorldTourBacklogFill: created=${created} updated=${updated} total=${seed.length}`);
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('seedWorldTourBacklogFill failed:', err);
    process.exit(1);
  });
}
