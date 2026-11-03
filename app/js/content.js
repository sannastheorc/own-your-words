// SEEDSED — content.js
// Purpose: comprehension content in a grown-up voice. Text Thread: read a conversation, pick the reply
//          that makes sense, and type a key word. Your Call: short branching stories where he has to
//          understand the page to choose well; a poor choice loops back with a laugh, never a loss.
// Boundaries: data only. Topics are general until we know his interests.

const m = (from, text) => ({ type: "msg", from, text });
const choose = (prompt, right, ...others) => ({ type: "choose", prompt, right: right[0], why: right[1], options: [right[0], ...others] });
const type = (prompt, word) => ({ type: "typed", prompt, word });

export const THREADS = [
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
