// Moves, lucky events and commentary lines. {a}=attacker name, {d}=defender name, {as}/{ao}/{ap} attacker pronouns, {ds}/{do}/{dp} defender pronouns
window.P = window.P || {}; P.data = P.data || {};

P.data.COMMENTATORS = [
  { name: 'Gary Gristle', color: '#ffd23f' },
  { name: 'Tonya Thunderfist', color: '#7bd7ff' },
];

// dmg ranges are identical in spirit for everyone; "big" moves are rarer but hit harder. No character has better moves than another.
P.data.MOVES = [
  { id: 'punch', name: 'PUNCH', w: 10, dmg: [8, 14], sfx: 'punch', anim: 'punch', fx: ['POW!', 'BONK!', 'WHAM!'],
    lines: ['{a} socks {d} right in the mouth!', '{a} throws a punch. It lands. {d} is not happy about it.', 'A right hand from {a}! {d} felt that one in {dp} ancestors.', '{a} punches {d} so hard {d} remembers a childhood memory.'] },
  { id: 'slap', name: 'SLAP', w: 8, dmg: [6, 12], sfx: 'slap', anim: 'punch', fx: ['SLAP!', 'SMACK!'],
    lines: ['{a} slaps {d} like an unpaid bill!', 'OPEN HAND from {a}! That\'s just disrespectful.', '{a} slaps {d}. {d} slaps back at the air. Missed.', 'The sound of that slap is going to haunt {d}.'] },
  { id: 'kick', name: 'KICK', w: 8, dmg: [9, 15], sfx: 'punch', anim: 'kick', fx: ['BOOT!', 'THUD!'],
    lines: ['{a} boots {d} in the gut!', 'Big kick by {a}! {d} just yelled "my spleen!"', '{a} kicks {d} like a vending machine that ate {ap} dollar.', '{a} punts {d}! Field goal! Or whatever!'] },
  { id: 'headbutt', name: 'HEADBUTT', w: 6, dmg: [10, 16], sfx: 'punch', anim: 'headbutt', fx: ['KLONK!', 'CRACK!'],
    lines: ['{a} headbutts {d}! Both of them look dumber now.', 'SKULL ON SKULL! {a} wins the coconut fight.', '{a} headbutts {d} and honestly I heard something rattle.'] },
  { id: 'elbow', name: 'ELBOW', w: 6, dmg: [8, 14], sfx: 'punch', anim: 'punch', fx: ['ELBOW!', 'CRUNCH!'],
    lines: ['{a} drops an elbow on {d}! The pointiest bone!', 'ELBOW! {a} just used the sharpest part of {ap} body!', '{a} elbows {d} like they\'re in line at a buffet.'] },
  { id: 'bite', name: 'BITE', w: 4, dmg: [7, 12], sfx: 'slap', anim: 'headbutt', fx: ['CHOMP!', 'NOM!'],
    lines: ['{a} BITES {d}! That\'s... not legal? Is anything legal here?', '{a} just took a bite out of {d}. {a} does not look sorry.', 'Teeth! {a} is using TEETH on {d}! Somebody get a tetanus shot.'] },
  { id: 'noogie', name: 'NOOGIE', w: 4, dmg: [5, 9], sfx: 'slap', anim: 'punch', fx: ['NOOGIE!'],
    lines: ['{a} gives {d} a devastating noogie!', 'A NOOGIE! {d} is being humiliated in front of {dp} whole family!', '{a} with the headlock noogie combo. It\'s 7th grade all over again for {d}.'] },
  { id: 'wetwilly', name: 'WET WILLY', w: 3, dmg: [4, 8], sfx: 'squish', anim: 'punch', fx: ['SQUISH!', 'EW!'], stun: 0.8,
    lines: ['{a} licks a finger and... oh no. Oh NO. Wet willy on {d}!', 'WET WILLY! {d} will never be clean again!', '{a} puts a soggy finger in {d}\'s ear. {d} is stunned. Emotionally.'] },
  { id: 'toot', name: 'THE TOOT', w: 3, dmg: [5, 10], sfx: 'fart', anim: 'toot', fx: ['PFFFRT!', 'BRAAAP!'], stun: 0.6,
    lines: ['{a} turns around and... THE TOOT! {d} is gagging!', 'Oh my GOD. {a} just weaponized {ap} lunch on {d}.', 'A cloud of {a}\'s own making engulfs {d}. Chemical warfare!', '{a} lets one rip. {d} is seeing colors.'] },
  { id: 'spit', name: 'LOOGIE', w: 3, dmg: [3, 7], sfx: 'squish', anim: 'headbutt', fx: ['PTOO!', 'SPLAT!'],
    lines: ['{a} hocks a loogie at {d}! Direct hit! Disgusting!', '{a} spits on {d}. {d} spits back but misses. Amateur.', 'A big wet one from {a}, right on {d}\'s face. Nature is beautiful.'] },
  { id: 'insult', name: 'INSULT', w: 4, dmg: [2, 5], sfx: 'boo', anim: 'taunt', fx: ['OUCH', 'HARSH'],
    lines: ['{a} calls {d} "a wet sandwich of a person." Psychological damage!', '{a} tells {d} that {dp} haircut looks like a mistake. It does. It really does.', '{a} says {d} smells like a bus. {d} is visibly hurt.', '{a} says {d}\'s mom is "fine, honestly." Devastating.'] },
  { id: 'clothesline', name: 'CLOTHESLINE', w: 4, dmg: [14, 20], sfx: 'big', anim: 'punch', fx: ['WHOOSH!', 'CLOTHESLINE!'], knock: 0.9,
    lines: ['CLOTHESLINE! {a} just folded {d} like a lawn chair!', '{a} runs over {d} like a Sunday driver!', 'A clothesline from {a}! {d}\'s head stayed but the body kept going!'] },
  { id: 'suplex', name: 'SUPLEX', w: 3, dmg: [18, 26], sfx: 'big', anim: 'suplex', fx: ['SUPLEX!', 'KABOOM!'], big: true, knock: 1.2,
    lines: ['SUPLEX CITY! {a} plants {d} into the mat!', '{a} lifts {d} up and DROPS {do} like a bad habit!', 'A SUPLEX! {d} just saw the ceiling and then the floor real fast.', '{a} suplexes {d}! The mat has a {d}-shaped dent!'] },
  { id: 'dropkick', name: 'DROPKICK', w: 3, dmg: [15, 22], sfx: 'big', anim: 'kick', fx: ['DROPKICK!', 'BOTH FEET!'], big: true, knock: 0.9,
    lines: ['DROPKICK! Both feet! {a} sends {d} flying!', '{a} leaves the ground and {d}\'s chest catches the whole thing.', 'A dropkick from {a}! {d} is doing an involuntary backflip!'] },
  { id: 'chair', name: 'CHAIR SHOT', w: 0, dmg: [20, 30], sfx: 'chair', anim: 'punch', fx: ['CLANG!', 'BONNNG!'], big: true, knock: 1.0, requires: 'chair', talk: 0.5,
    lines: ['STEEL CHAIR! {a} folds {d} with furniture!', 'CLANG! {a} rings {d}\'s bell with a chair!', '{a} hits {d} with a chair. Where did that come from? Who cares!'] },
  { id: 'lowblow', name: 'PUNCHMA BALLS', w: 1.2, dmg: [26, 34], sfx: 'punchma', anim: 'punch', fx: ['PUNCHMA BALLS!', 'RIGHT IN THE BALLS!'], big: true, stun: 1.5, low: true,
    lines: ['PUNCHMA BALLS! {a} goes low! {d} has ceased to be a person!', 'OH NO. RIGHT IN THE PUNCHMA BALLS. {d} is speaking in a new octave.', 'THE PUNCHMA BALLS! Every person in this building just crossed their legs.', '{a} punched {d} in the balls. Even if {ds} don\'t have any. Especially then.'] },
];

P.data.MISS_LINES = ['{a} swings and misses! {d} just stood there!', '{a} whiffs! That was embarrassing for everyone.', '{a} attacks the air near {d}. The air is fine.', '{d} ducks! {a} hits nothing but regret.', '{a} misses! {d} says "lol."'];

P.data.LUCKY = [
  { id: 'chair', text: 'A steel chair slides into the ring! {a} grabs it! Furniture time!', dur: 8 },
  { id: 'wind', text: 'Someone threw a hot dog. {a} ate it off the mat. SECOND WIND! +30 health!', heal: 30 },
  { id: 'banana', text: '{a} slips on a banana peel! Who\'s bringing bananas?! Stunned!', stun: 2.2 },
  { id: 'rage', text: '{a} sees {ap} ex in the third row. RAGE MODE. Double damage!', dur: 8 },
  { id: 'blind', text: 'The lighting guy fell asleep. {a} is in the dark and swinging at nothing!', dur: 5 },
  { id: 'beer', text: 'The crowd throws a beer. {a} catches it, chugs it. LIQUID COURAGE: hyper speed!', dur: 7 },
  { id: 'nap', text: '{a} decided to take a nap in the corner. Heals up, but very, very vulnerable.', stun: 3, heal: 25 },
  { id: 'ref', text: 'The ref is distracted by a moth! EVERY hit is a low blow for 4 seconds!', global: true, dur: 4 },
  { id: 'quake', text: 'EARTHQUAKE! Or a really big guy in the parking lot! Everyone falls over!', global: true, stun: 1.5 },
  { id: 'ghost', text: 'The ghost of a former champion possesses {a}! Spooky strength!', dur: 8 },
  { id: 'slurpee', text: 'Somebody spilled a Slurpee. The mat is an ice rink. Everyone is sliding!', global: true, dur: 6 },
  { id: 'mom', text: '{a}\'s mom showed up to take {ao} home. {a} refuses. Embarrassment converts to +20 health.', heal: 20 },
  { id: 'shield', text: '{a} found a trash can lid! Temporary shield! Half damage taken!', dur: 7 },
  { id: 'sneeze', text: '{a} has a sneezing fit. Pollen count is high tonight. Stunned!', stun: 1.6 },
  { id: 'shoe', text: '{a}\'s shoe fell off. Distracted by fashion. Stunned briefly.', stun: 1.2 },
];

P.data.ELIM_LINES = [
  '{d} IS ELIMINATED! Thrown over the top rope by {a}!', '{d} goes over the top! {a} sends {do} home to think about what {ds} did!',
  'GOODBYE {d}! Over the top rope and into the parking lot!', '{d} has been ejected like a bad DVD! {a} did that!',
  'And there goes {d}! Over the rope, onto the floor, into the history books as a loser!', '{a} tosses {d} out like last week\'s leftovers!',
  '{d} is gone! Someone call {dp} mom to come pick {do} up.', 'BYE BYE {d}! {a} just took out the trash!',
];
P.data.SELF_ELIM_LINES = ['{d} tripped over the rope. Nobody touched {do}. Incredible.', '{d} climbed out to get a snack. That counts! ELIMINATED!', '{d} just... fell out. On {dp} own. Historic.'];

P.data.ENTER_LINES = ['Here comes {name}! {tag}!', 'Entrant number {n}: {name}, the {tag}!', 'Oh boy. Oh boy oh boy. It\'s {name}.', 'Number {n} is {name}! The crowd is... making a noise.', 'The buzzer sounds! It\'s {name}, from {home}!'];
P.data.IDLE_LINES = ['The crowd is chanting something. It sounds like "refund."', 'A fan just threw a shoe. It didn\'t hit anyone. Wasted shoe.', 'Somebody in the front row is eating an entire rotisserie chicken.',
  'This is the greatest night of my life, Tonya.', 'Gary, I want to go home.', 'The ref has left to get a sandwich.', 'A pigeon is in the arena. It is winning.',
  'Reminder: this is all legal as long as nobody checks.', 'We are contractually obligated to say this is a sporting event.', 'The mat smells. It smelled before, but it smells more now.'];
P.data.WINNER_LINES = ['{name} WINS! THE {tag}! The last one standing in a ring full of idiots!', 'IT\'S OVER! {name} is the winner! Nobody expected this, including {name}!', '{name}, the {tag}, has survived! Somebody give {obj} a towel and a lawyer!'];
P.data.TAUNT_LINES = ['{a} is taunting: "{t}"', '{a} yells "{t}" to nobody in particular.', '{a}, alone in the corner, shouts "{t}"'];
P.data.HURT_LINES = ['{d} is hurting bad! One more good hit and {ds} {be} gone!', '{d} is wobbling like a table at a restaurant!', '{d} looks like a Monday morning.'];
