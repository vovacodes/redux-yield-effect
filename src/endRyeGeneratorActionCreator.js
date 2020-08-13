export const meta = 'reduxYieldEffectMiddleware';

let i = 0;
const type = 'endRyeGenerator';
export function endRyeGeneratorCreator(id) {
  // TODO: add nullish coalescing (update js stuff) [current 0 will still use i, which is incorrect]
  return { type, payload: { id: id || ++i }, meta };
}
endRyeGeneratorCreator.toString = () => type;
