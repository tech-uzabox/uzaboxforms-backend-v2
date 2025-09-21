import { tool } from 'ai';
import { z } from 'zod';

export const createChartVisualization = tool({
  description:
    "Create a chart visualization using chart.js by passing chart.js config",
  parameters: z.object({
    config: z.string().describe("Chart.js config json stringified"),
  }),
  execute: async ({ config }: any) => {
    try {
        console.log(typeof config);
        const url = `https://quickchart.io/chart?c=${encodeURIComponent(
          JSON.stringify(JSON.parse(config))
        )}`;
        console.log(url);
        return url;
    } catch(e: any) {
       return `error, please try regenerating: ${e?.message}`
    }
  },
} as any);
