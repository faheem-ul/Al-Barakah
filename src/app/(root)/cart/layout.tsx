import React from "react";
import Providers from "@/providers";

interface PropTypes {
  children: React.ReactNode;
}

const layout = (props: PropTypes) => {
  const { children } = props;

  return <Providers>{children}</Providers>;
};

export default layout;
