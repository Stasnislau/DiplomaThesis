import { API_URL } from "../consts";

export interface createTaskRequest {
  language: string;
  level: string;
}

export async function createTask(data: createTaskRequest): Promise<any> {
  const response = await fetch(`${API_URL}/api/bridge/createtask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    console.log(response);
    throw new Error('An error occurred while creating the task');
  }
  

  const responseData = await response.json();
  console.log(responseData, "create task");

  return responseData;
}
