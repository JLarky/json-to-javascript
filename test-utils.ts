import { $ } from "bun";

export const myEval = async (code: string) => {
  const tmpFileName = `./playpen/tmp-node-eval/node_eval_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.cjs`;
  await Bun.write(tmpFileName, code);
  const out = await $`node ${tmpFileName}`.text();
  await $`rm -f ${tmpFileName}`;
  return out;
};
