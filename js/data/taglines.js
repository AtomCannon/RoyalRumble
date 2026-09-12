// Tagline dropdown data. "Bill Banana the {ADJ} {NOUN}"
window.P = window.P || {}; P.data = P.data || {};

P.data.ADJ = [
  // serious-ish
  'Undefeated', 'Unstoppable', 'Merciless', 'Warlike', 'Legendary', 'Immortal', 'Fearless', 'Savage', 'Relentless', 'Mighty',
  'Iron', 'Ruthless', 'Invincible', 'Terrifying', 'Glorious', 'Almighty', 'Ferocious', 'Deadly', 'Vengeful', 'Cursed',
  // sliding downhill
  'Slightly Damp', 'Moist', 'Lactose-Intolerant', 'Recently Divorced', 'Emotionally Unavailable', 'Mildly Concerning', 'Unlicensed', 'Uninsured',
  'Gluten-Curious', 'Barely Legal', 'Heavily Medicated', 'Pre-Owned', 'Refurbished', 'Discount', 'Off-Brand', 'Store-Brand', 'Expired', 'Room-Temperature',
  'Microwaved', 'Overcooked', 'Undercooked', 'Sunburnt', 'Constipated', 'Flatulent', 'Unwashed', 'Sticky', 'Clammy', 'Greasy', 'Crusty', 'Musty', 'Soggy',
  'Hairless', 'Extremely Hairy', 'Backwards', 'Upside-Down', 'Inside-Out', 'Sideways', 'Haunted', 'Possessed', 'Radioactive', 'Flammable', 'Biodegradable',
  'Wet', 'Dry', 'Confused', 'Lost', 'Late', 'Unemployed', 'Overqualified', 'Underpaid', 'Self-Employed', 'Middle-Management', 'Part-Time', 'Freelance',
  'Suspicious', 'Probably Fine', 'Allegedly', 'Legally Distinct', 'Court-Ordered', 'Community-Service', 'Wanted', 'Unwanted', 'Adopted', 'Homeschooled',
  'Nocturnal', 'Feral', 'Domesticated', 'Free-Range', 'Grass-Fed', 'Farm-Raised', 'Cage-Free', 'Organic', 'Genetically Modified', 'Artisanal',
  'Vibrating', 'Buffering', 'Low-Battery', 'Unplugged', 'Wireless', 'Bluetooth', 'Dial-Up', 'Incognito', 'Password-Protected', 'Sponsored',
  'Big', 'Small', 'Medium', 'Extra Medium', 'Wide', 'Long', 'Thicc', 'Beefy', 'Girthy', 'Chunky', 'Dense', 'Fluffy', 'Crunchy', 'Chewy', 'Lumpy',
  'Screaming', 'Whispering', 'Sobbing', 'Giggling', 'Snoring', 'Yodeling', 'Vomiting', 'Sneezing', 'Twitching', 'Sweating', 'Bleeding', 'Glistening',
  'Angry', 'Hangry', 'Sleepy', 'Horny', 'Cranky', 'Grumpy', 'Sassy', 'Salty', 'Petty', 'Needy', 'Clingy', 'Nosy', 'Bougie', 'Basic', 'Cringe', 'Sus',
  'Naked', 'Half-Naked', 'Fully Clothed', 'Formerly Famous', 'Semi-Retired', 'Un-Housebroken', 'Recently Deceased', 'Twice-Baked', 'Gently Used',
  'Wrong', 'Incorrect', 'Illegal', 'Forbidden', 'Unholy', 'Blasphemous', 'Sacred', 'Chosen', 'Anointed', 'Overrated', 'Underrated', 'Unrated',
  'Human', 'Barely Human', 'Post-Human', 'Somewhat', 'Very', 'Extremely', 'Not', 'Reverse', 'Diet', 'Zero-Sugar', 'Caffeine-Free', 'Decaf',
];

P.data.NOUN = [
  // serious-ish
  'Warrior', 'Champion', 'Destroyer', 'Beast', 'Titan', 'Juggernaut', 'Barbarian', 'Gladiator', 'Executioner', 'Butcher', 'Reaper', 'Kraken',
  'Dragon', 'Wolf', 'Bear', 'Bull', 'Shark', 'Viper', 'Hawk', 'Lion', 'Gorilla', 'Rhino', 'Wrecking Ball', 'Machine', 'Nightmare', 'Legend',
  // animals gone wrong
  'Pig', 'Goose', 'Wet Cat', 'Hamster', 'Sea Cucumber', 'Manatee', 'Pug', 'Slug', 'Ferret', 'Possum', 'Raccoon', 'Pigeon', 'Chihuahua', 'Walrus',
  'Naked Mole Rat', 'Moth', 'Emu', 'Alpaca', 'Goldfish', 'Platypus', 'Tapeworm', 'Housefly', 'Earthworm', 'Toad', 'Gerbil', 'Blobfish', 'Shrimp',
  // jobs
  'Accountant', 'Dental Hygienist', 'Substitute Teacher', 'Lifeguard', 'Mall Cop', 'Notary Public', 'Wedding DJ', 'HR Representative', 'Podcaster',
  'Landlord', 'Middle Manager', 'Uber Driver', 'Life Coach', 'Mime', 'Clown', 'Plumber', 'Youth Pastor', 'Crossing Guard', 'Assistant Regional Manager',
  'Influencer', 'Crypto Bro', 'Sommelier', 'Garbage Man', 'Mattress Salesman', 'Tax Attorney', 'Birthday Clown', 'Lunch Lady', 'Bus Driver', 'Intern',
  // objects
  'Nintendo Wii', 'Toaster', 'Lawnmower', 'Sock', 'Hot Pocket', 'Meatball', 'Bean', 'Potato', 'Cabbage', 'Noodle', 'Sausage', 'Pickle', 'Waffle',
  'Burrito', 'Chicken Nugget', 'Fax Machine', 'Roomba', 'Lawn Chair', 'Plunger', 'Stapler', 'Ceiling Fan', 'Minivan', 'Pontoon Boat', 'Hot Tub',
  'Couch', 'Futon', 'Beanbag', 'Bath Mat', 'Garden Gnome', 'Traffic Cone', 'Porta-Potty', 'Fire Hydrant', 'Vending Machine', 'Filing Cabinet',
  'Ham', 'Loaf', 'Jar of Mayonnaise', 'Rotisserie Chicken', 'Gas Station Sushi', 'Expired Yogurt', 'Bag of Milk', 'Wet Sandwich', 'Egg',
  // people / roles
  'Dad', 'Stepdad', 'Uncle', 'Cousin', 'Grandma', 'Roommate', 'Ex-Boyfriend', 'Ex-Wife', 'Neighbor', 'Guy From The Gym', 'Nephew', 'Godfather',
  'Boy', 'Man', 'Lad', 'Fella', 'Gentleman', 'Dude', 'Bro', 'Girlboss', 'Wine Mom', 'Karen', 'Chad', 'Kyle', 'Kevin', 'Greg', 'Brenda', 'Steve',
  'Wizard', 'Goblin', 'Gremlin', 'Troll', 'Elf', 'Vampire', 'Werewolf', 'Ghost', 'Zombie', 'Mummy', 'Cryptid', 'Demon', 'Angel', 'Pope', 'Prophet',
  'Baby', 'Toddler', 'Teenager', 'Adult', 'Senior Citizen', 'Boomer', 'Millennial', 'Zoomer', 'Fetus', 'Twin', 'Triplet', 'Only Child',
  // abstract / nonsense
  'Situation', 'Problem', 'Mistake', 'Disappointment', 'Regret', 'Tax Write-Off', 'Liability', 'Side Effect', 'Rash', 'Vibe', 'Mood', 'Concept',
  'Incident', 'Experiment', 'Prototype', 'Beta Test', 'Software Update', 'Error 404', 'Pop-Up Ad', 'Spam Email', 'Group Chat', 'Voicemail',
  'Thing', 'Object', 'Entity', 'Substance', 'Puddle', 'Smell', 'Sound', 'Stain', 'Lump', 'Chunk', 'Wad', 'Glob', 'Clump', 'Dollop',
];

P.data.HOMETOWN = [
  'Parts Unknown', 'Parts Known', 'Parts Slightly Known', 'The Back of a Denny\'s', 'A Walmart Parking Lot', 'Your Mom\'s House', 'Hell', 'Ohio',
  'Florida', 'New Jersey', 'The Sewer', 'A Dumpster Behind Arby\'s', 'The Moon', 'The Dark Web', 'A Gas Station Bathroom', 'The Void', 'Under Your Bed',
  'A Timeshare Presentation', 'The Year 3000', 'Middle Earth', 'Middle School', 'A Cul-de-sac', 'The Suburbs', 'Costco', 'A Cruise Ship Buffet',
  'The Basement', 'A Van Down By The River', 'Witness Protection', 'His Own Imagination', 'A Lab Accident', 'The Local Applebee\'s', 'Canada (Sorry)',
  'Australia (Upside Down)', 'The Internet', 'Reddit', 'A Fever Dream', 'The Bermuda Triangle', 'A Petri Dish', 'The DMV', 'Court-Mandated Therapy',
  'Atlantis', 'A Shoebox', 'The Bottom of a Lake', 'The Dollar Store', 'A Craigslist Ad', 'Tax Evasion', 'The Land Before Time', 'Nowhere In Particular',
];

P.data.WEIGHT = [
  '275 pounds', '312 pounds', '198 pounds', 'an undisclosed amount', 'too much', 'not enough', 'four hundred pounds of pure disappointment',
  'roughly one refrigerator', 'seven bowling balls', 'a metric butt-ton', '11 stone (whatever that means)', 'a healthy amount, per their doctor',
  'a concerning amount, per their other doctor', 'exactly 69 kilograms, nice', '420 pounds, blaze it', 'more than you', 'less than you\'d think',
  'the weight of the world', 'zero pounds, somehow', 'an amount they lied about on their driver\'s license', 'approximately one and a half Danny DeVitos',
  'the same as a golden retriever', 'a great deal of cheese', '35 raccoons in a coat', '9 pounds, most of it hair', 'twelve hundred chicken nuggets',
];

P.data.GENDER = [
  'Male', 'Female', 'Non-Binary', 'Unspecified', 'Yes', 'No', 'Wizard', 'Pickup Truck', 'It\'s Complicated', 'Ask Again Later', 'Attack Helicopter (ironically)',
  'A Dog', 'A Concept', 'Two Kids In A Trench Coat', 'Bird', 'Meat', 'Gas', 'Liquid', 'Steve', 'Divorced',
];

P.data.PRONOUNS = [
  { id: 'he', label: 'He / Him', subj: 'he', obj: 'him', pos: 'his', be: 'is', has: 'has', s: 's' },
  { id: 'she', label: 'She / Her', subj: 'she', obj: 'her', pos: 'her', be: 'is', has: 'has', s: 's' },
  { id: 'they', label: 'They / Them', subj: 'they', obj: 'them', pos: 'their', be: 'are', has: 'have', s: '' },
  { id: 'it', label: 'It / It', subj: 'it', obj: 'it', pos: 'its', be: 'is', has: 'has', s: 's' },
  { id: 'thou', label: 'Thou / Thee (Ye Olde)', subj: 'thou', obj: 'thee', pos: 'thy', be: 'art', has: 'hast', s: 'st' },
  { id: 'we', label: 'We / Us (Royal)', subj: 'we', obj: 'us', pos: 'our', be: 'are', has: 'have', s: '' },
  { id: 'dude', label: 'Dude / Dude', subj: 'dude', obj: 'dude', pos: 'dude\'s', be: 'is', has: 'has', s: 's' },
];

P.data.CATCHPHRASES = [
  'Punchma balls!', 'I\'m gonna lose!', 'Where\'s my mom?', 'This is my first day.', 'I ate before this and I regret it.', 'You call that a face?',
  'I\'m not crying, you\'re crying!', 'Somebody call my lawyer.', 'I have a note from my doctor.', 'Hold my beer. No, seriously, hold it.',
  'I did not consent to this.', 'Yeah, THAT\'S right!', 'Nobody move, I dropped a contact.', 'I\'m doing this for the kids. My kids. They\'re watching.',
  'My therapist said this was a bad idea.', 'Feel the thunder! It\'s me. I\'m the thunder.', 'Wait, this isn\'t the bathroom.', 'I smell like victory. And soup.',
  'You\'re all going to the shadow realm!', 'I have a fear of everything.', 'Hi Mom!', 'Is this being recorded?', 'Let\'s get weird.', 'AAAAAAAAAAAAAA!',
];

P.data.FIRST_NAMES = ['Bill', 'Gary', 'Brenda', 'Chad', 'Karen', 'Steve', 'Tanya', 'Dwayne', 'Doug', 'Linda', 'Kevin', 'Deborah', 'Cletus', 'Bartholomew',
  'Big Randy', 'Lil Randy', 'Medium Randy', 'Tina', 'Gus', 'Herb', 'Muffin', 'Chuck', 'Shirley', 'Craig', 'Darlene', 'Skeeter', 'Pam', 'Big Pam', 'Tyrone',
  'Wanda', 'Marv', 'Beef', 'Gravy', 'Nugget', 'Chet', 'Trish', 'Blake', 'Todd', 'Barb', 'Ronnie', 'Dolores', 'Vince', 'Meatball', 'Frank', 'Bort', 'Glenda',
  'Judge', 'Doctor', 'Captain', 'Sergeant', 'Reverend', 'Senator', 'Grandpa', 'Baby', 'Uncle', 'Coach', 'Nurse', 'Sheriff', 'DJ', 'Professor'];
P.data.LAST_NAMES = ['Banana', 'Thunderfist', 'McGillicuddy', 'Bologna', 'Fartsworth', 'Pumpernickel', 'Gristle', 'Von Hamsandwich', 'Beefington', 'Buttz',
  'Wetsock', 'Danger', 'Nutz', 'Chunks', 'Sweatpants', 'Meatloaf', 'Crumbs', 'Jorts', 'Hogwash', 'Dingle', 'Pickles', 'Moistly', 'Fishbone', 'Kegstand',
  'Diaperwhistle', 'Cheeseborough', 'Lasagna', 'Stankface', 'Hamm', 'Bonkers', 'Goober', 'Crotchley', 'Puddles', 'Sniffles', 'Rumproast', 'Toothless',
  'Gasoline', 'Tinkleton', 'Bumsworth', 'Wafflehouse', 'Bigsby', 'The Third', 'Jr.', 'Esq.', 'Freeze', 'Manhole', 'Noodleman', 'Guzzler', 'Pantsfire'];
