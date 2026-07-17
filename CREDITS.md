# Credits

Third-party assets bundled in Tilth, with their licences. Tilth's own code is MIT
(see [`LICENSE`](LICENSE)); the items below keep their original licences.

## Icons

The seasonal-interest strip uses three icons from open sets (discovered via
[opensvg.dev](https://opensvg.dev/icons)); its fourth part (stem) is drawn by hand for Tilth.
Each third-party icon is embedded as an inline SVG path in `src/components/icons.tsx`,
**recoloured** (via `currentColor`) and **resized** from the original, and all are under
permissive licences.

| Icon | Set | Author | Licence |
|------|-----|--------|---------|
| Foliage (leaf) | [Material Design Icons](https://pictogrammers.com/library/mdi/) | Pictogrammers | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) |
| Flower | [Tabler Icons](https://tabler.io/icons) | Paweł Kuna | [MIT](https://opensource.org/licenses/MIT) |
| Fruit (apple) | [WebHostingHub Glyphs](https://www.webhostinghub.com/glyphs/) | WebHostingHub | [OFL-1.1](https://openfontlicense.org/) |
| Sun (Position → Light) | [IconPark](https://iconpark.oceanengine.com/) | ByteDance | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) |
| Human figure (Size scale) | [Fontisto](https://fontisto.com/) | Team Redux (Kenan Gündoğan) | [OFL-1.1](https://openfontlicense.org/) |

The Size card's to-scale human figure uses the Fontisto "male" glyph, and the Position card's
Light slot uses the IconPark "sunny" glyph — each embedded as an inline SVG path (in
`src/components/SizeCard.tsx` / `PositionCard.tsx`), **recoloured** and **resized** from the
original.

The remaining cheatsheet glyphs (compass, wind/shelter, hardiness scale, soil, moisture, pH,
etc.) are drawn by hand for Tilth and carry no third-party licence.
