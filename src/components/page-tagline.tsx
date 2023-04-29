import { FC } from "react";

export const PageTagline: FC<{ text: string }> = ({ text }) => {
  return <div className="text-center text-xl text-blue-100">{text}</div>;
};
