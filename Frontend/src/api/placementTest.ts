export const evaluatePlacementTest = async (data: { 
  answers: any[]; 
  language: string; 
}): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/placement/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to evaluate test");
  }

  return response.json();
}; 