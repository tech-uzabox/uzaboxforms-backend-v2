import { tool } from 'ai';
import { z } from 'zod';

export const createChartVisualization = tool({
  description:
    "Create a chart visualization using chart.js by passing chart.js config",
  parameters: z.object({
    config: z.string().describe("Chart.js config json stringified"),
  }),
  execute: async ({ config }: { config: string }) => {
    try {
        console.log(typeof config);
        const url = `https://quickchart.io/chart?c=${encodeURIComponent(
          JSON.stringify(JSON.parse(config))
        )}`;
        console.log(url);
        return url;
    } catch(e: unknown) {
       const error = e as Error;
       return `error, please try regenerating: ${error?.message || 'Unknown error'}`
    }
  },
} as any);
