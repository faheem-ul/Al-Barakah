import React from "react";
import { ImSpinner } from "react-icons/im";

interface SpinnerProps {
  fill?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ fill = "#8FB69F" }) => {
  return <ImSpinner fill={fill} className="animate-spin text-[24px]" />;
};

export default Spinner;
