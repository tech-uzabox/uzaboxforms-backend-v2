import { tool } from 'ai';
import { z } from 'zod';
import { UserService } from '../../user/user.service';

export const createGetUserByIdTool = (userService: UserService) => {
  return tool({
    description: "get information about a specific user or applicant",
    parameters: z.object({
      userId: z.string().describe("this is the userId or id of the user"),
    }),
    execute: async ({ userId }: any) => {
      try {
        const user = await userService.findOne(userId);
        if (!user) {
          return null;
        }

        return {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        };
      } catch (error) {
        console.error('Error getting user by ID:', error);
        return null;
      }
    },
  } as any);
};
