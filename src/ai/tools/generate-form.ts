import { tool } from 'ai';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { formInputTypes, FormSchema, GeneratedFormSchema } from './form-schemas';

export const createGenerateFormTool = () => {
  return tool({
    description: "generate form schema according to description",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Description of the form to generate a schema from"
        }
      },
      required: ["description"]
    },
    execute: async ({ description }: { description: string }) => {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      try {
        const formCreation = await openai.chat.completions.parse({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `
                you are a form generation expert, you will use the received formation about the form questions and input types and select from the available question types and their schema to construct the form schema, divide the formSchema into sections as in the information provided
                - keep the question names and description as original as possible do not change anything
                QUESTION TYPES WITH THEIR SCHEMA:

                ${JSON.stringify(formInputTypes, null, 2)}

                please respect the schema, notes and descrtions in the schema,
                if literal values are set, set it to those values,
                if for a specific question a property in formSchema.sections.questions is not mentioned in the schema, set it to null
                make sure to link each section with the next section using the 'nextSectionId' which links using the next section's id
                `,
            },
            {
              role: "user",
              content: `${description}`,
            },
          ],
          response_format: zodResponseFormat(FormSchema, "formSchema"),
        });

        const formSchema = formCreation.choices[0].message.parsed;
        const mappedSections = formSchema?.sections.map(
          (section: any, sectionIndex: number) => ({
            ...section,
            id: section?.id ?? `section-${Date.now() + sectionIndex}`,
            questions: section.questions.map(
              (question: any, questionIndex: number) => ({
                ...question,
                id: `question-${Date.now() + sectionIndex + questionIndex}`,
              })
            ),
          })
        );
        const formReturn = { formId: `form_${Date.now()}`, sections: mappedSections };
        const isValid = GeneratedFormSchema.omit({ name: true }).safeParse(
          formReturn
        ).success;
        console.log("isValid", isValid);
        return {
          success: true,
          data: formReturn,
        };
      } catch (error) {
        console.log("error generating form", error);
        return {
          error: "Failed to generate form, please try again",
          success: false,
        };
      }
    },
  } as any);
};
