import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import pgBoss from 'pg-boss';
import { PrismaService } from '../db/prisma.service';

const formInputTypes: {
  type: string;
  schema: any;
}[] = [
  {
    type: "short text input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Short Text",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
    },
  },
  {
    type: "email text input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Email",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
    },
  },
  {
    type: "phone number text input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Phone Number",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
    },
  },
  {
    type: "long text (paragraph) input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Paragraph",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
    },
  },
  {
    type: "number input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Number",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
    },
  },
  {
    type: "checkbox input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Checkbox",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
      options: {
        required: true,
        dataType: "string array",
        description: "here is where you put all the option of the question",
      },
      numberOfOptions: {
        required: true,
        dataType: "number",
        description:
          "here is where you put the number of options it number of options should match the options array",
      },
      selectOptions: {
        required: true,
        dataType: "select-at-least | select-at-most | select-exactly",
        description: "this determines how many options should be selected",
      },
    },
  },
  {
    type: "date input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Date",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
      timeType: {
        required: true,
        value: "all-time | future-only | past-only",
        note: "this is used to determine the date boundaries where the date will be selected from, if not sure set the value to all-time, for example date of birth should be past-only",
      },
    },
  },
  {
    type: "datetime input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "DateTime",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
      timeType: {
        required: true,
        value: "all-time | future-only | past-only",
        note: "this is used to determine the date boundaries where the date will be selected from, if not sure set the value to all-time, for example date of birth should be past-only",
      },
    },
  },
  {
    type: "date range input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Date Range",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
    },
  },
  {
    type: "time input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Time",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
    },
  },
  {
    type: "signature input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Signature",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
    },
  },
  {
    type: "select (dropdown) input",
    schema: {
      label: {
        required: true,
        dataType: "string",
        description:
          "question label, make sure it stays as original as possible, do not change the language",
      },
      type: {
        required: true,
        value: "Dropdown",
        dataType: "string",
        note: "set it to the value specified in the schema literaly",
        description: "this is a unique identifier for the question type",
      },
      required: {
        required: true,
        dataType: "yes | no",
        description:
          "whether or not the question is option, if unsure, set it to yes",
      },
      options: {
        required: true,
        dataType: "string array",
        description: "here is where you put all the option of the question",
      },
    },
  },
];

// Section Schema
const SectionSchema = z.object({
  name: z.string().nullable(),
  id: z
    .string()
    .nullable()
    .describe(
      "unique identifier for the section, used when linking it with the next section"
    ),
  nextSectionId: z
    .string()
    .nullable()
    .describe(
      "unique identified that links the current section to the next section, the last section does not have a nextsection, set it to null"
    ),
  questions: z
    .array(
      z.object({
        label: z.string(),
        type: z.string(),
        required: z.enum(["yes", "no"]),
        options: z.array(z.string()).nullable(),
        timeType: z.enum(["all-time", "future-only", "past-only"]).nullable(),
        selectOptions: z
          .enum(["select-at-least", "select-at-most", "select-exactly"])
          .nullable(),
        numberOfOptions: z.number().nullable(),
      })
    )
    .describe("Questions schema according to the input type schema"),
});

// Form Schema
const FormSchema = z.object({
  sections: z.array(SectionSchema),
  formName: z.string(),
});

@Injectable()
export class FormGenerationService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateFormSchema(job: pgBoss.Job, file: {
    buffer: Buffer;
    originalname: string;
  }, userId: string) {
    // Create progress record
    const progressRecord = await this.prisma.formGenerationProgress.create({
      data: {
        jobId: job.id,
        status: 'PENDING',
        progress: 0,
        message: 'Initializing form generation',
        userId,
      },
    });

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, file.originalname);
    fs.writeFileSync(tempFilePath, file.buffer);

    try {
      // Update progress: File uploaded
      await this.prisma.formGenerationProgress.update({
        where: { id: progressRecord.id },
        data: {
          status: 'PROCESSING',
          progress: 10,
          message: 'File uploaded to OpenAI',
        },
      });
      const fileData = await this.openai.files.create({
        file: fs.createReadStream(tempFilePath),
        purpose: "assistants",
      });
      if (!fileData) {
        throw new Error("Upload failed to openai failed");
      }

      // Update progress: File uploaded to OpenAI
      await this.prisma.formGenerationProgress.update({
        where: { id: progressRecord.id },
        data: {
          progress: 25,
          message: 'File uploaded to OpenAI, extracting questions',
        },
      });

      const questionExtraction = await this.openai.chat.completions.create({
        messages: [
          {
            role: "developer",
            content: `
              you are a document information extraction expert, your job is to extract the information the user wants with high accuracy, extract the relevant information as it is, maintain the language the text is in. if it is french, keep it in french, if in english keep it in english, if both keep both, make sure the question names(label) and options follow this instruction
              `,
          },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  file_id: fileData.id,
                },
              },
              {
                type: "text",
                text: `
                      can you extract the questions from the questionnaire in the document
  the options provided if they are any and input type(${JSON.stringify(
                      formInputTypes.map((v) => v.type)
                    )})
  only use email text input when you are sure that email address is needed, do not use it for address only, for address only use short text input,
  generate appropriate formName
  `,
              },
            ],
          },
        ],
        model: "gpt-4.1-mini-2025-04-14",
        temperature: 0.6,
      });

      if (!questionExtraction.choices[0]) {
        throw new Error("Question extraction failed");
      }

      // Update progress: Questions extracted
      await this.prisma.formGenerationProgress.update({
        where: { id: progressRecord.id },
        data: {
          progress: 50,
          message: 'Questions extracted, generating form schema',
        },
      });

      const formCreation = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini-2025-04-14",
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

                  Return the response as a valid JSON object with the following structure:
                  {
                    "sections": [
                      {
                        "name": "Section Name",
                        "id": "section-id",
                        "nextSectionId": "next-section-id or null",
                        "questions": [
                          {
                            "label": "Question Label",
                            "type": "Question Type",
                            "required": "yes/no",
                            "options": ["option1", "option2"] or null,
                            "timeType": "all-time/future-only/past-only" or null,
                            "selectOptions": "select-at-least/select-at-most/select-exactly" or null,
                            "numberOfOptions": number or null
                          }
                        ]
                      }
                    ],
                    "formName": "Generated Form Name"
                  }
                  `,
          },
          {
            role: "user",
            content: `
                  ${questionExtraction.choices[0]?.message?.content}
                  `,
          },
        ],
      });

      const responseContent = formCreation.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Form creation failed - no response content");
      }

      const formSchema = JSON.parse(responseContent);

      // Update progress: Form schema generated
      await this.prisma.formGenerationProgress.update({
        where: { id: progressRecord.id },
        data: {
          progress: 100,
          status: 'COMPLETED',
          message: 'Form schema generated successfully',
        },
      });

      return {
        schema: formSchema?.sections,
        name: formSchema?.formName,
      };
    } catch (error: any) {
      console.error(error);
      // Update progress on failure
      await this.prisma.formGenerationProgress.update({
        where: { id: progressRecord.id },
        data: {
          status: 'FAILED',
          message: error.message || 'Form generation failed',
        },
      });
      throw error;
    } finally {
      fs.unlinkSync(tempFilePath);
    }
  }
}
