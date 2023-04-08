import { NextPage } from "next";
import Policy from "./policy.mdx";

export const runtime = "edge";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy.",
};

const Privacy: NextPage = () => {
  return (
    <>
      <div className="h-4" />

      <div className="flex flex-col items-center gap-8">
        <div className="w-full rounded-lg bg-white p-8">
          <div className="prose text-black lg:prose-xl">
            <Policy />
          </div>
        </div>
      </div>
    </>
  );
};

export default Privacy;
