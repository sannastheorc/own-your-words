// SEEDSED — content.js
// Purpose: comprehension content in a grown-up voice. Text Thread: read a conversation, pick the reply
//          that makes sense, and type a key word. Your Call: short branching stories where he has to
//          understand the page to choose well; a poor choice loops back with a laugh, never a loss.
//          Read It: short how-tos with questions, so reading has a real reason.
// Boundaries: data only. Topics follow his interests (camping and RVs, fixing things up, cooking and
//             baking), written generally: nothing here identifies him.

const m = (from, text) => ({ type: "msg", from, text });
const choose = (prompt, right, ...others) => ({ type: "choose", prompt, right: right[0], why: right[1], options: [right[0], ...others] });
const type = (prompt, word) => ({ type: "typed", prompt, word });

export const THREADS = [
  { id: "cake", title: "The birthday cake", steps: [
    m("Sis", "Can you bake the cake for Dad's birthday on Saturday?"), m("Sis", "He wants chocolate with white frosting. Make it the night before so it can cool."),
    choose("What kind of cake does Dad want?", ["Chocolate with white frosting", "Sis said chocolate with white frosting."], "White with chocolate frosting", "Carrot cake"),
    choose("When should you bake it?", ["The night before", "Sis said the night before, so it can cool."], "Saturday after the party", "A week early"),
    type("Type the word: Sure. I will make the ______ tonight.", "frosting") ] },
  { id: "site", title: "Campground plans", steps: [
    m("Jay", "We got site 14 at the campground for Friday."), m("Jay", "Check-in is after 2. The hookups are on the left side."),
    choose("When can you check in?", ["After 2", "Jay said check-in is after 2."], "Before noon", "On Sunday"),
    choose("Which site is yours?", ["Site 14", "Jay said you got site 14."], "Site 2", "Site 41"),
    type("Type the word: Great. I will bring the ______.", "lantern") ] },
  { id: "hardware", title: "At the hardware store", steps: [
    m("Pat", "I'm at the hardware store. What do you need for that dresser?"), m("Pat", "They have stain in light and dark. Sandpaper's on sale."),
    choose("What's on sale?", ["Sandpaper", "Pat said sandpaper's on sale."], "Stain", "Paint"),
    choose("Pat asked a question. Pick the best reply.", ["Dark stain and some sandpaper, please.", "It answers what Pat asked."], "I had a sandwich.", "The dog is outside."),
    type("Type the word: Thanks. That old ______ is looking better already.", "dresser") ] },
  { id: "fire", title: "Fixing the fire pit", steps: [
    m("Neighbor", "Your fire pit looks great with the rust gone."), m("Neighbor", "Don't paint it with regular paint. Use the high-heat kind or it will peel."),
    choose("What kind of paint should you use?", ["High-heat paint", "Regular paint would peel from the heat."], "Regular paint", "Wood stain"),
    choose("Why not regular paint?", ["It will peel", "The neighbor said it will peel."], "It costs too much", "It's the wrong color"),
    type("Type the word: Good to know. I sanded off all the ______ first.", "rust") ] },
  { id: "bake", title: "Baking for the weekend", steps: [
    m("Mom", "Can you bake your cookies for Saturday?"), m("Mom", "We need two dozen. Please no nuts, your uncle can't eat them."),
    choose("What should you leave out?", ["Nuts", "Mom said no nuts."], "Sugar", "Butter"),
    choose("How many cookies are needed?", ["Two dozen", "Mom said two dozen."], "Two", "Twelve"),
    type("Type the word: Sure. I still have the ______.", "recipe") ] },
  { id: "ride", title: "Mike needs a ride", steps: [
    m("Mike", "Hey, my truck won't start."), m("Mike", "Can you pick me up for work at 7?"),
    choose("What does Mike need?", ["A ride to work", "His truck won't start, so he needs a ride."], "A new job", "Money for lunch"),
    choose("Pick the best reply.", ["Sure, I'll be there at 7.", "That answers what he asked."], "I like pizza.", "It rained last night."),
    type("Type the word to finish your text: See you ______ morning.", "tomorrow") ] },
  { id: "dinner", title: "Dinner plans", steps: [
    m("Mom", "Are you coming over for dinner Sunday?"), m("Mom", "Your brother will be here. We are having chicken."),
    choose("Who else will be there?", ["His brother", "Mom said your brother will be here."], "His boss", "A neighbor"),
    choose("You can come. Pick the best reply.", ["Yes! What time should I come?", "It says yes and asks what you need to know."], "No thanks, I already ate today.", "Where is my phone?"),
    type("Type the word: Thanks, I will ______ be there.", "definitely") ] },
  { id: "shift", title: "Schedule change", steps: [
    m("Dana (work)", "Can you work Friday instead of Thursday?"), m("Dana (work)", "Same time, 9 to 3."),
    choose("What day would you stop working?", ["Thursday", "She asked you to work Friday instead of Thursday."], "Friday", "Sunday"),
    choose("How long is the shift?", ["9 to 3", "She said same time, 9 to 3."], "9 to 5", "3 to 9"),
    type("Type the word: Okay, I changed my ______.", "schedule") ] },
  { id: "game", title: "Watching the game", steps: [
    m("Chris", "Game starts at 8 tonight."), m("Chris", "I'll bring wings if you get drinks."),
    choose("What should you bring?", ["Drinks", "Chris is bringing wings and asked you to get drinks."], "Wings", "The TV"),
    choose("When should you get there?", ["A little before 8", "The game starts at 8."], "Tomorrow morning", "At midnight"),
    type("Type the word: Sounds ______. See you then.", "great") ] },
  { id: "late", title: "Running late", steps: [
    m("You", "Hey, I'm stuck in traffic."), m("Sam", "No problem. The movie doesn't start for 20 minutes."),
    choose("Is Sam upset?", ["No, Sam says it's fine", "\"No problem\" means it's okay."], "Yes, Sam is leaving", "Sam didn't answer"),
    choose("Pick the best reply.", ["Thanks. Almost there.", "It fits the conversation."], "I had eggs for breakfast.", "What is your address?"),
    type("Type the word: Save me a seat at the ______.", "movie") ] },
  { id: "store", title: "Grocery list", steps: [
    m("Sis", "Are you going to the store later?"), m("Sis", "We're out of milk and eggs. Don't get bread, we have plenty."),
    choose("What does she NOT want?", ["Bread", "She said don't get bread."], "Milk", "Eggs"),
    choose("What should go on your list?", ["Milk and eggs", "They're out of those two."], "Milk and bread", "Eggs and bread"),
    type("Type the word: Keep the ______ in case we need to bring it back.", "receipt") ] }
];

const node = (id, text, ...options) => ({ id, text, options });
const opt = (label, to, note = "") => ({ label, to, note });

export const STORIES = [
  { id: "bread", title: "First Loaf of Bread", start: "a", nodes: [
    node("a", "You're baking your first loaf. The recipe says: \"Mix warm water and yeast. Hot water kills yeast. Wait 5 minutes until it foams.\"",
      opt("Use warm water and wait", "b"), opt("Use the hottest water you can get", "a2", "Nothing happens. No foam at all. The recipe warned you.")),
    node("a2", "You pour it out and start over. What kind of water did it say?", opt("Warm water", "b")),
    node("b", "Next the recipe says: \"Knead for 8 minutes until the dough is smooth. Then cover it and let it rise for 1 hour.\" It's smooth now.",
      opt("Cover it and wait an hour", "c"), opt("Put it straight in the oven", "b2", "Your friend stops you. \"Did it rise yet?\"")),
    node("b2", "\"Check the recipe,\" your friend says. \"What comes after kneading?\"", opt("Cover it and let it rise", "c")),
    node("c", "The dough doubled. The recipe says: \"Bake at 375 for 30 minutes. It's done when the top is golden.\" At 20 minutes, the top is still pale.",
      opt("Leave it in a little longer", "d"), opt("Take it out now", "c2", "The middle is still doughy. It needed more time.")),
    node("c2", "You slide it back in. What does the top need to look like?", opt("Golden. Bake until then.", "d")),
    node("d", "The whole house smells like fresh bread. You cut a warm slice and add butter. You made that yourself.") ] },
  { id: "camp", title: "A Weekend at the Campground", start: "a", nodes: [
    node("a", "You pull the RV into the campground. A sign says: \"Check in at the office first. Then go to your site. Speed limit 5.\"",
      opt("Stop at the office", "b"), opt("Drive straight to a site", "a2", "A ranger waves you down. The sign said office first.")),
    node("a2", "The ranger smiles. \"Everybody misses that sign. Check in at the office, friend.\"", opt("Go to the office", "b")),
    node("b", "At your site, the checklist says: \"Level the RV first. Then hook up power. Then water.\"",
      opt("Level the RV", "c"), opt("Hook up the water", "b2", "Your buddy holds up the list and taps the first line.")),
    node("b2", "\"Read it again,\" your buddy says. \"What comes first?\"", opt("Level the RV", "c")),
    node("c", "That night, a notice on the fire ring says: \"Fire ban tonight. Too windy. Propane stoves are okay.\" You brought firewood and a propane stove.",
      opt("Cook on the propane stove", "d"), opt("Build a campfire", "c2", "The camp host walks over and points to the notice.")),
    node("c2", "\"No fires tonight,\" the host says. \"Too windy. What else have you got?\"", opt("The propane stove", "d")),
    node("d", "Burgers on the stove, stars overhead, and no wind in your tent. Good call. Good weekend.") ] },
  { id: "dresser", title: "The Old Dresser", start: "a", nodes: [
    node("a", "You found an old dresser with peeling paint. The can of stripper says: \"Use outdoors or with lots of fresh air. Wear gloves.\"",
      opt("Carry it outside and put on gloves", "b"), opt("Start in the closed-up basement", "a2", "The smell hits you fast. That's why the can said fresh air.")),
    node("a2", "You step out for some air and read the can again. Where does it say to work?", opt("Outside, with gloves on", "b")),
    node("b", "The old finish is off. Your friend says: \"Sand with the grain, the way the lines in the wood run. Going across leaves scratches.\"",
      opt("Sand along the lines in the wood", "c"), opt("Sand across the lines", "b2", "Little scratches show up. Your friend was right.")),
    node("b2", "No big deal. You can sand those out. Which way this time?", opt("Along the lines in the wood", "c")),
    node("c", "The stain can says: \"Wipe on. Wait 10 minutes. Wipe off extra. Let dry 8 hours before the next coat.\" It's been one hour.",
      opt("Wait until tomorrow for the next coat", "d"), opt("Put on the next coat now", "c2", "It stays sticky. Only an hour has passed, and the can said 8.")),
    node("c2", "You wipe it back. How long did the can say to let it dry?", opt("8 hours. Wait till tomorrow.", "d")),
    node("d", "Next morning the drawers slide in and the wood glows. People ask where you bought it. You tell them you made it new.") ] },
  { id: "bakesale", title: "The Bake Sale", start: "a", nodes: [
    node("a", "You're baking for the fire hall bake sale. The recipe says: \"Heat oven to 350. Use 1 teaspoon of baking soda.\"",
      opt("Set the oven to 350", "b"), opt("Set the oven to 500", "a2", "That's a lot hotter than the recipe says.")),
    node("a2", "You catch it before the pan goes in. What did the recipe say?", opt("350", "b")),
    node("b", "Baking soda time. You've got a big tablespoon and a small teaspoon out on the counter.",
      opt("Use the teaspoon", "c"), opt("Use the tablespoon", "b2", "That's three times too much. The recipe said teaspoon.")),
    node("b2", "You scrape it back out. Which spoon did it say?", opt("The teaspoon", "c")),
    node("c", "A sign-up sheet says: \"Label anything with nuts.\" Your cookies have walnuts in them.",
      opt("Write a label: contains nuts", "d"), opt("Skip the label", "c2", "A woman asks if they have nuts. Good thing she asked.")),
    node("c2", "The sheet was clear. People need to know. What should you do?", opt("Add a label: contains nuts", "d")),
    node("d", "Your table sells out by noon. Somebody asks for the recipe. Not a chance.") ] },
  { id: "shop", title: "First Day at the Shop", start: "a", nodes: [
    node("a", "It's your first day at Ray's Auto. A note on the door says: \"Front door is broken. Use the side door. Ray is in the back.\"",
      opt("Go to the side door", "b"), opt("Push on the front door", "a2", "It doesn't move. The note did say it was broken.")),
    node("a2", "The front door won't budge. A guy across the street laughs and waves. Read the note again.", opt("Go to the side door", "b")),
    node("b", "Inside, Ray hands you a list: \"Blue car needs an oil change. Red truck needs two new tires. Do the blue car first.\"",
      opt("Start on the blue car", "c"), opt("Start on the red truck", "b2", "Ray shakes his head. He wanted the other one first.")),
    node("b2", "Ray says, \"Check the list. Which one did I say goes first?\"", opt("The blue car", "c")),
    node("c", "A customer walks in, upset. Her car is making a loud noise. Ray said to get him for any customer problems.",
      opt("Go get Ray", "d"), opt("Try to fix it yourself", "c2", "Ray comes over: \"Remember, get me for those.\"")),
    node("c2", "Ray says, \"Thanks for trying, but get me first next time.\" What now?", opt("Let Ray talk to her", "d")),
    node("d", "Closing time. Ray says, \"Good first day. Same time tomorrow?\" You earned it.", ) ] },
  { id: "trip", title: "Road Trip", start: "a", nodes: [
    node("a", "You and Jay are driving to the lake. The gas light comes on. A sign says: \"Next gas 40 miles. Gas here, 1 mile.\"",
      opt("Stop for gas in 1 mile", "b"), opt("Keep going 40 more miles", "a2", "The car starts to sputter. Maybe that wasn't smart.")),
    node("a2", "The light is blinking and Jay looks nervous. You turn around.", opt("Go back to the gas station", "b")),
    node("b", "At the station the map shows two roads. Highway 9 is closed for work. Route 12 goes to the lake.",
      opt("Take Route 12", "c"), opt("Take Highway 9", "b2", "Orange cones everywhere. Closed, just like the map said.")),
    node("b2", "A worker waves you back. \"This road's closed, friend.\"", opt("Take Route 12", "c")),
    node("c", "At the lake a sign says: \"No swimming past the rope. Fishing at the dock only.\" Jay grabs the poles.",
      opt("Fish at the dock", "d"), opt("Fish from the beach", "c2", "A ranger points at the sign.")),
    node("c2", "The ranger says, \"Fishing's at the dock.\" He's friendly about it.", opt("Head to the dock", "d")),
    node("d", "The sun goes down. Jay catches one small fish and acts like it's huge. Good day.", ) ] },
  { id: "food", title: "The Food Truck", start: "a", nodes: [
    node("a", "You're helping at Rosa's Tacos. Rosa says, \"Tacos are 3 dollars each. Drinks are 2. We only take cash today.\" A guy holds up a credit card.",
      opt("Tell him it's cash only today", "b"), opt("Run his card", "a2", "There's no card machine out today. Rosa said so.")),
    node("a2", "The guy waits. Rosa looks over: \"Cash only today, remember?\"", opt("Tell him it's cash only", "b")),
    node("b", "A woman orders 2 tacos and a drink. Tacos are 3 dollars each. Drinks are 2.",
      opt("That's 8 dollars", "c"), opt("That's 5 dollars", "b2", "Close. Count the tacos again.")),
    node("b2", "Two tacos at 3 dollars is 6. Add the drink for 2.", opt("That's 8 dollars", "c")),
    node("c", "Rosa says, \"We're out of chicken. Tell people we still have beef and fish.\" Someone asks for chicken.",
      opt("Offer beef or fish", "d"), opt("Promise chicken in a minute", "c2", "Rosa raises an eyebrow. There isn't any more.")),
    node("c2", "Rosa says, \"We're all out, remember? What do we still have?\"", opt("Beef and fish", "d")),
    node("d", "The line's gone. Rosa hands you a free taco. \"You're good at this.\" ", ) ] }
];

// ---- Read It: how-tos with questions. Everything he needs is in the text.
const ask = (q, right, ...others) => ({ q, right, others });
export const READS = [
  { id: "strip", title: "Strip and Stain Old Wood", text: "Work outside or with lots of fresh air. Wear gloves and eye protection.\n\n1. Brush on paint stripper and wait as long as the can says.\n2. Scrape off the old finish with a plastic scraper.\n3. Wipe the wood clean and let it dry.\n4. Sand with the grain until it feels smooth. Wipe off the dust.\n5. Wipe on the stain. Wipe off the extra.\n6. Let it dry as long as the can says before the next coat.", questions: [
    ask("What should you wear?", "Gloves and eye protection", "A hat and boots", "Nothing special"),
    ask("What do you do right after scraping?", "Wipe the wood clean and let it dry", "Put on the stain", "Sand across the grain"),
    ask("How do you know how long to let the stain dry?", "The can says", "Always one hour", "When it looks dark")] },
  { id: "rust", title: "Bring Back a Rusty Fire Pit", text: "Make sure the fire pit is cold. Wear gloves, eye protection and a dust mask.\n\n1. Knock off loose rust with a wire brush.\n2. Sand the rough spots until the metal feels smooth.\n3. Wipe off all the dust and let it dry.\n4. Spray on high-heat paint in thin coats. Regular paint can peel or burn off.\n5. Let it dry as long as the can says before you build a fire.", questions: [
    ask("What must be true before you start?", "The fire pit is cold", "It is raining", "The paint is open"),
    ask("What do you use first on loose rust?", "A wire brush", "A paint roller", "A wet rag"),
    ask("Why use high-heat paint?", "Regular paint can peel or burn off", "It is always cheaper", "It dries in one minute")] },
  { id: "rvsetup", title: "Setting Up at the Campsite", text: "1. Park and check that the RV is level. Put blocks under the wheels if it isn't.\n2. Set the wheel chocks so it can't roll.\n3. Plug in the power with the breaker off, then turn it on.\n4. Hook up the water hose.\n5. Open the awning only if it isn't windy.", questions: [
    ask("What do you do if the RV isn't level?", "Put blocks under the wheels", "Open the awning", "Turn on the water"),
    ask("What are wheel chocks for?", "So it can't roll", "To make it level", "To hold the hose"),
    ask("When should you leave the awning closed?", "When it's windy", "When it's sunny", "In the morning")] },
  { id: "fireout", title: "Putting Out a Campfire", text: "Never walk away from a fire. When you're done:\n\n1. Let the wood burn down to ash if you can.\n2. Pour water on it slowly.\n3. Stir the ashes with a shovel.\n4. Pour on more water.\n5. Hold the back of your hand near the ashes. If you still feel heat, keep going.", questions: [
    ask("What do you do after pouring water the first time?", "Stir the ashes with a shovel", "Walk away", "Add more wood"),
    ask("How can you check for heat?", "Hold the back of your hand near the ashes", "Stand on the ashes", "Look at the smoke"),
    ask("What if you still feel heat?", "Keep going", "Go to bed", "Cover it with a tent")] },
  { id: "cookies", title: "Basic Sugar Cookies", text: "Heat the oven to 350.\n\n1. Mix 1 cup of soft butter with 1 cup of sugar.\n2. Beat in 1 egg and 1 teaspoon of vanilla.\n3. Stir in 2 and a half cups of flour and 1 teaspoon of baking powder.\n4. Roll into small balls and set them on a pan, 2 inches apart.\n5. Bake 10 minutes, until the edges are light brown.", questions: [
    ask("How hot should the oven be?", "350", "250", "500"),
    ask("How much flour goes in?", "2 and a half cups", "1 cup", "1 teaspoon"),
    ask("How do you know they're done?", "The edges are light brown", "The butter melts", "The oven beeps twice")] },
  { id: "measure", title: "Reading a Recipe", text: "Recipes use short forms. Here's what they mean:\n\ntsp means teaspoon, the small spoon.\ntbsp means tablespoon, the big spoon.\n3 teaspoons make 1 tablespoon.\nc means cup.\noz means ounce.\n\nLevel off dry things like flour with a flat edge. Don't pack flour down. Do pack brown sugar down. Always read the whole recipe before you start.", questions: [
    ask("What does tsp mean?", "Teaspoon", "Tablespoon", "Cup"),
    ask("How many teaspoons make 1 tablespoon?", "3", "2", "10"),
    ask("Which one do you pack down?", "Brown sugar", "Flour", "Baking soda")] },
  { id: "brownie", title: "Pan of Brownies", text: "Heat the oven to 350. Grease an 8 inch square pan.\n\n1. Melt half a cup of butter. Stir in 1 cup of sugar.\n2. Beat in 2 eggs and 1 teaspoon of vanilla.\n3. Stir in 1/3 cup of cocoa, 1/2 cup of flour and a pinch of salt.\n4. Pour the batter into the pan.\n5. Bake 25 minutes. A toothpick in the middle should come out with a few moist crumbs.\n6. Cut them after they cool.", questions: [
    ask("What do you do to the pan first?", "Grease it", "Heat it", "Flour it"),
    ask("How long do they bake?", "25 minutes", "10 minutes", "1 hour"),
    ask("When should you cut them?", "After they cool", "Before baking", "Right out of the oven")] },
  { id: "muffins", title: "Blueberry Muffins", text: "Heat the oven to 400. Line a muffin pan with paper cups. You will need two bowls.\n\n1. Mix the dry things in one bowl: 2 cups of flour, half a cup of sugar, 1 tablespoon of baking powder.\n2. Mix the wet things in another bowl: 1 cup of milk, 1 egg, a third of a cup of oil.\n3. Pour wet into dry. Stir only until just mixed. Lumps are fine.\n4. Gently fold in 1 cup of blueberries.\n5. Fill each cup about two-thirds full.\n6. Bake 20 minutes, until the tops are golden.", questions: [
    ask("How many bowls do you use?", "Two", "One", "Four"),
    ask("Should you stir out every lump?", "No, lumps are fine", "Yes, stir until smooth", "Only with a mixer"),
    ask("How full should each cup be?", "About two-thirds", "To the very top", "Half an inch")] },
  { id: "foil", title: "Foil Packet Campfire Dinner", text: "Tear off a big sheet of heavy foil.\n\n1. Put on sliced potatoes, onion and sausage.\n2. Add a little butter, salt and pepper.\n3. Fold the foil tight so nothing leaks.\n4. Set it on hot coals, not in the flames.\n5. Cook 20 minutes, turning it once.\n6. Use tongs and open it carefully. The steam is hot.", questions: [
    ask("Where do you set the packet?", "On hot coals", "In the flames", "On the picnic table"),
    ask("How many times do you turn it?", "Once", "Never", "Every minute"),
    ask("Why open it carefully?", "The steam is hot", "The foil is sharp", "The food might fall out of the tree")] }
];
