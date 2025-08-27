import React from "react";
import { twMerge } from "tailwind-merge";

interface SkeletonPropTypes {
  className?: string;
}

const Skeleton: React.FC<SkeletonPropTypes> = (props) => {
  const { className } = props;
  return (
    <div className={twMerge("h-6 animate-pulse bg-gray-300", className)} />
  );
};

export default Skeleton;
