// Diet rules the next-day planner follows, keyed by person id (see PEOPLE in src/App.jsx).
// This file runs only on the server, so it never ships to the browser.
module.exports = {
  person1: {
    goal: 'Fat loss with low-GI, low-salt, high-protein eating',
    eatingWindow: '9:00 AM to 6:00 PM; fasting outside it (water, black coffee/tea, methi water only)',
    meals: ['Breakfast 9:00 AM', 'Lunch 1:00 PM (biggest meal)', 'Snack 4:00 PM (optional)', 'Dinner 5:30 PM, finish by 6:00 PM'],
    targets: {
      calories: '1,800-1,900 kcal',
      protein: '120-130 g',
      carbs: '75-100 g; rice or millet only at lunch, max 1/2 cup cooked; no grain at dinner',
      fat: 'mostly gingelly/groundnut oil, nuts, seeds, fish; ghee/butter max 1 tsp',
      salt: 'max 5 g/day; no pickle, appalam, vadam or dry fish; only one sambar/rasam a day',
      fibre: '35 g+; 400-500 g vegetables and one keerai dish daily',
    },
    rules: [
      'No sugar, sweets, fruit juice, bakery, maida, deep-fried snacks or alcohol',
      'Fish (sardine/mathi or mackerel/ayala) on Monday, Wednesday and Friday',
      'Eggs: 3 a day, up to 4 on days without fish or chicken',
      'Red or organ meat at most once a week',
      'Fruit: 1 low-GI portion a day (guava, amla, papaya, apple, orange)',
      'Idli/dosa max 2 pieces and always with an egg or sundal',
      'Daily: 1 tbsp ground flax or chia (e.g. in curd)',
      'Sunday lunch is a flexible family meal: half plate vegetables, quarter protein, quarter rice; no sweets',
    ],
    cuisine: 'Tamil home-cooked family food: poriyal, kootu, keerai, sambar, rasam, mor kuzhambu, adai, pesarattu, dosa, sundal, egg, fish and chicken curries. Meals come from the family pot, nothing cooked separately; dinner is set aside from the lunch cooking.',
  },
  default: {
    goal: 'Balanced, high-protein eating',
    eatingWindow: 'Three meals during the day',
    meals: ['Breakfast', 'Lunch', 'Snack', 'Dinner'],
    targets: { protein: '1.2 g per kg body weight', carbs: 'moderate, mostly whole foods', salt: 'max 5 g/day' },
    rules: ['Limit sugar and fried food', 'Half of each plate vegetables'],
    cuisine: 'South Indian home food',
  },
}
