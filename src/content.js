// Copy and scene wiring for the landing page. Object names match the Spline file.

// Assembly order for the intro: each step flies its parts into place.
export const BUILD_STEPS = [
  { label: 'Milling the 18k gold case', parts: ['Part Case'] },
  { label: 'Engraving the caseback', parts: ['Part Caseback'] },
  { label: 'Assembling Calibre A‑01', parts: ['Part Movement'] },
  { label: 'Lacquering the black dial', parts: ['Part Dial'] },
  { label: 'Setting the diamond indices', parts: ['Part Markers'] },
  { label: 'Fitting the gold hands', parts: ['Hour Hand', 'Minute Hand', 'Seconds Hand'] },
  { label: 'Setting 96 bezel diamonds', parts: ['Part Bezel'] },
  { label: 'Sealing the sapphire crystal', parts: ['Part Crystal'] },
  { label: 'Fitting crown and pushers', parts: ['Part Crown', 'Part Pushers'] },
  { label: 'Linking the gold bracelet', parts: ['Part Bracelet Top', 'Part Bracelet Bottom', 'Part Clasp'] },
];

// Components shown while scrolling the exploded view, front to back.
export const COMPONENTS = [
  {
    name: 'Sapphire Crystal',
    spec: 'Domed sapphire · anti‑reflective',
    text: 'A domed sapphire crystal, second only to diamond in hardness, treated against reflection on both faces so the black dial reads true.',
    parts: ['Part Crystal'],
  },
  {
    name: 'Diamond Bezel',
    spec: '96 diamonds · black ceramic',
    text: 'A black ceramic insert with a gold‑filled 60‑minute scale, framed by 96 brilliant‑cut diamonds set in 18k yellow gold.',
    parts: ['Part Bezel'],
  },
  {
    name: 'Chronograph Hand',
    spec: 'Fifths of a second · 28,800 vph',
    text: 'The central chronograph hand rests at twelve until the pushers start it, then reads elapsed time to a fifth of a second.',
    parts: ['Seconds Hand'],
  },
  {
    name: 'Minute Hand',
    spec: 'Faceted dauphine · 18k gold',
    text: 'A dauphine hand cut into four polished facets that meet on a raised ridge, so it catches light from any angle.',
    parts: ['Minute Hand'],
  },
  {
    name: 'Hour Hand',
    spec: 'Faceted dauphine · 18k gold',
    text: 'Shorter and broader than the minute hand, hand‑polished on every facet and set on a gold hub.',
    parts: ['Hour Hand'],
  },
  {
    name: 'Diamond Indices',
    spec: '8 diamonds · 4 gold batons',
    text: 'Eight brilliant‑cut diamonds in gold chatons, with faceted gold batons at twelve, three, six and nine.',
    parts: ['Part Markers'],
  },
  {
    name: 'Black Lacquer Dial',
    spec: 'Three snailed sub‑dials',
    text: 'Layers of black lacquer polished to a mirror, with snailed sub‑dials for running seconds, 30 minutes and 12 hours.',
    parts: ['Part Dial'],
  },
  {
    name: 'Calibre A‑01',
    spec: 'Automatic chronograph · 72‑hour reserve',
    text: 'A self‑winding chronograph movement with Côtes de Genève bridges, perlage, ruby jewels, blued screws and a gold rotor engraved ASAD.',
    parts: ['Part Movement'],
  },
  {
    name: 'Middle Case',
    spec: '40 mm · 18k yellow gold',
    text: 'Milled from a single block of 18k yellow gold, with brushed flanks and polished chamfers along the lugs.',
    parts: ['Part Case'],
  },
  {
    name: 'Chronograph Pushers',
    spec: 'Screw‑down · fluted collars',
    text: 'Start, stop and reset. The fluted collars screw down to seal the case when the chronograph is not in use.',
    parts: ['Part Pushers'],
  },
  {
    name: 'Diamond Crown',
    spec: 'Screw‑down · triple gasket',
    text: 'A fluted screw‑down crown sealed by three gaskets and topped with a single brilliant‑cut diamond.',
    parts: ['Part Crown'],
  },
  {
    name: 'Caseback',
    spec: 'Water‑resistant to 100 m',
    text: 'A screw‑down gold caseback engraved “ASAD · Or Noir · No. 001”.',
    parts: ['Part Caseback'],
  },
  {
    name: 'Bracelet & Clasp',
    spec: '18k gold · folding clasp',
    text: 'A tapered three‑link bracelet in 18k gold, brushed outer links and polished centre links, closing on a folding clasp with a black ceramic inlay.',
    parts: ['Part Bracelet Top', 'Part Bracelet Bottom', 'Part Clasp'],
  },
];

export const SPECS = [
  ['Reference', 'AS‑118 Or Noir'],
  ['Case', '40 mm, 18k yellow gold'],
  ['Water resistance', '100 m / 330 ft'],
  ['Bezel', 'Black ceramic, 96 diamonds'],
  ['Gem‑setting', '105 brilliant‑cut diamonds'],
  ['Dial', 'Black lacquer, three sub‑dials'],
  ['Movement', 'Calibre A‑01, automatic chronograph'],
  ['Power reserve', '72 hours'],
  ['Crystal', 'Domed sapphire, anti‑reflective'],
  ['Bracelet', '18k gold, folding clasp'],
];
