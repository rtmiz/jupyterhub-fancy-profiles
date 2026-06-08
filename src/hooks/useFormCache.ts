import { useContext, useMemo } from "react";
import { FormCacheContext, IFormCache } from "../context/FormCache";

function useFormCache(): IFormCache {
  const {
    getChoiceOptions,
    cacheChoiceOption,
    getRepositoryOptions,
    getRefOptions,
    cacheRepositorySelection,
    removeChoiceOption,
    removeRepositoryOption,
    removeRefOption,
    buildImageStart,
    setBuildImageStart,
    isBuildingImage,
    setIsBuildingImage,
    isDynamicBuildActive,
    setIsDynamicBuildActive,
  } = useContext(FormCacheContext) as IFormCache;

  return useMemo(
    () => ({
      getChoiceOptions,
      cacheChoiceOption,
      getRepositoryOptions,
      getRefOptions,
      cacheRepositorySelection,
      removeChoiceOption,
      removeRepositoryOption,
      removeRefOption,
      buildImageStart,
      setBuildImageStart,
      isBuildingImage,
      setIsBuildingImage,
      isDynamicBuildActive,
      setIsDynamicBuildActive,
    }),
    [
      getChoiceOptions,
      cacheChoiceOption,
      getRepositoryOptions,
      getRefOptions,
      cacheRepositorySelection,
      removeChoiceOption,
      removeRepositoryOption,
      removeRefOption,
      buildImageStart,
      setBuildImageStart,
      isBuildingImage,
      setIsBuildingImage,
      isDynamicBuildActive,
      setIsDynamicBuildActive,
    ],
  );
}

export default useFormCache;
