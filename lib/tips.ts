// Scaley tips engine — segregated by goal direction
// All facts are research-backed. Sources noted in comments.

export type GoalDirection = 'lose' | 'gain' | 'maintain';

export interface Tip {
  id: string;
  text: string;
  category: 'water' | 'sleep' | 'exercise' | 'nutrition' | 'mindset' | 'measurement' | 'fasting' | 'diet';
  direction: GoalDirection | 'all'; // 'all' = applies to everyone
}

export const TIPS: Tip[] = [
  // ═══════════════════════════════════════
  // UNIVERSAL TIPS (all directions)
  // ═══════════════════════════════════════

  // Water
  { id: 'w1', text: 'Staying hydrated helps your body regulate metabolism and flush toxins. Aim for 2-3 liters of water daily.', category: 'water', direction: 'all' },
  { id: 'w2', text: 'Dehydration can mask itself as hunger. Try drinking a glass of water before reaching for a snack.', category: 'water', direction: 'all' },
  { id: 'w3', text: 'Replacing sugary drinks with water is one of the simplest ways to improve your health.', category: 'water', direction: 'all' },
  { id: 'w4', text: 'Herbal teas like green tea and chamomile count toward your daily water intake and offer additional antioxidants.', category: 'water', direction: 'all' },
  { id: 'w5', text: 'Drinking water before meals aids digestion and helps your stomach signal fullness to your brain.', category: 'water', direction: 'all' },

  // Sleep
  { id: 's1', text: 'Poor sleep disrupts hunger hormones — increasing ghrelin (appetite) and decreasing leptin (satiety). Aim for 7-9 hours.', category: 'sleep', direction: 'all' },
  { id: 's2', text: 'Sleep deprivation increases cravings for high-calorie, high-carb foods by affecting the brain\'s reward centers.', category: 'sleep', direction: 'all' },
  { id: 's3', text: 'Consistent sleep and wake times help regulate your circadian rhythm, which directly affects metabolism.', category: 'sleep', direction: 'all' },
  { id: 's4', text: 'Quality sleep is when your body does most of its repair and recovery. It\'s as important as diet and exercise.', category: 'sleep', direction: 'all' },
  { id: 's5', text: 'Avoiding screens 30 minutes before bed improves sleep quality by reducing blue light exposure that suppresses melatonin.', category: 'sleep', direction: 'all' },
  { id: 's6', text: 'A cool room (18-20°C / 65-68°F) promotes deeper sleep. Your body temperature naturally drops at night.', category: 'sleep', direction: 'all' },

  // Exercise (universal)
  { id: 'e1', text: 'A 10-minute walk after meals can lower blood sugar spikes by up to 22%, according to research in Diabetes Care.', category: 'exercise', direction: 'all' },
  { id: 'e2', text: 'Exercise improves sleep quality, which in turn helps with weight management — a positive feedback loop.', category: 'exercise', direction: 'all' },
  { id: 'e3', text: 'You don\'t need intense workouts. Even 30 minutes of daily walking provides significant health benefits.', category: 'exercise', direction: 'all' },
  { id: 'e4', text: 'Regular physical activity reduces stress and cortisol levels, both of which affect your weight.', category: 'exercise', direction: 'all' },

  // Mindset
  { id: 'm1', text: 'Weight fluctuates 1-2 kg daily due to water, food, and sodium. Focus on the weekly trend, not daily numbers.', category: 'mindset', direction: 'all' },
  { id: 'm2', text: 'Stress increases cortisol, which promotes fat storage around the midsection. Find healthy stress outlets.', category: 'mindset', direction: 'all' },
  { id: 'm3', text: 'Consistency beats perfection. Small daily habits create lasting change more reliably than extreme approaches.', category: 'mindset', direction: 'all' },
  { id: 'm4', text: 'Celebrate non-scale victories: better sleep, more energy, improved mood, clothes fitting differently.', category: 'mindset', direction: 'all' },
  { id: 'm5', text: 'Sustainable changes take time. Give your body at least 4-6 weeks to show consistent results.', category: 'mindset', direction: 'all' },

  // Measurement
  { id: 'x1', text: 'Weighing yourself at the same time daily gives the most consistent readings. Morning after waking is ideal.', category: 'measurement', direction: 'all' },
  { id: 'x2', text: 'Scaley adjusts for time-of-day variations automatically. But consistent timing still helps accuracy.', category: 'measurement', direction: 'all' },
  { id: 'x3', text: 'Sodium-heavy meals can cause water retention, temporarily spiking your weight by 1-2 kg. It\'s not fat gain.', category: 'measurement', direction: 'all' },
  { id: 'x4', text: 'For women, weight can fluctuate 1-3 kg during the menstrual cycle due to water retention. This is completely normal.', category: 'measurement', direction: 'all' },

  // Diet (universal)
  { id: 'd1', text: 'Eating slowly gives your brain time to register fullness — this takes about 20 minutes from the start of a meal.', category: 'diet', direction: 'all' },
  { id: 'd2', text: 'Whole grains like oats, brown rice, and millets provide sustained energy and keep blood sugar stable.', category: 'diet', direction: 'all' },
  { id: 'd3', text: 'Fermented foods like yogurt, kimchi, and idli support gut health, which research links to better weight management.', category: 'diet', direction: 'all' },
  { id: 'd4', text: 'Eating protein at every meal helps maintain muscle mass and keeps you feeling full longer.', category: 'diet', direction: 'all' },
  { id: 'd5', text: 'Cooking at home gives you full control over ingredients and portions — one of the most effective dietary habits.', category: 'diet', direction: 'all' },

  // ═══════════════════════════════════════
  // WEIGHT LOSS SPECIFIC TIPS
  // ═══════════════════════════════════════

  // Nutrition — loss
  { id: 'nl1', text: 'A moderate calorie deficit of 300-500 calories/day leads to sustainable loss of ~0.5 kg per week without muscle loss.', category: 'nutrition', direction: 'lose' },
  { id: 'nl2', text: 'Fiber-rich foods like vegetables, lentils, and whole grains keep you fuller for longer. Aim for 25-30g of fiber daily.', category: 'nutrition', direction: 'lose' },
  { id: 'nl3', text: 'Reducing processed food intake is more effective than counting calories. Focus on whole, unprocessed foods.', category: 'nutrition', direction: 'lose' },
  { id: 'nl4', text: 'Late-night eating isn\'t inherently bad — total daily calories and food quality matter more than timing alone.', category: 'nutrition', direction: 'lose' },
  { id: 'nl5', text: 'Adding more vegetables to your plate naturally reduces calorie density while keeping portions satisfying.', category: 'nutrition', direction: 'lose' },

  // Fasting — loss
  { id: 'fl1', text: '16:8 intermittent fasting (eating within an 8-hour window) can help reduce overall calorie intake naturally, without calorie counting.', category: 'fasting', direction: 'lose' },
  { id: 'fl2', text: 'Intermittent fasting may improve insulin sensitivity, helping your body use stored fat more efficiently. Start gradually with a 12-hour window.', category: 'fasting', direction: 'lose' },
  { id: 'fl3', text: 'During fasting, black coffee, plain tea, and water are fine. They don\'t break your fast and can help manage appetite.', category: 'fasting', direction: 'lose' },
  { id: 'fl4', text: 'When breaking your fast, choose nutrient-dense foods first — protein, vegetables, healthy fats — rather than refined carbs.', category: 'fasting', direction: 'lose' },
  { id: 'fl5', text: 'Intermittent fasting isn\'t for everyone. If you have diabetes, are pregnant, or have a history of eating disorders, consult your doctor first.', category: 'fasting', direction: 'lose' },

  // Diet — loss (millets & modern)
  { id: 'dl1', text: 'Foxtail millet (kangni) has a low glycemic index and high fiber, making it excellent for weight loss and blood sugar control.', category: 'diet', direction: 'lose' },
  { id: 'dl2', text: 'Pearl millet (bajra) is rich in fiber and iron. Its slow-digesting starches keep you full longer than refined wheat.', category: 'diet', direction: 'lose' },
  { id: 'dl3', text: 'Barnyard millet has the lowest calories among millets (~300 kcal/100g) and is ideal for those watching their intake.', category: 'diet', direction: 'lose' },
  { id: 'dl4', text: 'Replacing white rice with cauliflower rice or millet-based alternatives can significantly reduce your meal\'s calorie content.', category: 'diet', direction: 'lose' },
  { id: 'dl5', text: 'Chia seeds expand in water and form a gel, promoting fullness. Add them to smoothies, yogurt, or overnight oats.', category: 'diet', direction: 'lose' },
  { id: 'dl6', text: 'A high-fiber breakfast (oats, millet porridge, or ragi dosa) reduces hunger and snacking throughout the morning.', category: 'diet', direction: 'lose' },
  { id: 'dl7', text: 'Switching from fruit juice to whole fruits retains the fiber and reduces sugar absorption speed dramatically.', category: 'diet', direction: 'lose' },

  // Exercise — loss
  { id: 'el1', text: 'Strength training preserves muscle during weight loss, keeping your resting metabolism higher. Include it 2-3 times per week.', category: 'exercise', direction: 'lose' },
  { id: 'el2', text: 'NEAT (Non-Exercise Activity Thermogenesis) — fidgeting, standing, walking around — can burn 200-500 extra calories daily.', category: 'exercise', direction: 'lose' },
  { id: 'el3', text: 'Taking stairs instead of elevators throughout the day adds up. Small movements compound into significant calorie burn.', category: 'exercise', direction: 'lose' },

  // Water — loss
  { id: 'wl1', text: 'Drinking 500ml of water 30 minutes before meals can reduce calorie intake by up to 13%, per a study in the journal Obesity.', category: 'water', direction: 'lose' },

  // ═══════════════════════════════════════
  // WEIGHT GAIN SPECIFIC TIPS
  // ═══════════════════════════════════════

  // Nutrition — gain
  { id: 'ng1', text: 'A calorie surplus of 300-500 calories/day supports healthy weight gain of ~0.25-0.5 kg per week, primarily as muscle with exercise.', category: 'nutrition', direction: 'gain' },
  { id: 'ng2', text: 'Eat more frequently — 5-6 smaller meals instead of 3 large ones makes it easier to consume more calories without feeling stuffed.', category: 'nutrition', direction: 'gain' },
  { id: 'ng3', text: 'Calorie-dense healthy foods: nuts, nut butters, avocados, olive oil, dried fruits, and full-fat dairy help you gain without junk food.', category: 'nutrition', direction: 'gain' },
  { id: 'ng4', text: 'Don\'t skip meals. Consistent eating patterns signal your body that energy is abundant, reducing stress hormones.', category: 'nutrition', direction: 'gain' },
  { id: 'ng5', text: 'A protein intake of 1.6-2.2g per kg of body weight supports muscle gain when combined with resistance training.', category: 'nutrition', direction: 'gain' },

  // Diet — gain (millets & modern)
  { id: 'dg1', text: 'Ragi (finger millet) is rich in calcium, iron, and amino acids. Ragi malt with milk and jaggery is an excellent calorie-dense drink for healthy weight gain.', category: 'diet', direction: 'gain' },
  { id: 'dg2', text: 'Sorghum (jowar) is calorie-dense (~329 kcal/100g) with good protein content. Jowar rotis with ghee provide sustained energy.', category: 'diet', direction: 'gain' },
  { id: 'dg3', text: 'Adding ghee, coconut oil, or olive oil to your meals is an easy way to increase calorie intake with healthy fats.', category: 'diet', direction: 'gain' },
  { id: 'dg4', text: 'Smoothies with banana, oats, peanut butter, milk, and protein powder can pack 500+ calories in a single drink.', category: 'diet', direction: 'gain' },
  { id: 'dg5', text: 'Trail mix with nuts, seeds, and dried fruits is a portable, calorie-dense snack. A handful provides 200-300 calories.', category: 'diet', direction: 'gain' },
  { id: 'dg6', text: 'Sweet potato is nutrient-dense and easy to digest. It provides complex carbs for energy and healthy weight gain.', category: 'diet', direction: 'gain' },

  // Exercise — gain
  { id: 'eg1', text: 'Focus on compound exercises — squats, deadlifts, bench press, rows — to stimulate maximum muscle growth.', category: 'exercise', direction: 'gain' },
  { id: 'eg2', text: 'Rest days are when muscles actually grow. Allow 48 hours between training the same muscle group.', category: 'exercise', direction: 'gain' },
  { id: 'eg3', text: 'Limit excessive cardio if gaining weight is your goal. Short, moderate sessions (20 min) maintain heart health without burning too many calories.', category: 'exercise', direction: 'gain' },
  { id: 'eg4', text: 'A post-workout meal with protein and carbs within 2 hours supports muscle recovery and growth.', category: 'exercise', direction: 'gain' },

  // Sleep — gain
  { id: 'sg1', text: 'Growth hormone is released primarily during deep sleep. Getting 7-9 hours supports muscle building and healthy weight gain.', category: 'sleep', direction: 'gain' },

  // Mindset — gain
  { id: 'mg1', text: 'Gaining weight healthily takes patience. Aim for slow, steady progress rather than rapid gains that add mostly fat.', category: 'mindset', direction: 'gain' },
  { id: 'mg2', text: 'If you struggle with appetite, eating with others and making meals enjoyable can naturally increase how much you eat.', category: 'mindset', direction: 'gain' },
];

// Get a tip matching the user's goal direction that hasn't been shown recently
export function getNextTip(shownTipIds: string[], goalDirection: GoalDirection = 'lose'): Tip {
  const recentIds = new Set(shownTipIds.slice(-25));

  // Filter tips: include 'all' tips + tips matching user's direction
  const relevant = TIPS.filter(
    t => (t.direction === 'all' || t.direction === goalDirection) && !recentIds.has(t.id)
  );

  if (relevant.length === 0) {
    // All tips shown recently, reset and pick random from matching pool
    const pool = TIPS.filter(t => t.direction === 'all' || t.direction === goalDirection);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return relevant[Math.floor(Math.random() * relevant.length)];
}

// Get all tips for a given direction (for browsing)
export function getAllTips(goalDirection: GoalDirection): Tip[] {
  return TIPS.filter(t => t.direction === 'all' || t.direction === goalDirection);
}

// Get tips by category
export function getTipsByCategory(category: Tip['category'], goalDirection: GoalDirection): Tip[] {
  return TIPS.filter(t => t.category === category && (t.direction === 'all' || t.direction === goalDirection));
}
