// Character model: defaults, random generation, normalization of old saves, text helpers.
window.P = window.P || {};
(function () {
  const U = P.util;
  const C = P.char = {};
  C.SKINS = ['#f7d6b8', '#f2c9a0', '#e0ac7c', '#c98b5c', '#a4673f', '#7a4a2a', '#5a3620', '#8fd14f', '#6ec3f4', '#c98cf2', '#ff8fa3', '#d9d9d9', '#ffe14d', '#ff7a00', '#7a7a7a'];
  C.HAIR_COLORS = ['#1a1a1a', '#4a2a10', '#8b5a2b', '#c98b5c', '#e8c060', '#f2f2f2', '#b32626', '#ff7a00', '#3bafe0', '#f26cb0', '#7a2d8c', '#3fbf3f', '#888'];
  C.BODY_TYPES = [['average', 'Average Joe'], ['chunky', 'Chunky'], ['buff', 'Swole'], ['pear', 'Pear'], ['blob', 'Blob'], ['brick', 'Brick'], ['noodle', 'Noodle'], ['triangle', 'Dorito'], ['egg', 'Egg']];
  C.HEAD_SHAPES = [['round', 'Round'], ['egg', 'Egg'], ['square', 'Square'], ['wide', 'Wide'], ['tall', 'Tall'], ['potato', 'Potato'], ['peanut', 'Peanut'], ['block', 'Block']];
  C.SLIDERS = [ // key, label, min, max, funny low/high labels
    ['height', 'Height', 0.5, 1.6, 'Gnome', 'Lamp post'],
    ['girth', 'Girth', 0.5, 1.9, 'Twig', 'Absolute Unit'],
    ['headSize', 'Head Size', 0.5, 1.8, 'Pea', 'Planet'],
    ['torsoLength', 'Torso Length', 0.5, 1.6, 'Compact', 'Hallway'],
    ['armLength', 'Arm Length', 0.4, 2.0, 'T-Rex', 'Orangutan'],
    ['legLength', 'Leg Length', 0.3, 2.0, 'Corgi', 'Flamingo'],
    ['limbThickness', 'Limb Thickness', 0.5, 2.4, 'Spaghetti', 'Ham'],
    ['neckLength', 'Neck Length', 0.0, 3.0, 'No Neck', 'Giraffe'],
  ];
  C.SONGS_META = () => P.audio ? P.audio.songList() : [];

  C.blank = () => ({
    id: U.uid(), name: '', tag: { adj: 'Warlike', noun: 'Pig' }, hometown: 'Parts Unknown', weight: '275 pounds', gender: 'Unspecified', pronouns: 'they',
    persona: 'showboat', catchphrase: 'Punchma balls!', voice: { pitch: 1, rate: 1 },
    song: { type: 'builtin', id: 'hype', custom: null, name: '' },
    vo: {}, // event -> { url, name } recorded or uploaded voice lines
    builtin: false,
    body: { type: 'average', headShape: 'round', height: 1, girth: 1, headSize: 1, torsoLength: 1, armLength: 1, legLength: 1, limbThickness: 1, neckLength: 1, skin: '#f2c9a0' },
    face: { eyes: 'dots', brows: 'none', nose: 'dot', mouth: 'smile', beard: 'none', facialHairColor: '#4a2a10' },
    hair: { style: 'bowl', color: '#4a2a10' },
    hat: { id: 'none', color: '#e33', color2: '#fff' },
    shirt: { id: 'tee', color: '#3a7bd5', color2: '#fff', sleeves: 'auto', text: '' },
    pants: { id: 'jeans', color: '#3b5aa0' },
    shoes: { id: 'sneakers', color: '#eee' },
    extra: { id: 'none', color: '#c00', text: 'NO' },
    custom: {}, // slot -> { src, back, clip } data URLs of user PNGs
    stats: { wins: 0, elims: 0, rumbles: 0 },
  });

  C.normalize = (ch) => { const b = C.blank(); const out = U.merge(b, ch || {}); out.id = out.id || U.uid(); return out; };

  C.randomName = () => U.pick(P.data.FIRST_NAMES) + ' ' + U.pick(P.data.LAST_NAMES);
  C.random = () => {
    const ch = C.blank();
    const r = (a, b) => U.rand(a, b), ids = (s) => P.items.ids(s), pk = U.pick;
    ch.name = C.randomName();
    ch.tag = { adj: pk(P.data.ADJ), noun: pk(P.data.NOUN) };
    ch.hometown = pk(P.data.HOMETOWN); ch.weight = pk(P.data.WEIGHT); ch.gender = pk(P.data.GENDER); ch.pronouns = pk(P.data.PRONOUNS).id;
    ch.persona = pk(P.data.PERSONAS).id; ch.catchphrase = pk(P.data.CATCHPHRASES);
    ch.voice = { pitch: +r(0.3, 2).toFixed(2), rate: +r(0.7, 1.4).toFixed(2) };
    ch.song = { type: 'builtin', id: pk(P.audio ? P.audio.songList() : [{ id: 'hype' }]).id, custom: null, name: '' };
    const wobble = (lo, hi) => +(U.chance(0.35) ? r(lo, hi) : r(0.8, 1.25)).toFixed(2);
    ch.body = { type: pk(C.BODY_TYPES)[0], headShape: pk(C.HEAD_SHAPES)[0], height: wobble(0.55, 1.5), girth: wobble(0.55, 1.8), headSize: wobble(0.55, 1.7), torsoLength: wobble(0.6, 1.5),
      armLength: wobble(0.45, 1.9), legLength: wobble(0.35, 1.9), limbThickness: wobble(0.6, 2.2), neckLength: U.chance(0.2) ? +r(0, 3).toFixed(2) : 1, skin: pk(C.SKINS) };
    ch.face = { eyes: pk(ids('eyes').filter(i => i !== 'none')), brows: pk(ids('brows')), nose: pk(ids('nose')), mouth: pk(ids('mouth').filter(i => i !== 'none')), beard: U.chance(0.4) ? pk(ids('beard')) : 'none', facialHairColor: pk(C.HAIR_COLORS) };
    ch.hair = { style: pk(ids('hair')), color: pk(C.HAIR_COLORS) }; ch.face.facialHairColor = U.chance(0.7) ? ch.hair.color : ch.face.facialHairColor;
    ch.hat = { id: U.chance(0.55) ? pk(ids('hat')) : 'none', color: U.randColor(), color2: U.randColor() };
    ch.shirt = { id: pk(ids('shirt')), color: U.randColor(), color2: U.randColor(), sleeves: 'auto', text: U.chance(0.3) ? pk(['MOM', 'BEEF', 'FART', '#1', 'HELP', 'WHY', 'GO TEAM', 'MEAT', 'OK', 'NO', 'SOUP', 'DAD BOD']) : '' };
    ch.pants = { id: pk(ids('pants')), color: U.randColor() };
    ch.shoes = { id: pk(ids('shoes')), color: U.randColor() };
    ch.extra = { id: U.chance(0.5) ? pk(ids('extra')) : 'none', color: U.randColor(), text: pk(['NO', 'WHY', 'HELP', 'FREE HUGS', 'HONK', 'MEAT', 'REPENT', 'BEANS']) };
    return ch;
  };

  C.tagline = (ch) => `${ch.tag.adj} ${ch.tag.noun}`.trim();
  C.fullTitle = (ch) => `${ch.name || 'Unnamed'} the ${C.tagline(ch)}`;
  C.pron = (ch) => P.data.PRONOUNS.find(p => p.id === ch.pronouns) || P.data.PRONOUNS[2];
  C.vars = (ch, prefix) => { // template vars for commentary: {a} name, {as} subj, {ao} obj, {ap} possessive
    const p = C.pron(ch); const o = {}; o[prefix] = ch.name || 'Someone'; o[prefix + 's'] = p.subj; o[prefix + 'o'] = p.obj; o[prefix + 'p'] = p.pos; o[prefix + 'be'] = p.be; return o;
  };
  C.introSpeech = (ch, n) => {
    const p = C.pron(ch);
    const g = ch.gender && !['Unspecified', 'Male', 'Female', 'Non-Binary'].includes(ch.gender) ? `, a proud ${ch.gender},` : ',';
    return `Entrant number ${n}! Making ${p.pos} way to the ring, from ${ch.hometown}, weighing in at ${ch.weight}${g} ${ch.name}! The ${C.tagline(ch)}!`;
  };
  C.sleeves = (ch) => { if (ch.custom && ch.custom.shirt) return ch.shirt.sleeves === 'auto' ? 'short' : ch.shirt.sleeves; if (ch.shirt.sleeves && ch.shirt.sleeves !== 'auto') return ch.shirt.sleeves; const it = P.items.get('shirt', ch.shirt.id); return it.id === 'none' ? 'none' : (it.sleeves || 'short'); };
})();
