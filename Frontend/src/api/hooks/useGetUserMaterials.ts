import { useQuery } from "@tanstack/react-query";
import { getUserMaterials } from "../queries/getUserMaterials";
import { UserMaterial } from "../mutations/saveMaterial";

export const useGetUserMaterials = () => {
  return useQuery<UserMaterial[], Error>({
    queryKey: ["user-materials"],
    queryFn: getUserMaterials,
  });
};

