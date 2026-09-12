// Moves, lucky events, and DIALOGUE. Commentators talk to each other; the ring announcer does intros.
// Template vars: {a} attacker, {d} defender, {as}/{ao}/{ap} attacker subj/obj/possessive, {ds}/{do}/{dp} defender, {name}, {tag}
window.P = window.P || {}; P.data = P.data || {};
const G = 'gary', T = 'tonya', AN = 'ann';

P.data.MOVES = [
  { id: 'punch', name: 'PUNCH', w: 10, dmg: [8, 14], sfx: 'punch', anim: 'punch', fx: ['POW!', 'BONK!', 'WHAM!'] },
  { id: 'slap', name: 'SLAP', w: 8, dmg: [6, 12], sfx: 'slap', anim: 'punch', fx: ['SLAP!', 'SMACK!'] },
  { id: 'kick', name: 'KICK', w: 8, dmg: [9, 15], sfx: 'punch', anim: 'kick', fx: ['BOOT!', 'THUD!'] },
  { id: 'headbutt', name: 'HEADBUTT', w: 6, dmg: [10, 16], sfx: 'punch', anim: 'headbutt', fx: ['KLONK!', 'CRACK!'] },
  { id: 'elbow', name: 'ELBOW', w: 6, dmg: [8, 14], sfx: 'punch', anim: 'punch', fx: ['ELBOW!', 'CRUNCH!'] },
  { id: 'bite', name: 'BITE', w: 4, dmg: [7, 12], sfx: 'slap', anim: 'headbutt', fx: ['CHOMP!', 'NOM!'] },
  { id: 'noogie', name: 'NOOGIE', w: 4, dmg: [5, 9], sfx: 'slap', anim: 'punch', fx: ['NOOGIE!'] },
  { id: 'wetwilly', name: 'WET WILLY', w: 3, dmg: [4, 8], sfx: 'squish', anim: 'punch', fx: ['SQUISH!', 'EW!'], stun: 0.8 },
  { id: 'toot', name: 'THE TOOT', w: 3, dmg: [5, 10], sfx: 'fart', anim: 'toot', fx: ['PFFFRT!', 'BRAAAP!'], stun: 0.6 },
  { id: 'spit', name: 'LOOGIE', w: 3, dmg: [3, 7], sfx: 'squish', anim: 'headbutt', fx: ['PTOO!', 'SPLAT!'] },
  { id: 'insult', name: 'INSULT', w: 4, dmg: [2, 5], sfx: 'boo', anim: 'taunt', fx: ['OUCH', 'HARSH'] },
  { id: 'clothesline', name: 'CLOTHESLINE', w: 4, dmg: [14, 20], sfx: 'big', anim: 'punch', fx: ['WHOOSH!', 'CLOTHESLINE!'], knock: 1.2 },
  { id: 'suplex', name: 'SUPLEX', w: 3, dmg: [18, 26], sfx: 'big', anim: 'suplex', fx: ['SUPLEX!', 'KABOOM!'], big: true, knock: 1.6 },
  { id: 'dropkick', name: 'DROPKICK', w: 3, dmg: [15, 22], sfx: 'big', anim: 'kick', fx: ['DROPKICK!', 'BOTH FEET!'], big: true, knock: 1.2 },
  { id: 'chair', name: 'CHAIR SHOT', w: 0, dmg: [20, 30], sfx: 'chair', anim: 'punch', fx: ['CLANG!', 'BONNNG!'], big: true, knock: 1.3, requires: 'chair' },
  { id: 'lowblow', name: 'PUNCHMA BALLS', w: 1.2, dmg: [26, 34], sfx: 'punchma', anim: 'punch', fx: ['PUNCHMA BALLS!', 'RIGHT IN THE BALLS!'], big: true, stun: 1.8, low: true },
];

P.data.LUCKY = [
  { id: 'chair', text: 'A steel chair slides into the ring and {a} grabs it.', dur: 10 },
  { id: 'wind', text: 'Someone threw a hot dog. {a} ate it off the mat. Second wind.', heal: 30 },
  { id: 'banana', text: '{a} slips on a banana peel.', stun: 2.5 },
  { id: 'rage', text: '{a} just spotted {ap} ex in the third row. Rage mode.', dur: 10 },
  { id: 'blind', text: 'The lighting guy fell asleep. {a} is swinging in the dark.', dur: 6 },
  { id: 'beer', text: 'The crowd threw a beer. {a} caught it and chugged it.', dur: 8 },
  { id: 'nap', text: '{a} is taking a nap in the corner.', stun: 3.5, heal: 25 },
  { id: 'ref', text: 'The ref is distracted by a moth. Anything goes.', global: true, dur: 5 },
  { id: 'quake', text: 'Earthquake. Or a very large man in the parking lot. Everyone is down.', global: true, stun: 1.8 },
  { id: 'ghost', text: 'The ghost of a former champion just possessed {a}.', dur: 10 },
  { id: 'slurpee', text: 'Someone spilled a Slurpee. The mat is an ice rink.', global: true, dur: 7 },
  { id: 'mom', text: '{a}\'s mom is here to take {ao} home. {as} refused. Embarrassment is fuel.', heal: 20 },
  { id: 'shield', text: '{a} found a trash can lid.', dur: 9 },
  { id: 'sneeze', text: '{a} has a sneezing fit. Pollen count is brutal tonight.', stun: 1.8 },
  { id: 'shoe', text: '{a}\'s shoe fell off. Total loss of focus.', stun: 1.4 },
];

// Exchanges: arrays of [speaker, line]. One exchange is picked at random per event.
P.data.EX = {
  welcome: [
    [[G, 'Good evening everybody, Gary Gristle here with Tonya Thunderfist, and Tonya, I gotta be honest, I have already been drinking.'], [T, 'It is four in the afternoon, Gary.'], [G, 'And yet.']],
    [[T, 'Welcome to Punchma, folks. {n} entrants, one ring, and absolutely no athletic ability in the building.'], [G, 'Including us, Tonya.'], [T, 'Especially us.']],
    [[G, 'Tonya, I have a bad feeling about tonight.'], [T, 'You say that every night, Gary.'], [G, 'And every night I am right.']],
  ],
  entrance: { // reaction to the walk-on, by persona
    showboat: [[[G, 'And there it is, the flex. Nobody asked for the flex, Tonya.'], [T, 'Nobody ever asks for the flex. That is what makes it the flex.']], [[T, 'Look at {name} blowing kisses to a crowd that is actively booing.'], [G, 'Confidence, Tonya. Misplaced, but confidence.']]],
    coward: [[[T, 'Gary, is {name} walking backwards?'], [G, 'That is the walk of someone who has just remembered they have a dentist appointment.']], [[G, '{name} appears to be crying already.'], [T, 'Save some tears for the ring, buddy.']]],
    maniac: [[[G, 'Oh no. Oh no, {name} is sprinting. There are no brakes on this one.'], [T, 'Has {name} ever had a single thought, Gary?'], [G, 'Not on record.']], [[T, 'Somebody let {name} out of the cage.'], [G, 'I don\'t think there was a cage, Tonya.'], [T, 'There should have been.']]],
    dad: [[[G, 'Here comes {name}, taking the scenic route.'], [T, 'Waving at every single person individually. This might take a while.'], [G, 'Those are cargo shorts, folks. Those are absolutely cargo shorts.']]],
    drunk: [[[T, '{name} has clearly been at the bar since Tuesday.'], [G, 'It\'s Saturday, Tonya.'], [T, 'Yes, Gary.']], [[G, '{name} just high-fived a wall.'], [T, 'The wall seemed into it.']]],
    diva: [[[T, '{name} is demanding a spotlight. And a smoothie.'], [G, 'We don\'t have a smoothie.'], [T, 'Then we are going to have a problem.']]],
    oldman: [[[G, 'And here comes {name}. Slowly. Very slowly.'], [T, 'We may need to cut to a commercial, Gary.'], [G, 'We don\'t have sponsors, Tonya.']]],
    zoomer: [[[T, '{name} is doing some kind of dance.'], [G, 'Is that a dance? I thought that was a medical event.'], [T, 'It might be both.']]],
    ghost: [[[G, 'Tonya, {name} is floating. Is that legal?'], [T, 'Nothing here is legal, Gary.']], [[T, 'A cold wind blows. It is {name}. Or the air conditioning finally works.']]],
    salesman: [[[G, '{name} is handing out business cards to the front row.'], [T, 'Someone in row two just bought a timeshare, Gary. During an entrance.']]],
    baby: [[[T, 'Gary, that is a baby.'], [G, 'That is a big baby, Tonya.'], [T, 'It is still a baby.']]],
    robot: [[[G, '{name} is buffering. Please wait.'], [T, 'Somebody forgot the firmware update.']]],
    wizard: [[[T, '{name} is casting a spell. Nothing is happening.'], [G, 'And yet, look how pleased.']]],
    cop: [[[G, '{name} is checking tickets. In a fight. Where there are no tickets.'], [T, 'Please stay behind the yellow line, Gary.'], [G, 'There is no line, Tonya.']]],
    chef: [[[T, '{name} is screaming about someone\'s risotto.'], [G, 'It was undercooked, Tonya. I was there.']]],
    generic: [[[G, 'Here comes {name}, the {tag}.'], [T, 'Words that have never been said in that order before, Gary.']]],
  },
  resume: [[[G, 'And we are back to it.']], [[T, 'Fight\'s back on.']], [[G, 'Alright, back to the violence.']]],
  bigMove: [
    [[G, '{a} just planted {d} into the mat!'], [T, 'That mat has a {d}-shaped dent now, Gary.']],
    [[T, 'OH! A huge shot from {a}!'], [G, '{d} just saw the ceiling and then the floor real fast.']],
    [[G, 'Devastating! {a} folded {d} like a lawn chair!'], [T, 'I have folded lawn chairs with more dignity than that.']],
    [[T, 'Big move by {a}! {d} felt that one in {dp} ancestors.']],
  ],
  lowblow: [
    [[G, 'PUNCHMA BALLS! {a} goes low!'], [T, 'Every single person in this building just crossed their legs, Gary.']],
    [[T, 'Right in the Punchma balls! {d} is speaking in a new octave!'], [G, 'That\'s a soprano now, Tonya.']],
  ],
  toot: [[[G, '{a} turns around and... oh no. Oh, no.'], [T, 'Chemical warfare, Gary. {d} is seeing colors.']]],
  move: [ // single lines, chatter priority, sparingly
    [[G, '{a} with a right hand on {d}.']], [[T, 'Nice slap by {a}.']], [[G, '{a} boots {d} in the gut.']], [[T, '{a} bites {d}. Teeth, Gary. Teeth.']],
    [[G, '{a} noogies {d}. It\'s seventh grade all over again.']], [[T, 'Wet willy from {a}. {d} will never be clean again.']], [[G, '{a} says {d} smells like a bus. {d} is visibly hurt.']],
  ],
  miss: [[[G, '{a} swings and misses!']], [[T, '{a} attacks the air near {d}. The air is fine.']], [[G, 'Whiff! {d} just stood there.']]],
  hurt: [[[T, '{d} is wobbling like a restaurant table, Gary.'], [G, 'One more good hit and {ds} {dbe} gone.']], [[G, '{d} looks like a Monday morning.']]],
  elim: [
    [[G, '{d} IS ELIMINATED! Over the top rope!'], [T, 'Thrown out by {a} like last week\'s leftovers, Gary.']],
    [[T, 'And there goes {d}! Over the rope and into the parking lot!'], [G, 'Somebody call {dp} mom to come pick {do} up.']],
    [[G, 'GOODBYE {d}! {a} just took out the trash!'], [T, 'The trash was not happy about it.']],
    [[T, '{d} has been ejected like a bad DVD.'], [G, '{a} did that. {a} is a menace.']],
  ],
  lucky: [[[G, 'Wait, what is happening?'], [T, '{ev}'], [G, 'Of course it is.']], [[T, 'Gary, look. {ev}'], [G, 'This is why we can\'t have nice things, Tonya.']], [[G, '{ev}'], [T, 'Classic Punchma.']]],
  chatter: [
    [[G, 'The crowd is chanting something, Tonya.'], [T, 'It sounds like "refund," Gary.']],
    [[T, 'A fan just threw a shoe. It didn\'t hit anyone.'], [G, 'Wasted shoe.']],
    [[G, 'Somebody in the front row is eating an entire rotisserie chicken.'], [T, 'Good for them.']],
    [[G, 'This is the greatest night of my life, Tonya.'], [T, 'Gary, I want to go home.']],
    [[T, 'The ref has left to get a sandwich.'], [G, 'Honestly, fair.']],
    [[G, 'A pigeon is in the arena, and it is winning.']],
    [[T, 'Reminder: this is all legal as long as nobody checks.']],
    [[G, 'The mat smells, Tonya.'], [T, 'It smelled before, Gary. It smells more now.']],
    [[T, 'They\'re just kind of circling each other.'], [G, 'It\'s called strategy, Tonya.'], [T, 'It\'s called being scared, Gary.']],
    [[G, 'What\'s {a} doing over there?'], [T, 'Thinking, I hope. Probably not.']],
  ],
  allIn: [[[G, 'That\'s everybody, Tonya. All {n} fighters are in the ring.'], [T, 'Last one standing wins. God help us all.']]],
  winner: [
    [[G, 'IT\'S OVER! {name} WINS!'], [T, 'Nobody expected this, Gary. Including {name}.']],
    [[T, '{name}, the {tag}, is the last one standing in a ring full of fighters.'], [G, 'Somebody get {obj} a towel and a lawyer.']],
  ],
};
P.data.ANN = {
  intro: (ch, n) => { const p = P.char.pron(ch); const g = ch.gender && !['Unspecified', 'Male', 'Female', 'Non-Binary'].includes(ch.gender) ? `A proud ${ch.gender}.` : ''; return `Ladies and gentlemen... entrant number ${n}. Making ${p.pos} way to the ring... from ${ch.hometown}... weighing in at ${ch.weight}. ${g} ${ch.name}!... The ${P.char.tagline(ch)}!`; },
  elim: (ch) => `${ch.name}... has been eliminated.`,
  winner: (ch) => `Ladies and gentlemen... the winner of Punchma... ${ch.name}!... The ${P.char.tagline(ch)}!`,
  welcome: (n) => `Ladies and gentlemen... welcome... to PUNCHMA! ${n} entrants will enter. Only one will leave with their dignity.`,
};
