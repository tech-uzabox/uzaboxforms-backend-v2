// Helper functions for getting context data from the database
// These are used by the AI service to provide context to the AI model

export const getAvailableRoles = async (apiUrl: string, token: string) => {
  try {
    const response = await fetch(`${apiUrl}/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.map((role: any) => ({ _id: role.id, roleName: role.name })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const getAvailableGroups = async (apiUrl: string, token: string, userId: string) => {
  try {
    const response = await fetch(`${apiUrl}/group-processes/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.map((group: any) => ({ _id: group.id, name: group.name })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const getAvailableUsers = async (apiUrl: string, token: string) => {
  try {
    const response = await fetch(`${apiUrl}/user-and-roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.map((user: any) => ({
        _id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};
